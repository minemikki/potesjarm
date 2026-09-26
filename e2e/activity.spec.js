// Sprint 9 – Aktivitet: demo-datasettet henger sammen (ukas km = summen av
// turene), rendrer uten JS-feil, og ingen horisontal overflow på mobil.
import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 } });
const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };

async function openAktivitet(page) {
  await page.locator(".bottomNav button", { hasText: "Mer" }).click();
  await page.locator("[class*='more'] button, .moreGrid button", { hasText: "Aktivitet" }).first().click();
  await expect(page.locator(".act2")).toBeVisible();
}

test("aktivitet i demo: ukas km stemmer med stolpene, ingen JS-feil", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await gotoSeeded(page, { mode: "demo", location: STAVANGER });
  await openAktivitet(page);

  // «Denne uka» viser et km-tall, og ukesstolpene finnes (samme kilde).
  const story = page.locator(".story2");
  await expect(story).toContainText("denne uka");
  await expect(page.locator(".weekBars2")).toBeVisible();
  // Totalt gått vises.
  await expect(page.locator(".act2")).toContainText("km totalt");
  expect(errors).toEqual([]);
});

for (const w of [375, 390, 430]) {
  test(`aktivitet: ingen horisontal overflow @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 844 });
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });
    await openAktivitet(page);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBe(cw);
  });
}
