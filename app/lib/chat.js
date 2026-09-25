/* =========================================================================
   Chat – rene, testbare regler (ingen nettverk, ingen React).

   Serversiden (supabase/migrations/005) er fasit for autorisasjon: RPC-ene
   håndhever medlemskap, blokkering, self-chat-forbud og duplikat-hindring.
   Reglene her speiler et par av dem på klienten for å slå av knapper FØR et
   kall gjøres (bedre UX), og håndterer det klienten alene er ansvarlig for:
   dedupe av optimistiske meldinger mot Realtime-hendelser, ulest-telling og
   sortering av innboksen.
   ========================================================================= */

/** Kanonisk nøkkel for et par profil-id-er (minste:største). Samme som i SQL. */
export function dmKey(a, b) {
  if (!a || !b) return null;
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/** Klient-speil av server-regelen: kan jeg starte en direkte-chat med denne? */
export function canStartDirectChat({ meId, otherId, blocked = [] } = {}) {
  if (!meId || !otherId) return false;
  if (meId === otherId) return false; // self-chat forbudt
  if (blocked.includes(otherId)) return false; // jeg har blokkert (server ser begge veier)
  return true;
}

/** Klient-speil: kan jeg åpne treff-chatten? Kun vert eller påmeldt deltaker. */
export function canChatMeetup({ meId, hostId, going = false } = {}) {
  if (!meId) return false;
  return meId === hostId || going === true;
}

const isTemp = (m) => typeof m?.id === "string" && m.id.startsWith("tmp:");

/**
 * Slå sammen eksisterende meldinger med innkommende (fra server/Realtime).
 * - Deduper på id (server er fasit; siste vinner beholder rekkefølge).
 * - En optimistisk (tmp:) melding fjernes så snart serveren har en ekte
 *   melding fra meg med samme tekst (unngår dobbel visning).
 * - Sorterer stabilt på created_at (at), tmp-meldinger uten tid havner sist.
 */
export function mergeMessages(existing = [], incoming = []) {
  const byId = new Map();
  for (const m of existing) if (m && m.id != null) byId.set(m.id, m);
  for (const m of incoming) if (m && m.id != null) byId.set(m.id, m);

  // Fjern tmp-duplikater som nå finnes som ekte serverrad.
  const realMineKeys = new Set();
  for (const m of byId.values()) {
    if (!isTemp(m) && m.mine) realMineKeys.add((m.body || "").trim());
  }
  for (const [id, m] of [...byId]) {
    if (isTemp(m) && m.mine && realMineKeys.has((m.body || "").trim())) byId.delete(id);
  }

  const list = [...byId.values()];
  list.sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : (isTemp(a) ? Infinity : 0);
    const tb = b.at ? Date.parse(b.at) : (isTemp(b) ? Infinity : 0);
    return ta - tb;
  });
  return list;
}

/** Antall uleste: meldinger fra andre nyere enn lastReadAt. */
export function unreadCount(messages = [], lastReadAt = null, myId = null) {
  const cut = lastReadAt ? Date.parse(lastReadAt) : null;
  let n = 0;
  for (const m of messages) {
    const fromOther = myId ? m.senderId && m.senderId !== myId : m.mine === false;
    if (!fromOther) continue;
    if (cut == null) { n++; continue; }
    if (m.at && Date.parse(m.at) > cut) n++;
  }
  return n;
}

/** Sorter innboksen: nyeste siste-melding først, samtaler uten meldinger sist. */
export function sortConversations(list = []) {
  return [...list].sort((a, b) => {
    const ta = a.lastAt ? Date.parse(a.lastAt) : 0;
    const tb = b.lastAt ? Date.parse(b.lastAt) : 0;
    return tb - ta;
  });
}
