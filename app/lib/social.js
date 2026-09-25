/* =========================================================================
   Sosial graf – rene, testbare regler (ingen nettverk, ingen React).

   To relasjoner som aldri må blandes:
   - FØLGE er énveis (én bruker følger en hunds aktivitet). Nøkkel: hunde-id.
   - HUNDEVENN er toveis mellom EIERNE. Nøkkel: eier/profil-id. En forespørsel
     er "sendt" (pending) til den andre faktisk godtar – klienten kan aldri
     sette den til "venner" selv.

   Fellestrekk forklares alltid med ekte profilfelt (getDogCommonalities),
   aldri en oppdiktet matchprosent.
   ========================================================================= */

const ENERGY_WORDS = { lav: 2, rolig: 2, middels: 3, medium: 3, "høy": 4, hoy: 4, "høyt": 4 };

/** Energi som tall 1–5, uansett om kilden er tall ("4") eller ord ("høy"). */
export function energyNum(e) {
  if (e == null || e === "") return null;
  const n = typeof e === "number" ? e : parseInt(String(e), 10);
  if (Number.isInteger(n)) return n;
  return ENERGY_WORDS[String(e).trim().toLowerCase()] ?? null;
}

/**
 * Forklarbare fellestrekk mellom to hunder. Returnerer en liste av korte,
 * sanne setninger – kun det ekte data støtter. Ingen score, ingen prosent.
 *
 * opts.sameArea: sett true når vi allerede VET at hundene er i samme område
 * (f.eks. fordi de kom fra discover_dogs som filtrerer på kommune). Ellers
 * utledes det fra kommuneId på begge, og er false hvis vi ikke vet.
 */
export function getDogCommonalities(mine = {}, other = {}, opts = {}) {
  const out = [];
  const myPlay = (mine.play || []).map((x) => String(x).toLowerCase());
  const shared = (other.play || []).filter((p) => myPlay.includes(String(p).toLowerCase()));
  shared.slice(0, 3).forEach((p) => out.push(`Begge liker ${String(p).toLowerCase()}`));

  const me = energyNum(mine.energy);
  const ot = energyNum(other.energy);
  if (me != null && ot != null && Math.abs(me - ot) <= 1) out.push("Likt energinivå");

  if (mine.size && other.size && String(mine.size).toLowerCase() === String(other.size).toLowerCase()) {
    out.push(`Samme størrelse (${String(other.size).toLowerCase()})`);
  }

  // Kompatibel sosial stil: én felles komfort-preferanse holder.
  const myComfort = (mine.comfort || []).map((x) => String(x).toLowerCase());
  const sharedComfort = (other.comfort || []).filter((c) => myComfort.includes(String(c).toLowerCase()));
  if (sharedComfort.length) out.push("Kompatibel sosial stil");

  const sameArea = opts.sameArea ?? (mine.kommuneId && other.kommuneId ? mine.kommuneId === other.kommuneId : false);
  if (sameArea) out.push("Samme område");

  return out;
}

/** Overskrift ut fra hvor mye to hunder har til felles. */
export function commonalityHeadline(count) {
  if (count >= 3) return "God turmatch";
  if (count === 2) return "Noe til felles";
  if (count === 1) return "Én ting til felles";
  return "Ny å bli kjent med";
}

/**
 * Relasjonsstatus mellom brukeren og en annen hund/eier. Blokkering vinner
 * over alt. Godtar enten en enkel id (lokal/demo, der samme id brukes overalt)
 * eller { dogId, ownerId } (ekte data, der følge er per hund og vennskap er
 * per eier).
 */
export function relationStatus(state, arg) {
  const dogId = typeof arg === "string" ? arg : arg?.dogId;
  const ownerKey = typeof arg === "string" ? arg : (arg?.ownerId ?? arg?.dogId);
  const blocked = !!(state.blocked && ownerKey && state.blocked[ownerKey]);
  return {
    following: !!(state.followed && dogId && state.followed[dogId]) && !blocked,
    requested: !!(state.friendReqOut && ownerKey && state.friendReqOut[ownerKey]) && !blocked,
    incoming: !!(state.friendReqIn && ownerKey && state.friendReqIn[ownerKey]) && !blocked,
    friend: !!(state.friends && ownerKey && state.friends[ownerKey]) && !blocked,
    blocked,
  };
}

/** Antall bekreftede hundevenner (ekte tall – 0 er 0). */
export function friendCount(state) {
  return Object.keys(state.friends || {}).length;
}
