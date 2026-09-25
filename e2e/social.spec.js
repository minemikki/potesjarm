// Sosiale flyter ende-til-ende mot produksjonskoden: treff-detalj, bli med /
// meld av (deltakerlista oppdateres med en gang), hundeprofil med følge vs
// hundevenn, og at ødelagte bilder faller tilbake på en merkevareplassholder.

import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

// Disse flytene testes på mobil (bunn-navigasjonen finnes bare der).
test.use({ viewport: { width: 390, height: 844 } });

const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };

async function openNaaSkjer(page) {
  await page.locator(".bottomNav button", { hasText: "Nå skjer" }).click();
}

test.describe("Treff-detalj og bli med / meld av", () => {
  test("åpne et treff, bli med, og se deltakerlista og knappen oppdateres", async ({ page }) => {
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });
    await openNaaSkjer(page);

    // Åpne første treff som ikke er mitt eget.
    const card = page.locator(".meetup", { has: page.locator(".pillBtn", { hasText: "Bli med" }) }).first();
    await card.locator(".meetupMain").click();

    const detail = page.locator(".detail");
    await expect(detail).toBeVisible();
    const attendees = detail.locator(".whoGoing > span:not(.openSpot)");
    const before = await attendees.count();

    await detail.locator(".detailFoot .pillBtn", { hasText: "Bli med" }).click();
    // Knappen blir "Du er med" og deltakerlista vokser med én (deg).
    await expect(detail.locator(".detailFoot .pillBtn", { hasText: "Du er med" })).toBeVisible();
    await expect(attendees).toHaveCount(before + 1);

    // Meld av igjen – lista krymper tilbake.
    await detail.locator(".detailFoot .pillBtn", { hasText: "Du er med" }).click();
    await expect(detail.locator(".detailFoot .pillBtn", { hasText: "Bli med" })).toBeVisible();
    await expect(attendees).toHaveCount(before);
  });

  test("treff-chat er tilgjengelig når du er med, med ærlig tom tilstand", async ({ page }) => {
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });
    await openNaaSkjer(page);
    const card = page.locator(".meetup", { has: page.locator(".pillBtn", { hasText: "Bli med" }) }).first();
    await card.locator(".meetupMain").click();
    await page.locator(".detail .detailFoot .pillBtn", { hasText: "Bli med" }).click();

    await page.locator(".detail .rowBtn", { hasText: "Åpne chatten" }).click();
    await expect(page.locator(".chatBox")).toBeVisible();
    await expect(page.locator(".chatBody")).toContainText("Start samtalen");
  });
});

test.describe("Hundeprofil: følge vs hundevenn", () => {
  test("følge er énveis; hundevenn blir 'sendt', aldri automatisk godtatt", async ({ page }) => {
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });
    await page.locator(".bottomNav button", { hasText: "Mer" }).click();
    await page.locator(".moreRow", { hasText: "Hunder" }).click();
    await page.locator(".dogGrid").waitFor();

    await page.locator(".matchSpot").click();
    const p = page.locator(".dogProfile");
    await expect(p).toBeVisible();
    // Ingen oppdiktet matchprosent – vi viser forklarbare fellestrekk.
    await expect(p).not.toContainText("%");
    await expect(p.locator(".matchList li").first()).toBeVisible();

    // Følg (énveis)
    await p.locator(".iconAction", { hasText: "Følg" }).click();
    await expect(p.locator(".iconAction", { hasText: "Følger" })).toBeVisible();

    // Hundevenn: blir "Sendt" (pending), aldri "Hundevenn" (godtatt) lokalt.
    await p.locator(".iconAction", { hasText: "Hundevenn" }).click();
    await expect(p.locator(".iconAction", { hasText: "Sendt" })).toBeVisible();
    await expect(p.locator(".iconAction.on", { hasText: "Hundevenn" })).toHaveCount(0);
  });
});

test.describe("Robuste bilder", () => {
  test("et bilde som ikke laster faller tilbake på en poteplassholder, ikke et ødelagt ikon", async ({ page }) => {
    // Blokker alle Unsplash-bilder for å tvinge fram feiltilstanden.
    await page.route("https://images.unsplash.com/**", (r) => r.abort());
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });
    // Feeden har innlegg med bilde; fallback-elementet skal vises.
    await expect(page.locator(".imgFallback").first()).toBeVisible();
  });
});
