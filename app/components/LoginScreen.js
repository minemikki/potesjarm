"use client";

import { useState } from "react";
import Icon, { PawLogo } from "./Icon";
import { useAuth } from "./auth.js";

/* =========================================================================
   Innloggingsskjerm (magic link). Ingen passord: skriv e-post, få en
   innloggingslenke på mail. Vi later aldri som lenken ble sendt hvis den
   ikke ble det – feil vises ærlig.
   ========================================================================= */
export default function LoginScreen() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errMsg, setErrMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setErrMsg(error.message || "Kunne ikke sende lenken.");
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <div className="authScreen">
      <div className="authCard">
        <PawLogo size={44} />
        <span className="kicker">POTESJARM</span>

        {status === "sent" ? (
          <div className="authSent">
            <span className="chIcon big tint-mint"><Icon name="mail" size={24} /></span>
            <b>Sjekk e-posten din</b>
            <small>
              Vi har sendt en innloggingslenke til <strong>{email.trim()}</strong>. Åpne den på denne
              enheten for å logge inn.
            </small>
            <button className="linkBtn" type="button" onClick={() => setStatus("idle")}>
              Bruk en annen e-post
            </button>
          </div>
        ) : (
          <>
            <h1>Logg inn på Potesjarm</h1>
            <p>Skriv e-posten din, så sender vi deg en lenke du logger inn med. Ingen passord å huske.</p>
            <form className="authForm" onSubmit={submit}>
              <label className="field">
                <span>E-post</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                  autoComplete="email"
                  inputMode="email"
                />
              </label>
              <button className="pillBtn primary big" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sender…" : "Send innloggingslenke"}
              </button>
              {status === "error" && (
                <p className="fineprint warn">
                  <Icon name="alert" size={13} />
                  <span>{errMsg} Prøv igjen om litt.</span>
                </p>
              )}
            </form>
            <p className="fineprint">
              <Icon name="shield" size={13} /> Vi bruker e-posten din kun til innlogging og varsler du selv velger.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
