import { test } from "node:test";
import assert from "node:assert/strict";
import { energyNum, getDogCommonalities, commonalityHeadline, relationStatus } from "./social.js";

test("energyNum: tall og ord", () => {
  assert.equal(energyNum(4), 4);
  assert.equal(energyNum("4"), 4);
  assert.equal(energyNum("høy"), 4);
  assert.equal(energyNum("rolig"), 2);
  assert.equal(energyNum(""), null);
  assert.equal(energyNum("finnes ikke"), null);
});

test("getDogCommonalities: delte interesser, energi, størrelse, område", () => {
  const mine = { play: ["Apportering", "Bading"], energy: "høy", size: "stor", kommuneId: "stavanger" };
  const other = { play: ["bading", "skog"], energy: 4, size: "Stor", kommuneId: "stavanger" };
  const c = getDogCommonalities(mine, other);
  assert.ok(c.includes("Begge liker bading"));
  assert.ok(c.includes("Likt energinivå"));
  assert.ok(c.includes("Samme størrelse (stor)"));
  assert.ok(c.includes("Samme område"));
  assert.ok(!c.includes("Begge liker apportering")); // ikke delt
});

test("getDogCommonalities: ingen felles data -> tom (dikter aldri)", () => {
  const c = getDogCommonalities({ play: ["bading"], energy: 1, size: "liten", kommuneId: "tromso" }, { play: ["apportering"], energy: 5, size: "stor", kommuneId: "bergen" });
  assert.deepEqual(c, []);
});

test("getDogCommonalities: sameArea-override brukes når vi vet det", () => {
  const c = getDogCommonalities({ play: [] }, { play: [] }, { sameArea: true });
  assert.deepEqual(c, ["Samme område"]);
});

test("getDogCommonalities: kompatibel sosial stil fra felles komfort", () => {
  const c = getDogCommonalities({ comfort: ["store hunder"] }, { comfort: ["Store hunder"] }, { sameArea: false });
  assert.deepEqual(c, ["Kompatibel sosial stil"]);
});

test("commonalityHeadline: terskler", () => {
  assert.equal(commonalityHeadline(3), "God turmatch");
  assert.equal(commonalityHeadline(2), "Noe til felles");
  assert.equal(commonalityHeadline(1), "Én ting til felles");
  assert.equal(commonalityHeadline(0), "Ny å bli kjent med");
});

test("relationStatus: enkel id (lokal/demo)", () => {
  const state = { followed: { d1: true }, friends: {}, friendReqOut: { d2: true }, blocked: {} };
  assert.equal(relationStatus(state, "d1").following, true);
  assert.equal(relationStatus(state, "d2").requested, true);
  assert.equal(relationStatus(state, "d3").following, false);
});

test("relationStatus: { dogId, ownerId } (ekte) – følge per hund, venn per eier", () => {
  const state = { followed: { dogA: true }, friends: { ownerA: true }, friendReqOut: {}, friendReqIn: { ownerB: "req1" }, blocked: {} };
  const relA = relationStatus(state, { dogId: "dogA", ownerId: "ownerA" });
  assert.equal(relA.following, true);
  assert.equal(relA.friend, true);
  const relB = relationStatus(state, { dogId: "dogB", ownerId: "ownerB" });
  assert.equal(relB.incoming, true);
  assert.equal(relB.friend, false);
});

test("relationStatus: blokkering vinner over alt", () => {
  const state = { followed: { dogA: true }, friends: { ownerA: true }, friendReqOut: {}, blocked: { ownerA: true } };
  const rel = relationStatus(state, { dogId: "dogA", ownerId: "ownerA" });
  assert.equal(rel.blocked, true);
  assert.equal(rel.following, false);
  assert.equal(rel.friend, false);
});
