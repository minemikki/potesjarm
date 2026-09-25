"use client";

/* =========================================================================
   Dataaksess for varsler (notifications / notification_settings /
   push_subscriptions).

   Varsler LAGES aldri her – de lages server-side av triggerne i
   supabase/migrations/007. Denne modulen leser dem, markerer lest, styrer
   innstillinger, og registrerer push-abonnement (fundament). UI-et går alltid
   via store.js -> denne modulen. { data, error } overalt.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { rowToNotification, rowToNotificationSettings } from "../mapdb.js";

/** Varsellista (nyeste først), med cursor. Blokkerte aktører skjult i RPC. */
export async function listNotifications({ limit = 40, before = null } = {}) {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_notifications", { p_limit: limit, p_before: before });
  return { data: (data || []).map(rowToNotification), error };
}

/** Antall uleste (ekte, blokkerte skjult). */
export async function unreadCount() {
  const sb = getSupabase();
  if (!sb) return { data: 0, error: null };
  const { data, error } = await sb.rpc("unread_notifications");
  return { data: typeof data === "number" ? data : 0, error };
}

export async function markRead(id) {
  const sb = getSupabase();
  if (!sb) return { error: null };
  const { error } = await sb.rpc("mark_notification_read", { p_id: id });
  return { error };
}

export async function markAllRead() {
  const sb = getSupabase();
  if (!sb) return { error: null };
  const { error } = await sb.rpc("mark_all_notifications_read");
  return { error };
}

/** Innstillinger (oppretter default-rad om den mangler, i RPC). */
export async function getSettings() {
  const sb = getSupabase();
  if (!sb) return { data: null, error: null };
  const { data, error } = await sb.rpc("get_notification_settings");
  return { data: data ? rowToNotificationSettings(data) : null, error };
}

/** Oppdater innstillinger. `patch` bruker UI-nøkler (messages/meetups/…). */
export async function updateSettings(patch = {}) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("update_notification_settings", {
    p_messages: patch.messages ?? null,
    p_meetups: patch.meetups ?? null,
    p_community: patch.community ?? null,
    p_streak: patch.streak ?? null,
    p_events: patch.events ?? null,
    p_lost_dog: patch.lostDog ?? null,
  });
  return { data: data ? rowToNotificationSettings(data) : null, error };
}

/**
 * Abonner på nye varsler via Supabase Realtime for én bruker. Realtime
 * håndhever «notif own»-RLS, så bare mine egne varsler kommer. `onInsert`
 * kalles med den rå raden. Returnerer en avmeldingsfunksjon.
 */
export function subscribeNotifications(profileId, onInsert) {
  const sb = getSupabase();
  if (!sb || !profileId) return () => {};
  const channel = sb
    .channel(`notifications:${profileId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
      (payload) => { try { onInsert?.(payload.new); } catch {} }
    )
    .subscribe();
  return () => { try { sb.removeChannel(channel); } catch {} };
}

/* ---- Push-fundament (kun registrering; ekte sending kommer senere) ---- */

/** Lagre/oppdater et push-abonnement for meg (RLS: kun egne). */
export async function registerPushSubscription({ endpoint, p256dh, auth, userAgent } = {}) {
  const sb = getSupabase();
  const uid = (await sb?.auth.getUser())?.data?.user?.id;
  if (!sb || !uid || !endpoint) return { error: new Error("Kan ikke registrere push") };
  const { error } = await sb.from("push_subscriptions").upsert(
    { profile_id: uid, endpoint, p256dh, auth, user_agent: userAgent || null, updated_at: new Date().toISOString() },
    { onConflict: "endpoint" }
  );
  return { error };
}

export async function unregisterPushSubscription(endpoint) {
  const sb = getSupabase();
  if (!sb || !endpoint) return { error: null };
  const { error } = await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { error };
}
