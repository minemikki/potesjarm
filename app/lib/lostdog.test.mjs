// Kjøres med: node --test app/lib/lostdog.test.mjs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isLostDogExpired, isLostDogLive, lostDogHoursLeft, lostDogMsLeft, LOST_DOG_TTL_H } from "./lostdog.js";

const T0 = Date.UTC(2026, 8, 24, 12, 0);
const H = 3600_000;

describe("utløp av hastevarsel", () => {
  test("et ferskt varsel er ikke utløpt", () => {
    assert.equal(isLostDogExpired(T0, T0 + H), false);
  });
  test("varselet utløper etter TTL", () => {
    assert.equal(isLostDogExpired(T0, T0 + (LOST_DOG_TTL_H + 1) * H), true);
  });
  test("uten starttidspunkt regnes det som utløpt (ingen tid igjen)", () => {
    assert.equal(isLostDogExpired(null, T0), true);
    assert.equal(lostDogMsLeft(null, T0), 0);
  });
  test("timer igjen rundes ned og er aldri negativ", () => {
    assert.equal(lostDogHoursLeft(T0, T0 + 1.5 * H), LOST_DOG_TTL_H - 2);
    assert.equal(lostDogHoursLeft(T0, T0 + 999 * H), 0);
  });
});

describe("isLostDogLive – den ene sannheten UI leser", () => {
  test("aktivt, ikke løst, ikke utløpt => live", () => {
    const s = { lostDogActive: true, lostDogSince: T0, lostDogResolvedAt: null };
    assert.equal(isLostDogLive(s, T0 + H), true);
  });
  test("markert funnet => ikke live, selv om det er innenfor TTL", () => {
    const s = { lostDogActive: true, lostDogSince: T0, lostDogResolvedAt: T0 + H };
    assert.equal(isLostDogLive(s, T0 + 2 * H), false);
  });
  test("utløpt => ikke live, selv om active-flagget står igjen på true", () => {
    const s = { lostDogActive: true, lostDogSince: T0, lostDogResolvedAt: null };
    assert.equal(isLostDogLive(s, T0 + (LOST_DOG_TTL_H + 1) * H), false);
  });
  test("aldri slått på => ikke live", () => {
    assert.equal(isLostDogLive({ lostDogActive: false }, T0), false);
  });
});
