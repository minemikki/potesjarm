/* =========================================================================
   Personvern-trygg analyse (pilot).

   Ingen ekstern leverandør, ingen creepy tracking. Bare et tynt, testbart
   abstraksjonslag: en fast liste hendelser, PII strippes hardt bort, og som
   standard logges det bare til konsollen (dev) / no-op (prod). En ekte
   leverandør kan kobles på senere via setAnalyticsSink() – uten å endre
   kallstedene.

   ALDRI send: e-post, meldingsinnhold, hunde-/profil-bio, GPS-koordinater,
   navn, referral-koder. Bare grove, ikke-identifiserende hendelser + tall.
   ========================================================================= */

// Hendelser vi faktisk måler (aktivering + kjerneløkke). Alt annet ignoreres.
export const EVENTS = [
  "signup_completed",
  "onboarding_completed",
  "dog_created",
  "meetup_created",
  "meetup_joined",
  "message_sent",
  "walk_completed",
  "place_suggested",
  "report_submitted",
  "referral_shared",
];

// Nøkler som ALDRI får følge med, uansett hvor de dukker opp.
const BLOCKED_KEYS = new Set([
  "email", "e-post", "epost", "name", "navn", "display_name", "ownername", "dogname",
  "bio", "about", "body", "text", "message", "details", "lat", "lng", "latitude",
  "longitude", "coords", "position", "route", "ref", "referral", "referral_code",
  "code", "phone", "address", "adresse",
]);

// Kun enkle, ufarlige verdityper (tall/bool/korte enum-strenger).
function safeValue(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    // Tillat kun korte, enum-aktige strenger (f.eks. kommune-id, kilde, kategori).
    return v.length <= 40 && /^[\w:.\-æøå ]*$/i.test(v) ? v : undefined;
  }
  return undefined;
}

/** Fjern PII og behold kun trygge felter. Eksportert for testing. */
export function sanitizeProps(props = {}) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (BLOCKED_KEYS.has(String(k).toLowerCase())) continue;
    const sv = safeValue(v);
    if (sv !== undefined) out[k] = sv;
  }
  return out;
}

let sink = null;
/** Koble på en ekte leverandør senere: setAnalyticsSink((event, props) => …). */
export function setAnalyticsSink(fn) { sink = typeof fn === "function" ? fn : null; }

/**
 * Logg en hendelse. Ukjente hendelsesnavn ignoreres (ingen ad-hoc tracking).
 * Props saneres hardt. Uten sink: console.debug i dev, ellers no-op.
 */
export function track(event, props = {}) {
  if (!EVENTS.includes(event)) return;
  const clean = sanitizeProps(props);
  try {
    if (sink) { sink(event, clean); return; }
    if (typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug("[analytics]", event, clean);
    }
  } catch { /* analyse skal aldri kunne krasje appen */ }
}
