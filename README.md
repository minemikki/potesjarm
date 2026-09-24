# Potesjarm Community

Potesjarm er et bybasert sosialt hundecommunity for Norge.

## MVP som er bygget
- For deg-feed
- lokale Signals med deltakelse
- Sirkler
- hunde-discovery og matchscore
- kartprototype
- turtracking-demo
- streaks, badges og challenge-progresjon
- hundeprofil
- søk
- varsler
- onboarding
- opprette innlegg
- opprette Signals
- lokal demo-persistens i browser
- responsiv desktop/mobil UI

## Backend
Datamodellen ligger i `supabase/schema.sql` og dekker:
profiles, dogs, posts, likes, comments, signals, signal participants, circles,
circle members, follows, walks, challenges, badges og notifications.

Schemaet er bevisst **ikke** kjørt automatisk mot en Supabase-instans.

## Neste produksjonskobling
1. Aktiver/velg Potesjarm Supabase-prosjekt.
2. Installer Supabase JS-klient og koble auth.
3. Kjør schema.sql og verifiser RLS.
4. Bytt demo-arrays/localStorage mot realtime queries.
5. Koble kartleverandør og ekte GPS.
6. Push-varsler og bildeopplasting.
7. Moderasjon, rapportering og blokkering før offentlig launch.

SiamConnect-databasen skal ikke brukes av dette prosjektet.
