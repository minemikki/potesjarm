"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Icon, { PawLogo } from "./Icon";
import { WAITLIST_FALLBACK_EMAIL } from "../lib/launch";
import { kommuner } from "../lib/geo";
import { captureAttribution, isValidEmail, referralLink, shareText } from "../lib/attribution";
import { joinWaitlist } from "../lib/waitlist";

/* =========================================================================
   Potesjarm – ventelisten. «Det lokale hundelivet.»

   Mål: en hundeeier fra TikTok/Reels skal forstå produktet på 5–10 sekunder
   og tenke «dette vil jeg være med på tidlig». Hero + skjema først, deretter
   signaturen (Nå skjer), så kort hvorfor/hvordan og en ekte Founder-plass.

   Ærlighet: app-forhåndsvisningene er merket «Eksempel». Ingen tall om hvor
   mange som står på lista. Plassen («hund #37 i Stavanger») vises bare når
   den kommer fra serveren og dermed er ekte.
   ========================================================================= */

const Ctx = createContext(null);
const useLanding = () => useContext(Ctx);

const canonicalCity = (v) => {
  const s = (v || "").trim();
  const hit = kommuner.find((k) => k.name.toLowerCase() === s.toLowerCase());
  return hit ? hit.name : s;
};

/* ---- Skjema (hero + bunn) ---------------------------------------------- */
function SignupForm({ source, cta, tone = "light" }) {
  const L = useLanding();
  const [dog, setDog] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  if (L.result) return <SignupSuccess tone={tone} />;

  const submit = async (e) => {
    e.preventDefault();
    const city = canonicalCity(L.city);
    const errs = {};
    if (!dog.trim()) errs.dog = "Hva heter hunden?";
    if (!city) errs.city = "Hvilken by bor dere i?";
    if (!isValidEmail(email)) errs.email = "Sjekk e-postadressen";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    const r = await joinWaitlist({ email, dogName: dog, city, source, attribution: L.attr });
    setSending(false);
    if (r.status === "invalid_email") return setErrors({ email: "Sjekk e-postadressen" });
    if (r.status === "invalid_dog") return setErrors({ dog: "Hundens navn kan være maks 40 tegn" });
    if (r.status === "invalid_city") return setErrors({ city: "Skriv inn byen eller kommunen" });
    if (r.status === "error") return setErrors({ form: "error" });
    L.setCity(r.city || city);
    L.setResult({ ...r, dogName: dog.trim(), city: r.city || city });
  };

  return (
    <form className={"wlForm tone-" + tone} onSubmit={submit} noValidate>
      <div className="wlRow two">
        <label className={"wlField" + (errors.dog ? " bad" : "")}>
          <span>Hundens navn</span>
          <input value={dog} onChange={(e) => setDog(e.target.value)} placeholder="Luna" maxLength={40} autoComplete="off" aria-invalid={!!errors.dog} />
          {errors.dog && <small role="alert">{errors.dog}</small>}
        </label>
        <label className={"wlField" + (errors.city ? " bad" : "")}>
          <span>By / kommune</span>
          <input value={L.city} onChange={(e) => L.setCity(e.target.value)} placeholder="Stavanger" list="wl-kommuner" maxLength={60} autoComplete="address-level2" aria-invalid={!!errors.city} />
          {errors.city && <small role="alert">{errors.city}</small>}
        </label>
      </div>
      <label className={"wlField" + (errors.email ? " bad" : "")}>
        <span>E-post</span>
        <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@epost.no" autoComplete="email" aria-invalid={!!errors.email} />
        {errors.email && <small role="alert">{errors.email}</small>}
      </label>
      <button type="submit" className="wlSubmit" disabled={sending}>
        {sending ? "Sender…" : cta}
        {!sending && <Icon name="arrowRight" size={18} />}
      </button>
      {errors.form ? (
        <p className="wlNote warn" role="alert">
          <Icon name="alert" size={14} /> Noe gikk galt. Prøv igjen – eller skriv til{" "}
          <a href={`mailto:${WAITLIST_FALLBACK_EMAIL}`}>{WAITLIST_FALLBACK_EMAIL}</a>.
        </p>
      ) : (
        <p className="wlNote">Gratis · tidlig tilgang · ingen spam</p>
      )}
    </form>
  );
}

/* ---- Etter påmelding: bekreftelse + inviter en hundevenn --------------- */
function SignupSuccess({ tone }) {
  const L = useLanding();
  const r = L.result;
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://potesjarm.no";
  const link = referralLink(r.code, { origin, city: r.city });
  const text = shareText(r.dogName, r.city);
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const nativeShare = async () => {
    try { await navigator.share({ title: "Potesjarm", text, url: link }); } catch {}
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch {}
  };

  return (
    <div className={"wlDone tone-" + tone} aria-live="polite">
      <p className="wlDoneTitle">
        {r.status === "duplicate" ? "Du er allerede med 🐾" : `${r.dogName} er med 🐾`}
      </p>
      {r.position ? (
        <p className="wlDonePos">
          {r.status === "duplicate" ? "Hunden din" : r.dogName} er hund <b>#{r.position}</b> i {r.city}.
          {r.founder && <> Blant de første 100 – dere får <b>Founder-merke</b> når appen åpner.</>}
        </p>
      ) : (
        <p className="wlDonePos">Vi sier fra så snart Potesjarm åpner i {r.city}.</p>
      )}
      <div className="wlInvite">
        <b>Har {r.status === "duplicate" ? "hunden din" : r.dogName} en hundevenn som burde være med?</b>
        <div className="wlShare">
          {canShare && (
            <button className="wlShareBtn primary" onClick={nativeShare}><Icon name="share" size={17} /> Inviter en hundevenn</button>
          )}
          <a className="wlShareBtn wa" href={`https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`} target="_blank" rel="noopener noreferrer">
            <Icon name="comment" size={17} /> WhatsApp
          </a>
          <button className="wlShareBtn" onClick={copy}><Icon name={copied ? "check" : "link"} size={17} /> {copied ? "Kopiert!" : "Kopier lenke"}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- «Nå skjer»-forhåndsvisning (lett HTML, ingen bilder) -------------- */
const DEMO_INVITES = [
  { dog: "Luna", owner: "Kari", verb: "skal ut", title: "Rolig tur rundt Mosvannet", place: "Mosvannet", when: "om 20 min", going: 2, color: "blue", icon: "walk", live: false },
  { dog: "Balto", owner: "Anders", verb: "vil leke", title: "Litt lek i hundeparken", place: "Sørmarka", when: "nå", going: 1, color: "coral", icon: "ball", live: true },
  { dog: "Frida", owner: "Emma", verb: "vil møte andre valper", title: "Valpetreff", place: "Tjensvoll", when: "kl. 18:30", going: 4, color: "mint", icon: "sprout" },
];

function InvitePreview({ inv, compact }) {
  const [on, setOn] = useState(false);
  const count = inv.going + (on ? 1 : 0);
  return (
    <div className={"pvInvite tint-" + inv.color + (compact ? " compact" : "")}>
      <div className="pvTop">
        <span className="pvAvatar">{inv.dog[0]}</span>
        <span className="pvWho"><b>{inv.dog} {inv.verb}</b><small>med {inv.owner}</small></span>
        <span className={"pvWhen" + (inv.live ? " live" : "")}>{inv.live && <i />}{inv.when}</span>
      </div>
      <b className="pvTitle">{inv.title}</b>
      <span className="pvPlace"><Icon name={inv.icon} size={13} /> {inv.place}</span>
      <div className="pvFoot">
        <small>{count} {count === 1 ? "hund blir med" : "hunder blir med"}</small>
        <button type="button" className={"pvJoin" + (on ? " done" : "")} onClick={() => setOn(!on)} aria-pressed={on}>
          {on ? <><Icon name="check" size={13} stroke={2.8} /> Du er med</> : "Jeg blir med"}
        </button>
      </div>
    </div>
  );
}

function PhonePreview({ size = "hero" }) {
  return (
    <div className={"pvPhone " + size} aria-label="Eksempel: slik ser Nå skjer ut i appen">
      <span className="pvBadge">Eksempel</span>
      <div className="pvScreen">
        <div className="pvStatus"><span>9:41</span><span className="pvDots" /></div>
        <div className="pvHead"><PawLogo size={20} /><b>Nå skjer</b><small>Stavanger</small></div>
        <div className="pvAsk">
          <b>Skal dere ut?</b>
          <div className="pvChips"><span><Icon name="walk" size={12} /> Rolig tur</span><span><Icon name="ball" size={12} /> Bare litt lek</span><span><Icon name="coffee" size={12} /> Kaffe + hund</span></div>
        </div>
        <span className="pvBucket"><i /> Nå og snart</span>
        <InvitePreview inv={DEMO_INVITES[0]} />
        <InvitePreview inv={DEMO_INVITES[1]} compact />
        {size === "big" && <InvitePreview inv={DEMO_INVITES[2]} compact />}
      </div>
    </div>
  );
}

/* ---- Seksjoner --------------------------------------------------------- */
function Header() {
  return (
    <header className="wlHeader">
      <div className="wlWrap wlHeaderInner">
        <a className="wlBrand" href="#topp" aria-label="Potesjarm"><PawLogo size={28} /><span>Potesjarm</span></a>
        <a className="wlHeaderCta" href="#bli-med">Bli med tidlig</a>
      </div>
    </header>
  );
}

function Hero() {
  const L = useLanding();
  const city = canonicalCity(L.city);
  return (
    <section className="wlHero" id="topp">
      <div className="wlWrap wlHeroGrid">
        <div className="wlHeroCopy">
          <span className="wlKicker">{city ? city.toUpperCase() : "BY FOR BY"} · FØRSTE 100 HUNDER</span>
          <h1>Hundelivet starter&nbsp;her.</h1>
          <p className="wlLead">Se hvem som skal ut i nærheten, finn spontane treff og bli kjent med hundene og menneskene rundt deg.</p>
          <div id="bli-med" className="wlHeroForm">
            <SignupForm source="hero" cta="Bli en av de første 100" />
          </div>
        </div>
        <div className="wlHeroArt">
          <PhonePreview size="hero" />
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="wlSection wlProblem">
      <div className="wlWrap wlNarrow reveal">
        <h2>Hunden din kjenner kanskje flere i nabolaget enn&nbsp;du&nbsp;gjør.</h2>
        <p className="wlLines">
          <span>Du møter de samme hundene.</span>
          <span>Går de samme rundene.</span>
          <span>Men det er fortsatt vanskelig å faktisk bli kjent.</span>
        </p>
        <p className="wlPunch">Potesjarm gjør terskelen lavere.</p>
      </div>
    </section>
  );
}

function NowFeature() {
  return (
    <section className="wlSection wlNow">
      <div className="wlWrap wlNowGrid">
        <div className="wlNowCopy reveal">
          <span className="wlEyebrow"><i className="wlLiveDot" /> Nå skjer</span>
          <h2>Skal noen ut?</h2>
          <p>Åpne Potesjarm og se spontane turer og treff i nærheten akkurat nå. Trykk <b>Jeg blir med</b> – så er dere to.</p>
          <p className="wlSmall">Eller legg ut selv på sekunder: velg «rolig tur», «bare litt lek» eller «kaffe + hund», når og hvor. Treffet forsvinner av seg selv når det er over.</p>
        </div>
        <div className="wlNowArt reveal">
          <PhonePreview size="big" />
        </div>
      </div>
    </section>
  );
}

function Reasons() {
  return (
    <section className="wlSection wlReasons">
      <div className="wlWrap">
        <div className="wlReason reveal">
          <div className="wlReasonText">
            <span className="wlNum">01</span>
            <h3>Skal noen ut?</h3>
            <p>Finn spontane turer og treff i nærheten – uten å måtte planlegge en uke i forveien.</p>
          </div>
          <div className="wlReasonArt"><InvitePreview inv={DEMO_INVITES[2]} /></div>
        </div>
        <div className="wlReason reveal">
          <div className="wlReasonText">
            <span className="wlNum">02</span>
            <h3>Finn hundevenner</h3>
            <p>Bli kjent med hunder og eiere som passer hverdagen deres – samme tempo, samme runder.</p>
          </div>
          <div className="wlReasonArt">
            <div className="pvDog">
              <span className="pvDogImg">B</span>
              <div>
                <b>Balto</b><small>Schæfer · 5 år · Storhaug</small>
                <div className="pvTraits"><span>Leken</span><span>Lange turer</span><span>Liker valper</span></div>
                <span className="pvAskBtn"><Icon name="walk" size={13} /> Spør om tur</span>
              </div>
            </div>
          </div>
        </div>
        <div className="wlReason reveal">
          <div className="wlReasonText">
            <span className="wlNum">03</span>
            <h3>Gjør turene mer motiverende</h3>
            <p>Spor turene, bygg streak og se hvor langt dere går sammen.</p>
          </div>
          <div className="wlReasonArt">
            <div className="pvMoment">
              <small>LUNA + MICHAEL</small>
              <b>18,4 km</b>
              <span>sammen denne uka · 7 dager på rad</span>
              <div className="pvWeek">{"MTOTFLS".split("").map((d, i) => <i key={i} className={i < 6 ? "on" : ""}>{d}</i>)}</div>
            </div>
          </div>
        </div>
        <p className="wlExample">Illustrasjonene er eksempler på hvordan appen ser ut.</p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: "dog", title: "Lag hundens profil", text: "Navn, rase og hva hunden liker. Tar ett minutt." },
    { icon: "live", title: "Se hva som skjer rundt dere", text: "Turer, treff og hunder i nabolaget – akkurat nå." },
    { icon: "plus", title: "Bli med – eller lag et treff selv", text: "Ett trykk for å bli med. Tre for å invitere." },
  ];
  return (
    <section className="wlSection wlHow">
      <div className="wlWrap">
        <h2 className="reveal">Slik fungerer det</h2>
        <ol className="wlSteps">
          {steps.map((s, i) => (
            <li key={s.title} className="reveal">
              <span className="wlStepIcon"><Icon name={s.icon} size={20} /><i>{i + 1}</i></span>
              <b>{s.title}</b>
              <small>{s.text}</small>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Local() {
  const L = useLanding();
  const city = canonicalCity(L.city);
  return (
    <section className="wlSection wlLocal">
      <div className="wlWrap wlNarrow reveal">
        <h2>By for by. Hund for hund.</h2>
        <p>Potesjarm åpner lokalt. Når hundeeiere i området ditt melder seg på, bygger vi fellesskapet der dere faktisk går tur.</p>
        {city ? (
          <p className="wlCityPill"><Icon name="pin" size={15} /> {city} – jo flere hunder herfra som blir med, jo før åpner vi der.</p>
        ) : (
          <a className="wlCityPill link" href="#bli-med"><Icon name="pin" size={15} /> Hvilken by bor dere i?</a>
        )}
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section className="wlSection wlFounder">
      <div className="wlWrap wlNarrow reveal">
        <span className="wlEyebrow">For de første</span>
        <h2>Vær med fra første tur.</h2>
        <ul className="wlPerks">
          <li><Icon name="check" size={16} stroke={2.6} /> Tidlig tilgang før appen åpner for alle</li>
          <li><Icon name="star" size={16} /> Founder-merke i profilen – for de første 100 hundene i hver by</li>
          <li><Icon name="comment" size={16} /> Være med å bestemme hva vi bygger først</li>
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="wlSection wlFinal">
      <div className="wlWrap wlNarrow">
        <PawLogo size={40} />
        <h2>Skal hunden din være med fra starten?</h2>
        <SignupForm source="bunn" cta="Bli med tidlig" tone="dark" />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="wlFooter">
      <div className="wlWrap wlFooterInner">
        <span className="wlBrand small"><PawLogo size={22} /><span>Potesjarm</span></span>
        <span>Det lokale hundelivet · bygges i Norge</span>
        <a href={`mailto:${WAITLIST_FALLBACK_EMAIL}`}>{WAITLIST_FALLBACK_EMAIL}</a>
      </div>
    </footer>
  );
}

/* ---- Side --------------------------------------------------------------- */
export default function Landing() {
  const rootRef = useRef(null);
  const [attr, setAttr] = useState({});
  const [city, setCity] = useState("");
  const [result, setResult] = useState(null);

  // Fang UTM/ref/by fra lenken (lagres til påmelding, også over reload).
  useEffect(() => {
    const a = captureAttribution();
    setAttr(a);
    if (a.city) setCity(canonicalCity(a.city));
  }, []);

  // Lett scroll-avsløring; faller tilbake på å vise alt.
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".reveal");
    if (!els?.length) return;
    if (typeof IntersectionObserver === "undefined") { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Ctx.Provider value={{ attr, city, setCity, result, setResult }}>
      <div className="wl" ref={rootRef}>
        <Header />
        <main>
          <Hero />
          <Problem />
          <NowFeature />
          <Reasons />
          <HowItWorks />
          <Local />
          <Founder />
          <FinalCta />
        </main>
        <Footer />
        <datalist id="wl-kommuner">{kommuner.map((k) => <option key={k.id} value={k.name} />)}</datalist>
      </div>
    </Ctx.Provider>
  );
}
