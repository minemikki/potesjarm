/* =========================================================================
   Poter har ÉN sannhet: en hovedbok (ledger) av begrunnede transaksjoner,
   akkurat som paw_ledger i supabase/schema.sql. Det finnes ingen `paws`-tall
   en handling bare kan legge til – summen er alltid utledet av denne loggen.

   Hver rad har en deterministisk id (reason+refId), som gjør enhver
   belønning idempotent: samme bruker + samme handling + samme objekt kan
   aldri gi mer enn én rad, uansett hvor mange ganger handlingen trigges
   (f.eks. meld deg av og på samme treff, eller re-render/dobbelt-klikk).

   Rene funksjoner, ingen avhengighet til React eller nettleseren – testbare
   uten mocking, samme mønster som track.js og time.js.
   ========================================================================= */

/** Legger til én transaksjon – men bare hvis (reason, refId) ikke allerede finnes. */
export function pushLedgerOnce(s, reason, refId, amount) {
  const id = `${reason}:${refId}`;
  if (s.pawLedger.some((e) => e.id === id)) return s;
  return { ...s, pawLedger: [...s.pawLedger, { id, at: Date.now(), reason, refId, amount }] };
}

export function pawsTotal(pawLedger) {
  return (pawLedger || []).reduce((a, e) => a + e.amount, 0);
}

/**
 * Leser lagret state fra en tidligere versjon av appen og retter den opp i
 * stedet for å late som den alltid var riktig:
 *  - et gammelt flatt `paws`-tall blir én forklart ledger-rad, ikke tapt
 *  - `invitesActivated` som ble satt av den gamle (feilaktige) invite()-koden
 *    – som aktiverte Founder-status ved rent klikk – nullstilles. Den
 *    proveniensen var aldri gyldig, og vi later ikke som den var det.
 */
export function migrateState(raw, EMPTY) {
  const s = { ...EMPTY, ...raw, profile: { ...EMPTY.profile, ...(raw.profile || {}) } };
  if (!Array.isArray(s.pawLedger)) s.pawLedger = [];
  if (typeof raw.paws === "number" && raw.paws > 0 && !s.pawLedger.some((e) => e.reason === "legacy_migration")) {
    s.pawLedger = [{ id: "legacy_migration", at: Date.now(), reason: "legacy_migration", refId: "v3", amount: raw.paws }, ...s.pawLedger];
  }
  if (typeof raw.invitesActivated === "number" && raw.invitesActivated > 0) {
    s.invitesActivated = 0; // se kommentar over – ugyldig opprinnelse i tidligere versjon
  }
  return s;
}
