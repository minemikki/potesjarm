// Kjøres med: node --test app/lib/friends.test.mjs
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { relationStatus, toggleFollow, sendFriendRequest, cancelFriendRequest, friendCount } from "./friends.js";

describe("toggleFollow – énveis følging", () => {
  test("slår på og av", () => {
    let f = toggleFollow({}, "luna");
    assert.equal(f.luna, true);
    f = toggleFollow(f, "luna");
    assert.equal(f.luna, undefined);
  });
});

describe("hundevenn-forespørsel – aldri 'venner' uten godkjenning", () => {
  test("sendFriendRequest setter pending, ikke friend", () => {
    const s = sendFriendRequest({ friendReqOut: {}, friends: {} }, "balto");
    assert.equal(s.friendReqOut.balto, true);
    assert.equal(s.friends.balto, undefined);
  });
  test("er idempotent", () => {
    let s = { friendReqOut: {}, friends: {} };
    s = sendFriendRequest(s, "balto");
    s = sendFriendRequest(s, "balto");
    assert.equal(Object.keys(s.friendReqOut).length, 1);
  });
  test("en allerede bekreftet venn får ingen ny forespørsel", () => {
    const s = sendFriendRequest({ friendReqOut: {}, friends: { balto: true } }, "balto");
    assert.equal(s.friendReqOut.balto, undefined);
  });
  test("cancelFriendRequest fjerner pending", () => {
    let s = { friendReqOut: { balto: true }, friends: {} };
    s = cancelFriendRequest(s, "balto");
    assert.equal(s.friendReqOut.balto, undefined);
  });
});

describe("relationStatus", () => {
  test("blokkering overstyrer alt", () => {
    const s = { followed: { luna: true }, friendReqOut: { luna: true }, friends: { luna: true }, blocked: { luna: true } };
    const r = relationStatus(s, "luna");
    assert.equal(r.blocked, true);
    assert.equal(r.following, false);
    assert.equal(r.requested, false);
    assert.equal(r.friend, false);
  });
  test("skiller følge fra hundevenn", () => {
    const s = { followed: { luna: true }, friendReqOut: {}, friends: {}, blocked: {} };
    const r = relationStatus(s, "luna");
    assert.equal(r.following, true);
    assert.equal(r.friend, false);
  });
});

describe("friendCount – ekte tall", () => {
  test("0 er 0", () => {
    assert.equal(friendCount({ friends: {} }), 0);
  });
  test("teller bekreftede venner", () => {
    assert.equal(friendCount({ friends: { a: true, b: true } }), 2);
  });
});
