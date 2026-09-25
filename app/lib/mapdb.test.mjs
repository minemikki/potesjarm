import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageTextToBirthDate,
  birthDateToAgeText,
  profileToRow,
  rowToProfile,
  dogToRow,
  rowToDog,
  minutesUntil,
  relativeWhen,
  meetupComposerToRow,
  rowToMeetup,
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

test("minutesUntil: fremtid, fortid, ugyldig", () => {
  assert.equal(minutesUntil(new Date(NOW.getTime() + 30 * 60000).toISOString(), NOW), 30);
  assert.equal(minutesUntil(new Date(NOW.getTime() - 30 * 60000).toISOString(), NOW), -30);
  assert.equal(minutesUntil(null, NOW), null);
  assert.equal(minutesUntil("ikke en dato", NOW), null);
});

test("relativeWhen: naturlige terskler", () => {
  assert.equal(relativeWhen(0), "Nå");
  assert.equal(relativeWhen(-5), "Nå");
  assert.equal(relativeWhen(30), "Om 30 min");
  assert.equal(relativeWhen(90), "Om 2 t");
  assert.equal(relativeWhen(60 * 30), "Om 1 d");
  assert.equal(relativeWhen(null), "");
});

test("meetupComposerToRow: regner ut starts_at/expires_at fra minutter", () => {
  const row = meetupComposerToRow(
    { type: "tur", title: " Tur ved vannet ", place: "Mosvatnet", max: 6, startsIn: 30, expiry: "ikveld" },
    { hostId: "host-1", municipalityId: "stavanger", now: NOW }
  );
  assert.equal(row.host_id, "host-1");
  assert.equal(row.municipality_id, "stavanger");
  assert.equal(row.kind, "tur");
  assert.equal(row.title, "Tur ved vannet");
  assert.equal(row.place_text, "Mosvatnet");
  assert.equal(row.max_dogs, 6);
  assert.equal(row.starts_at, new Date(NOW.getTime() + 30 * 60000).toISOString());
  assert.equal(row.expires_at, new Date(NOW.getTime() + 360 * 60000).toISOString());
});

test("meetupComposerToRow: ukjent expiry faller tilbake pa korteste, ugyldig max -> default 8", () => {
  const row = meetupComposerToRow({ type: "lek", expiry: "ikke-en-id", max: 999 }, { hostId: "h", municipalityId: "m", now: NOW });
  assert.equal(row.expires_at, new Date(NOW.getTime() + 120 * 60000).toISOString());
  assert.equal(row.max_dogs, 8);
});

test("rowToMeetup: mapper rad + kontekst til visningsform", () => {
  const row = {
    id: "m1",
    host_id: "host-1",
    kind: "tur",
    title: "Tur rundt Mosvatnet",
    note: "Rolig runde",
    place_text: "Mosvatnet",
    starts_at: new Date(NOW.getTime() + 10 * 60000).toISOString(),
    max_dogs: 8,
  };
  const m = rowToMeetup(row, { hostName: "Anders", hostDogName: "Balto", goingCount: 3, myProfileId: "someone-else", now: NOW });
  assert.equal(m.real, true);
  assert.equal(m.title, "Tur rundt Mosvatnet");
  assert.equal(m.when, "Om 10 min");
  assert.equal(m.startsIn, 10);
  assert.equal(m.host, "real:host-1");
  assert.equal(m.hostName, "Anders");
  assert.equal(m.hostDogName, "Balto");
  assert.equal(m.goingCount, 3);
  assert.equal(m.mine, false);
});

test("rowToMeetup: mine=true nar host_id matcher myProfileId, ukjent vertsnavn faller aerlig tilbake", () => {
  const row = { id: "m2", host_id: "me", kind: "lek", starts_at: NOW.toISOString(), max_dogs: 8 };
  const m = rowToMeetup(row, { myProfileId: "me", now: NOW });
  assert.equal(m.mine, true);
  assert.equal(m.hostName, "Hundeeier");
});

// ---- Sprint 4: grupper ----
import { rowToGroupSummary, rowToGroupMember, rowToGroupPost } from "./mapdb.js";

test("rowToGroupSummary: ekte medlemstall + min rolle -> joined", () => {
  const g = rowToGroupSummary({ id: "g1", name: "Hundeliv Stavanger", about: "Åpen gruppe", kind: "lokalt", is_official: true, municipality_id: "stavanger", member_count: 3, my_role: "member" });
  assert.equal(g.name, "Hundeliv Stavanger");
  assert.equal(g.official, true);
  assert.equal(g.tag, "Lokalt");
  assert.equal(g.members, 3);
  assert.equal(g.joined, true);
  assert.equal(g.myRole, "member");
  assert.deepEqual(g.faces, []);
});

test("rowToGroupSummary: ikke medlem, tomt medlemstall -> 0 / joined false", () => {
  const g = rowToGroupSummary({ id: "g2", name: "Valpetreff", kind: "valp", member_count: 0, my_role: null });
  assert.equal(g.members, 0);
  assert.equal(g.joined, false);
  assert.equal(g.myRole, null);
  assert.equal(g.tag, "Valp");
});

test("rowToGroupMember: rolle + primærhund", () => {
  const m = rowToGroupMember({ profile_id: "p1", role: "admin", display_name: "Kari", dog_id: "d1", dog_name: "Bamse", dog_breed: "Blandingshund" });
  assert.equal(m.role, "admin");
  assert.equal(m.ownerName, "Kari");
  assert.equal(m.dogName, "Bamse");
  assert.equal(m.dogId, "d1");
});

test("rowToGroupMember: ukjent eiernavn faller ærlig tilbake", () => {
  const m = rowToGroupMember({ profile_id: "p2", role: "member" });
  assert.equal(m.ownerName, "Hundeeier");
  assert.equal(m.dogName, "");
});

test("rowToGroupPost: forfatter + hund + tekst", () => {
  const p = rowToGroupPost({ id: "po1", author_id: "a1", author_name: "Nora", dog_name: "Milo", body: "Hei alle!", created_at: "2026-01-15T10:00:00Z" });
  assert.equal(p.real, true);
  assert.equal(p.authorName, "Nora");
  assert.equal(p.dogName, "Milo");
  assert.equal(p.body, "Hei alle!");
});
