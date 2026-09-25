-- =============================================================================
-- Potesjarm – Sprint 7: ekte varsler (notifications) + Realtime + push-fundament
--
-- Idempotent, additiv. Kjør i SQL Editor. Bygger på 001-skjemaet:
-- `notifications` og `notification_settings` finnes fra før. Her legges til:
--   * notifications.actor_id (hvem utløste varselet) + indekser
--   * _notify()-hjelper som håndhever blokkering, innstillinger og dedupe
--   * AFTER-triggere på ekte handlinger (følge, hundevenn, like, kommentar,
--     melding, treff-påmelding, treff-avlysning) som lager varsler server-side
--   * RPC-er for liste (beriket), ulest-antall, marker lest / alle lest, og
--     innstillinger (hent/oppdater)
--   * push_subscriptions (fundament for web-push) med RLS
--   * Realtime på notifications
--
-- Varsler opprettes ALDRI fra klienten – kun av disse triggerne, som kjører
-- SECURITY DEFINER slik at de kan skrive et varsel til en ANNEN bruker uten å
-- bryte «notif own»-RLS. Blokkering vinner alltid, og man varsles aldri om sin
-- egen handling.
-- =============================================================================

-- --- 1. Utvid notifications --------------------------------------------------
alter table notifications add column if not exists actor_id uuid references profiles(id) on delete set null;
create index if not exists notifications_profile_created_idx on notifications(profile_id, created_at desc);
create index if not exists notifications_unread_idx on notifications(profile_id) where read_at is null;

-- --- 2. Hjelpere -------------------------------------------------------------
-- Etikett for den som utløste varselet: hundenavn hvis vi har det, ellers
-- eiernavn, ellers «Noen». Aldri oppdiktet.
create or replace function _actor_label(p_actor uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select name from dogs where owner_id = p_actor order by created_at asc limit 1),
    (select display_name from profiles where id = p_actor),
    'Noen');
$$;

-- Aktørens primærhund (for deep-link til hundeprofil fra sosiale varsler).
create or replace function _actor_dog(p_actor uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from dogs where owner_id = p_actor order by created_at asc limit 1;
$$;

-- Kjernen: lag et varsel, men respekter egen-handling, blokkering,
-- innstillinger og dedupe. p_dedupe: 'none' | 'window' | 'unread'.
create or replace function _notify(
  p_recipient uuid, p_actor uuid, p_kind text, p_category text,
  p_title text, p_body text, p_ref_table text, p_ref_id uuid,
  p_dedupe text default 'none', p_window interval default interval '24 hours'
)
returns void language plpgsql security definer set search_path = public as $$
declare v_on boolean;
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;   -- ikke varsle egen handling
  if p_actor is not null and is_blocked_between(p_recipient, p_actor) then return; end if; -- blokkering vinner

  -- Respekter innstillinger (mangler rad => default på).
  select coalesce(
    case p_category
      when 'messages'  then ns.messages
      when 'meetups'   then ns.meetups
      when 'community' then ns.community
      when 'streak'    then ns.streak
      when 'events'    then ns.events
      when 'lost_dog'  then ns.lost_dog
      else true end, true)
  into v_on
  from (select p_recipient as pid) base
  left join notification_settings ns on ns.profile_id = base.pid;
  if v_on is false then return; end if;

  -- Dedupe mot spam.
  if p_dedupe = 'unread' then
    -- Samle flere uleste av samme type/ref til ÉN (f.eks. meldinger per samtale).
    update notifications
       set created_at = now(), actor_id = p_actor, title = p_title, body = p_body
     where profile_id = p_recipient and kind = p_kind
       and ref_id is not distinct from p_ref_id and read_at is null;
    if found then return; end if;
  elsif p_dedupe = 'window' then
    -- Oppdater et ferskt, identisk varsel i stedet for å lage nytt.
    update notifications
       set created_at = now(), read_at = null, title = p_title, body = p_body
     where profile_id = p_recipient and actor_id = p_actor and kind = p_kind
       and ref_id is not distinct from p_ref_id and created_at > now() - p_window;
    if found then return; end if;
  end if;

  insert into notifications (profile_id, actor_id, kind, title, body, ref_table, ref_id)
    values (p_recipient, p_actor, p_kind, p_title, p_body, p_ref_table, p_ref_id);
end;
$$;

-- --- 3. Triggere på ekte handlinger ------------------------------------------

-- FØLGE: A følger B sin hund -> B varsles. Deep-link: A sin hundeprofil.
create or replace function trg_notify_follow()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_dogname text;
begin
  select owner_id, name into v_owner, v_dogname from dogs where id = NEW.dog_id;
  perform _notify(v_owner, NEW.follower_id, 'follow', 'community',
    _actor_label(NEW.follower_id) || ' følger ' || coalesce(v_dogname, 'hunden din'),
    null, 'dogs', _actor_dog(NEW.follower_id), 'window');
  return NEW;
end; $$;
drop trigger if exists notify_follow on follows;
create trigger notify_follow after insert on follows
  for each row execute function trg_notify_follow();

-- HUNDEVENN-FORESPØRSEL: sendt -> mottaker varsles. Godtatt -> avsender varsles.
create or replace function trg_notify_friend_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    perform _notify(NEW.receiver_id, NEW.sender_id, 'friend_request', 'community',
      _actor_label(NEW.sender_id) || ' vil bli hundevenn', null,
      'dogs', _actor_dog(NEW.sender_id), 'window');
  elsif TG_OP = 'UPDATE' and NEW.status = 'accepted' and OLD.status <> 'accepted' then
    perform _notify(NEW.sender_id, NEW.receiver_id, 'friend_accepted', 'community',
      _actor_label(NEW.receiver_id) || ' ble hundevennen din', null,
      'dogs', _actor_dog(NEW.receiver_id), 'none');
  end if;
  return NEW;
end; $$;
drop trigger if exists notify_friend_request on friend_requests;
create trigger notify_friend_request after insert or update on friend_requests
  for each row execute function trg_notify_friend_request();

-- LIKE: A liker B sitt innlegg -> B varsles (ikke egen). Dedupe mot like-spam.
create or replace function trg_notify_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from posts where id = NEW.post_id;
  perform _notify(v_author, NEW.profile_id, 'like', 'community',
    _actor_label(NEW.profile_id) || ' likte innlegget ditt', null,
    'posts', NEW.post_id, 'window');
  return NEW;
end; $$;
drop trigger if exists notify_like on post_likes;
create trigger notify_like after insert on post_likes
  for each row execute function trg_notify_like();

-- KOMMENTAR: A kommenterer B sitt innlegg -> B varsles (ikke egen). Distinkt.
create or replace function trg_notify_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_author uuid;
begin
  select author_id into v_author from posts where id = NEW.post_id;
  perform _notify(v_author, NEW.author_id, 'comment', 'community',
    _actor_label(NEW.author_id) || ' kommenterte innlegget ditt', null,
    'posts', NEW.post_id, 'none');
  return NEW;
end; $$;
drop trigger if exists notify_comment on comments;
create trigger notify_comment after insert on comments
  for each row execute function trg_notify_comment();

-- MELDING: alle andre i samtalen varsles. Privacy: ingen meldingstekst i body.
-- Dedupe 'unread' => én «Ny melding fra X» per samtale til den leses.
create or replace function trg_notify_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare m record;
begin
  for m in
    select profile_id from conversation_members
    where conversation_id = NEW.conversation_id and profile_id <> NEW.sender_id
  loop
    perform _notify(m.profile_id, NEW.sender_id, 'message', 'messages',
      'Ny melding fra ' || _actor_label(NEW.sender_id), null,
      'conversations', NEW.conversation_id, 'unread');
  end loop;
  return NEW;
end; $$;
drop trigger if exists notify_message on messages;
create trigger notify_message after insert on messages
  for each row execute function trg_notify_message();

-- TREFF-PÅMELDING: A blir med på B sitt treff -> vert B varsles (ikke egen).
create or replace function trg_notify_meetup_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_host uuid; v_title text;
begin
  select host_id, title into v_host, v_title from meetups where id = NEW.meetup_id;
  perform _notify(v_host, NEW.profile_id, 'meetup_join', 'meetups',
    _actor_label(NEW.profile_id) || ' ble med på treffet ditt',
    v_title, 'meetups', NEW.meetup_id, 'window');
  return NEW;
end; $$;
drop trigger if exists notify_meetup_join on meetup_participants;
create trigger notify_meetup_join after insert on meetup_participants
  for each row execute function trg_notify_meetup_join();

-- TREFF-AVLYSNING: cancelled_at settes -> alle deltakere (ikke vert) varsles.
create or replace function trg_notify_meetup_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if NEW.cancelled_at is not null and OLD.cancelled_at is null then
    for p in select profile_id from meetup_participants where meetup_id = NEW.id loop
      perform _notify(p.profile_id, NEW.host_id, 'meetup_cancel', 'meetups',
        'Et treff du er med på ble avlyst', NEW.title, 'meetups', NEW.id, 'none');
    end loop;
  end if;
  return NEW;
end; $$;
drop trigger if exists notify_meetup_cancel on meetups;
create trigger notify_meetup_cancel after update on meetups
  for each row execute function trg_notify_meetup_cancel();

-- --- 4. RPC-er: liste, ulest, marker lest ------------------------------------
-- Beriket liste (aktørens navn/hund/foto for rendering + deep-link). Varsler
-- fra blokkerte aktører skjules. Cursor på created_at.
create or replace function list_notifications(p_limit int default 40, p_before timestamptz default null)
returns table (
  id uuid, kind text, title text, body text, ref_table text, ref_id uuid,
  read_at timestamptz, created_at timestamptz,
  actor_id uuid, actor_name text, actor_dog_id uuid, actor_dog_name text, actor_photo text
)
language sql stable security definer set search_path = public as $$
  select n.id, n.kind, n.title, n.body, n.ref_table, n.ref_id, n.read_at, n.created_at,
    n.actor_id, pr.display_name, d.id, d.name, d.photo_url
  from notifications n
  left join profiles pr on pr.id = n.actor_id
  left join lateral (
    select id, name, photo_url from dogs where owner_id = n.actor_id order by created_at asc limit 1
  ) d on true
  where n.profile_id = auth.uid()
    and (p_before is null or n.created_at < p_before)
    and (n.actor_id is null or not is_blocked_between(auth.uid(), n.actor_id))
  order by n.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- Ulest-antall (skjuler blokkerte aktører, som i lista).
create or replace function unread_notifications()
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications n
  where n.profile_id = auth.uid() and n.read_at is null
    and (n.actor_id is null or not is_blocked_between(auth.uid(), n.actor_id));
$$;

create or replace function mark_notification_read(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now()
  where id = p_id and profile_id = auth.uid() and read_at is null;
$$;

create or replace function mark_all_notifications_read()
returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now()
  where profile_id = auth.uid() and read_at is null;
$$;

-- --- 5. Innstillinger --------------------------------------------------------
-- Hent (oppretter rad med defaults om den mangler) og oppdater.
create or replace function get_notification_settings()
returns notification_settings
language plpgsql security definer set search_path = public as $$
declare v notification_settings;
begin
  insert into notification_settings (profile_id) values (auth.uid())
    on conflict (profile_id) do nothing;
  select * into v from notification_settings where profile_id = auth.uid();
  return v;
end; $$;

create or replace function update_notification_settings(
  p_messages boolean default null, p_meetups boolean default null,
  p_community boolean default null, p_streak boolean default null,
  p_events boolean default null, p_lost_dog boolean default null
)
returns notification_settings
language plpgsql security definer set search_path = public as $$
declare v notification_settings;
begin
  insert into notification_settings (profile_id) values (auth.uid())
    on conflict (profile_id) do nothing;
  update notification_settings set
    messages  = coalesce(p_messages,  messages),
    meetups   = coalesce(p_meetups,   meetups),
    community = coalesce(p_community, community),
    streak    = coalesce(p_streak,    streak),
    events    = coalesce(p_events,    events),
    lost_dog  = coalesce(p_lost_dog,  lost_dog)
  where profile_id = auth.uid()
  returning * into v;
  return v;
end; $$;

-- --- 6. Push-fundament: push_subscriptions -----------------------------------
-- Kun fundament. Ekte web-push sendes IKKE herfra – det hører til en senere
-- Edge Function/server-endepunkt. Brukeren administrerer kun sine egne.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on push_subscriptions(profile_id);
alter table push_subscriptions enable row level security;
drop policy if exists "push own" on push_subscriptions;
create policy "push own" on push_subscriptions for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- --- 7. Realtime på notifications --------------------------------------------
-- Realtime håndhever «notif own»-SELECT-policyen, så bare mottakeren får sine
-- egne varsler.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
