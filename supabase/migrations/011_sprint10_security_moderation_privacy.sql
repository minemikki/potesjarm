-- =============================================================================
-- Sprint 10 – Sikkerhet + moderering + personvern + GDPR
--
-- Additiv og idempotent. Lukker reelle hull uten å over-engineere. Bygger på
-- schema.sql + migrasjonene 003–010.
--
-- Kjøres som ÉN transaksjon (begin/commit): enten går alt inn, eller ingenting
-- – trygt å kjøre på nytt.
-- =============================================================================
begin;

-- =============================================================================
-- 1. RPC-PRIVILEGIER: fjern PUBLIC-defaulten overalt
-- =============================================================================
-- PostgreSQL (og Supabase) gir EXECUTE til PUBLIC på nye funksjoner. Tidligere
-- migrasjoner (schema + 003–007) satte aldri dette, så alt var kallbart av anon.
-- Fjern PUBLIC fra ALLE funksjoner, gi authenticated det de trenger, og carve
-- ut de privilegerte interne skriverne + gjenåpne kun de ekte offentlige.
revoke execute on all functions in schema public from public;
grant  execute on all functions in schema public to authenticated;

-- Privilegerte interne skrivere skal ALDRI kalles direkte (kun av definer-
-- funksjoner/triggere som kjører som eier). Ellers kunne en klient gitt seg
-- selv poter eller laget vilkårlige varsler. Signatur-uavhengig (finner den
-- faktiske funksjonen via oid, uansett argumenttyper/defaults).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('_award_paws', '_notify')
  loop
    execute format('revoke execute on function %s from authenticated', r.sig);
  end loop;
end $$;

-- Ekte offentlige endepunkter (uinnlogget): ventelisten + les av godkjente steder.
grant execute on function join_waitlist(text, text, text, text, text, text, text, text, text, text, text) to anon;
grant execute on function places_in_area(text, text, double precision, double precision, double precision, text, integer) to anon;
grant execute on function place_detail(uuid) to anon;

-- =============================================================================
-- 2. LÅS AVLEDEDE/INTEGRITETSDATA TIL LESE-KUN FOR KLIENTER
-- =============================================================================
-- Turer, streak og challenge-fremgang skrives KUN av complete_walk (SECURITY
-- DEFINER). Den gamle «for all»-policyen lot en klient sette valid=true,
-- distance_m=50000 eller current_days=999 direkte. Nå: klienten kan bare LESE
-- sine egne rader; all skriving går gjennom validerende server-RPC.
drop policy if exists "walks own" on walks;
create policy "walks read own" on walks for select using (auth.uid() = profile_id);

drop policy if exists "streaks own" on streaks;
create policy "streaks read own" on streaks for select using (auth.uid() = profile_id);

drop policy if exists "progress own" on challenge_progress;
create policy "progress read own" on challenge_progress for select using (auth.uid() = profile_id);

-- walk_points: fortsatt kun eierens egne, og de er private (ingen andre kan lese
-- ruter). Skriving er ikke en belønningsvektor, men vi låser den til definer for
-- konsistens – ingen klient laster opp punkter i dag.
drop policy if exists "walk_points own" on walk_points;
create policy "walk_points read own" on walk_points for select
  using (exists (select 1 from walks w where w.id = walk_id and w.profile_id = auth.uid()));

-- =============================================================================
-- 3. PROFIL-/FOUNDER-INTEGRITET (ingen self-claim)
-- =============================================================================
-- Klienten skal aldri kunne sette is_founder / verified_at / suspended_at.
-- Kolonne-nivå UPDATE-grant: authenticated kan kun endre egne, ufarlige felter.
-- Definer-funksjoner (moderering/founder) kjører som eier og omgås dette.
revoke update on profiles from anon, authenticated;
grant  update (display_name, avatar_url, municipality_id, neighborhood_id, radius_km, approx_lat, approx_lng, bio)
  on profiles to authenticated;

-- Founder-flagget utledes UTELUKKENDE fra en legitim venteliste-signup med samme
-- verifiserte auth-e-post. Vi overstyrer klient-oppgitt verdi på både insert og
-- update, så den aldri kan forfalskes.
create or replace function trg_mark_founder()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  NEW.is_founder := exists (
    select 1 from waitlist_signups w
    join auth.users u on lower(u.email) = lower(w.email)
    where u.id = NEW.id and w.founder
  );
  return NEW;
end; $$;
drop trigger if exists mark_founder on profiles;
create trigger mark_founder before insert or update of is_founder on profiles
  for each row execute function trg_mark_founder();

-- =============================================================================
-- 4. KONFIDENSIALITET: gruppeinnhold + blokkering på DIREKTE tabell-lesing
-- =============================================================================
-- Appen leser feed/kommentarer via SECURITY DEFINER-RPC-er som allerede filtrerer,
-- men RLS var «alle innloggede kan lese alt». Stram inn direkte tabell-select
-- (forsvar i dybden): gruppeinnlegg kun for medlemmer, og aldri fra blokkerte.
drop policy if exists "posts read" on posts;
create policy "posts read" on posts for select using (
  auth.role() = 'authenticated'
  and (group_id is null or exists (
    select 1 from group_members gm where gm.group_id = posts.group_id and gm.profile_id = auth.uid()))
  and not is_blocked_between(auth.uid(), author_id)
);

drop policy if exists "comments read" on comments;
create policy "comments read" on comments for select using (
  auth.role() = 'authenticated'
  and not is_blocked_between(auth.uid(), author_id)
  and exists (
    select 1 from posts p where p.id = comments.post_id
      and (p.group_id is null or exists (
        select 1 from group_members gm where gm.group_id = p.group_id and gm.profile_id = auth.uid()))
  )
);

drop policy if exists "meetups read" on meetups;
create policy "meetups read" on meetups for select using (
  auth.role() = 'authenticated'
  and (
    host_id = auth.uid()
    or (
      not is_blocked_between(auth.uid(), host_id)
      and (group_id is null or exists (
        select 1 from group_members gm where gm.group_id = meetups.group_id and gm.profile_id = auth.uid()))
    )
  )
);

-- Rydd opp gamle «using(true)»-lesepolicyer (anon-lesbare) til innloggede.
drop policy if exists "reviews read" on place_reviews;
create policy "reviews read" on place_reviews for select using (auth.role() = 'authenticated');
drop policy if exists "routes read" on routes;
create policy "routes read" on routes for select using (auth.role() = 'authenticated');

-- =============================================================================
-- 5. INNHOLDSLENGDER (server-side, ikke bare frontend). NOT VALID => trygt mot
--    eksisterende data, håndheves for nye/endrede rader.
-- =============================================================================
do $$ begin
  alter table profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 500) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table dogs add constraint dogs_about_len check (about is null or char_length(about) <= 500) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table posts add constraint posts_body_len check (body is null or char_length(body) <= 5000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table comments add constraint comments_body_len check (char_length(body) <= 2000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table messages add constraint messages_body_len check (char_length(body) between 1 and 4000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table groups add constraint groups_name_len check (char_length(name) <= 80) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table groups add constraint groups_about_len check (about is null or char_length(about) <= 1000) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table meetups add constraint meetups_title_len check (char_length(title) <= 80) not valid;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table meetups add constraint meetups_note_len check (note is null or char_length(note) <= 1000) not valid;
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 6. LEADERBOARD-PERSONVERN: eksplisitt opt-in per hund
-- =============================================================================
alter table dogs add column if not exists show_on_leaderboard boolean not null default false;

-- Kun opt-in-hunder med ekte aktivitet teller/vises. Terskel = 10 opted-in.
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
     and d.show_on_leaderboard = true
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
       and d.show_on_leaderboard = true
       and p.municipality_id = p_municipality and p.suspended_at is null
     group by d.id, d.name
     order by km desc
     limit 20
  ) t;
  return jsonb_build_object('unlocked', true, 'active_dogs', v_active, 'min_active', 10, 'rows', v_rows);
end $$;
revoke execute on function local_leaderboard(text) from public;
grant  execute on function local_leaderboard(text) to authenticated;

-- =============================================================================
-- 7. MODERERING: rapporter (dedupe + validering) + skjuling
-- =============================================================================
-- Én åpen rapport per (rapportør, entitet). Hindrer spam-rapportering.
create unique index if not exists reports_dedupe_uidx on reports (reporter_id, target_table, target_id);

-- Moderasjonsstatus på innhold (foundation; moderator-UI kcommer senere).
alter table posts    add column if not exists hidden_at timestamptz;
alter table comments add column if not exists hidden_at timestamptz;

create or replace function submit_report(p_target_table text, p_target_id uuid, p_reason text, p_details text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid(); v_row reports;
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_target_table not in ('profile','dog','post','comment','message','group','meetup','place')
     then raise exception 'invalid_target' using errcode = '22023'; end if;
  if p_reason not in ('spam','harassment','unsafe','inappropriate','fake','other')
     then raise exception 'invalid_reason' using errcode = '22023'; end if;
  if p_target_id is null then raise exception 'invalid_target_id' using errcode = '22023'; end if;

  insert into reports (reporter_id, target_table, target_id, reason, details)
  values (v_me, p_target_table, p_target_id, p_reason, left(nullif(btrim(coalesce(p_details,'')),''), 1000))
  on conflict (reporter_id, target_table, target_id) do update set reason = excluded.reason, details = excluded.details
  returning * into v_row;

  return jsonb_build_object('id', v_row.id, 'status', v_row.status);
end $$;
revoke execute on function submit_report(text, uuid, text, text) from public;
grant  execute on function submit_report(text, uuid, text, text) to authenticated;

-- =============================================================================
-- 8. AKTIVITETSINTEGRITET: fysisk plausibilitet i complete_walk
-- =============================================================================
-- En modifisert klient kan kalle RPC-en direkte. Vi bygger ikke Strava-anti-
-- fraud, men fysisk umulige turer (50 km på 5 min) skal ALDRI gi belønning.
-- Reglene: gyldig distanse 50 m–100 km, snittfart <= 12 m/s (~43 km/t),
-- moving <= elapsed. Ugyldig => lagres, men gir 0 poter/challenge/streak/badge.
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
  v_flag    boolean;
  v_dist    integer := greatest(0, coalesce(p_distance_m, 0));
  v_dur     integer := greatest(0, coalesce(p_duration_s, 0));
  v_moving  integer := least(greatest(0, coalesce(p_moving_s, 0)), greatest(0, coalesce(p_duration_s, 0)));
  v_speed   numeric;
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
  if p_dog_id is not null and not exists (select 1 from dogs d where d.id = p_dog_id and d.owner_id = v_me) then
    raise exception 'not_your_dog' using errcode = '42501';
  end if;

  select * into v_existing from walks where profile_id = v_me and client_key = p_client_key;
  if found then
    select * into v_streak_row from streaks where profile_id = v_me;
    return jsonb_build_object(
      'walk_id', v_existing.id, 'valid', v_existing.valid, 'duplicate', true,
      'paws_awarded', 0, 'streak_current', coalesce(v_streak_row.current_days, 0),
      'new_badges', '[]'::jsonb, 'completed_challenges', '[]'::jsonb
    );
  end if;

  -- Fysisk plausibilitet: snittfart og absolutte grenser bestemmer gyldighet.
  v_speed := case when v_dur > 0 then v_dist::numeric / v_dur else 999 end;
  v_valid := v_dist >= 50 and v_dist <= 100000 and v_dur > 0 and v_speed <= 12;
  -- Flagg mistenkelig (rask, men ikke umulig) uansett hva klienten påstår.
  v_flag  := coalesce(p_flagged, false) or v_speed > 4.2;
  v_km := round(v_dist / 1000.0, 2);
  v_paws_walk := case when v_valid then round(v_dist / 1000.0 * 100) + 20 else 0 end;

  insert into walks (profile_id, dog_id, started_at, ended_at, distance_m, duration_s, moving_duration_s,
                     valid, gps_quality, flagged_suspicious, elevation_m, place_id, paws_earned, client_key)
  values (v_me, p_dog_id, p_started_at, p_ended_at, v_dist, v_dur, v_moving,
          v_valid, p_gps_quality, v_flag, p_elevation_m, p_place_id, v_paws_walk, p_client_key)
  returning * into v_walk;

  if not v_valid then
    return jsonb_build_object('walk_id', v_walk.id, 'valid', false, 'duplicate', false,
      'paws_awarded', 0, 'streak_current', coalesce((select current_days from streaks where profile_id = v_me), 0),
      'new_badges', '[]'::jsonb, 'completed_challenges', '[]'::jsonb);
  end if;

  v_paws_walk := _award_paws(v_me, 'walk', 'walk:' || v_walk.id::text, v_walk.id, v_paws_walk);

  v_day  := _oslo_date(p_ended_at);
  v_yday := v_day - 1;
  select * into v_streak_row from streaks where profile_id = v_me;
  if not found then
    v_new_streak := 1;
    insert into streaks (profile_id, current_days, longest_days, last_walk_on) values (v_me, 1, 1, v_day);
    v_paws_streak := _award_paws(v_me, 'streak', 'streak:' || v_day::text, null, 10);
  elsif v_streak_row.last_walk_on = v_day then
    v_new_streak := v_streak_row.current_days;
  else
    v_new_streak := case when v_streak_row.last_walk_on = v_yday then v_streak_row.current_days + 1 else 1 end;
    update streaks set current_days = v_new_streak, longest_days = greatest(longest_days, v_new_streak), last_walk_on = v_day
     where profile_id = v_me;
    v_paws_streak := _award_paws(v_me, 'streak', 'streak:' || v_day::text, null, 10);
  end if;

  v_week := _oslo_week(p_ended_at);
  select count(*), coalesce(sum(distance_m), 0) / 1000.0, count(distinct _oslo_date(ended_at))
    into v_walks_week, v_km_week, v_days_week
    from walks where profile_id = v_me and valid and _oslo_week(ended_at) = v_week;
  select count(*), coalesce(sum(distance_m), 0) / 1000.0
    into v_walks_total, v_km_total from walks where profile_id = v_me and valid;

  for c in select * from challenges where scope = 'ukentlig'
           and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()) loop
    declare v_val numeric; v_done boolean;
    begin
      v_val := case c.metric when 'walks_week' then v_walks_week when 'km_week' then v_km_week
                 when 'active_days_week' then v_days_week else 0 end;
      v_done := v_val >= c.target;
      insert into challenge_progress (profile_id, challenge_id, value, completed_at)
      values (v_me, c.id, v_val, case when v_done then now() else null end)
      on conflict (profile_id, challenge_id) do update
        set value = excluded.value, completed_at = coalesce(challenge_progress.completed_at, excluded.completed_at);
      if v_done and _award_paws(v_me, 'challenge', 'challenge:' || c.id || ':' || v_week, null, c.reward_paws) > 0 then
        v_paws_challenge := v_paws_challenge + c.reward_paws;
        v_done_challenges := v_done_challenges || c.id;
      end if;
    end;
  end loop;

  select count(*) into v_challenges_completed from challenge_progress where profile_id = v_me and completed_at is not null;

  for b in select * from badges loop
    declare v_bval numeric;
    begin
      v_bval := case b.metric when 'walks_total' then v_walks_total when 'km_total' then v_km_total
                  when 'active_days_week' then v_days_week when 'challenges_completed' then v_challenges_completed else 0 end;
      if v_bval >= b.target then
        insert into badge_awards (profile_id, badge_id) values (v_me, b.id) on conflict (profile_id, badge_id) do nothing;
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
revoke execute on function complete_walk(text, uuid, timestamptz, timestamptz, integer, integer, integer, text, boolean, integer, uuid) from public;
grant  execute on function complete_walk(text, uuid, timestamptz, timestamptz, integer, integer, integer, text, boolean, integer, uuid) to authenticated;

-- =============================================================================
-- 9. GDPR: dataeksport + kontosletting (server-styrt, kun egne data)
-- =============================================================================
create or replace function export_my_data()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select row_to_json(p) from profiles p where p.id = v_me),
    'dogs', (select coalesce(jsonb_agg(row_to_json(d)), '[]') from dogs d where d.owner_id = v_me),
    'posts', (select coalesce(jsonb_agg(row_to_json(po)), '[]') from posts po where po.author_id = v_me),
    'comments', (select coalesce(jsonb_agg(row_to_json(co)), '[]') from comments co where co.author_id = v_me),
    'messages', (select coalesce(jsonb_agg(row_to_json(m)), '[]') from messages m where m.sender_id = v_me),
    'group_memberships', (select coalesce(jsonb_agg(row_to_json(gm)), '[]') from group_members gm where gm.profile_id = v_me),
    'meetups_hosted', (select coalesce(jsonb_agg(row_to_json(mt)), '[]') from meetups mt where mt.host_id = v_me),
    'walks', (select coalesce(jsonb_agg(row_to_json(w)), '[]') from walks w where w.profile_id = v_me),
    'paw_ledger', (select coalesce(jsonb_agg(row_to_json(pl)), '[]') from paw_ledger pl where pl.profile_id = v_me),
    'streak', (select row_to_json(s) from streaks s where s.profile_id = v_me),
    'challenge_progress', (select coalesce(jsonb_agg(row_to_json(cp)), '[]') from challenge_progress cp where cp.profile_id = v_me),
    'badge_awards', (select coalesce(jsonb_agg(row_to_json(ba)), '[]') from badge_awards ba where ba.profile_id = v_me),
    'notification_settings', (select row_to_json(ns) from notification_settings ns where ns.profile_id = v_me),
    'follows', (select coalesce(jsonb_agg(row_to_json(f)), '[]') from follows f where f.follower_id = v_me),
    'blocks', (select coalesce(jsonb_agg(row_to_json(bl)), '[]') from blocks bl where bl.blocker_id = v_me),
    'waitlist_signup', (select row_to_json(ws) from waitlist_signups ws
        join auth.users u on lower(u.email) = lower(ws.email) where u.id = v_me)
  );
end $$;
revoke execute on function export_my_data() from public;
grant  execute on function export_my_data() to authenticated;

-- Kontosletting: sletter profilraden, som cascader bort ALLE personlige data
-- (dogs, walks, walk_points, posts, comments, messages, paw_ledger, streaks,
-- notifications, blocks, follows, meetups, gruppemedlemskap, push_subscriptions).
-- auth.users-raden krever service-role/Edge Function og fjernes i et separat
-- steg (dokumentert). Etter dette har brukeren ingen personlige data igjen.
create or replace function delete_my_account(p_confirm text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Not authenticated' using errcode = '28000'; end if;
  if p_confirm is distinct from 'SLETT' then raise exception 'confirmation_required' using errcode = '22023'; end if;
  delete from profiles where id = v_me;  -- cascader bort alt personlig innhold
  return jsonb_build_object('deleted', true);
end $$;
revoke execute on function delete_my_account(text) from public;
grant  execute on function delete_my_account(text) to authenticated;

commit;
