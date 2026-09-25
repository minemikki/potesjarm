/* =========================================================================
   Lanseringsmodus.

   Mens appen bygges videre (ingen backend ennå), skal potesjarm.no vise en
   ærlig venteliste i stedet for den fungerende, men local-only prototypen.
   Selve appen ligger uendret i koden og fortsetter å bygges – dette er kun
   en bryter for hva rot-siden viser til besøkende.

   Sett WAITLIST_MODE = false for å vise den ekte appen igjen.

   Kan overstyres eksplisitt ved bygging med miljøvariabelen
   NEXT_PUBLIC_WAITLIST_MODE = "off" (viser appen) eller "on" (viser
   ventelisten) – e2e-testene bruker "off" for å nå selve appen.

   Uten en eksplisitt override er bryteren MILJØBEVISST via Vercel:
   - Production (potesjarm.no)  -> venteliste PÅ
   - Preview  (feature-brancher) -> appen PÅ, så vi kan teste den uten å røre
     produksjon
   - Lokalt / ukjent            -> venteliste PÅ (trygg default)

   VERCEL_ENV settes automatisk av Vercel ved bygging; vi eksponerer den til
   klienten som NEXT_PUBLIC_VERCEL_ENV i next.config.mjs.
   ========================================================================= */
function computeWaitlistMode() {
  const override = process.env.NEXT_PUBLIC_WAITLIST_MODE;
  if (override === "off") return false; // eksplisitt: vis appen
  if (override === "on") return true;   // eksplisitt: vis ventelisten
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV; // production | preview | development
  if (vercelEnv === "preview" || vercelEnv === "development") return false; // preview viser appen
  return true; // production og alt ukjent: venteliste (trygt)
}

export const WAITLIST_MODE = computeWaitlistMode();

/**
 * Formspree-endepunkt for ventelisten (https://formspree.io – gratis,
 * ingen backend eller hemmelig nøkkel trengs, kun dette skjema-URL-et).
 * Sett NEXT_PUBLIC_WAITLIST_FORM_URL i Vercel sine Environment Variables.
 * Uten den faller siden ærlig tilbake på en mailto-lenke – vi later ALDRI
 * som en påmelding lyktes uten at den faktisk ble sendt.
 */
export const WAITLIST_FORM_URL = process.env.NEXT_PUBLIC_WAITLIST_FORM_URL || "";
export const WAITLIST_FALLBACK_EMAIL = "hei@potesjarm.no";
