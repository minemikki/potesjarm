"use client";

/* =========================================================================
   Dataaksess for steder (places) og kart-treff – Sprint 8.

   Tynne kall mot de sikre RPC-ene i migrasjon 009 (places_in_area,
   place_detail, map_meetups, suggest_place). All feltmapping ligger i
   app/lib/mapdb.js. { data, error } overalt – en tom liste betyr faktisk
   ingen steder/treff, ikke en skjult feil. UI-komponentene gjør ALDRI
   Supabase-spørringer direkte; de går via dette repositoryet.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { rowToPlace, rowToMapMeetup } from "../mapdb.js";

/**
 * Godkjente steder i et område. Gi enten kommune, region (fylke) eller et
 * klientpunkt + radius. distance_km fylles kun når punkt er oppgitt.
 */
export async function listPlaces({ municipalityId = null, region = null, lat = null, lng = null, radiusKm = null, category = null, limit = 200 } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("places_in_area", {
    p_municipality: municipalityId,
    p_region: region,
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_category: category,
    p_limit: limit,
  });
  if (error) return { data: [], error };
  return { data: (data || []).map(rowToPlace), error: null };
}

/** Ett sted i detalj (med ekte antall kommende treff). */
export async function getPlace(placeId) {
  const sb = getSupabase();
  if (!sb || !placeId) return { data: null, error: null };
  const { data, error } = await sb.rpc("place_detail", { p_place_id: placeId });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ? rowToPlace(row) : null, error: null };
}

/**
 * Enkelt stedssøk (navn/kategori) innenfor kommune eller region. Vi henter
 * områdets godkjente steder og filtrerer på klienten – nok for en by/kommune,
 * ingen ekstern geokoder eller hemmelige nøkler involvert.
 */
export async function searchPlaces(query, { municipalityId = null, region = null, limit = 12 } = {}) {
  const { data, error } = await listPlaces({ municipalityId, region, limit: 200 });
  if (error) return { data: [], error };
  const q = (query || "").trim().toLowerCase();
  const hits = q ? data.filter((p) => p.name.toLowerCase().includes(q) || (p.type || "").toLowerCase().includes(q)) : data;
  return { data: hits.slice(0, limit), error: null };
}

/** Steder nær et punkt (radius i km). Tynn innpakning rundt listPlaces. */
export async function getNearby({ lat, lng, radiusKm = 10, municipalityId = null, category = null, limit = 200 } = {}) {
  return listPlaces({ lat, lng, radiusKm, municipalityId, category, limit });
}

/**
 * Aktive treff for kartet. RPC-en filtrerer bort blokkerte verter og
 * gruppetreff man ikke er medlem av, og gir ekte deltakertall.
 */
export async function listMapMeetups({ municipalityId = null, lat = null, lng = null, radiusKm = null, limit = 200 } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("map_meetups", {
    p_municipality: municipalityId,
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_limit: limit,
  });
  if (error) return { data: [], error };
  const now = new Date();
  return { data: (data || []).map((r) => rowToMapMeetup(r, now)), error: null };
}

/**
 * Foreslå et nytt sted (autentisert). Server setter created_by, source='user',
 * status='pending' og region. Returnerer { id, status } – status er alltid
 * 'pending' til en moderator godkjenner. Vi later ALDRI som det er publisert.
 */
export async function createPlaceSuggestion({ name, category, lat, lng, municipalityId, description = null } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("suggest_place", {
    p_name: name,
    p_category: category,
    p_lat: lat,
    p_lng: lng,
    p_municipality: municipalityId,
    p_description: description,
  });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error: null };
}
