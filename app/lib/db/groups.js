"use client";

/* =========================================================================
   Dataaksess for grupper (groups / group_members / posts med group_id).
   Moderering og membership-krav går gjennom SECURITY DEFINER-RPC-er
   (supabase/migrations/004). { data, error } overalt – aldri stille feil,
   og member_count kommer alltid fra ekte rader.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { rowToGroupSummary, rowToGroupMember, rowToFeedPost } from "../mapdb.js";

/** Grupper i en kommune (medlemstall + min rolle), offisielle først. */
export async function listGroups(municipalityId) {
  const sb = getSupabase();
  if (!sb || !municipalityId) return { data: [], error: null };
  const { data, error } = await sb.rpc("group_summaries", { p_municipality: municipalityId });
  return { data: (data || []).map(rowToGroupSummary), error };
}

/** Opprett en gruppe (du blir admin). */
export async function createGroup(name, about, kind, municipalityId) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("create_group", {
    p_name: name, p_about: about || null, p_kind: kind || "lokalt", p_municipality: municipalityId || null,
  });
  return { data: data ? rowToGroupSummary({ ...data, member_count: 1, my_role: "admin" }) : null, error };
}

export async function joinGroup(groupId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("join_group", { p_group: groupId });
  return { error };
}
export async function leaveGroup(groupId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("leave_group", { p_group: groupId });
  return { error };
}

/** Medlemmer (rolle + primærhund), blokkerte skjult. */
export async function listMembers(groupId) {
  const sb = getSupabase();
  if (!sb || !groupId) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_group_members", { p_group: groupId });
  return { data: (data || []).map(rowToGroupMember), error };
}

/** Gruppefeed (nyeste først), blokkerte forfattere skjult. Fra Sprint 6 gir
 *  list_group_posts samme berikede form som hjem-feeden (counts + liked/saved),
 *  så gruppefeed og hjem-feed deler mapper (rowToFeedPost) og PostCard. */
export async function listPosts(groupId, limit = 30) {
  const sb = getSupabase();
  if (!sb || !groupId) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_group_posts", { p_group: groupId, p_limit: limit });
  return { data: (data || []).map(rowToFeedPost), error };
}

/** Lag innlegg (krever medlemskap – håndheves i RPC). */
export async function createPost(groupId, body, dogId = null, photo = null) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("create_group_post", {
    p_group: groupId, p_body: body, p_dog: dogId, p_photo: photo,
  });
  return { data: data ? rowToFeedPost(data) : null, error };
}

/** Slett innlegg (forfatter eller admin/moderator). */
export async function deletePost(postId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("delete_group_post", { p_post: postId });
  return { error };
}

/* ---- Moderering ---- */
export async function removeMember(groupId, profileId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("remove_group_member", { p_group: groupId, p_profile: profileId });
  return { error };
}
export async function setMemberRole(groupId, profileId, role) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("set_group_member_role", { p_group: groupId, p_profile: profileId, p_role: role });
  return { error };
}

/** Rapporter et innlegg (ekte rad i reports). */
export async function reportPost(postId, reason = "") {
  const sb = getSupabase();
  const uid = (await sb?.auth.getUser())?.data?.user?.id;
  if (!sb || !uid) return { error: new Error("Ikke innlogget") };
  const { error } = await sb.from("reports").insert({
    reporter_id: uid, target_table: "posts", target_id: postId, reason: reason || "Rapportert fra gruppa",
  });
  return { error };
}
