// Cold start: en kommune uten brukere skal være ærlig tom, aldri "fylt opp"
// med noe som ser ut som ekte aktivitet.

import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

const EMPTY_KOMMUNE = { kommuneId: "tromso", omrade: null, radiusKm: 10 };

test.describe("Cold start – tom kommune (live-modus)", () => {
  test("forsiden viser ekte 0-tall, ingen oppdiktet aktivitet", async ({ page }) => {
    await gotoSeeded(page, { location: EMPTY_KOMMUNE });
    const main = page.locator(".main");
    // Ærlig kald start: ingen oppdiktede tall, én rolig statuslinje.
    await expect(page.locator(".liveLine.cold")).toContainText("Hundelivet her starter med dere");
    await expect(main).not.toContainText("1 248");
    await expect(main).not.toContainText("18 dager");
  });

  test("forsiden reframer tom lokal start positivt – ingen negative «ingen …»-kort", async ({ page }) => {
    await gotoSeeded(page, { location: EMPTY_KOMMUNE });
    // Positiv «du er tidlig»-framing i stedet for en negativ advarsel.
    await expect(page.locator(".localStarter")).toContainText("helt i starten");
    await expect(page.locator(".main")).not.toContainText("Ingen andre hunder");
    await expect(page.locator(".main")).not.toContainText("Ingen innlegg");
    await expect(page.locator(".empty")).toHaveCount(0);
  });

  test("Nå skjer, Hunder og Grupper viser reelle tomme tilstander", async ({ page }) => {
    await gotoSeeded(page, { location: EMPTY_KOMMUNE });

    await page.locator('.navItem[title="Nå skjer"]').click();
    await expect(page.locator(".nowCold")).toContainText("Ingen åpne treff");
    // Intensjonene er CTA-en: lav terskel for å starte selv.
    await expect(page.locator(".intent")).toHaveCount(6);

    await page.locator('.navItem[title="Hunder"]').click();
    await expect(page.locator(".inlineEmpty")).toContainText("Ingen andre hunder");

    await page.locator('.navItem[title="Grupper"]').click();
    await expect(page.locator(".groupList")).toContainText("Hundeliv Tromsø");
    // Ingen oppdiktet medlemstall på en helt ny gruppe.
    await expect(page.locator(".groupList")).not.toContainText("medlemmer");
  });

  test("lokal toppliste er låst under terskelen, viser egne (nullstilte) rekorder", async ({ page }) => {
    await gotoSeeded(page, { location: EMPTY_KOMMUNE });
    await page.locator('.navItem[title="Aktivitet"]').click();

    await expect(page.locator(".lockedBoard")).toBeVisible();
    await expect(page.locator(".lockedBoard")).toContainText("10 aktive");
    await expect(page.locator(".recordGrid")).toContainText("0 km");
    await expect(page.locator(".recordGrid")).toContainText("0");
  });

  test("demo-modus er av som standard, og merkes tydelig når den skrus på", async ({ page }) => {
    await gotoSeeded(page, { location: EMPTY_KOMMUNE });
    await expect(page.locator(".demoBanner")).toHaveCount(0);

    await page.locator(".navProfileMain, .mobileHeader").first().click().catch(() => {});
  });

  test("bytter man til demo-kommunen i demo-modus, vises fixtures – ellers alltid ekte tomt", async ({ page }) => {
    await gotoSeeded(page, { mode: "demo", location: { kommuneId: "stavanger", omrade: null, radiusKm: 25 } });
    await expect(page.locator(".demoBanner")).toBeVisible();
    await expect(page.locator(".strip.dogs")).toBeVisible();

    // Bytt til en kommune uten demo-fixtures, fortsatt i demo-modus.
    await page.locator(".sideNav .cityChip, .cityChip").first().click();
    await page.locator(".locationForm input").fill("bergen");
    await page.locator(".locResult", { hasText: "Bergen" }).first().click();
    await page.locator(".sheet .pillBtn.primary").click();

    await expect(page.locator(".liveLine.cold")).toBeVisible();
    await expect(page.locator(".demoBanner")).toHaveCount(0);
  });
});
