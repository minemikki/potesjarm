import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageTextToBirthDate,
  birthDateToAgeText,
  profileToRow,
  rowToProfile,
  dogToRow,
  rowToDog,
} from "./mapdb.js";

const NOW = new Date(Date.UTC(2026, 0, 15)); // 2026-01-15

test("ageTextToBirthDate: år og mnd", () => {
  assert.equal(ageTextToBirthDate("2 år", NOW), "2024-01-15");
  assert.equal(ageTextToBirthDate("10 mnd", NOW), "2025-03-15");
  assert.equal(ageTextToBirthDate("3", NOW), "2023-01-15"); // tall uten enhet = år
});

test("ageTextToBirthDate: ugyldig -> null (gjetter aldri)", () => {
  assert.equal(ageTextToBirthDate("", NOW), null);
  assert.equal(ageTextToBirthDate(null, NOW), null);
  assert.equal(ageTextToBirthDate("vet ikke", NOW), null);
});

test("birthDateToAgeText: rundtur", () => {
  assert.equal(birthDateToAgeText("2024-01-15", NOW), "2 år");
  assert.equal(birthDateToAgeText("2025-03-15", NOW), "10 mnd");
  assert.equal(birthDateToAgeText("", NOW), "");
  assert.equal(birthDateToAgeText(null, NOW), "");
});

test("profileToRow: kun kjente felt, radius validert", () => {
  const row = profileToRow(
    { ownerName: " Kari " },
    { kommuneId: "stavanger", omrade: "Tasta", radiusKm: 10 }
  );
  assert.deepEqual(row, {
    display_name: "Kari",
    municipality_id: "stavanger",
    radius_km: 10,
  });
});

test("profileToRow: ugyldig radius og tomme felt -> null", () => {
  const row = profileToRow({}, { radiusKm: 999 });
  assert.equal(row.display_name, null);
  assert.equal(row.municipality_id, null);
  assert.equal(row.radius_km, null);
});

test("rowToProfile: mapper tilbake", () => {
  assert.deepEqual(
    rowToProfile({ display_name: "Kari", municipality_id: "tromso", radius_km: 25, avatar_url: null }),
    { ownerName: "Kari", kommuneId: "tromso", radiusKm: 25, avatar: null }
  );
});

test("dogToRow: normaliserer størrelse/energi og renser arrays", () => {
  const row = dogToRow(
    {
      dogName: " Bamse ",
      breed: "Blandingshund",
      size: "Stor",
      energy: "høy",
      play: ["apportering", "", "bading"],
      comfort: ["store hunder"],
      age: "2 år",
      photo: null,
    },
    NOW
  );
  assert.equal(row.name, "Bamse");
  assert.equal(row.size, "stor");
  assert.equal(row.energy, 4);
  assert.deepEqual(row.play_styles, ["apportering", "bading"]);
  assert.deepEqual(row.comfort, ["store hunder"]);
  assert.equal(row.birth_date, "2024-01-15");
  assert.equal(row.photo_url, null);
});

test("dogToRow: ukjent størrelse/energi -> null (ikke gjettet)", () => {
  const row = dogToRow({ dogName: "X", size: "kjempestor", energy: "" }, NOW);
  assert.equal(row.size, null);
  assert.equal(row.energy, null);
});

test("dogToRow: energi som tall klampes til 1–5", () => {
  assert.equal(dogToRow({ energy: 9 }, NOW).energy, 5);
  assert.equal(dogToRow({ energy: 0 }, NOW).energy, 1);
  assert.equal(dogToRow({ energy: 3 }, NOW).energy, 3);
});

test("rowToDog: mapper tilbake til app-form", () => {
  const dog = rowToDog(
    { name: "Bamse", breed: "Blandingshund", size: "stor", energy: 4, play_styles: ["apportering"], comfort: [], birth_date: "2024-01-15", photo_url: null },
    NOW
  );
  assert.equal(dog.dogName, "Bamse");
  assert.equal(dog.size, "stor");
  assert.equal(dog.energy, 4);
  assert.equal(dog.age, "2 år");
  assert.deepEqual(dog.play, ["apportering"]);
});
