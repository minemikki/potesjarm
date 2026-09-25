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
