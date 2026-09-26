-- =========================================================
-- POTESJARM SPRINT 10 — SECURITY CHECKS (CORRECTED)
-- Kjør ETTER 011.
-- Dette skal ikke endre data.
-- =========================================================

-- 1) PUBLIC skal ikke ha EXECUTE på noen public-funksjon.
-- Forventet: 0 rader
select
  p.proname,
  p.oid::regprocedure as signature
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and has_function_privilege('public', p.oid, 'EXECUTE');


-- 2) Interne privilegerte skrivere skal IKKE være kallbare av authenticated.
-- Signature-independent.
-- Forventet: alle rader false.
select
  p.proname,
  p.oid::regprocedure as signature,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('_award_paws', '_notify')
order by p.proname, p.oid::regprocedure::text;


-- 3) Offentlige RPC-er skal være kallbare av anon.
-- Forventet: true på alle som finnes.
select
  p.proname,
  p.oid::regprocedure as signature,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('join_waitlist', 'places_in_area', 'place_detail')
order by p.proname;


-- 4) anon skal ikke kunne lese waitlist direkte.
-- Forventet: false
select
  has_table_privilege('anon', 'public.waitlist_signups', 'SELECT')
  as anon_can_read_waitlist;


-- 5) Sensitive profile-kolonner skal IKKE være oppdaterbare av authenticated.
-- display_name skal fortsatt være true.
select
  has_column_privilege('authenticated', 'public.profiles', 'is_founder', 'UPDATE')
    as can_set_founder,
  has_column_privilege('authenticated', 'public.profiles', 'verified_at', 'UPDATE')
    as can_set_verified,
  has_column_privilege('authenticated', 'public.profiles', 'suspended_at', 'UPDATE')
    as can_set_suspended,
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
    as can_set_name;


-- 6) walks / streaks / challenge_progress:
-- se at klienten kun har SELECT-policyer, ikke INSERT/UPDATE/DELETE.
select
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('walks', 'streaks', 'challenge_progress')
order by tablename, policyname;


-- 7) Sensitive group/social SELECT policies.
-- Sjekk at posts/comments/meetups har medlemskap/blokkering i qual.
select
  tablename,
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and tablename in ('posts', 'comments', 'meetups')
  and cmd = 'SELECT'
order by tablename, policyname;


-- 8) Report dedupe index.
-- Forventet: 1 rad
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'reports'
  and indexname = 'reports_dedupe_uidx';


-- 9) Leaderboard opt-in.
-- Forventet default false
select
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'dogs'
  and column_name = 'show_on_leaderboard';


-- 10) GDPR RPC permissions.
-- Forventet:
-- authenticated = true
-- public = false
select
  p.proname,
  p.oid::regprocedure as signature,
  has_function_privilege('authenticated', p.oid, 'EXECUTE')
    as authenticated_can_execute,
  has_function_privilege('public', p.oid, 'EXECUTE')
    as public_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('export_my_data', 'delete_my_account')
order by p.proname;


-- 11) Waitlist RLS / policies.
-- Forventet:
-- RLS enabled
-- ingen SELECT-policy som åpner radene offentlig
select
  c.relname,
  c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'waitlist_signups';

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'waitlist_signups';


-- 12) Finn alle SECURITY DEFINER-funksjoner og hvem som kan kjøre dem.
-- Dette er en generell sanity check.
select
  p.proname,
  p.oid::regprocedure as signature,
  p.prosecdef as security_definer,
  has_function_privilege('public', p.oid, 'EXECUTE') as public_exec,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname, p.oid::regprocedure::text;


-- 13) MANUELL: aktivitetsintegritet. Kjør som en INNLOGGET testbruker, i en
-- transaksjon du RULLER TILBAKE, så ingen ekte data endres. En fysisk umulig
-- tur (50 km på 5 min) skal gi valid=false og paws_awarded=0.
-- begin;
--   select complete_walk('itest-'||gen_random_uuid(), null, now()-interval '5 min', now(),
--                        50000, 300, 300, 'good', false, null, null);
--   -- forventet: {"valid": false, "paws_awarded": 0, ...}
-- rollback;
