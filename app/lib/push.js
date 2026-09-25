"use client";

/* =========================================================================
   Web-push – fundament, ærlig om hva som faktisk virker.

   Vi later ALDRI som push er på hvis det ikke er det. Ekte utsending av
   web-push krever en VAPID-nøkkel + en service worker + et server-endepunkt
   (Edge Function) som faktisk sender – det bygges i et senere steg. Her
   rapporterer vi bare nøkternt hva nettleseren/oppsettet støtter, slik at UI
   kan vise «In-app varsler er på» og en ærlig status for pushvarsler.

   In-app varsler (Realtime) virker uansett – de er ikke avhengige av dette.
   ========================================================================= */

// Settes når ekte push kobles på (server + Edge Function). Uten den kan vi
// ikke abonnere på en meningsfull måte, og sier det rett ut.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/** Nettleserstøtte for web-push i det hele tatt. */
export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

/** Er ekte push konfigurert (VAPID-nøkkel finnes)? */
export function isPushConfigured() {
  return !!VAPID_PUBLIC_KEY;
}

/**
 * Ærlig samlet status som UI kan vise direkte:
 *  - 'unsupported'  : nettleseren støtter ikke push
 *  - 'unconfigured' : støttet, men serveren/VAPID er ikke satt opp ennå
 *  - 'denied'       : brukeren har blokkert varsler i nettleseren
 *  - 'granted'      : tillatelse gitt (klar til å abonnere når konfigurert)
 *  - 'default'      : ikke spurt ennå
 */
export function pushStatus() {
  if (!isPushSupported()) return "unsupported";
  if (!isPushConfigured()) return "unconfigured";
  const perm = typeof Notification !== "undefined" ? Notification.permission : "default";
  return perm; // 'default' | 'granted' | 'denied'
}

/** Menneskelig, ærlig tekst for statusen. */
export function pushStatusText(status = pushStatus()) {
  switch (status) {
    case "unsupported": return "Nettleseren din støtter ikke pushvarsler.";
    case "unconfigured": return "Pushvarsler kommer snart. In-app varsler er allerede på.";
    case "denied": return "Du har blokkert varsler i nettleseren. Skru på i nettleserinnstillingene.";
    case "granted": return "Pushvarsler er tillatt.";
    default: return "Slå på pushvarsler for å få beskjed også når appen er lukket.";
  }
}

/**
 * Ber om push-tillatelse OG abonnerer – men kun hvis alt faktisk er på plass.
 * Returnerer { ok, reason?, subscription? }. Vi abonnerer aldri «på liksom».
 */
export async function enablePush() {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!isPushConfigured()) return { ok: false, reason: "unconfigured" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: perm === "denied" ? "denied" : "default" };
  // Når serveren/SW er klar, registreres service worker og pushManager.subscribe
  // her med VAPID_PUBLIC_KEY, og subscription-nøklene returneres for lagring.
  return { ok: false, reason: "unconfigured" };
}
