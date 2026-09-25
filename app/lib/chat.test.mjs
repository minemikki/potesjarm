import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dmKey, canStartDirectChat, canChatMeetup, mergeMessages, unreadCount, sortConversations,
} from "./chat.js";

test("dmKey: kanonisk og symmetrisk", () => {
  assert.equal(dmKey("a", "b"), "a:b");
  assert.equal(dmKey("b", "a"), "a:b"); // uansett rekkefølge samme nøkkel
  assert.equal(dmKey("", "b"), null);
  assert.equal(dmKey("a", null), null);
});

test("canStartDirectChat: self-chat og blokkering forbudt", () => {
  assert.equal(canStartDirectChat({ meId: "me", otherId: "you" }), true);
  assert.equal(canStartDirectChat({ meId: "me", otherId: "me" }), false); // self
  assert.equal(canStartDirectChat({ meId: "me", otherId: "you", blocked: ["you"] }), false);
  assert.equal(canStartDirectChat({ meId: "me", otherId: null }), false);
  assert.equal(canStartDirectChat({ meId: null, otherId: "you" }), false);
});

test("canChatMeetup: kun vert eller påmeldt deltaker", () => {
  assert.equal(canChatMeetup({ meId: "h", hostId: "h" }), true); // vert
  assert.equal(canChatMeetup({ meId: "x", hostId: "h", going: true }), true); // deltaker
  assert.equal(canChatMeetup({ meId: "x", hostId: "h", going: false }), false); // utenforstående
  assert.equal(canChatMeetup({ meId: null, hostId: "h", going: true }), false);
});

test("mergeMessages: deduper på id (server vinner)", () => {
  const a = [{ id: "1", body: "hei", at: "2026-01-01T10:00:00Z" }];
  const b = [{ id: "1", body: "hei (rettet)", at: "2026-01-01T10:00:00Z" }];
  const out = mergeMessages(a, b);
  assert.equal(out.length, 1);
  assert.equal(out[0].body, "hei (rettet)");
});

test("mergeMessages: optimistisk (tmp) kollapser når ekte serverrad finnes", () => {
  const existing = [{ id: "tmp:1", mine: true, body: "på tur?", at: null }];
  const incoming = [{ id: "real-9", mine: true, body: "på tur?", at: "2026-01-01T10:00:00Z" }];
  const out = mergeMessages(existing, incoming);
  assert.equal(out.length, 1); // ikke dobbel
  assert.equal(out[0].id, "real-9");
});

test("mergeMessages: tmp beholdes til serveren har den, sortert sist", () => {
  const existing = [{ id: "tmp:2", mine: true, body: "venter", at: null }];
  const incoming = [{ id: "real-1", mine: false, body: "hei", at: "2026-01-01T09:00:00Z" }];
  const out = mergeMessages(existing, incoming);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, "real-1"); // ekte melding først (har tid)
  assert.equal(out[1].id, "tmp:2"); // pending sist
});

test("mergeMessages: sorterer på created_at", () => {
  const out = mergeMessages([], [
    { id: "b", body: "2", at: "2026-01-01T10:05:00Z" },
    { id: "a", body: "1", at: "2026-01-01T10:00:00Z" },
  ]);
  assert.deepEqual(out.map((m) => m.id), ["a", "b"]);
});

test("unreadCount: kun meldinger fra andre nyere enn lastReadAt", () => {
  const msgs = [
    { id: "1", senderId: "you", at: "2026-01-01T10:00:00Z" },
    { id: "2", senderId: "you", at: "2026-01-01T11:00:00Z" },
    { id: "3", senderId: "me", at: "2026-01-01T12:00:00Z" }, // egen, teller ikke
  ];
  assert.equal(unreadCount(msgs, "2026-01-01T10:30:00Z", "me"), 1); // kun #2
  assert.equal(unreadCount(msgs, null, "me"), 2); // aldri lest -> begge fra andre
  assert.equal(unreadCount(msgs, "2026-01-01T23:00:00Z", "me"), 0); // alt lest
});

test("unreadCount: mine-flagg når senderId mangler", () => {
  const msgs = [{ id: "1", mine: false, at: "2026-01-02T00:00:00Z" }, { id: "2", mine: true }];
  assert.equal(unreadCount(msgs, null, null), 1);
});

test("sortConversations: nyeste siste-melding først, tomme sist", () => {
  const list = [
    { id: "a", lastAt: "2026-01-01T10:00:00Z" },
    { id: "b", lastAt: null },
    { id: "c", lastAt: "2026-01-02T10:00:00Z" },
  ];
  assert.deepEqual(sortConversations(list).map((c) => c.id), ["c", "a", "b"]);
});
