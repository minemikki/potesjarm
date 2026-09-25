/* =========================================================================
   Mistet hund – regler for hastevarsel.

   Et savnet-varsel er tidskritisk og skal ikke bli liggende for alltid.
   Uten en utløpsmekanisme ville et gammelt varsel bli stående etter at
   hunden var funnet for lengst – misvisende for alle i nærheten. Derfor
   har hvert varsel en levetid, og kan avsluttes manuelt («Funnet»).

   Rene funksjoner på millisekund-tidsstempler – testbare uten mocking,
   samme mønster som time.js / track.js / ledger.js. UI og store bruker
   disse; de eier ikke tid selv.
   ========================================================================= */

/** Levetid for et hastevarsel før det utløper av seg selv. */
export const LOST_DOG_TTL_H = 48;

const H = 3600_000;

/** Millisekunder til varselet utløper. <= 0 betyr utløpt. */
export function lostDogMsLeft(since, now = Date.now(), ttlH = LOST_DOG_TTL_H) {
  if (!since) return 0;
  return since + ttlH * H - now;
}

/** Har varselet passert levetiden sin? */
export function isLostDogExpired(since, now = Date.now(), ttlH = LOST_DOG_TTL_H) {
  return lostDogMsLeft(since, now, ttlH) <= 0;
}

/**
 * Den ENESTE sannheten for om et varsel skal vises som aktivt nå.
 * Aktivt = eksplisitt slått på, ikke løst manuelt, og ikke utløpt.
 */
export function isLostDogLive(state, now = Date.now(), ttlH = LOST_DOG_TTL_H) {
  if (!state?.lostDogActive) return false;
  if (state.lostDogResolvedAt) return false;
  return !isLostDogExpired(state.lostDogSince, now, ttlH);
}

/** Hele timer igjen, avrundet ned – til «utløper om N timer»-tekst. */
export function lostDogHoursLeft(since, now = Date.now(), ttlH = LOST_DOG_TTL_H) {
  return Math.max(0, Math.floor(lostDogMsLeft(since, now, ttlH) / H));
}
