# Supabase-oppsett for Potesjarm

Sprint 1 kobler appen til Supabase: **auth (magic link) + `profiles` + `dogs`**.
All databasestruktur ligger i [`schema.sql`](./schema.sql) (38 tabeller med Row
Level Security). Denne guiden får din instans opp å kjøre.

## 1. Kjør skjemaet inn i prosjektet ditt

1. Åpne Supabase-dashbordet for prosjektet ditt.
2. Gå til **SQL Editor** → **New query**.
3. Lim inn hele innholdet i `supabase/schema.sql` og kjør det.
   - Skriptet er idempotent (`create table if not exists`, `create policy` osv.),
     så det er trygt å kjøre på nytt hvis du har en tidligere versjon.
4. **Migrasjoner** (kjør i rekkefølge, hver i en ny, tom SQL-fane):
   - `supabase/migrations/003_sprint3_social_graph.sql` – Sprint 3: hundevenn
     (forespørsler + vennskap), oppdagbarhet på hunder, og sikre RPC-er for
     følge/venn/blokk/oppdag. Også idempotent.
   - `supabase/migrations/004_sprint4_groups.sql` – Sprint 4: grupper.
     `meetups.group_id` + RPC-er for medlemskap, gruppefeed, gruppetreff og
     moderering (fjern medlem, roller, slett innlegg). Idempotent.
   - `supabase/migrations/005_sprint5_chat_realtime.sql` – Sprint 5: ekte chat.
     `conversations.kind/meetup_id/dm_key` (hindrer duplikate direkte-samtaler
     og >1 treff-samtale), **retting av en RLS-bug på `messages`** (den gamle
     policyen lot enhver samtaledeltaker lese ALLE samtaler), RPC-er for
     hent/opprett direkte- og treff-samtale, send melding, samtaleliste,
     meldinger og marker-lest, samt **aktivering av Realtime på `messages`**.
     Idempotent. Se «Realtime» under.
   - `supabase/migrations/007_sprint7_notifications.sql` – Sprint 7: ekte varsler.
     `notifications.actor_id` + indekser, en `_notify`-hjelper (blokkering +
     innstillinger + dedupe) og AFTER-triggere på følge/hundevenn/like/kommentar/
     melding/treff-påmelding/treff-avlysning som lager varsler **server-side**.
     RPC-er for liste, ulest-antall, marker lest / alle lest, og innstillinger.
     `push_subscriptions` (fundament for web-push, RLS på egne rader) og
     **aktivering av Realtime på `notifications`**. Additiv og idempotent.
   - `supabase/migrations/006_sprint6_feed.sql` – Sprint 6: ekte feed.
     Ingen nye tabeller (`posts`/`post_likes`/`comments`/`saved_posts`/`follows`
     finnes fra før). Legger til feed-indekser, en berikelses-view `post_card`
     (ekte likes/kommentar-tall + min egen liked/saved) og SECURITY DEFINER-
     RPC-er for feed (relevans + cursor), lagrede, kommentarer, likes, saves og
     lag/slett innlegg. Blokkering + gruppemedlemskap håndheves i RPC-ene.
     Erstatter Sprint 4 sin `list_group_posts` med en beriket variant (samme
     form som hjem-feeden), så gruppefeed og hjem-feed deler kode. Idempotent.

   - `supabase/migrations/009_sprint8_map_geo.sql` – Sprint 8: kart/steder/geo.
     Utvider `places` med `status` (pending/approved/rejected), `region` (fylke),
     `address_label` og `updated_at`; strammer RLS så bare **godkjente** steder
     (eller ens egne forslag) er synlige og brukerforslag alltid er `pending`.
     SECURITY DEFINER-RPC-er: `places_in_area` (godkjente steder i kommune/
     region/radius, med avstand + ekte antall kommende treff), `place_detail`,
     `map_meetups` (aktive treff med koordinater – filtrerer bort blokkerte
     verter og gruppetreff man ikke er medlem av) og `suggest_place` (foreslå et
     `pending` sted; server setter created_by/source/status/region). Bruker
     eksisterende `cube`/`earthdistance` – ingen PostGIS. Additiv og idempotent.

   - `supabase/migrations/010_sprint9_activity_gamification.sql` – Sprint 9:
     aktivitet + gamification (server som sannhet). **Preflight-sikkerhet:** ny
     `list_meetups_near`-RPC (blokkering + gruppesynlighet som kartet) og
     eksplisitt `revoke execute ... from public` på 009-RPC-ene. Legger til
     idempotens-nøkler (`walks.client_key`, `paw_ledger.source_key` med unike
     indekser), seeder challenge-/badge-definisjoner, og SECURITY DEFINER-RPC-er:
     `complete_walk` (persisterer tur, validerer eierskap, deler ut poter/streak/
     challenge-fremgang/merker – alt idempotent), `activity_summary`,
     `list_challenges`, `list_badges` og `local_leaderboard` (låst under 10
     aktive hunder). Klienten sender aldri fremgang. Additiv og idempotent.
     Uten denne faller aktivitet tilbake på lokal/demo-logikk.

   - `supabase/migrations/011_sprint10_security_moderation_privacy.sql` – Sprint 10:
     sikkerhet + moderering + personvern + GDPR. Fjerner `EXECUTE` for `PUBLIC`
     på ALLE funksjoner (og gir authenticated det de trenger; carve-out på de
     privilegerte interne skriverne `_award_paws`/`_notify`; anon kun på
     venteliste + les-steder). Låser `walks`/`streaks`/`challenge_progress` til
     lese-kun for klienten (skriving kun via `complete_walk`). Kolonne-nivå
     UPDATE på `profiles` (klient kan ikke sette `is_founder`/`verified_at`/
     `suspended_at`), og founder-flagget utledes kun fra en legitim venteliste-
     signup. Strammer `posts`/`comments`/`meetups` SELECT for gruppe-/blokk-
     konfidensialitet. Innholdslengder (CHECK, NOT VALID). Leaderboard opt-in
     (`dogs.show_on_leaderboard`, default av). Fysisk plausibilitet i
     `complete_walk` (umulige turer gir 0 belønning). Rapport-RPC med dedupe,
     og GDPR-RPC-ene `export_my_data` + `delete_my_account`. Se
     `supabase/security_checks.sql` for verifiseringsspørringer å kjøre etterpå.
     Additiv og idempotent.

   - `supabase/migrations/008_waitlist.sql` – ventelisten: `waitlist_signups`
     (hund, e-post, by, ekte plass per by, Founder for de første 100, referral-
     kode, UTM + referrer), RPC-en `join_waitlist` (kan kalles uten innlogging;
     tabellen er ellers helt lukket med RLS), og en trigger som setter
     `profiles.is_founder` når en Founder lager konto med samme e-post.
     Uten denne faller ventelisten tilbake på Formspree/mailto.

## 2. Hent nøklene

I dashbordet: **Project Settings → API**. Du trenger:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Anon-nøkkelen er ment for klienten og trygg å eksponere – sikkerheten ligger i
RLS-policyene, ikke i at nøkkelen er hemmelig. (Service-role-nøkkelen skal
**aldri** i klienten eller i git.)

## 3. Sett miljøvariablene

**Lokalt:** kopier `.env.local.example` → `.env.local` og fyll inn verdiene.

**Vercel:** Settings → Environment Variables → legg til begge (Production +
Preview). Redeploy etterpå.

## 4. Slå på appen (når du er klar)

Så lenge `WAITLIST_MODE` er `true` (i `app/lib/launch.js`) viser rot-siden
ventelisten. For å la ekte kunder logge inn:

- Sett `WAITLIST_MODE = false`, eller bygg med `NEXT_PUBLIC_WAITLIST_MODE=off`.
- Med Supabase-nøklene satt vil ikke-innloggede se innloggingsskjermen (magic
  link), og innloggede får appen med sin ekte profil og hund.
- Uten nøklene kjører appen videre som lokal prototype/demo (ingen innlogging).

### Realtime (chat) – aktiveres automatisk av migrasjon 005

Migrasjon `005` legger `messages` til `supabase_realtime`-publiseringen selv
(idempotent), så nye meldinger strømmer til deltakerne uten et manuelt steg.
Realtime håndhever `messages`-sin SELECT-policy, så kun samtalens medlemmer får
hendelsene – derfor retter `005` også den gamle, for vide policyen først.

Vil du heller slå det på i dashbordet: **Database → Replication →
`supabase_realtime` → legg til tabellen `messages`**. Kjører du migrasjonen er
dette allerede gjort.

Migrasjon `007` gjør det samme for `notifications` (varsler i sanntid). Ekte
web-push (utsending når appen er lukket) er kun forberedt – tabellen
`push_subscriptions` finnes, men selve utsendingen krever en VAPID-nøkkel
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) + en service worker + en Edge Function, som
kobles på i et senere steg. Uten det sier appen ærlig «Pushvarsler kommer
snart»; in-app varsler (Realtime) virker uansett.

### Magic link – redirect-URL

Magic link-e-posten sender brukeren tilbake til `window.location.origin`. Legg
til domenene dine under **Authentication → URL Configuration → Redirect URLs**:

- `http://localhost:3000` (lokal utvikling)
- `https://potesjarm.no` (produksjon)
- Vercel-preview-URL-en om du tester der.

## Hva som er koblet i Sprint 1

| Område | Status |
| --- | --- |
| Auth: magic link inn, session, logg ut | ✅ kode klar (`app/components/auth.js`) |
| `profiles`: opprettes/oppdateres fra onboarding og profilendring | ✅ (`app/lib/db/profiles.js`, `sync.js`) |
| `dogs`: primærhund opprettes/oppdateres fra onboarding | ✅ (`app/lib/db/dogs.js`) |
| Slett konto | ⚠️ sletter brukerens egne data + logger ut. Å fjerne selve `auth.users`-raden krever en **Edge Function** med service-role – kommer i Trygghet-sprinten. |

Logg-ut- og slett-konto-knapper i «Mer»-menyen wires inn i neste steg (metodene
finnes allerede i `useAuth()`).
