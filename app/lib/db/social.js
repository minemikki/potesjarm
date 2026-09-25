"use client";

/* =========================================================================
   Dataaksess for sosial graf: følge, hundevenn (forespørsler + vennskap) og
   blokkering. Alle skrivende operasjoner går gjennom SECURITY DEFINER-RPC-er
   (se supabase/migrations/003) slik at blokkering håndheves i begge retninger
   og vennskap aldri kan forfalskes fra klienten.

   { data, error } / { error } overalt – ingen stille feil.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";

/* ---- Følge (per hund) --------------------------------------------------- */
export async function followDog(dogId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("follow_dog", { p_dog: dogId });
  return { error };
}
export async function unfollowDog(dogId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("unfollow_dog", { p_dog: dogId });
  return { error };
}
/** Hunde-id-ene den innloggede brukeren følger. */
export async function listFollowedDogIds(myId) {
  const sb = getSupabase();
  if (!sb || !myId) return { data: [], error: null };
  const { data, error } = await sb.from("follows").select("dog_id").eq("follower_id", myId);
  return { data: (data || []).map((r) => r.dog_id), error };
}

/* ---- Hundevenn (per eier) ---------------------------------------------- */
export async function sendFriendRequest(receiverId, senderDogId = null, receiverDogId = null) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("send_friend_request", {
    p_receiver: receiverId,
    p_sender_dog: senderDogId,
    p_receiver_dog: receiverDogId,
  });
  return { data, error };
}
export async function acceptFriendRequest(requestId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("accept_friend_request", { p_request: requestId });
  return { error };
}
export async function declineFriendRequest(requestId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("decline_friend_request", { p_request: requestId });
  return { error };
}
export async function cancelFriendRequest(requestId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("cancel_friend_request", { p_request: requestId });
  return { error };
}

/** Eier-id-ene brukeren er bekreftede hundevenner med. */
export async function listFriendOwnerIds(myId) {
  const sb = getSupabase();
  if (!sb || !myId) return { data: [], error: null };
  const { data, error } = await sb.from("friendships").select("a_id, b_id").or(`a_id.eq.${myId},b_id.eq.${myId}`);
  const ids = (data || []).map((r) => (r.a_id === myId ? r.b_id : r.a_id));
  return { data: ids, error };
}

/** Utgående ventende forespørsler: { [receiverOwnerId]: requestId }. */
export async function listOutgoingRequests(myId) {
  const sb = getSupabase();
  if (!sb || !myId) return { data: {}, error: null };
  const { data, error } = await sb
    .from("friend_requests")
    .select("id, receiver_id")
    .eq("sender_id", myId)
    .eq("status", "pending");
  const map = {};
  for (const r of data || []) map[r.receiver_id] = r.id;
  return { data: map, error };
}

/** Innkommende ventende forespørsler: { [senderOwnerId]: requestId }. */
export async function listIncomingRequests(myId) {
  const sb = getSupabase();
  if (!sb || !myId) return { data: {}, error: null };
  const { data, error } = await sb
    .from("friend_requests")
    .select("id, sender_id")
    .eq("receiver_id", myId)
    .eq("status", "pending");
  const map = {};
  for (const r of data || []) map[r.sender_id] = r.id;
  return { data: map, error };
}

/* ---- Blokkering (per eier) --------------------------------------------- */
export async function blockUser(ownerId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("block_user", { p_blocked: ownerId });
  return { error };
}
export async function unblockUser(ownerId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("unblock_user", { p_blocked: ownerId });
  return { error };
}
/** Eier-id-ene brukeren har blokkert. */
export async function listBlockedOwnerIds(myId) {
  const sb = getSupabase();
  if (!sb || !myId) return { data: [], error: null };
  const { data, error } = await sb.from("blocks").select("blocked_id").eq("blocker_id", myId);
  return { data: (data || []).map((r) => r.blocked_id), error };
}

/**
 * Last hele den sosiale grafen for brukeren i én runde, til app-state-form:
 * followed (hunde-id -> true), friends/friendReqOut/friendReqIn/blocked
 * (eier-id -> true / requestId). Tom overalt betyr faktisk ingen relasjoner.
 */
export async function loadSocialGraph(myId) {
  const [followed, friends, outgoing, incoming, blocked] = await Promise.all([
    listFollowedDogIds(myId),
    listFriendOwnerIds(myId),
    listOutgoingRequests(myId),
    listIncomingRequests(myId),
    listBlockedOwnerIds(myId),
  ]);
  const toMap = (ids) => Object.fromEntries((ids || []).map((id) => [id, true]));
  return {
    followed: toMap(followed.data),
    friends: toMap(friends.data),
    friendReqOut: outgoing.data,
    friendReqIn: incoming.data,
    blocked: toMap(blocked.data),
  };
}

/* ---- "Felles" (grunnlag for hundeprofil senere) ------------------------
   Alt regnes fra ekte rader – 0/[] når det ikke finnes noe. Aldri oppdiktet. */
export async function mutualFriendsCount(otherOwnerId) {
  const sb = getSupabase();
  if (!sb || !otherOwnerId) return { data: 0, error: null };
  const { data, error } = await sb.rpc("mutual_friends_count", { p_other: otherOwnerId });
  return { data: data ?? 0, error };
}
export async function sharedGroupsCount(otherOwnerId) {
  const sb = getSupabase();
  if (!sb || !otherOwnerId) return { data: 0, error: null };
  const { data, error } = await sb.rpc("shared_groups_count", { p_other: otherOwnerId });
  return { data: data ?? 0, error };
}
/** Tidligere treff sammen – ingen tabell for historikk ennå, så ærlig 0. */
export async function previousMeetupsCount(_otherOwnerId) {
  return { data: 0, error: null };
}
