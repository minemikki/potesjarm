import { test } from "node:test";
import assert from "node:assert/strict";
import {
  startLabel, meetupBucket, groupByBucket, goingCount, hostOf, inviteSentence,
  homeHero, liveStatus, todayItems, intentTitle, INTENTS, expiryFor, milestone, streakLine,
} from "./today.js";

// Fast «nå»: fredag 25. sep 2026 kl. 12:00 lokal tid.
const NOW = new Date(2026, 8, 25, 12, 0, 0);

test("startLabel: nå, om X min, klokkeslett, i morgen", () => {
  assert.equal(startLabel(0, NOW), "nå");
  assert.equal(startLabel(-5, NOW), "nå");
  assert.equal(startLabel(18, NOW), "om 18 min");
  assert.equal(startLabel(7 * 60, NOW), "kl. 19:00");
  assert.equal(startLabel(23 * 60, NOW), "i morgen kl. 11:00");
});

test("meetupBucket: nå / om litt / senere i dag / i kveld / senere", () => {
  assert.equal(meetupBucket(0, NOW), "now");
  assert.equal(meetupBucket(45, NOW), "soon");
  assert.equal(meetupBucket(3 * 60, NOW), "today"); // 15:00
  assert.equal(meetupBucket(7 * 60, NOW), "tonight"); // 19:00
  assert.equal(meetupBucket(20 * 60, NOW), "later"); // i morgen
});

test("groupByBucket: fast rekkefølge, tomme utelatt, sortert på start", () => {
  const g = groupByBucket([{ id: "c", startsIn: 420 }, { id: "a", startsIn: 0 }, { id: "b", startsIn: 5 }], NOW);
  assert.deepEqual(g.map((x) => x.id), ["now", "tonight"]);
  assert.deepEqual(g[0].items.map((m) => m.id), ["a", "b"]);
});

test("goingCount: ekte og demo, deg lagt til én gang", () => {
  assert.equal(goingCount({ real: true, goingCount: 2, iAmGoing: false }, true), 3);
  assert.equal(goingCount({ real: true, goingCount: 2, iAmGoing: true }, true), 2);
  assert.equal(goingCount({ going: ["a", "b"] }, true), 3);
  assert.equal(goingCount({ going: ["a", "self"] }, true), 2);
});

test("hostOf + inviteSentence: menneskespråk fra ekte felt", () => {
  const dogs = { balto: { id: "balto", name: "Balto", owner: "Anders", photo: "p" } };
  const h = hostOf({ host: "balto" }, (id) => dogs[id]);
  assert.equal(h.dogName, "Balto");
  assert.equal(inviteSentence({ type: "tur", place: "Mosvatnet, hovedinngang" }, h), "Balto går tur ved Mosvatnet");
  assert.equal(inviteSentence({ type: "lek", place: "" }, h), "Balto vil leke");
  const real = hostOf({ real: true, hostName: "Kari", hostDogName: "" });
  assert.equal(inviteSentence({ type: "kafe", place: "Sentrum" }, real), "Kari tar en kaffe ved Sentrum");
});

test("homeHero: prioritet going > join > walk > create", () => {
  const ms = [{ id: "a", startsIn: 30 }, { id: "b", startsIn: 10 }];
  assert.equal(homeHero({ meetups: ms, going: { a: true } }).kind, "going");
  const join = homeHero({ meetups: ms, going: {} });
  assert.equal(join.kind, "join");
  assert.equal(join.meetup.id, "b"); // tidligste først
  assert.equal(homeHero({ meetups: [], todayMinutes: 0 }).kind, "walk");
  assert.equal(homeHero({ meetups: [], todayMinutes: 25 }).kind, "create");
  // Treff langt fram i tid teller ikke som «nå»-handling.
  assert.equal(homeHero({ meetups: [{ id: "x", startsIn: 3000 }], todayMinutes: 25 }).kind, "create");
});

test("liveStatus: ærlig kald start, ingen oppdiktede tall", () => {
  assert.equal(liveStatus({ meetups: [], now: NOW }).tone, "cold");
  assert.equal(liveStatus({ meetups: [], now: NOW }).text, "Hundelivet her starter med dere.");
  assert.equal(liveStatus({ meetups: [{ startsIn: 420 }, { startsIn: 480 }], now: NOW }).text, "2 ting skjer nær deg i kveld");
  assert.equal(liveStatus({ meetups: [{ startsIn: 30 }], now: NOW }).text, "1 ting skjer nær deg i dag");
  assert.equal(liveStatus({ meetups: [{ startsIn: 1400 }], now: NOW }).tone, "quiet");
});

test("todayItems: bare ekte ting, sortert, ukemål kun med noe annet ekte", () => {
  assert.deepEqual(todayItems({ now: NOW }), []);
  const walks = [{ at: new Date(2026, 8, 25, 7, 42).toISOString(), km: 2.13, movingSeconds: 1800 }];
  const items = todayItems({ walks, meetups: [{ id: "m", title: "Valpetreff", place: "Mosvatnet", startsIn: 390, going: ["a", "b"] }], going: { m: true }, weekWalks: 4, now: NOW });
  assert.deepEqual(items.map((i) => i.kind), ["walk", "meetup", "goal"]);
  assert.equal(items[0].time, "07:42");
  assert.equal(items[0].title, "Morgenrunde");
  assert.equal(items[0].sub, "2,1 km · 30 min");
  assert.equal(items[1].time, "18:30");
  assert.equal(items[1].sub, "Mosvatnet · 3 hunder påmeldt");
  assert.equal(items[2].sub, "4 av 5 turer");
  // Gårsdagens tur vises ikke i dag.
  const old = [{ at: new Date(2026, 8, 24, 9, 0).toISOString(), km: 3 }];
  assert.deepEqual(todayItems({ walks: old, now: NOW }), []);
});

test("intentTitle + expiryFor", () => {
  assert.equal(intentTitle(INTENTS[0], "Mosvatnet, hovedinngang"), "Rolig tur ved Mosvatnet");
  assert.equal(intentTitle(INTENTS.find((i) => i.id === "ut"), "Mosvatnet"), "Har noen lyst ut?");
  assert.equal(expiryFor("I kveld"), "ikveld");
  assert.equal(expiryFor("ukjent"), "2t");
});

test("milestone + streakLine: positivt, aldri skyld", () => {
  assert.equal(milestone(9), null);
  assert.equal(milestone(104), 100);
  assert.match(streakLine({ streak: 0, totalWalks: 5 }), /Ny dag, ny start/);
  assert.doesNotMatch(streakLine({ streak: 0, totalWalks: 5 }), /mistet/i);
  assert.match(streakLine({ streak: 7, walkedToday: true }), /7 dager ute sammen/);
});
