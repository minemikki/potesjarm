"use client";

import { useState } from "react";
import { PawLogo } from "./Icon";
import Icon from "./Icon";
import { WAITLIST_FALLBACK_EMAIL, WAITLIST_FORM_URL } from "../lib/launch";

/**
 * Ærlig venteliste-side. Ingen oppdiktede tall ("1 240 på ventelisten" osv.) –
 * vi later ikke som et fellesskap finnes før det gjør det. Meldingen er
 * enkel: appen bygges, meld deg på for beskjed når den åpner i din by.
 *
 * Sender ekte til Formspree hvis NEXT_PUBLIC_WAITLIST_FORM_URL er satt.
 * Er den ikke satt (eller sendingen feiler), later vi ALDRI som om
 * påmeldingen lyktes – vi tilbyr en ekte mailto-lenke i stedet.
 */
export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const configured = !!WAITLIST_FORM_URL;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!configured) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(WAITLIST_FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), kilde: "potesjarm.no venteliste" }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="waitlist">
      <div className="waitlistCard">
        <PawLogo size={48} />
        <span className="kicker">POTESJARM</span>
        <h1>Hundelivet ditt, bedre sammen.</h1>
        <p>
          Vi bygger en lokal hundeapp for Norge: turer, treff og fellesskap med hundeeierne i nabolaget ditt.
          Appen er under bygging – meld deg på, så får du beskjed når Potesjarm åpner i din by.
        </p>

        {status === "ok" ? (
          <div className="waitlistOk">
            <span className="chIcon big tint-mint"><Icon name="check" size={26} /></span>
            <b>Du er på listen!</b>
            <small>Vi sender deg en e-post når Potesjarm åpner i ditt område.</small>
          </div>
        ) : (
          <form className="waitlistForm" onSubmit={submit}>
            <label className="field">
              <span>E-post</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@epost.no"
                autoComplete="email"
              />
            </label>
            <button className="pillBtn primary big" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sender…" : "Meld meg på"}
            </button>
            {status === "error" && (
              <p className="fineprint warn">
                <Icon name="alert" size={13} />
                <span>
                  {configured ? "Kunne ikke sende påmeldingen." : "Påmelding er ikke satt opp ennå."}{" "}
                  Skriv til <a href={`mailto:${WAITLIST_FALLBACK_EMAIL}`}>{WAITLIST_FALLBACK_EMAIL}</a> i mellomtiden.
                </span>
              </p>
            )}
          </form>
        )}

        <p className="fineprint">
          <Icon name="shield" size={13} /> Vi bruker e-posten din kun til å varsle om lansering. Ingen spam.
        </p>
      </div>
      <p className="waitlistScribble hand">Bedre turer sammen ♡</p>
    </div>
  );
}
