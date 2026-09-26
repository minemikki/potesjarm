-- =============================================================================
-- Potesjarm – sikkerhets-verifisering (Sprint 10)
--
-- Kjør disse i Supabase SQL Editor ETTER migrasjon 011 for å bekrefte at
-- herdingen faktisk sitter. Hver spørring har en forventet verdi i kommentaren.
-- Dette er lesende sjekker – de endrer ingenting.
-- =============================================================================

-- 1) PUBLIC skal ikke ha EXECUTE på noen public-funksjon.  Forventet: 0 rader.
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and has_function_privilege('public', p.oid, 'EXECUTE');

-- 2) De privilegerte interne skriverne skal IKKE være kallbare av authenticated.
--    Forventet: begge false.
select
  has_function_privilege('authenticated', '_award_paws(uuid,text,text,uuid,integer)', 'EXECUTE') as award_paws_exec,
  has_function_privilege('authenticated', '_notify(uuid,uuid,text,text,text,text,text,uuid,text,interval)', 'EXECUTE') as notify_exec;

-- 3) Ekte offentlige RPC-er SKAL være kallbare av anon.  Forventet: alle true.
select
  has_function_privilege('anon', 'join_waitlist(text,text,text,text,text,text,text,text,text,text,text)', 'EXECUTE') as waitlist,
  has_function_privilege('anon', 'places_in_area(text,text,double precision,double precision,double precision,text,integer)', 'EXECUTE') as places,
  has_function_privilege('anon', 'place_detail(uuid)', 'EXECUTE') as place_detail;

-- 4) anon skal ALDRI kunne lese ventelisten direkte.  Forventet: false.
select has_table_privilege('anon', 'waitlist_signups', 'SELECT') as anon_can_read_waitlist;

-- 5) authenticated skal ikke kunne oppdatere is_founder/verified_at/suspended_at.
--    Forventet: alle false (kolonne-nivå UPDATE ikke gitt).
select
  has_column_privilege('authenticated', 'profiles', 'is_founder', 'UPDATE')  as can_set_founder,
  has_column_privilege('authenticated', 'profiles', 'verified_at', 'UPDATE') as can_set_verified,
  has_column_privilege('authenticated', 'profiles', 'suspended_at', 'UPDATE') as can_set_suspended,
  has_column_privilege('authenticated', 'profiles', 'display_name', 'UPDATE') as can_set_name; -- denne skal være true

-- 6) walks/streaks/challenge_progress skal være LESE-KUN via RLS (ingen
--    write-policy for klienten). Forventet: kun 'select'-cmd-policyer.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('walks','streaks','challenge_progress')
order by tablename, policyname;

-- 7) Ingen gjenværende "alle innloggede kan lese alt uten filter" på
--    gruppe-/blokk-sensitive tabeller. Se manuelt at posts/comments/meetups
--    har medlemskaps-/blokk-vilkår i qual.
select tablename, policyname, qual
from pg_policies
where schemaname = 'public' and tablename in ('posts','comments','meetups') and cmd = 'SELECT';

-- 8) Rapport-dedupe finnes.  Forventet: 1 rad (reports_dedupe_uidx).
select indexname from pg_indexes
where schemaname = 'public' and tablename = 'reports' and indexname = 'reports_dedupe_uidx';

-- 9) Leaderboard opt-in-kolonnen finnes med default false. Forventet: 1 rad, false.
select column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'dogs' and column_name = 'show_on_leaderboard';

-- 10) GDPR-RPC-ene finnes og er authenticated-only.  Forventet: begge true, ingen public.
select
  has_function_privilege('authenticated', 'export_my_data()', 'EXECUTE') as export_auth,
  has_function_privilege('authenticated', 'delete_my_account(text)', 'EXECUTE') as delete_auth,
  has_function_privilege('public', 'delete_my_account(text)', 'EXECUTE') as delete_public; -- skal være false

-- 11) Aktivitetsintegritet (manuell, i en transaksjon du RULLER TILBAKE):
--     Som en innlogget testbruker, kall complete_walk med en fysisk umulig tur
--     og bekreft valid=false + paws_awarded=0. IKKE kjør mot en ekte bruker
--     du vil beholde ren; bruk en test-konto eller rull tilbake.
-- begin;
--   select complete_walk('itest-'||gen_random_uuid(), null, now()-interval '5 min', now(),
--                        50000, 300, 300, 'good', false, null, null);
--   -- forventet: {"valid": false, "paws_awarded": 0, ...}
-- rollback;
