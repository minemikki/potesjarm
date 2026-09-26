# Potesjarm – Manuell test på ekte telefon

> Browser-screenshots er IKKE nok. Denne lista må gjøres på ekte enheter før
> pilot. **Status: ikke gjennomført** (kan ikke gjøres fra CI). Test mot
> Preview-URL-en (produksjon viser fortsatt venteliste). Fyll inn PASS/FAIL +
> notat for hver rad.

Samme testsett kjøres to ganger: én kolonne for **iPhone Safari**, én for
**Android Chrome**.

## iPhone – Safari (nyeste iOS)

| # | Steg | Forventet resultat | PASS/FAIL | Notat |
|---|------|--------------------|-----------|-------|
| 1 | Åpne Preview-URL | Venteliste vises IKKE (dette er appen); ingen horisontal scroll | | |
| 2 | Signup med magic link | E-post kommer, lenke åpner appen innlogget | | |
| 3 | Onboarding: sted → hund → preferanser | Fullføres uten forvirring; lander i appen | | |
| 4 | Tastatur i skjemafelt | Tastaturet dekker ikke feltet du skriver i | | |
| 5 | Bunn-nav | Ikke klemt av hjemindikator; alle faner nås | | |
| 6 | Lag treff (Nå skjer, 3 steg) | Treffet vises i «Nå skjer» | | |
| 7 | Chat i treff | Composer synlig over tastatur; melding sendes | | |
| 8 | Kart → «Min posisjon» | Ber om GPS kun ved trykk; sentrerer kartet | | |
| 9 | Foreground turtracking | Start tur, gå ~200 m, distanse øker realistisk | | |
| 10 | Skjermlås under tur | Ved gjenåpning: ingen falsk distanse; ærlig status | | |
| 11 | Avslutt tur | Poter/streak fra server; dobbelttrykk gir ikke dobbelt | | |
| 12 | Del (invite / share moment) | Systemets delemeny åpnes (Web Share) | | |
| 13 | Innstillinger → Last ned data | Gyldig JSON lastes ned | | |
| 14 | Innstillinger → Slett konto («SLETT») | Bekreftelse kreves; logges ut; data borte | | |
| 15 | Leaderboard opt-in | Av som standard; kan slås på | | |
| 16 | Flymodus på en skjerm | Ingen evig lasting; viser empty/feil | | |

## Android – Chrome (nyeste)

| # | Steg | Forventet resultat | PASS/FAIL | Notat |
|---|------|--------------------|-----------|-------|
| 1 | Åpne Preview-URL | Appen vises; ingen horisontal scroll | | |
| 2 | Signup med magic link | Lenke åpner appen innlogget | | |
| 3 | Onboarding | Fullføres uten forvirring | | |
| 4 | Tastatur i skjemafelt | Dekker ikke aktivt felt | | |
| 5 | Bunn-nav | Ikke klemt av system-gestures; alle faner nås | | |
| 6 | Lag treff | Treffet vises i «Nå skjer» | | |
| 7 | Chat i treff | Composer synlig over tastatur; melding sendes | | |
| 8 | Kart → «Min posisjon» | GPS kun ved trykk; sentrerer | | |
| 9 | Foreground turtracking | Distanse øker realistisk ved gange | | |
| 10 | Skjermlås/faneskifte under tur | Ingen falsk distanse; ærlig status | | |
| 11 | Avslutt tur | Server-poter; ingen dobbel ved dobbelttrykk | | |
| 12 | Del | Android delemeny åpnes | | |
| 13 | Last ned data | Gyldig JSON lastes ned | | |
| 14 | Slett konto | Bekreftelse; logout; data borte | | |
| 15 | Leaderboard opt-in | Av som standard | | |
| 16 | Flymodus | Ingen evig lasting; empty/feil | | |

## Kritiske «må-ikke-skje» (begge enheter)
- [ ] Ingen falsk «sendt/lagret» når noe faktisk feilet.
- [ ] Ingen påstand om bakgrunnssporing av GPS.
- [ ] Ingen fake pins på kartet.
- [ ] Ingen browser-varsel-permission spørres (push er av for pilot).
- [ ] Ingen andre brukeres data i eksport.
