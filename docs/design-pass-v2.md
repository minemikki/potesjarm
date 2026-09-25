# Potesjarm – Product / visual / behavioral pass V2

Audit og beslutninger tatt **før** koding. Alt under gjelder både demo og live;
ingen ny data fabrikeres – hver ny flate leser bare ekte state (eller tydelig
merket demo).

## Phase 1 – Audit (hva vi så, 390 px og 1440 px, demo + kald start)

| Skjerm | Svakest | Følelse i dag |
|---|---|---|
| **Hjem** | Statisk hero («Finn noen å gå tur med i dag?») uansett state. Hilser *byen* («God kveld, Stavanger»), ikke personen. «0 hunder i Stavanger»-pille. Kald start sier det samme tre ganger (hero + «Kom i gang»-kort + «Ingen andre hundeeiere»-blokk). «Bedre turer sammen»-skribling over heroen. Bokstavbobler i en «stories»-rad som ikke er en funksjon. | Dashboard/markedsside |
| **Nå skjer** | Stor indigo-banner før første treff. Kortene er skjema-aktige («Tur · Nå · 3/8»). Kald start = stor hvit tom-boks. Ingenting senker den sosiale terskelen. | Liste |
| **Lag treff** | Ett langt skjema: type, tittel, når, hvor, maks, synlighet – før man har bestemt seg. | Admin-form |
| **Mobil header** | Logo + by-chip + bjelle + konvolutt + sidetittel-blokk (kicker/H1/undertekst) på hver fane. | Desktop presset ned |
| **Bottom nav** | Stor FAB som stikker opp, svak aktiv-tilstand. | OK, men generisk |
| **Hunder** | Gigantisk «matchSpot»-hero (tom flate uten bilde). To rader filterchips før første hund. | Katalog |
| **Kart** | Tegnet SVG-«kart» med oppdiktet vann/veier – pins og etiketter overlapper. Bunnark kolliderer med nav. | Illustrasjon, ikke kart |
| **Grupper** | Store coverkort med blank flate, «Ny gruppe», beskrivelse. | Katalog |
| **Aktivitet** | Tall-hero (18,6 km), tre stat-fliser, nivåkort – «Weekly distance». | Fitness-dashboard |
| **Arrangementer** | Feature-kort med bilde-gradient; ingen forklaring på forskjellen fra Nå skjer. | Generisk |
| **Utforsk** | Tre faner (Turområder/Regler/Trygghet) – «alt mulig». | Innholdsvegg |
| **Desktop** | 8 like viktige menypunkter + CTA + to utility-knapper + profil + doodle. Samme høyre-rail (streak/utfordring/arrangementer/turområder) på alle sider. Enorm H1. | Dashboard |

## Phase 2 – Beslutninger

### Hierarki (hele appen)
- **Signaturen er Nå skjer.** Alt annet mater inn i den (Hjem viser neste treff, Kart viser treff, Hunder → «Spør om tur»).
- **Mobil nav:** Hjem · Nå skjer · **Lag treff** · Grupper · Mer. Mer = Hunder, Kart, Aktivitet, Arrangementer, Utforsk + Meldinger/Varsler/Profil.
- **Desktop primær:** Hjem, Nå skjer, Hunder, Grupper, Kart, Aktivitet. **Sekundær (mindre):** Arrangementer, Utforsk.
- **Mobil header:** pote + kontekst (stedet, trykkbart) til venstre; bjelle + avatar til høyre. Ingen sidetittel-blokk over innholdet på mobil – hver skjerm eier sin egen, korte overskrift.

### Fjernes
- «Bedre turer sammen»-skriblingen i app-heroen, doodle/«Hundeliv er bedre sammen ♡» i sidebaren, «Flere poter, flere venner»-notatet.
- «0 hunder i Stavanger»-pillen og bokstav-avatar-stabelen i heroen.
- Tredobbel kald-start-melding på Hjem.
- «Del en historie»-boblen (stories finnes ikke som funksjon).
- «matchSpot»-heroen på Hunder.
- Det tegnede SVG-kartet (oppdiktet geografi) → ekte kart.
- Felles høyre-rail på alle sider.
- Utforsk-fanene.

### Beholdes
Identiteten (indigo, krem, blå CTA, mint/korall/sol som signaler, Baloo/Nunito), alle backend-actions, demo-merkingen, ærlige tomme tilstander (men som inline-rader, ikke store hvite kort).

### Redesign per side
**Hjem – den emosjonelle motoren**
1. Liten hilsen til *personen* («God kveld, Michael») + kontekst («Hundelivet i Stavanger»).
2. Én live-statuslinje fra ekte data («2 ting skjer nær deg i kveld» / «Hundelivet her starter med dere.»).
3. **Dynamisk hero = dagens viktigste handling**, i prioritert rekkefølge:
   (a) du skal på et treff snart → «Du skal på … kl. 19:00» [Se treff];
   (b) et treff nær deg → «Balto går ved Mosvatnet om 20 min» [Jeg blir med];
   (c) ingen tur i dag → «Klar for dagens tur?» [Start en tur];
   (d) ellers → «Skal noen ut i kveld?» [Lag et treff].
4. **I dag** – en tidslinje (dagens turer, treff du er med på, ukemål) – vises bare når ekte data finnes.
5. «Skjer nær deg» (invitasjoner), «Hunder i nærheten» (bilder), «Fra fellesskapet», «Turområder».
6. Invite-nudge etter meningsfull handling (har gått tur / laget treff).

**Nå skjer – signaturen**
- «Skal du ut?»-rad med ferdige intensjoner (Rolig tur, Bare litt lek, Valpen trenger selskap, Kaffe + hund, Trening sammen, Har noen lyst ut?) → åpner Lag treff forhåndsutfylt. Lav sosial risiko: man sier *hva*, ikke skriver en annonse.
- Treff gruppert på tid: **Nå · Om litt · I kveld · Senere**.
- Kortet er en invitasjon: vert (hund), tittel, sted · «om 18 min», «2 hunder er med», [Jeg blir med].
- Kald start: én setning + intensjonene (de *er* CTA-en).

**Lag treff – maks 3 steg:** Hva har dere lyst til? → Når? → Hvor? (tittel/maks/synlighet under «Flere valg», synlighet avledes fra «når»).

**Hunder:** bilde-først rutenett, navn, rase · alder, ett ekte signal (fellestrekk / «Du følger»). Filtre som én kompakt rad.

**Kart:** ekte kart (Leaflet + OSM-fliser), fyller skjermen på mobil, pins for turområder og aktive treff, bunnark med sted/treff + CTA. Ingen aggregert «populært»-data vi ikke har.

**Grupper:** «små lokale miljøer» – rader med bilde, navn, «12 hunder», neste gruppetreff / tag. Mine grupper øverst.

**Aktivitet:** historien om dere – «Luna og du har gått 18,4 km sammen denne uka», uke-stolper, streak positivt («Ny uke. Ny start.»), milepæler, utfordringer som rader.

**Arrangementer vs Nå skjer:** Arrangementer = planlagt, større, meld deg på i forkant (tidslinje med datoer). Nå skjer = spontant, i dag, forsvinner selv. Forklart i én linje på hver side.

**Utforsk:** «oppdag nye ting å gjøre med hunden» – seksjoner: turområder, lokale grupper, kommende arrangementer, hunder i nærheten, regler & trygghet.

**Signature moments (delbare, kun ekte data):** tur-kort etter tur (hund + eier, km, tid, sted), streak-kort (≥3 dager), milepæl-kort (10/50/100 km totalt). Web Share API med kopi-fallback.

**Desktop:** roligere sidebar (primær/sekundær), mindre topptittel, høyre-rail per side (Hjem: dagens hundeliv; Nå skjer: i kveld; Grupper: mine grupper; Aktivitet: ukemål; Kart: ingen rail).

**Motion:** 150–220 ms inn-animasjon på kort/ark, «pop» på bli-med, respekterer `prefers-reduced-motion`.

## Phase 3 – Implementert

- `app/lib/today.js` (+ tester): hero-prioritet, live-status, «I dag»-tidslinje, tidsbøtter, intensjoner, milepæler, positiv streak-tekst. Alt fra ekte state.
- **Hjem** (`Home.js`): personlig hilsen, én statuslinje, dynamisk hero (going/join/walk/create), «I dag», invitasjoner, hunde-bildestripe, rolige tomme linjer, kompakt «Kom i gang», invite-nudge etter meningsfull handling.
- **Nå skjer**: «Skal dere ut?»-intensjoner, tidsbøtter (Nå/Om litt/Senere i dag/I kveld/Senere), `InviteCard` (delt med Hjem/kart/grupper).
- **Lag treff**: 3 steg (Hva → Når → Hvor), tittel/maks under «Flere valg», synlighet avledet.
- **Navigasjon**: mobil-topp (pote + sted, bjelle, avatar), native bunnmeny, nytt Mer-ark; desktop primær/sekundær sidebar; høyre-rail per side (ingen på Kart/Utforsk).
- **Hunder** bilde-først · **Grupper** som rader · **Kart** med Leaflet + ekte pins · **Aktivitet** som historie + delbare øyeblikk · **Arrangementer** som tidslinje · **Utforsk** i seksjoner · **Hundeprofil** med personlighet og «Spør om tur».
- **Delbare øyeblikk** (`Moments.js`): tur-kort etter tur, streak-kort (≥3 dager), milepæl-kort (10/25/50/100… km). Web Share API, ellers kopi.
- Funn og rettet underveis: `LayerHead` ignorerte `children` (Sprint 7 «Marker alle lest» ble aldri vist); falske toast-påstander («Hundeeiere i nærheten får beskjed»); «Ute nå» og «Streak 0 d» på andres hunder; ingen måte å starte tur nr. 2 samme dag.

### Kartfliser
Standard er CARTO Voyager (OSM-data) med attribusjon. Den er fin for preview/lav trafikk, men før offentlig lansering bør fliser komme fra en leverandør med nøkkel (MapTiler/Stadia). Sett da `NEXT_PUBLIC_MAP_TILES_URL` (og `NEXT_PUBLIC_MAP_TILES_ATTRIBUTION`) i Vercel – ingen kodeendring trengs.
