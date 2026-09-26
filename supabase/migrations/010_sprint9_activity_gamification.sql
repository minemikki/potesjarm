-- =============================================================================
-- Sprint 9 – Aktivitet + gamification (ekte fremgang, server som sannhet)
--
-- Additiv og idempotent. Bygger på schema.sql (walks, paw_ledger, streaks,
-- challenges, challenge_progress, badges, badge_awards) og migrasjonene 003–009.
--
-- Prinsipp: klienten kan ALDRI gi seg selv km, poter, streak, challenge-
-- fremgang eller merker. All fremgang skrives server-side, utledet fra ekte
-- turer, og er idempotent (retry / dobbeltklikk / refresh gir aldri dobbelt).
-- =============================================================================

-- =============================================================================
-- 0. PREFLIGHT SECURITY-PATCH
-- =============================================================================

-- 0A) Hardne den eldre treff-lista: samme synlighet som map_meetups (blokkerte
--     verter og gruppetreff man ikke er medlem av skjules). Returnerer også
--     treff UTEN koordinater (i motsetning til map_meetups), for «Nå skjer».
create or replace function list_meetups_near(p_municipality text)
returns table (
  id uuid, host_id uuid, municipality_id text, neighborhood_id uuid, kind text,
  title text, note text, place_id uuid, place_text text, lat double precision, lng double precision,
  starts_at timestamptz, expires_at timestamptz, max_dogs smallint, group_id uuid, created_at timestamptz,
  going_count integer, i_am_going boolean
)
language sql stable security definer set search_path = public
as $$
  select m.id, m.host_id, m.municipality_id, m.neighborhood_id, m.kind,
         m.title, m.note, m.place_id, m.place_text, m.lat, m.lng,
         m.starts_at, m.expires_at, m.max_dogs, m.group_id, m.created_at,
         (select count(*) from meetup_participants mp where mp.meetup_id = m.id)::integer,
         exists (select 1 from meetup_participants mp where mp.meetup_id = m.id and mp.profile_id = auth.uid())
    from meetups m
   where m.municipality_id = p_municipality
     and m.cancelled_at is null
     and m.expires_at > now()
     and not is_blocked_between(auth.uid(), m.host_id)
     and (
       m.group_id is null
       or exists (select 1 from group_members gm where gm.group_id = m.group_id and gm.profile_id = auth.uid())
     )
   order by m.starts_at asc;
$$;

-- 0B) PostgreSQL gir EXECUTE til PUBLIC som default på nye funksjoner. 009
--     grantet til anon/authenticated, men fjernet ALDRI PUBLIC. Rett opp det
--     eksplisitt for alle geo-RPC-ene + den nye treff-lista.
revoke execute on function places_in_area(text, text, double precision, double precision, double precision, text, integer) from public;
revoke execute on function place_detail(uuid) from public;
revoke execute on function map_meetups(text, double precision, double precision, double precision, integer) from public;
revoke execute on function suggest_place(text, text, double precision, double precision, text, text) from public;
revoke execute on function list_meetups_near(text) from public;

grant execute on function places_in_area(text, text, double precision, double precision, double precision, text, integer) to anon, authenticated;
grant execute on function place_detail(uuid) to anon, authenticated;
grant execute on function map_meetups(text, double precision, double precision, double precision, integer) to authenticated;
grant execute on function suggest_place(text, text, double precision, double precision, text, text) to authenticated;
grant execute on function list_meetups_near(text) to authenticated;

-- =============================================================================
-- 1. IDEMPOTENS-NØKLER
-- =============================================================================

-- Klientnøkkel for turer: samme (profil, client_key) kan aldri gi to turer.
alter table walks add column if not exists client_key text;
create unique index if not exists walks_client_key_uidx on walks (profile_id, client_key) where client_key is not null;
create index if not exists walks_profile_date_idx on walks (profile_id, started_at desc);

-- Universell idempotens-nøkkel for poter (dekker walk/streak/challenge uten å
-- tvinge alt inn i uuid-feltet ref_id). Samme kilde betaler aldri to ganger.
alter table paw_ledger add column if not exists source_key text;
update paw_ledger set source_key = reason || ':' || coalesce(ref_id::text, id::text) where source_key is null;
create unique index if not exists paw_ledger_source_uidx on paw_ledger (profile_id, source_key);

-- =============================================================================
-- 2. SYSTEM-DEFINISJONER (challenges + badges). Kun definisjoner er systemdata;
--    fremgang og tildeling utledes alltid fra ekte turer.
-- =============================================================================
insert into challenges (id, scope, title, metric, target, unit, reward_paws) values
  ('week-3-turer',  'ukentlig', '3 turer denne uka',      'walks_week',       3, 'turer', 150),
  ('week-10-km',    'ukentlig', '10 km denne uka',        'km_week',         10, 'km',    200),
  ('week-5-dager',  'ukentlig', '5 aktive dager',         'active_days_week', 5, 'dager', 250)
on conflict (id) do nothing;

insert into badges (id, name, metric, target, icon, color) values
  ('first-walk',      'Første tur',        'walks_total',       1,  'paw',      'mint'),
  ('km-10',           '10 km sammen',      'km_total',         10,  'route',    'blue'),
  ('km-50',           '50 km sammen',      'km_total',         50,  'mountain', 'violet'),
  ('active-7',        '7 aktive dager',    'active_days_week',  7,  'calendar', 'amber'),
  ('first-challenge', 'Første utfordring', 'challenges_completed', 1, 'trophy', 'gold')
on conflict (id) do nothing;

-- =============================================================================
-- 3. HJELPERE (rene, server-side)
-- =============================================================================

-- Oslo-kalenderdag og ISO-uke (mandag-start) for et tidspunkt.
create or replace function _oslo_date(ts timestamptz) returns date
language sql immutable as $$ select (ts at time zone 'Europe/Oslo')::date $$;
create or replace function _oslo_week(ts timestamptz) returns text
language sql immutable as $$ select to_char(date_trunc('week', (ts at time zone 'Europe/Oslo')), 'IYYY-IW') $$;

-- Legg til poter idempotent (server-side). Returnerer beløpet som faktisk ble
-- lagt til (0 hvis kilden allerede har betalt).
create or replace function _award_paws(p_profile uuid, p_reason text, p_source_key text, p_ref uuid, p_amount integer)
returns integer language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then return 0; end if;
  insert into paw_ledger (profile_id, amount, reason, ref_id, source_key)
  values (p_profile, p_amount, p_reason, p_ref, p_source_key)
  on conflict (profile_id, source_key) do nothing;
  if found then return p_amount; else return 0; end if;
end $$;

-- =============================================================================
-- 4. FULLFØR EN TUR (server som sannhet, idempotent)
-- =============================================================================
-- Persisterer turen, validerer eierskap, beregner gyldighet + poter server-side,
-- oppdaterer streak (Oslo-dager), recomputer ukentlige challenges og tildeler
-- merker – alt idempotent. Klienten sender aldri poter/streak/fremgang.
create or replace function complete_walk(
  p_client_key text,
  p_dog_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_distance_m integer,
  p_duration_s integer,
  p_moving_s integer,
  p_gps_quality text default null,
  p_flagged boolean default false,
  p_elevation_m integer default null,
  p_place_id uuid default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_me      uuid := auth.uid();
  v_walk    walks;
  v_existing walks;
  v_valid   boolean;
  v_dist    integer := greatest(0, coalesce(p_distance_m, 0));
  v_dur     integer := greatest(0, coalesce(p_duration_s, 0));
  v_moving  integer := least(greatest(0, coalesce(p_moving_s, 0)), greatest(0, coalesce(p_duration_s, 0)));
  v_paws    integer := 0;
  v_km      numeric;
  v_day     date;
  v_yday    date;
  v_week    text;
  v_streak_row streaks;
  v_new_streak integer;
  v_paws_walk integer := 0;
  v_paws_streak integer := 0;
  v_paws_challenge integer := 0;
  v_walks_week integer; v_km_week numeric; v_days_week integer;
  v_walks_total integer; v_km_total numeric; v_challenges_completed integer;
  c record; b record;
  v_new_badges text[] := array[]::text[];
  v_done_challenges text[] := array[]::text[];
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_client_key is null or btrim(p_client_key) = '' then raise exception 'missing_client_key' using errcode = '22023'; end if;
  -- Eierskap på hund (hvis oppgitt): aldri stol på klienten.
  if p_dog_id is not null and not exists (select 1 from dogs d where d.id = p_dog_id and d.owner_id = v_me) then
    raise exception 'not_your_dog' using errcode = '42501';
  end if;

  -- Idempotens: samme klientnøkkel returnerer den lagrede turen (ingen ny award).
  select * into v_existing from walks where profile_id = v_me and client_key = p_client_key;
  if found then
    select * into v_streak_row from streaks where profile_id = v_me;
    return jsonb_build_object(
      'walk_id', v_existing.id, 'valid', v_existing.valid, 'duplicate', true,
      'paws_awarded', 0, 'streak_current', coalesce(v_streak_row.current_days, 0),
      'new_badges', '[]'::jsonb, 'completed_challenges', '[]'::jsonb
    );
  end if;

  v_valid := v_dist >= 50; -- MIN_VALID_WALK_M (se app/lib/track.js)
  v_km := round(v_dist / 1000.0, 2);
  v_paws_walk := case when v_valid then round(v_dist / 1000.0 * 100) + 20 else 0 end; -- PAWS.perKm/walkCompleted

  insert into walks (profile_id, dog_id, started_at, ended_at, distance_m, duration_s, moving_duration_s,
                     valid, gps_quality, flagged_suspicious, elevation_m, place_id, paws_earned, client_key)
  values (v_me, p_dog_id, p_started_at, p_ended_at, v_dist, v_dur, v_moving,
          v_valid, p_gps_quality, coalesce(p_flagged, false), p_elevation_m, p_place_id, v_paws_walk, p_client_key)
  returning * into v_walk;

  if not v_valid then
    return jsonb_build_object('walk_id', v_walk.id, 'valid', false, 'duplicate', false,
      'paws_awarded', 0, 'streak_current', coalesce((select current_days from streaks where profile_id = v_me), 0),
      'new_badges', '[]'::jsonb, 'completed_challenges', '[]'::jsonb);
  end if;

  -- Poter for turen (idempotent på selve turen).
  v_paws_walk := _award_paws(v_me, 'walk', 'walk:' || v_walk.id::text, v_walk.id, v_paws_walk);

  -- Streak: sammenhengende Oslo-kalenderdager. Maks én streak-dag-bonus per dag.
  v_day  := _oslo_date(p_ended_at);
  v_yday := v_day - 1;
  select * into v_streak_row from streaks where profile_id = v_me;
  if not found then
    v_new_streak := 1;
    insert into streaks (profile_id, current_days, longest_days, last_walk_on)
    values (v_me, 1, 1, v_day);
    v_paws_streak := _award_paws(v_me, 'streak', 'streak:' || v_day::text, null, 10);
  elsif v_streak_row.last_walk_on = v_day then
    v_new_streak := v_streak_row.current_days; -- allerede talt i dag
  else
    v_new_streak := case when v_streak_row.last_walk_on = v_yday then v_streak_row.current_days + 1 else 1 end;
    update streaks set current_days = v_new_streak,
                       longest_days = greatest(longest_days, v_new_streak),
                       last_walk_on = v_day
     where profile_id = v_me;
    v_paws_streak := _award_paws(v_me, 'streak', 'streak:' || v_day::text, null, 10);
  end if;

  -- Ukentlige aggregater fra ekte, gyldige turer (Oslo-uke).
  v_week := _oslo_week(p_ended_at);
  select count(*), coalesce(sum(distance_m), 0) / 1000.0, count(distinct _oslo_date(ended_at))
    into v_walks_week, v_km_week, v_days_week
    from walks where profile_id = v_me and valid and _oslo_week(ended_at) = v_week;
  select count(*), coalesce(sum(distance_m), 0) / 1000.0
    into v_walks_total, v_km_total
    from walks where profile_id = v_me and valid;

  -- Challenge-fremgang: derivert, aldri client-inkrementert. Reward én gang.
  for c in select * from challenges where scope = 'ukentlig'
           and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()) loop
    declare v_val numeric; v_done boolean;
    begin
      v_val := case c.metric
                 when 'walks_week' then v_walks_week
                 when 'km_week' then v_km_week
                 when 'active_days_week' then v_days_week
                 else 0 end;
      v_done := v_val >= c.target;
      insert into challenge_progress (profile_id, challenge_id, value, completed_at)
      values (v_me, c.id, v_val, case when v_done then now() else null end)
      on conflict (profile_id, challenge_id) do update
        set value = excluded.value,
            completed_at = coalesce(challenge_progress.completed_at, excluded.completed_at);
      if v_done then
        -- Reward idempotent per challenge+uke, slik at en ny uke kan belønnes på nytt.
        if _award_paws(v_me, 'challenge', 'challenge:' || c.id || ':' || v_week, null, c.reward_paws) > 0 then
          v_paws_challenge := v_paws_challenge + c.reward_paws;
          v_done_challenges := v_done_challenges || c.id;
        end if;
      end if;
    end;
  end loop;

  select count(*) into v_challenges_completed from challenge_progress where profile_id = v_me and completed_at is not null;

  -- Merker: tildel fra ekte milepæler (idempotent via badge_awards-PK).
  for b in select * from badges loop
    declare v_bval numeric;
    begin
      v_bval := case b.metric
                  when 'walks_total' then v_walks_total
                  when 'km_total' then v_km_total
                  when 'active_days_week' then v_days_week
                  when 'challenges_completed' then v_challenges_completed
                  else 0 end;
      if v_bval >= b.target then
        insert into badge_awards (profile_id, badge_id) values (v_me, b.id)
        on conflict (profile_id, badge_id) do nothing;
        if found then v_new_badges := v_new_badges || b.id; end if;
      end if;
    end;
  end loop;

  v_paws := v_paws_walk + v_paws_streak + v_paws_challenge;
  return jsonb_build_object(
    'walk_id', v_walk.id, 'valid', true, 'duplicate', false,
    'km', v_km, 'paws_awarded', v_paws, 'streak_current', v_new_streak,
    'new_badges', to_jsonb(v_new_badges), 'completed_challenges', to_jsonb(v_done_challenges)
  );
end $$;

-- =============================================================================
-- 5. LES: aktivitetssammendrag, challenges, merker, toppliste
-- =============================================================================

-- Ekte totaler + denne uka + streak + personlige rekorder.
create or replace function activity_summary()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  w as (select * from walks where profile_id = (select id from me) and valid),
  wk as (select _oslo_week(now()) as k)
  select jsonb_build_object(
    'total_walks', (select count(*) from w),
    'total_km', (select round(coalesce(sum(distance_m),0)/1000.0, 1) from w),
    'total_moving_s', (select coalesce(sum(moving_duration_s),0) from w),
    'week_walks', (select count(*) from w where _oslo_week(ended_at) = (select k from wk)),
    'week_km', (select round(coalesce(sum(distance_m),0)/1000.0, 1) from w where _oslo_week(ended_at) = (select k from wk)),
    'week_moving_s', (select coalesce(sum(moving_duration_s),0) from w where _oslo_week(ended_at) = (select k from wk)),
    'week_active_days', (select count(distinct _oslo_date(ended_at)) from w where _oslo_week(ended_at) = (select k from wk)),
    'streak_current', (select coalesce(current_days,0) from streaks where profile_id = (select id from me)),
    'streak_longest', (select coalesce(longest_days,0) from streaks where profile_id = (select id from me)),
    'paws', (select coalesce(sum(amount),0) from paw_ledger where profile_id = (select id from me)),
    'pb_longest_walk_km', (select round(coalesce(max(distance_m),0)/1000.0, 2) from w),
    'pb_best_week_km', (select round(coalesce(max(wkm),0)/1000.0, 1) from (
        select sum(distance_m) as wkm from w group by _oslo_week(ended_at)) t)
  );
$$;

-- Challenge-definisjoner + min ekte fremgang.
create or replace function list_challenges()
returns table (id text, scope text, title text, metric text, target numeric, unit text, reward_paws integer, value numeric, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.scope, c.title, c.metric, c.target, c.unit, c.reward_paws,
         coalesce(cp.value, 0), cp.completed_at
    from challenges c
    left join challenge_progress cp on cp.challenge_id = c.id and cp.profile_id = auth.uid()
   where (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at >= now())
   order by c.reward_paws asc;
$$;

-- Merke-definisjoner + om jeg har oppnådd dem.
create or replace function list_badges()
returns table (id text, name text, metric text, target numeric, icon text, color text, awarded_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.metric, b.target, b.icon, b.color, ba.awarded_at
    from badges b
    left join badge_awards ba on ba.badge_id = b.id and ba.profile_id = auth.uid()
   order by b.target asc;
$$;

-- Lokal toppliste – låst til færre enn 10 aktive hunder (ekte, per periode).
-- «Aktiv hund» = hund med minst én gyldig tur i inneværende Oslo-uke i kommunen.
create or replace function local_leaderboard(p_municipality text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_week text := _oslo_week(now());
  v_active integer;
  v_rows jsonb;
begin
  select count(distinct d.id) into v_active
    from walks w
    join dogs d on d.id = w.dog_id
    join profiles p on p.id = w.profile_id
   where w.valid and _oslo_week(w.ended_at) = v_week
     and p.municipality_id = p_municipality and p.suspended_at is null;

  if v_active < 10 then
    return jsonb_build_object('unlocked', false, 'active_dogs', v_active, 'min_active', 10, 'rows', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows from (
    select d.name as dog_name, round(sum(w.distance_m)/1000.0, 1) as km
      from walks w
      join dogs d on d.id = w.dog_id
      join profiles p on p.id = w.profile_id
     where w.valid and _oslo_week(w.ended_at) = v_week
       and p.municipality_id = p_municipality and p.suspended_at is null
     group by d.id, d.name
     order by km desc
     limit 20
  ) t;
  return jsonb_build_object('unlocked', true, 'active_dogs', v_active, 'min_active', 10, 'rows', v_rows);
end $$;

-- =============================================================================
-- 6. RETTIGHETER: alle nye RPC-er er authenticated-only, aldri PUBLIC.
-- =============================================================================
revoke execute on function complete_walk(text, uuid, timestamptz, timestamptz, integer, integer, integer, text, boolean, integer, uuid) from public;
revoke execute on function activity_summary() from public;
revoke execute on function list_challenges() from public;
revoke execute on function list_badges() from public;
revoke execute on function local_leaderboard(text) from public;
-- Interne hjelpere skal ikke kalles direkte utenfra.
revoke execute on function _award_paws(uuid, text, text, uuid, integer) from public;

grant execute on function complete_walk(text, uuid, timestamptz, timestamptz, integer, integer, integer, text, boolean, integer, uuid) to authenticated;
grant execute on function activity_summary() to authenticated;
grant execute on function list_challenges() to authenticated;
grant execute on function list_badges() to authenticated;
grant execute on function local_leaderboard(text) to authenticated;
