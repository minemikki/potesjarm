// Kjøres med: node --test app/lib/time.test.mjs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { osloDateKey, osloDaysBetween, osloWeekKey, isSameOsloWeek, nextStreak, isNewOsloDay, osloHour } from "./time.js";

// Alle tidsstempler under er UTC-millisekunder, konstruert eksplisitt slik at
// testen ikke er avhengig av hvilken tidssone maskinen som kjører den står i.
const MON = Date.UTC(2026, 8, 21, 10, 0); // man 21. sep 2026, 10:00 UTC (12:00 Oslo)
const TUE = Date.UTC(2026, 8, 22, 10, 0);
const WED = Date.UTC(2026, 8, 23, 10, 0);
const FRI = Date.UTC(2026, 8, 25, 10, 0);
const NEXT_MON = Date.UTC(2026, 8, 28, 10, 0);

// Rundt midnatt Oslo-tid (UTC+2 om sommeren): 22:30 UTC mandag = 00:30 Oslo tirsdag.
const MON_LATE_UTC = Date.UTC(2026, 8, 21, 22, 30);

describe("osloDateKey / osloDaysBetween", () => {
  test("samme instant gir 0 dager mellomrom", () => {
    assert.equal(osloDaysBetween(MON, MON), 0);
  });
  test("mandag til tirsdag er 1 dag", () => {
    assert.equal(osloDaysBetween(MON, TUE), 1);
  });
  test("mandag til fredag er 4 dager", () => {
    assert.equal(osloDaysBetween(MON, FRI), 4);
  });
  test("sent på kvelden UTC kan likevel være neste dag i Oslo", () => {
    // 22:30 UTC mandag = 00:30 Oslo tirsdag (sommertid, UTC+2)
    const key = osloDateKey(MON_LATE_UTC);
    assert.equal(key, "2026-09-22");
  });
});

describe("osloWeekKey / isSameOsloWeek", () => {
  test("mandag og fredag samme uke er i samme uke", () => {
    assert.equal(isSameOsloWeek(MON, FRI), true);
  });
  test("mandag og neste mandag er IKKE samme uke", () => {
    assert.equal(isSameOsloWeek(MON, NEXT_MON), false);
  });
  test("ukenøkkelen for en mandag er mandagens egen dato", () => {
    assert.equal(osloWeekKey(MON), "2026-09-21");
    assert.equal(osloWeekKey(FRI), "2026-09-21");
  });
});

describe("nextStreak – ekte sammenhengende kalenderdager, ikke bare 'ny dag'", () => {
  test("ingen tidligere tur => streak starter på 1", () => {
    assert.equal(nextStreak(null, MON, 0), 1);
  });
  test("går igjen samme dag => streak uendret", () => {
    assert.equal(nextStreak(MON, MON + 3600_000, 5), 5);
  });
  test("går dagen etter => streak +1", () => {
    assert.equal(nextStreak(MON, TUE, 1), 2);
  });
  test("REGRESJONSTEST: mandag så ingenting før fredag => streak faller til 1, ikke 2", () => {
    // Dette var den rapporterte buggen: streak gikk fra 1 til 2 selv om det
    // var et fire-dagers hull i midten.
    assert.equal(nextStreak(MON, FRI, 1), 1);
  });
  test("stort hull (en uke) nullstiller streaken til 1, ikke akkumulerer videre", () => {
    assert.equal(nextStreak(MON, NEXT_MON, 12), 1);
  });
});

describe("isNewOsloDay – styrer streak-dag-bonusen", () => {
  test("ingen tidligere tur er en ny dag", () => {
    assert.equal(isNewOsloDay(null, MON), true);
  });
  test("samme Oslo-kalenderdag er IKKE en ny dag", () => {
    assert.equal(isNewOsloDay(MON, MON + 3600_000), false);
  });
  test("neste kalenderdag ER en ny dag", () => {
    assert.equal(isNewOsloDay(MON, TUE), true);
  });
});

describe("osloHour", () => {
  test("midnatt UTC vinterstid (UTC+1) er 00 i Oslo, ikke 24", () => {
    assert.equal(osloHour(Date.UTC(2026, 0, 1, 23, 0)), 0);
  });
  test("formiddag er formiddag", () => {
    assert.equal(osloHour(Date.UTC(2026, 0, 1, 9, 0)), 10);
  });
});
