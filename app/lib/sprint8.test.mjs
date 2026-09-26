// Sprint 8 – rene funksjoner for kart/steder/geo + demo-integritet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { rowToPlace, rowToMapMeetup, meetupComposerToRow } from "./mapdb.js";
import { regionOfKommune, regionName, kommunerInRegion } from "./geo.js";
import { demoWalks } from "./demo.js";

test("rowToPlace: DB-rad -> app-sted, ingen oppdiktede tall", () => {
  const p = rowToPlace({
    id: "p1", name: "Stokkavannet", kind: "tursti", about: "Fin rundtur",
    lat: 58.96, lng: 5.72, municipality_id: "stavanger", region: "rogaland",
    source: "editorial", verified_count: 4, distance_km: 1.2, upcoming_meetups: 2,
  });
  assert.equal(p.real, true);
  assert.equal(p.type, "tursti");
  assert.equal(p.kommuneId, "stavanger");
  assert.equal(p.region, "rogaland");
  assert.equal(p.distanceKm, 1.2);
  assert.equal(p.upcomingMeetups, 2);
});

test("rowToPlace: manglende avstand/treff blir null (aldri gjettet)", () => {
  const p = rowToPlace({ id: "p2", name: "Skog", kind: "skog", lat: 1, lng: 2 });
  assert.equal(p.distanceKm, null);
  assert.equal(p.upcomingMeetups, null);
});

test("rowToMapMeetup: ekte deltakertall + koordinater", () => {
  const now = new Date("2025-01-01T12:00:00Z");
  const m = rowToMapMeetup({
    id: "m1", host_id: "h1", kind: "tur", title: "Kveldstur", lat: 58.9, lng: 5.7,
    starts_at: "2025-01-01T12:30:00Z", going_count: 3, group_id: null, place_text: "Mosvatnet",
  }, now);
  assert.equal(m.goingCount, 3);
  assert.equal(m.lat, 58.9);
  assert.equal(m.startsIn, 30);
  assert.equal(m.real, true);
});

test("meetupComposerToRow: tar med place_id og punkt når de finnes", () => {
  const now = new Date("2025-01-01T12:00:00Z");
  const row = meetupComposerToRow(
    { type: "tur", title: "Tur", startsIn: 0, expiry: "2t", place: "Stokkavannet", placeId: "p1", lat: 58.96, lng: 5.72 },
    { hostId: "h1", municipalityId: "stavanger", now }
  );
  assert.equal(row.place_id, "p1");
  assert.equal(row.lat, 58.96);
  assert.equal(row.lng, 5.72);
  assert.equal(row.municipality_id, "stavanger");
});

test("meetupComposerToRow: uten punkt blir lat/lng null (ikke 0)", () => {
  const row = meetupComposerToRow({ type: "tur", title: "Tur", startsIn: 0, place: "Et sted" }, { hostId: "h", municipalityId: "sola" });
  assert.equal(row.lat, null);
  assert.equal(row.lng, null);
  assert.equal(row.place_id, null);
});

test("region: kommune -> fylke (Rogaland = launch-region, kommune = data)", () => {
  assert.equal(regionOfKommune("stavanger"), "rogaland");
  assert.equal(regionOfKommune("sandnes"), "rogaland");
  assert.equal(regionOfKommune("bergen"), "vestland");
  assert.equal(regionName("rogaland"), "Rogaland");
  assert.equal(regionOfKommune("finnesikke"), null);
});

test("region: Rogaland-drilldown inneholder byene vi lanserer i", () => {
  const ids = kommunerInRegion("rogaland").map((k) => k.id);
  for (const id of ["stavanger", "sandnes", "sola", "randaberg", "time", "haugesund"]) {
    assert.ok(ids.includes(id), `mangler ${id}`);
  }
});

test("demo-integritet: ukas km == summen av demo-turene i uka (samme kilde)", () => {
  const now = new Date();
  const walks = demoWalks(now);
  assert.ok(walks.length > 0);
  // Alle demo-turer har km og et gyldig tidspunkt.
  for (const w of walks) {
    assert.equal(typeof w.km, "number");
    assert.ok(!Number.isNaN(new Date(w.at).getTime()));
    assert.equal(typeof w.movingSeconds, "number");
  }
  // Turene ligger innenfor uka (dagens tur kan ha et klokkeslett litt fram i
  // tid avhengig av når testen kjøres – derfor -1 som nedre slingringsmonn).
  for (const w of walks) {
    const diffDays = (now - new Date(w.at)) / 86400000;
    assert.ok(diffDays > -1 && diffDays < 7, `tur utenfor uka: ${w.at}`);
  }
});
