"use client";

/* =========================================================================
   Dataaksess for aktivitet + gamification – Sprint 9.

   Tynne kall mot de sikre, idempotente RPC-ene i migrasjon 010. Serveren er
   sannheten for turer, poter, streak, challenges og merker – klienten sender
   aldri fremgang. { data, error } overalt; vi later aldri som noe lyktes.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";

/**
 * Fullfør en tur idempotent. `clientKey` gjør retry/dobbeltklikk/refresh trygt
 * – samme nøkkel gir aldri to turer eller doble poter. Serveren beregner
 * gyldighet, poter, streak, challenge-fremgang og merker og returnerer hva som
 * faktisk ble oppnådd.
 */
export async function completeWalk({ clientKey, dogId = null, startedAt, endedAt, distanceM, durationS, movingS, gpsQuality = null, flagged = false, elevationM = null, placeId = null }) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("complete_walk", {
    p_client_key: clientKey,
    p_dog_id: dogId,
    p_started_at: startedAt,
    p_ended_at: endedAt,
    p_distance_m: distanceM,
    p_duration_s: durationS,
    p_moving_s: movingS,
    p_gps_quality: gpsQuality,
    p_flagged: flagged,
    p_elevation_m: elevationM,
    p_place_id: placeId,
  });
  return { data: data || null, error };
}

/** Ekte totaler + denne uka + streak + personlige rekorder. */
export async function activitySummary() {
  const sb = getSupabase();
  if (!sb) return { data: null, error: null };
  const { data, error } = await sb.rpc("activity_summary");
  return { data: data || null, error };
}

/** Challenge-definisjoner + min ekte fremgang. */
export async function listChallenges() {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_challenges");
  if (error) return { data: [], error };
  return {
    data: (data || []).map((c) => ({
      id: c.id, scope: c.scope, title: c.title, metric: c.metric,
      target: Number(c.target), unit: c.unit, reward: c.reward_paws,
      progress: Number(c.value || 0), done: !!c.completed_at,
    })),
    error: null,
  };
}

/** Merke-definisjoner + om jeg har oppnådd dem. */
export async function listBadges() {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_badges");
  if (error) return { data: [], error };
  return {
    data: (data || []).map((b) => ({
      id: b.id, name: b.name, metric: b.metric, target: Number(b.target),
      icon: b.icon, color: b.color, done: !!b.awarded_at,
    })),
    error: null,
  };
}

/** Lokal toppliste (låst under 10 aktive hunder). Aldri demo-data i live. */
export async function localLeaderboard(municipalityId) {
  const sb = getSupabase();
  if (!sb || !municipalityId) return { data: { unlocked: false, active_dogs: 0, min_active: 10, rows: [] }, error: null };
  const { data, error } = await sb.rpc("local_leaderboard", { p_municipality: municipalityId });
  return { data: data || { unlocked: false, active_dogs: 0, min_active: 10, rows: [] }, error };
}
