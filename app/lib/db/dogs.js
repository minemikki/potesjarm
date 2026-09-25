"use client";

/* =========================================================================
   Dataaksess for `dogs`. Tynn Supabase-spørring; feltmapping i app/lib/mapdb.js.
   { data, error } overalt for ærlige UI-tilstander.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { dogToRow, rowToDog } from "../mapdb.js";

/** Alle hundene den innloggede brukeren eier (kan være tom liste – helt ærlig). */
export async function getMyDogs(ownerId) {
  const sb = getSupabase();
  if (!sb || !ownerId) return { data: [], error: null };
  const { data, error } = await sb
    .from("dogs")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  return { data: (data || []).map((r) => ({ id: r.id, ...rowToDog(r) })), raw: data || [], error };
}

/** Opprett en hund for eieren (RLS krever owner_id = auth.uid()). */
export async function createDog(ownerId, appProfile) {
  const sb = getSupabase();
  if (!sb || !ownerId) return { data: null, error: new Error("Ikke innlogget") };
  const row = { owner_id: ownerId, ...dogToRow(appProfile) };
  if (!row.name) return { data: null, error: new Error("Hunden må ha et navn") };
  const { data, error } = await sb.from("dogs").insert(row).select("*").maybeSingle();
  return { data: data ? { id: data.id, ...rowToDog(data) } : null, error };
}

/** Oppdater en eksisterende hund. */
export async function updateDog(dogId, appProfile) {
  const sb = getSupabase();
  if (!sb || !dogId) return { data: null, error: new Error("Mangler hund-id") };
  const { data, error } = await sb.from("dogs").update(dogToRow(appProfile)).eq("id", dogId).select("*").maybeSingle();
  return { data: data ? { id: data.id, ...rowToDog(data) } : null, error };
}

/** Slett en hund. */
export async function deleteDog(dogId) {
  const sb = getSupabase();
  if (!sb || !dogId) return { error: new Error("Mangler hund-id") };
  const { error } = await sb.from("dogs").delete().eq("id", dogId);
  return { error };
}
