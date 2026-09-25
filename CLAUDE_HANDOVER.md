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
    track.js              EKTE GPS-turtracking: rene, testbare funksjoner (se § 3b)
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

# 3b. Ekte GPS-turtracking (`app/lib/track.js`)

Turtracking var tidligere simulert: `setInterval` la til 0,0023 km hvert
sekund, uavhengig av om brukeren beveget seg. Det er fjernet. Distanse kan nå
**aldri** øke uten et ekte, godkjent GPS-punkt fra
`navigator.geolocation.watchPosition()`. Tid er det eneste et klokkeintervall
styrer (`seconds` i `store.js`).

**Filtreringsregler** (alle i `GPS_CONFIG`, ingen skjulte terskler):

| Konstant | Verdi | Hvorfor |
|---|---|---|
| `MAX_ACCURACY_M` | 30 m | punkter dårligere enn dette forkastes helt |
| `MIN_MOVEMENT_M` | 8 m | mindre enn dette mellom to godkjente punkter = GPS-støy, ikke gange |
| `MAX_SPEED_MPS` | 7 m/s (~25 km/t) | raskere enn dette er umulig for en hundetur → GPS-hopp, forkastes |
| `MIN_VALID_WALK_M` | 50 m | en tur må dekke minst dette for å telle |
| `MIN_METERS_FOR_PACE` | 20 m | under dette vises tempo som «–», ikke et oppdiktet tall |

**Session-modell** (`createWalkSession` / `applyGpsSample`, rene reduce-funksjoner):
et nytt punkt sammenlignes alltid mot forrige *godkjente* punkt (ankeret).
Godkjennes det, flyttes ankeret og distansen øker. Forkastes det, blir
ankeret stående — så gjentatt GPS-støy mens brukeren står stille aldri
akkumuleres, uansett hvor mange punkter som kommer inn.

**Status-maskin** (`session.status`, vist i `WalkMode`):
`waiting_gps` → `tracking` → (`signal_lost` ved feil, går tilbake til
`tracking` når signalet er der igjen) · `permission_denied` /
`unsupported` blokkerer med en egen feilskjerm (`.walkBlocked`) med
"Prøv igjen"/"Avbryt". Ingen av disse tilstandene dikter opp bevegelse.

**Gyldighet:** `finishWalk()` i `store.js` sjekker `isValidWalk()` (>= 50 m
ekte distanse). Er turen ugyldig: **ingen** rad legges i `walks[]`, ingen
streak, ingen poter, ingen badge- eller utfordringsfremgang — bare en
forklarende toast. Er den gyldig, kommer poter utelukkende fra
`pawsForWalk(meters)` (PAWS.perKm × faktisk distanse + en fast fullførings-
bonus), aldri fra tid alene.

Skritt er fjernet fra UI-et (ingen pålitelig skritteller på web). Native app
senere: Apple Health/Core Motion, Android Health Connect.

Databasesiden (`supabase/schema.sql`): `walks` har `distance_m`, `duration_s`,
`valid`, `avg_pace_s_per_km`, `gps_quality`; `walk_points` lagrer rå GPS-punkter
med `accepted`/`rejection_reason` slik at filtreringen er etterprøvbar i
produksjon (arkitekturen støtter det — en rimelig personvern-/lagringspolicy
kan slette rådata etter N dager og beholde bare den aggregerte `walks`-raden).

---

# 3c. Fase 1 — Dataintegritet (kode-review-fiksene)

Etter en grundig gjennomgang av den faktiske koden (ikke bare skjermbilder)
ble fem konkrete spillbarhets-/ærlighetsbugger identifisert og fikset. Alle
er dekket av enhetstester (`node --test app/lib/*.test.mjs`), pluss
regresjonstester som direkte koder inn hvert rapporterte scenario.

**1. Streak krevde IKKE sammenhengende dager** (`app/lib/time.js`,
`nextStreak`). Gikk du mandag og så ingenting før fredag, hoppet streaken
fra 1 til 2 i stedet for å falle tilbake til 1 — enhver ny kalenderdag med
en tur ble telt som «neste dag». Fikset med `osloDaysBetween` + en eksplisitt
regresjonstest for akkurat dette scenariet.

**2. Referral/Grunnlegger kunne aktiveres med ett klikk** (`store.js`,
`invite()`). UI-teksten sa aktivering krever at vennen registrerer seg,
legger til hund og fullfører første tur — men koden økte
`invitesActivated` direkte ved klikk. Fikset: `invite()` øker nå kun
`invitesSent` (en reell, lokal handling — brukeren trykket faktisk «send»).
`invitesActivated` kan aldri settes av klienten uten en backend som
bekrefter det; den forblir 0 til den finnes. `Invite`-overlayet i
`Overlays.js` viser nå ærlig «N sendt · 0 av 3 bekreftet» i stedet for å
late som aktivering skjer lokalt.

**3. Pote-farming via av/på-veksling** (`toggleGoing`, `verifyPlace`,
`addMeetup`, `finishWalk`). Alle belønninger går nå gjennom en hovedbok
(`app/lib/ledger.js`: `pushLedgerOnce`) i stedet for et flatt, direkte
inkrementerbart `paws`-tall. Hver transaksjon har en deterministisk id
(`reason:refId`) — samme bruker + samme handling + samme objekt kan aldri
gi mer enn én rad, uansett hvor mange ganger handlingen trigges (meld deg
av og på samme treff, dobbeltklikk, re-render). `me.paws` er nå alltid
*utledet* som summen av hovedboken, aldri et felt en handling skriver til
direkte. Gammel lagret state migreres ærlig (`migrateState`): et
tidligere flatt `paws`-tall blir én forklart `legacy_migration`-rad
(ikke tapt), og en tidligere (ugyldig) `invitesActivated` nullstilles.

**4. «Gå 20 minutter»-utfordringen var juksbar med veggklokketid**
(`app/lib/track.js`). Å stå stille i 19 minutter og gå 50 m det siste
halve minuttet ga full uttelling, fordi utfordringen målte forløpt tid, ikke
bevegelse. Løsning: `applyGpsSample` regner nå et separat `movingSeconds`
— GPS-bekreftet aktiv tid — attribuert fra et eget rått
`lastRawTimestamp` (oppdatert på ALLE innkommende punkter, godkjente og
forkastede), og hardt begrenset per segment (`MAX_SEGMENT_MOVING_S`, 30 s)
slik at et enkelt bevegelsessegment aldri kan «arve» en lang forutgående
stillstand. `todayMinutes` i `store.js` summerer nå `movingSeconds`, ikke
`seconds`. (Selvfunnet regresjon underveis: første forsøk brukte
distanse-ankerets gamle tidsstempel og reintroduserte akkurat samme
sårbarhet — fanget av en dedikert enhetstest før den nådde produksjon.)

**5. Antijuks-terskelen var ett enkelt fartstak** (`MAX_SPEED_MPS`, 7 m/s)
som ville sluppet gjennom sykling eller sakte bilkjøring som en hundetur.
Lagt til en mykere, ikke-blokkerende `SUSPICIOUS_SPEED_MPS`-sjekk
(4,2 m/s) som flagger (men ikke avviser) en tur der en stor, vedvarende
andel av distansen skjedde i implausibel fart for gange — uten å
falsk-flagge en ekte løpetur med hund (kort spurt) eller kort distanse.
Lagret på turen som `session.suspicious` / `flagged_suspicious` i
`supabase/schema.sql` sammen med ny kolonne `moving_duration_s`, for
manuell/fremtidig automatisk gjennomgang — blokkerer ingenting selv nå.

---

# 3d. Fase A — Produktaudit og integritetsfikser (runde 2)

En full lesegjennomgang av UI-et (Home/Views/Overlays/store) ble kjørt mot
masterplanen for å finne døde knapper, placeholders, demo-lekkasjer og
farmbar logikk. De reelle funnene ble fikset (ikke bare rapportert):

**P0 – farmbar belønning (kritisk).**
- `addMeetup` ga 60 poter per opprettet treff. Hvert treff har en unik id,
  så hovedbokens idempotens (som er per objekt-id) dedupliserte aldri – fritt
  farmbart (lag treff → få poter → gjenta). Fjernet: å opprette et treff gir
  ingen poter.
- `toggleGoing` ga poter for å melde seg på et treff – et klikk, ikke en
  gjennomført aktivitet. Fjernet, i tråd med masterplanens «Ingen Poter bare
  for å klikke join». Å ha vært med teller fortsatt mot sosiale merker via
  `going`-state, uten valuta for selve klikket.
- Begge belønningene (`meetupHosted`/`meetupJoined`) er nå dokumentert i
  data.js som reservert for en **server-bekreftet** «gikk dere tur sammen?»-
  flyt; klienten deler dem aldri ut selv.

**P0 – radius var kosmetisk.** `content.js` brukte alltid kommunesentroiden
som radius-senter uansett hvor brukeren var. Nå: `geo.radiusCenter(loc)`
bruker brukerens egen, **personvern-avrundede** posisjon (3 desimaler ≈
100 m, `roundCoord`) når den er delt (opt-in engangsavlesning via
`useMyLocation()`), ellers kommunesentroiden som ærlig fallback. Bydel har vi
ikke ekte koordinater for og dikter dem ikke opp. UI-et (stedvelgeren) sier
hvilket senter som faktisk brukes og lar deg slå det av/på. Rå posisjon
lagres aldri – bare den avrundede.

**P0 – mistet hund manglet utløp.** `lostDogSince` ble aldri lest. Nytt
`app/lib/lostdog.js`: et varsel har 48 t levetid (`LOST_DOG_TTL_H`), og
`isLostDogLive(state, now)` er den ene sannheten UI leser (aktiv + ikke løst
+ ikke utløpt). «Sist sett»-teksten lagres nå (`lostDogNote`) og vises i
banneret sammen med «utløper om N t». `resolveLostDog()` markerer funnet.

**P1 – blokkering var en no-op.** «Blokker bruker» ga bare en toast; feeden
ble aldri filtrert, og «Blokkerte profiler» var hardkodet tom. Nå: ekte
`blocked`-state, feed og kommentarer filtreres på forfatter, og
«Blokkerte profiler» er en reell liste med «Opphev». Full kaskade til
hunder/grupper/søk/chat krever en delt bruker-id fra backend (dokumentert i
koden) – lokalt blokkerer vi på det eneste identitetssignalet klienten har.

**P1 – dødt merke/utfordring.** `placesVisited` ble aldri skrevet, så
«Utforsker»-merket og «besøk nye steder»-utfordringen kunne aldri gjøre
fremgang (samme klasse som det fjernede værmerket). `verifyPlace` (en
førstehånds bekreftelse av et ekte sted) registrerer nå stedet som besøkt/
kjent, idempotent per sted.

**P2 – skjør demo-lekkasje i topplista.** `Leaderboard` brukte
`demoLeaderboard` uansett modus (bare reddet av at live har 0 hunder). Nå
gates den eksplisitt på `isDemo`; i live vises en ærlig «topplista er ikke
klar ennå» i stedet for at en fremtidig live-hundekilde kunne dytte
demo-navn inn.

Nye enhetstester: `geo.test.mjs` (radiusCenter/roundCoord),
`lostdog.test.mjs` (utløp/live-status). Ny e2e `safety.spec.js`: blokkering
fjerner faktisk innlegg fra feeden, og et utløpt/funnet savnet-varsel vises
ikke. **80 enhetstester + 20 e2e grønne.**

**Fortsatt ikke gjort** (bevisst, krever backend eller egne beslutninger):
full blokkeringskaskade (delt bruker-id), server-bekreftet meetup-fullføring
for poter, ekte topplistekilde, og alt i Fase B–H under.

---

# 3e. Mobil-runde: ekte, sammenhengende app (runde 3)

Målet var at mobilopplevelsen skal føles som en ferdig app, ikke et preview.
Prioritert P0→P1→P2, ikke nye tilfeldige features.

**P0**
- **Robuste bilder.** Ny `Img`-komponent (`ui.js`) med laste-/feiltilstand og
  merkevareplassholder (pote), og `Avatar` faller nå tilbake ved lastefeil i
  stedet for et grått ødelagt ikon. Alle innholdsbilder (feed, hundekort,
  hundehero, arrangement, gruppe) bruker den.
- **Location mode.** `geo.locationMode()` + `radiusCenter()`: radius måles fra
  brukerens egen personvern-avrundede posisjon (opt-in) med «Finner posisjon…»,
  «Bruker omtrentlig posisjon · ± N m», og ærlig «tilgang ikke gitt → bruker
  sentrum av X» ved avslag. Ingen silent failure.
- **Onboarding 4 steg.** Sted → Hund → «Hva liker hunden?» (aktiviteter) →
  «Hva ønsker dere?» (mål, `ownerGoals`), så «{navn} er klar 🐾» med CTA
  «Start deres første tur». Søk/valgt-sted-separasjonen er bevart (egen
  regresjonstest).
- **Kompakt hero + demo-banner** på mobil, så «Kom i gang» vises over folden.
  Demo-banneret er nå en tynn linje: «Demo · innholdet er oppdiktet».

**P1**
- **Nå skjer.** Treff-detalj har vert-handling (avlys → ekte fjerning),
  **treff-chat** for deltakere (`MeetupChat`, ærlig tom tilstand «Start
  samtalen»), og «Ble turen noe av?»-bekreftelse etter start (ingen poter for
  svaret lokalt – ekte fullføring krever backend). Bli med / meld av oppdaterer
  deltakerlista umiddelbart.
- **Følge vs hundevenn** (`app/lib/friends.js`, rent + testet). Følge er
  énveis. Hundevenn er en forespørsel som blir «Sendt» (pending) – aldri
  «godtatt» lokalt (krever at den andre godtar via backend). Blokkering
  overstyrer alt.
- **Hundeprofil** uten oppdiktet «92 % match»: viser forklarbare fellestrekk
  («Begge liker bading», «Likt energinivå», «I samme område»), ekte
  attributter, og Følg / Hundevenn / Melding / Foreslå tur.
- **Gruppe-detalj** fikk «Om»-fane (beskrivelse, provenians, kjøreregler) i
  tillegg til Innlegg/Treff/Medlemmer.
- **Repository-sømmen** følger husets mønster: rene domenemoduler
  (`friends.js`, `ledger.js`, `lostdog.js`, `time.js`, `track.js`) eier
  reglene, store er tynt lim mot localStorage. Async Supabase-implementasjon
  er dokumentert neste steg (ikke en risikabel full async-omskriving nå).

**P2**
- **Mer-meny** er nå seksjonert (Din hund / Utforsk / Konto) med et
  profilkort øverst, i stedet for et tilfeldig ikonrutenett.

Nye enhetstester: `friends.test.mjs`. Nye e2e: `social.spec.js` (treff bli
med/meld av + deltakerliste, treff-chat, følge vs hundevenn uten falsk
godkjenning, bilde-fallback) og oppdatert `onboarding.spec.js` for 4-stegs
flyt. **89 enhetstester + 24 e2e grønne.**

**Fortsatt local-only / venter på backend:** ekte multi-user, at en
hundevenn-forespørsel kan godtas, chat/realtime på tvers av enheter, push,
bildeopplasting. **Venter på beslutning:** native-app for bakgrunns-GPS.

---

# 3f. UX/visuell forenklingsrunde (runde 4)

Hard opprydding for at appen skal føles som et premium consumer-produkt, ikke
en AI-generert prototype med alt på én skjerm. Ingen nye features.

**Designtokens** (`globals.css :root`): 4-punkts spacing (--s1..--s8),
radius-hierarki (--r-hero 24, --r-card 18, --r-ctrl 14, pill 999 – ikke lenger
alt maks-rundt; --r-xl senket 28→24), og en bunn-nav-token
(--bottomnav-h + --safe-b).

**P0**
- **Bunn-nav-overlap:** `.app` reserverer nå `bottomnav-h + 30px + safe-area`
  så innhold og den hevede FAB-en aldri dekker innhold. Nav bruker
  safe-area-tokenet. Testet 390 og 430 bredde.
- **Mindre heroer + mindre copy:** cold-start-hero lavere (padding 108→88,
  h2 29→26) og kortere tekst; «God kveld»-greeting mistet den overflødige
  underteksten på hjem (hero bærer budskapet); Nå skjer-hero strammere.
  «Kom i gang» vises nå over folden.
- **Demo-banner:** «Demo · oppdiktet innhold» på én linje, ingen truncation.
- **Merkevare-fallback-headere:** ingen blanke hvite medieflater lenger. Nytt
  pote-mønster (`--paw-pattern`) bak plassholdere; `Img` fikk `brand`-variant
  (indigo gradient + pote-mønster) og valgfri stor initial. Hundeprofil-hero
  viser hundens forbokstav på gradient; gruppe-header har egen merkevare-cover.

**P1**
- **Kompakt treff-detalj:** lavere kartforhåndsvisning (190→132), strammere
  info-rad og mindre tittel.
- **Kompakt hundeprofil:** match-boksen viser maks 3 fellestrekk med «Se alle N».
- **Kortere copy:** cold-start-blokk, tomme tilstander (Hunder), og onboarding
  fikk kuttet marketing-forklaringer.

Ingen tester endret logikk; én e2e-assertion oppdatert til den kortere
tom-tilstand-teksten. **89 enhetstester + 24 e2e grønne.**

---

# 3g. Product-polish + interaksjonsaudit (runde 5)

Siste frontend-finpuss før backend. Testet 390×844 og 430×932.

**Mindre vertikal tyngde**
- Cold-start-hero ytterligere ~12 % lavere (padding 88→74, h2 26→24).
- «Kom i gang» viser nå 2 kort (uferdige først) + «Se flere (N)» i stedet for 4.
- Nå skjer-toppblokk strammet inn så treff-lista vises tidligere.
- Gruppe-cover senket (clamp 84–120) så tabs kommer raskere.
- Treff-detalj: mindre tomrom (gap 12→10), tydelig blå «Vert»-badge som
  skiller vert fra deltakere.
- Hundeprofil: sekundærknapper (Følg/Hundevenn/Melding) mindre; «Foreslå tur»
  er den ene primære.

**Ekte handlinger (fra interaksjonsaudit)** – erstattet flash-only-knapper:
- Del (innlegg/ukekort/arrangement) kopierer nå en ekte lenke til
  utklippstavlen (`app.shareLink`), og sier bare «kopiert» når det faktisk skjer.
- «Ikke interessert» og «Rapporter» skjuler nå innlegget fra feeden på ekte
  (`hiddenPosts`/`reports`), ikke bare en toast.
- Fjernet falsk «Lagt til i kalenderen» (ingen ekte kalenderkobling) →
  erstattet med ekte del-lenke.

**Naturligere norsk**: «Vis meg i nærområdet», «du må gå minst X m», «Notert –
dere var ute sammen», kortere arrangement-tomtilstand, «rekordene å samle seg».

**Konsistens**: bli med / meld på / bli medlem bruker nå samme primære stil på
tvers av treff-, gruppe- og arrangementskort. Fikset en latent feil der
compose-bar-avataren ble strukket til en ellipse (`.composeBar span` traff
avataren).

Ingen logikkendringer i tester. **89 enhetstester + 24 e2e grønne.**

---

# 3h. Gruppe-detalj redesignet strukturelt (runde 6)

Gammel header var topptung og føltes som et markedsføringskort (stort tomt
cover, flytende ikon, giant white card, to store 50/50-CTA-er, tabs som løse
filterchips). Bygget helt om i `Views.js` (`GroupPage`) + ny CSS (`.gHead`
m.fl.), gjenbruker samme data/state/actions.

Ny struktur (`.gHead`): kompakt merkevare-cover (~112–136px, indigo gradient +
pote-mønster, tilbakeknapp) → identitetsrad der **bare avataren** overlapper
cover-kanten og tittel+metadata ligger under coveret på krembakgrunn (fikset
en bug der den indigo tittelen lå usynlig oppå det mørke coveret) → liten
«Potesjarm-offisiell»-badge → kort beskrivelse + «Mer» (åpner Om-fanen) →
kompakte handlinger `[Bli med] [Inviter] [•••]` (••• = ny `groupMenu`:
del gruppe / forlat gruppe) → **integrerte underline-faner** (Innlegg/Treff/
Medlemmer/Om) rett under headeren → innhold. Alt innenfor ~én skjerm på
390×844 og 430×932.

Metadata er ekte: «Stavanger · Lokal gruppe · N medlemmer», eller «Ny gruppe»
når tallet er 0. Cover har alltid en indigo base, så en manglende/feilende
cover-foto degraderer til en on-brand flate, aldri blankt hvitt.

**89 enhetstester + 24 e2e grønne.**

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
- ekte onboarding: kommune → område → radius → hundeprofil (ingen sted
  forhåndsvalgt — brukeren må faktisk velge)
- ekte geografi for hele Norge med søk
- ærlige tomme tilstander overalt
- gamification med ekte fremgang (poter, nivå, merker, utfordringer) —
  utledet fra faktiske turer, aldri fra en tidtaker
- **ekte GPS-turtracking** (`app/lib/track.js`): ingen simulert bevegelse,
  nøyaktighets-/fart-/støyfiltrering, gyldighetsgrense på 50 m
- trygghet: nødprofil, mistet hund, rapporter/blokker
- demo-modus med permanent merking, av som standard
- **poter som idempotent hovedbok** (`app/lib/ledger.js`) — ingen handling
  kan gi dobbel/falsk belønning, streak krever ekte sammenhengende
  kalenderdager (Europe/Oslo), utfordringer måler GPS-bekreftet
  bevegelsestid, ikke veggklokketid
- ekte, utløpsstyrt hastevarsel for mistet hund; ekte blokkering som
  filtrerer feed og kommentarer; radius måles fra brukerens egen
  personvern-avrundede posisjon når den deles (ellers kommunesenter)
- robust mobilopplevelse: bildefallbacks, location mode, 4-stegs onboarding,
  treff-detalj m/chat, følge vs hundevenn, seksjonert Mer-meny
- automatisert testsuite: 89 enhetstester + 24 e2e-tester (se «Testing»)

## Ikke bygget ennå
- **auth** (ingen innlogging — alt ligger i localStorage, nøkkel `potesjarm-v3`)
- bildeopplasting
- ekte meldinger/realtid
- feed-ranking (se punkt 6)
- varslingsmotor
- gruppeoppretting fra UI
- stedsforslag fra brukere
- rå GPS-punkter sendes ikke til en backend ennå (kun lokal filtrering per nå
  — `walk_points`-tabellen i schema.sql er klar for når API-et finnes)

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

```
npm run test:unit   # node --test app/lib/*.test.mjs – rene funksjoner, ingen nettleser
npm run test:e2e    # npx playwright test – ekte nettleser, ekte GPS-simulering
npm test             # begge
```

**Enhetstester** (`app/lib/*.test.mjs`): ingen avhengigheter, kjører på ren
Node (ESM). Dekker GPS-filtrering (nøyaktighet, fart, støygulv,
gyldighetsgrense, GPS-bekreftet bevegelsestid, mistenkelig fart —
`track.test.mjs`), geografisøk (Tromsø/Strømsø, diakritiske tegn —
`geo.test.mjs`), Europe/Oslo-tidssonelogikk og ekte sammenhengende
streak-dager (`time.test.mjs`), og den idempotente potehovedboken +
migrering av gammel state (`ledger.test.mjs`). Merk: `app/components/store.js`
selv kan ikke importeres av ren Node (JSX) — derfor ligger alle rene,
testbare regler i `app/lib/`, og `store.js` er bare limet rundt dem.

**E2E** (`e2e/*.spec.js`, Playwright, `@playwright/test` som devDependency):
- `gps-tracking.spec.js` — kjører ekte `navigator.geolocation.watchPosition()`
  i Chromium via `context.setGeolocation()` (ikke en mock av vår logikk — samme
  kode som i produksjon). Dekker: stillestående ⇒ 0 km, dårlig nøyaktighet ⇒
  0 km, GPS-hopp forkastes, normal gange ⇒ ekte belønning, ingen
  posisjonstilgang ⇒ ingen fake bevegelse, ingen dobbel belønning ved nytt
  forsøk.
- `onboarding.spec.js` — regresjonstest for buggen der et søkt sted kunne vises
  sammtidig som et annet "valgt" sted.
- `cold-start.spec.js` — en tom kommune viser ærlige nuller og låst toppliste.
- `safety.spec.js` — blokkering fjerner faktisk innlegg fra feeden; et
  utløpt eller «funnet»-markert savnet-varsel vises ikke.

⚠️ **Miljøspesifikt i denne sandboxen** (se kommentarer i filene):
- `playwright.config.js` peker eksplisitt på en forhåndsinstallert Chromium
  (`/opt/pw-browsers/chromium-1194/...`) fordi den installerte
  `@playwright/test`-versjonen ellers ville prøvd å laste ned en nyere
  revisjon. På en vanlig maskin med `npx playwright install` kjørt er dette
  irrelevant (fallback til `undefined` = standard resolution).
- Chromiums mockede `watchPosition` her leverer punkter i rykk, ikke ett per
  `setGeolocation()`-kall — testene venter derfor på faktisk UI-endring
  (poll på GPS-punkt-telleren) i stedet for faste tidsfrister.
- Denne Chromium-oppsettet løser aldri en ubesvart geolocation-forespørsel til
  et eksplisitt "nektet" automatisk (ingen ekte bruker som svarer på
  prompten) — den blir stående i `waiting_gps`. Selve `permission_denied`-
  grenen i koden er testet via kodegjennomgang og deler feilhåndteringssti
  med `signal_lost`, men er ikke fremtvunget i en kjørende e2e-test her.

Skjermbilder/manuell visuell QA: kjør appen med
`npm run build && npx next start -p 3100` og sjekk alltid 1366×768 og 390×844,
og at ingen visning scroller sidelengs.

---

# Backend-status (Supabase) — Sprint 1–3

Appen er koblet til en ekte Supabase-backend (bygget på `supabase/schema.sql`
+ migrasjoner i `supabase/migrations/`). Alt ligger bak `WAITLIST_MODE` og er
kun aktivt for innloggede brukere; uten Supabase-nøkler kjører appen uendret
som lokal prototype/demo. Se `supabase/SETUP.md`.

**Datalag-seam:** `backend = authUser?.id && isSupabaseConfigured` i `store.js`.
Er den sann er databasen fasit; ellers brukes den gamle lokale/demo-veien. Rene
mapping-/regelfunksjoner ligger i `app/lib/mapdb.js` og `app/lib/social.js`
(enhetstestet), Supabase-spørringer i `app/lib/db/*`.

- **Sprint 1 – Auth + profiler + hunder:** magic link (`app/components/auth.js`),
  `profiles`/`dogs` skrives fra onboarding/profilendring (`db/profiles.js`,
  `db/dogs.js`, `db/sync.js`).
- **Sprint 2 – Ekte treff:** `meetups`/`meetup_participants` (`db/meetups.js`),
  lag/bli med/avlys, per kommune.
- **Sprint 3 – Sosial graf:** migrasjon `003_sprint3_social_graph.sql` la til
  hundevenn (`friend_requests` + `friendships`), `dogs.discoverable`, og
  SECURITY DEFINER-RPC-er for følge/venn/blokk/oppdag (håndhever blokkering i
  begge retninger, umulig å forfalske vennskap fra klient). `db/social.js`.
  Ekte oppdagbare hunder i `DogsView`, forklarbare fellestrekk (ingen
  matchprosent), følg/hundevenn/blokk på hundeprofil, treffvert åpner ekte
  hundeprofil.

- **Sprint 4 – Ekte grupper:** migrasjon `004_sprint4_groups.sql`
  (`meetups.group_id` + RPC-er). `db/groups.js`. GroupsView viser ekte grupper
  i kommunen (medlemstall fra rader), lag gruppe (blir admin), bli med/forlat,
  gruppefeed (ekte innlegg, ingen fake liker/kommentar-tall), gruppetreff
  (treff med `group_id`), medlemsliste med roller (klikk åpner ekte
  hundeprofil), moderering (fjern medlem/rolle via RPC), rapporter innlegg
  (ekte `reports`-rad). Blokkering skjuler medlemmer/innlegg (server-side i
  RPC). Sist-admin kan ikke forlate uten overføring.

- **Sprint 5 – Ekte chat + Realtime:** migrasjon `005_sprint5_chat_realtime.sql`.
  Bygger på de eksisterende `conversations`/`conversation_members`/`messages`:
  legger til `kind` ('direct'|'meetup'), `meetup_id`, `dm_key` med unike
  indekser (ingen duplikate direkte-samtaler, én samtale per treff). **Retter en
  RLS-bug** på `messages` (den gamle policyen `m.conversation_id = conversation_id`
  bandt til seg selv → enhver deltaker kunne lese ALLE samtaler; kritisk siden
  Realtime håndhever nettopp den policyen). SECURITY DEFINER-RPC-er:
  `get_or_create_direct_conversation` (nekter self-chat + blokkering, dedupe via
  `dm_key`), `get_or_create_meetup_conversation` (kun vert/deltaker),
  `send_message` (medlemskap + blokk-sjekk, returnerer rå rad for dedupe),
  `list_conversations` (innboks m/ siste melding + ulest, blokkerte skjult),
  `list_messages` (kun medlem, blokkert = tom), `mark_conversation_read`.
  `db/chat.js` (repo + Realtime-abonnement), `lib/chat.js` (rene regler:
  dedupe/unread/sort/self+blokk-speil, testet). Store: `realConversations`,
  `chatMsgs`, `startDirectChat`/`startMeetupChat`/`sendChatMessage`/
  `markConversationRead`, Realtime-effekt på åpen samtale. UI: ekte innboks,
  Chat/MeetupChat mot ekte samtaler (ingen fake online-status), «Melding» fra
  hundeprofil, «Skriv til verten» + treff-chat fra treff-detalj. Migrasjonen
  aktiverer Realtime på `messages` selv (idempotent).

- **Sprint 6 – Ekte feed + likes + kommentarer + saves:** migrasjon
  `006_sprint6_feed.sql` (ingen nye tabeller). Berikelses-view `post_card`
  (ekte likes_count/comments_count + liked_by_me/saved_by_me) delt av alle
  feed-RPC-ene. `list_feed` (relevans: egne + fulgte hunder + medlemsgrupper +
  lokale innlegg; gruppeinnlegg lekker aldri til ikke-medlemmer; cursor på
  created_at), `list_saved_posts`, `feed_post`, `create_post`, `delete_post`
  (forfatter eller gruppeadmin/mod), `like_post`/`unlike_post` (idempotent,
  returnerer ekte count), `save_post`/`unsave_post`, `list_post_comments`,
  `create_comment`, `delete_comment`. Sprint 4 sin `list_group_posts` er
  erstattet med en beriket variant (samme form), så hjem-feed og gruppefeed
  deler mapper (`rowToFeedPost`) og kort (`FeedPostCard`). `lib/feed.js` (rene
  regler: mergeFeed-paginering, optimistisk like/lagre + tilbakerulling,
  filterBlocked; testet), `db/feed.js` (repository). Store: `realFeed` med
  cursor + «last mer», `savedFeed`, kommentarer per innlegg, optimistiske
  like/save med rollback, create/delete/report. UI: `FeedPostCard` (avatar →
  hundeprofil, ekte like/kommentar/lagre/meny), hjem-feed med kald-start («Del
  den første turen …»), ekte Comments-overlay (egen kan slettes), PostMenu
  (slett egen / rapporter / blokker), PostComposer (kun tekst i live-modus).
  Blokkering håndheves server-side i alle RPC-ene (begge veier).

**Fortsatt lokal/demo (ikke ekte multi-user ennå):** arrangementer, kart-pins
for treff, full deltaker-avatarliste i treff (vises som ærlig antall). Full
gruppechat og push/varsler er bevisst utsatt. Bildeopplasting i feeden er
tekst-først i live-modus (ingen falsk opplasting) – ekte opplasting via Supabase
Storage er et senere steg. Disse er markert i koden og venter på sine sprinter
(7: varsler/push, 8: kart, 9: aktivitet/gamification-backend, 10: moderering/GDPR).
