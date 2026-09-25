// Ekte GPS-sporing, testet mot den faktiske produksjonskoden.
//
// Playwrights context.setGeolocation() driver den ekte
// navigator.geolocation.watchPosition() i Chromium – dette er IKKE en
// reimplementert mock av vår logikk, det er samme kode som kjører i
// nettleseren i produksjon, matet med simulerte GPS-punkter.
//
// Viktig miljødetalj: Chromiums mockede watchPosition her leverer IKKE
// ett oppdatert punkt umiddelbart for hvert setGeolocation()-kall – det kan
// ta noen sekunder. Testene styrer derfor selv en minimumsavstand i tid
// mellom hvert simulerte GPS-punkt (>= STEP_INTERVAL_MS) OG venter på at
// UI-et faktisk har registrert punktet (poll på "GPS-punkter"-telleren),
// i stedet for å anta en fast leveringstid.

import { test, expect } from "@playwright/test";
import { gotoSeeded, readState, pawsTotal } from "./helpers.js";

const BASE = { latitude: 58.97, longitude: 5.733 }; // Stavanger sentrum-ish
const GOOD_ACCURACY = 8;
const POOR_ACCURACY = 300; // over MAX_ACCURACY_M (30)
const STEP_M = 15; // per steg: 15 m / 3 s = 5 m/s, trygt under MAX_SPEED_MPS (7)
const STEP_INTERVAL_MS = 3000;

function metersNorth(m, from = BASE) {
  return { ...from, latitude: from.latitude + m / 111320 };
}

async function startWalk(page) {
  await page.locator(".hero2 .pillBtn, .rail2.streak .pillBtn", { hasText: "Start" }).first().click();
  await expect(page.locator(".walkMode")).toBeVisible();
}

function pointsAcceptedLocator(page) {
  return page.locator(".walkStats span", { hasText: "GPS-punkter" }).locator("b");
}

async function currentPointsAccepted(page) {
  return Number(await pointsAcceptedLocator(page).innerText());
}

/** Vent til antall godkjente GPS-punkter er minst `min`. */
async function waitForAccepted(page, min, timeout = 25000) {
  await expect
    .poll(async () => currentPointsAccepted(page), { timeout, intervals: [500, 1000] })
    .toBeGreaterThanOrEqual(min);
}

/**
 * Simulerer `steps` realistiske gangesteg nordover, med minst
 * STEP_INTERVAL_MS mellom hvert – nok til at ingen av dem kan mistolkes
 * som et GPS-hopp – og venter på at hvert enkelt faktisk godkjennes.
 */
async function walkSteps(page, context, steps, fromPos = { ...BASE }) {
  let pos = fromPos;
  let target = await currentPointsAccepted(page);
  for (let i = 0; i < steps; i++) {
    await page.waitForTimeout(STEP_INTERVAL_MS);
    pos = metersNorth(STEP_M, pos);
    await context.setGeolocation({ ...pos, accuracy: GOOD_ACCURACY });
    target += 1;
    await waitForAccepted(page, target, 30000);
  }
  return pos;
}

test.describe("GPS-turtracking", () => {
  test("stillestående => 0,00 km, uansett hvor mange GPS-fix som kommer inn", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...BASE, accuracy: GOOD_ACCURACY });
    await gotoSeeded(page);
    await startWalk(page);

    // Flere "fix" på nøyaktig samme koordinat over god tid, som en telefon
    // i ro faktisk gir (GPS-støy, ikke bevegelse).
    for (let i = 0; i < 4; i++) {
      await context.setGeolocation({ ...BASE, accuracy: GOOD_ACCURACY });
      await page.waitForTimeout(3000);
    }

    await expect(page.locator(".walkKm")).toContainText("0,00");
    // Anker-punktet kan være godkjent (distanse 0), men aldri mer enn ett.
    expect(await currentPointsAccepted(page)).toBeLessThanOrEqual(1);

    // Avslutter en tom tur: skal IKKE åpne feiringsmodalen, ingenting lagres.
    await page.locator(".walkMode >> text=Avslutt tur").click();
    await expect(page.locator(".walkDone")).toHaveCount(0);
    const state = await readState(page);
    expect(state.walks.length).toBe(0);
    expect(state.streak).toBe(0);
    expect(pawsTotal(state)).toBe(0);
  });

  test("dårlig GPS-nøyaktighet => ingen distanse, tydelig statustekst", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...BASE, accuracy: POOR_ACCURACY });
    await gotoSeeded(page);
    await startWalk(page);

    for (let i = 0; i < 3; i++) {
      // Selv om posisjonen "beveger" seg, skal dårlig nøyaktighet forkaste alt.
      await context.setGeolocation({ ...metersNorth(30 * (i + 1)), accuracy: POOR_ACCURACY });
      await page.waitForTimeout(3000);
    }

    await expect(page.locator(".walkKm")).toContainText("0,00");
    expect(await currentPointsAccepted(page)).toBe(0);
    await expect(page.locator(".walkStatusLine")).toContainText(/Venter på GPS|Lav GPS-nøyaktighet/);
  });

  test("stort GPS-hopp forkastes og påvirker ikke distansen", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...BASE, accuracy: GOOD_ACCURACY });
    await gotoSeeded(page);
    await startWalk(page);

    // Litt ekte, tydelig bevegelse først.
    const pos = await walkSteps(page, context, 2);

    const before = await page.locator(".walkKm").innerText();
    expect(before).not.toContain("0,00");
    const pointsBefore = await currentPointsAccepted(page);

    // Et umulig hopp 20 km unna, praktisk talt momentant.
    await page.waitForTimeout(STEP_INTERVAL_MS);
    await context.setGeolocation({ ...metersNorth(20000, pos), accuracy: GOOD_ACCURACY });
    // Gi det god tid til å bli levert og vurdert – det skal likevel forkastes,
    // så antall godkjente punkter skal IKKE øke og distansen skal stå stille.
    await page.waitForTimeout(8000);

    const after = await page.locator(".walkKm").innerText();
    expect(after).toBe(before);
    expect(await currentPointsAccepted(page)).toBe(pointsBefore);
  });

  test("normal gange øker distansen, og en gyldig tur gir ekte belønning", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...BASE, accuracy: GOOD_ACCURACY });
    await gotoSeeded(page);
    await startWalk(page);

    // 5 steg à 15 m => 75 m, trygt over MIN_VALID_WALK_M (50 m) selv om ett
    // steg skulle utebli.
    await walkSteps(page, context, 5);

    const km = await page.locator(".walkKm").innerText();
    expect(km).not.toContain("0,00");

    await page.locator(".walkMode >> text=Avslutt tur").click();
    await expect(page.locator(".walkDone")).toBeVisible({ timeout: 10000 });
    await expect(page.locator(".walkDone")).toContainText("Første tur i boks!");

    const state = await readState(page);
    expect(state.walks.length).toBe(1);
    expect(state.walks[0].meters).toBeGreaterThanOrEqual(50);
    expect(state.streak).toBe(1);
    expect(pawsTotal(state)).toBeGreaterThan(0);
    // Poter skal samsvare eksakt med faktisk distanse
    // (PAWS.perKm=100/km + PAWS.walkCompleted=20 + PAWS.streakDay=10, se app/lib/data.js).
    expect(pawsTotal(state)).toBe(Math.round((state.walks[0].meters / 1000) * 100) + 20 + 10);
  });

  test("uten posisjonstilgang: appen venter ærlig, later ALDRI som om noen bevegelse skjer", async ({ page }) => {
    // Denne Chromium-oppsettet løser aldri en ubesvart geolocation-forespørsel
    // til et eksplisitt "nektet" i automatisert kjøring (ingen ekte
    // brukerprompt å svare på) – den blir stående i "venter". Det er en
    // realistisk tilstand (appen venter faktisk på at brukeren skal svare på
    // nettleserens prompt), og det som betyr noe for produktet – at INGEN
    // distanse noensinne diktes opp mens vi venter – gjelder uansett.
    // (app.js sin permission_denied-gren er defensivt kodet og bruker samme
    // feilhåndteringssti som signal_lost, men lar seg ikke fremtvinge her.)
    await gotoSeeded(page);
    await startWalk(page);

    await page.waitForTimeout(6000);
    await expect(page.locator(".walkKm")).toContainText("0,00");
    await expect(page.locator(".walkStatusLine")).toContainText("Venter på GPS");
    expect(await currentPointsAccepted(page)).toBe(0);

    await page.locator(".walkMode >> text=Avslutt tur").click();
    const state = await readState(page);
    expect(state.walks.length).toBe(0);
    expect(pawsTotal(state)).toBe(0);
  });

  test("en for kort, ugyldig tur gir aldri dobbel eller falsk belønning ved neste forsøk", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ ...BASE, accuracy: GOOD_ACCURACY });
    await gotoSeeded(page);

    // Forsøk 1: gyldig tur.
    await startWalk(page);
    await walkSteps(page, context, 5);
    await page.locator(".walkMode >> text=Avslutt tur").click();
    await expect(page.locator(".walkDone")).toBeVisible({ timeout: 10000 });
    await page.locator(".walkDone .closeBtn").click();

    let state = await readState(page);
    expect(state.walks.length).toBe(1);
    const pawsAfterFirst = pawsTotal(state);

    // Forsøk 2: start på nytt, avslutt umiddelbart uten bevegelse.
    await startWalk(page);
    await page.locator(".walkMode >> text=Avslutt tur").click();
    await expect(page.locator(".walkDone")).toHaveCount(0);

    state = await readState(page);
    expect(state.walks.length).toBe(1); // uendret – ingen ny rad
    expect(pawsTotal(state)).toBe(pawsAfterFirst); // ingen ekstra poter
  });
});
