// Sprint 8 – kart/steder/geo. Demo-modus (ingen backend), så vi sjekker at
// kartet rendrer ekte demo-steder, listevisning som tilgjengelig alternativ,
// stedsdetalj, og at «Foreslå sted» er en ekte handling (ærlig innloggingskrav
// uten backend – aldri en falsk «sendt»-toast).

import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 } });

const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };

async function openKart(page) {
  await page.locator(".bottomNav button", { hasText: "Mer" }).click();
  await page.locator(".moreGrid a, .moreGrid button, .more2 button, [class*='more'] button", { hasText: "Kart" }).first().click();
  await expect(page.locator(".mapView2")).toBeVisible();
}

test("kart: rendrer, ingen JS-feil, kan veksle til liste og tilbake", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await gotoSeeded(page, { mode: "demo", location: STAVANGER });
  await openKart(page);

  // Listevisning er et tilgjengelig alternativ til kartet.
  await page.locator(".map2HeadBtns button", { hasText: "Liste" }).click();
  await expect(page.locator(".mapList")).toBeVisible();
  const rows = page.locator(".mapListItems .mapListRow");
  await expect(rows.first()).toBeVisible();

  // Åpne et sted fra lista, så tilbake til kart.
  await rows.first().click();
  await page.locator(".map2HeadBtns button", { hasText: "Kart" }).click();
  await expect(page.locator(".map2Canvas")).toBeVisible();
  expect(errors).toEqual([]);
});

test("foreslå sted: ekte overlay med ærlig innloggingskrav (ingen falsk suksess)", async ({ page }) => {
  await gotoSeeded(page, { mode: "demo", location: STAVANGER });
  await openKart(page);
  // Kart-bunnarket (steder finnes i demo) har en ekte «Foreslå sted»-knapp.
  await page.locator(".map2Summary button", { hasText: "Foreslå sted" }).click();

  // Overlayen åpnes med skjema – og uten backend sier den ærlig at man må
  // være innlogget. Send-knappen er deaktivert (ingen falsk «sendt»-toast).
  const sheet = page.locator(".sheet.composer", { hasText: "Foreslå et hundested" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Du må være innlogget");
  await expect(sheet.locator(".pillBtn.primary")).toBeDisabled();
});

test("lag treff: steg «hvor» har posisjonsvalg og eksisterende steder", async ({ page }) => {
  await gotoSeeded(page, { mode: "demo", location: STAVANGER });
  await page.locator(".bottomNav button", { hasText: "Nå skjer" }).click();
  await page.locator(".intent", { hasText: "Rolig tur" }).click();
  const c = page.locator(".compose3");
  await c.locator(".choice", { hasText: "Om 30 min" }).click();
  await expect(c.locator(".c3Title")).toHaveText("Hvor møtes dere?");
  // «Bruk min posisjon» finnes som eksplisitt handling.
  await expect(c.locator(".c3Pos .linkish")).toContainText("Bruk min posisjon");
  // Eksisterende steder kan velges.
  await c.locator(".choice", { hasText: "Mosvatnet" }).first().click();
  await c.locator(".pillBtn", { hasText: "Legg ut treffet" }).click();
  await expect(page.locator(".invite", { hasText: "Mosvatnet" }).first()).toBeVisible();
});

for (const w of [375, 390, 430]) {
  test(`kart: ingen horisontal overflow @${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 844 });
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });
    await openKart(page);
    const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw).toBe(cw);
    if (w === 390) await page.screenshot({ path: "/tmp/s8-map-390.png" });
    // Listevisning skal heller ikke overflowe.
    await page.locator(".map2HeadBtns button", { hasText: "Liste" }).click();
    const [sw2, cw2] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(sw2).toBe(cw2);
  });
}
