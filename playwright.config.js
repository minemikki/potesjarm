// @ts-check
import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Denne sandboxen har en forhåndsinstallert full Chromium (ikke "headless
// shell") på en revisjon som ikke matcher det denne Playwright-versjonen
// ville lastet ned selv. Bruk den hvis den finnes; ellers la Playwright
// resolve nettleseren som normalt (en vanlig dev-maskin/CI med
// `npx playwright install` kjørt trenger ikke dette).
const SANDBOX_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath = existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined;

/**
 * E2E-tester for Potesjarm.
 *
 * Kjør med: npm run test:e2e (eller npx playwright test)
 *
 * Disse testene dekker ting rene enhetstester ikke kan:
 *  - ekte navigator.geolocation.watchPosition-simulering via Playwrights
 *    context.setGeolocation() (ikke en gjenimplementert mock – samme kode
 *    som kjører i nettleseren i produksjon)
 *  - at onboarding aldri viser et sted som "valgt" før brukeren faktisk
 *    har valgt det
 *  - at en helt tom kommune faktisk viser ærlige tomme tilstander
 */
export default defineConfig({
  testDir: "./e2e",
  // GPS-testene simulerer ekte watchPosition-levering, som kan være treg og
  // ujevn i dette Chromium-oppsettet (se kommentar i gps-tracking.spec.js).
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
