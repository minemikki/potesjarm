-- =============================================================================
-- Potesjarm – Sprint 3: sosial graf (follow + hundevenn) + ekte hundeprofiler
--
-- Idempotent. Kjør i SQL Editor i prosjektet ditt (trygt å kjøre på nytt).
-- Bygger videre på 001-skjemaet: `follows` og `blocks` finnes fra før, her
-- legges hundevenn (toveis) + oppdagbarhet + sikre RPC-er til.
--
-- Sikkerhetsvalg: sensitive graf-operasjoner (send/godta forespørsel, blokker,
-- oppdag hunder) går gjennom SECURITY DEFINER-funksjoner. Det er fordi
-- `blocks`-policyen bare lar deg SE dine egne blokkeringer – en RLS-sjekk på
-- klientens vegne kan derfor ikke se om DEN ANDRE har blokkert deg. Definer-
-- funksjonene ser begge retninger og håndhever blokkering robust.
-- =============================================================================

-- --- Hund: oppdagbarhet + updated_at -----------------------------------------
alter table dogs add column if not exists discoverable boolean not null default true;
alter table dogs add column if not exists updated_at   timestamptz not null default now();

-- --- Hundevenn-forespørsler (bruker <-> bruker, valgfri hunde-kontekst) -------
create table if not exists friend_requests (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references profiles(id) on delete cascade,
  receiver_id     uuid not null references profiles(id) on delete cascade,
  sender_dog_id   uuid references dogs(id) on delete set null,
  receiver_dog_id uuid references dogs(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending','accepted','declined','cancelled')),
  created_at      timestamptz not null default now(),
  responded_at    timestamptz,
  check (sender_id <> receiver_id)
);
-- Kun ÉN aktiv (pending) forespørsel per (sender, mottaker).
create unique index if not exists friend_requests_pending_uniq
  on friend_requests (sender_id, receiver_id) where status = 'pending';
create index if not exists friend_requests_receiver_idx on friend_requests(receiver_id, status);
create index if not exists friend_requests_sender_idx   on friend_requests(sender_id, status);

-- --- Vennskap (symmetrisk, lagret kanonisk med a_id < b_id) -------------------
create table if not exists friendships (
  a_id       uuid not null references profiles(id) on delete cascade,
  b_id       uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a_id, b_id),
  check (a_id < b_id)
);
create index if not exists friendships_b_idx on friendships(b_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table friend_requests enable row level security;
alter table friendships     enable row level security;

-- Forespørsler: kun sender/mottaker ser dem. Ingen direkte INSERT fra klient
-- (går via send_friend_request). Cancel/decline gjøres via egne RPC-er, men vi
-- tillater også en enkel UPDATE fra rette part som sikkerhetsnett.
drop policy if exists "fr read"          on friend_requests;
drop policy if exists "fr update sender" on friend_requests;
drop policy if exists "fr update recv"   on friend_requests;
create policy "fr read"          on friend_requests for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "fr update sender" on friend_requests for update
  using (auth.uid() = sender_id)   with check (auth.uid() = sender_id);
create policy "fr update recv"   on friend_requests for update
  using (auth.uid() = receiver_id) with check (auth.uid() = receiver_id);

-- Vennskap: begge parter kan lese og slette (unfriend). Ingen klient-INSERT –
-- vennskap kan kun oppstå via accept_friend_request (definer), aldri forfalskes.
drop policy if exists "fs read"   on friendships;
drop policy if exists "fs delete" on friendships;
create policy "fs read"   on friendships for select using (auth.uid() = a_id or auth.uid() = b_id);
create policy "fs delete" on friendships for delete using (auth.uid() = a_id or auth.uid() = b_id);

-- =============================================================================
-- Hjelper: er to brukere blokkert i én av retningene?
-- =============================================================================
create or replace function is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- =============================================================================
-- Oppdag hunder: oppdagbare hunder i en kommune, ikke egne, ikke blokkert
-- (i noen retning). Definer, så blokk-sjekken ser begge veier.
-- =============================================================================
create or replace function discover_dogs(p_municipality text, p_limit int default 60)
returns setof dogs
language sql stable security definer set search_path = public
as $$
  select d.*
  from dogs d
  join profiles p on p.id = d.owner_id
  where p.municipality_id = p_municipality
    and d.discoverable = true
    and d.owner_id <> auth.uid()
    and p.suspended_at is null
    and not is_blocked_between(auth.uid(), d.owner_id)
  order by p.last_active_at desc
  limit greatest(1, least(p_limit, 200));
$$;

-- =============================================================================
-- Følg / slutt å følge en hund (definer: håndhever blokkering begge veier)
-- =============================================================================
create or replace function follow_dog(p_dog uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from dogs where id = p_dog;
  if v_owner is null then raise exception 'Dog not found'; end if;
  if v_owner = auth.uid() then raise exception 'Cannot follow your own dog'; end if;
  if is_blocked_between(auth.uid(), v_owner) then raise exception 'Blocked'; end if;
  insert into follows (follower_id, dog_id) values (auth.uid(), p_dog)
    on conflict (follower_id, dog_id) do nothing; -- idempotent
end;
$$;

create or replace function unfollow_dog(p_dog uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from follows where follower_id = auth.uid() and dog_id = p_dog;
$$;

-- =============================================================================
-- Hundevenn: send / godta / avslå / trekk tilbake (alle idempotente/atomiske)
-- =============================================================================
create or replace function send_friend_request(p_receiver uuid, p_sender_dog uuid default null, p_receiver_dog uuid default null)
returns friend_requests
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  lo uuid := least(v_me, p_receiver);
  hi uuid := greatest(v_me, p_receiver);
  v_row friend_requests;
begin
  if p_receiver = v_me then raise exception 'Cannot friend yourself'; end if;
  if is_blocked_between(v_me, p_receiver) then raise exception 'Blocked'; end if;
  if exists (select 1 from friendships where a_id = lo and b_id = hi) then
    raise exception 'Already friends';
  end if;
  -- Finnes en pending forespørsel den andre veien? Da er dette egentlig en aksept.
  if exists (select 1 from friend_requests where sender_id = p_receiver and receiver_id = v_me and status = 'pending') then
    update friend_requests set status = 'accepted', responded_at = now()
      where sender_id = p_receiver and receiver_id = v_me and status = 'pending'
      returning * into v_row;
    insert into friendships (a_id, b_id) values (lo, hi) on conflict do nothing;
    return v_row;
  end if;
  insert into friend_requests (sender_id, receiver_id, sender_dog_id, receiver_dog_id)
    values (v_me, p_receiver, p_sender_dog, p_receiver_dog)
    on conflict (sender_id, receiver_id) where (status = 'pending')
    do update set created_at = friend_requests.created_at -- idempotent no-op
    returning * into v_row;
  return v_row;
end;
$$;

create or replace function accept_friend_request(p_request uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  r friend_requests%rowtype;
  lo uuid; hi uuid;
begin
  select * into r from friend_requests where id = p_request;
  if not found then raise exception 'Request not found'; end if;
  if r.receiver_id <> auth.uid() then raise exception 'Not your request'; end if;
  if r.status <> 'pending' then raise exception 'Request not pending'; end if;
  if is_blocked_between(r.sender_id, r.receiver_id) then raise exception 'Blocked'; end if;
  update friend_requests set status = 'accepted', responded_at = now() where id = p_request;
  lo := least(r.sender_id, r.receiver_id);
  hi := greatest(r.sender_id, r.receiver_id);
  insert into friendships (a_id, b_id) values (lo, hi) on conflict do nothing;
end;
$$;

create or replace function decline_friend_request(p_request uuid)
returns void
language sql security definer set search_path = public
as $$
  update friend_requests set status = 'declined', responded_at = now()
    where id = p_request and receiver_id = auth.uid() and status = 'pending';
$$;

create or replace function cancel_friend_request(p_request uuid)
returns void
language sql security definer set search_path = public
as $$
  update friend_requests set status = 'cancelled', responded_at = now()
    where id = p_request and sender_id = auth.uid() and status = 'pending';
$$;

-- =============================================================================
-- Blokkering med kaskade: fjern følging (begge veier), vennskap og ventende
-- forespørsler mellom partene, og hindre nye. Atomisk (definer).
-- =============================================================================
create or replace function block_user(p_blocked uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  lo uuid := least(v_me, p_blocked);
  hi uuid := greatest(v_me, p_blocked);
begin
  if p_blocked = v_me then raise exception 'Cannot block yourself'; end if;
  insert into blocks (blocker_id, blocked_id) values (v_me, p_blocked) on conflict do nothing;
  -- Følging begge veier (mine på deres hunder, deres på mine).
  delete from follows f using dogs d
    where f.dog_id = d.id
      and ((f.follower_id = v_me and d.owner_id = p_blocked)
        or (f.follower_id = p_blocked and d.owner_id = v_me));
  -- Vennskap.
  delete from friendships where a_id = lo and b_id = hi;
  -- Ventende forespørsler begge veier.
  update friend_requests set status = 'cancelled', responded_at = now()
    where status = 'pending'
      and ((sender_id = v_me and receiver_id = p_blocked)
        or (sender_id = p_blocked and receiver_id = v_me));
end;
$$;

create or replace function unblock_user(p_blocked uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from blocks where blocker_id = auth.uid() and blocked_id = p_blocked;
$$;

-- =============================================================================
-- Grunnlag for "felles" (brukes senere i hundeprofil). Alt regnes fra ekte
-- rader – finnes ingenting, blir svaret 0. Aldri oppdiktet.
-- =============================================================================

-- Antall felles hundevenner mellom meg og en annen bruker. Definer, fordi
-- vennskaps-RLS ellers hindrer meg i å se den andres vennskap.
create or replace function mutual_friends_count(p_other uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  with mine as (
    select case when a_id = auth.uid() then b_id else a_id end as fid
    from friendships where a_id = auth.uid() or b_id = auth.uid()
  ),
  theirs as (
    select case when a_id = p_other then b_id else a_id end as fid
    from friendships where a_id = p_other or b_id = p_other
  )
  select count(*)::int from mine join theirs using (fid);
$$;

-- Antall felles grupper (begge er medlemmer).
create or replace function shared_groups_count(p_other uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int
  from group_members g1
  join group_members g2 on g1.group_id = g2.group_id
  where g1.profile_id = auth.uid() and g2.profile_id = p_other;
$$;
