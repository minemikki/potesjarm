// Kjøres med: node --test app/lib/ledger.test.mjs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { migrateState, pawsTotal, pushLedgerOnce } from "./ledger.js";

const EMPTY = { pawLedger: [], invitesSent: 0, invitesActivated: 0, profile: {} };

describe("pushLedgerOnce – idempotente belønninger", () => {
  test("første kall legger til en rad", () => {
    const s = { pawLedger: [] };
    const s2 = pushLedgerOnce(s, "meetup_joined", "m1", 40);
    assert.equal(s2.pawLedger.length, 1);
    assert.equal(s2.pawLedger[0].amount, 40);
  });

  test("samme (reason, refId) på nytt gir INGEN ny rad – kjernen i anti-farming-fiksen", () => {
    let s = { pawLedger: [] };
    s = pushLedgerOnce(s, "meetup_joined", "m1", 40);
    s = pushLedgerOnce(s, "meetup_joined", "m1", 40);
    s = pushLedgerOnce(s, "meetup_joined", "m1", 40);
    assert.equal(s.pawLedger.length, 1);
    assert.equal(pawsTotal(s.pawLedger), 40);
  });

  test("ulik refId på samme reason gir separate rader", () => {
    let s = { pawLedger: [] };
    s = pushLedgerOnce(s, "meetup_joined", "m1", 40);
    s = pushLedgerOnce(s, "meetup_joined", "m2", 40);
    assert.equal(s.pawLedger.length, 2);
    assert.equal(pawsTotal(s.pawLedger), 80);
  });

  test("streak_day-bonusen er naturlig idempotent per Oslo-kalenderdag", () => {
    let s = { pawLedger: [] };
    s = pushLedgerOnce(s, "streak_day", "2026-09-24", 10);
    s = pushLedgerOnce(s, "streak_day", "2026-09-24", 10); // f.eks. dobbelt-klikk / re-render
    assert.equal(s.pawLedger.length, 1);
  });
});

describe("migrateState – gammel lokal state rettes opp, ikke stoles blindt på", () => {
  test("gammelt flatt paws-tall blir én forklart ledger-rad, ikke tapt", () => {
    const s = migrateState({ paws: 250, onboarded: true }, EMPTY);
    assert.equal(pawsTotal(s.pawLedger), 250);
    assert.equal(s.pawLedger[0].reason, "legacy_migration");
  });

  test("tidligere ugyldig invitesActivated nullstilles – kan ikke ha oppstått ærlig uten backend", () => {
    const s = migrateState({ invitesActivated: 3, onboarded: true }, EMPTY);
    assert.equal(s.invitesActivated, 0);
  });

  test("ny bruker uten lagret state migreres til tomme, ekte nullverdier", () => {
    const s = migrateState({ onboarded: true }, EMPTY);
    assert.deepEqual(s.pawLedger, []);
    assert.equal(s.invitesActivated, 0);
    assert.equal(s.invitesSent, 0);
  });
});
