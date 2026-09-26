// V2-flytene: dynamisk hjem-hero, «Skal dere ut?» → 3-stegs Lag treff, og
// å bli med fra et invitasjonskort. Mot produksjonskoden, uten fixtures i live.

import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 } });

const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };

test("hjem cold start: personlig hero + guidet start + lokal reframe, ingen tomme «ingen …»-kort", async ({ page }) => {
  await gotoSeeded(page, { location: STAVANGER });
  // Personlig førstegangs-hero med ÉN primær handling.
  await expect(page.locator(".hero2.walk.cold")).toContainText("finne på i dag");
  await expect(page.locator(".hero2.walk.cold .pillBtn.primary")).toContainText("Start første tur");
  // Soul-seksjoner for cold start.
  await expect(page.locator(".exploreDog")).toBeVisible();
  await expect(page.locator(".localStarter")).toContainText("helt i starten");
  await expect(page.locator(".weekStart")).toContainText("starten på uka");
  // Ingen «I dag»-tidslinje uten ekte turer/treff.
  await expect(page.locator(".todayList")).toHaveCount(0);
  // Ingen negativ tomstabling: aldri «Ingen andre hunder» / «Ingen innlegg».
  await expect(page.locator("body")).not.toContainText("Ingen andre hunder");
  await expect(page.locator("body")).not.toContainText("Ingen innlegg");
});

test("hjem i demo: heroen inviterer til et ekte treff i nærheten", async ({ page }) => {
  await gotoSeeded(page, { mode: "demo", location: STAVANGER });
  const hero = page.locator(".hero2");
  await expect(hero).toContainText("Skjer");
  await hero.locator(".pillBtn", { hasText: "Jeg blir med" }).click();
  // Etter påmelding blir heroen «Du er med».
  await expect(page.locator(".hero2.isGoing")).toContainText("Du er med");
});

test("Nå skjer: intensjon → når → hvor → treffet ligger ute", async ({ page }) => {
  await gotoSeeded(page, { location: STAVANGER });
  await page.locator(".bottomNav button", { hasText: "Nå skjer" }).click();
  await page.locator(".intent", { hasText: "Rolig tur" }).click();

  const c = page.locator(".compose3");
  await expect(c.locator(".c3Title")).toHaveText("Når?");
  await c.locator(".choice", { hasText: "Om 30 min" }).click();
  await expect(c.locator(".c3Title")).toHaveText("Hvor møtes dere?");
  await c.locator(".choice", { hasText: "Mosvatnet" }).first().click();
  await c.locator(".pillBtn", { hasText: "Legg ut treffet" }).click();

  const card = page.locator(".invite", { hasText: "Rolig tur ved Mosvatnet" });
  await expect(card).toBeVisible();
  await expect(card.locator(".hostTag")).toHaveText("Ditt treff");
});

test("Nå skjer i demo: «Jeg blir med» oppdaterer kortet med en gang", async ({ page }) => {
  await gotoSeeded(page, { mode: "demo", location: STAVANGER });
  await page.locator(".bottomNav button", { hasText: "Nå skjer" }).click();
  const card = page.locator(".bucket .invite").first();
  const before = await card.locator(".inviteGoing small").innerText();
  await card.locator(".joinBtn").click();
  await expect(card.locator(".joinBtn")).toHaveText(/Du er med/);
  await expect(card.locator(".inviteGoing small")).not.toHaveText(before);
});
