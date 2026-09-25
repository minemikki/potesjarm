import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeNotifications, unreadCount, badgeText, notificationTarget, notificationIcon,
} from "./notifications.js";

test("mergeNotifications: dedupe på id, nyeste først, realtime vinner", () => {
  const existing = [{ id: "a", at: "2026-01-01T10:00:00Z", read: false }];
  const incoming = [
    { id: "a", at: "2026-01-01T10:00:00Z", read: true }, // oppdatert
    { id: "b", at: "2026-01-01T11:00:00Z", read: false },
  ];
  const out = mergeNotifications(existing, incoming);
  assert.deepEqual(out.map((n) => n.id), ["b", "a"]); // nyeste først
  assert.equal(out.find((n) => n.id === "a").read, true); // realtime-versjonen
});

test("unreadCount: teller kun uleste", () => {
  assert.equal(unreadCount([{ read: false }, { read: true }, { read: false }]), 2);
  assert.equal(unreadCount([]), 0);
});

test("badgeText: 0 => null, 1–99 => tall, 100 => 99+", () => {
  assert.equal(badgeText(0), null);
  assert.equal(badgeText(5), "5");
  assert.equal(badgeText(99), "99");
  assert.equal(badgeText(100), "99+");
  assert.equal(badgeText(null), null);
});

test("notificationTarget: riktig skjerm per type", () => {
  assert.deepEqual(notificationTarget({ kind: "follow", actorDogId: "d1" }), { overlay: "dog", id: "d1" });
  assert.deepEqual(notificationTarget({ kind: "friend_request", actorDogId: "d2" }), { overlay: "dog", id: "d2" });
  assert.deepEqual(notificationTarget({ kind: "like", refId: "p1" }), { overlay: "post", id: "p1" });
  assert.deepEqual(notificationTarget({ kind: "comment", refId: "p2" }), { overlay: "post", id: "p2" });
  assert.deepEqual(notificationTarget({ kind: "message", refId: "c1" }), { overlay: "chat", id: "c1" });
  assert.deepEqual(notificationTarget({ kind: "meetup_join", refId: "m1" }), { overlay: "meetup", id: "m1" });
});

test("notificationTarget: manglende referanse => null (ingen død knapp)", () => {
  assert.equal(notificationTarget({ kind: "follow" }), null); // ingen actorDogId
  assert.equal(notificationTarget({ kind: "like" }), null); // ingen refId
  assert.equal(notificationTarget({ kind: "ukjent", refId: "x" }), null);
  assert.equal(notificationTarget(null), null);
});

test("notificationIcon: kjent + ukjent type", () => {
  assert.equal(notificationIcon("like").icon, "heart");
  assert.equal(notificationIcon("message").icon, "mail");
  assert.equal(notificationIcon("ukjent").icon, "bell");
});
