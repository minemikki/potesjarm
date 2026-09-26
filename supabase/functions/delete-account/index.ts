// =============================================================================
// Potesjarm – Edge Function: delete-account (GDPR full sletting)
//
// delete_my_account()-RPC-en (migrasjon 011) sletter profilraden + alle
// personlige data, men KAN IKKE fjerne selve auth.users-raden (det krever
// service-role). Denne funksjonen lukker det:
//
//   1. Verifiserer brukerens JWT (kun innlogget bruker kan slette seg selv).
//   2. Krever bekreftelsesordet «SLETT» i body.
//   3. Bruker service-role til auth.admin.deleteUser(uid). Fordi
//      profiles.id REFERENCES auth.users(id) ON DELETE CASCADE, cascader dette
//      bort profilen og ALLE personlige data (dogs, walks, walk_points, posts,
//      comments, messages, paw_ledger, streaks, notifications, blocks, follows,
//      meetups, gruppemedlemskap, push_subscriptions).
//
// VIKTIG: SUPABASE_SERVICE_ROLE_KEY finnes KUN i funksjonens miljø, aldri i
// klient-bundlet. Se docs/LAUNCH_RUNBOOK.md for deploy + secrets.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON) return json({ error: "not_configured" }, 500);

  // 1) Verifiser innlogget bruker via deres egen JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "missing_token" }, 401);

  const asUser = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userErr } = await asUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "invalid_token" }, 401);
  const uid = userData.user.id;

  // 2) Krev eksplisitt bekreftelse.
  let confirm = "";
  try { confirm = (await req.json())?.confirm ?? ""; } catch { /* ignore */ }
  if (confirm !== "SLETT") return json({ error: "confirmation_required" }, 400);

  // 3) Service-role: slett auth-brukeren (cascader bort alle personlige data).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) return json({ error: "delete_failed", detail: delErr.message }, 500);

  return json({ deleted: true });
});
