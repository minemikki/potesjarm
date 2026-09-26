/* =========================================================================
   «Hundelivet i dag» – rene, testbare regler for Hjem og Nå skjer.

   Alt her leser bare ekte state (treff, turer, påmeldinger) og returnerer
   språk og struktur for UI-et. Ingenting diktes opp: finnes det ingen treff,
   sier vi det; finnes det ingen tur i dag, viser vi ingen tur.
   ========================================================================= */

const pad = (n) => String(n).padStart(2, "0");
export const clock = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Når starter treffet, som Date (fra startsIn i minutter). */
export function startDate(m, now = new Date()) {
  return new Date(now.getTime() + (Number(m?.startsIn) || 0) * 60000);
}

/** Menneskelig starttid: «nå», «om 18 min», «kl. 19:00», «i morgen kl. 11:00». */
export function startLabel(startsIn, now = new Date()) {
  const n = Number(startsIn) || 0;
  if (n <= 0) return "nå";
  if (n < 60) return `om ${n} min`;
  const d = new Date(now.getTime() + n * 60000);
  if (sameDay(d, now)) return `kl. ${clock(d)}`;
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (sameDay(d, tomorrow)) return `i morgen kl. ${clock(d)}`;
  return d.toLocaleDateString("nb-NO", { weekday: "long" }) + ` kl. ${clock(d)}`;
}

/** Tidsbøtte for Nå skjer: now | soon | tonight | today | later. */
export function meetupBucket(startsIn, now = new Date()) {
  const n = Number(startsIn) || 0;
  if (n <= 10) return "now";
  if (n <= 60) return "soon";
  const d = new Date(now.getTime() + n * 60000);
  if (sameDay(d, now)) return d.getHours() >= 17 ? "tonight" : "today";
  return "later";
}

export const BUCKET_LABEL = {
  now: "Nå",
  soon: "Om litt",
  today: "Senere i dag",
  tonight: "I kveld",
  later: "Senere",
};
const BUCKET_ORDER = ["now", "soon", "today", "tonight", "later"];

/** Grupper treff i tidsbøtter i fast rekkefølge; tomme bøtter utelates. */
export function groupByBucket(meetups = [], now = new Date()) {
  const map = new Map();
  for (const m of [...meetups].sort((a, b) => (a.startsIn || 0) - (b.startsIn || 0))) {
    const b = meetupBucket(m.startsIn, now);
    if (!map.has(b)) map.set(b, []);
    map.get(b).push(m);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({ id: b, label: BUCKET_LABEL[b], items: map.get(b) }));
}

/** Antall hunder påmeldt, inkludert deg hvis du nettopp ble med. */
export function goingCount(m, isGoing = false) {
  if (!m) return 0;
  if (m.real) return (m.goingCount || 0) + (isGoing && !m.iAmGoing ? 1 : 0);
  const g = m.going || [];
  return g.length + (isGoing && !g.includes("self") ? 1 : 0);
}

/** Verten til et treff, uansett om det er ekte eller demo. */
export function hostOf(m, dogById = () => null, me = null) {
  if (!m) return { name: "", dogName: "", photo: null, dogId: null };
  if (m.real) return { name: m.hostName || "", dogName: m.hostDogName || "", photo: m.hostPhoto || null, dogId: m.hostDogId || null };
  if (m.host === "self") return { name: "Du", dogName: me?.dogName || "", photo: me?.photo || null, dogId: null, self: true };
  const d = dogById(m.host);
  return { name: d?.owner || "", dogName: d?.name || "", photo: d?.photo || null, dogId: d?.id || null };
}

const VERB = {
  tur: "går tur",
  lek: "vil leke",
  trening: "trener",
  valp: "vil møte andre valper",
  kafe: "tar en kaffe",
  sporsmal: "lurer på noe",
};

/** «Balto går tur ved Mosvatnet» – en invitasjon i menneskespråk. */
export function inviteSentence(m, host) {
  const who = host?.dogName || host?.name || "Noen";
  const verb = VERB[m?.type] || "skal ut";
  const place = (m?.place || "").split(",")[0].trim();
  return place && m?.type !== "sporsmal" ? `${who} ${verb} ved ${place}` : `${who} ${verb}`;
}

/**
 * Hjem-heroen: dagens viktigste handling, i prioritert rekkefølge.
 *  1) going  – du skal på et treff snart
 *  2) join   – et treff nær deg du kan bli med på
 *  3) walk   – du har ikke gått tur i dag
 *  4) create – ingenting skjer: lag et treff
 */
export function homeHero({ meetups = [], going = {}, todayMinutes = 0 } = {}) {
  const active = meetups.filter((m) => (Number(m.startsIn) || 0) >= -30 && (Number(m.startsIn) || 0) <= 18 * 60);
  const byStart = (a, b) => (a.startsIn || 0) - (b.startsIn || 0);
  const mine = active.filter((m) => going[m.id] || m.mine).sort(byStart);
  if (mine.length) return { kind: "going", meetup: mine[0] };
  const open = active.filter((m) => !going[m.id] && !m.mine).sort(byStart);
  if (open.length) return { kind: "join", meetup: open[0], more: open.length - 1 };
  if (!todayMinutes) return { kind: "walk" };
  return { kind: "create" };
}

/** Én ærlig statuslinje for hjem. */
export function liveStatus({ meetups = [], now = new Date() } = {}) {
  const today = meetups.filter((m) => {
    const n = Number(m.startsIn) || 0;
    return n >= -30 && sameDay(startDate(m, now), now);
  });
  if (today.length === 0) {
    return meetups.length === 0
      ? { tone: "cold", text: "Hundelivet her starter med dere." }
      : { tone: "quiet", text: "Rolig i dag – neste treff er " + startLabel(Math.min(...meetups.map((m) => m.startsIn || 0)), now) + "." };
  }
  const evening = today.every((m) => startDate(m, now).getHours() >= 17);
  const n = today.length;
  return { tone: "live", text: `${n} ${n === 1 ? "ting skjer" : "ting skjer"} nær deg ${evening ? "i kveld" : "i dag"}` };
}

const walkName = (d) => (d.getHours() < 10 ? "Morgenrunde" : d.getHours() < 17 ? "Dagstur" : "Kveldstur");
const fmtKm = (km) => (Math.round((km || 0) * 10) / 10).toFixed(1).replace(".", ",");

/**
 * «I dag»-tidslinjen: dagens faktiske turer + treff du er med på i dag +
 * ukemålet (bare når det finnes noe annet ekte å vise). Tom liste = vis ingenting.
 */
export function todayItems({ walks = [], meetups = [], going = {}, weekWalks = 0, weekGoal = 5, now = new Date() } = {}) {
  const items = [];
  for (const w of walks) {
    const d = new Date(w.at);
    if (!sameDay(d, now)) continue;
    const min = Math.round((w.movingSeconds || w.seconds || 0) / 60);
    items.push({ key: "w" + w.at, sort: d.getTime(), time: clock(d), kind: "walk", title: walkName(d), sub: `${fmtKm(w.km)} km${min ? ` · ${min} min` : ""}` });
  }
  for (const m of meetups) {
    if (!(going[m.id] || m.mine)) continue;
    const d = startDate(m, now);
    if (!sameDay(d, now)) continue;
    const c = goingCount(m, !!going[m.id]);
    items.push({ key: "m" + m.id, sort: d.getTime(), time: (m.startsIn || 0) <= 0 ? "Nå" : clock(d), kind: "meetup", id: m.id, title: m.title, sub: `${(m.place || "").split(",")[0]}${c ? ` · ${c} ${c === 1 ? "hund" : "hunder"} påmeldt` : ""}` });
  }
  items.sort((a, b) => a.sort - b.sort);
  if (items.length || weekWalks > 0) {
    items.push({ key: "goal", sort: Infinity, time: "Uka", kind: "goal", title: "Ukemål", sub: `${Math.min(weekWalks, weekGoal)} av ${weekGoal} turer`, done: weekWalks >= weekGoal, progress: Math.min(1, weekWalks / weekGoal) });
  }
  return items;
}

/** Ferdige, lavterskel intensjoner for å lage et treff. */
export const INTENTS = [
  { id: "rolig", label: "Rolig tur", type: "tur", title: "Rolig tur", icon: "walk" },
  { id: "lek", label: "Bare litt lek", type: "lek", title: "Litt lek", icon: "ball" },
  { id: "valp", label: "Valpen trenger selskap", type: "valp", title: "Valpen trenger selskap", icon: "sprout" },
  { id: "kafe", label: "Kaffe + hund", type: "kafe", title: "Kaffe + hund", icon: "coffee" },
  { id: "trening", label: "Trening sammen", type: "trening", title: "Trening sammen", icon: "target" },
  { id: "ut", label: "Har noen lyst ut?", type: "tur", title: "Har noen lyst ut?", icon: "live", noPlace: true },
];

/**
 * Idéer å starte med når det ikke finnes ekte treff ennå. Dette er tydelig
 * merkede FORSLAG (ikke ekte treff, ingen påmeldte, ingen personer) som
 * forhåndsutfyller «Lag treff». De må ALLTID vises med «Idé»-merking i UI-et,
 * så det aldri kan forveksles med reell aktivitet.
 */
export const MEETUP_IDEAS = [
  { id: "kveldstur", intent: "rolig", label: "Rolig kveldstur", sub: "Ofte holder det med én annen hund", icon: "walk" },
  { id: "morgen", intent: "ut", label: "Morgenrunde sammen", sub: "En kort tur før dagen starter", icon: "sun" },
  { id: "lek", intent: "lek", label: "Litt lek i parken", sub: "For de sosiale hundene", icon: "ball" },
];

/** Standardtittel fra intensjon + sted. */
export function intentTitle(intent, place) {
  if (!intent) return place ? `Tur ved ${place}` : "Tur";
  const p = (place || "").split(",")[0].trim();
  return intent.noPlace || !p ? intent.title : `${intent.title} ved ${p}`;
}

/** Synlighet avledet fra «når» – brukeren slipper å tenke på utløp. */
export function expiryFor(whenId) {
  return { "Nå": "2t", "Om 30 min": "2t", "I kveld": "ikveld", "I morgen": "imorgen" }[whenId] || "2t";
}

/** Høyeste milepæl nådd (km totalt), eller null. */
export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];
export function milestone(totalKm = 0) {
  let hit = null;
  for (const k of MILESTONES) if (totalKm >= k) hit = k;
  return hit;
}

/** Positiv streak-tekst – aldri skyld. */
export function streakLine({ streak = 0, totalWalks = 0, walkedToday = false } = {}) {
  if (streak > 0 && walkedToday) return `${streak} ${streak === 1 ? "dag" : "dager"} ute sammen. Dagens tur er med.`;
  if (streak > 0) return `${streak} ${streak === 1 ? "dag" : "dager"} på rad. Én tur i dag holder den i gang.`;
  if (totalWalks > 0) return "Ny dag, ny start. Én tur, så er dere i gang igjen.";
  return "Første tur starter historien deres.";
}
