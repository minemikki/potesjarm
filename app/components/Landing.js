"use client";

import { useEffect, useRef, useState } from "react";
import Icon, { PawLogo } from "./Icon";
import { WAITLIST_FALLBACK_EMAIL, WAITLIST_FORM_URL } from "../lib/launch";

/* =========================================================================
   Potesjarm – ventelistens landingsside.

   En ekte, produksjonsklar markedsføringsside for potesjarm.no mens appen
   bygges. Ingen oppdiktet sosial bevis: ingen «1 240 på ventelista», ingen
   påfunne antall hunder eller treff. Telefonene viser ekte skjermbilder av
   appen slik den faktisk ser ut i dag – en ærlig kaldstart der fellesskapet
   «starter med dere». Skjemaet sender ekte til Formspree hvis satt opp, og
   later ALDRI som en påmelding lyktes uten at den faktisk ble sendt.
   ========================================================================= */

/* ---- Ærlig venteliste-skjema (gjenbrukt i hero + bunn-CTA) -------------- */
function WaitlistForm({ tone = "light", source }) {
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
        body: JSON.stringify({ email: email.trim(), kilde: source || "potesjarm.no" }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "ok") {
    return (
      <div className={"lpFormOk tone-" + tone}>
        <span className="lpOkIcon"><Icon name="check" size={22} /></span>
        <div>
          <b>Du er på lista!</b>
          <small>Vi sender deg en e-post når Potesjarm åpner i ditt område.</small>
        </div>
      </div>
    );
  }

  return (
    <form className={"lpForm tone-" + tone} onSubmit={submit} noValidate>
      <div className="lpFormRow">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@epost.no"
          aria-label="E-post"
          autoComplete="email"
        />
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sender…" : "Meld meg på"}
        </button>
      </div>
      {status === "error" && (
        <p className="lpFormNote warn">
          <Icon name="alert" size={13} />
          <span>
            {configured ? "Kunne ikke sende påmeldingen." : "Påmelding er ikke satt opp ennå."}{" "}
            Skriv til <a href={`mailto:${WAITLIST_FALLBACK_EMAIL}`}>{WAITLIST_FALLBACK_EMAIL}</a> i mellomtiden.
          </span>
        </p>
      )}
      {status !== "error" && (
        <p className="lpFormNote">
          <Icon name="shield" size={13} /> Gratis · kun varsel om lansering · ingen spam
        </p>
      )}
    </form>
  );
}

/* ---- Header ------------------------------------------------------------- */
function WaitlistHeader() {
  return (
    <header className="lpHeader">
      <div className="lpHeaderInner">
        <a className="lpBrand" href="#topp" aria-label="Potesjarm">
          <PawLogo size={30} />
          <span>Potesjarm</span>
        </a>
        <a className="lpHeaderCta" href="#meld-deg-pa">Meld deg på</a>
      </div>
    </header>
  );
}

/* ---- Telefon-klynge (ekte app-skjermbilder) ---------------------------- */
function PhoneMockupCluster() {
  const phones = [
    { src: "/mockups/grupper.png", cls: "lpPhoneA", alt: "Grupper i Potesjarm-appen" },
    { src: "/mockups/hjem.png", cls: "lpPhoneB", alt: "Hjem-skjermen i Potesjarm-appen" },
    { src: "/mockups/naaskjer.png", cls: "lpPhoneC", alt: "Nå skjer i Potesjarm-appen" },
  ];
  return (
    <div className="lpPhones" aria-hidden={false}>
      <div className="lpGlow" aria-hidden="true" />
      {phones.map((p) => (
        <div key={p.cls} className={"lpPhone " + p.cls}>
          <div className="lpPhoneShell">
            <span className="lpPhoneNotch" aria-hidden="true" />
            <img src={p.src} alt={p.alt} loading="lazy" decoding="async" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Hero --------------------------------------------------------------- */
function WaitlistHero() {
  return (
    <section className="lpHero" id="topp">
      <div className="lpAurora" aria-hidden="true">
        <span className="lpBlob b1" />
        <span className="lpBlob b2" />
        <span className="lpBlob b3" />
      </div>
      <div className="lpHeroInner">
        <div className="lpHeroCopy reveal">
          <span className="lpKicker">Lokalt hundefellesskap · Norge</span>
          <h1>
            Hundelivet ditt,<br />
            <em>bedre sammen.</em>
          </h1>
          <p className="lpLead">
            Potesjarm samler hundeeierne i nabolaget ditt: spor turene, finn spontane treff
            og bli kjent med flokken rundt deg. Appen bygges nå – meld deg på og bli blant
            de første når den åpner i din by.
          </p>
          <div className="lpHeroForm" id="meld-deg-pa">
            <WaitlistForm tone="light" source="potesjarm.no hero" />
          </div>
        </div>
        <div className="lpHeroArt reveal">
          <span className="lpScribble hand" aria-hidden="true">Bedre turer sammen ♡</span>
          <PhoneMockupCluster />
        </div>
      </div>
    </section>
  );
}

/* ---- Hva er Potesjarm (funksjonskort) ---------------------------------- */
function FeatureCards() {
  const items = [
    { icon: "route", tint: "tint-blue", title: "Spor turene deres", text: "Start en tur, se distanse og tid, og bygg en oversikt over favorittrundene i nabolaget." },
    { icon: "live", tint: "tint-coral", title: "Finn treff nær deg", text: "Spontane turer og treff som dukker opp i nærområdet – og forsvinner av seg selv etterpå." },
    { icon: "users", tint: "tint-violet", title: "Lokale grupper", text: "Bli med i den offisielle gruppa for byen din, eller start en for rasen eller nabolaget ditt." },
    { icon: "flame", tint: "tint-sun", title: "Streak & poter", text: "Hold turrekka i gang og samle poter for turene dere faktisk går. Ekte innsats, ekte teller." },
  ];
  return (
    <section className="lpSection lpFeatures">
      <div className="lpSectionHead reveal">
        <span className="lpEyebrow">Hva er Potesjarm?</span>
        <h2>Alt hundelivet trenger, på ett sted</h2>
        <p>Bygget for norske hundeeiere – enkelt, lokalt og uten oppdiktet aktivitet.</p>
      </div>
      <div className="lpFeatureGrid">
        {items.map((it) => (
          <article key={it.title} className="lpFeatureCard reveal">
            <span className={"lpFeatureIcon " + it.tint}><Icon name={it.icon} size={22} /></span>
            <h3>{it.title}</h3>
            <p>{it.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---- Slik føles appen (følelse) ---------------------------------------- */
function EmotionSection() {
  const badges = [
    { icon: "pin", text: "Alltid lokalt" },
    { icon: "heart", text: "Ekte møter" },
    { icon: "shield", text: "Trygt og privat" },
    { icon: "sprout", text: "Vokser med byen din" },
  ];
  return (
    <section className="lpSection lpEmotion">
      <div className="lpEmotionInner reveal">
        <span className="lpEyebrow light">Slik føles det</span>
        <h2>
          Litt mindre alene på turen.<br />Litt mer flokk i nabolaget.
        </h2>
        <p>
          De beste turene er de dere deler. Potesjarm gjør det lett å finne folk og hunder
          som går de samme rundene som deg – og å bygge et fellesskap som faktisk finnes,
          en tur av gangen.
        </p>
        <ul className="lpBadges">
          {badges.map((b) => (
            <li key={b.text}><Icon name={b.icon} size={15} /> {b.text}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---- Bunn-CTA ----------------------------------------------------------- */
function FinalCTA() {
  return (
    <section className="lpSection lpCta">
      <div className="lpCtaInner reveal">
        <PawLogo size={44} />
        <h2>Vær med fra første tur</h2>
        <p>
          Potesjarm åpner by for by. Meld deg på, så gir vi deg beskjed så snart det
          skjer der du bor.
        </p>
        <div className="lpCtaForm">
          <WaitlistForm tone="dark" source="potesjarm.no bunn-cta" />
        </div>
      </div>
    </section>
  );
}

/* ---- Footer ------------------------------------------------------------- */
function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="lpFooter">
      <div className="lpFooterInner">
        <div className="lpFooterBrand">
          <PawLogo size={26} />
          <span>Potesjarm</span>
        </div>
        <p className="lpFooterNote">
          Lokalt hundefellesskap for Norge. Under bygging – takk for at du blir med tidlig.
        </p>
        <a className="lpFooterMail" href={`mailto:${WAITLIST_FALLBACK_EMAIL}`}>
          <Icon name="mail" size={14} /> {WAITLIST_FALLBACK_EMAIL}
        </a>
        <small className="lpFooterCopy">© {year} Potesjarm</small>
      </div>
    </footer>
  );
}

/* ---- Side --------------------------------------------------------------- */
export default function Landing() {
  const rootRef = useRef(null);

  // Lett scroll-avsløring uten tunge avhengigheter. Faller trygt tilbake på
  // å vise alt hvis IntersectionObserver ikke finnes.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".reveal");
    if (!els?.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp" ref={rootRef}>
      <WaitlistHeader />
      <main>
        <WaitlistHero />
        <FeatureCards />
        <EmotionSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
