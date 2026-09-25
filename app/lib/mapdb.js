/* =========================================================================
   Oversettelse mellom appens klient-form og Supabase-radene
   (profiles / dogs / meetups i supabase/schema.sql).

   Rene, testbare funksjoner uten nettverk eller React – slik at selve
   feltmappingen (som er lett å ta feil av) har enhetstester, mens den tynne
   Supabase-spørringen i app/lib/db/* forblir enkel.

   Vi oppfinner aldri data her: mangler et felt, blir det null/utelatt, ikke
   gjettet. Onboarding samler `age` som fritekst ("2 år", "10 mnd"); DB lagrer
   en omtrentlig `birth_date`. Vi tar vare på det vi vet og markerer resten tomt.
   ========================================================================= */

import { expiryOptions } from "./data.js";

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
    ownerId: row.owner_id || null,
    discoverable: row.discoverable !== false,
  };
}

/**
 * `dogs`-rad (en annen brukers hund) -> hundekort/profil-form som UI-et bruker
 * (samme felter som demo-hunder, men kun ekte data). Navn på eier og område
 * hentes av kalleren og sendes inn – vi gjetter aldri.
 */
export function rowToPublicDog(row = {}, ctx = {}, now = new Date()) {
  const { ownerName = "", kommuneName = "", kommuneId = null } = ctx;
  return {
    id: row.id,
    real: true,
    ownerId: row.owner_id || null,
    name: row.name || "",
    owner: ownerName || "Hundeeier",
    breed: row.breed || "",
    age: birthDateToAgeText(row.birth_date, now),
    size: row.size || "",
    energy: typeof row.energy === "number" ? row.energy : null,
    play: cleanArr(row.play_styles),
    comfort: cleanArr(row.comfort),
    photo: row.photo_url || null,
    area: kommuneName || "",
    // Kommune kommer fra eierens profil (dogs-raden har den ikke); discover_dogs
    // filtrerer allerede på kommune, så alle treff er i det søkte området.
    kommuneId,
    discoverable: row.discoverable !== false,
    online: false,
    streak: 0, // annen brukers streak eksponeres ikke ennå
  };
}

/* =========================================================================
   Treff (meetups). Se supabase/schema.sql: meetups + meetup_participants.

   Et treff har ingen "poter for å bli med"-mekanikk (se PAWS-kommentaren i
   data.js) – disse funksjonene oversetter kun felt, aldri belønninger.
   ========================================================================= */

/** Minutter fra `now` til et ISO-tidspunkt. Negativt = allerede i gang. */
export function minutesUntil(iso, now = new Date()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.round((t - now.getTime()) / 60000);
}

/** Menneskelesbar "når", uten å late som vi vet mer enn vi gjør. */
export function relativeWhen(minutes) {
  if (minutes == null) return "";
  if (minutes <= 0) return "Nå";
  if (minutes < 60) return `Om ${minutes} min`;
  if (minutes < 24 * 60) return `Om ${Math.round(minutes / 60)} t`;
  return `Om ${Math.round(minutes / 60 / 24)} d`;
}

/**
 * Skjema-data fra MeetupComposer -> rad for `meetups`. `startsIn` og
 * `expiry` er UI-valg (minutter fra nå / en expiryOptions-id) – her blir de
 * til faktiske tidspunkt. Ukjent expiry-id faller ærlig tilbake på den
 * korteste levetiden (2 t) fremfor å gjette en lengre.
 */
export function meetupComposerToRow(composer = {}, { hostId, municipalityId, now = new Date() } = {}) {
  const startsIn = Number.isFinite(composer.startsIn) ? composer.startsIn : 0;
  const startsAt = new Date(now.getTime() + startsIn * 60000);
  const exp = expiryOptions.find((e) => e.id === composer.expiry) || expiryOptions[0];
  const expiresAt = new Date(now.getTime() + exp.minutes * 60000);
  return {
    host_id: hostId,
    municipality_id: municipalityId,
    kind: composer.type || "tur",
    title: composer.title?.trim() || null,
    note: composer.note?.trim() || null,
    place_text: composer.place?.trim() || null,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    max_dogs: Number.isInteger(composer.max) && composer.max >= 2 && composer.max <= 50 ? composer.max : 8,
  };
}

/**
 * `meetups`-rad (+ hentet vert/deltaker-info) -> appens visningsform
 * (samme felter som Home.js/Overlays.js allerede leser fra lokale/demo-treff,
 * pluss `real: true` som UI-et bruker til å vise ekte deltakertall i stedet
 * for en oppdiktet avatar-stabel av ukjente hunder).
 */
export function rowToMeetup(row = {}, ctx = {}) {
  const { hostName = "", hostDogName = "", hostDogId = null, hostPhoto = null, goingCount = 0, iAmGoing = false, myProfileId = null, now = new Date() } = ctx;
  const startsIn = minutesUntil(row.starts_at, now) ?? 0;
  return {
    id: row.id,
    real: true,
    type: row.kind || "tur",
    title: row.title || "",
    note: row.note || "",
    place: row.place_text || "",
    when: relativeWhen(startsIn),
    startsIn,
    max: row.max_dogs ?? 8,
    pace: "Rolig", // kosmetisk, matcher composer (samler ikke inn tempo ennå)
    hostId: row.host_id,
    host: "real:" + row.host_id,
    hostName: hostName || "Hundeeier",
    hostDogName,
    hostDogId, // primærhunden til verten – lar profilen åpnes
    hostPhoto,
    goingCount,
    iAmGoing,
    going: [],
    mine: !!myProfileId && row.host_id === myProfileId,
  };
}
