"use client";

import { useEffect, useState } from "react";
import Icon, { DogDoodle, PawLogo } from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack, DogAvatar } from "./ui";
import { fmtKm, fmtNum, img, PHOTO } from "../lib/data";
import { placeLabel, placeShort, radiusLabel } from "../lib/geo";
import { MODE } from "../lib/content";

export const NAV = [
  { id: "For deg", icon: "home", color: "blue" },
  { id: "Nå skjer", icon: "live", color: "coral", live: true },
  { id: "Grupper", icon: "users", color: "violet" },
  { id: "Hunder", icon: "dog", color: "sun" },
  { id: "divider" },
  { id: "Kart", icon: "pin", color: "mint" },
  { id: "Aktivitet", icon: "flame", color: "coral" },
  { id: "Arrangementer", icon: "calendar", color: "blue" },
  { id: "Utforsk", icon: "compass", color: "mint" },
];

export function Sidebar() {
  const app = useApp();
  return (
    <aside className="sideNav" aria-label="Hovedmeny">
      <div className="navTop">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); app.setTab("For deg"); }}>
          <PawLogo size={44} />
          <span>Potesjarm</span>
        </a>
        <p className="brandNote hand">Flere poter, flere venner</p>
        <button className="cityChip" onClick={() => app.open("location")} title="Bytt sted">
          <Icon name="pin" size={16} />
          <span>{placeShort(app.location)}</span>
          <Icon name="chevronDown" size={15} />
        </button>
      </div>

      <nav className="navList">
        {NAV.map((n, i) =>
          n.id === "divider" ? (
            <hr key={i} />
          ) : (
            <button
              key={n.id}
              className={"navItem tint-" + n.color + (app.tab === n.id ? " active" : "")}
              onClick={() => app.setTab(n.id)}
              aria-current={app.tab === n.id ? "page" : undefined}
              title={n.id}
            >
              <span className="navIcon"><Icon name={n.icon} size={22} /></span>
              <b>{n.id}</b>
              {n.live && app.stats.meetupsNow > 0 && <i className="navCount">{app.stats.meetupsNow}</i>}
            </button>
          )
        )}
      </nav>

      <div className="navBottom">
        <button className="navCta" onClick={() => app.open("meetupComposer")}>
          <Icon name="plus" size={22} stroke={2.6} />
          <span>Lag treff</span>
        </button>
        <div className="navUtility">
          <button onClick={() => app.open("invite")} title="Inviter hundeeiere"><Icon name="gift" size={17} /><span>Inviter</span></button>
          <button onClick={() => app.open("safety")} title="Trygghet"><Icon name="shield" size={17} /><span>Trygghet</span></button>
        </div>
        <div className="navProfile">
          <button className="navProfileMain" onClick={() => app.open("profile")}>
            <DogAvatar me size={42} ring="mint" />
            <span>
              <b>{app.me.dogName || "Din hund"}</b>
              <small>Min profil <Icon name="arrowRight" size={12} /></small>
            </span>
          </button>
          <button className="navGear" onClick={() => app.open("settings")} title="Innstillinger"><Icon name="settings" size={19} /></button>
        </div>
        <div className="navDoodle">
          <DogDoodle />
          <p className="hand">Hundeliv er bedre sammen ♡</p>
        </div>
      </div>
    </aside>
  );
}

function greeting(h) {
  if (h < 5) return "God natt";
  if (h < 10) return "God morgen";
  if (h < 17) return "God dag";
  return "God kveld";
}

const TITLES = {
  "Nå skjer": ["NÅ SKJER", "Skjer rundt deg nå", "Spontane turer og treff som utløper av seg selv."],
  Grupper: ["FELLESSKAP", "Grupper", "Finn flokken din – rase, aktivitet eller nabolag."],
  Hunder: ["HUNDEVENNER", "Hunder i nærheten", "Finn turvenner med samme tempo, energi og lekestil."],
  Kart: ["RUNDT DEG", "Kart", "Turområder, treff og steder i nærheten."],
  Aktivitet: ["DIN FREMGANG", "Aktivitet", "Streak, utfordringer og merker – hver tur teller."],
  Arrangementer: ["SKJER SNART", "Arrangementer", "Fellesturer, valpetreff og sosiale samlinger."],
  Utforsk: ["OPPDAG LOKALT", "Utforsk", "Turområder og nyttig info for hundeeiere."],
};

export function TopBar() {
  const app = useApp();
  const [hello, setHello] = useState("God dag");
  useEffect(() => setHello(greeting(new Date().getHours())), []);
  const home = app.tab === "For deg";
  const [kicker, title, sub] = home
    ? ["LOKALT HUNDEFELLESSKAP", `${hello}, ${placeShort(app.location)}`, null]
    : TITLES[app.tab] || ["", app.tab, ""];
  return (
    <header className="topBar">
      <div className="topTitle">
        <span className="kicker">{kicker}</span>
        <h1>
          {title}
          {home && <SunDoodle />}
        </h1>
        <p className="topSub">
          {home ? (
            app.me.isNew
              ? <>Velkommen! Her bygger vi hundefellesskapet i <b>{app.kommune?.name}</b> – helt fra start.</>
              : <>Turer, treff og hundevenner innenfor <b>{radiusLabel(app.location)}</b>.</>
          ) : sub}
        </p>
      </div>
      <div className="topActions">
        <button className="searchBar" onClick={() => app.open("search")}>
          <Icon name="search" size={19} />
          <span>Søk etter steder, hunder eller treff…</span>
        </button>
        <button className="iconBtn searchOnly" onClick={() => app.open("search")} aria-label="Søk"><Icon name="search" /></button>
        <button className="iconBtn" onClick={() => app.open("notifications")} aria-label="Varsler">
          <Icon name="bell" />
          {app.notifications.length > 0 && <i className="redDot" />}
        </button>
        <button className="iconBtn" onClick={() => app.open("inbox")} aria-label="Meldinger"><Icon name="mail" /></button>
      </div>
    </header>
  );
}

export function SunDoodle() {
  return (
    <svg className="sunDoodle" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="#ffb627" strokeWidth="3.4" strokeLinecap="round">
      <circle cx="32" cy="34" r="11" />
      <path d="M32 9v7M32 52v4M9 34h6M50 34h7M15 17l5 5M44 46l4 4M15 51l5-5M45 21l5-5" />
    </svg>
  );
}

/**
 * Demo-modus skal aldri kunne forveksles med ekte data.
 * Så lenge den er på, ligger dette båndet synlig øverst.
 */
export function DemoBanner() {
  const app = useApp();
  if (!app.isDemo) return null;
  return (
    <div className="demoBanner">
      <Icon name="sparkle" size={15} />
      <span><b>Demo</b> · innholdet er oppdiktet</span>
      <button onClick={() => app.setMode(MODE.LIVE)}>Vis ekte data</button>
    </div>
  );
}

const WEEK = ["M", "T", "O", "T", "F", "L", "S"];

export function RightRail() {
  const app = useApp();
  const me = app.me;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const ch = app.challengeProgress.find((c) => !c.done) || app.challengeProgress[0];
  const nextEvents = app.events.slice(0, 3);

  return (
    <aside className="rightRail">
      {/* Streak – alltid brukerens egne, faktiske tall. */}
      <section className="railCard streakCard">
        <div className="railHead">
          <h3>Din turstreak <Icon name="paw" size={18} className="paw" /></h3>
          <b className="streakCount">
            <Icon name="flame" size={20} className="flame" fill={me.streak > 0 ? "currentColor" : "none"} stroke={1.5} /> {me.streak} {me.streak === 1 ? "dag" : "dager"}
          </b>
        </div>
        <div className="weekPaws">
          {WEEK.map((d, i) => {
            const done = i < todayIdx && me.streak > todayIdx - i;
            const isToday = i === todayIdx;
            const todayDone = isToday && me.todayMinutes > 0;
            return (
              <span key={i} className={done || todayDone ? "done" : isToday ? "today" : ""}>
                <i><Icon name="paw" size={17} fill={done || todayDone ? "currentColor" : "none"} stroke={done || todayDone ? 1.2 : 1.8} /></i>
                <small>{d}</small>
              </span>
            );
          })}
        </div>
        <div className="streakFoot">
          <p>
            {me.todayMinutes > 0
              ? "Dagens tur er registrert. Bra jobba!"
              : me.streak > 0
                ? <>Én tur i dag holder streaken på {me.streak} dager i live.</>
                : "Start din første tur, så begynner streaken."}
          </p>
          <button className="pillBtn primary small" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start tur</button>
        </div>
      </section>

      {/* Ukens utfordring – fremgang regnet ut fra egne turer. */}
      {ch && (
        <section className="railCard challengeCard" onClick={() => app.setTab("Aktivitet")} role="button" tabIndex={0}>
          <div className="railHead">
            <h3>Din utfordring</h3>
            <span className="linkish">Se alle <Icon name="arrowRight" size={14} /></span>
          </div>
          <div className="challengeBody">
            <div className="challengeText">
              <b><span className="chIcon"><Icon name={ch.icon} size={16} /></span>{ch.title}</b>
              <div className="bar"><i style={{ width: Math.min(100, (ch.progress / ch.target) * 100) + "%" }} /></div>
              <small>
                <span>{fmtKm(ch.progress)} av {ch.target} {ch.unit}</span>
                <span>+{ch.reward} poter</span>
              </small>
            </div>
            <img className="challengeDog" src={img(PHOTO.max, 260, 260)} alt="" />
          </div>
        </section>
      )}

      {/* Arrangementer – bare hvis de finnes på ekte. */}
      <section className="railCard eventsCard">
        <div className="railHead">
          <h3>Skjer snart</h3>
          {nextEvents.length > 0 && (
            <button className="linkish" onClick={() => app.setTab("Arrangementer")}>Se alle <Icon name="arrowRight" size={14} /></button>
          )}
        </div>
        {nextEvents.length === 0 ? (
          <div className="railEmpty">
            <p>Ingen arrangementer i {app.kommune?.name} ennå.</p>
            <button className="pillBtn soft small" onClick={() => app.open("eventComposer")}>
              <Icon name="plus" size={15} stroke={2.6} /> Lag det første
            </button>
          </div>
        ) : (
          <div className="railEvents">
            {nextEvents.map((e) => (
              <button key={e.id} className="railEvent" onClick={() => app.open("event", e.id)}>
                {e.photo ? <img src={img(e.photo, 160, 160)} alt="" /> : <span className="railEventIcon"><Icon name="calendar" size={20} /></span>}
                <span className="dateChip"><b>{e.day}</b><small>{e.month}</small></span>
                <span className="railEventText">
                  <b>{e.title}</b>
                  <small>{e.weekday} {e.time} · {e.place}</small>
                  <span className="railEventGoing">
                    {e.faces?.length > 0 && <AvatarStack ids={e.faces} size={20} />}
                    {e.going + (app.eventGoing[e.id] && !e.mine ? 1 : 0)} påmeldt
                  </span>
                </span>
                <Icon name="chevronRight" size={18} className="chev" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Oppdag – seed-steder er ekte, offentlig informasjon. */}
      <section className="railCard discoverCard" style={{ backgroundImage: `linear-gradient(180deg,rgba(18,24,78,.58) 0%,rgba(18,24,78,.1) 55%,rgba(18,24,78,.55) 100%),url(${img(PHOTO.fjord, 700)})` }}>
        <h3>{app.stats.places > 0 ? `${app.stats.places} turområder i ${app.kommune?.name}` : `Turområder i ${app.kommune?.name}`}</h3>
        <p>Offentlige turområder fra Potesjarm-guiden.</p>
        <button className="pillBtn white" onClick={() => app.setTab("Utforsk")}><Icon name="compass" size={17} /> Utforsk</button>
        <SunDoodle />
      </section>
    </aside>
  );
}

export function MobileHeader() {
  const app = useApp();
  return (
    <header className="mobileHeader">
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); app.setTab("For deg"); }}>
        <PawLogo size={32} />
        <span>Potesjarm</span>
      </a>
      <div className="mobileActions">
        <button className="cityChip light" onClick={() => app.open("location")}>
          <Icon name="pin" size={14} />{placeShort(app.location)}
        </button>
        <button className="iconBtn" onClick={() => app.open("notifications")} aria-label="Varsler">
          <Icon name="bell" size={19} />
          {app.notifications.length > 0 && <i className="redDot" />}
        </button>
        <button className="iconBtn" onClick={() => app.open("inbox")} aria-label="Meldinger"><Icon name="mail" size={19} /></button>
      </div>
    </header>
  );
}

export function BottomNav() {
  const app = useApp();
  const item = (id, icon, label) => (
    <button className={app.tab === id ? "active" : ""} onClick={() => app.setTab(id)}>
      <Icon name={icon} size={23} /><small>{label}</small>
    </button>
  );
  return (
    <nav className="bottomNav" aria-label="Mobilmeny">
      {item("For deg", "home", "Hjem")}
      {item("Nå skjer", "live", "Nå skjer")}
      <button className="bottomCta" onClick={() => app.open("meetupComposer")} aria-label="Lag treff">
        <span><Icon name="plus" size={26} stroke={2.6} /></span><small>Lag treff</small>
      </button>
      {item("Grupper", "users", "Grupper")}
      <button className={["Hunder", "Kart", "Aktivitet", "Arrangementer", "Utforsk"].includes(app.tab) ? "active" : ""} onClick={() => app.open("more")}>
        <Icon name="grid" size={23} /><small>Mer</small>
      </button>
    </nav>
  );
}
