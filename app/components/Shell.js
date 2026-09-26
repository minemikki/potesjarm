"use client";

import Icon, { PawLogo } from "./Icon";
import { useApp } from "./store";
import { Avatar, DogAvatar } from "./ui";
import { fmtKm } from "../lib/data";
import { placeShort } from "../lib/geo";
import { badgeText } from "../lib/notifications";
import { MODE } from "../lib/content";
import { goingCount, meetupBucket, startLabel } from "../lib/today";

/*
 * Navigasjon. Ikke alle funksjoner er like viktige:
 *  - PRIMÆR: det man gjør ofte (hjem, hva skjer, hunder, grupper, kart, aktivitet)
 *  - SEKUNDÆR: planlagt/oppslag (arrangementer, utforsk)
 * «For deg» er fortsatt fane-id-en internt; brukeren ser «Hjem».
 */
export const NAV = [
  { id: "For deg", label: "Hjem", icon: "home" },
  { id: "Nå skjer", label: "Nå skjer", icon: "live", live: true },
  { id: "Hunder", label: "Hunder", icon: "dog" },
  { id: "Grupper", label: "Grupper", icon: "users" },
  { id: "Kart", label: "Kart", icon: "pin" },
  { id: "Aktivitet", label: "Aktivitet", icon: "flame" },
];
export const NAV_SECONDARY = [
  { id: "Arrangementer", label: "Arrangementer", icon: "calendar" },
  { id: "Utforsk", label: "Utforsk", icon: "compass" },
];

const unreadMessages = (app) => (app.conversations || []).reduce((n, c) => n + (c.unread || 0), 0);

export function Sidebar() {
  const app = useApp();
  const item = (n, secondary) => (
    <button
      key={n.id}
      className={"navItem" + (secondary ? " secondary" : "") + (app.tab === n.id ? " active" : "")}
      onClick={() => app.setTab(n.id)}
      aria-current={app.tab === n.id ? "page" : undefined}
      title={n.id}
    >
      <span className="navIcon"><Icon name={n.icon} size={secondary ? 19 : 22} /></span>
      <b>{n.label}</b>
      {n.live && app.stats.meetupsNow > 0 && <i className="navCount">{app.stats.meetupsNow}</i>}
    </button>
  );
  return (
    <aside className="sideNav v2" aria-label="Hovedmeny">
      <div className="navTop">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); app.setTab("For deg"); }}>
          <PawLogo size={40} />
          <span>Potesjarm</span>
        </a>
        <button className="cityChip" onClick={() => app.open("location")} title="Bytt sted">
          <Icon name="pin" size={16} />
          <span>{placeShort(app.location)}</span>
          <Icon name="chevronDown" size={15} />
        </button>
      </div>

      <nav className="navList">
        {NAV.map((n) => item(n))}
        <hr />
        {NAV_SECONDARY.map((n) => item(n, true))}
      </nav>

      <div className="navBottom">
        <button className="navCta" onClick={() => app.open("meetupComposer")}>
          <Icon name="plus" size={20} stroke={2.6} />
          <span>Lag treff</span>
        </button>
        <div className="navProfile">
          <button className="navProfileMain" onClick={() => app.open("profile")}>
            <DogAvatar me size={40} ring="mint" />
            <span>
              <b>{app.me.dogName || "Din hund"}</b>
              <small>Min profil</small>
            </span>
          </button>
          <button className="navGear" onClick={() => app.open("settings")} title="Innstillinger" aria-label="Innstillinger"><Icon name="settings" size={19} /></button>
        </div>
      </div>
    </aside>
  );
}

/* Sidetitler: korte og menneskelige. Hjem og Kart eier sin egen topp. */
const TITLES = {
  "Nå skjer": ["Nå skjer", "Spontane treff i dag – de forsvinner av seg selv når de er over."],
  Grupper: ["Grupper", "Små lokale miljøer: nabolag, rase og aktivitet."],
  Hunder: ["Hunder i nærheten", "Hunder dere kan møte på tur, rett rundt hjørnet."],
  Kart: ["Kart", ""],
  Aktivitet: ["Aktivitet", "Historien om dere – turer, streak og milepæler."],
  Arrangementer: ["Arrangementer", "Planlagt og litt større: fellesturer, kurs og samlinger du melder deg på i forkant."],
  Utforsk: ["Utforsk", "Nye ting å gjøre med hunden din i nærheten."],
};

export function TopBar() {
  const app = useApp();
  // Hjem eier sin egen hilsen – her viser vi bare handlingene (søk/varsler/meldinger).
  if (app.tab === "For deg") {
    return (
      <header className="topBar home">
        <TopActions />
      </header>
    );
  }
  const [title, sub] = TITLES[app.tab] || [app.tab, ""];
  return (
    <header className="topBar">
      <div className="topTitle">
        <h1>{title}</h1>
        {sub && <p className="topSub">{sub}</p>}
      </div>
      <TopActions />
    </header>
  );
}

function TopActions() {
  const app = useApp();
  const msgs = unreadMessages(app);
  return (
    <div className="topActions">
      <button className="searchBar" onClick={() => app.open("search")}>
        <Icon name="search" size={19} />
        <span>Søk etter steder, hunder eller treff…</span>
      </button>
      <button className="iconBtn searchOnly" onClick={() => app.open("search")} aria-label="Søk"><Icon name="search" /></button>
      <BellButton />
      <button className="iconBtn" onClick={() => app.open("inbox")} aria-label="Meldinger">
        <Icon name="mail" />
        {msgs > 0 && <i className="countBadge">{badgeText(msgs)}</i>}
      </button>
    </div>
  );
}

function BellButton({ size }) {
  const app = useApp();
  return (
    <button className="iconBtn" onClick={() => app.open("notifications")} aria-label="Varsler">
      <Icon name="bell" size={size} />
      {app.backend
        ? (app.notifUnread > 0 && <i className="countBadge">{badgeText(app.notifUnread)}</i>)
        : (app.notifications.length > 0 && <i className="redDot" />)}
    </button>
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
      <span><b>Demo</b> · oppdiktet innhold</span>
      <button onClick={() => app.setMode(MODE.LIVE)}>Vis ekte data</button>
    </div>
  );
}

/* =========================================================================
   Høyre-rail på desktop: hver side har sin egen, eller ingen.
   ========================================================================= */
const WEEK = ["M", "T", "O", "T", "F", "L", "S"];
const RAIL_TABS = new Set(["For deg", "Nå skjer", "Grupper", "Aktivitet", "Hunder", "Arrangementer"]);
export const hasRail = (tab) => RAIL_TABS.has(tab);

export function RightRail() {
  const app = useApp();
  if (!hasRail(app.tab) || app.groupId) return null;
  return (
    <aside className="rightRail v2">
      {app.tab === "For deg" && <><StreakRail /><ChallengeRail scope="daglig" /></>}
      {app.tab === "Nå skjer" && <TonightRail />}
      {app.tab === "Grupper" && <MyGroupsRail />}
      {app.tab === "Aktivitet" && <ChallengeRail scope="ukentlig" title="Ukemål" all />}
      {app.tab === "Hunder" && <FollowingRail />}
      {app.tab === "Arrangementer" && <SignedUpRail />}
    </aside>
  );
}

function StreakRail() {
  const app = useApp();
  const me = app.me;
  const todayIdx = (new Date().getDay() + 6) % 7;
  return (
    <section className="rail2 streak">
      <div className="rail2Head">
        <h3>Uka deres</h3>
        <b className="streakCount"><Icon name="flame" size={17} fill={me.streak > 0 ? "currentColor" : "none"} stroke={1.6} /> {me.streak} {me.streak === 1 ? "dag" : "dager"}</b>
      </div>
      <div className="weekPaws">
        {WEEK.map((d, i) => {
          const done = i < todayIdx && me.streak > todayIdx - i;
          const todayDone = i === todayIdx && me.todayMinutes > 0;
          return (
            <span key={i} className={done || todayDone ? "done" : i === todayIdx ? "today" : ""}>
              <i><Icon name="paw" size={15} fill={done || todayDone ? "currentColor" : "none"} stroke={done || todayDone ? 1.2 : 1.8} /></i>
              <small>{d}</small>
            </span>
          );
        })}
      </div>
      <p className="rail2Text">
        {me.todayMinutes > 0 ? "Dagens tur er med. Godt jobba, dere to." : me.streak > 0 ? "Én tur i dag holder rekka i gang." : "Første tur starter rekka."}
      </p>
      <button className="pillBtn primary small" onClick={app.startWalk}><Icon name="play" size={13} fill="currentColor" stroke={0} /> {me.todayMinutes > 0 ? "Start en tur til" : "Start tur"}</button>
    </section>
  );
}

function ChallengeRail({ scope, title = "Dagens lille mål", all }) {
  const app = useApp();
  const list = app.challengeProgress.filter((c) => c.scope === scope);
  const shown = all ? list : list.filter((c) => !c.done).slice(0, 1);
  if (!shown.length) return null;
  return (
    <section className="rail2">
      <div className="rail2Head"><h3>{title}</h3></div>
      <div className="rail2List">
        {shown.map((c) => (
          <div key={c.id} className={"goalRow" + (c.done ? " done" : "")}>
            <span className={"goalIcon tint-" + c.color}><Icon name={c.done ? "check" : c.icon} size={15} /></span>
            <div>
              <b>{c.title}</b>
              <i className="todayBar"><i style={{ width: Math.min(100, (c.progress / c.target) * 100) + "%" }} /></i>
              <small>
                {c.progress > 0
                  ? <>{c.unit === "km" ? fmtKm(c.progress) : c.progress} av {c.target} {c.unit}</>
                  : <>{c.target} {c.unit} ute sammen</>}
                <span className="goalPaws"> · +{c.reward} poter</span>
              </small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TonightRail() {
  const app = useApp();
  const later = app.meetups.filter((m) => ["today", "tonight"].includes(meetupBucket(m.startsIn)));
  return (
    <section className="rail2">
      <div className="rail2Head"><h3>I kveld</h3></div>
      {later.length === 0 ? (
        <p className="rail2Text">Ingenting planlagt senere i dag ennå. Et kveldstreff trenger bare én annen hund.</p>
      ) : (
        <div className="rail2List">
          {later.map((m) => (
            <button key={m.id} className="railRow" onClick={() => app.open("meetup", m.id)}>
              <time>{startLabel(m.startsIn).replace("kl. ", "")}</time>
              <span><b>{m.title}</b><small>{(m.place || "").split(",")[0]} · {goingCount(m, !!app.going[m.id])} med</small></span>
            </button>
          ))}
        </div>
      )}
      <button className="pillBtn soft small" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={14} stroke={2.6} /> Lag et kveldstreff</button>
      <p className="rail2Fine">Nå skjer = spontant og i dag. Planlagte fellesturer ligger under Arrangementer.</p>
    </section>
  );
}

function MyGroupsRail() {
  const app = useApp();
  const mine = app.groups.filter((g) => app.joinedGroups[g.id]);
  return (
    <section className="rail2">
      <div className="rail2Head"><h3>Mine grupper</h3></div>
      {mine.length === 0 ? (
        <p className="rail2Text">Du er ikke med i noen grupper ennå. Bli med i én, så dukker den opp her.</p>
      ) : (
        <div className="rail2List">
          {mine.map((g) => (
            <button key={g.id} className="railRow" onClick={() => app.openGroup(g.id)}>
              <Avatar src={g.photo} name={g.name} size={34} square />
              <span><b>{g.name}</b><small>{g.members ? `${g.members} ${g.members === 1 ? "medlem" : "medlemmer"}` : "Ny gruppe"}</small></span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function FollowingRail() {
  const app = useApp();
  const followed = app.dogs.filter((d) => app.followed[d.id]);
  return (
    <section className="rail2">
      <div className="rail2Head"><h3>Du følger</h3></div>
      {followed.length === 0 ? (
        <p className="rail2Text">Trykk på hjertet på en hund for å følge turene deres.</p>
      ) : (
        <div className="rail2List">
          {followed.map((d) => (
            <button key={d.id} className="railRow" onClick={() => app.openDog(d.id)}>
              <Avatar src={d.photo} name={d.name} size={34} />
              <span><b>{d.name}</b><small>{[d.breed, d.age].filter(Boolean).join(" · ")}</small></span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function SignedUpRail() {
  const app = useApp();
  const mine = app.events.filter((e) => app.eventGoing[e.id] || e.mine);
  return (
    <section className="rail2">
      <div className="rail2Head"><h3>Du er påmeldt</h3></div>
      {mine.length === 0 ? (
        <p className="rail2Text">Ingen påmeldinger ennå. Arrangementer er planlagt i forkant – for spontane turer, se Nå skjer.</p>
      ) : (
        <div className="rail2List">
          {mine.map((e) => (
            <button key={e.id} className="railRow" onClick={() => app.open("event", e.id)}>
              <span className="dateChip"><b>{e.day}</b><small>{e.month}</small></span>
              <span><b>{e.title}</b><small>{e.weekday} {e.time} · {e.place}</small></span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/* =========================================================================
   Mobil: rolig topp (kontekst til venstre, varsler + deg til høyre)
   ========================================================================= */
export function MobileHeader() {
  const app = useApp();
  return (
    <header className="mobileHeader v2">
      <button className="mhContext" onClick={() => app.open("location")} aria-label="Bytt sted">
        <PawLogo size={28} />
        <span>{placeShort(app.location)}</span>
        <Icon name="chevronDown" size={15} />
      </button>
      <div className="mobileActions">
        <BellButton size={20} />
        <button className="mhAvatar" onClick={() => app.open("profile")} aria-label="Min profil">
          <DogAvatar me size={34} />
        </button>
      </div>
    </header>
  );
}

export function BottomNav() {
  const app = useApp();
  const msgs = unreadMessages(app);
  const item = (id, icon, label) => (
    <button className={app.tab === id ? "active" : ""} onClick={() => app.setTab(id)} aria-current={app.tab === id ? "page" : undefined}>
      <span className="bnIcon"><Icon name={icon} size={22} /></span><small>{label}</small>
    </button>
  );
  const inMore = ["Hunder", "Kart", "Aktivitet", "Arrangementer", "Utforsk"].includes(app.tab);
  return (
    <nav className="bottomNav v2" aria-label="Mobilmeny">
      {item("For deg", "home", "Hjem")}
      {item("Nå skjer", "live", "Nå skjer")}
      <button className="bottomCta" onClick={() => app.open("meetupComposer")} aria-label="Lag treff">
        <span className="bnCta"><Icon name="plus" size={22} stroke={2.6} /></span><small>Lag treff</small>
      </button>
      {item("Grupper", "users", "Grupper")}
      <button className={inMore ? "active" : ""} onClick={() => app.open("more")}>
        <span className="bnIcon"><Icon name="grid" size={22} />{msgs > 0 && <i className="bnDot" />}</span><small>Mer</small>
      </button>
    </nav>
  );
}
