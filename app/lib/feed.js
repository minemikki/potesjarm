/* =========================================================================
   Feed – rene, testbare regler (ingen nettverk, ingen React).

   Serversiden (supabase/migrations/006) er fasit for relevans, counts og
   autorisasjon (blokkering + gruppemedlemskap i RPC-ene). Reglene her dekker
   det klienten alene er ansvarlig for: slå sammen sider ved paginering,
   optimistisk like/lagre med trygg tilbakerulling, og et klient-speil av
   blokkeringsfilteret slik at UI kan skjule innhold umiddelbart.
   ========================================================================= */

/** Slå sammen en ny side med eksisterende feed. Deduper på id, behold rekkefølge
 *  (eksisterende først, deretter nye som ikke allerede finnes). */
export function mergeFeed(existing = [], incoming = []) {
  const seen = new Set();
  const out = [];
  for (const p of [...existing, ...incoming]) {
    if (!p || p.id == null || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** Optimistisk like-toggle på ett innlegg. Idempotent å reversere: kalles den
 *  to ganger er man tilbake til utgangspunktet (brukes til tilbakerulling). */
export function toggleLikeOptimistic(post) {
  if (!post) return post;
  const liked = !post.likedByMe;
  const likes = Math.max(0, (post.likes || 0) + (liked ? 1 : -1));
  return { ...post, likedByMe: liked, likes };
}

/** Optimistisk lagre-toggle. */
export function toggleSaveOptimistic(post) {
  if (!post) return post;
  return { ...post, savedByMe: !post.savedByMe };
}

/** Sett et innleggs likes-count/liked-status eksakt (etter server-svar). */
export function applyLikeResult(post, { likes, liked }) {
  if (!post) return post;
  return {
    ...post,
    likes: typeof likes === "number" ? Math.max(0, likes) : post.likes,
    likedByMe: typeof liked === "boolean" ? liked : post.likedByMe,
  };
}

/** Klient-speil av blokkeringsfilteret (server håndhever det uansett). */
export function filterBlocked(items = [], blockedIds = [], key = "authorId") {
  const blocked = new Set(blockedIds);
  return items.filter((i) => i && !blocked.has(i[key]));
}

/** Kan jeg interagere (like/kommentere) med et innlegg? Ikke hvis blokkert. */
export function canInteract({ meId, authorId, blocked = [] } = {}) {
  if (!meId || !authorId) return false;
  return !blocked.includes(authorId);
}
