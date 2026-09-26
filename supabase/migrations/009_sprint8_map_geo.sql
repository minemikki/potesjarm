-- =============================================================================
-- Sprint 8 – Kart / Steder / Geo (ekte data, personvern først)
--
-- Bygger videre på schema.sql (places, meetups, municipalities/counties,
-- cube+earthdistance) og migrasjonene 003–008. Additiv og idempotent.
--
-- Prinsipper:
--   * Ingen falske kartdata: kartet viser kun ekte, godkjente steder og ekte,
--     aktive treff. Er det ingenting, returnerer RPC-ene ingenting.
--   * Personvern: vi eksponerer ALDRI hjemmeadresse eller andre brukeres
--     eksakte posisjon/ruter. Steder er offentlige punkter; treffsteder er
--     eksplisitt publisert av verten. Hunder/​profiler får aldri lat/lng her.
--   * Brukerforeslåtte steder er `pending` og vises ikke offentlig før de er
--     `approved` (moderering kommer i en senere sprint).
--   * Region = fylke (counties), kommune = municipalities. Rogaland er
--     lanseringsregion i markedsføring; lokal logikk er per kommune.
-- =============================================================================

-- --- 1. Utvid places med moderering, region og metadata --------------------
alter table places add column if not exists status       text not null default 'approved';
alter table places add column if not exists region       text references counties(id);
alter table places add column if not exists address_label text;
alter table places add column if not exists updated_at    timestamptz not null default now();

-- Gyldige moderasjonsstatuser.
do $$ begin
  alter table places add constraint places_status_chk
    check (status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;

-- Backfill: redaksjonelle steder er godkjent; region utledes fra kommunen.
update places p
   set region = m.county_id
  from municipalities m
 where p.municipality_id = m.id and p.region is null;
update places set status = 'approved' where source = 'editorial' and status is null;

-- Kun godkjente steder er offentlig synlige (eller ens egne forslag).
-- Erstatter den gamle "alle kan lese alt"-policyen som også viste pending.
drop policy if exists "places read" on places;
create policy "places read" on places for select
  using (status = 'approved' or auth.uid() = created_by);

-- Brukerforslag må være source='user' og starte som pending (aldri selv-godkjent).
drop policy if exists "places insert" on places;
create policy "places insert" on places for insert
  with check (auth.uid() = created_by and source = 'user' and status = 'pending');

create index if not exists places_status_geo_idx on places (status, municipality_id);
create index if not exists places_region_idx      on places (region) where status = 'approved';

-- Hold updated_at i synk.
create or replace function touch_place_updated() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists places_touch on places;
create trigger places_touch before update on places
for each row execute function touch_place_updated();

-- --- 2. Godkjente steder i et område (radius/kommune/region/kategori) -------
-- Returnerer kun approved steder. Avstand regnes fra klientpunktet når det er
-- oppgitt (brukerens egen, avrundede posisjon – vi lagrer den ikke). Uten
-- punkt sorteres det på navn. p_radius_km = null => ingen radiusgrense.
create or replace function places_in_area(
  p_municipality text default null,
  p_region       text default null,
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radius_km    double precision default null,
  p_category     text default null,
  p_limit        integer default 200
)
returns table (
  id uuid, name text, kind text, about text, lat double precision, lng double precision,
  municipality_id text, region text, address_label text, source text, verified_count integer,
  distance_km double precision, upcoming_meetups integer
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.kind, p.about, p.lat, p.lng,
         p.municipality_id, p.region, p.address_label, p.source, p.verified_count,
         case when p_lat is not null and p_lng is not null
              then round((earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p.lat, p.lng)) / 1000.0)::numeric, 2)::double precision
              else null end as distance_km,
         (select count(*) from meetups m
            where m.place_id = p.id and m.cancelled_at is null and m.expires_at > now()
              and m.group_id is null)::integer as upcoming_meetups
    from places p
   where p.status = 'approved'
     and (p_municipality is null or p.municipality_id = p_municipality)
     and (p_region       is null or p.region = p_region)
     and (p_category     is null or p.kind = p_category)
     and (
       p_lat is null or p_lng is null or p_radius_km is null
       or earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(p.lat, p.lng)) <= p_radius_km * 1000
     )
   order by distance_km asc nulls last, p.name asc
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

-- --- 3. Ett sted i detalj (offentlig) --------------------------------------
create or replace function place_detail(p_place_id uuid)
returns table (
  id uuid, name text, kind text, about text, lat double precision, lng double precision,
  municipality_id text, region text, address_label text, source text, verified_count integer,
  upcoming_meetups integer
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.name, p.kind, p.about, p.lat, p.lng,
         p.municipality_id, p.region, p.address_label, p.source, p.verified_count,
         (select count(*) from meetups m
            where m.place_id = p.id and m.cancelled_at is null and m.expires_at > now()
              and m.group_id is null)::integer as upcoming_meetups
    from places p
   where p.id = p_place_id and p.status = 'approved';
$$;

-- --- 4. Aktive treff på kartet (personvern + blokkering + gruppelekkasje) ---
-- Kun treff med koordinater, ikke avlyst/utløpt. Utelater treff hostet av
-- (eller mot) noen du har blokkert, og gruppetreff du ikke er medlem av
-- (så gruppeinnhold ikke lekker via kartet). Ekte deltakertall.
create or replace function map_meetups(
  p_municipality text default null,
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radius_km    double precision default null,
  p_limit        integer default 200
)
returns table (
  id uuid, host_id uuid, kind text, title text, note text,
  place_id uuid, place_text text, lat double precision, lng double precision,
  municipality_id text, group_id uuid, starts_at timestamptz, expires_at timestamptz,
  max_dogs smallint, going_count integer, distance_km double precision
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.host_id, m.kind, m.title, m.note,
         m.place_id, m.place_text, m.lat, m.lng,
         m.municipality_id, m.group_id, m.starts_at, m.expires_at, m.max_dogs,
         (select count(*) from meetup_participants mp where mp.meetup_id = m.id)::integer as going_count,
         case when p_lat is not null and p_lng is not null and m.lat is not null
              then round((earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(m.lat, m.lng)) / 1000.0)::numeric, 2)::double precision
              else null end as distance_km
    from meetups m
   where m.cancelled_at is null
     and m.expires_at > now()
     and m.lat is not null and m.lng is not null
     and (p_municipality is null or m.municipality_id = p_municipality)
     and not is_blocked_between(auth.uid(), m.host_id)
     and (
       m.group_id is null
       or exists (select 1 from group_members gm where gm.group_id = m.group_id and gm.profile_id = auth.uid())
     )
     and (
       p_lat is null or p_lng is null or p_radius_km is null
       or earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(m.lat, m.lng)) <= p_radius_km * 1000
     )
   order by m.starts_at asc
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

-- --- 5. Foreslå et sted (autentisert) --------------------------------------
-- Setter inn et `pending` sted. Server bestemmer created_by, source, status og
-- region (utledet fra kommunen) – vi stoler ikke på klienten for disse.
create or replace function suggest_place(
  p_name        text,
  p_category    text,
  p_lat         double precision,
  p_lng         double precision,
  p_municipality text,
  p_description text default null
)
returns table (id uuid, status text)
language plpgsql security definer set search_path = public
as $$
declare
  v_me    uuid := auth.uid();
  v_name  text := btrim(coalesce(p_name, ''));
  v_desc  text := nullif(btrim(coalesce(p_description, '')), '');
  v_region text;
  v_row   places;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if v_name = '' or length(v_name) > 80 then raise exception 'invalid_name' using errcode = '22023'; end if;
  if p_category not in ('tursti','park','strand','skog','utsiktspunkt','hundepark','hundevennlig','veterinaer')
     then raise exception 'invalid_category' using errcode = '22023'; end if;
  if p_lat is null or p_lng is null or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180
     then raise exception 'invalid_position' using errcode = '22023'; end if;
  if not exists (select 1 from municipalities where id = p_municipality)
     then raise exception 'invalid_municipality' using errcode = '22023'; end if;

  select county_id into v_region from municipalities where id = p_municipality;

  insert into places (municipality_id, name, kind, lat, lng, about, source, created_by, status, region)
  values (p_municipality, v_name, p_category, p_lat, p_lng, left(v_desc, 500), 'user', v_me, 'pending', v_region)
  returning * into v_row;

  return query select v_row.id, v_row.status;
end $$;

-- --- 6. Rettigheter: kun de nye RPC-ene, minst mulig ------------------------
grant execute on function places_in_area(text, text, double precision, double precision, double precision, text, integer) to anon, authenticated;
grant execute on function place_detail(uuid) to anon, authenticated;
grant execute on function map_meetups(text, double precision, double precision, double precision, integer) to authenticated;
grant execute on function suggest_place(text, text, double precision, double precision, text, text) to authenticated;
