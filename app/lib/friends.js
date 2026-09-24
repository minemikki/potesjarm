/* =========================================================================
   Sosial graf: FØLGE vs HUNDEVENN.

   To ulike relasjoner som ikke må blandes:

   - FØLGE er énveis. Jeg velger å følge en hunds aktivitet. Krever ingen
     bekreftelse fra den andre. Lagres i `followed`.

   - HUNDEVENN er toveis. Jeg sender en forespørsel; den er BEKREFTET først
     når den andre eieren godtar. Klienten kan aldri sette en forespørsel til
     "venner" på egen hånd – det krever at den andre parten faktisk godtar,
     noe bare en backend kan formidle. Lokalt kan en forespørsel derfor bare
     være "sendt" (pending) eller trukket tilbake. Vi later ALDRI som om noen
     har godtatt. `friendReqOut` = forespørsler jeg har sendt, `friends` =
     bekreftede venner (settes kun av backend / demo-fixtures, aldri av et
     klikk i live-modus).

   Rene funksjoner – testbare uten mocking, samme mønster som resten av lib/.
   ========================================================================= */

/** Relasjonsstatus mellom brukeren og en hund. Blokkering vinner over alt. */
export function relationStatus(state, id) {
  if (!id) return { following: false, requested: false, friend: false, blocked: false };
  const blocked = !!(state.blocked && state.blocked[id]);
  return {
    following: !!(state.followed && state.followed[id]) && !blocked,
    requested: !!(state.friendReqOut && state.friendReqOut[id]) && !blocked,
    friend: !!(state.friends && state.friends[id]) && !blocked,
    blocked,
  };
}

/** Slår følging av/på (énveis). Returnerer ny followed-map. */
export function toggleFollow(followed = {}, id) {
  const next = { ...followed };
  if (next[id]) delete next[id];
  else next[id] = true;
  return next;
}

/**
 * Sender en hundevenn-forespørsel (idempotent). Gjør IKKE noen til venn –
 * setter bare pending. En allerede bekreftet venn får ingen ny forespørsel.
 */
export function sendFriendRequest(state, id) {
  if (!id || (state.friends && state.friends[id])) return state;
  return { ...state, friendReqOut: { ...state.friendReqOut, [id]: true } };
}

/** Trekker tilbake en sendt forespørsel. */
export function cancelFriendRequest(state, id) {
  const next = { ...state.friendReqOut };
  delete next[id];
  return { ...state, friendReqOut: next };
}

/** Antall bekreftede hundevenner (ekte tall – 0 er 0). */
export function friendCount(state) {
  return Object.keys(state.friends || {}).length;
}
