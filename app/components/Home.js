"use client";

import { useState } from "react";
import Icon from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack, RouteSketch, SectionHead } from "./ui";
import { dogById, dogs, fmtKm, img, meetupTypes, ME, PHOTO } from "../lib/data";

export default function Home() {
  const app = useApp();
  const posts = app.posts;
  const soon = app.meetups.slice(0, 4);
  return (
    <div className="home">
      <Hero />

      {app.lostDogActive && (
        <div className="lostBanner">
          <span className="lostIcon"><Icon name="alert" size={22} /></span>
          <div>
            <b>{app.profile.name} er meldt savnet i {app.city}</b>
            <small>Hastevarselet er synlig for hundeeiere i nærheten. Del gjerne videre.</small>
          </div>
          <button className="pillBtn danger small" onClick={() => { app.setLostDogActive(false); app.flash("Så godt! Varselet er avsluttet", "heart"); }}>Funnet</button>
        </div>
      )}

      <section className="block">
        <SectionHead title="Hundevenner i nærheten" action="Se alle" onAction={() => app.setTab("Hunder")} />
        <Stories />
      </section>

      <section className="block">
        <SectionHead title="Aktivitet fra fellesskapet" action="Del noe" onAction={() => app.open("postComposer")} />
        <div className="feedGrid">
          {posts.slice(0, 3).map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>

      <section className="block">
        <SectionHead title="Nå skjer i nærheten" action="Se alle treff" onAction={() => app.setTab("Nå skjer")}>
          <span className="liveTag"><i /> {app.meetups.filter((m) => m.startsIn <= 30).length} aktive nå</span>
        </SectionHead>
        <div className="meetRow">
          {soon.map((m) => <MeetupCard key={m.id} m={m} compact />)}
        </div>
      </section>

      <section className="block">
        <SectionHead title="Mer fra nabolaget" />
        <div className="feedGrid">
          {posts.slice(3).map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>
    </div>
  );
}

function Hero() {
  const app = useApp();
  return (
    <section className="hero" style={{ "--hero": `url(${img(PHOTO.hero, 1600)})` }}>
      <div className="heroCopy">
        <span className="heroLive"><i /> AKTIVE TURER I {app.city.toUpperCase()}</span>
        <h2>Finn noen<br />å gå tur med i dag?</h2>
        <p>Møt hundevenner i nabolaget, bli med på turer og opplev nye steder – sammen med fine folk og glade hunder.</p>
        <div className="heroBtns">
          <button className="pillBtn primary big" onClick={() => app.open("meetupComposer")}><Icon name="userPlus" size={20} /> Lag treff</button>
          <button className="pillBtn white big" onClick={() => app.setTab("Kart")}><Icon name="map" size={19} /> Åpne kart</button>
        </div>
      </div>
      <div className="heroBadge">
        <AvatarStack ids={["luna", "milo", "nala", "odin"]} size={28} max={4} />
        <span><b>1 248</b> aktive hundevenner<br />i {app.city}</span>
      </div>
      <div className="heroScribble hand" aria-hidden="true">Bedre<br />turer<br />sammen <span>♡</span></div>
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
      {dogs.map((d, i) => (
        <button className="story" key={d.id} onClick={() => app.open("story", i)}>
          <Avatar id={d.id} size={64} ring={d.ring} online={d.online} />
          <b>{d.name}</b>
          <small>{d.age}</small>
        </button>
      ))}
    </div>
  );
}

export function PostCard({ post }) {
  const app = useApp();
  const [burst, setBurst] = useState(false);
  const liked = !!app.liked[post.id];
  const saved = !!app.saved[post.id];
  const commentCount = (app.comments[post.id] || []).length || post.comments;
  const like = () => {
    if (!liked) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    app.toggleLike(post.id);
  };
  return (
    <article className={"post kind-" + post.kind}>
      <header className="postHead">
        <Avatar src={post.avatar} size={38} />
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
          <span className="walkBadge"><Icon name="mountain" size={14} /> Ny toppnotering</span>
        </div>
      ) : (
        <div className="postMedia" onDoubleClick={like}>
          <img src={img(post.photo, 700, 520)} alt="" loading="lazy" />
          {post.sticker && <span className="sticker hand">{post.sticker}</span>}
          {burst && <span className="heartBurst"><Icon name="heart" size={64} fill="currentColor" stroke={0} /></span>}
        </div>
      )}

      <div className="postBody">
        {post.title && <h3>{post.title}</h3>}
        <p>{post.text}</p>
        {post.kudos && (
          <span className="kudos"><AvatarStack ids={post.kudos} size={20} /> {dogById(post.kudos[0]).name} og {post.kudos.length - 1} andre ga poter</span>
        )}
      </div>

      <footer className="postActions">
        <button className={"act" + (liked ? " liked" : "")} onClick={like} aria-pressed={liked}>
          <Icon name="heart" size={20} fill={liked ? "currentColor" : "none"} /> {post.likes + (liked ? 1 : 0)}
        </button>
        <button className="act" onClick={() => app.open("comments", post)}>
          <Icon name="comment" size={20} /> {commentCount}
        </button>
        <button className="act" onClick={() => app.flash("Lenke kopiert", "share")} aria-label="Del"><Icon name="share" size={19} /></button>
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
  const host = dogById(m.host);
  const isGoing = !!app.going[m.id];
  const people = isGoing && !m.going.includes("santos") ? [...m.going, "santos"] : m.going;
  const live = m.startsIn <= 0;
  return (
    <article className={"meetup tint-" + t.color + (compact ? " compact" : "") + (isGoing ? " isGoing" : "")}>
      <button className="meetupMain" onClick={() => app.open("meetup", m.id)}>
        <div className="meetupTop">
          <span className="meetupType"><Icon name={t.icon} size={17} /> {t.label}</span>
          <span className={"when" + (live ? " live" : "")}>{live && <i />}{m.when}</span>
        </div>
        <h3>{m.title}</h3>
        <p className="meetupPlace"><Icon name="pin" size={14} /> {m.place} · {fmtKm(m.km)} km</p>
        {!compact && <p className="meetupNote">{m.note}</p>}
        <div className="meetupHost">
          <Avatar id={m.host === "santos" ? undefined : m.host} src={m.host === "santos" ? ME.photo : undefined} size={26} />
          <small>{m.host === "santos" ? "Du er vert" : `${host.owner} & ${host.name}`}</small>
        </div>
      </button>
      <div className="meetupFoot">
        <span className="going"><AvatarStack ids={people} size={24} /> <small>{people.length}/{m.max}</small></span>
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
