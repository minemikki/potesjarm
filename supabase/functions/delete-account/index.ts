// =============================================================================
// Potesjarm – Edge Function: delete-account (GDPR full sletting)
//
// delete_my_account()-RPC-en (migrasjon 011) sletter profilraden + alle
// personlige data, men KAN IKKE fjerne selve auth.users-raden (det krever en
// hemmelig/service-nøkkel). Denne funksjonen lukker det:
//
//   1. Verifiserer brukerens JWT (kun innlogget bruker kan slette seg selv).
//   2. Krever bekreftelsesordet «SLETT» i body.
//   3. Bruker den hemmelige nøkkelen til auth.admin.deleteUser(uid). Fordi
//      profiles.id REFERENCES auth.users(id) ON DELETE CASCADE, cascader dette
//      bort profilen og ALLE personlige data (dogs, walks, walk_points, posts,
//      comments, messages, paw_ledger, streaks, notifications, blocks, follows,
//      meetups, gruppemedlemskap, push_subscriptions).
//
// NØKLER: hosted Supabase Edge Functions injiserer nøklene automatisk – ingen
// `supabase secrets set` er nødvendig. Vi bruker de nye nøkkelsettene
// (SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS, hver et JSON-objekt med
// en "default"-nøkkel) og faller kun tilbake på de gamle
// SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY-navnene for lokal/dev-kjøring
// der de nye settene ikke er tilgjengelige. Den hemmelige nøkkelen forlater
// ALDRI denne funksjonens miljø – den logges aldri og sendes aldri i noe svar.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Parse et JSON-nøkkelsett (`{"default": "...", ...}`) trygt; tomt objekt ved feil/mangel. */
function parseKeySet(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

  // Nye, auto-injiserte nøkkelsett (foretrukket på hosted Supabase).
  const publishableKeys = parseKeySet(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  const secretKeys = parseKeySet(Deno.env.get("SUPABASE_SECRET_KEYS"));

  // Legacy-navn kun som fallback (lokal/dev, eller eldre prosjekter uten de nye settene).
  const PUBLISHABLE_KEY = publishableKeys.default ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SECRET_KEY = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SECRET_KEY) return json({ error: "not_configured" }, 500);

  // 1) Verifiser innlogget bruker via deres egen JWT (publishable/anon-nøkkel).
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "missing_token" }, 401);

  const asUser = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "invalid_token" }, 401);
  const uid = userData.user.id;

  // 2) Krev eksplisitt bekreftelse.
  let confirm = "";
  try { confirm = (await req.json())?.confirm ?? ""; } catch { /* ignore */ }
  if (confirm !== "SLETT") return json({ error: "confirmation_required" }, 400);

  // 3) Hemmelig nøkkel: slett auth-brukeren (cascader bort alle personlige data).
  //    SECRET_KEY brukes kun her, aldri logget eller sendt i noe svar.
  const admin = createClient(SUPABASE_URL, SECRET_KEY, { auth: { persistSession: false } });
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return json({ error: "delete_failed", detail: delErr.message }, 500);

  return json({ deleted: true });
});
