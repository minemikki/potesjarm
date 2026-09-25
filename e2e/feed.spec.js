// Feed-flyt ende-til-ende mot produksjonskoden (demo-modus): lag et innlegg,
// se det i feeden, lik det, lagre det og kommenter. Dette er demo-regresjonen
// for Sprint 6 – de ekte backend-flytene (Supabase) dekkes av RPC-/enhetslaget,
// siden e2e-serveren kjører uten Supabase-nøkler (lokal/demo-modus).

import { test, expect } from "@playwright/test";
import { gotoSeeded } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 } });

const STAVANGER = { kommuneId: "stavanger", omrade: null, radiusKm: 25 };

test.describe("Feed (demo)", () => {
  test("lag innlegg, se det i feeden, lik og lagre", async ({ page }) => {
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });

    // Åpne innleggskomponisten via «Del en historie».
    await page.locator(".story.add").click();
    const composer = page.locator(".composer");
    await expect(composer).toBeVisible();

    const unik = "Testtur i skogen " + Date.now();
    await composer.locator("textarea").fill(unik);
    await composer.locator(".pillBtn", { hasText: "Publiser" }).click();

    // Innlegget dukker opp i feeden med teksten min.
    const post = page.locator(".post", { hasText: unik });
    await expect(post).toBeVisible();

    // Lik: hjerteknappen blir markert (aria-pressed).
    const likeBtn = post.locator(".postActions .act").first();
    await likeBtn.click();
    await expect(likeBtn).toHaveAttribute("aria-pressed", "true");
    // Av igjen.
    await likeBtn.click();
    await expect(likeBtn).toHaveAttribute("aria-pressed", "false");

    // Lagre: bokmerkeknappen får .saved.
    const saveBtn = post.locator(".postActions .act.save");
    await saveBtn.click();
    await expect(saveBtn).toHaveClass(/saved/);
  });

  test("kommenter på et innlegg", async ({ page }) => {
    await gotoSeeded(page, { mode: "demo", location: STAVANGER });

    await page.locator(".story.add").click();
    const unik = "Innlegg for kommentar " + Date.now();
    await page.locator(".composer textarea").fill(unik);
    await page.locator(".composer .pillBtn", { hasText: "Publiser" }).click();

    const post = page.locator(".post", { hasText: unik });
    await expect(post).toBeVisible();

    // Åpne kommentarer (andre knapp i handlingsraden) og skriv en kommentar.
    await post.locator(".postActions .act").nth(1).click();
    const box = page.locator(".commentsBox");
    await expect(box).toBeVisible();
    await expect(box.locator(".muted")).toBeVisible(); // ærlig tom tilstand
    await box.locator("input").fill("Så fin tur!");
    await box.locator(".sendBtn").click();
    await expect(box.locator(".comment", { hasText: "Så fin tur!" })).toBeVisible();
  });
});
