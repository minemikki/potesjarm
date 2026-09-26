# Potesjarm – Pilot smoke test (to brukere A + B)

Én sammenhengende gjennomkjøring med to ekte testbrukere før vi inviterer
piloter. Kjør mot **Preview-URL-en** (produksjon viser fortsatt venteliste).

## Tre testnivåer – hold dem adskilt
- **[AUTO]** Dekket av `npx playwright test` (browser, demo/local, ingen backend).
- **[BACKEND]** Manuell test mot ekte Supabase (krever innlogging + data).
- **[PHONE]** Må gjøres på ekte telefon (`docs/PILOT_PHONE_TEST.md`).

Ikke påstå at [BACKEND]/[PHONE] er kjørt før det faktisk er gjort.

## Forberedelse
- To e-postadresser (A og B) som kan motta magic link.
- Minst ett redaksjonelt sted seedet i testkommunen (se `ROGALAND_PLACES_SEED.md`)
  – ellers blir kartet tomt (som er greit, men mindre å teste).
- Én moderator satt opp for report-testen (`PILOT_MODERATION.md`).

## Flyt

| # | Steg | Nivå | Forventet | PASS/FAIL | Notat |
|---|------|------|-----------|-----------|-------|
| 1 | A: signup (magic link) | BACKEND | Innlogget, tom profil | | |
| 2 | A: onboarding (sted=Stavanger, hund) | BACKEND | Profil + hund lagret, kommune satt | | |
| 3 | A: reload midt i onboarding | BACKEND | Ingen duplikat profil/hund | | |
| 4 | B: signup + onboarding + hund | BACKEND | Som A | | |
| 5 | A: opprett treff (Nå skjer, 3 steg) | BACKEND | Treffet vises i «Nå skjer» | | |
| 6 | B: finn A sitt treff | BACKEND | Treffet synlig for B i samme kommune | | |
| 7 | B: «Jeg blir med» | BACKEND | Antall +1, idempotent ved dobbelttrykk | | |
| 8 | A↔B: chat i treffet | BACKEND | Meldinger vises begge veier (Realtime) | | |
| 9 | A: block B | BACKEND | B forsvinner fra A sin oppdag/kart/DM; DM blokkert | | |
| 10 | A: unblock B | BACKEND | B dukker opp igjen | | |
| 11 | B: rapporter A sitt innlegg/treff | BACKEND | «Rapporten er sendt», rad i `reports` | | |
| 11b | Moderator: `list_open_reports()` + `mark_report(...)` | BACKEND | Rapporten synlig og kan settes actioned | | |
| 12 | A: start tur → tillat GPS → gå litt → avslutt | PHONE | Server-svar gir poter/streak; kort/umulig gir 0 | | |
| 13 | A: Aktivitet oppdateres | BACKEND | km/streak/challenge fra server | | |
| 14 | A: foreslå sted | BACKEND | «Sendt til gjennomgang»; `pending` rad, ikke synlig på kart | | |
| 14b | Moderator: `moderate_place(id,true)` | BACKEND | Stedet blir synlig på kartet | | |
| 15 | A: Innstillinger → Last ned dataene mine | BACKEND | Gyldig JSON, kun A sine data | | |
| 16 | A: Innstillinger → Slett konto («SLETT») | BACKEND | Edge Function svarer deleted:true; A logges ut; data borte | | |

## Etter smoke-testen
- Bekreft i DB at slettet testbruker (steg 16) ikke har rader igjen i
  `profiles/dogs/walks/messages/...` og at auth-brukeren er borte.
- Rydd opp testdata (treff/steder) om ønskelig.

## Rask [AUTO]-kjøring
```bash
npm ci
npx playwright test        # browser-flows (demo/local)
node --test app/lib/*.test.mjs   # ren domenelogikk
```
[AUTO] dekker IKKE ekte backend/GPS/telefon – bruk tabellen over for det.
