"use client";

/* =========================================================================
   Delbare øyeblikk. Laget for å se bra ut som skjermbilde (Story/Reels):
   hund + eier, ett stort ekte tall, sted/dato, og en liten signatur.
   Vises KUN med ekte data – aldri et oppdiktet tall.
   ========================================================================= */

import Icon, { PawLogo } from "./Icon";
import { useApp } from "./store";
import { Avatar } from "./ui";

/** Del med Web Share API, ellers kopier teksten. Ærlig tilbakemelding. */
export async function shareMoment(app, text) {
  const payload = { title: "Potesjarm", text: `${text}\nBli med oss på Potesjarm 🐾`, url: "https://potesjarm.no" };
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share(payload);
      return;
    }
    await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
    app.flash("Kopiert – lim inn der du vil dele", "share");
  } catch {
    // Brukeren avbrøt delingen – ingen feilmelding nødvendig.
  }
}

/**
 * Selve kortet. `big` er hovedtallet («4,8 km», «7 dager»), `unit` en kort
 * forklaring, `facts` små ekte fakta (tid, sted, dato).
 */
export function ShareCard({ big, unit, line, facts = [], shareText, tone = "indigo" }) {
  const app = useApp();
  const me = app.me;
  const names = [me.dogName, me.ownerName?.split(" ")[0]].filter(Boolean).join(" + ");
  return (
    <figure className={"shareCard tone-" + tone}>
      <div className="shareTop">
        <Avatar src={me.photo} name={me.dogName} size={44} />
        <b>{names ? names.toUpperCase() : "OSS TO"}</b>
      </div>
      <div className="shareBig">
        <strong>{big}</strong>
        {unit && <span>{unit}</span>}
      </div>
      {line && <p className="shareLine">{line}</p>}
      {facts.length > 0 && (
        <ul className="shareFacts">{facts.filter(Boolean).map((f) => <li key={f}>{f}</li>)}</ul>
      )}
      <figcaption className="shareFoot">
        <span className="hand">Bedre turer sammen.</span>
        <span className="shareBrand"><PawLogo size={18} /> potesjarm.no</span>
      </figcaption>
      {shareText && (
        <button className="shareBtn" onClick={() => shareMoment(app, shareText)} aria-label="Del">
          <Icon name="share" size={17} /> Del
        </button>
      )}
    </figure>
  );
}
