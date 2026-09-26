-- =============================================================================
-- Pilot Launch Readiness (012)
--
-- Additiv og idempotent. Kjøres som én transaksjon. To ting for pilot:
--   1. Sikker moderator-minimum (allowlist-tabell + RPC-er, aldri klient-rolle).
--   2. Lett misbruksbeskyttelse (rate-gate-triggere) på de mest utsatte
--      innsettingene, uten å gjøre normal bruk treg.
-- =============================================================================
begin;

-- =============================================================================
-- 1. MODERATOR-MINIMUM (server-side allowlist, ingen klient-kontrollert rolle)
-- =============================================================================
create table if not exists moderators (
  profile_id uuid primary key references profiles(id) on delete cascade,
  added_at   timestamptz not null default now()
);
alter table moderators enable row level security;
-- Ingen policyer => hverken anon eller authenticated kan lese/skrive direkte.
-- Kun SECURITY DEFINER-funksjoner (som eier) og service-role ser tabellen.
-- Moderatorer legges til manuelt i SQL Editor (se docs/LAUNCH_RUNBOOK.md):
--   insert into moderators (profile_id) values ('<auth-uid>');

create or replace function is_moderator(p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from moderators m where m.profile_id = coalesce(p_uid, auth.uid()));
$$;

-- Ventende stedsforslag (kun moderator).
create or replace function list_pending_places()
returns setof places language plpgsql stable security definer set search_path = public as $$
begin
  if not is_moderator() then raise exception 'not_moderator' using errcode = '42501'; end if;
  return query select * from places where status = 'pending' order by created_at asc;
end $$;

-- Godkjenn/avvis et sted (kun moderator). p_approve=true => approved, ellers rejected.
create or replace function moderate_place(p_place uuid, p_approve boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if not is_moderator() then raise exception 'not_moderator' using errcode = '42501'; end if;
  v_status := case when p_approve then 'approved' else 'rejected' end;
  update places set status = v_status where id = p_place;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('id', p_place, 'status', v_status);
end $$;

-- Åpne rapporter (kun moderator).
create or replace function list_open_reports(p_limit int default 100)
returns setof reports language plpgsql stable security definer set search_path = public as $$
begin
  if not is_moderator() then raise exception 'not_moderator' using errcode = '42501'; end if;
  return query select * from reports where status in ('open','reviewing')
               order by created_at asc limit greatest(1, least(coalesce(p_limit,100), 500));
end $$;

-- Sett rapportstatus (kun moderator).
create or replace function mark_report(p_report uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_moderator() then raise exception 'not_moderator' using errcode = '42501'; end if;
  if p_status not in ('open','reviewing','actioned','dismissed') then
    raise exception 'invalid_status' using errcode = '22023'; end if;
  update reports set status = p_status where id = p_report;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('id', p_report, 'status', p_status);
end $$;

-- Skjul/vis innhold (kun moderator). Bruker hidden_at fra migrasjon 011.
create or replace function moderate_hide(p_table text, p_id uuid, p_hide boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_moderator() then raise exception 'not_moderator' using errcode = '42501'; end if;
  if p_table = 'post' then
    update posts set hidden_at = case when p_hide then now() else null end where id = p_id;
  elsif p_table = 'comment' then
    update comments set hidden_at = case when p_hide then now() else null end where id = p_id;
  else raise exception 'invalid_target' using errcode = '22023';
  end if;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('table', p_table, 'id', p_id, 'hidden', p_hide);
end $$;

revoke execute on function is_moderator(uuid) from public;
revoke execute on function list_pending_places() from public;
revoke execute on function moderate_place(uuid, boolean) from public;
revoke execute on function list_open_reports(int) from public;
revoke execute on function mark_report(uuid, text) from public;
revoke execute on function moderate_hide(text, uuid, boolean) from public;
grant execute on function is_moderator(uuid) to authenticated;
grant execute on function list_pending_places() to authenticated;
grant execute on function moderate_place(uuid, boolean) to authenticated;
grant execute on function list_open_reports(int) to authenticated;
grant execute on function mark_report(uuid, text) to authenticated;
grant execute on function moderate_hide(text, uuid, boolean) to authenticated;

-- Skjulte innlegg/kommentarer skal ikke vises i vanlige lister. Stram lese-
-- policyene fra 011 med "hidden_at is null" (eier + moderator ser fortsatt sitt).
drop policy if exists "posts read" on posts;
create policy "posts read" on posts for select using (
  auth.role() = 'authenticated'
  and (hidden_at is null or author_id = auth.uid() or is_moderator())
  and (group_id is null or exists (
    select 1 from group_members gm where gm.group_id = posts.group_id and gm.profile_id = auth.uid()))
  and not is_blocked_between(auth.uid(), author_id)
);

drop policy if exists "comments read" on comments;
create policy "comments read" on comments for select using (
  auth.role() = 'authenticated'
  and (hidden_at is null or author_id = auth.uid() or is_moderator())
  and not is_blocked_between(auth.uid(), author_id)
  and exists (
    select 1 from posts p where p.id = comments.post_id
      and (p.group_id is null or exists (
        select 1 from group_members gm where gm.group_id = p.group_id and gm.profile_id = auth.uid()))
  )
);

-- =============================================================================
-- 2. LETT MISBRUKSBESKYTTELSE (rate-gate-triggere)
-- =============================================================================
-- Generisk gate: teller brukerens egne rader i tabellen siste N sekunder og
-- avviser over grensen. Kjører uansett om innsettingen skjer via RPC eller
-- direkte (auth.uid() er den innloggede uansett). Rører ikke normal bruk.
-- TG_ARGV: [brukerkolonne, vindu_sekunder, maks_i_vindu].
create or replace function _rate_gate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_col text := TG_ARGV[0];
  v_secs int := TG_ARGV[1]::int;
  v_max  int := TG_ARGV[2]::int;
  v_user uuid;
  v_count int;
begin
  if v_uid is null then return NEW; end if; -- ingen auth-kontekst (f.eks. seed) => hopp over
  execute format('select ($1).%I', v_col) into v_user using NEW;
  if v_user is null or v_user <> v_uid then return NEW; end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - make_interval(secs => $2)',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, v_col
  ) into v_count using v_uid, v_secs;
  if v_count >= v_max then
    raise exception 'rate_limited' using errcode = '53400', hint = TG_TABLE_NAME;
  end if;
  return NEW;
end $$;
revoke execute on function _rate_gate() from public;

drop trigger if exists rate_gate_messages on messages;
create trigger rate_gate_messages before insert on messages
  for each row execute function _rate_gate('sender_id', '10', '8');   -- maks 8 meldinger / 10 s

drop trigger if exists rate_gate_comments on comments;
create trigger rate_gate_comments before insert on comments
  for each row execute function _rate_gate('author_id', '20', '5');   -- maks 5 kommentarer / 20 s

drop trigger if exists rate_gate_posts on posts;
create trigger rate_gate_posts before insert on posts
  for each row execute function _rate_gate('author_id', '30', '3');   -- maks 3 innlegg / 30 s

drop trigger if exists rate_gate_meetups on meetups;
create trigger rate_gate_meetups before insert on meetups
  for each row execute function _rate_gate('host_id', '60', '4');     -- maks 4 treff / 60 s

drop trigger if exists rate_gate_places on places;
create trigger rate_gate_places before insert on places
  for each row execute function _rate_gate('created_by', '60', '5');  -- maks 5 stedsforslag / 60 s

commit;
