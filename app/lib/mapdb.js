/* =========================================================================
   Oversettelse mellom appens klient-form og Supabase-radene
   (profiles / dogs i supabase/schema.sql).

   Rene, testbare funksjoner uten nettverk eller React – slik at selve
   feltmappingen (som er lett å ta feil av) har enhetstester, mens den tynne
   Supabase-spørringen i app/lib/db/* forblir enkel.

   Vi oppfinner aldri data her: mangler et felt, blir det null/utelatt, ikke
   gjettet. Onboarding samler `age` som fritekst ("2 år", "10 mnd"); DB lagrer
   en omtrentlig `birth_date`. Vi tar vare på det vi vet og markerer resten tomt.
   ========================================================================= */

const SIZES = ["liten", "medium", "stor"];
// Onboarding kan gi energi som tall (1–5) eller som ord. Vi normaliserer til
// smallint 1–5 slik DB-sjekken krever, og lar alt annet bli null (ikke gjettet).
const ENERGY_WORDS = { "lav": 2, "rolig": 2, "middels": 3, "medium": 3, "høy": 4, "hoy": 4, "høyt": 4 };

/** "2 år" / "10 mnd" / "2" -> omtrentlig ISO-dato (YYYY-MM-DD), ellers null. */
export function ageTextToBirthDate(ageText, now = new Date()) {
  if (ageText == null) return null;
  const s = String(ageText).trim().toLowerCase();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (!isFinite(n) || n < 0) return null;
  const months = /(mnd|måned|maaned|month)/.test(s) ? n : n * 12;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() - Math.round(months));
  return d.toISOString().slice(0, 10);
}

/** ISO-dato -> "X år" eller "X mnd" for visning, ellers "". */
export function birthDateToAgeText(birthDate, now = new Date()) {
  if (!birthDate) return "";
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return "";
  let months = (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth());
  if (now.getUTCDate() < d.getUTCDate()) months -= 1;
  if (months < 0) months = 0;
  if (months < 24) return `${months} mnd`;
  return `${Math.floor(months / 12)} år`;
}

function coerceEnergy(energy) {
  if (energy === "" || energy == null) return null;
  const n = typeof energy === "number" ? energy : parseInt(String(energy), 10);
  if (Number.isInteger(n)) return Math.min(5, Math.max(1, n));
  const w = ENERGY_WORDS[String(energy).trim().toLowerCase()];
  return w ?? null;
}

function coerceSize(size) {
  const s = String(size ?? "").trim().toLowerCase();
  return SIZES.includes(s) ? s : null;
}

function cleanArr(a) {
  return Array.isArray(a) ? a.filter((x) => typeof x === "string" && x.trim()) : [];
}

/** App-profil + valgt sted -> rad for `profiles`. Kun feltene vi faktisk vet. */
export function profileToRow(profile = {}, location = {}) {
  return {
    display_name: profile.ownerName?.trim() || null,
    municipality_id: location.kommuneId || null,
    radius_km:
      Number.isInteger(location.radiusKm) && location.radiusKm >= 1 && location.radiusKm <= 100
        ? location.radiusKm
        : null,
    // neighborhood_id krever en ekte uuid fra `neighborhoods`; app-ets `omrade`
    // er (foreløpig) en tekst, så vi lar den stå null = hele kommunen.
  };
}

/** `profiles`-rad -> delfelter for app-profil/sted. */
export function rowToProfile(row = {}) {
  return {
    ownerName: row.display_name || "",
    kommuneId: row.municipality_id || null,
    radiusKm: row.radius_km ?? null,
    avatar: row.avatar_url || null,
  };
}

/** App-profil -> rad for `dogs` (uten owner_id, som settes av kalleren). */
export function dogToRow(profile = {}, now = new Date()) {
  return {
    name: profile.dogName?.trim() || null,
    breed: profile.breed?.trim() || null,
    size: coerceSize(profile.size),
    energy: coerceEnergy(profile.energy),
    play_styles: cleanArr(profile.play),
    comfort: cleanArr(profile.comfort),
    birth_date: ageTextToBirthDate(profile.age, now),
    photo_url: typeof profile.photo === "string" ? profile.photo : null,
  };
}

/** `dogs`-rad -> delfelter for app-profil. */
export function rowToDog(row = {}, now = new Date()) {
  return {
    dogName: row.name || "",
    breed: row.breed || "",
    size: row.size || "",
    energy: row.energy ?? "",
    play: cleanArr(row.play_styles),
    comfort: cleanArr(row.comfort),
    age: birthDateToAgeText(row.birth_date, now),
    photo: row.photo_url || null,
  };
}
