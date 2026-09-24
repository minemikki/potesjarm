/* =========================================================================
   Tidssone-hjelpere.

   Streak, "i dag" og "denne uka" skal bety det samme uansett hvilken
   tidssone brukerens nettleser tilfeldigvis står i (reise, VPN, feil
   systemklokke). Potesjarm er et norsk produkt – vi regner alltid i
   Europe/Oslo, ikke i `new Date().toDateString()` sin lokale sone.

   Alt her er rene funksjoner på millisekund-tidsstempler (samme format som
   Date.now()), testbare uten mocking.
   ========================================================================= */

export const APP_TZ = "Europe/Oslo";

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-09-24" – kalenderdatoen i Oslo for et gitt tidsstempel. */
export function osloDateKey(ts = Date.now()) {
  return dateKeyFmt.format(new Date(ts));
}

function keyToUtcMidnight(key) {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Antall hele kalenderdager mellom to tidsstempler, i Oslo-tid. Kan bli negativt. */
export function osloDaysBetween(tsA, tsB) {
  const a = keyToUtcMidnight(osloDateKey(tsA));
  const b = keyToUtcMidnight(osloDateKey(tsB));
  return Math.round((b - a) / 86400000);
}

export function isSameOsloDay(tsA, tsB) {
  return osloDateKey(tsA) === osloDateKey(tsB);
}

/** Mandagsdatoen ("2026-09-21") i Oslo-tid for uka som inneholder ts. */
export function osloWeekKey(ts = Date.now()) {
  const key = osloDateKey(ts);
  const utcMidnight = keyToUtcMidnight(key);
  const weekday = new Date(utcMidnight).getUTCDay(); // 0=søn..6=lør
  const sinceMonday = (weekday + 6) % 7;
  const monday = new Date(utcMidnight - sinceMonday * 86400000);
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
}

export function isSameOsloWeek(tsA, tsB) {
  return osloWeekKey(tsA) === osloWeekKey(tsB);
}

/**
 * Neste streak-verdi basert på ekte, sammenhengende kalenderdager i Oslo-tid.
 *
 *   gap == null  (ingen tidligere tur)  → 1 (starter en ny streak)
 *   gap == 0     (allerede gått i dag)  → uendret
 *   gap == 1     (gikk i går)           → +1
 *   gap  > 1     (hull i streaken)      → 1 (streaken er brutt, starter på nytt)
 *
 * Dette er forskjellig fra "en tur på en ny kalenderdag" – mandag så fredag
 * skal ALDRI øke streaken fra 1 til 2, den skal falle tilbake til 1.
 */
export function nextStreak(lastWalkAt, now, currentStreak) {
  if (!lastWalkAt) return 1;
  const gap = osloDaysBetween(lastWalkAt, now);
  if (gap <= 0) return currentStreak; // samme dag (eller klokke som går feil vei)
  if (gap === 1) return currentStreak + 1;
  return 1;
}

/** Er det en NY kalenderdag siden forrige tur? Styrer streak-dag-bonusen. */
export function isNewOsloDay(lastWalkAt, now) {
  return !lastWalkAt || !isSameOsloDay(lastWalkAt, now);
}

/** Time på døgnet (0–23) i Oslo-tid – brukes til morgen-/kveldsmerker. */
export function osloHour(ts = Date.now()) {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ, hour: "2-digit", hour12: false }).format(new Date(ts))
  );
}
