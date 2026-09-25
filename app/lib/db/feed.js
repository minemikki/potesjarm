"use client";

/* =========================================================================
   Dataaksess for feeden (posts / post_likes / comments / saved_posts).

   All relevans, counts og autorisasjon (blokkering + gruppemedlemskap)
   håndheves av SECURITY DEFINER-RPC-ene i supabase/migrations/006. UI-et
   snakker aldri direkte med tabellene – det går gjennom store.js -> denne
   modulen. { data, error } overalt. Ekte counts, aldri fake social proof.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { rowToFeedPost, rowToPostComment } from "../mapdb.js";

/** Hjem-feed for en kommune. `before` = created_at-cursor for «last mer». */
export async function listFeed(municipalityId, { limit = 25, before = null } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_feed", {
    p_municipality: municipalityId || null, p_limit: limit, p_before: before,
  });
  return { data: (data || []).map(rowToFeedPost), error };
}

/** Lagrede innlegg (nyeste først), med cursor. */
export async function listSavedPosts({ limit = 25, before = null } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_saved_posts", { p_limit: limit, p_before: before });
  return { data: (data || []).map(rowToFeedPost), error };
}

/** Gruppefeed (samme berikede form som hjem-feeden). */
export async function listGroupPosts(groupId, { limit = 30, before = null } = {}) {
  const sb = getSupabase();
  if (!sb || !groupId) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_group_posts", { p_group: groupId, p_limit: limit, p_before: before });
  return { data: (data || []).map(rowToFeedPost), error };
}

/** Ett innlegg (for oppfrisk etter en mutasjon). */
export async function getPost(postId) {
  const sb = getSupabase();
  if (!sb || !postId) return { data: null, error: null };
  const { data, error } = await sb.rpc("feed_post", { p_post: postId });
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ? rowToFeedPost(row) : null, error };
}

/** Lag innlegg. Returnerer innleggets id. */
export async function createPost({ body = null, dogId = null, groupId = null, photo = null, kind = null, municipalityId = null } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("create_post", {
    p_body: body, p_dog: dogId, p_group: groupId, p_photo: photo, p_kind: kind, p_municipality: municipalityId,
  });
  return { data: data || null, error };
}

/** Slett innlegg (forfatter eller gruppeadmin/moderator). */
export async function deletePost(postId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("delete_post", { p_post: postId });
  return { error };
}

/** Like. Returnerer nytt like-antall. */
export async function likePost(postId) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("like_post", { p_post: postId });
  return { data: typeof data === "number" ? data : null, error };
}
/** Unlike. Returnerer nytt like-antall. */
export async function unlikePost(postId) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("unlike_post", { p_post: postId });
  return { data: typeof data === "number" ? data : null, error };
}

export async function savePost(postId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("save_post", { p_post: postId });
  return { error };
}
export async function unsavePost(postId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("unsave_post", { p_post: postId });
  return { error };
}

/** Kommentarer på et innlegg (blokkerte forfattere skjult). */
export async function listComments(postId) {
  const sb = getSupabase();
  if (!sb || !postId) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_post_comments", { p_post: postId });
  return { data: (data || []).map(rowToPostComment), error };
}
/** Lag kommentar. Returnerer kommentarens id. */
export async function createComment(postId, body) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("create_comment", { p_post: postId, p_body: body });
  return { data: data || null, error };
}
/** Slett kommentar (forfatter eller gruppeadmin/moderator). */
export async function deleteComment(commentId) {
  const sb = getSupabase();
  if (!sb) return { error: new Error("Ikke tilkoblet") };
  const { error } = await sb.rpc("delete_comment", { p_comment: commentId });
  return { error };
}

/** Rapporter et innlegg (ekte rad i reports). */
export async function reportPost(postId, reason = "") {
  const sb = getSupabase();
  const uid = (await sb?.auth.getUser())?.data?.user?.id;
  if (!sb || !uid) return { error: new Error("Ikke innlogget") };
  const { error } = await sb.from("reports").insert({
    reporter_id: uid, target_table: "posts", target_id: postId, reason: reason || "Rapportert fra feed",
  });
  return { error };
}
