-- =============================================================================
-- Potesjarm – Sprint 5: ekte chat (direkte + treff) + Realtime
--
-- Idempotent. Kjør i SQL Editor i prosjektet ditt (trygt å kjøre på nytt).
-- Bygger videre på 001-skjemaet: `conversations`, `conversation_members` og
-- `messages` finnes fra før. Her legges til:
--   * conversations.kind ('direct' | 'meetup'), meetup_id, dm_key
--   * unikhet som hindrer duplikate direkte-samtaler og >1 treff-samtale
--   * RETTING av en RLS-bug på messages (se under) – kritisk for Realtime
--   * SECURITY DEFINER-RPC-er for henting/oppretting, sending, lister, unread
--   * aktivering av Realtime på messages
--
-- Sikkerhetsvalg (samme mønster som 003/004): alt som må kjenne til
-- blokkering på tvers, medlemskap eller treff-deltakelse går gjennom
-- SECURITY DEFINER-funksjoner. Klienten snakker aldri direkte med tabellene
-- for skriving; den kaller RPC-ene via repository-laget (app/lib/db/chat.js).
-- =============================================================================

-- --- 1. Utvid conversations --------------------------------------------------
alter table conversations add column if not exists kind text not null default 'direct';
alter table conversations add column if not exists meetup_id uuid references meetups(id) on delete cascade;
-- Kanonisk nøkkel for et par (minste:største uuid) – gjør direkte-samtaler unike.
alter table conversations add column if not exists dm_key text;

-- Sett en check på kind uten å feile hvis den finnes fra før.
do $$ begin
  alter table conversations add constraint conversations_kind_chk
    check (kind in ('direct','meetup'));
exception when duplicate_object then null; end $$;

-- Én direkte-samtale per par, og én samtale per treff.
create unique index if not exists conversations_dm_key_uidx
  on conversations(dm_key) where dm_key is not null;
create unique index if not exists conversations_meetup_uidx
  on conversations(meetup_id) where meetup_id is not null;

-- --- 2. RETT RLS-bug på messages ---------------------------------------------
-- De opprinnelige policyene skrev `m.conversation_id = conversation_id`. Inne i
-- subspørringen binder det ukvalifiserte navnet til subspørringens egen tabell
-- (m), så uttrykket ble `m.conversation_id = m.conversation_id` = alltid sant.
-- Resultat: enhver som var medlem av ÉN samtale kunne lese/motta meldinger fra
-- ALLE samtaler. Siden Supabase Realtime håndhever nettopp SELECT-policyen for
-- den som abonnerer, må dette rettes før Realtime slås på. Vi kvalifiserer med
-- messages.conversation_id.
drop policy if exists "msg read"  on messages;
drop policy if exists "msg write" on messages;
create policy "msg read" on messages for select
  using (exists (
    select 1 from conversation_members m
    where m.conversation_id = messages.conversation_id and m.profile_id = auth.uid()));
create policy "msg write" on messages for insert
  with check (auth.uid() = sender_id and exists (
    select 1 from conversation_members m
    where m.conversation_id = messages.conversation_id and m.profile_id = auth.uid()));

-- --- 3. RPC: hent/opprett direkte-samtale ------------------------------------
-- Forbyr self-chat og blokkerte. Dedupe via unik dm_key: to samtidige kall
-- ender på samme rad (unique_violation fanges).
create or replace function get_or_create_direct_conversation(p_other uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_conv uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  if p_other is null or p_other = v_me then raise exception 'Self chat forbidden'; end if;
  if is_blocked_between(v_me, p_other) then raise exception 'Blocked'; end if;

  v_key := least(v_me, p_other)::text || ':' || greatest(v_me, p_other)::text;

  select id into v_conv from conversations where dm_key = v_key;
  if v_conv is null then
    begin
      insert into conversations(kind, dm_key) values ('direct', v_key) returning id into v_conv;
    exception when unique_violation then
      select id into v_conv from conversations where dm_key = v_key;
    end;
    insert into conversation_members(conversation_id, profile_id)
      values (v_conv, v_me), (v_conv, p_other)
      on conflict do nothing;
  end if;
  return v_conv;
end;
$$;

-- --- 4. RPC: hent/opprett treff-samtale --------------------------------------
-- Kun verten eller en påmeldt deltaker. Kalleren blir medlem (lazy) slik at
-- RLS/lister fungerer. Én samtale per treff (unik meetup_id).
create or replace function get_or_create_meetup_conversation(p_meetup uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_host uuid;
  v_conv uuid;
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  select host_id into v_host from meetups where id = p_meetup;
  if v_host is null then raise exception 'No such meetup'; end if;
  if v_me <> v_host and not exists (
    select 1 from meetup_participants where meetup_id = p_meetup and profile_id = v_me
  ) then
    raise exception 'Not a participant';
  end if;

  select id into v_conv from conversations where meetup_id = p_meetup;
  if v_conv is null then
    begin
      insert into conversations(kind, meetup_id) values ('meetup', p_meetup) returning id into v_conv;
    exception when unique_violation then
      select id into v_conv from conversations where meetup_id = p_meetup;
    end;
  end if;
  insert into conversation_members(conversation_id, profile_id)
    values (v_conv, v_me) on conflict do nothing;
  return v_conv;
end;
$$;

-- --- 5. RPC: send melding -----------------------------------------------------
-- Må være medlem. For direkte-samtaler: nekt hvis blokkert (begge retninger).
-- Returnerer den rå meldingsraden (samme form som Realtime-payloaden), slik at
-- klienten kan dedupe optimistisk melding mot Realtime-hendelsen på id.
create or replace function send_message(p_conversation uuid, p_body text)
returns table (id uuid, conversation_id uuid, sender_id uuid, body text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_kind text;
  v_other uuid;
  v_body text := nullif(btrim(p_body), '');
begin
  if v_me is null then raise exception 'Not authenticated'; end if;
  if v_body is null then raise exception 'Empty message'; end if;
  if not exists (
    select 1 from conversation_members m
    where m.conversation_id = p_conversation and m.profile_id = v_me
  ) then
    raise exception 'Not a member';
  end if;

  select c.kind into v_kind from conversations c where c.id = p_conversation;
  if v_kind = 'direct' then
    select m.profile_id into v_other from conversation_members m
      where m.conversation_id = p_conversation and m.profile_id <> v_me limit 1;
    if v_other is not null and is_blocked_between(v_me, v_other) then
      raise exception 'Blocked';
    end if;
  end if;

  return query
  with ins as (
    insert into messages(conversation_id, sender_id, body)
    values (p_conversation, v_me, v_body)
    returning messages.id, messages.conversation_id, messages.sender_id,
              messages.body, messages.created_at
  ), _bump as (
    update conversation_members m set last_read_at = now()
    where m.conversation_id = p_conversation and m.profile_id = v_me
  )
  select ins.id, ins.conversation_id, ins.sender_id, ins.body, ins.created_at from ins;
end;
$$;

-- --- 6. RPC: samtaleliste (innboks) ------------------------------------------
-- For hver samtale kalleren er medlem av: motpart (direkte), treff-tittel,
-- siste melding og ulest-antall. Blokkerte direkte-samtaler skjules.
create or replace function list_conversations()
returns table (
  id uuid, kind text, meetup_id uuid,
  other_id uuid, other_name text, other_dog_id uuid, other_dog_name text, other_photo text,
  meetup_title text, last_body text, last_at timestamptz, unread int
)
language plpgsql security definer set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then return; end if;
  return query
  with mine as (
    select cm.conversation_id as cid, cm.last_read_at as lra
    from conversation_members cm where cm.profile_id = v_me
  )
  select
    c.id, c.kind, c.meetup_id,
    o.pid as other_id,
    op.display_name as other_name,
    od.id as other_dog_id,
    od.name as other_dog_name,
    od.photo_url as other_photo,
    mt.title as meetup_title,
    lm.body as last_body,
    lm.created_at as last_at,
    (select count(*) from messages msg
      where msg.conversation_id = c.id
        and msg.sender_id <> v_me
        and (mn.lra is null or msg.created_at > mn.lra))::int as unread
  from mine mn
  join conversations c on c.id = mn.cid
  left join lateral (
    select cm2.profile_id as pid from conversation_members cm2
    where cm2.conversation_id = c.id and cm2.profile_id <> v_me
    limit 1
  ) o on c.kind = 'direct'
  left join profiles op on op.id = o.pid
  left join lateral (
    select d.id, d.name, d.photo_url from dogs d
    where d.owner_id = o.pid order by d.created_at asc limit 1
  ) od on true
  left join meetups mt on mt.id = c.meetup_id
  left join lateral (
    select msg2.body, msg2.created_at from messages msg2
    where msg2.conversation_id = c.id order by msg2.created_at desc limit 1
  ) lm on true
  where (c.kind <> 'direct' or o.pid is null or not is_blocked_between(v_me, o.pid))
  order by lm.created_at desc nulls last;
end;
$$;

-- --- 7. RPC: meldinger i en samtale ------------------------------------------
-- Må være medlem. Blokkerte direkte-samtaler gir tom liste. Eldste først.
create or replace function list_messages(p_conversation uuid, p_limit int default 100)
returns table (
  id uuid, sender_id uuid, is_mine boolean, body text, created_at timestamptz,
  sender_name text, sender_dog_name text, sender_photo text
)
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_kind text;
  v_other uuid;
begin
  if v_me is null then return; end if;
  if not exists (
    select 1 from conversation_members m
    where m.conversation_id = p_conversation and m.profile_id = v_me
  ) then
    return; -- ikke medlem = ser ingenting
  end if;

  select c.kind into v_kind from conversations c where c.id = p_conversation;
  if v_kind = 'direct' then
    select m.profile_id into v_other from conversation_members m
      where m.conversation_id = p_conversation and m.profile_id <> v_me limit 1;
    if v_other is not null and is_blocked_between(v_me, v_other) then
      return; -- blokkert = ingen historikk
    end if;
  end if;

  return query
  select
    msg.id, msg.sender_id, (msg.sender_id = v_me) as is_mine,
    msg.body, msg.created_at,
    p.display_name as sender_name,
    sd.name as sender_dog_name,
    sd.photo_url as sender_photo
  from messages msg
  left join profiles p on p.id = msg.sender_id
  left join lateral (
    select d.name, d.photo_url from dogs d
    where d.owner_id = msg.sender_id order by d.created_at asc limit 1
  ) sd on true
  where msg.conversation_id = p_conversation
  order by msg.created_at asc
  limit greatest(1, least(p_limit, 500));
end;
$$;

-- --- 8. RPC: marker samtale som lest -----------------------------------------
create or replace function mark_conversation_read(p_conversation uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update conversation_members m set last_read_at = now()
  where m.conversation_id = p_conversation and m.profile_id = auth.uid();
end;
$$;

-- --- 9. Aktiver Realtime på messages -----------------------------------------
-- Legger messages til supabase_realtime-publiseringen så INSERT-hendelser
-- strømmes til abonnenter. Idempotent. Realtime håndhever SELECT-policyen
-- ovenfor, så kun samtalens medlemmer får hendelsene.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
