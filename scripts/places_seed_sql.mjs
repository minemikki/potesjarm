#!/usr/bin/env node
/* =========================================================================
   Generer trygg, idempotent seed-SQL for redaksjonelle steder fra en CSV.

   Bruk:
     node scripts/places_seed_sql.mjs docs/rogaland_places.csv > seed.sql
     # les seed.sql, lim inn i Supabase SQL Editor og kjør.

   CSV-kolonner (header kreves):
     municipality_id,name,kind,lat,lng,about,address_label,source_url

   Validerer:
     - municipality_id finnes i app/lib/geo.js (kommuner)
     - kind i tillatt sett (matcher places_status/kind i schema)
     - lat/lng er tall i Norge-området
     - name ikke tom
   Utleder region fra kommunens fylke. Skriver source='editorial',
   status='approved'. Idempotent på (municipality_id, lower(name)) – kjører du
   på nytt lages ingen duplikater. IKKE finn på steder: alt må komme fra CSV-en
   med en source_url.
   ========================================================================= */
import { readFileSync } from "node:fs";
import { kommuneById } from "../app/lib/geo.js";

const KINDS = new Set(["tursti", "park", "strand", "skog", "utsiktspunkt", "hundepark", "hundevennlig", "veterinaer"]);
const q = (s) => "$$" + String(s ?? "").replace(/\$\$/g, "") + "$$"; // trygg dollar-quote

function parseCsv(text) {
  // Enkel CSV med støtte for anførselstegn og komma i felt.
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const out = []; let cur = ""; let inq = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (inq) {
        if (c === '"' && raw[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inq = false;
        else cur += c;
      } else if (c === '"') inq = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    rows.push(out.map((x) => x.trim()));
  }
  return rows;
}

function main() {
  const path = process.argv[2];
  if (!path) { console.error("Bruk: node scripts/places_seed_sql.mjs <fil.csv>"); process.exit(1); }
  const rows = parseCsv(readFileSync(path, "utf8"));
  if (!rows.length) { console.error("Tom CSV."); process.exit(1); }
  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (k) => header.indexOf(k);
  const need = ["municipality_id", "name", "kind", "lat", "lng"];
  for (const k of need) if (idx(k) === -1) { console.error(`Mangler kolonne: ${k}`); process.exit(1); }

  const errors = [];
  const lines = [];
  let n = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((c) => c === "")) continue;
    const mid = row[idx("municipality_id")];
    const name = row[idx("name")];
    const kind = row[idx("kind")];
    const lat = parseFloat(row[idx("lat")]);
    const lng = parseFloat(row[idx("lng")]);
    const about = idx("about") > -1 ? row[idx("about")] : "";
    const addr = idx("address_label") > -1 ? row[idx("address_label")] : "";

    const k = kommuneById[mid];
    if (!k) { errors.push(`rad ${r + 1}: ukjent municipality_id «${mid}»`); continue; }
    if (!KINDS.has(kind)) { errors.push(`rad ${r + 1}: ugyldig kind «${kind}»`); continue; }
    if (!name) { errors.push(`rad ${r + 1}: tomt navn`); continue; }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 57 || lat > 72 || lng < 3 || lng > 32) {
      errors.push(`rad ${r + 1}: lat/lng utenfor Norge (${lat},${lng})`); continue;
    }
    n++;
    lines.push(
`insert into places (municipality_id, name, kind, lat, lng, about, address_label, source, status, region)
select m.id, ${q(name)}, ${q(kind)}, ${lat}, ${lng}, ${about ? q(about) : "null"}, ${addr ? q(addr) : "null"}, 'editorial', 'approved', m.county_id
from municipalities m
where m.id = ${q(mid)}
  and not exists (select 1 from places p where p.municipality_id = m.id and lower(p.name) = lower(${q(name)}));`
    );
  }

  if (errors.length) {
    console.error("VALIDERINGSFEIL – ingenting generert:\n" + errors.join("\n"));
    process.exit(2);
  }
  console.log(`-- Generert ${n} steder fra ${path}. Kjør i Supabase SQL Editor.`);
  console.log("begin;");
  console.log(lines.join("\n\n"));
  console.log("commit;");
}

main();
