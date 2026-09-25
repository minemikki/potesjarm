"use client";

/* =========================================================================
   Dataaksess for `profiles`. Tynn Supabase-spørring; all feltmapping bor i
   app/lib/mapdb.js (som er enhetstestet). Alle funksjoner returnerer
   { data, error } slik at UI kan vise ærlige tilstander – vi later aldri som
   noe lyktes hvis det ikke gjorde det.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { profileToRow, rowToProfile } from "../mapdb.js";

/** Hent den innloggede brukerens profil (eller null hvis den ikke finnes ennå). */
export async function getMyProfile(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return { data: null, error: null };
  const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  return { data: data ? rowToProfile(data) : null, raw: data || null, error };
}

/**
 * Opprett/oppdater egen profil. `id` = auth-bruker-id (RLS krever at id = auth.uid()).
 * Setter last_active_at slik at «aktiv nå» er ekte og ikke gjettet.
 */
export async function upsertMyProfile(userId, appProfile, location) {
  const sb = getSupabase();
  if (!sb || !userId) return { data: null, error: new Error("Ikke innlogget") };
  const row = { id: userId, ...profileToRow(appProfile, location), last_active_at: new Date().toISOString() };
  const { data, error } = await sb.from("profiles").upsert(row).select("*").maybeSingle();
  return { data: data ? rowToProfile(data) : null, raw: data || null, error };
}

/**
 * Sletter brukerens egne data (profil-raden, som kaskaderer til hunder, treff
 * osv. via ON DELETE CASCADE) og logger ut. Å fjerne selve auth-brukeren
 * krever service-role og gjøres med en Supabase Edge Function – se
 * supabase/SETUP.md. Vi lover derfor bare det vi faktisk kan gjøre her.
 */
export async function deleteMyData(userId) {
  const sb = getSupabase();
  if (!sb || !userId) return { error: new Error("Ikke innlogget") };
  const { error } = await sb.from("profiles").delete().eq("id", userId);
  if (error) return { error };
  await sb.auth.signOut();
  return { error: null };
}
