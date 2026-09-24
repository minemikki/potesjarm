// Kjøres med: node --test app/lib/track.test.mjs
// Rene funksjoner, ingen nettleser eller mocks nødvendig.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GPS_CONFIG,
  distanceMeters,
  evaluatePoint,
  createWalkSession,
  applyGpsSample,
  isValidWalk,
  pawsForWalk,
  paceMinPerKm,
} from "./track.js";

// Stavanger sentrum-ish koordinater, brukt som utgangspunkt.
const BASE = { lat: 58.97, lng: 5.733, timestamp: 1000, accuracy: 5 };
const metersNorth = (m, base = BASE) => ({ ...base, lat: base.lat + m / 111320 });

describe("distanceMeters", () => {
  test("samme punkt = 0 meter", () => {
    assert.equal(distanceMeters(BASE, BASE), 0);
  });
  test("100 m nord er ~100 m (innenfor 1 %)", () => {
    const d = distanceMeters(BASE, metersNorth(100));
    assert.ok(Math.abs(d - 100) < 1, `fikk ${d}`);
  });
});

describe("evaluatePoint", () => {
  test("første punkt godkjennes alltid, uten distanse", () => {
    const r = evaluatePoint(null, BASE);
    assert.equal(r.accepted, true);
    assert.equal(r.distanceM, 0);
  });

  test("dårlig nøyaktighet forkastes", () => {
    const bad = { ...BASE, accuracy: 200 };
    const r = evaluatePoint(null, bad);
    assert.equal(r.accepted, false);
    assert.equal(r.reason, "poor_accuracy");
  });

  test("stillestående (samme punkt) forkastes som støy, ikke distanse", () => {
    const prev = { lat: BASE.lat, lng: BASE.lng, timestamp: BASE.timestamp };
    const next = { ...BASE, timestamp: BASE.timestamp + 5000 };
    const r = evaluatePoint(prev, next);
    assert.equal(r.accepted, false);
    assert.equal(r.reason, "below_movement_threshold");
    assert.equal(r.distanceM, 0);
  });

  test("liten GPS-drift (under terskel) forkastes", () => {
    const prev = { lat: BASE.lat, lng: BASE.lng, timestamp: BASE.timestamp };
    const jitter = metersNorth(2, { ...BASE, timestamp: BASE.timestamp + 3000 }); // 2 m, under MIN_MOVEMENT_M
    const r = evaluatePoint(prev, jitter);
    assert.equal(r.accepted, false);
    assert.equal(r.reason, "below_movement_threshold");
  });

  test("realistisk gange godkjennes og gir riktig distanse", () => {
    const prev = { lat: BASE.lat, lng: BASE.lng, timestamp: BASE.timestamp };
    // 20 m på 15 sekunder = 1,33 m/s, normal gangfart.
    const walked = metersNorth(20, { ...BASE, timestamp: BASE.timestamp + 15000 });
    const r = evaluatePoint(prev, walked);
    assert.equal(r.accepted, true);
    assert.ok(Math.abs(r.distanceM - 20) < 1);
  });

  test("urealistisk fart (GPS-hopp) forkastes", () => {
    const prev = { lat: BASE.lat, lng: BASE.lng, timestamp: BASE.timestamp };
    // 500 m på 2 sekunder = 250 m/s – umulig for en hundetur.
    const jump = metersNorth(500, { ...BASE, timestamp: BASE.timestamp + 2000 });
    const r = evaluatePoint(prev, jump);
    assert.equal(r.accepted, false);
    assert.equal(r.reason, "unrealistic_speed");
  });

  test("ikke-økende tidsstempel forkastes", () => {
    const prev = { lat: BASE.lat, lng: BASE.lng, timestamp: BASE.timestamp };
    const sameTime = metersNorth(20, { ...BASE, timestamp: BASE.timestamp });
    const r = evaluatePoint(prev, sameTime);
    assert.equal(r.accepted, false);
    assert.equal(r.reason, "non_increasing_time");
  });
});

describe("applyGpsSample / full session", () => {
  test("stillestående i 30 sekunder => 0 meter totalt", () => {
    let session = createWalkSession("waiting_gps");
    session = applyGpsSample(session, BASE); // første punkt, anker
    for (let i = 1; i <= 6; i++) {
      // samme posisjon, hvert 5. sekund, 30 sek totalt
      session = applyGpsSample(session, { ...BASE, timestamp: BASE.timestamp + i * 5000 });
    }
    assert.equal(session.totalMeters, 0);
    assert.equal(session.status, "tracking");
  });

  test("dårlig nøyaktighet hele veien => waiting_gps, 0 meter", () => {
    let session = createWalkSession("waiting_gps");
    for (let i = 0; i < 5; i++) {
      session = applyGpsSample(session, { ...BASE, accuracy: 500, timestamp: BASE.timestamp + i * 2000 });
    }
    assert.equal(session.totalMeters, 0);
    assert.equal(session.status, "waiting_gps");
    assert.equal(session.lastRejection, "poor_accuracy");
  });

  test("stort GPS-hopp forkastes og påvirker ikke totalen", () => {
    let session = createWalkSession("waiting_gps");
    session = applyGpsSample(session, BASE);
    session = applyGpsSample(session, { ...metersNorth(20, { ...BASE, timestamp: BASE.timestamp + 15000 }) });
    const afterNormalWalk = session.totalMeters;
    assert.ok(afterNormalWalk > 0);
    // Nå et umulig hopp 10 km unna på 3 sekunder.
    session = applyGpsSample(session, metersNorth(10000, { ...BASE, timestamp: BASE.timestamp + 18000 }));
    assert.equal(session.totalMeters, afterNormalWalk, "hoppet skal ikke telle med");
    assert.equal(session.lastRejection, "unrealistic_speed");
  });

  test("normal gange over flere punkter akkumulerer riktig distanse", () => {
    let session = createWalkSession("waiting_gps");
    let t = BASE.timestamp;
    let lastPoint = BASE;
    session = applyGpsSample(session, lastPoint);
    let expected = 0;
    for (let i = 0; i < 10; i++) {
      t += 15000; // 15 sek mellom hvert punkt
      const p = metersNorth(20, { ...lastPoint, timestamp: t }); // 20 m hvert steg, ~1,3 m/s
      session = applyGpsSample(session, p);
      expected += 20;
      lastPoint = p;
    }
    assert.ok(Math.abs(session.totalMeters - expected) < 5, `fikk ${session.totalMeters}, forventet ~${expected}`);
  });

  test("permission_denied/unsupported status endres ikke av samples (idle-lignende)", () => {
    const session = createWalkSession("permission_denied");
    // idle er den eneste statusen som eksplisitt blokkerer i applyGpsSample;
    // permission_denied skal håndteres av selve GPS-laget, ikke overskrives stille.
    // Her tester vi bare at idle aldri endres:
    const idle = createWalkSession("idle");
    const after = applyGpsSample(idle, BASE);
    assert.equal(after, idle);
  });
});

describe("isValidWalk / gyldighetsregel", () => {
  test("0 meter er ikke gyldig", () => {
    const s = createWalkSession("tracking");
    assert.equal(isValidWalk(s), false);
  });
  test("under terskel (f.eks. 49 m) er ikke gyldig", () => {
    const s = { ...createWalkSession("tracking"), totalMeters: GPS_CONFIG.MIN_VALID_WALK_M - 1 };
    assert.equal(isValidWalk(s), false);
  });
  test("på eller over terskel er gyldig", () => {
    const s = { ...createWalkSession("tracking"), totalMeters: GPS_CONFIG.MIN_VALID_WALK_M };
    assert.equal(isValidWalk(s), true);
  });
});

describe("pawsForWalk – ingen poter uten ekte distanse", () => {
  test("0 meter => 0 poter", () => {
    assert.equal(pawsForWalk(0), 0);
  });
  test("negativ/udefinert => 0 poter", () => {
    assert.equal(pawsForWalk(-5), 0);
    assert.equal(pawsForWalk(undefined), 0);
  });
  test("1000 meter gir mer enn 0 poter", () => {
    assert.ok(pawsForWalk(1000) > 0);
  });
});

describe("paceMinPerKm", () => {
  test("for lite distanse => null (ikke oppdiktet tempo)", () => {
    assert.equal(paceMinPerKm(5, 60), null);
  });
  test("nok distanse => reelt tempo", () => {
    // 1000 m på 600 sekunder (10 min) = 10 min/km
    const pace = paceMinPerKm(1000, 600);
    assert.ok(Math.abs(pace - 10) < 0.01);
  });
});
