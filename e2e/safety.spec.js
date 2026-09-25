// Trygghet: blokkering og hastevarsel skal ha EKTE konsekvens, ikke bare en
// toast. Kjøres mot den faktiske produksjonskoden (samme store som i appen).

import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };
const H = 3600_000;

test.describe("Blokkering filtrerer faktisk feeden", () => {
  test("å blokkere en forfatter fjerner innleggene deres fra For deg", async ({ page }) => {
    // Demo-modus i Stavanger gir ekte innlegg å blokkere.
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });

    const author = page.locator(".post .postHead b", { hasText: "Anders & Balto" }).first();
    await expect(author).toBeVisible();

    // Åpne meny på det innlegget og blokker.
    const post = page.locator(".post", { has: page.locator(".postHead b", { hasText: "Anders & Balto" }) }).first();
    await post.locator('.ghostIcon[aria-label="Mer"]').click();
    await page.locator(".actionSheet button", { hasText: "Blokker" }).click();

    // Innlegget skal være borte fra feeden – ikke bare en beskjed.
    await expect(page.locator(".post .postHead b", { hasText: "Anders & Balto" })).toHaveCount(0);
  });
});

test.describe("Hastevarsel for mistet hund utløper", () => {
  test("et ferskt varsel vises på forsiden", async ({ page }) => {
    await gotoSeeded(page, {
      location: STAVANGER,
      lostDogActive: true,
      lostDogSince: Date.now() - 2 * H,
      lostDogNote: "Ved vannet kl 14, blå sele",
      lostDogResolvedAt: null,
    });
    await expect(page.locator(".lostBanner")).toBeVisible();
    await expect(page.locator(".lostBanner")).toContainText("blå sele");
  });

  test("et varsel eldre enn levetiden (48 t) vises IKKE som aktivt", async ({ page }) => {
    await gotoSeeded(page, {
      location: STAVANGER,
      lostDogActive: true, // flagget står igjen, men tiden har løpt ut
      lostDogSince: Date.now() - 50 * H,
      lostDogResolvedAt: null,
    });
    await expect(page.locator(".lostBanner")).toHaveCount(0);
  });

  test("et varsel markert funnet vises ikke", async ({ page }) => {
    await gotoSeeded(page, {
      location: STAVANGER,
      lostDogActive: true,
      lostDogSince: Date.now() - 1 * H,
      lostDogResolvedAt: Date.now(),
    });
    await expect(page.locator(".lostBanner")).toHaveCount(0);
  });
});
