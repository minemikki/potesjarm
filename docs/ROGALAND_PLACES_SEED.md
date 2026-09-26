# Redaksjonelle steder i Rogaland – seed-plan

Pilot med helt tomt kart blir svakt. Vi seeder noen få **ekte, dokumenterte**
offentlige hundesteder per launch-kommune. **Ikke finn på steder.** Hver rad må
ha en kilde (kommunens nettside, Kartverket/Geonorge, offisiell hundepark-liste).

## Prioriterte kommuner (launch = Rogaland)
Stavanger, Sandnes, Sola, Randaberg, Time (Bryne), Klepp, Hå, Haugesund.

## Kategorier å seede først (matcher `places.kind`)
1. `hundepark` – innhegnede hundeparker (høyest verdi, tydelig hundekontekst)
2. `skog` / `tursti` – populære turområder
3. `strand` – hundevennlige strender (sjekk båndtvang/sesongregler)
4. `park` – større parker der hund er tillatt
5. `hundevennlig` – hundevennlige kafeer (kun med bekreftelse fra stedet)

Start smått: 3–8 steder per kommune er nok til at kartet føles levende.

## Importformat (CSV) – `docs/rogaland_places_template.csv`
Kolonner: `municipality_id,name,kind,lat,lng,about,address_label,source_url`
- `municipality_id`: id fra `app/lib/geo.js` (f.eks. `stavanger`, `sandnes`, `sola`).
- `kind`: en av kategoriene over.
- `lat,lng`: desimalgrader (WGS84), ~4 desimaler. Fra Kartverket/kart.
- `about`: kort, nøktern beskrivelse. Ingen påstander vi ikke kan stå for.
- `source_url`: obligatorisk for sporbarhet (lagres ikke i DB, men i CSV-en).

## Trygg insert-sti (kjør i SQL Editor som prosjekt-eier)
Seedes som `source='editorial'` og `status='approved'` (redaksjonelt, offentlig).
Region utledes automatisk fra kommunen. Idempotent på (kommune, navn).

```sql
-- Kjør én insert per verifisert sted. Bytt ut verdiene med ekte, kildebelagte data.
insert into places (municipality_id, name, kind, lat, lng, about, address_label, source, status, region)
select
  m.id, $$<NAVN>$$, $$<KIND>$$, <LAT>, <LNG>, $$<OM>$$, $$<ADRESSE>$$,
  'editorial', 'approved', m.county_id
from municipalities m
where m.id = $$<MUNICIPALITY_ID>$$
  and not exists (select 1 from places p where p.municipality_id = m.id and lower(p.name) = lower($$<NAVN>$$));
```

Bulk fra CSV (etter at CSV er lastet inn i en midlertidig tabell) er også mulig;
hold `source='editorial'`, `status='approved'`, og utled `region` fra
`municipalities.county_id`. Ikke sett `created_by` for redaksjonelle steder.

## Etter seeding
- Verifiser i appen (Preview): Kart + Utforsk i hver kommune viser stedene.
- `places_in_area(p_municipality => 'stavanger')` skal returnere radene.
- Ingen `pending`/`rejected` blir synlige offentlig (kun `approved`).
