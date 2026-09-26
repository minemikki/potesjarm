"use client";

/* =========================================================================
   Personvern / moderering / GDPR – Sprint 10.

   Tynne kall mot de sikre RPC-ene i migrasjon 011. Rapport, dataeksport og
   kontosletting er alle authenticated-only og server-styrt.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";

/** Rapporter en entitet. reason ∈ spam|harassment|unsafe|inappropriate|fake|other. */
export async function submitReport({ targetTable, targetId, reason, details = null }) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("submit_report", {
    p_target_table: targetTable, p_target_id: targetId, p_reason: reason, p_details: details,
  });
  return { data: data || null, error };
}

/** Sett/opphev leaderboard-samtykke for en hund (eksplisitt opt-in, default av). */
export async function setLeaderboardOptIn(dogId, on) {
  const sb = getSupabase();
  if (!sb || !dogId) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.from("dogs").update({ show_on_leaderboard: !!on }).eq("id", dogId);
  return { error };
}

/** Last ned alle mine data (GDPR). Returnerer et jsonb-objekt med kun egne data. */
export async function exportMyData() {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("export_my_data");
  return { data: data || null, error };
}

/** Slett konto (GDPR). Krever bekreftelsesordet «SLETT». Cascader bort alt personlig. */
export async function deleteMyAccount(confirm) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("delete_my_account", { p_confirm: confirm });
  return { data: data || null, error };
}
