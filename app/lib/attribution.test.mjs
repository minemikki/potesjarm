import { test } from "node:test";
import assert from "node:assert/strict";
import { parseParams, mergeAttribution, isValidEmail, referralLink, shareText } from "./attribution.js";
import { errorKind } from "./waitlist.js";

test("parseParams: UTM, ref (renset) og by", () => {
  const p = parseParams("?utm_source=tiktok&utm_medium=paid&utm_campaign=launch-stv&utm_content=video1&ref=AbC12!&by=Stavanger");
  assert.deepEqual(p.utm, { utm_source: "tiktok", utm_medium: "paid", utm_campaign: "launch-stv", utm_content: "video1" });
  assert.equal(p.ref, "abc12");
  assert.equal(p.city, "Stavanger");
  assert.deepEqual(parseParams("").utm, {});
  assert.equal(parseParams("?ref=").ref, null);
});

test("mergeAttribution: UTM er første berøring, ref er siste", () => {
  const first = mergeAttribution({}, { utm: { utm_source: "tiktok" }, ref: null }, { referrer: "https://tiktok.com", landingPath: "/?utm_source=tiktok", at: "t1" });
  assert.equal(first.utm.utm_source, "tiktok");
  assert.equal(first.referrer, "https://tiktok.com");
  // Senere direkte besøk (ingen UTM) overskriver ikke kilden.
  const later = mergeAttribution(first, { utm: {}, ref: null }, { referrer: "", landingPath: "/", at: "t2" });
  assert.equal(later.utm.utm_source, "tiktok");
  assert.equal(later.landingPath, "/?utm_source=tiktok");
  // Ny UTM overskriver heller ikke første.
  const other = mergeAttribution(later, { utm: { utm_source: "instagram" }, ref: "xyz" }, {});
  assert.equal(other.utm.utm_source, "tiktok");
  assert.equal(other.ref, "xyz"); // invitasjon teller alltid
});

test("isValidEmail", () => {
  assert.equal(isValidEmail("kari@example.no"), true);
  assert.equal(isValidEmail(" kari@ex.no "), true);
  assert.equal(isValidEmail("kari@"), false);
  assert.equal(isValidEmail("kari@ex"), false);
  assert.equal(isValidEmail("ka ri@ex.no"), false);
  assert.equal(isValidEmail(""), false);
});

test("referralLink + shareText", () => {
  const l = referralLink("abc1234", { origin: "https://potesjarm.no", city: "Stavanger" });
  assert.match(l, /^https:\/\/potesjarm\.no\/\?ref=abc1234/);
  assert.match(l, /utm_source=referral/);
  assert.match(l, /by=Stavanger/);
  assert.match(shareText("Luna", "Stavanger"), /^Luna er med på Potesjarm.*i Stavanger/);
});

test("errorKind: tolker RPC-feil", () => {
  assert.equal(errorKind({ message: "invalid_email", code: "22023" }), "invalid_email");
  assert.equal(errorKind({ code: "PGRST202", message: "Could not find the function public.join_waitlist" }), "missing");
  assert.equal(errorKind(null), "error");
});
