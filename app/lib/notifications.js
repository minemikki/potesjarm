/* =========================================================================
   Varsler – rene, testbare regler (ingen nettverk, ingen React).

   Serversiden (supabase/migrations/007) er fasit: varsler lages KUN av
   triggere ved ekte handlinger, med blokkering/innstillinger/dedupe håndhevet
   der. Reglene her dekker klientsiden: slå sammen realtime-hendelser med
   eksisterende liste (dedupe), telle uleste, og finne hvilken skjerm et varsel
   skal åpne (deep-link).
   ========================================================================= */

/** Slå sammen ny(e) varsler med eksisterende. Deduper på id, nyeste først. */
export function mergeNotifications(existing = [], incoming = []) {
  const byId = new Map();
  for (const n of existing) if (n && n.id != null) byId.set(n.id, n);
  for (const n of incoming) if (n && n.id != null) byId.set(n.id, n); // realtime vinner
  return [...byId.values()].sort((a, b) => {
    const ta = a.at ? Date.parse(a.at) : 0;
    const tb = b.at ? Date.parse(b.at) : 0;
    return tb - ta;
  });
}

/** Antall uleste. */
export function unreadCount(notifications = []) {
  return notifications.reduce((n, x) => n + (x && !x.read ? 1 : 0), 0);
}

/** Vis-verdi for badge: 0 => null (ingen badge), 1–99 => tall, ellers "99+". */
export function badgeText(count) {
  if (!count || count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

/**
 * Hvilken skjerm skal et varsel åpne? Returnerer { overlay, id } eller null.
 * - follow / friend_* -> aktørens hundeprofil (actorDogId)
 * - like / comment    -> innlegget (post)
 * - message           -> samtalen (chat)
 * - meetup_*          -> treffet (meetup)
 * Referanse mangler => null (kaller viser en ærlig fallback, aldri en død knapp).
 */
export function notificationTarget(n) {
  if (!n) return null;
  switch (n.kind) {
    case "follow":
    case "friend_request":
    case "friend_accepted":
      return n.actorDogId ? { overlay: "dog", id: n.actorDogId } : null;
    case "like":
    case "comment":
      return n.refId ? { overlay: "post", id: n.refId } : null;
    case "message":
      return n.refId ? { overlay: "chat", id: n.refId } : null;
    case "meetup_join":
    case "meetup_update":
    case "meetup_cancel":
      return n.refId ? { overlay: "meetup", id: n.refId } : null;
    default:
      return null;
  }
}

/** Ikon + fargetone for et varsel når det ikke finnes en aktør-avatar. */
export function notificationIcon(kind) {
  switch (kind) {
    case "follow": return { icon: "userPlus", color: "blue" };
    case "friend_request": return { icon: "userPlus", color: "mint" };
    case "friend_accepted": return { icon: "check", color: "mint" };
    case "like": return { icon: "heart", color: "coral" };
    case "comment": return { icon: "comment", color: "blue" };
    case "message": return { icon: "mail", color: "blue" };
    case "meetup_join": return { icon: "users", color: "sun" };
    case "meetup_update": return { icon: "calendar", color: "sun" };
    case "meetup_cancel": return { icon: "x", color: "coral" };
    default: return { icon: "bell", color: "sun" };
  }
}
