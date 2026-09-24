/* =========================================================================
   Delte definisjoner som er EKTE produkt – ikke demo-innhold.

   Her ligger ting vi som produkt definerer selv: kategorier for treff,
   utfordringer, merker, nivåer og formatering. Dette er like ekte i live-
   modus som i demo, fordi det ikke utgir seg for å være andre brukere.

   Demo-fixtures (oppdiktede hunder, innlegg, treff) ligger i demo.js og
   brukes kun i demo-modus, i demo-kommunen, tydelig merket i UI-et.
   ========================================================================= */

export const img = (id, w = 900, h) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=80`;

/** Bilder brukt i demo-innhold og som dekor. Aldri presentert som ekte brukere. */
export const PHOTO = {
  hero: "1612774412771-005ed8e861d2",
  luna: "1558788353-f76d92427f16",
  balto: "1589941013453-ec89f33b5e95",
  milo: "1587300003388-59208cc962cb",
  nala: "1543466835-00a7907e9de1",
  max: "1537151625747-768eb6cf92b2",
  bella: "1561037404-61cd46aa615b",
  odin: "1491604612772-6853927639ef",
  frida: "1591160690555-5debfba289f0",
  pug: "1517849845537-4d257902454a",
  trail: "1544568100-847a948585b9",
  duo: "1548199973-03cce0bbc87b",
  beach: "1530281700549-e82e7bf110d6",
  puppies: "1444212477490-ca407925329e",
  pack: "1494947665470-20322015e3a8",
  ball: "1508948956644-0017e845d797",
  moor: "1605897472359-85e4b94d685d",
  lake: "1501785888041-af3ef285b470",
  fjord: "1476514525535-07fb3b4ae5f1",
  peaks: "1506905925346-21bda4d32df4",
  hills: "1469474968028-56623f02e42e",
  hug: "1522276498395-f4f68f7f8454",
  corgis: "1551717743-49959800b1f6",
};

/** Kategorier for "Nå skjer". Vår egen taksonomi. */
export const meetupTypes = [
  { id: "tur", label: "Tur", icon: "walk", color: "blue" },
  { id: "lek", label: "Lek", icon: "ball", color: "coral" },
  { id: "trening", label: "Trening", icon: "target", color: "violet" },
  { id: "valp", label: "Valpetreff", icon: "sprout", color: "mint" },
  { id: "kafe", label: "Kafé", icon: "coffee", color: "sun" },
  { id: "sporsmal", label: "Spørsmål", icon: "comment", color: "sun" },
];

/** Hvor lenge et treff er synlig. Alt i "Nå skjer" utløper av seg selv. */
export const expiryOptions = [
  { id: "2t", label: "2 timer", minutes: 120 },
  { id: "ikveld", label: "I kveld", minutes: 360 },
  { id: "idag", label: "I dag", minutes: 720 },
  { id: "imorgen", label: "I morgen", minutes: 1800 },
];

/* -------------------------------------------------------------------------
   Gamification. Dette er ekte produktregler, ikke fake data.
   Fremgangen som vises er alltid brukerens egen, faktiske fremgang.
   ------------------------------------------------------------------------- */

/** Nivåer. Terskel er totalt antall Poter. */
export const levels = [
  { level: 1, name: "Ny snute", from: 0 },
  { level: 2, name: "Turkompis", from: 300 },
  { level: 3, name: "Stifinner", from: 800 },
  { level: 5, name: "Turvenn", from: 2000 },
  { level: 10, name: "Eventyrpote", from: 5000 },
  { level: 20, name: "Nabolagshelt", from: 12000 },
  { level: 30, name: "Fjellhund", from: 25000 },
  { level: 50, name: "Potelegende", from: 60000 },
];

export function levelFor(paws) {
  let cur = levels[0];
  for (const l of levels) if (paws >= l.from) cur = l;
  const next = levels.find((l) => l.from > paws) || null;
  return {
    ...cur,
    next,
    toNext: next ? next.from - paws : 0,
    pct: next ? ((paws - cur.from) / (next.from - cur.from)) * 100 : 100,
  };
}

/**
 * Utfordringer. `metric` sier hva vi måler mot brukerens egne data,
 * så fremgangen alltid er ekte.
 */
export const challenges = [
  { id: "daily-walk", scope: "daglig", title: "Gå en tur på 20 minutter", metric: "todayMinutes", target: 20, unit: "min", reward: 40, icon: "walk", color: "blue" },
  { id: "week-walks", scope: "ukentlig", title: "Fem turer denne uka", metric: "weekWalks", target: 5, unit: "turer", reward: 150, icon: "paw", color: "coral" },
  { id: "week-km", scope: "ukentlig", title: "Gå 20 km denne uka", metric: "weekKm", target: 20, unit: "km", reward: 200, icon: "flame", color: "mint" },
  { id: "new-places", scope: "ukentlig", title: "Besøk tre nye turområder", metric: "newPlaces", target: 3, unit: "steder", reward: 180, icon: "pin", color: "violet" },
];

/**
 * Merker. `metric` + `target` gjør at status alltid regnes ut fra ekte tall.
 * Ingen merker deles ut for noe brukeren ikke har gjort.
 */
export const badges = [
  { id: "first-walk", name: "Første tur", metric: "totalWalks", target: 1, icon: "paw", color: "mint" },
  { id: "streak7", name: "7 dager", metric: "streak", target: 7, icon: "flame", color: "coral" },
  { id: "streak30", name: "30 dager", metric: "streak", target: 30, icon: "flame", color: "coral" },
  { id: "km100", name: "100 km", metric: "totalKm", target: 100, icon: "trophy", color: "sun" },
  { id: "km500", name: "500 km", metric: "totalKm", target: 500, icon: "trophy", color: "sun" },
  { id: "explorer", name: "Utforsker", metric: "placesVisited", target: 10, icon: "compass", color: "mint" },
  { id: "morning", name: "Morgenpote", metric: "morningWalks", target: 5, icon: "sun", color: "sun" },
  { id: "night", name: "Nattugle", metric: "nightWalks", target: 5, icon: "moon", color: "violet" },
  { id: "rain", name: "Regnværskriger", metric: "rainWalks", target: 5, icon: "rain", color: "violet" },
  { id: "social", name: "Sosial snute", metric: "meetupsJoined", target: 3, icon: "users", color: "blue" },
  { id: "founder", name: "Grunnlegger", metric: "founder", target: 1, icon: "star", color: "sun" },
];

/** Poter tjent per handling. Ingen kjøp av Poter. */
export const PAWS = {
  perKm: 100,
  walkCompleted: 20,
  streakDay: 10,
  newPlace: 50,
  verifyPlace: 30,
  meetupJoined: 40,
  meetupHosted: 60,
  addPlace: 80,
  referralActivated: 500,
};

/** Hundeprofil-felter. Brukes i onboarding og matching. */
export const dogTraits = {
  size: ["Liten", "Medium", "Stor"],
  energy: ["Rolig", "Middels", "Høy", "Veldig høy"],
  play: ["Apportering", "Røff lek", "Rolig lek", "Snusing", "Løping", "Bading", "Triks"],
  comfort: ["Liker store hunder", "Liker små hunder", "Liker valper", "Trenger rolige møter", "Trenger god avstand"],
};

/* -------------------------------------------------------------------------
   Formatering
   ------------------------------------------------------------------------- */

export const fmtKm = (n) =>
  (n ?? 0).toLocaleString("nb-NO", { maximumFractionDigits: 1, minimumFractionDigits: n > 0 && n < 10 && n % 1 ? 1 : 0 });

export const fmtNum = (n) => (n ?? 0).toLocaleString("nb-NO");

/** Norsk eieform: Santos' tempo, Lunas tempo. */
export const genitive = (n) => (!n ? "" : /[sxz]$/i.test(n) ? n + "'" : n + "s");
