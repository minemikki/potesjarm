/* =========================================================================
   Ekte GPS-turtracking.

   Dette er kjernen som erstatter den forrige simulerte trackingen
   (setInterval som la til 0,0023 km hvert sekund uansett om brukeren
   beveget seg eller ikke). Alt her er rene, testbare funksjoner uten
   avhengighet til nettleseren, slik at de kan kjøres i node --test.

   Prinsippet: distanse kan ALDRI øke av seg selv. Bare tid gjør det.
   Distanse øker kun når vi har to GPS-punkter som:
     1. begge har brukbar nøyaktighet
     2. er tidsmessig fornuftige (økende klokkeslett)
     3. impliserer en realistisk fart
     4. faktisk representerer bevegelse (over støygulvet til GPS-en)

   ========================================================================= */

import { PAWS } from "./data.js";

/**
 * Konfigurasjon. Ikke gjem disse tallene i UI – de skal kunne leses,
 * testes og justeres ett sted.
 */
export const GPS_CONFIG = {
  // Punkter dårligere enn dette (meter) forkastes helt.
  MAX_ACCURACY_M: 30,
  // Bevegelse mindre enn dette mellom to godkjente punkter regnes som
  // GPS-støy/drift, ikke faktisk gange – teller ikke.
  MIN_MOVEMENT_M: 8,
  // Fart høyere enn dette (m/s, ca. 25 km/t) er umulig for en hundetur
  // og betyr et GPS-hopp. Punktet forkastes.
  MAX_SPEED_MPS: 7,
  // En tur må dekke minst så mange meter for å telle som fullført.
  // Under denne grensen: ingen streak, ingen poter, ingen badge-fremgang.
  MIN_VALID_WALK_M: 50,
  // Må ha minst så mange meter reell distanse før vi viser en tempo-tid.
  MIN_METERS_FOR_PACE: 20,
  // Brukes med navigator.geolocation.watchPosition.
  WATCH_OPTIONS: { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
};

/** Haversine – avstand i meter mellom to {lat,lng}-punkter. */
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Avgjør om ett nytt GPS-punkt skal godkjennes mot forrige godkjente punkt.
 * Returnerer alltid { accepted, reason, distanceM } og har ingen sideeffekter.
 */
export function evaluatePoint(prevAccepted, point, config = GPS_CONFIG) {
  if (point.accuracy != null && point.accuracy > config.MAX_ACCURACY_M) {
    return { accepted: false, reason: "poor_accuracy", distanceM: 0 };
  }
  if (!prevAccepted) {
    // Første godkjente punkt setter ankeret. Ingen distanse ennå.
    return { accepted: true, reason: "first_point", distanceM: 0 };
  }
  const dtSeconds = (point.timestamp - prevAccepted.timestamp) / 1000;
  if (!(dtSeconds > 0)) {
    return { accepted: false, reason: "non_increasing_time", distanceM: 0 };
  }
  const d = distanceMeters(prevAccepted, point);
  const speed = d / dtSeconds;
  if (speed > config.MAX_SPEED_MPS) {
    return { accepted: false, reason: "unrealistic_speed", distanceM: 0 };
  }
  if (d < config.MIN_MOVEMENT_M) {
    return { accepted: false, reason: "below_movement_threshold", distanceM: 0 };
  }
  return { accepted: true, reason: "movement", distanceM: d };
}

/**
 * Status:
 *  idle              – ingen tur pågår
 *  waiting_gps        – tur startet, venter på et brukbart GPS-punkt
 *  tracking           – har minst ett godkjent punkt, sporer aktivt
 *  signal_lost         – hadde signal, mistet det (watchPosition-feil), venter
 *  permission_denied  – nettleseren nektet posisjonstilgang
 *  unsupported         – navigator.geolocation finnes ikke
 */
export function createWalkSession(status = "idle") {
  return {
    status,
    lastAcceptedPoint: null,
    totalMeters: 0,
    pointsSeen: 0,
    pointsAccepted: 0,
    lastAccuracy: null,
    lastRejection: null,
  };
}

/** Ren reducer: nytt GPS-punkt inn, ny session ut. Ingen mutasjon. */
export function applyGpsSample(session, rawPoint, config = GPS_CONFIG) {
  if (!session || session.status === "idle") return session;

  const next = {
    ...session,
    pointsSeen: session.pointsSeen + 1,
    lastAccuracy: rawPoint.accuracy ?? null,
  };
  const result = evaluatePoint(session.lastAcceptedPoint, rawPoint, config);

  if (result.accepted) {
    next.lastAcceptedPoint = {
      lat: rawPoint.lat,
      lng: rawPoint.lng,
      accuracy: rawPoint.accuracy ?? null,
      timestamp: rawPoint.timestamp,
    };
    next.totalMeters = session.totalMeters + result.distanceM;
    next.pointsAccepted = session.pointsAccepted + 1;
    next.lastRejection = null;
    next.status = "tracking";
  } else {
    next.lastRejection = result.reason;
    // Har vi allerede et godkjent punkt, fortsetter vi å spore – dette
    // enkeltpunktet var bare støy. Har vi ingenting ennå, venter vi fortsatt.
    next.status = session.pointsAccepted > 0 ? "tracking" : "waiting_gps";
  }
  return next;
}

/** En tur teller først som fullført når den dekker nok reell distanse. */
export function isValidWalk(session, config = GPS_CONFIG) {
  return !!session && session.totalMeters >= config.MIN_VALID_WALK_M;
}

/**
 * Poter for en fullført tur. Kalles bare når isValidWalk() er sann, men er
 * defensiv: 0 meter gir alltid 0 poter, uansett.
 */
export function pawsForWalk(meters) {
  if (!(meters > 0)) return 0;
  return Math.round((meters / 1000) * PAWS.perKm) + PAWS.walkCompleted;
}

/**
 * Tempo i min/km. Returnerer null (vis "–") til vi har nok reell distanse
 * til at tempoet betyr noe – ikke en oppdiktet verdi mens turen er kort.
 */
export function paceMinPerKm(meters, seconds, config = GPS_CONFIG) {
  if (!(meters >= config.MIN_METERS_FOR_PACE) || !(seconds > 0)) return null;
  const km = meters / 1000;
  const min = seconds / 60;
  return min / km;
}

/** Menneskelesbar årsak, brukt i UI og feilmeldinger. */
export const REJECTION_LABELS = {
  poor_accuracy: "Lav GPS-nøyaktighet",
  non_increasing_time: "Ugyldig tidsstempel",
  unrealistic_speed: "Urealistisk fart (GPS-hopp)",
  below_movement_threshold: "Ingen faktisk bevegelse (GPS-støy)",
};
