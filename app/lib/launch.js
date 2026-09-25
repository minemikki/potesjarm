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

   Bryteren er MILJØBEVISST via Vercel:
   - Production (potesjarm.no)  -> venteliste PÅ, HARD-LÅST (se under)
   - Preview  (feature-brancher) -> appen PÅ, så vi kan teste den uten å røre
     produksjon
   - Lokalt / ukjent            -> venteliste PÅ (trygg default), men en
     eksplisitt NEXT_PUBLIC_WAITLIST_MODE=off viser appen (e2e-testene bruker
     dette for å nå selve appen).

   HARD-LÅS I PRODUKSJON: appen skal ALDRI vises på root i produksjon mens vi
   fortsatt bygger. Derfor overstyrer produksjon alt annet – selv en (utdatert)
   NEXT_PUBLIC_WAITLIST_MODE=off i Vercel sine Production-variabler kan ikke
   åpne appen på potesjarm.no. Når vi faktisk skal lansere appen, gjøres det
   som en bevisst kodeendring her (fjern låsen / sett WAITLIST_MODE = false),
   ikke ved en miljøvariabel.

   VERCEL_ENV settes automatisk av Vercel ved bygging; vi eksponerer den til
   klienten som NEXT_PUBLIC_VERCEL_ENV i next.config.mjs.
   ========================================================================= */
function computeWaitlistMode() {
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV; // production | preview | development
  // Produksjon er hard-låst til venteliste, uansett override. Se kommentaren over.
  if (vercelEnv === "production") return true;
  const override = process.env.NEXT_PUBLIC_WAITLIST_MODE;
  if (override === "off") return false; // eksplisitt (ikke-produksjon): vis appen
  if (override === "on") return true;   // eksplisitt: vis ventelisten
  if (vercelEnv === "preview" || vercelEnv === "development") return false; // preview viser appen
  return true; // lokalt / ukjent: venteliste (trygt)
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
