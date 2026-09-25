import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeFeed, toggleLikeOptimistic, toggleSaveOptimistic, applyLikeResult,
  filterBlocked, canInteract,
} from "./feed.js";

test("mergeFeed: deduper på id, beholder rekkefølge (paginering)", () => {
  const page1 = [{ id: "a" }, { id: "b" }];
  const page2 = [{ id: "b" }, { id: "c" }]; // b overlapper
  assert.deepEqual(mergeFeed(page1, page2).map((p) => p.id), ["a", "b", "c"]);
});

test("mergeFeed: hopper over tomme/id-løse", () => {
  assert.deepEqual(mergeFeed([{ id: "a" }], [null, { id: null }, { id: "a" }]).map((p) => p.id), ["a"]);
});

test("toggleLikeOptimistic: opp, ned, og reversibel (tilbakerulling)", () => {
  const post = { id: "1", likes: 2, likedByMe: false };
  const up = toggleLikeOptimistic(post);
  assert.equal(up.likedByMe, true);
  assert.equal(up.likes, 3);
  const back = toggleLikeOptimistic(up); // rollback
  assert.equal(back.likedByMe, false);
  assert.equal(back.likes, 2);
});

test("toggleLikeOptimistic: count går aldri under 0", () => {
  const post = { id: "1", likes: 0, likedByMe: true };
  assert.equal(toggleLikeOptimistic(post).likes, 0);
});

test("toggleSaveOptimistic: veksler savedByMe", () => {
  assert.equal(toggleSaveOptimistic({ savedByMe: false }).savedByMe, true);
  assert.equal(toggleSaveOptimistic({ savedByMe: true }).savedByMe, false);
});

test("applyLikeResult: setter eksakt count/status fra server", () => {
  const post = { id: "1", likes: 5, likedByMe: false };
  const r = applyLikeResult(post, { likes: 6, liked: true });
  assert.equal(r.likes, 6);
  assert.equal(r.likedByMe, true);
});

test("filterBlocked: skjuler innhold fra blokkerte forfattere", () => {
  const items = [{ id: "1", authorId: "a" }, { id: "2", authorId: "b" }];
  assert.deepEqual(filterBlocked(items, ["b"]).map((i) => i.id), ["1"]);
});

test("canInteract: ikke mot blokkert forfatter", () => {
  assert.equal(canInteract({ meId: "me", authorId: "you" }), true);
  assert.equal(canInteract({ meId: "me", authorId: "you", blocked: ["you"] }), false);
  assert.equal(canInteract({ meId: "me", authorId: "me" }), true); // egne innlegg ok
  assert.equal(canInteract({ meId: null, authorId: "you" }), false);
});
