// Sprint 9 – aktivitets-domenelogikk (samme regler som server-RPC-ene).
import { test } from "node:test";
import assert from "node:assert/strict";
import { osloWeekKey, validWalks, weeklyAggregate, totals, personalBests, challengeValue, challengeProgress } from "./activity.js";

const DAY = 86400000;
const NOW = Date.UTC(2025, 0, 8, 12, 0, 0); // ons 8. jan 2025, 12:00 UTC

test("validWalks: forkaster ugyldige og null-distanse-turer", () => {
  const w = validWalks([
    { at: NOW, km: 2 },
    { at: NOW, km: 0 },
    { at: NOW, km: 3, valid: false },
    null,
  ]);
  assert.equal(w.length, 1);
  assert.equal(w[0].km, 2);
});

test("weeklyAggregate: to turer samme dag = én aktiv dag; km summeres", () => {
  const walks = [
    { at: NOW, km: 2.0, movingSeconds: 1200 },
    { at: NOW, km: 1.5, movingSeconds: 900 },       // samme dag
    { at: NOW - 8 * DAY, km: 5.0, movingSeconds: 3000 }, // forrige uke -> ekskludert
    { at: NOW, km: 4, valid: false },                // ugyldig -> ekskludert
  ];
  const a = weeklyAggregate(walks, NOW);
  assert.equal(a.walks, 2);
  assert.equal(a.km, 3.5);
  assert.equal(a.activeDays, 1);
  assert.equal(a.movingSeconds, 2100);
});

test("weeklyAggregate: turer på ulike dager i uka teller som flere aktive dager", () => {
  // man/tir/ons i samme ISO-uke som NOW
  const mon = Date.UTC(2025, 0, 6, 12, 0, 0);
  const tue = Date.UTC(2025, 0, 7, 12, 0, 0);
  const walks = [{ at: mon, km: 1 }, { at: tue, km: 1 }, { at: NOW, km: 1 }];
  const a = weeklyAggregate(walks, NOW);
  assert.equal(a.walks, 3);
  assert.equal(a.activeDays, 3);
  assert.equal(osloWeekKey(mon), osloWeekKey(NOW));
});

test("totals: sum over kun gyldige turer", () => {
  const t = totals([{ at: NOW, km: 2 }, { at: NOW - 40 * DAY, km: 3 }, { at: NOW, km: 9, valid: false }]);
  assert.equal(t.walks, 2);
  assert.equal(t.km, 5);
});

test("personalBests: lengste tur og beste uke fra ekte turer", () => {
  const walks = [
    { at: NOW, km: 3 },
    { at: NOW - 1 * DAY, km: 6.2 },       // lengste enkelttur
    { at: NOW - 40 * DAY, km: 4 },        // en annen uke
  ];
  const pb = personalBests(walks);
  assert.equal(pb.longestWalkKm, 6.2);
  // beste uke = uka rundt NOW (3 + 6.2 = 9.2) vs den andre uka (4)
  assert.equal(pb.bestWeekKm, 9.2);
});

test("challengeValue/challengeProgress: derivert, aldri klient-inkrementert", () => {
  const agg = { week: { walks: 3, km: 7, activeDays: 2 }, total: { walks: 12, km: 40 } };
  assert.equal(challengeValue("walks_week", agg), 3);
  assert.equal(challengeValue("km_week", agg), 7);
  assert.equal(challengeValue("active_days_week", agg), 2);
  const p = challengeProgress({ id: "week-10-km", metric: "km_week", target: 10 }, agg);
  assert.equal(p.progress, 7);
  assert.equal(p.done, false);
  assert.equal(Math.round(p.pct), 70);
  const done = challengeProgress({ id: "week-3-turer", metric: "walks_week", target: 3 }, agg);
  assert.equal(done.done, true);
});
