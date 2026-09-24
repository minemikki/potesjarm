# CLAUDE HANDOVER — Potesjarm

## Hva dette er
Potesjarm er et **norsk, lokalt hundefellesskap**. Lokal-først, sosiale hundeprofiler,
spontane treff, turer med streak og merker, lokal oppdagelse, arrangementer,
trygghet/mistet hund og en community-feed.

## Branch og preview
Jobb på `gpt/community-mvp`.
Claudes ombygging ligger på `claude/bold-hopper-6dc87d` (bygget rett på community-mvp).
**Ikke merge til main uten godkjenning.**

Repo: https://github.com/minemikki/potesjarm

---

# 1. Det viktigste prinsippet: absolutt ingenting falskt

Dette styrer alle beslutninger i koden. Vi har **ikke**:

- falske brukere, hunder eller kommentarer
- falske «antall aktive»
- falske arrangementer eller treff
- falske anmeldelser eller stjerner
- falske topplisteplasseringer
- falske kartmarkører
- falsk personlig historikk (en ny bruker har 0 km, 0 poter, ingen streak)

Finnes ikke dataen, viser vi det rett ut:
«Ingen treff i Tromsø akkurat nå», «0 hunder i Bodø», «Bli den første».

Dette er ikke en kosmetisk regel — det er hele tillitsgrunnlaget. Ikke innfør
hardkodede tall for å få en skjerm til å se full ut.

---

# 2. Arkitektur

```
app/
  page.js                 tab → view, rendrer skallet
  layout.js               fonter, metadata
  globals.css             designtokens øverst, så seksjoner per område
  lib/
    geo.js                NORSK GEOGRAFI: fylker, kommuner, bydeler, radius, avstand
    seed.js               EKTE offentlig seed: turområder + regelverk
    content.js            KILDEN: bestemmer hva som finnes (live vs demo)
    demo.js               ALT oppdiktet innhold, isolert her
    data.js               ekte produktdefinisjoner (treff-typer, utfordringer, merker, nivå)
  components/
    store.js              AppProvider/useApp(): state, handlinger, utledede tall
    Shell.js              Sidebar, TopBar, RightRail, MobileHeader, BottomNav, DemoBanner
    Home.js               hero, kom-i-gang, stories, PostCard, MeetupCard
    Views.js              Nå skjer, Grupper, Hunder, Kart, Aktivitet, Arrangementer, Utforsk
    Overlays.js           alle modaler/skuffer/ark inkl. onboarding og stedsvelger
    ui.js                 Avatar, Empty, Chips, Bar, Layer, SourceTag m.m.
    Icon.js               ett SVG-ikonsett + PawLogo + DogDoodle
supabase/schema.sql       full datamodell med RLS og geodata
```

## Datalaget (les dette før du endrer noe)

`content.js` er det eneste stedet som avgjør hva appen har å vise.

**To moduser:**

| | `live` (standard) | `demo` |
|---|---|---|
| Brukerinnhold | tomt til ekte brukere lager noe | fixtures fra `demo.js` |
| Hvor | hele Norge | **bare Stavanger** |
| Merking | — | permanent synlig `DemoBanner` |

Demo-innhold finnes bare i sin egen kommune. Bytter du by i demo-modus, får du
den ekte dag-1-opplevelsen. Det er med vilje: slik ser en ny by faktisk ut.

**Tellere:** `getStats()` regner ut alt fra faktiske rader. Det finnes ingen
hardkodede tall i UI-et. Er noe 0, står det 0.

**Brukerens egne tall:** `store.js` → `me` utleder streak, km, poter, utfordrings-
og merkefremgang fra `walks[]`, altså faktiske turer. `EMPTY` i store.js starter
alt på null.

## Geografi

`geo.js` har alle 15 fylker og ~250 kommuner med koordinater, offisielle bydeler
for de største byene, og radiusvalg (2/5/10/25 km eller hele kommunen).

⚠️ **Før lansering:** kommunelista er skrevet for hånd og må verifiseres mot
SSB (klass.ssb.no) og Kartverket. Norge har 357 kommuner. Lista dekker de aller
fleste, men ikke alle.

Lokasjon lagres som `{ kommuneId, omrade, radiusKm }`.

## Seed-innhold

`seed.js` er **ekte offentlig informasjon**: offentlige turområder og reelt
regelverk (båndtvang 1. april–20. august, hundeloven § 6).

Regler for seed:
- merkes synlig i UI med `<SourceTag>` → «Potesjarm-guide»
- **ingen vurderinger eller stjerner** før ekte brukere har lagt dem inn
- `verified: false` betyr «ikke bekreftet lokalt» — UI-et sier det, og brukere
  kan bekrefte og få poter for det
- vi påstår aldri at et sted er inngjerdet eller båndtvangsfritt uten bekreftelse

Utvid seed per kommune vi åpner, og få en lokal person til å bekrefte først.

---

# 3. Cold start — de tre lagene

Appen må være nyttig med én bruker i en by. Derfor er den bygget i tre lag:

**A. Solo-verdi (virker dag 1, uten andre)**
turtracking, streak, poter, nivå, merker, utfordringer, lagrede steder,
hundeprofil, ukesoppsummering, offentlige turområder.
→ I UI: hero tilpasser seg tom by, «Kom i gang»-sjekkliste med fire steg.

**B. Asynkron community-verdi (trenger noen, ikke samtidig)**
innlegg, grupper, spørsmål, turtips, arrangementer.

**C. Live-verdi (blir sterkere med tetthet)**
Nå skjer, spontane treff, hvem er ute nå, live kart.

## Cold-start-regler i koden (`content.js` → `COLD_START`)

- `leaderboardMinActive: 10` — lokal toppliste er **låst** under 10 aktive hunder.
  I stedet vises personlige rekorder + hvor mange som mangler. Aldri «#1 av 2».
- `earlyAreaMaxDogs: 5` — området omtales som helt nytt.
- Er byen helt tom, vises **én** samlet ærlig blokk (`.coldBlock`) i stedet for
  tre tomme kort under hverandre.

---

# 4. Designretning (godkjent)

Identitet:
- dyp indigo/kobolt meny, kremhvitt lerret
- mint / korall / sol som støttefarger
- Baloo 2 (overskrifter), Nunito (tekst), Caveat (håndskrift, brukes sparsomt)
- ekte hundefoto, runde kort, fargede story-ringer
- varm, sosial, leken — **ikke** adminpanel

Tenk **Instagram + Strava + lokalt hundecommunity**, ikke enterprise SaaS.

Unngå: generisk dashboard, mange like kort, for mye tom plass, tilfeldige ikoner,
grå standard-UI, AI-slop.

## Terminologi (ikke endre)
**Nå skjer**, **Grupper**, **Lag treff**.
Ikke gå tilbake til Signals / Circles / Send signal.
Norsk UI hele veien («Arrangementer», ikke «Events»).

## Meny-layout (ikke ødelegg)
- `.sideNav` er `position: sticky; height: 100dvh; flex column`
- topp (`.navTop`) og bunn (`.navBottom`) er `flex: none` → alltid synlige
- midten (`.navList`) er `flex: 1; min-height: 0; overflow-y: auto` → bare
  menylista scroller på lave skjermer, aldri CTA/profil
- høyder skalerer med `clamp(..., vh, ...)`; pynt skjules under gitte høyder
- `.navList` har en fade-maske + `padding: 10px` så fadingen ikke spiser av
  det aktive menypunktet
- testet på 1366×657/768, 1536×730/864, 1920×969, 390×844
- 761–1023 px: ikonmeny. ≤760 px: mobilheader + bunnmeny

---

# 5. Status per nå

## Bygget
- hele skallet, alle åtte visninger, alle overlegg
- ekte onboarding: kommune → område → radius → hundeprofil
- ekte geografi for hele Norge med søk
- ærlige tomme tilstander overalt
- gamification med ekte fremgang (poter, nivå, merker, utfordringer)
- turmodus som faktisk oppdaterer streak, km og poter
- trygghet: nødprofil, mistet hund, rapporter/blokker
- demo-modus med permanent merking, av som standard

## Ikke bygget ennå
- **auth** (ingen innlogging — alt ligger i localStorage, nøkkel `potesjarm-v3`)
- bildeopplasting
- ekte meldinger/realtid
- feed-ranking (se punkt 6)
- varslingsmotor
- gruppeoppretting fra UI
- stedsforslag fra brukere

## Backend
`supabase/schema.sql` er skrevet om helt: full datamodell med geografi
(fylker/kommuner/bydeler), hunder, treff med `expires_at`, arrangementer,
turer, poter som hovedbok (`paw_ledger`), merker, utfordringer, meldinger,
rapporter/blokker, mistet hund, invitasjoner/referrals — med RLS på alt.

Viktige detaljer:
- `meetups.expires_at` — «Nå skjer» utløper av seg selv
- `places.source` skiller `editorial` (vår seed) fra `user`
- `referrals.activated_at` settes **først** når den inviterte har registrert seg,
  lagt til hund og gått første tur — ikke ved klikk på lenke
- `active_dogs_in()` brukes til å låse opp lokal toppliste

⚠️ Supabase-prosjektet er fortsatt inaktivt (ubetalte fakturaer i organisasjonen).
**Ikke rør SiamConnect-databasen. Ikke koble Potesjarm til SiamConnect.**

---

# 6. Neste steg (anbefalt rekkefølge)

1. **Supabase opp igjen** + kjør `schema.sql`
2. **Auth** (e-post/magic link), koble onboarding til ekte konto
3. **Importer kommuner** fra SSB til `municipalities`, verifiser `geo.js`
4. **Bytt `content.js` fra fixtures til ekte spørringer** — live-modus blir eneste modus
5. **Bildeopplasting** (Supabase Storage)
6. **Feed-ranking**: ca. 40 % lokalt, 25 % følger, 15 % grupper,
   10 % anbefalte hunder, 10 % utfordringer/arrangementer
7. **Varslingsmotor** med kategoristyring per bruker
8. **Moderering**: kø for rapporter, rate limits, spam-vern
9. **Delingskort** (ukesrapport, streak, merke, tur) for Instagram/TikTok
10. **Pilot i Stavanger/Sandnes** — seed ekte steder, founder-program, 20–30 beta-brukere

## KPI-er å følge (ikke nedlastinger)
% som lager hund · % som logger første tur · D1/D7/D30 retention ·
turer per uke · treff opprettet · join rate · meldinger · lokal tetthet ·
invitasjoner per bruker · referral-aktivering · aktive kommuner

**North star: Weekly Active Dogs** — en hund er aktiv hvis eieren gjør én
meningsfull handling (tur, innlegg, treff, melding, arrangement, utfordring).

---

# 7. Arbeidsmåte

Brukeren vil ha **utførelse, ikke godkjenningssjekkpunkter**.
Bygg videre gjennom milepæler. Stopp bare ved: kostnader, manglende
credentials, irreversible handlinger, eller store produktbeslutninger.

Sier brukeren «bygg», så bygg.

## Ikke gjør
- merge til main
- rør SiamConnect-databasen
- koble Potesjarm til SiamConnect
- redesign til generisk SaaS/dashboard
- gå tilbake til Signals / Circles / Send signal
- **legg inn falske data for å fylle en tom skjerm**

## Testing
Skjermbilder og e2e kjøres med Playwright (finnes i `/opt/node22`).
Under utvikling: `npm run build && npx next start -p 3100`.
Sjekk alltid 1366×768 og 390×844, og at ingen visning scroller sidelengs.
