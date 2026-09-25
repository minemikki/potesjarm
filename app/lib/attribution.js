/* =========================================================================
   Markedsattribusjon + referral for ventelista.

   - UTM lagres som FØRSTE berøring (den kampanjen som faktisk brakte folk
     inn), så en senere direkte-visitt ikke overskriver TikTok-kilden.
   - Referral (?ref=) lagres som siste kjente, så en invitasjon alltid telles.
   - Alt lagres i localStorage, så parametrene ikke forsvinner ved navigasjon
     eller reload før personen faktisk melder seg på.
   Rene funksjoner øverst (testbare), nettleser-glue nederst.
   ========================================================================= */

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
const STORE_KEY = "pj-attr-v1";

const clean = (v, max = 150) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

/** Plukk UTM, ref og by fra en query-streng («?utm_source=tiktok&ref=abc»). */
export function parseParams(search = "") {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const utm = {};
  for (const k of UTM_KEYS) {
    const v = clean(q.get(k));
    if (v) utm[k] = v;
  }
  const ref = clean(q.get("ref"), 20)?.toLowerCase().replace(/[^a-z0-9]/g, "") || null;
  const city = clean(q.get("by"), 60);
  return { utm, ref, city };
}

/**
 * Slå sammen lagret og ny attribusjon.
 *  - UTM: første berøring vinner (bare fyll inn hvis vi ikke har noen fra før).
 *  - ref: siste vinner.
 *  - referrer/landingPath: fra første besøk.
 */
export function mergeAttribution(stored = {}, incoming = {}, first = {}) {
  const hasUtm = stored.utm && Object.keys(stored.utm).length > 0;
  return {
    utm: hasUtm ? stored.utm : incoming.utm || {},
    ref: incoming.ref || stored.ref || null,
    referrer: stored.referrer ?? clean(first.referrer, 300),
    landingPath: stored.landingPath ?? clean(first.landingPath, 300),
    at: stored.at || first.at || null,
  };
}

/** Enkel, tilgivende e-postsjekk (serveren validerer også). */
export function isValidEmail(email = "") {
  const e = String(email).trim();
  return e.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e);
}

/** Delbar lenke for en referral-kode. */
export function referralLink(code, { origin = "https://potesjarm.no", city } = {}) {
  const u = new URL("/", origin);
  if (code) u.searchParams.set("ref", code);
  u.searchParams.set("utm_source", "referral");
  u.searchParams.set("utm_medium", "share");
  if (city) u.searchParams.set("by", city);
  return u.toString();
}

/** Tekst til deling. Personlig: hunden inviterer. */
export function shareText(dogName, city) {
  const who = dogName?.trim() || "Hunden min";
  return `${who} er med på Potesjarm – det lokale hundelivet${city ? ` i ${city}` : ""}. Bli med oss 🐾`;
}

/* ---------- Nettleser-glue ---------- */

export function readAttribution() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

/** Kalles én gang når landingssiden laster. Returnerer sammenslått attribusjon. */
export function captureAttribution() {
  if (typeof window === "undefined") return {};
  const incoming = parseParams(window.location.search);
  const merged = mergeAttribution(readAttribution(), incoming, {
    referrer: document.referrer || null,
    landingPath: window.location.pathname + window.location.search,
    at: new Date().toISOString(),
  });
  try { localStorage.setItem(STORE_KEY, JSON.stringify(merged)); } catch {}
  return { ...merged, city: incoming.city };
}
