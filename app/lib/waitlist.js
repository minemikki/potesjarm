/* =========================================================================
   Påmelding til ventelista.

   1) Supabase-RPC join_waitlist (migrasjon 008) – ekte plass i byen,
      duplikatsjekk, referral og UTM. Kalles med ren fetch mot REST-API-et,
      så landingssiden slipper å laste hele Supabase-klienten.
   2) Hvis RPC-en ikke finnes/ikke er satt opp: Formspree (hvis konfigurert).
   3) Ellers: ærlig feil + mailto. Vi later ALDRI som en påmelding lyktes.
   ========================================================================= */

import { WAITLIST_FORM_URL } from "./launch.js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function endpoint() {
  // Test-søm: e2e kan peke på et falskt endepunkt og rute det.
  if (typeof window !== "undefined" && window.__PJ_WAITLIST_ENDPOINT__) return window.__PJ_WAITLIST_ENDPOINT__;
  return SB_URL ? `${SB_URL.replace(/\/$/, "")}/rest/v1/rpc/join_waitlist` : "";
}

/** Oversett en RPC-feil til noe UI-et kan si. */
export function errorKind(body) {
  const msg = `${body?.message || ""} ${body?.code || ""}`;
  if (/invalid_email/.test(msg)) return "invalid_email";
  if (/invalid_dog/.test(msg)) return "invalid_dog";
  if (/invalid_city/.test(msg)) return "invalid_city";
  if (/PGRST202|does not exist|Could not find the function/i.test(msg)) return "missing";
  return "error";
}

/**
 * @returns {Promise<{status:'created'|'duplicate'|'sent'|'invalid_email'|'invalid_dog'|'invalid_city'|'error', code?:string, city?:string, position?:number, founder?:boolean}>}
 *   'sent' = levert via Formspree (ingen plass/kode tilgjengelig).
 */
export async function joinWaitlist({ email, dogName, city, source, attribution = {} }) {
  const url = endpoint();
  const utm = attribution.utm || {};
  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
        body: JSON.stringify({
          p_email: email.trim(),
          p_dog_name: dogName.trim(),
          p_city: city.trim(),
          p_ref: attribution.ref || null,
          p_source: source || null,
          p_utm_source: utm.utm_source || null,
          p_utm_medium: utm.utm_medium || null,
          p_utm_campaign: utm.utm_campaign || null,
          p_utm_content: utm.utm_content || null,
          p_referrer: attribution.referrer || null,
          p_landing_path: attribution.landingPath || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (res.ok) {
        const row = Array.isArray(body) ? body[0] : body;
        if (row?.status) {
          return { status: row.status, code: row.referral_code, city: row.city, position: row.position, founder: !!row.founder };
        }
      } else {
        const kind = errorKind(body);
        if (kind !== "missing" && kind !== "error") return { status: kind };
        if (kind === "error" && !WAITLIST_FORM_URL) return { status: "error" };
      }
    } catch {
      // Nettverksfeil: prøv reserveløsningen under.
    }
  }

  if (WAITLIST_FORM_URL) {
    try {
      const res = await fetch(WAITLIST_FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), hund: dogName.trim(), by: city.trim(), kilde: source, ...utm, ref: attribution.ref || "" }),
      });
      if (res.ok) return { status: "sent" };
    } catch {}
  }
  return { status: "error" };
}
