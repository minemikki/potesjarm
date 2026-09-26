// Cold start / soul pass: en ny bruker skal møte en begynnelse, ikke et tomt
// dashboard. Ingen fake hunder/innlegg/treff, ingen negative «ingen …»-kort.
import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };

test.describe("Home cold start (390)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("helt ny bruker: personlig hero, guidet start, lokal reframe, idé-merking", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await gotoSeeded(page, { location: STAVANGER });

    await expect(page.locator(".hero2.walk.cold")).toContainText("finne på i dag");
    await expect(page.locator(".hero2 .pillBtn.primary")).toContainText("Start første tur");
    await expect(page.locator(".exploreDog .exploreCard")).toHaveCount(3);
    await expect(page.locator(".localStarter")).toContainText("helt i starten");
    // Idéer er tydelig merket «Idé» – aldri forvekslet med ekte treff.
    await expect(page.locator(".ideaChip .ideaTag").first()).toHaveText("Idé");
    // Ingen negativ tomstabling.
    await expect(page.locator("body")).not.toContainText("Ingen andre hunder");
    await expect(page.locator("body")).not.toContainText("Ingen innlegg her");
    // Ingen feed-seksjon uten ekte innlegg.
    await expect(page.locator(".feedGrid")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("etter første tur: cold-seksjoner borte, I dag-linje vises, ekte tall", async ({ page }) => {
    await gotoSeeded(page, {
      location: STAVANGER,
      walks: [{ at: Date.now(), km: 2.4, seconds: 1860, movingSeconds: 1740, meters: 2400, pointsAccepted: 20, suspicious: false }],
      streak: 1,
    });
    // Ingen førstegangs-hero lenger, og den rene cold-start-historikken er borte.
    await expect(page.locator(".hero2.walk.cold")).toHaveCount(0);
    await expect(page.locator(".weekStart")).toHaveCount(0);
    // «I dag»-linja viser den ekte turen.
    await expect(page.locator(".todayList")).toBeVisible();
    await expect(page.locator(".todayList")).toContainText("2,4 km");
    // Lokal reframe kan fortsatt vises (fortsatt ingen andre hunder) – men aldri
    // et negativt «Ingen andre hunder»-kort.
    await expect(page.locator("body")).not.toContainText("Ingen andre hunder");
  });
});

for (const w of [375, 390, 430]) {
  test(`cold start: ingen horisontal overflow @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 844 });
    await gotoSeeded(page, { location: STAVANGER });
    await expect(page.locator(".home2")).toBeVisible();
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBe(cw);
  });
}
