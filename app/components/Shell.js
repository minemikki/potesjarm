"use client";

import { useEffect, useState } from "react";
import Icon, { DogDoodle, PawLogo } from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack } from "./ui";
import { challenges, dogById, img, ME, PHOTO } from "../lib/data";

export const NAV = [
  { id: "For deg", icon: "home", color: "blue" },
  { id: "Nå skjer", icon: "live", color: "coral", badge: "live" },
  { id: "Grupper", icon: "users", color: "violet" },
  { id: "Hunder", icon: "dog", color: "sun" },
  { id: "divider" },
  { id: "Kart", icon: "pin", color: "mint" },
  { id: "Aktivitet", icon: "flame", color: "coral", dot: true },
  { id: "Arrangementer", icon: "calendar", color: "blue" },
  { id: "Utforsk", icon: "compass", color: "mint" },
];

export function Sidebar() {
  const app = useApp();
  const liveCount = app.meetups.filter((m) => m.startsIn <= 30).length;
  return (
    <aside className="sideNav" aria-label="Hovedmeny">
      <div className="navTop">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); app.setTab("For deg"); }}>
          <PawLogo size={44} />
          <span>Potesjarm</span>
        </a>
        <p className="brandNote hand">Flere poter, flere venner<br />– et gladere {app.city} ♡</p>
        <button className="cityChip" onClick={() => app.open("city")} title="Bytt by">
          <Icon name="pin" size={16} />
          <span>{app.city}</span>
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
              {n.badge && liveCount > 0 && <i className="navCount">{liveCount}</i>}
              {n.dot && <i className="navDot" />}
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
          <button onClick={() => app.open("invite")} title="Inviter venner"><Icon name="gift" size={17} /><span>Inviter</span></button>
          <button onClick={() => app.open("safety")} title="Trygghet"><Icon name="shield" size={17} /><span>Trygghet</span></button>
        </div>
        <div className="navProfile">
          <button className="navProfileMain" onClick={() => app.open("profile")}>
            <Avatar src={ME.photo} size={42} ring="mint" />
            <span>
              <b>{ME.owner} & {app.profile.name}</b>
              <small>Min profil <Icon name="arrowRight" size={12} /></small>
            </span>
          </button>
          <button className="navGear" onClick={() => app.open("settings")} title="Innstillinger"><Icon name="settings" size={19} /></button>
        </div>
        <div className="navDoodle">
          <DogDoodle />
          <p className="hand">Sammen skaper vi et gladere hundeliv i {app.city} ♡</p>
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
  "Nå skjer": ["NÅ SKJER", "Skjer rundt deg nå", "Spontane turer og treff fra hundefolk i nærheten."],
  Grupper: ["FELLESSKAP", "Grupper", "Finn flokken din – rase, aktivitet eller nabolag."],
  Hunder: ["HUNDEVENNER", "Hunder i nærheten", "Finn turvenner med samme tempo, energi og lekestil."],
  Kart: ["RUNDT DEG", "Kart", "Treff, hundeparker og turstier i nabolaget."],
  Aktivitet: ["DIN FREMGANG", "Aktivitet", "Streaks, utfordringer og merker – hver tur teller."],
  Arrangementer: ["SKJER SNART", "Arrangementer", "Fellesturer, valpetreff og sosiale samlinger."],
  Utforsk: ["OPPDAG LOKALT", "Utforsk", "Steder, ruter og trygghet – anbefalt av hundefolk."],
};

export function TopBar() {
  const app = useApp();
  const [hello, setHello] = useState("God morgen");
  useEffect(() => setHello(greeting(new Date().getHours())), []);
  const home = app.tab === "For deg";
  const [kicker, title, sub] = home
    ? ["LOKALT HUNDEFELLESSKAP", `${hello}, ${app.city}`, null]
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
          {home ? <>Nye turer, nye venner og lykkeligere hunder – rett i <b>nabolaget</b> ditt.</> : sub}
        </p>
      </div>
      <div className="topActions">
        <button className="searchBar" onClick={() => app.open("search")}>
          <Icon name="search" size={19} />
          <span>Søk etter turer, steder, hunder eller mennesker…</span>
        </button>
        <button className="iconBtn searchOnly" onClick={() => app.open("search")} aria-label="Søk"><Icon name="search" /></button>
        <button className="iconBtn" onClick={() => app.open("notifications")} aria-label="Varsler"><Icon name="bell" /><i className="redDot" /></button>
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

const WEEK = ["M", "T", "O", "T", "F", "L", "S"];

export function RightRail() {
  const app = useApp();
  const todayIdx = 6;
  const ch = challenges[0];
  return (
    <aside className="rightRail">
      <section className="railCard streakCard">
        <div className="railHead">
          <h3>Din turstreak <Icon name="paw" size={18} className="paw" /></h3>
          <b className="streakCount"><Icon name="flame" size={20} className="flame" fill="currentColor" stroke={1.5} /> {app.streak} dager</b>
        </div>
        <div className="weekPaws">
          {WEEK.map((d, i) => {
            const done = i < todayIdx || app.streak > 18;
            return (
              <span key={i} className={done ? "done" : i === todayIdx ? "today" : ""}>
                <i><Icon name="paw" size={17} fill={done ? "currentColor" : "none"} stroke={done ? 1.2 : 1.8} /></i>
                <small>{d}</small>
              </span>
            );
          })}
        </div>
        <div className="streakFoot">
          <p>{app.streak > 18 ? "Dagens tur er registrert. Sterkt!" : <>Du er i flyt! {app.streak} dager på rad med turer.</>}</p>
          <button className="pillBtn primary small" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start tur</button>
        </div>
      </section>

      <section className="railCard challengeCard" onClick={() => app.setTab("Aktivitet")} role="button" tabIndex={0}>
        <div className="railHead">
          <h3>Ukens utfordring</h3>
          <span className="linkish">Se alle <Icon name="arrowRight" size={14} /></span>
        </div>
        <div className="challengeBody">
          <div className="challengeText">
            <b><span className="chIcon"><Icon name="pin" size={16} /></span>{ch.title}</b>
            <div className="bar"><i style={{ width: (ch.progress / ch.target) * 100 + "%" }} /></div>
            <small><span>{ch.progress} av {ch.target} fullført</span><span>{ch.end}</span></small>
          </div>
          <img className="challengeDog" src={img(PHOTO.max, 260, 260)} alt="" />
        </div>
      </section>

      <section className="railCard eventsCard">
        <div className="railHead">
          <h3>Skjer snart</h3>
          <button className="linkish" onClick={() => app.setTab("Arrangementer")}>Se alle <Icon name="arrowRight" size={14} /></button>
        </div>
        <div className="railEvents">
          {app.events.slice(0, 3).map((e) => (
            <button key={e.id} className="railEvent" onClick={() => app.open("event", e.id)}>
              <img src={img(e.photo, 160, 160)} alt="" />
              <span className="dateChip"><b>{e.day}</b><small>{e.month}</small></span>
              <span className="railEventText">
                <b>{e.title}</b>
                <small>{e.weekday} {e.time} · {e.place}</small>
                <span className="railEventGoing"><AvatarStack ids={e.faces} size={20} /> {e.going + (app.eventGoing[e.id] ? 1 : 0)} hunder</span>
              </span>
              <Icon name="chevronRight" size={18} className="chev" />
            </button>
          ))}
        </div>
      </section>

      <section className="railCard discoverCard" style={{ backgroundImage: `linear-gradient(180deg,rgba(18,24,78,.58) 0%,rgba(18,24,78,.1) 55%,rgba(18,24,78,.55) 100%),url(${img(PHOTO.fjord, 700)})` }}>
        <h3>Oppdag nye turfavoritter i {app.city}</h3>
        <p>Hundevennlige turer, skjulte perler og lokale tips.</p>
        <button className="pillBtn white" onClick={() => app.setTab("Kart")}><Icon name="map" size={17} /> Åpne kart</button>
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
        <button className="cityChip light" onClick={() => app.open("city")}><Icon name="pin" size={14} />{app.city}<Icon name="chevronDown" size={13} /></button>
        <button className="iconBtn" onClick={() => app.open("notifications")} aria-label="Varsler"><Icon name="bell" size={19} /><i className="redDot" /></button>
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

export function dogName(id) {
  return dogById(id)?.name || id;
}
