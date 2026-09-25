/* =========================================================================
   Lanseringsmodus.

   Mens appen bygges videre (ingen backend ennå), skal potesjarm.no vise en
   ærlig venteliste i stedet for den fungerende, men local-only prototypen.
   Selve appen ligger uendret i koden og fortsetter å bygges – dette er kun
   en bryter for hva rot-siden viser til besøkende.

   Sett WAITLIST_MODE = false for å vise den ekte appen igjen.
   ========================================================================= */
export const WAITLIST_MODE = true;

/**
 * Formspree-endepunkt for ventelisten (https://formspree.io – gratis,
 * ingen backend eller hemmelig nøkkel trengs, kun dette skjema-URL-et).
 * Sett NEXT_PUBLIC_WAITLIST_FORM_URL i Vercel sine Environment Variables.
 * Uten den faller siden ærlig tilbake på en mailto-lenke – vi later ALDRI
 * som en påmelding lyktes uten at den faktisk ble sendt.
 */
export const WAITLIST_FORM_URL = process.env.NEXT_PUBLIC_WAITLIST_FORM_URL || "";
export const WAITLIST_FALLBACK_EMAIL = "hei@potesjarm.no";
