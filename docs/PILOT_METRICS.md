# Potesjarm – Pilot-metrikker (Pilot 100, Rogaland)

Alle tall skal komme fra **ekte data**. Ingen oppdiktede tall. Klient-hendelser
(`app/lib/analytics.js`) er PII-frie og supplerer, men fasit er databasen.

## Nordstjerne
Andel piloter som opplever **minst én ekte lokal aktivitet** (ser eller blir med
på et treff i egen kommune) i løpet av de første 7 dagene.

## Acquisition
| KPI | Kilde (SQL/analyse) |
|---|---|
| Venteliste-påmeldinger | `select count(*) from waitlist_signups` |
| Påmeldinger per by | `select city, count(*) from waitlist_signups group by city order by 2 desc` |
| Referral-delinger | analytics `referral_shared` |
| Referral-påmeldinger | `select count(*) from waitlist_signups where referred_by is not null` |
| Founder tildelt | `select count(*) from waitlist_signups where founder` |

## Activation
| KPI | Kilde |
|---|---|
| Kontoer opprettet | `select count(*) from profiles` |
| Onboarding fullført | analytics `onboarding_completed` (+ profiles med municipality_id) |
| Første hund opprettet | `select count(distinct owner_id) from dogs` |
| Første meningsfulle handling | union av første treff/tur/melding per bruker |

## Kjerneløkke
| KPI | Kilde |
|---|---|
| Treff opprettet | `select count(*) from meetups` |
| Treff man ble med på | `select count(*) from meetup_participants` |
| Meldinger sendt | `select count(*) from messages` |
| Turer fullført (gyldige) | `select count(*) from walks where valid` |

## Retention
| KPI | Kilde |
|---|---|
| Aktiv D1 / D7 | siste aktivitet per bruker vs. `created_at` (`profiles.last_active_at`, walks, messages) |
| ≥2 økter | analytics session-teller eller distinct aktive dager |
| Andre tur/treff | brukere med ≥2 gyldige turer eller ≥2 deltakelser |

## Nettverk (per kommune)
| KPI | Kilde |
|---|---|
| Aktive hunder per kommune (uke) | `local_leaderboard(<kommune>)` → `active_dogs` |
| Treff per kommune | `select municipality_id, count(*) from meetups where cancelled_at is null group by 1` |
| % brukere som ser ≥1 ekte lokal aktivitet | analyse: brukere i kommuner med ≥1 aktivt treff / totale brukere |

## Eksempel-spørringer (kjør i SQL Editor)
```sql
-- Aktivering-trakt
select
  (select count(*) from waitlist_signups)               as waitlist,
  (select count(*) from profiles)                       as accounts,
  (select count(distinct owner_id) from dogs)           as with_dog,
  (select count(distinct host_id) from meetups)         as created_meetup,
  (select count(distinct profile_id) from meetup_participants) as joined_meetup,
  (select count(distinct profile_id) from walks where valid)   as walked;
```

## Personvern i analyse
Aldri i analytics: e-post, meldingsinnhold, hunde-/profil-bio, GPS-koordinater,
navn, referral-koder. Se whitelist + PII-stripping i `app/lib/analytics.js`
(enhetstestet i `analytics.test.mjs`).
