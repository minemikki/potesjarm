"use client";

/* =========================================================================
   Dataaksess for `meetups` / `meetup_participants`.

   Tynn Supabase-spørring; feltmapping i app/lib/mapdb.js. { data, error }
   overalt – vi later aldri som noe lyktes hvis det ikke gjorde det, og en
   tom liste betyr faktisk ingen treff, ikke en feil vi skjuler.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { rowToMeetup } from "../mapdb.js";

/**
 * Aktive treff i en kommune (ikke avlyst, ikke utløpt), med vert- og
 * deltakerinfo hentet i egne, enkle spørringer (unngår avhengighet av
 * PostgREST-relasjonsnavn, som er skjøre å anta riktig navn på).
 */
export async function listMeetupsNear(municipalityId, myProfileId = null) {
  const sb = getSupabase();
  if (!sb || !municipalityId) return { data: [], error: null };

  const { data: rows, error } = await sb
    .from("meetups")
    .select("*")
    .eq("municipality_id", municipalityId)
    .is("cancelled_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  if (error) return { data: [], error };
  if (!rows?.length) return { data: [], error: null };

  const meetupIds = rows.map((r) => r.id);
  const hostIds = [...new Set(rows.map((r) => r.host_id))];

  const [{ data: profiles }, { data: dogs }, { data: participants }] = await Promise.all([
    sb.from("profiles").select("id, display_name").in("id", hostIds),
    sb.from("dogs").select("owner_id, name, photo_url, created_at").in("owner_id", hostIds).order("created_at", { ascending: true }),
    sb.from("meetup_participants").select("meetup_id, profile_id").in("meetup_id", meetupIds),
  ]);

  const nameById = new Map((profiles || []).map((p) => [p.id, p.display_name]));
  const dogByOwner = new Map();
  for (const d of dogs || []) if (!dogByOwner.has(d.owner_id)) dogByOwner.set(d.owner_id, d); // første/primære hund

  const goingCountByMeetup = new Map();
  const iAmGoingByMeetup = new Set();
  for (const p of participants || []) {
    goingCountByMeetup.set(p.meetup_id, (goingCountByMeetup.get(p.meetup_id) || 0) + 1);
    if (myProfileId && p.profile_id === myProfileId) iAmGoingByMeetup.add(p.meetup_id);
  }

  const now = new Date();
  const mapped = rows.map((row) => {
    const dog = dogByOwner.get(row.host_id);
    return rowToMeetup(row, {
      hostName: nameById.get(row.host_id) || "",
      hostDogName: dog?.name || "",
      hostPhoto: dog?.photo_url || null,
      goingCount: goingCountByMeetup.get(row.id) || 0,
      iAmGoing: iAmGoingByMeetup.has(row.id),
      myProfileId,
      now,
    });
  });
  return { data: mapped, error: null };
}

/** Opprett et treff. RLS krever host_id = auth.uid(). */
export async function createMeetup(row) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  if (!row.title) return { data: null, error: new Error("Treffet må ha en tittel") };
  const { data, error } = await sb.from("meetups").insert(row).select("*").maybeSingle();
  return { data, error };
}

/** Avlys eget treff (setter cancelled_at, sletter aldri raden). */
export async function cancelMeetup(meetupId, hostId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.from("meetups").update({ cancelled_at: new Date().toISOString() }).eq("id", meetupId).eq("host_id", hostId);
  return { error };
}

/** Meld deg på. Idempotent (upsert) – dobbelttrykk gir aldri to rader. */
export async function joinMeetup(meetupId, profileId, dogId = null) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb
    .from("meetup_participants")
    .upsert({ meetup_id: meetupId, profile_id: profileId, dog_id: dogId }, { onConflict: "meetup_id,profile_id" });
  return { error };
}

/** Meld deg av. */
export async function leaveMeetup(meetupId, profileId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.from("meetup_participants").delete().eq("meetup_id", meetupId).eq("profile_id", profileId);
  return { error };
}
