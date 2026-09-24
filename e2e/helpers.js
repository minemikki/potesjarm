// Delte hjelpefunksjoner for e2e-testene.

export const STORAGE_KEY = "potesjarm-v3";

/** Samme tomme startstruktur som EMPTY i app/components/store.js. */
export function seedState(overrides = {}) {
  return {
    mode: "live",
    location: { kommuneId: "stavanger", omrade: null, radiusKm: 10 },
    onboarded: true,
    profile: { dogName: "Bamse", ownerName: "Kari", breed: "Blandingshund", age: "2 år", size: "", energy: "", play: [], photo: null },
    walks: [],
    streak: 0,
    paws: 0,
    placesVisited: [],
    liked: {},
    saved: {},
    going: {},
    joinedGroups: {},
    followed: {},
    eventGoing: {},
    savedPlaces: {},
    verifiedPlaces: {},
    myMeetups: [],
    myPosts: [],
    myEvents: [],
    invitesActivated: 0,
    lostDogActive: false,
    verified: false,
    privacy: true,
    push: true,
    ...overrides,
  };
}

// Eksterne bilder (Unsplash) er ren dekor og ikke relevante for det disse
// testene sjekker. Vi blokkerer dem i stedet for å vente på nettverket –
// raskere tester, og ingen avhengighet av at bildehotellet er nåbart.
async function blockRemoteImages(page) {
  await page.route("https://images.unsplash.com/**", (route) => route.abort());
}

/** Naviger til appen med en ferdig onboardet bruker i localStorage. */
export async function gotoSeeded(page, overrides = {}) {
  await blockRemoteImages(page);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(seedState(overrides))]
  );
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".app").waitFor();
}

/** Naviger til appen som en helt ny, ikke-onboardet bruker (tom localStorage). */
export async function gotoFresh(page) {
  await blockRemoteImages(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator(".onboarding").waitFor();
}

export function readState(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), STORAGE_KEY);
}
