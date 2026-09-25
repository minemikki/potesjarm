"use client";

/* =========================================================================
   Dataaksess for chat (conversations / conversation_members / messages).

   All autorisasjon (medlemskap, blokkering, self-chat, treff-deltakelse,
   duplikat-hindring) håndheves av SECURITY DEFINER-RPC-ene i
   supabase/migrations/005. UI-et snakker aldri direkte med tabellene – det
   går gjennom store.js -> denne modulen. { data, error } overalt.
   ========================================================================= */

import { getSupabase } from "../supabaseClient.js";
import { rowToConversation, rowToMessage } from "../mapdb.js";

/** Hent/opprett en 1:1-samtale med en annen bruker. Returnerer samtale-id. */
export async function getOrCreateDirect(otherProfileId) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("get_or_create_direct_conversation", { p_other: otherProfileId });
  return { data: data || null, error };
}

/** Hent/opprett samtalen for et treff (kun vert/deltaker). Returnerer id. */
export async function getOrCreateMeetup(meetupId) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("get_or_create_meetup_conversation", { p_meetup: meetupId });
  return { data: data || null, error };
}

/** Innboksen: alle mine samtaler med siste melding + ulest-antall. */
export async function listConversations() {
  const sb = getSupabase();
  if (!sb) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_conversations");
  return { data: (data || []).map(rowToConversation), error };
}

/** Meldinger i en samtale (eldste først). Tom hvis ikke medlem/blokkert. */
export async function listMessages(conversationId, limit = 100) {
  const sb = getSupabase();
  if (!sb || !conversationId) return { data: [], error: null };
  const { data, error } = await sb.rpc("list_messages", { p_conversation: conversationId, p_limit: limit });
  return { data: (data || []).map(rowToMessage), error };
}

/** Send en melding. Returnerer den rå meldingsraden (id/created_at) for dedupe. */
export async function sendMessage(conversationId, body) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: new Error("Ikke tilkoblet") };
  const { data, error } = await sb.rpc("send_message", { p_conversation: conversationId, p_body: body });
  // RPC-en returnerer en tabell -> ta første rad.
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error };
}

/** Marker en samtale som lest (nullstiller ulest for meg). */
export async function markRead(conversationId) {
  const sb = getSupabase();
  if (!sb || !conversationId) return { error: null };
  const { error } = await sb.rpc("mark_conversation_read", { p_conversation: conversationId });
  return { error };
}

/**
 * Abonner på nye meldinger i én samtale via Supabase Realtime.
 * Realtime håndhever RLS (msg read), så bare medlemmer får hendelser.
 * `onInsert` kalles med den rå meldingsraden. Returnerer en avmeldingsfunksjon.
 */
export function subscribeMessages(conversationId, onInsert) {
  const sb = getSupabase();
  if (!sb || !conversationId) return () => {};
  const channel = sb
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => { try { onInsert?.(payload.new); } catch {} }
    )
    .subscribe();
  return () => { try { sb.removeChannel(channel); } catch {} };
}
