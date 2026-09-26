"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack, Img, RouteSketch } from "./ui";
import { fmtKm, meetupTypes } from "../lib/data";
import { placeShort } from "../lib/geo";
import { lostDogHoursLeft } from "../lib/lostdog";
import { placeTypes } from "../lib/seed";
import { getDogCommonalities } from "../lib/social";
import {
  goingCount, homeHero, hostOf, inviteSentence, liveStatus, startLabel, streakLine, todayItems, MEETUP_IDEAS,
} from "../lib/today";

function greeting(h) {
  if (h < 5) return "God natt";
  if (h < 10) return "God morgen";
  if (h < 17) return "God dag";
  return "God kveld";
}

/** Klokka på klienten (unngår at bygge-tid havner i HTML-en). */
function useHello() {
  const [hello, setHello] = useState("Hei");
  useEffect(() => setHello(greeting(new Date().getHours())), []);
  return hello;
}

/* =========================================================================
   HJEM – hundelivet ditt i dag.
   Rekkefølgen er bevisst: hvem/hvor → hva skjer → dagens viktigste handling
   → dagen din → invitasjoner → hunder → fellesskapet → steder.
   Hver blokk leser ekte state; tomme blokker blir en rolig linje, ikke et kort.
   ========================================================================= */
export default function Home() {
  const app = useApp();
  const hello = useHello();
  const me = app.me;
  const status = liveStatus({ meetups: app.meetups });
  const hero = homeHero({ meetups: app.meetups, going: app.going, todayMinutes: me.todayMinutes });
  const heroId = hero.meetup?.id;
  const others = [...app.meetups].sort((a, b) => (a.startsIn || 0) - (b.startsIn || 0)).filter((m) => m.id !== heroId);
  const today = todayItems({ walks: app.walks, meetups: app.meetups, going: app.going, weekWalks: me.weekWalks });
  const name = me.ownerName?.trim().split(" ")[0];

  // Cold start = ingen ekte lokal aktivitet ennå. Da forteller vi en historie om
  // en begynnelse i stedet for å stable tomme «ingen …»-kort oppå hverandre.
  const noWalks = (app.walks?.length || 0) === 0;
  const cold = app.meetups.length === 0 && app.dogs.length === 0 && app.posts.length === 0 && noWalks;

  return (
    <div className="home2">
      <header className="hello">
        <p className="helloHi">{hello}{name ? `, ${name}` : ""}</p>
        <button className="helloPlace" onClick={() => app.open("location")}>
          Hundelivet i <b>{placeShort(app.location)}</b> <Icon name="chevronDown" size={15} />
        </button>
        <p className={"liveLine " + status.tone}>
          {status.tone === "live" && <i className="liveDot" />}
          {status.text}
        </p>
      </header>

      {app.lostDogLive && <LostBanner />}

      <HomeHero hero={hero} cold={cold} />

      {/* Guidet start høyt oppe – en liten historie, ikke en tung sjekkliste. */}
      {me.isNew && <FirstSteps />}

      {cold ? (
        <>
          <ExploreWithDog />
          <LocalStarter />
          <WeekStoryLine />
        </>
      ) : (
        <>
          {today.length > 0 && <TodayLine items={today} />}

          {others.length > 0 && (
            <section className="sec">
              <div className="secHead">
                <h2>Skjer nær deg</h2>
                <button className="linkish" onClick={() => app.setTab("Nå skjer")}>Alle treff <Icon name="arrowRight" size={14} /></button>
              </div>
              <div className="strip">
                {others.slice(0, 6).map((m) => <InviteCard key={m.id} m={m} compact />)}
              </div>
            </section>
          )}

          {/* Sol-verdi selv uten nettverk: utforsk med hunden din. */}
          <ExploreWithDog />

          {app.dogs.length > 0 && (
            <section className="sec">
              <div className="secHead">
                <h2>Hunder i nærheten</h2>
                <button className="linkish" onClick={() => app.setTab("Hunder")}>Se alle <Icon name="arrowRight" size={14} /></button>
              </div>
              <div className="strip dogs">
                {app.dogs.slice(0, 10).map((d) => <DogTile key={d.id} d={d} />)}
              </div>
            </section>
          )}

          {/* Feeden vises først når det finnes ekte innlegg – aldri et tomt kort. */}
          {app.posts.length > 0 && (
            <section className="sec">
              <div className="secHead">
                <h2>Fra fellesskapet</h2>
                <button className="linkish" onClick={() => app.open("postComposer")}>Del noe <Icon name="plus" size={14} stroke={2.6} /></button>
              </div>
              <div className="feedGrid">
                {app.posts.map((p) => (app.backend ? <FeedPostCard key={p.id} post={p} /> : <PostCard key={p.id} post={p} />))}
              </div>
              {app.backend && app.feedHasMore && (
                <button className="linkish seeMore" onClick={app.loadMoreFeed}>Last flere innlegg</button>
              )}
            </section>
          )}

          {app.dogs.length === 0 && <LocalStarter />}

          {app.places.length > 0 && (
            <section className="sec">
              <div className="secHead">
                <h2>Turområder i {app.kommune?.name}</h2>
                <button className="linkish" onClick={() => app.setTab("Utforsk")}>Utforsk <Icon name="arrowRight" size={14} /></button>
              </div>
              <div className="strip">
                {app.places.slice(0, 6).map((p) => <PlaceMini key={p.id} place={p} />)}
              </div>
            </section>
          )}
        </>
      )}

      <InviteNudge />
    </div>
  );
}

/* ---- Utforsk med hunden din: solo-verdi selv uten nettverk ---- */
function ExploreWithDog() {
  const app = useApp();
  const dog = app.me.dogName?.trim();
  const actions = [
    { icon: "route", tone: "mint", title: "Finn en tur", sub: "Turområder nær deg", go: () => app.setTab("Utforsk") },
    { icon: "pin", tone: "blue", title: "Oppdag et sted", sub: "På kartet", go: () => app.setTab("Kart") },
    { icon: "live", tone: "coral", title: "Lag et treff", sub: "Inviter nabolaget ut", go: () => app.open("meetupComposer") },
  ];
  return (
    <section className="sec">
      <div className="secHead"><h2>Utforsk med {dog || "hunden din"}</h2></div>
      <div className="exploreDog">
        {actions.map((a) => (
          <button key={a.title} className={"exploreCard tint-" + a.tone} onClick={a.go}>
            <span className="exploreIcon"><Icon name={a.icon} size={22} /></span>
            <b>{a.title}</b>
            <small>{a.sub}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---- Lokal start: samme sannhet, bedre psykologi. Ingen fake aktivitet. ---- */
function LocalStarter() {
  const app = useApp();
  const by = app.kommune?.name || "området";
  return (
    <section className="localStarter">
      <div className="localStarterTop">
        <span className="localStarterIcon"><Icon name="sprout" size={22} /></span>
        <div>
          <b>{by} er helt i starten.</b>
          <p>Du er blant de første hundeeierne her. Det første treffet kan starte med dere – ofte holder det med én annen hund.</p>
        </div>
      </div>
      <div className="localStarterActions">
        <button className="pillBtn primary" onClick={() => app.open("meetupComposer")}>Lag {by}s første treff</button>
        <button className="pillBtn soft" onClick={() => app.open("invite")}><Icon name="gift" size={15} /> Inviter en hundevenn</button>
      </div>
      <div className="ideaRow">
        <span className="ideaRowLabel">Idéer å starte med</span>
        {MEETUP_IDEAS.map((idea) => (
          <button key={idea.id} className="ideaChip" onClick={() => app.open("meetupComposer", { intent: idea.intent })}>
            <Icon name={idea.icon} size={15} /> {idea.label}
            <span className="ideaTag">Idé</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---- Uka deres som en begynnelse, ikke en fitness-widget ---- */
function WeekStoryLine() {
  const app = useApp();
  const dog = app.me.dogName?.trim();
  return (
    <section className="weekStart">
      <div className="weekStartDots" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => <i key={i} />)}
      </div>
      <b>Dette er starten på uka deres.</b>
      <p>Ta den første turen, så begynner historien til {dog || "dere"} her – dag for dag.</p>
      <button className="pillBtn primary small" onClick={app.startWalk}>
        <Icon name="play" size={13} fill="currentColor" stroke={0} /> Start første tur
      </button>
    </section>
  );
}

/* ---- Hero: dagens viktigste handling (dynamisk, fra ekte state) ---- */
function HomeHero({ hero, cold }) {
  const app = useApp();
  const me = app.me;
  const m = hero.meetup;

  if (hero.kind === "going" || hero.kind === "join") {
    const host = hostOf(m, app.dogById, app.me);
    const going = !!app.going[m.id] || m.mine;
    const count = goingCount(m, !!app.going[m.id]);
    const when = startLabel(m.startsIn);
    const t = meetupTypes.find((x) => x.id === m.type) || meetupTypes[0];
    return (
      <section className={"hero2 " + (hero.kind === "going" ? "isGoing" : "")}>
        <div className="hero2Body">
          <span className="hero2Kicker">
            {(m.startsIn || 0) <= 10 && <i className="liveDot" />}
            {hero.kind === "going" ? (m.mine ? "Ditt treff" : "Du er med") : when === "nå" ? "Skjer nå" : `Skjer ${when}`}
          </span>
          <h2>{hero.kind === "going" ? m.title : `${inviteSentence(m, host)} ${when}`}</h2>
          <p className="hero2Meta">
            <Icon name={t.icon} size={15} /> {hero.kind === "going" ? `${(m.place || "").split(",")[0]} · ${when}` : m.title}
          </p>
          <div className="hero2Who">
            <Avatar src={host.photo} name={host.dogName || host.name} size={30} />
            <span>
              {host.self ? "Du er vert" : [host.name, host.dogName].filter(Boolean).join(" & ")}
              {count > 0 && <> · {count} {count === 1 ? "hund er med" : "hunder er med"}</>}
            </span>
          </div>
          <div className="hero2Actions">
            {hero.kind === "join" && (
              <button className="pillBtn primary" onClick={() => app.toggleGoing(m.id)}>Jeg blir med</button>
            )}
            <button className={"pillBtn " + (hero.kind === "join" ? "ghostLight" : "white")} onClick={() => app.open("meetup", m.id)}>Se treff</button>
            {hero.kind === "going" && (
              <button className="pillBtn ghostLight" onClick={() => app.startMeetupChat(m.id)}><Icon name="comment" size={16} /> Chat</button>
            )}
          </div>
          {hero.kind === "join" && hero.more > 0 && (
            <button className="hero2More" onClick={() => app.setTab("Nå skjer")}>
              + {hero.more} {hero.more === 1 ? "treff til" : "treff til"} nær deg <Icon name="arrowRight" size={13} />
            </button>
          )}
        </div>
        {going && <span className="hero2Badge"><Icon name="check" size={14} stroke={2.8} /></span>}
      </section>
    );
  }

  if (hero.kind === "walk") {
    // Aller første gang: en personlig, varm velkomst i stedet for et streak-kort.
    const firstEver = (me.totalWalks || 0) === 0;
    if (firstEver) {
      return (
        <section className="hero2 walk cold">
          <div className="hero2Body">
            <span className="hero2Kicker"><Icon name="paw" size={14} /> Nytt kapittel</span>
            <h2>Hva skal {me.dogName || "hunden din"} og du finne på i dag?</h2>
            <p className="hero2Meta">Dere er helt i starten. La oss ta den aller første turen sammen.</p>
            <div className="hero2Actions">
              <button className="pillBtn primary" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start første tur</button>
              <button className="pillBtn ghostLight" onClick={() => app.setTab("Utforsk")}>Finn et sted å gå</button>
            </div>
          </div>
          <span className="hero2Dog"><Avatar src={me.photo} name={me.dogName} size={84} /></span>
        </section>
      );
    }
    return (
      <section className="hero2 walk">
        <div className="hero2Body">
          <span className="hero2Kicker">I dag</span>
          <h2>Klar for dagens tur{me.dogName ? `, ${me.dogName}` : ""}?</h2>
          <p className="hero2Meta">{streakLine({ streak: me.streak, totalWalks: me.totalWalks, walkedToday: false })}</p>
          <div className="hero2Actions">
            <button className="pillBtn primary" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start en tur</button>
            <button className="pillBtn ghostLight" onClick={() => app.open("meetupComposer")}>Gå sammen med noen</button>
          </div>
        </div>
        <span className="hero2Dog"><Avatar src={me.photo} name={me.dogName} size={76} /></span>
      </section>
    );
  }

  return (
    <section className="hero2 create">
      <div className="hero2Body">
        <span className="hero2Kicker">Dagens tur er gått</span>
        <h2>Skal noen ut i kveld?</h2>
        <p className="hero2Meta">Legg ut et treff – ofte holder det med én annen hund.</p>
        <div className="hero2Actions">
          <button className="pillBtn primary" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={16} stroke={2.6} /> Lag et treff</button>
          <button className="pillBtn ghostLight" onClick={app.startWalk}><Icon name="play" size={13} fill="currentColor" stroke={0} /> Start en tur til</button>
        </div>
      </div>
      <span className="hero2Dog"><Avatar src={me.photo} name={me.dogName} size={76} /></span>
    </section>
  );
}

/* ---- I dag: en liten dagbok, bare med ekte ting ---- */
function TodayLine({ items }) {
  const app = useApp();
  return (
    <section className="sec today">
      <div className="secHead"><h2>I dag</h2></div>
      <ol className="todayList">
        {items.map((it) => (
          <li key={it.key} className={"todayItem " + it.kind + (it.done ? " done" : "")}>
            <time>{it.time}</time>
            <span className="todayDot" aria-hidden="true">
              <Icon name={it.kind === "walk" ? "walk" : it.kind === "meetup" ? "live" : it.done ? "check" : "paw"} size={14} />
            </span>
            {it.kind === "meetup" ? (
              <button className="todayText" onClick={() => app.open("meetup", it.id)}><b>{it.title}</b><small>{it.sub}</small></button>
            ) : (
              <span className="todayText">
                <b>{it.title}</b>
                <small>{it.sub}</small>
                {it.kind === "goal" && <i className="todayBar"><i style={{ width: it.progress * 100 + "%" }} /></i>}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---- Tom tilstand som en rolig linje, ikke et stort kort ---- */
export function InlineEmpty({ icon, tone = "blue", title, text, cta, onCta, secondary, onSecondary }) {
  return (
    <div className={"inlineEmpty tint-" + tone}>
      <span className="inlineEmptyIcon"><Icon name={icon} size={20} /></span>
      <div>
        <b>{title}</b>
        {text && <p>{text}</p>}
        {(cta || secondary) && (
          <div className="inlineEmptyActions">
            {cta && <button className="pillBtn primary small" onClick={onCta}>{cta}</button>}
            {secondary && <button className="linkish" onClick={onSecondary}>{secondary}</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Hund som bilde-flis: navn + ett ekte signal ---- */
export function dogSignal(app, d) {
  if (app.followed?.[d.id]) return "Du følger";
  const c = getDogCommonalities(app.me, d, { sameArea: true });
  const pick = c.find((x) => !/Samme område/.test(x)) || c[0];
  if (pick) return pick;
  if (/valp/i.test(d.age || "") || /mnd/.test(d.age || "")) return "Valp";
  return d.age || "";
}

export function DogTile({ d }) {
  const app = useApp();
  return (
    <button className="dogTile" onClick={() => app.openDog(d.id)}>
      <Img id={d.photo} w={260} h={320} className="dogTileImg" brand fallbackLabel={d.name?.charAt(0)} />
      <b>{d.name}</b>
      <small>{dogSignal(app, d)}</small>
    </button>
  );
}

/* ---- Kom i gang: kompakt sjekkliste for nye brukere ---- */
function FirstSteps() {
  const app = useApp();
  const me = app.me;
  const steps = [
    { id: "profil", icon: "dog", title: "Lag hundeprofilen", done: !!me.dogName, action: () => app.open("profile") },
    { id: "tur", icon: "walk", title: "Gå din første tur", done: me.totalWalks > 0, action: app.startWalk },
    { id: "sted", icon: "pin", title: "Lagre et turområde", done: Object.values(app.savedPlaces).some(Boolean), action: () => app.setTab("Utforsk") },
    { id: "inviter", icon: "gift", title: "Inviter en hundeeier", done: app.invitesActivated > 0, action: () => app.open("invite") },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <section className="sec">
      <div className="secHead"><h2>Kom i gang</h2><span className="progressPill">{done} av {steps.length}</span></div>
      <div className="stepList">
        {steps.map((s) => (
          <button key={s.id} className={"stepRow" + (s.done ? " done" : "")} onClick={s.action} disabled={s.done}>
            <span className="stepCheck"><Icon name={s.done ? "check" : s.icon} size={16} stroke={s.done ? 2.8 : 2} /></span>
            <b>{s.title}</b>
            {!s.done && <Icon name="chevronRight" size={16} />}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---- Invite-loop: bare etter en meningsfull handling, lett å avvise ---- */
function InviteNudge() {
  const app = useApp();
  const [hidden, setHidden] = useState(false);
  const earned = app.me.totalWalks > 0 || app.myMeetups?.length > 0 || Object.values(app.going).some(Boolean);
  if (hidden || !earned || app.invitesSent > 0) return null;
  return (
    <section className="nudge">
      <Avatar src={app.me.photo} name={app.me.dogName} size={40} />
      <div>
        <b>Har {app.me.dogName || "hunden din"} en venn som burde være her?</b>
        <small>Hundelivet blir bedre jo flere i nabolaget som er med.</small>
      </div>
      <button className="pillBtn primary small" onClick={() => app.open("invite")}>Inviter</button>
      <button className="ghostIcon" onClick={() => setHidden(true)} aria-label="Ikke nå"><Icon name="x" size={16} /></button>
    </section>
  );
}

function LostBanner() {
  const app = useApp();
  const hoursLeft = lostDogHoursLeft(app.lostDogSince);
  return (
    <div className="lostBanner">
      <span className="lostIcon"><Icon name="alert" size={22} /></span>
      <div>
        <b>{app.me.dogName} er meldt savnet i {app.kommune?.name}</b>
        {app.lostDogNote && <small className="lostNote">Sist sett: {app.lostDogNote}</small>}
        <small>
          Synlig for hundeeiere i nærheten. Del gjerne videre.
          {hoursLeft > 0 ? ` Utløper om ${hoursLeft} t.` : " Utløper snart."}
        </small>
      </div>
      <button className="pillBtn danger small" onClick={() => { app.resolveLostDog(); app.flash("Så godt! Varselet er avsluttet", "heart"); }}>Funnet</button>
    </div>
  );
}

function PlaceMini({ place }) {
  const app = useApp();
  const t = placeTypes[place.type] || placeTypes.tursti;
  return (
    <button className={"placeMini tint-" + t.color} onClick={() => app.open("place", place.id)}>
      <span className="placeMiniIcon"><Icon name={t.icon} size={20} /></span>
      <b>{place.name}</b>
      <small>{t.label}</small>
    </button>
  );
}

/** Kompakt relativ tid ("nå", "5 min", "3 t", "2 d", ellers dato). */
function timeAgo(iso) {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "nå";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} t`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(then).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

/**
 * Ekte innlegg (backend). Delt av hjem-feeden og gruppefeeden. Ekte counts og
 * min egen liked/saved-status – ingen fake social proof. `canModerate` gir
 * slette-tilgang i menyen for gruppeadmin/moderator.
 */
export function FeedPostCard({ post, canModerate = false }) {
  const app = useApp();
  const [burst, setBurst] = useState(false);
  const like = () => {
    if (!post.likedByMe) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    app.likeRealPost(post);
  };
  return (
    <article className={"post kind-" + post.kind}>
      <header className="postHead">
        <button className="postAuthor" onClick={() => post.dogId && app.openDog(post.dogId)}>
          <Avatar src={post.dogPhoto || post.avatar} name={post.dogName || post.author} size={38} />
          <div>
            <b>{post.author}{post.dogName ? ` & ${post.dogName}` : ""}</b>
            <small>{timeAgo(post.createdAt)}{post.groupName ? ` · ${post.groupName}` : ""}</small>
          </div>
        </button>
        <button className="ghostIcon" onClick={() => app.open("postMenu", { ...post, canMod: canModerate })} aria-label="Mer"><Icon name="more" size={20} /></button>
      </header>

      {post.photo && (
        <div className="postMedia" onDoubleClick={like}>
          <Img id={post.photo} w={700} h={520} className="postMediaImg" />
          {burst && <span className="heartBurst"><Icon name="heart" size={64} fill="currentColor" stroke={0} /></span>}
        </div>
      )}

      {post.body && <div className="postBody"><p>{post.body}</p></div>}

      <footer className="postActions">
        <button className={"act" + (post.likedByMe ? " liked" : "")} onClick={like} aria-pressed={post.likedByMe}>
          <Icon name="heart" size={20} fill={post.likedByMe ? "currentColor" : "none"} /> {post.likes || 0}
        </button>
        <button className="act" onClick={() => app.open("comments", post)}>
          <Icon name="comment" size={20} /> {post.comments || 0}
        </button>
        <button className="act" onClick={() => app.shareLink(`/innlegg/${post.id}`)} aria-label="Del"><Icon name="share" size={19} /></button>
        <button className={"act save" + (post.savedByMe ? " saved" : "")} onClick={() => app.saveRealPost(post)} aria-label="Lagre">
          <Icon name="bookmark" size={19} fill={post.savedByMe ? "currentColor" : "none"} />
        </button>
      </footer>
    </article>
  );
}

export function PostCard({ post }) {
  const app = useApp();
  const [burst, setBurst] = useState(false);
  const liked = !!app.liked[post.id];
  const saved = !!app.saved[post.id];
  const commentCount = (app.comments[post.id] || []).length || post.comments || 0;
  const like = () => {
    if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    app.toggleLike(post.id);
  };
  return (
    <article className={"post kind-" + post.kind}>
      <header className="postHead">
        <Avatar src={post.avatar} name={post.author} size={38} />
        <div>
          <b>{post.author}</b>
          <small>{post.time} · {post.place}</small>
        </div>
        <button className="ghostIcon" onClick={() => app.open("postMenu", post)} aria-label="Mer"><Icon name="more" size={20} /></button>
      </header>

      {post.kind === "walk" ? (
        <div className="walkPost" onDoubleClick={like}>
          <RouteSketch path="M8 78 L 24 64 L 34 68 L 48 40 L 58 46 L 70 22 L 90 12" />
          <div className="walkStatsRow">
            <span><b>{fmtKm(post.km)} km</b><small>Distanse</small></span>
            <span><b>{Math.floor(post.minutes / 60)} t {post.minutes % 60} m</b><small>Tid</small></span>
            <span><b>{post.elevation} m</b><small>Stigning</small></span>
          </div>
        </div>
      ) : post.photo ? (
        <div className="postMedia" onDoubleClick={like}>
          <Img id={post.photo} w={700} h={520} className="postMediaImg" />
          {post.sticker && <span className="sticker hand">{post.sticker}</span>}
          {burst && <span className="heartBurst"><Icon name="heart" size={64} fill="currentColor" stroke={0} /></span>}
        </div>
      ) : null}

      <div className="postBody">
        {post.title && <h3>{post.title}</h3>}
        <p>{post.text}</p>
        {post.kudos?.length > 0 && (
          <span className="kudos">
            <AvatarStack ids={post.kudos} size={20} /> {app.dogById(post.kudos[0])?.name} og {post.kudos.length - 1} andre ga poter
          </span>
        )}
      </div>

      <footer className="postActions">
        <button className={"act" + (liked ? " liked" : "")} onClick={like} aria-pressed={liked}>
          <Icon name="heart" size={20} fill={liked ? "currentColor" : "none"} /> {(post.likes || 0) + (liked ? 1 : 0)}
        </button>
        <button className="act" onClick={() => app.open("comments", post)}>
          <Icon name="comment" size={20} /> {commentCount}
        </button>
        <button className="act" onClick={() => app.shareLink(`/innlegg/${post.id}`)} aria-label="Del"><Icon name="share" size={19} /></button>
        <button className={"act save" + (saved ? " saved" : "")} onClick={() => app.toggleSave(post.id)} aria-label="Lagre">
          <Icon name="bookmark" size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </footer>
    </article>
  );
}

/* =========================================================================
   Invitasjonskortet – hjertet i Nå skjer. Leses som en invitasjon, ikke som
   en tabellrad: hvem, hva, hvor, når, hvem er med, én tydelig handling.
   ========================================================================= */
export function InviteCard({ m, compact }) {
  const app = useApp();
  const [pop, setPop] = useState(false);
  const t = meetupTypes.find((x) => x.id === m.type) || meetupTypes[0];
  const isGoing = !!app.going[m.id];
  const host = hostOf(m, app.dogById, app.me);
  const count = goingCount(m, isGoing);
  const when = startLabel(m.startsIn);
  const live = (m.startsIn || 0) <= 10;
  const spots = m.max ? Math.max(0, m.max - count) : null;
  const join = () => {
    if (!isGoing) { setPop(true); setTimeout(() => setPop(false), 420); }
    app.toggleGoing(m.id);
  };
  // Demo-treff kjenner deltakernes hunder; ekte treff viser et ærlig antall.
  const faces = m.real ? [] : (isGoing && !(m.going || []).includes("self") ? [...(m.going || []), "self"] : m.going || []);

  return (
    <article className={"invite tint-" + t.color + (compact ? " compact" : "") + (isGoing ? " isGoing" : "")}>
      <button className="inviteMain" onClick={() => app.open("meetup", m.id)}>
        <div className="inviteTop">
          <Avatar src={host.photo} name={host.dogName || host.name} size={compact ? 34 : 40} />
          <span className="inviteWho">
            <b>{host.dogName || host.name || "Hundeeier"}</b>
            <small>{host.self ? "du er vert" : host.dogName && host.name ? `med ${host.name}` : t.label}</small>
          </span>
          <span className={"inviteWhen" + (live ? " live" : "")}>{live && <i className="liveDot" />}{when}</span>
        </div>
        <h3>{m.title}</h3>
        <p className="invitePlace">
          <span className="inviteType"><Icon name={t.icon} size={14} /> {t.label}</span>
          {m.place && <><span className="sep">·</span><Icon name="pin" size={13} /> {(m.place || "").split(",")[0]}</>}
        </p>
        {!compact && m.note && <p className="inviteNote">{m.note}</p>}
      </button>
      <div className="inviteFoot">
        <span className="inviteGoing">
          {faces.length > 0 && <AvatarStack ids={faces} size={22} />}
          <small>
            {count === 0 ? "Bli den første" : `${count} ${count === 1 ? "hund" : "hunder"} er med`}
            {!compact && spots != null && count > 0 && spots <= 3 && spots > 0 ? ` · ${spots} ${spots === 1 ? "plass" : "plasser"} igjen` : ""}
          </small>
        </span>
        {m.mine ? (
          <span className="hostTag">Ditt treff</span>
        ) : (
          <button className={"joinBtn" + (isGoing ? " done" : "") + (pop ? " pop" : "")} onClick={join} aria-pressed={isGoing}>
            {isGoing ? <><Icon name="check" size={15} stroke={2.8} /> Du er med</> : "Jeg blir med"}
          </button>
        )}
      </div>
    </article>
  );
}

/** Bakoverkompatibelt navn (kart-arket og andre bruker MeetupCard). */
export function MeetupCard(props) {
  return <InviteCard {...props} />;
}
