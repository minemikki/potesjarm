// Kjøres med: node --test app/lib/geo.test.mjs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { searchPlaces, kommuner, kommuneById, distanceKm, withinRadius, inBandtvang, radiusCenter, roundCoord, hasUserPosition } from "./geo.js";

describe("searchPlaces", () => {
  test("finner Tromsø kommune", () => {
    const hits = searchPlaces("tromsø");
    assert.ok(hits.some((h) => h.type === "kommune" && h.kommune.id === "tromso"));
  });

  test("'tromsø' og 'strømsø' (bydel i Drammen) er begge treff, og forveksles ikke", () => {
    const hits = searchPlaces("trom");
    const tromso = hits.find((h) => h.kommune.id === "tromso");
    assert.ok(tromso, "fant ikke Tromsø kommune");
    assert.equal(tromso.type, "kommune");
  });

  test("søk på 'strøm' finner Strømsø i Drammen, ikke Tromsø", () => {
    const hits = searchPlaces("strøm");
    assert.ok(hits.some((h) => h.omrade === "Strømsø" && h.kommune.id === "drammen"));
    assert.ok(!hits.some((h) => h.kommune.id === "tromso"));
  });

  test("diakritiske tegn: 'tromso' uten ø finner Tromsø (normalisert søk)", () => {
    const hits = searchPlaces("tromso");
    assert.ok(hits.some((h) => h.kommune.id === "tromso"));
  });

  test("hvert treff peker på nøyaktig én kommune – aldri flere samtidig", () => {
    const hits = searchPlaces("stavanger");
    for (const h of hits) {
      assert.equal(typeof h.kommune.id, "string");
    }
    // Stavanger skal ikke dukke opp som treff når vi søker på noe helt annet.
    const other = searchPlaces("bodø");
    assert.ok(!other.some((h) => h.kommune.id === "stavanger"));
  });

  test("tomt søk returnerer en kommuneliste, ikke et allerede valgt sted", () => {
    const hits = searchPlaces("");
    assert.ok(hits.length > 0);
    assert.equal(hits[0].type, "kommune");
  });

  test("alle kommuner har gyldige koordinater", () => {
    for (const k of kommuner) {
      assert.ok(Number.isFinite(k.lat) && k.lat > 55 && k.lat < 72, `${k.id} har rar lat: ${k.lat}`);
      assert.ok(Number.isFinite(k.lng) && k.lng > 4 && k.lng < 32, `${k.id} har rar lng: ${k.lng}`);
    }
  });
});

describe("distanceKm / withinRadius", () => {
  test("samme punkt = 0 km", () => {
    const p = { lat: 59, lng: 10 };
    assert.equal(distanceKm(p, p), 0);
  });
  test("withinRadius(null) betyr hele kommunen, alltid true", () => {
    assert.equal(withinRadius({ lat: 0, lng: 0 }, { lat: 50, lng: 50 }, null), true);
  });
  test("withinRadius respekterer faktisk avstand", () => {
    const oslo = { lat: 59.913, lng: 10.739 };
    const bergen = { lat: 60.393, lng: 5.325 };
    assert.equal(withinRadius(oslo, bergen, 25), false);
    assert.equal(withinRadius(oslo, oslo, 25), true);
  });
});

describe("roundCoord – personvern-avrunding", () => {
  test("runder til 3 desimaler (~100 m)", () => {
    assert.equal(roundCoord(58.968123), 58.968);
    assert.equal(roundCoord(5.733987), 5.734);
  });
  test("lar ikke-tall passere uendret", () => {
    assert.equal(roundCoord(undefined), undefined);
    assert.equal(roundCoord(null), null);
  });
});

describe("radiusCenter – ekte senter, ikke bare kommunesentroide", () => {
  test("bruker brukerens egen posisjon når den er delt", () => {
    const c = radiusCenter({ kommuneId: "stavanger", lat: 58.9, lng: 5.7 });
    assert.deepEqual(c, { lat: 58.9, lng: 5.7, source: "user" });
  });
  test("faller tilbake til kommunesentroide uten delt posisjon", () => {
    const c = radiusCenter({ kommuneId: "stavanger" });
    const k = kommuneById.stavanger;
    assert.equal(c.source, "kommune");
    assert.equal(c.lat, k.lat);
    assert.equal(c.lng, k.lng);
  });
  test("ukjent kommune uten posisjon gir null", () => {
    assert.equal(radiusCenter({ kommuneId: "finnesikke" }), null);
  });
  test("hasUserPosition speiler om lat/lng finnes", () => {
    assert.equal(hasUserPosition({ kommuneId: "stavanger" }), false);
    assert.equal(hasUserPosition({ kommuneId: "stavanger", lat: 58.9, lng: 5.7 }), true);
  });
});

describe("inBandtvang – ekte datoregel", () => {
  test("midt i juli er båndtvang", () => {
    assert.equal(inBandtvang(new Date(2026, 6, 15)), true);
  });
  test("midt i januar er ikke båndtvang", () => {
    assert.equal(inBandtvang(new Date(2026, 0, 15)), false);
  });
  test("21. august er ikke lenger båndtvang", () => {
    assert.equal(inBandtvang(new Date(2026, 7, 21)), false);
  });
  test("1. april er båndtvang", () => {
    assert.equal(inBandtvang(new Date(2026, 3, 1)), true);
  });
});
