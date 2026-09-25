// Regresjonstest for buggen brukeren rapporterte: å søke opp et sted i
// onboarding skal ALDRI vise et annet sted som "valgt" samtidig.

import { test, expect } from "@playwright/test";
import { gotoFresh } from "./helpers.js";

test.describe("Onboarding – sted", () => {
  test("ny bruker har ikke Stavanger (eller noe annet sted) forhåndsvalgt", async ({ page }) => {
    await gotoFresh(page);
    await expect(page.locator(".onboarding")).toBeVisible();
    await page.locator(".onboarding .pillBtn").last().click(); // "Kom i gang"

    await expect(page.locator(".onboarding h1")).toContainText("Hvor bor dere");
    // Ingen kommune skal stå som valgt før brukeren har søkt.
    await expect(page.locator(".locPicked")).toContainText("Ikke valgt ennå");
    await expect(page.locator(".onboarding")).not.toContainText("Stavanger");
    // "Videre" skal være deaktivert til et sted er valgt.
    await expect(page.locator(".onboarding .pillBtn").last()).toBeDisabled();
  });

  test("søk og valgt sted vises aldri samtidig i konflikt", async ({ page }) => {
    await gotoFresh(page);
    await page.locator(".onboarding .pillBtn").last().click();

    await page.locator(".locationForm input").fill("tromsø");
    await expect(page.locator(".locResult")).toContainText(["Tromsø"]);
    // Mens vi søker: ingen "valgt sted"-boks skal vises i det hele tatt.
    await expect(page.locator(".locPicked")).toHaveCount(0);

    await page.locator(".locResult", { hasText: "Tromsø" }).first().click();

    // Etter valg: søkefeltet er tomt, og bare Tromsø vises som valgt.
    await expect(page.locator(".locationForm input")).toHaveValue("");
    await expect(page.locator(".locPicked")).toContainText("Tromsø");
    await expect(page.locator(".locPicked")).not.toContainText("Stavanger");
  });

  test("Tromsø/Strømsø forveksles ikke, og radius hører til riktig kommune", async ({ page }) => {
    await gotoFresh(page);
    await page.locator(".onboarding .pillBtn").last().click();
    await page.locator(".locationForm input").fill("strøm");

    await expect(page.locator(".locResult")).toContainText(["Strømsø"]);
    await page.locator(".locResult", { hasText: "Strømsø" }).first().click();

    await expect(page.locator(".locPicked")).toContainText("Strømsø");
    await expect(page.locator(".locPicked")).toContainText("Drammen");
    await expect(page.locator(".locPicked")).not.toContainText("Tromsø");

    // Radius-valg skal nå gjelde det nyvalgte stedet.
    await page.getByRole("button", { name: "5 km", exact: true }).click();
    await expect(page.getByRole("button", { name: "5 km", exact: true })).toHaveClass(/active/);
  });

  test("full flyt: sted, hund, liker, ønsker, klar – appen viser riktig sted etterpå", async ({ page }) => {
    await gotoFresh(page);
    await page.locator(".onboarding .pillBtn").last().click(); // Kom i gang -> Sted

    await page.locator(".locationForm input").fill("bodø");
    await page.locator(".locResult", { hasText: "Bodø" }).first().click();
    await page.locator(".onboarding .pillBtn").last().click(); // Videre -> Hund

    await page.locator(".onboardForm input").first().fill("Tyra");
    await page.locator(".onboarding .pillBtn").last().click(); // Videre -> Liker

    await expect(page.locator(".onboarding h1")).toContainText("Hva liker");
    await page.locator(".miniChips button", { hasText: "Bading" }).click();
    await page.locator(".onboarding .pillBtn").last().click(); // Videre -> Ønsker

    await expect(page.locator(".onboarding h1")).toContainText("Hva ønsker");
    await page.locator(".goalItem", { hasText: "Finne turvenner" }).click();
    await page.locator(".onboarding .pillBtn").last().click(); // Videre -> Klar

    await expect(page.locator(".onboarding")).toContainText("Bodø");
    // Gå inn i appen uten å starte tur.
    await page.locator(".onboarding .linkish", { hasText: "Utforsk appen" }).click();
    await expect(page.locator(".onboarding")).toHaveCount(0);
    await expect(page.locator(".sideNav .cityChip")).toContainText("Bodø");
  });
});
