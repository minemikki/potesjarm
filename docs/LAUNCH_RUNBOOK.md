# Potesjarm – Launch Runbook (pilot → public)

> Denne kjøreboka **utfører ikke** en launch. Den dokumenterer den bevisste
> prosessen. Production-root er hardlåst til venteliste (`app/lib/launch.js`).
> Appen gjøres offentlig kun som en bevisst kodeendring – aldri via miljøvariabel.

## 0. Forutsetninger (må være grønt før pilot)
- Migrasjoner `003`–`012` kjørt i produksjons-Supabase (rekkefølge).
- `supabase/security_checks.sql` kjørt, alle forventede verdier stemmer.
- Minst én moderator lagt inn (se §4).
- `delete-account` Edge Function deployet (se §5) – ellers er GDPR-sletting ufullstendig.

## 1. Prelaunch DB-sjekker
Kjør i SQL Editor:
```sql
-- RLS på alle sensitive tabeller
select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and relname in
('profiles','dogs','walks','walk_points','paw_ledger','streaks','challenge_progress',
 'posts','comments','meetups','messages','waitlist_signups','moderators','reports') order by relname;
-- Alt skal ha relrowsecurity = true.
```
Kjør deretter hele `supabase/security_checks.sql` (12 sjekker) + #13 manuelt (rollback).

## 2. Miljøvariabler (Vercel Production + Preview)
| Variabel | Verdi | Merk |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | prosjekt-URL | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon-nøkkel | trygg i klient |
| `NEXT_PUBLIC_MAP_TILES_URL` | tile-URL | CARTO for pilot |
| `NEXT_PUBLIC_WAITLIST_MODE` | *(ikke sett i Production)* | hardlåst uansett |
| `SUPABASE_SERVICE_ROLE_KEY` | **kun** som Edge Function secret | ALDRI i klient/Vercel-klientvars |
Aldri legg service-role-nøkkelen i en `NEXT_PUBLIC_*`-variabel.

## 3. Kartfliser (tiles)
- Pilot: CARTO/OSM via `NEXT_PUBLIC_MAP_TILES_URL` (default i koden) er ok for lavt volum.
- Før offentlig launch / høyere volum: bytt til betalt provider (MapTiler/Stadia) og oppdater variabelen + attribusjon. Sjekk vilkår for tile-volum.

## 4. Moderator-konto (obligatorisk før pilot)
Roller settes **kun** server-side (aldri klient). Legg til moderator på deres auth-uid:
```sql
insert into moderators (profile_id) values ('<AUTH_USER_UID>')
on conflict do nothing;
```
Finn uid: Supabase → Authentication → Users. Fjern med `delete from moderators where profile_id='…'`.

## 5. Storage / Push status
- **Storage (bildeopplasting):** IKKE satt opp for pilot. Appen sier ærlig «Bildeopplasting kommer snart» og bruker branded fallback-bilder. Ikke en blocker for pilot.
- **Push:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` ikke satt → push-knappen er deaktivert, ingen browser-permission etterspørres. In-app-varsler (Realtime) virker. Ikke en blocker for pilot.

### Edge Function: delete-account (GDPR full sletting)
```bash
# Krever Supabase CLI + innlogget prosjekt (supabase link).
supabase functions deploy delete-account
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# SUPABASE_URL og SUPABASE_ANON_KEY settes automatisk av plattformen for functions.
```
Test: kall funksjonen med en test-brukers JWT og body `{"confirm":"SLETT"}` → `{"deleted":true}`, og bekreft at auth-brukeren + all data er borte (cascade). Koble deretter `delete_my_account`-UI-knappen til Edge Function-endepunktet (i dag kaller den kun RPC-en som ikke fjerner auth-brukeren — se «Gjenstår»).

## 6. Backup / sjekk
- Supabase → Database → Backups: bekreft at Point-in-Time/daglig backup er på før pilot.
- Ta en manuell `pg_dump`/snapshot rett før launch.

## 7. Skru AV venteliste (bevisst kodeendring – IKKE for pilot)
Kun når dere faktisk skal åpne appen offentlig:
- Rediger `app/lib/launch.js`: fjern produksjons-hardlåsen (`if (vercelEnv === "production") return true;`) eller sett `WAITLIST_MODE = false`.
- Dette er en committet, gjennomgått endring – aldri en miljøvariabel.

## 8. Deploy
- Pilot: del **Preview-URL-en** med de inviterte (appen er der; produksjon viser fortsatt venteliste).
- Public: merge til `main` først etter eksplisitt godkjenning; Vercel bygger produksjon.

## 9. Smoke-tester (etter deploy)
Kjør de manuelle stiene i `docs/PILOT_PHONE_TEST.md` + `e2e`-suiten. Minimum:
signup → onboarding → opprett hund → lag treff → bli med → meld → tur start/slutt → foreslå sted → eksport.

## 10. Rollback
- App: Vercel → forrige deployment → «Promote to Production».
- DB: migrasjonene er additive; en dårlig migrasjon rulles tilbake med en ny reverserende migrasjon (ikke slett data). Bruk backup fra §6 kun ved datatap.

## Gjenstår før full public launch
- Koble `delete_my_account`-UI til `delete-account` Edge Function (RPC alene fjerner ikke auth-bruker).
- Ekte web-push (VAPID + service worker + utsendings-funksjon).
- Supabase Storage for bilder (bucket + policyer).
- Redaksjonelle steder i Rogaland (`docs/ROGALAND_PLACES_SEED.md`).
- Verifiser `app/lib/geo.js`-kommunelista mot SSB/Kartverket.
