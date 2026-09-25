"use client";

/* =========================================================================
   Dataaksess for `dogs`. Tynn Supabase-spørring; feltmapping i app/lib/mapdb.js.
   { data, error } overalt for ærlige UI-tilstander.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { dogToRow, rowToDog, rowToPublicDog } from "../mapdb.js";

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

/**
 * Oppdagbare hunder i en kommune (ekte data via discover_dogs-RPC, som
 * filtrerer bort egne, ikke-oppdagbare og blokkerte i begge retninger).
 * Henter eiernavn i én ekstra spørring – vi viser aldri en oppdiktet eier.
 */
export async function discoverDogs(municipalityId, kommuneName = "") {
  const sb = getSupabase();
  if (!sb || !municipalityId) return { data: [], error: null };
  const { data: rows, error } = await sb.rpc("discover_dogs", { p_municipality: municipalityId });
  if (error) return { data: [], error };
  if (!rows?.length) return { data: [], error: null };
  const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
  const { data: owners } = await sb.from("profiles").select("id, display_name").in("id", ownerIds);
  const nameById = new Map((owners || []).map((o) => [o.id, o.display_name]));
  const data = rows.map((r) =>
    rowToPublicDog(r, { ownerName: nameById.get(r.owner_id) || "", kommuneName, kommuneId: municipalityId })
  );
  return { data, error: null };
}

/** Hent én hund (annen brukers) med eiernavn. */
export async function getDog(dogId, kommuneName = "", kommuneId = null) {
  const sb = getSupabase();
  if (!sb || !dogId) return { data: null, error: null };
  const { data: row, error } = await sb.from("dogs").select("*").eq("id", dogId).maybeSingle();
  if (error || !row) return { data: null, error };
  const { data: owner } = await sb.from("profiles").select("display_name, municipality_id").eq("id", row.owner_id).maybeSingle();
  return {
    data: rowToPublicDog(row, { ownerName: owner?.display_name || "", kommuneName, kommuneId: kommuneId || owner?.municipality_id || null }),
    error: null,
  };
}

/** Skru av/på oppdagbarhet for egen hund. */
export async function setDiscoverable(dogId, value) {
  const sb = getSupabase();
  if (!sb || !dogId) return { error: new Error("Mangler hund-id") };
  const { error } = await sb.from("dogs").update({ discoverable: !!value, updated_at: new Date().toISOString() }).eq("id", dogId);
  return { error };
}
