# Potesjarm – Manuell test på ekte telefon (før pilot)

> Browser-screenshots er IKKE nok. Denne sjekklista må gjøres på ekte enheter
> før vi inviterer de første brukerne. Kryss av det som faktisk er testet – ikke
> påstå «real-device tested» uten at det er gjort. (Per nå: **ikke gjennomført**.)

Test mot **Preview-URL-en** (produksjon viser fortsatt venteliste).

## Enheter
- [ ] iPhone – Safari (nyeste iOS)
- [ ] iPhone – lagt til på Hjem-skjerm (PWA-lignende)
- [ ] Android – Chrome
- [ ] Liten skjerm (SE/375px) og stor (Pro Max/430px)

## Generelt / layout
- [ ] Ingen horisontal scroll på noen hovedskjerm
- [ ] Safe area: bunn-nav og topp-header klemmes ikke av notch/hjemindikator
- [ ] Tekst lesbar, touch-mål ≥ 44px
- [ ] Mørk modus ser riktig ut (om enheten står i mørk modus)

## Auth / onboarding
- [ ] Magic link-e-post kommer frem, åpner appen innlogget
- [ ] Onboarding: sted → hund → preferanser uten forvirring
- [ ] Reload midt i onboarding gir ikke duplikat profil/hund
- [ ] Founder-merke vises kun for legitim venteliste-e-post

## Kjerneløkke
- [ ] Hjem cold start viser én tydelig hovedhandling
- [ ] Lag treff (3 steg) – lav terskel, treffet dukker opp i «Nå skjer»
- [ ] «Jeg blir med» oppdaterer antall, ingen dobbelttelling ved dobbelttrykk
- [ ] Treff-chat: tastatur dekker IKKE skrivefeltet
- [ ] Meldinger sendes; feilet melding viser ærlig feil (ingen falsk «sendt»)

## Aktivitet / GPS
- [ ] Start tur ber om posisjon kun ved trykk (ikke ved sideload)
- [ ] Avslått posisjon: ærlig beskjed, ingen falsk distanse
- [ ] Aktiv tur: distanse øker kun ved reell bevegelse
- [ ] Skjermlås/bakgrunn: appen påstår IKKE pålitelig bakgrunnssporing
- [ ] Avslutt tur: poter/streak fra server-svar; dobbelttrykk gir ikke dobbelt
- [ ] Kort/urealistisk tur gir ingen belønning

## Kart
- [ ] «Min posisjon» sentrerer kartet (etter tillatelse)
- [ ] Kart-gester (pan/zoom) føles greit
- [ ] Tomt kart: ærlig cold start, ingen fake pins
- [ ] Foreslå sted: «Forslaget er sendt til gjennomgang» kun ved ekte suksess

## Personvern / konto
- [ ] Leaderboard opt-in er AV som standard
- [ ] Last ned data → gyldig JSON-fil lastes ned (kun egne data)
- [ ] Slett konto: bekreftelsesord kreves; etterpå er data borte
- [ ] Blokker: brukeren forsvinner fra oppdag/kart/DM
- [ ] Rapporter: skjema med grunn, lander i backend

## Deling / utklipp
- [ ] Del-knapp (Web Share) åpner systemets delemeny
- [ ] «Kopier lenke» legger riktig lenke på utklippstavla

## Nett / robusthet
- [ ] Flymodus: appen henger ikke evig på lasting; viser feil/empty
- [ ] Gjenoppkobling etter skjermlås: Realtime kobler til igjen
