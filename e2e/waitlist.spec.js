// Ventelisten: påmelding, validering, duplikat, UTM/referral og deling.
// RPC-endepunktet rutes i testen (test-sømmen __PJ_WAITLIST_ENDPOINT__), så vi
// sjekker den ekte forespørselen appen sender uten å trenge en database.

import { test, expect } from "@playwright/test";

const EP = "https://waitlist.test/rpc/join_waitlist";

async function open(page, query = "", reply) {
  const calls = [];
  await page.addInitScript((ep) => { window.__PJ_WAITLIST_ENDPOINT__ = ep; }, EP);
  await page.route(EP, async (route) => {
    const body = JSON.parse(route.request().postData() || "{}");
    calls.push(body);
    const r = typeof reply === "function" ? reply(body) : reply;
    await route.fulfill({ status: r.status || 200, contentType: "application/json", body: JSON.stringify(r.body) });
  });
  await page.goto("/venteliste" + query);
  await page.locator(".wlHero").waitFor();
  return calls;
}

async function fill(form, { dog = "Luna", city = "Stavanger", email = "kari@example.no" } = {}) {
  await form.locator("input").nth(0).fill(dog);
  await form.locator("input").nth(1).fill(city);
  await form.locator('input[type="email"]').fill(email);
}

const CREATED = { body: [{ status: "created", referral_code: "abc2345", city: "Stavanger", position: 37, founder: true }] };

test.use({ viewport: { width: 390, height: 844 } });

test("happy path: påmelding viser ekte plass, Founder og invitasjon", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const calls = await open(page, "?utm_source=tiktok&utm_medium=paid&utm_campaign=launch&utm_content=v1&ref=Xyz99", CREATED);

  // Hero + skjema er synlig over bretten på mobil.
  const form = page.locator(".wlHero .wlForm");
  await expect(form.locator(".wlSubmit")).toBeInViewport();
  await fill(form);
  await form.locator(".wlSubmit").click();

  const done = page.locator(".wlHero .wlDone");
  await expect(done).toContainText("Luna er med");
  await expect(done).toContainText("hund #37 i Stavanger");
  await expect(done).toContainText("Founder");

  // Forespørselen har de tre feltene + attribusjon.
  expect(calls).toHaveLength(1);
  const b = calls[0];
  expect(b.p_dog_name).toBe("Luna");
  expect(b.p_city).toBe("Stavanger");
  expect(b.p_email).toBe("kari@example.no");
  expect(b.p_source).toBe("hero");
  expect(b.p_utm_source).toBe("tiktok");
  expect(b.p_utm_medium).toBe("paid");
  expect(b.p_utm_campaign).toBe("launch");
  expect(b.p_utm_content).toBe("v1");
  expect(b.p_ref).toBe("xyz99");
  expect(b.p_landing_path).toContain("utm_source=tiktok");

  // Deling: WhatsApp-lenken bærer egen referral-kode.
  const wa = await done.locator(".wlShareBtn.wa").getAttribute("href");
  expect(decodeURIComponent(wa)).toContain("ref=abc2345");
  expect(errors).toEqual([]);
});

test("kopier lenke legger referral-lenken på utklippstavla", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page, "", CREATED);
  const form = page.locator(".wlHero .wlForm");
  await fill(form);
  await form.locator(".wlSubmit").click();
  await page.locator(".wlHero .wlShareBtn", { hasText: "Kopier lenke" }).click();
  await expect(page.locator(".wlHero .wlShareBtn", { hasText: "Kopiert!" })).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("ref=abc2345");
  expect(clip).toContain("utm_source=referral");
});

test("ugyldig e-post stoppes før noe sendes", async ({ page }) => {
  const calls = await open(page, "", CREATED);
  const form = page.locator(".wlHero .wlForm");
  await fill(form, { email: "kari@" });
  await form.locator(".wlSubmit").click();
  await expect(form.locator(".wlField.bad")).toContainText("Sjekk e-postadressen");
  expect(calls).toHaveLength(0);
});

test("manglende hund og by gir tydelige feilmeldinger", async ({ page }) => {
  const calls = await open(page, "", CREATED);
  const form = page.locator(".wlHero .wlForm");
  await form.locator('input[type="email"]').fill("kari@example.no");
  await form.locator(".wlSubmit").click();
  await expect(form).toContainText("Hva heter hunden?");
  await expect(form).toContainText("Hvilken by bor dere i?");
  expect(calls).toHaveLength(0);
});

test("duplikat: samme e-post får vennlig beskjed, ikke ny plass", async ({ page }) => {
  await open(page, "", { body: [{ status: "duplicate", referral_code: "abc2345", city: "Stavanger", position: 12, founder: true }] });
  const form = page.locator(".wlHero .wlForm");
  await fill(form);
  await form.locator(".wlSubmit").click();
  await expect(page.locator(".wlHero .wlDone")).toContainText("Du er allerede med");
});

test("serverfeil viser ærlig feil – aldri falsk suksess", async ({ page }) => {
  await open(page, "", { status: 500, body: { message: "boom" } });
  const form = page.locator(".wlHero .wlForm");
  await fill(form);
  await form.locator(".wlSubmit").click();
  await expect(form.locator(".wlNote.warn")).toContainText("Noe gikk galt");
  await expect(page.locator(".wlDone")).toHaveCount(0);
});

test("UTM overlever navigasjon/reload før påmelding (første berøring)", async ({ page }) => {
  const calls = await open(page, "?utm_source=instagram&utm_campaign=reels-1", CREATED);
  // Brukeren navigerer bort fra kampanjelenken (ingen parametre lenger).
  await page.goto("/venteliste");
  await page.locator(".wlHero").waitFor();
  const form = page.locator(".wlHero .wlForm");
  await fill(form);
  await form.locator(".wlSubmit").click();
  await expect(page.locator(".wlHero .wlDone")).toBeVisible();
  expect(calls[0].p_utm_source).toBe("instagram");
  expect(calls[0].p_utm_campaign).toBe("reels-1");
});

test("?by= fyller ut byen og viser den i kickeren", async ({ page }) => {
  await open(page, "?by=bergen", CREATED);
  await expect(page.locator(".wlKicker")).toContainText("BERGEN");
  await expect(page.locator(".wlHero .wlForm input").nth(1)).toHaveValue("Bergen");
});

test("desktop: ingen horisontal overflow, forhåndsvisning merket som eksempel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "", CREATED);
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBe(cw);
  await expect(page.locator(".pvBadge").first()).toHaveText("Eksempel");
});
