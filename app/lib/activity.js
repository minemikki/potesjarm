/* =========================================================================
   Aktivitets-domenelogikk (rene funksjoner).

   Speiler nøyaktig det server-RPC-en complete_walk / activity_summary regner ut
   (migrasjon 010), slik at logikken kan enhetstestes uten database og at demo-
   modus og live-modus deler samme definisjoner. Ingenting her fabrikkerer
   fremgang: alt utledes fra en liste ekte turer.

   En «tur» har minst: { at (ms|iso), km, movingSeconds, valid? }.
   Kun gyldige turer (valid !== false og km > 0) teller.
   ========================================================================= */

import { osloDateKey } from "./time.js";

const M = 60000;

/** ISO-uke (mandag-start) i Oslo-tid, som "IYYY-IW" – samme som _oslo_week i SQL. */
export function osloWeekKey(ts = Date.now()) {
  // Bygg på osloDateKey (Oslo-kalenderdag) og regn ISO-uke fra den datoen.
  const [y, m, d] = osloDateKey(ts).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = (dt.getUTCDay() + 6) % 7; // man=0
  dt.setUTCDate(dt.getUTCDate() - day + 3); // torsdag i samme uke
  const firstThu = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((dt - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${dt.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

/** Kun gyldige turer med reell distanse teller til fremgang. */
export function validWalks(walks = []) {
  return walks.filter((w) => w && w.valid !== false && (w.km || 0) > 0);
}

/** Ukas aggregater fra ekte turer (samme uke som `now`). */
export function weeklyAggregate(walks = [], now = Date.now()) {
  const wk = osloWeekKey(now);
  const inWeek = validWalks(walks).filter((w) => osloWeekKey(w.at) === wk);
  const km = +inWeek.reduce((a, w) => a + (w.km || 0), 0).toFixed(2);
  const movingSeconds = inWeek.reduce((a, w) => a + (w.movingSeconds || 0), 0);
  const activeDays = new Set(inWeek.map((w) => osloDateKey(w.at))).size;
  return { walks: inWeek.length, km, movingSeconds, activeDays };
}

/** Totaler fra ekte turer. */
export function totals(walks = []) {
  const v = validWalks(walks);
  return {
    walks: v.length,
    km: +v.reduce((a, w) => a + (w.km || 0), 0).toFixed(1),
    movingSeconds: v.reduce((a, w) => a + (w.movingSeconds || 0), 0),
  };
}

/** Personlige rekorder – kun meningsfulle, ekte verdier. */
export function personalBests(walks = []) {
  const v = validWalks(walks);
  const longestWalkKm = +v.reduce((a, w) => Math.max(a, w.km || 0), 0).toFixed(2);
  const byWeek = new Map();
  for (const w of v) {
    const k = osloWeekKey(w.at);
    byWeek.set(k, (byWeek.get(k) || 0) + (w.km || 0));
  }
  const bestWeekKm = +Math.max(0, ...byWeek.values()).toFixed(1);
  return { longestWalkKm, bestWeekKm };
}

/** Verdien en challenge-metrikk har, gitt ukas aggregat + totaler. */
export function challengeValue(metric, { week, total } = {}) {
  switch (metric) {
    case "walks_week": return week?.walks || 0;
    case "km_week": return week?.km || 0;
    case "active_days_week": return week?.activeDays || 0;
    case "walks_total": return total?.walks || 0;
    case "km_total": return total?.km || 0;
    default: return 0;
  }
}

/** Fremgang på en challenge-definisjon (derivert, aldri klient-inkrementert). */
export function challengeProgress(def, agg) {
  const value = challengeValue(def.metric, agg);
  return { ...def, progress: value, done: value >= def.target, pct: Math.min(100, (value / def.target) * 100) };
}
