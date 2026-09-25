"use client";

import { useState } from "react";
import Icon from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack, DogAvatar, Empty, Img, RouteSketch, SectionHead, SourceTag } from "./ui";
import { fmtKm, fmtNum, img, meetupTypes, PHOTO } from "../lib/data";
import { placeShort } from "../lib/geo";
import { lostDogHoursLeft } from "../lib/lostdog";
import { placeTypes } from "../lib/seed";

export default function Home() {
  const app = useApp();
  const s = app.stats;
  const hasCommunity = s.dogs > 0 || s.posts > 0 || s.meetups > 0;

  return (
    <div className="home">
      <Hero />

      {app.lostDogLive && <LostBanner />}

      {/* Solo-verdi først: dette virker fra dag 1, helt uten andre brukere. */}
      {!app.me.isNew || hasCommunity ? null : <GettingStarted />}

      {/* Er fellesskapet helt tomt, sier vi det én gang – ikke tre ganger. */}
      {!hasCommunity ? (
        <section className="block">
          <div className="coldBlock">
            <div className="coldCopy">
              <span className="kicker">FELLESSKAPET I {app.kommune?.name?.toUpperCase()}</span>
              <h2>Ingen andre hundeeiere her ennå</h2>
              <p>Bli den som starter det.</p>
            </div>
            <div className="coldActions">
              <button className="coldAction tint-coral" onClick={() => app.open("meetupComposer")}>
                <span><Icon name="live" size={20} /></span>
                <b>Lag det første treffet</b>
                <small>Synlig for alle som blir med</small>
              </button>
              <button className="coldAction tint-blue" onClick={() => app.open("postComposer")}>
                <span><Icon name="camera" size={20} /></span>
                <b>Skriv det første innlegget</b>
                <small>Sett tonen for fellesskapet</small>
              </button>
              <button className="coldAction tint-sun" onClick={() => app.open("invite")}>
                <span><Icon name="gift" size={20} /></span>
                <b>Inviter hundeeiere</b>
                <small>Den raskeste veien videre</small>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Hundevenner */}
          <section className="block">
            <SectionHead title="Hundevenner i nærheten" action={s.dogs > 0 ? "Se alle" : null} onAction={() => app.setTab("Hunder")} />
            {s.dogs === 0 ? (
              <Empty
                compact
                icon="dog"
                tone="sun"
                title={`Ingen hunder registrert i ${app.kommune?.name} ennå`}
                text="Når flere hundeeiere i området blir med, dukker de opp her."
                cta="Inviter hundeeiere"
                onCta={() => app.open("invite")}
              />
            ) : (
              <Stories />
            )}
          </section>

          {/* Nå skjer */}
          <section className="block">
            <SectionHead title="Nå skjer i nærheten" action={s.meetups > 0 ? "Se alle treff" : null} onAction={() => app.setTab("Nå skjer")}>
              {s.meetupsNow > 0 && <span className="liveTag"><i /> {s.meetupsNow} starter snart</span>}
            </SectionHead>
            {s.meetups === 0 ? (
              <Empty
                compact
                icon="live"
                tone="coral"
                title="Ingen treff akkurat nå"
                text={`Lag det første treffet i ${app.kommune?.name} – det tar ti sekunder.`}
                cta="Lag treff"
                onCta={() => app.open("meetupComposer")}
              />
            ) : (
              <div className="meetRow">
                {app.meetups.slice(0, 4).map((m) => <MeetupCard key={m.id} m={m} compact />)}
              </div>
            )}
          </section>

          {/* Innlegg */}
          <section className="block">
            <SectionHead title="Fra fellesskapet" action={s.posts > 0 ? "Del noe" : null} onAction={() => app.open("postComposer")} />
            {s.posts === 0 ? (
              <Empty compact icon="camera" title="Ingen innlegg ennå" text="Del en tur, et bilde eller et spørsmål." cta="Del noe" onCta={() => app.open("postComposer")} />
            ) : (
              <div className="feedGrid">
                {app.posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )}
          </section>
        </>
      )}

      {/* Turområder – ekte offentlig informasjon, finnes fra dag 1. */}
      {app.places.length > 0 && (
        <section className="block">
          <SectionHead title={`Turområder i ${app.kommune?.name}`} action="Se alle" onAction={() => app.setTab("Utforsk")}>
            <SourceTag />
          </SectionHead>
          <div className="placeRow">
            {app.places.slice(0, 4).map((p) => <PlaceMini key={p.id} place={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function Hero() {
  const app = useApp();
  const s = app.stats;
  const empty = s.dogs === 0;
  return (
    <section className="hero" style={{ "--hero": `url(${img(PHOTO.hero, 1600)})` }}>
      <div className="heroCopy">
        <span className="heroLive">
          {s.meetupsNow > 0 ? <><i /> {s.meetupsNow} TREFF STARTER SNART</> : <>HUNDELIV I {app.kommune?.name?.toUpperCase()}</>}
        </span>
        <h2>{empty ? <>Hundelivet her<br />starter med dere</> : <>Finn noen<br />å gå tur med i dag?</>}</h2>
        <p>
          {empty
            ? "Spor turene, bygg streak og oppdag nye turområder."
            : "Møt hundevenner og bli med på turer i nærheten."}
        </p>
        <div className="heroBtns">
          {empty ? (
            <>
              <button className="pillBtn primary big" onClick={app.startWalk}><Icon name="play" size={18} fill="currentColor" stroke={0} /> Start en tur</button>
              <button className="pillBtn white big" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={19} stroke={2.6} /> Lag treff</button>
            </>
          ) : (
            <>
              <button className="pillBtn primary big" onClick={() => app.open("meetupComposer")}><Icon name="userPlus" size={20} /> Lag treff</button>
              <button className="pillBtn white big" onClick={() => app.setTab("Kart")}><Icon name="map" size={19} /> Åpne kart</button>
            </>
          )}
        </div>
      </div>

      {/* Tellerne er ekte. Er det null, står det null. */}
      <div className="heroBadge">
        {s.dogs > 0 && <AvatarStack ids={app.dogs.slice(0, 4).map((d) => d.id)} size={28} max={4} />}
        <span>
          <b>{fmtNum(s.dogs)}</b> {s.dogs === 1 ? "hund" : "hunder"}<br />i {placeShort(app.location)}
        </span>
      </div>
      <div className="heroScribble hand" aria-hidden="true">Bedre<br />turer<br />sammen <span>♡</span></div>
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

/**
 * Cold start på brukernivå: fire steg som alle gir verdi uten at det
 * finnes én eneste annen bruker i byen.
 */
function GettingStarted() {
  const app = useApp();
  const me = app.me;
  const steps = [
    { id: "profil", icon: "dog", color: "sun", title: "Lag hundeprofilen", text: "Rase, alder, energi og lekestil.", done: !!me.dogName, action: () => app.open("profile") },
    { id: "tur", icon: "walk", color: "blue", title: "Gå din første tur", text: "Start streaken og tjen dine første poter.", done: me.totalWalks > 0, action: app.startWalk },
    { id: "sted", icon: "pin", color: "mint", title: "Lagre et turområde", text: `${app.stats.places} offentlige turområder i ${app.kommune?.name}.`, done: Object.values(app.savedPlaces).some(Boolean), action: () => app.setTab("Utforsk") },
    { id: "inviter", icon: "gift", color: "coral", title: "Inviter en hundeeier", text: "Fellesskapet her blir det dere gjør det til.", done: app.invitesActivated > 0, action: () => app.open("invite") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  // Uferdige steg først, så de handlingsrettede kortene alltid er øverst.
  // Viser to av gangen så skjermen ikke blir tung; resten bak «Se flere».
  const ordered = [...steps].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? ordered : ordered.slice(0, 2);

  return (
    <section className="block getStarted">
      <SectionHead title="Kom i gang">
        <span className="progressPill">{doneCount} av {steps.length}</span>
      </SectionHead>
      <div className="stepGrid">
        {shown.map((s) => (
          <button key={s.id} className={"stepCard tint-" + s.color + (s.done ? " done" : "")} onClick={s.action}>
            <span className="stepIcon">
              <Icon name={s.done ? "check" : s.icon} size={20} stroke={s.done ? 2.8 : 2} />
            </span>
            <b>{s.title}</b>
            <small>{s.text}</small>
          </button>
        ))}
      </div>
      {ordered.length > 2 && (
        <button className="linkish seeMore" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Vis færre" : `Se flere (${ordered.length - 2})`}
        </button>
      )}
    </section>
  );
}

function Stories() {
  const app = useApp();
  return (
    <div className="stories">
      <button className="story add" onClick={() => app.open("postComposer")}>
        <span className="storyRing"><span className="storyAdd"><Icon name="plus" size={26} stroke={2.4} /></span></span>
        <b>Del en historie</b>
      </button>
      {app.dogs.map((d, i) => (
        <button className="story" key={d.id} onClick={() => app.open("story", i)}>
          <Avatar src={d.photo} name={d.name} size={64} ring={d.ring} online={d.online} />
          <b>{d.name}</b>
          <small>{d.age}</small>
        </button>
      ))}
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

export function MeetupCard({ m, compact }) {
  const app = useApp();
  const t = meetupTypes.find((x) => x.id === m.type) || meetupTypes[0];
  const isGoing = !!app.going[m.id];
  const live = m.startsIn <= 0;
  // Ekte treff (fra Supabase) kjenner ikke deltakernes hunde-id-er lokalt –
  // vi viser da et ærlig antall i stedet for en oppdiktet avatar-stabel av
  // hunder vi ikke faktisk har data om.
  const goingCount = m.real ? m.goingCount + (isGoing && !m.iAmGoing ? 1 : 0) : (isGoing && !m.going.includes("self") ? m.going.length + 1 : m.going.length);
  const host = m.real || m.host === "self" ? null : app.dogById(m.host);
  const hostLabel = m.real ? `${m.hostName}${m.hostDogName ? " & " + m.hostDogName : ""}` : `${host?.owner} & ${host?.name}`;
  return (
    <article className={"meetup tint-" + t.color + (compact ? " compact" : "") + (isGoing ? " isGoing" : "")}>
      <button className="meetupMain" onClick={() => app.open("meetup", m.id)}>
        <div className="meetupTop">
          <span className="meetupType"><Icon name={t.icon} size={17} /> {t.label}</span>
          <span className={"when" + (live ? " live" : "")}>{live && <i />}{m.when}</span>
        </div>
        <h3>{m.title}</h3>
        <p className="meetupPlace"><Icon name="pin" size={14} /> {m.place}</p>
        {!compact && m.note && <p className="meetupNote">{m.note}</p>}
        <div className="meetupHost">
          {m.real ? (
            <Avatar src={m.hostPhoto} name={m.hostDogName || m.hostName} size={26} />
          ) : (
            <DogAvatar id={m.host} me={m.host === "self"} size={26} />
          )}
          <small>{m.host === "self" ? "Du er vert" : hostLabel}</small>
        </div>
      </button>
      <div className="meetupFoot">
        <span className="going">
          {!m.real && <AvatarStack ids={isGoing && !m.going.includes("self") ? [...m.going, "self"] : m.going} size={24} />}
          <small>{goingCount}/{m.max}</small>
        </span>
        {m.mine ? (
          <span className="hostTag">Ditt treff</span>
        ) : (
          <button className={"pillBtn small " + (isGoing ? "done" : "primary")} onClick={() => app.toggleGoing(m.id)}>
            {isGoing ? <><Icon name="check" size={15} stroke={2.6} /> Du er med</> : "Bli med"}
          </button>
        )}
      </div>
    </article>
  );
}
