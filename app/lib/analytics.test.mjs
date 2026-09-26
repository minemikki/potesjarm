// Pilot-analyse: PII strippes, kun kjente hendelser slipper gjennom.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeProps, track, setAnalyticsSink, EVENTS } from "./analytics.js";

test("sanitizeProps: fjerner PII, beholder trygge tall/enum", () => {
  const out = sanitizeProps({
    email: "kari@example.no", dogName: "Luna", bio: "hemmelig", body: "melding",
    lat: 58.9, lng: 5.7, ref: "abc123", kommune: "stavanger", count: 3, founder: true,
  });
  assert.deepEqual(out, { kommune: "stavanger", count: 3, founder: true });
});

test("sanitizeProps: lange/rare strenger droppes", () => {
  const out = sanitizeProps({ note: "x".repeat(200), kind: "tur" });
  assert.deepEqual(out, { kind: "tur" });
});

test("track: kun kjente hendelser når sinken, PII strippet", () => {
  const seen = [];
  setAnalyticsSink((e, p) => seen.push([e, p]));
  track("walk_completed", { km: 3, email: "x@y.no" });
  track("ukjent_hendelse", { km: 1 });
  setAnalyticsSink(null);
  assert.equal(seen.length, 1);
  assert.equal(seen[0][0], "walk_completed");
  assert.deepEqual(seen[0][1], { km: 3 });
});

test("EVENTS dekker aktivering + kjerneløkke", () => {
  for (const e of ["signup_completed", "onboarding_completed", "dog_created", "meetup_created", "meetup_joined", "message_sent", "walk_completed", "place_suggested"]) {
    assert.ok(EVENTS.includes(e), `mangler ${e}`);
  }
});
