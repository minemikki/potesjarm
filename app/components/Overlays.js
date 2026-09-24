"use client";

import { useEffect, useRef, useState } from "react";
import Icon, { PawLogo } from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack, Bar, CloseBtn, Layer, LayerHead, Meter, RouteSketch } from "./ui";
import { cities, conversations, dogById, dogs, fmtKm, groups, img, meetupTypes, ME, notifications, places, PHOTO, stories } from "../lib/data";

export default function Overlays() {
  const app = useApp();
  return (
    <>
      {app.overlays.map((o, i) => {
        const C = MAP[o.type];
        return C ? <C key={o.type} data={o.data} onClose={() => app.close(o.type)} z={i} /> : null;
      })}
      {app.walk && <WalkMode />}
      {app.toast && (
        <div className="toast" key={app.toast.key} role="status">
          <Icon name={app.toast.icon} size={17} /> {app.toast.text}
        </div>
      )}
    </>
  );
}

/* ---------- Lag treff ---------- */
const WHEN = [
  { id: "Nå", startsIn: 0 },
  { id: "Om 30 min", startsIn: 30 },
  { id: "I kveld", startsIn: 240 },
  { id: "I morgen", startsIn: 1200 },
];

function MeetupComposer({ data, onClose }) {
  const app = useApp();
  const withDog = data?.with ? dogById(data.with) : null;
  const [type, setType] = useState("tur");
  const [title, setTitle] = useState(withDog ? `Tur med ${withDog.name}?` : "");
  const [when, setWhen] = useState("Nå");
  const [place, setPlace] = useState(places[0].name);
  const [max, setMax] = useState(6);
  const t = meetupTypes.find((x) => x.id === type);
  const submit = () => {
    const w = WHEN.find((x) => x.id === when);
    const id = app.addMeetup({ type, title: title.trim() || `${t.label} ved ${place}`, when, startsIn: w.startsIn, place, max, pace: "Rolig", note: "Laget av deg nå nettopp." });
    onClose();
    app.setTab("Nå skjer");
    return id;
  };
  return (
    <Layer onClose={onClose} className="sheet composer" label="Lag treff">
      <LayerHead kicker="LAG TREFF" title="Hva har du lyst til?" onClose={onClose} />
      {withDog && <div className="inviteWith"><Avatar id={withDog.id} size={34} /> Invitasjon sendes til {withDog.owner} & {withDog.name}</div>}
      <div className="typePicker">
        {meetupTypes.map((x) => (
          <button key={x.id} className={"tint-" + x.color + (type === x.id ? " active" : "")} onClick={() => setType(x.id)}>
            <span><Icon name={x.icon} size={22} /></span>
            {x.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Tittel</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`F.eks. ${t.label.toLowerCase()} ved Mosvatnet`} autoFocus />
      </label>
      <div className="fieldRow">
        <div className="field">
          <span>Når</span>
          <div className="miniChips">{WHEN.map((w) => <button key={w.id} className={when === w.id ? "active" : ""} onClick={() => setWhen(w.id)}>{w.id}</button>)}</div>
        </div>
      </div>
      <div className="fieldRow two">
        <label className="field">
          <span>Hvor</span>
          <select value={place} onChange={(e) => setPlace(e.target.value)}>
            {places.map((p) => <option key={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className="field">
          <span>Maks antall hunder</span>
          <div className="stepper">
            <button onClick={() => setMax(Math.max(2, max - 1))} aria-label="Færre">–</button>
            <b>{max}</b>
            <button onClick={() => setMax(Math.min(20, max + 1))} aria-label="Flere">+</button>
          </div>
        </div>
      </div>
      <p className="fineprint"><Icon name="shield" size={14} /> Møt alltid på et offentlig sted. Eksakt adresse deles bare med de som blir med.</p>
      <button className="pillBtn primary block big" onClick={submit}><Icon name="live" size={19} /> Publiser treff</button>
    </Layer>
  );
}

function PostComposer({ onClose }) {
  const app = useApp();
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  return (
    <Layer onClose={onClose} className="sheet composer" label="Nytt innlegg">
      <LayerHead kicker="DEL NOE" title="Hva har dere gjort i dag?" onClose={onClose} />
      <div className="postDraft">
        <Avatar src={ME.photo} size={42} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Fortell om turen med ${app.profile.name}…`} autoFocus />
      </div>
      <div className="draftPhoto"><img src={img(PHOTO.hug, 700, 400)} alt="" /><span className="hand">Demo-bilde</span></div>
      <div className="miniChips">
        <button className={place ? "active" : ""} onClick={() => setPlace(place ? "" : "Mosvatnet")}><Icon name="pin" size={14} /> {place || "Legg til sted"}</button>
        <button onClick={() => app.flash("Bildeopplasting kommer med innlogging", "camera")}><Icon name="camera" size={14} /> Bilde</button>
        <button onClick={() => app.flash("Tur-kobling kommer snart", "route")}><Icon name="route" size={14} /> Legg ved tur</button>
      </div>
      <button className="pillBtn primary block big" disabled={!text.trim()} onClick={() => { app.addPost(text.trim(), place); onClose(); app.setTab("For deg"); }}>Publiser</button>
    </Layer>
  );
}

function EventComposer({ onClose }) {
  const app = useApp();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Tur");
  const [date, setDate] = useState("2026-10-05");
  const [time, setTime] = useState("12:00");
  const [place, setPlace] = useState(places[0].name);
  const submit = () => {
    if (!title.trim()) return;
    const d = new Date(date + "T12:00");
    app.addEvent({
      title: title.trim(), tag, time, place,
      day: String(d.getDate()),
      month: d.toLocaleDateString("nb-NO", { month: "short" }).replace(".", ""),
      weekday: d.toLocaleDateString("nb-NO", { weekday: "short" }).replace(".", "").replace(/^./, (c) => c.toUpperCase()),
      about: "Nytt arrangement laget av deg.",
    });
    onClose();
  };
  return (
    <Layer onClose={onClose} className="sheet composer" label="Nytt arrangement">
      <LayerHead kicker="NYTT ARRANGEMENT" title="Samle hundefolk" onClose={onClose} />
      <label className="field"><span>Navn</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="F.eks. Søndagstur på Byhaugen" autoFocus /></label>
      <div className="field"><span>Type</span><div className="miniChips">{["Tur", "Valp", "Fjell", "Sosialt"].map((t) => <button key={t} className={tag === t ? "active" : ""} onClick={() => setTag(t)}>{t}</button>)}</div></div>
      <div className="fieldRow three">
        <label className="field"><span>Dato</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field"><span>Tid</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="field"><span>Sted</span><select value={place} onChange={(e) => setPlace(e.target.value)}>{places.map((p) => <option key={p.id}>{p.name}</option>)}</select></label>
      </div>
      <button className="pillBtn primary block big" disabled={!title.trim()} onClick={submit}><Icon name="calendar" size={18} /> Publiser arrangement</button>
    </Layer>
  );
}

/* ---------- Detaljer ---------- */
function MeetupDetail({ data: id, onClose }) {
  const app = useApp();
  const m = app.meetups.find((x) => x.id === id);
  if (!m) return null;
  const t = meetupTypes.find((x) => x.id === m.type);
  const host = dogById(m.host);
  const isGoing = !!app.going[m.id];
  const people = isGoing && !m.going.includes("santos") ? [...m.going, "santos"] : m.going;
  return (
    <Layer kind="drawer" onClose={onClose} className="detail" label={m.title}>
      <div className={"detailMap tint-" + t.color}>
        <RouteSketch path="M10 70 C 25 50, 40 60, 50 45 S 75 30, 90 20" />
        <span className="detailPin"><Icon name={t.icon} size={22} /></span>
        <CloseBtn onClick={onClose} />
      </div>
      <div className="detailBody">
        <div className="meetupTop">
          <span className={"meetupType tint-" + t.color}><Icon name={t.icon} size={16} /> {t.label}</span>
          <span className={"when" + (m.startsIn <= 0 ? " live" : "")}>{m.startsIn <= 0 && <i />}{m.when}</span>
        </div>
        <h2>{m.title}</h2>
        <div className="facts">
          <span><Icon name="pin" size={17} /><b>{m.place}</b><small>{fmtKm(m.km)} km fra deg</small></span>
          <span><Icon name="bolt" size={17} /><b>{m.pace}</b><small>Tempo</small></span>
          <span><Icon name="users" size={17} /><b>{people.length} av {m.max}</b><small>hunder</small></span>
        </div>
        <p className="detailText">{m.note}</p>
        <h4>Vert</h4>
        <button className="memberRow" onClick={() => m.host !== "santos" && app.open("dog", m.host)}>
          <Avatar id={m.host} size={44} online />
          <span><b>{m.host === "santos" ? "Deg" : `${host.owner} & ${host.name}`}</b><small>{host.breed} · verifisert profil</small></span>
          <Icon name="verified" size={20} className="verifiedIcon" />
        </button>
        <h4>Hvem kommer</h4>
        <div className="whoGoing">
          {people.map((id) => <span key={id}><Avatar id={id} size={48} /><small>{dogById(id).name}</small></span>)}
          {Array.from({ length: Math.max(0, Math.min(3, m.max - people.length)) }).map((_, i) => <span key={"e" + i} className="openSpot"><i><Icon name="plus" size={18} /></i><small>Ledig</small></span>)}
        </div>
      </div>
      <div className="detailFoot">
        <button className="pillBtn soft" onClick={() => { app.close("meetup"); app.open("chat", 1); }}><Icon name="comment" size={17} /> Skriv til verten</button>
        {!m.mine && (
          <button className={"pillBtn " + (isGoing ? "done" : "primary")} onClick={() => app.toggleGoing(m.id)}>
            {isGoing ? <><Icon name="check" size={16} stroke={2.6} /> Du er med</> : "Bli med"}
          </button>
        )}
      </div>
    </Layer>
  );
}

function EventDetail({ data: id, onClose }) {
  const app = useApp();
  const e = app.events.find((x) => x.id === id);
  if (!e) return null;
  const on = !!app.eventGoing[e.id];
  return (
    <Layer kind="drawer" onClose={onClose} className="detail" label={e.title}>
      <div className="detailCover" style={{ backgroundImage: `url(${img(e.photo, 900, 560)})` }}>
        <CloseBtn onClick={onClose} light />
        <span className="dateChip big"><b>{e.day}</b><small>{e.month}</small></span>
      </div>
      <div className="detailBody">
        <span className="kicker">{e.tag.toUpperCase()} · {e.host.toUpperCase()}</span>
        <h2>{e.title}</h2>
        <div className="facts">
          <span><Icon name="calendar" size={17} /><b>{e.weekday} {e.day}. {e.month}</b><small>kl. {e.time}</small></span>
          <span><Icon name="pin" size={17} /><b>{e.place}</b><small>{app.city}</small></span>
          <span><Icon name="users" size={17} /><b>{e.going + (on ? 1 : 0)}</b><small>påmeldt</small></span>
        </div>
        <p className="detailText">{e.about}</p>
        <h4>Program</h4>
        <ol className="timeline">
          {e.program.map(([t, what]) => <li key={t}><b>{t}</b><span>{what}</span></li>)}
        </ol>
        <h4>Hvem kommer</h4>
        <div className="whoGoing">
          {e.faces.map((id) => <span key={id}><Avatar id={id} size={48} /><small>{dogById(id).name}</small></span>)}
          {on && <span><Avatar src={ME.photo} size={48} ring="mint" /><small>Dere</small></span>}
          <span className="openSpot"><i>+{Math.max(0, e.going - e.faces.length)}</i><small>flere</small></span>
        </div>
      </div>
      <div className="detailFoot">
        <button className="pillBtn soft" onClick={() => app.flash("Lagt til i kalenderen", "calendar")}><Icon name="calendar" size={17} /> Kalender</button>
        <button className={"pillBtn " + (on ? "done" : "primary")} onClick={() => app.toggleEvent(e.id)}>
          {on ? <><Icon name="check" size={16} stroke={2.6} /> Påmeldt</> : "Meld på"}
        </button>
      </div>
    </Layer>
  );
}

function DogProfile({ data: id, onClose }) {
  const app = useApp();
  const d = dogById(id);
  if (!d) return null;
  const shared = groups.filter((g) => g.faces.includes(id)).slice(0, 2);
  const why = [
    ["Energi", d.energy >= 4 ? 92 : 70, "blue"],
    ["Lekestil", d.match - 3, "coral"],
    ["Avstand", Math.round(100 - d.km * 12), "mint"],
    ["Turtider", 84, "sun"],
  ];
  return (
    <Layer onClose={onClose} className="dogProfile" label={d.name}>
      <div className="dogHero">
        <img src={img(d.photo, 900, 700)} alt="" />
        <CloseBtn onClick={onClose} light />
        <div className="dogHeroText">
          <h2>{d.name} {d.online && <span className="onlinePill"><i /> Ute nå</span>}</h2>
          <p>{d.breed} · {d.age} · {fmtKm(d.km)} km unna · eier: {d.owner}</p>
        </div>
      </div>
      <div className="dogProfileBody">
        <div className="compat">
          <span className="matchRing big" style={{ "--p": d.match }}><b>{d.match}%</b><small>match</small></span>
          <div className="compatBars">
            {why.map(([label, v, tone]) => (
              <div key={label}><small>{label}</small><Bar value={v} tone={tone} /></div>
            ))}
          </div>
        </div>
        <div className="dogFacts">
          <span><small>Energi</small><Meter value={d.energy} /></span>
          <span><small>Størrelse</small><b>{d.size}</b></span>
          <span><small>Streak</small><b><Icon name="flame" size={15} /> {d.streak} d</b></span>
        </div>
        <div className="tags">{d.play.map((p) => <small key={p}>{p}</small>)}<small>Liker {app.profile.name}s tempo</small></div>
        {shared.length > 0 && (
          <>
            <h4>Felles grupper</h4>
            <div className="sharedGroups">{shared.map((g) => <button key={g.id} onClick={() => app.openGroup(g.id)}><img src={img(g.photo, 80, 80)} alt="" />{g.name}</button>)}</div>
          </>
        )}
        <h4>Siste turer</h4>
        <div className="recentWalks">
          {[["Mosvatnet rundt", 3.2, "I går"], ["Sørmarka", 5.1, "Søndag"], ["Sola strand", 4.4, "Lørdag"]].map(([n, km, when]) => (
            <span key={n}><Icon name="route" size={16} /><b>{n}</b><small>{fmtKm(km)} km · {when}</small></span>
          ))}
        </div>
      </div>
      <div className="detailFoot">
        <button className={"pillBtn " + (app.followed[d.id] ? "done" : "soft")} onClick={() => app.toggleFollow(d.id)}><Icon name="heart" size={16} fill={app.followed[d.id] ? "currentColor" : "none"} /> {app.followed[d.id] ? "Følger" : "Følg"}</button>
        <button className="pillBtn soft" onClick={() => { onClose(); app.open("chat", 1); }}><Icon name="comment" size={16} /> Melding</button>
        <button className="pillBtn primary" onClick={() => { onClose(); app.open("meetupComposer", { with: d.id }); }}><Icon name="walk" size={17} /> Foreslå tur</button>
      </div>
    </Layer>
  );
}

/* ---------- Historier ---------- */
function StoryViewer({ data: start, onClose }) {
  const app = useApp();
  const [i, setI] = useState(start || 0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const s = stories[i];
  const d = dogById(s?.dogId);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => (i < stories.length - 1 ? setI(i + 1) : closeRef.current()), 5000);
    return () => clearTimeout(t);
  }, [i, paused]);
  if (!s) return null;
  return (
    <Layer kind="story" onClose={onClose} className="storyBox" label="Historie">
      <div className="storyBars">{stories.map((_, k) => <span key={k}><i className={k < i ? "full" : k === i ? (paused ? "run paused" : "run") : ""} key={k === i ? "r" + i : k} /></span>)}</div>
      <div className="storyHead">
        <Avatar id={d.id} size={36} />
        <span><b>{d.name}</b><small>{d.owner} · for {i + 2} t siden</small></span>
        <button className="ghostIcon light" onClick={() => setPaused(!paused)} aria-label="Pause"><Icon name={paused ? "play" : "pause"} size={18} /></button>
        <CloseBtn onClick={onClose} light />
      </div>
      <img className="storyImg" src={img(s.photo, 800, 1300)} alt="" />
      <button className="storyNav prev" onClick={() => i > 0 && setI(i - 1)} aria-label="Forrige" />
      <button className="storyNav next" onClick={() => (i < stories.length - 1 ? setI(i + 1) : onClose())} aria-label="Neste" />
      <p className="storyCaption hand">{s.caption}</p>
      <form className="storyReply" onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; app.flash(`Svar sendt til ${d.owner}`, "send"); setReply(""); }}>
        <input value={reply} onChange={(e) => setReply(e.target.value)} onFocus={() => setPaused(true)} placeholder={`Svar ${d.owner}…`} />
        <button type="button" className="ghostIcon light" onClick={() => app.flash(`Du ga ${d.name} en pote`, "paw")} aria-label="Gi pote"><Icon name="heart" size={22} /></button>
        <button className="ghostIcon light" aria-label="Send"><Icon name="send" size={20} /></button>
      </form>
    </Layer>
  );
}

/* ---------- Sosialt ---------- */
function Comments({ data: post, onClose }) {
  const app = useApp();
  const [text, setText] = useState("");
  const list = app.comments[post.id] || [];
  return (
    <Layer kind="drawer" onClose={onClose} className="commentsBox" label="Kommentarer">
      <LayerHead kicker={post.author.toUpperCase()} title="Kommentarer" onClose={onClose} />
      <div className="commentList">
        {list.length === 0 && <p className="muted">Ingen kommentarer ennå. Si hei!</p>}
        {list.map((c, i) => (
          <div className="comment" key={i}>
            <Avatar src={c.avatar} size={36} />
            <div><b>{c.name}</b><p>{c.text}</p><small>Nå · Svar</small></div>
          </div>
        ))}
      </div>
      <form className="inputRow" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; app.addComment(post.id, text.trim()); setText(""); }}>
        <Avatar src={ME.photo} size={34} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv en kommentar…" autoFocus />
        <button className="sendBtn" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </Layer>
  );
}

function PostMenu({ data: post, onClose }) {
  const app = useApp();
  const act = (msg, icon) => { onClose(); app.flash(msg, icon); };
  return (
    <Layer kind="sheet" onClose={onClose} className="actionSheet" label="Valg">
      <span className="sheetHandle" />
      <b className="sheetTitle">{post.author}</b>
      <button onClick={() => { app.toggleSave(post.id); onClose(); }}><Icon name="bookmark" size={19} /> {app.saved[post.id] ? "Fjern fra lagret" : "Lagre innlegg"}</button>
      <button onClick={() => act("Du ser færre slike innlegg", "eyeOff")}><Icon name="eyeOff" size={19} /> Ikke interessert</button>
      <button onClick={() => act("Takk! Innlegget er sendt til moderering", "flag")}><Icon name="flag" size={19} /> Rapporter innlegg</button>
      <button className="danger" onClick={() => act("Brukeren er blokkert", "ban")}><Icon name="ban" size={19} /> Blokker bruker</button>
      <button className="cancel" onClick={onClose}>Avbryt</button>
    </Layer>
  );
}

function Search({ onClose }) {
  const app = useApp();
  const [q, setQ] = useState("");
  const n = q.trim().toLowerCase();
  const hit = (s) => !n || s.toLowerCase().includes(n);
  const rDogs = dogs.filter((d) => hit(d.name + d.breed + d.owner)).slice(0, 4);
  const rGroups = groups.filter((g) => hit(g.name)).slice(0, 3);
  const rPlaces = places.filter((p) => hit(p.name + p.type)).slice(0, 3);
  const rMeet = app.meetups.filter((m) => hit(m.title + m.place)).slice(0, 3);
  const none = !rDogs.length && !rGroups.length && !rPlaces.length && !rMeet.length;
  return (
    <Layer kind="top" onClose={onClose} className="searchBox" label="Søk">
      <div className="searchInput">
        <Icon name="search" size={20} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk etter turer, steder, hunder eller mennesker…" />
        <CloseBtn onClick={onClose} />
      </div>
      <div className="searchResults">
        {none && <p className="muted">Ingen treff på «{q}». Prøv «Mosvatnet» eller «valp».</p>}
        {rDogs.length > 0 && <h5>Hunder</h5>}
        {rDogs.map((d) => <button key={d.id} className="resultRow" onClick={() => { onClose(); app.open("dog", d.id); }}><Avatar id={d.id} size={40} /><span><b>{d.name}</b><small>{d.breed} · {fmtKm(d.km)} km</small></span><Icon name="chevronRight" size={17} /></button>)}
        {rMeet.length > 0 && <h5>Nå skjer</h5>}
        {rMeet.map((m) => <button key={m.id} className="resultRow" onClick={() => { onClose(); app.open("meetup", m.id); }}><span className="resultIcon"><Icon name="live" size={18} /></span><span><b>{m.title}</b><small>{m.when} · {m.place}</small></span><Icon name="chevronRight" size={17} /></button>)}
        {rGroups.length > 0 && <h5>Grupper</h5>}
        {rGroups.map((g) => <button key={g.id} className="resultRow" onClick={() => app.openGroup(g.id)}><Avatar src={g.photo} size={40} square /><span><b>{g.name}</b><small>{g.members.toLocaleString("nb-NO")} medlemmer</small></span><Icon name="chevronRight" size={17} /></button>)}
        {rPlaces.length > 0 && <h5>Steder</h5>}
        {rPlaces.map((p) => <button key={p.id} className="resultRow" onClick={() => app.setTab("Utforsk")}><span className="resultIcon"><Icon name={p.icon} size={18} /></span><span><b>{p.name}</b><small>{p.type} · {fmtKm(p.km)} km</small></span><Icon name="chevronRight" size={17} /></button>)}
      </div>
    </Layer>
  );
}

function Notifications({ onClose }) {
  const app = useApp();
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Varsler">
      <LayerHead kicker="AKTIVITET" title="Varsler" onClose={onClose} />
      {notifications.map((n) => (
        <button key={n.id} className="noteRow" onClick={() => { if (n.dog) app.open("dog", n.dog); }}>
          {n.dog ? <Avatar id={n.dog} size={44} /> : <span className={"noteIcon tint-" + n.color}><Icon name={n.icon} size={20} /></span>}
          <span><b>{n.text}</b><small>{n.meta}</small></span>
          <i className="unreadDot" />
        </button>
      ))}
    </Layer>
  );
}

function Inbox({ onClose }) {
  const app = useApp();
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Meldinger">
      <LayerHead kicker="MELDINGER" title="Innboks" onClose={onClose} />
      {conversations.map((c) => {
        const d = dogById(c.dog);
        const last = (app.messages[c.id] || []).slice(-1)[0];
        return (
          <button key={c.id} className="noteRow" onClick={() => app.open("chat", c.id)}>
            <Avatar id={c.dog} size={48} online={d.online} />
            <span><b>{d.owner} & {d.name}</b><small className="clip">{last?.me ? "Du: " : ""}{last?.t || c.preview}</small></span>
            {c.unread > 0 && <i className="countBadge">{c.unread}</i>}
          </button>
        );
      })}
    </Layer>
  );
}

function Chat({ data: id, onClose }) {
  const app = useApp();
  const c = conversations.find((x) => x.id === id) || conversations[0];
  const d = dogById(c.dog);
  const [text, setText] = useState("");
  const end = useRef();
  const list = app.messages[c.id] || [];
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [list.length]);
  return (
    <Layer onClose={onClose} className="chatBox" label="Samtale">
      <div className="chatHead">
        <button className="ghostIcon" onClick={onClose} aria-label="Tilbake"><Icon name="chevronLeft" size={22} /></button>
        <Avatar id={d.id} size={40} online={d.online} />
        <span><b>{d.owner} & {d.name}</b><small>{d.online ? "Ute på tur nå" : "Aktiv nylig"}</small></span>
        <button className="pillBtn small soft" onClick={() => { onClose(); app.open("meetupComposer", { with: d.id }); }}><Icon name="walk" size={15} /> Foreslå tur</button>
      </div>
      <div className="chatBody">
        {list.map((m, i) => <div key={i} className={"bubble " + (m.me ? "mine" : "theirs")}>{m.t}</div>)}
        <span ref={end} />
      </div>
      <form className="inputRow" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; app.sendMessage(c.id, text.trim()); setText(""); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv en melding…" autoFocus />
        <button className="sendBtn" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </Layer>
  );
}

/* ---------- Meg ---------- */
function Profile({ onClose }) {
  const app = useApp();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(app.profile.name);
  const [bio, setBio] = useState(app.profile.bio);
  return (
    <Layer kind="drawer" onClose={onClose} className="profileBox" label="Min profil">
      <div className="profileCover" style={{ backgroundImage: `url(${img(PHOTO.hills, 900, 400)})` }}><CloseBtn onClick={onClose} light /></div>
      <div className="profileTop">
        <Avatar src={ME.photo} size={96} ring="mint" />
        {app.verified && <span className="verifiedTag"><Icon name="verified" size={15} /> Verifisert</span>}
      </div>
      <div className="detailBody">
        {edit ? (
          <div className="profileEdit">
            <label className="field"><span>Hundens navn</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span>Om</span><input value={bio} onChange={(e) => setBio(e.target.value)} /></label>
          </div>
        ) : (
          <>
            <h2>{app.profile.name} <small>& {ME.owner}</small></h2>
            <p className="muted">{app.profile.bio} · {app.city}</p>
          </>
        )}
        <div className="profileStats">
          <span><b>{app.streak}</b><small>streak</small></span>
          <span><b>243</b><small>turer</small></span>
          <span><b>812</b><small>km sammen</small></span>
          <span><b>38</b><small>venner</small></span>
        </div>
        <div className="tags"><small>Høy energi</small><small>Fjelltur</small><small>Røff lek</small><small>Liker store hunder</small></div>
        <h4>Merker</h4>
        <div className="miniBadges">
          {[["mountain", "Fjellpote", "blue"], ["rain", "Regnkriger", "violet"], ["flame", "14 dager", "coral"], ["moon", "Nattugle", "violet"]].map(([i, n, c]) => (
            <span key={n} className={"tint-" + c}><i><Icon name={i} size={20} /></i><small>{n}</small></span>
          ))}
        </div>
        <button className="rowBtn" onClick={() => app.open("recap")}><Icon name="sparkle" size={18} /> Ukesoppsummering <Icon name="chevronRight" size={17} /></button>
        <button className="rowBtn" onClick={() => app.open("premium")}><Icon name="star" size={18} /> Potesjarm+ <small>forhåndsvisning</small> <Icon name="chevronRight" size={17} /></button>
      </div>
      <div className="detailFoot">
        <button className="pillBtn primary" onClick={() => { if (edit) { app.setProfile({ name: name.trim() || app.profile.name, bio }); app.flash("Profilen er oppdatert"); } setEdit(!edit); }}>
          <Icon name={edit ? "check" : "edit"} size={16} /> {edit ? "Lagre" : "Rediger hundeprofil"}
        </button>
      </div>
    </Layer>
  );
}

function Settings({ onClose }) {
  const app = useApp();
  const Toggle = ({ on, set, title, sub }) => (
    <label className="toggleRow">
      <span><b>{title}</b><small>{sub}</small></span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <i className="switch" />
    </label>
  );
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Innstillinger">
      <LayerHead kicker="PREFERANSER" title="Innstillinger" onClose={onClose} />
      <h5>Personvern</h5>
      <Toggle on={app.privacy} set={app.setPrivacy} title="Vis oss i nærmiljøet" sub={`Andre kan finne ${app.profile.name} under Hunder.`} />
      <Toggle on={app.push} set={app.setPush} title="Varsler" sub="Nå skjer, meldinger og streaks." />
      <h5>Område</h5>
      <button className="rowBtn" onClick={() => app.open("city")}><Icon name="pin" size={18} /> {app.city} <Icon name="chevronRight" size={17} /></button>
      <h5>Trygghet</h5>
      <button className="rowBtn" onClick={() => app.open("safety")}><Icon name="shield" size={18} /> Trygghet og nødprofil <Icon name="chevronRight" size={17} /></button>
      <button className="rowBtn" onClick={() => app.flash("Du har ingen blokkerte profiler", "ban")}><Icon name="ban" size={18} /> Blokkerte profiler <Icon name="chevronRight" size={17} /></button>
      <h5>Konto</h5>
      <button className="rowBtn" onClick={() => app.open("invite")}><Icon name="gift" size={18} /> Inviter venner <Icon name="chevronRight" size={17} /></button>
      <button className="rowBtn" onClick={() => { try { localStorage.removeItem("potesjarm-v2"); localStorage.removeItem("potesjarm-onboarded"); } catch {} location.reload(); }}><Icon name="logout" size={18} /> Nullstill demo <Icon name="chevronRight" size={17} /></button>
    </Layer>
  );
}

function CityPicker({ onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="sheet" label="Velg by">
      <LayerHead kicker="VELG OMRÅDE" title="Hvor bor dere?" onClose={onClose} />
      <p className="muted">Feed, Nå skjer og arrangementer tilpasses byen din.</p>
      <div className="cityGrid">
        {cities.map((c) => (
          <button key={c} className={app.city === c ? "active" : ""} onClick={() => { app.setCity(c); onClose(); }}>
            <Icon name="pin" size={18} /> <b>{c}</b> {app.city === c && <Icon name="check" size={18} stroke={2.6} />}
          </button>
        ))}
      </div>
    </Layer>
  );
}

function More({ onClose }) {
  const app = useApp();
  const go = (t) => { app.setTab(t); };
  const items = [
    ["Hunder", "dog", "sun", "Finn turvenner", () => go("Hunder")],
    ["Kart", "pin", "mint", "Rundt deg", () => go("Kart")],
    ["Aktivitet", "flame", "coral", "Streak og merker", () => go("Aktivitet")],
    ["Arrangementer", "calendar", "blue", "Møt folk", () => go("Arrangementer")],
    ["Utforsk", "compass", "mint", "Steder og ruter", () => go("Utforsk")],
    ["Meldinger", "mail", "violet", "Samtaler", () => app.open("inbox")],
    ["Min profil", "paw", "blue", app.profile.name, () => app.open("profile")],
    ["Trygghet", "shield", "coral", "Nødprofil", () => app.open("safety")],
  ];
  return (
    <Layer kind="sheet" onClose={onClose} className="moreSheet" label="Mer">
      <span className="sheetHandle" />
      <div className="moreGrid">
        {items.map(([label, icon, color, sub, fn]) => (
          <button key={label} className={"tint-" + color} onClick={() => { onClose(); fn(); }}>
            <span><Icon name={icon} size={22} /></span><b>{label}</b><small>{sub}</small>
          </button>
        ))}
      </div>
      <button className="pillBtn primary block" onClick={() => { onClose(); app.startWalk(); }}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start tur</button>
    </Layer>
  );
}

function Invite({ onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="sheet" label="Inviter">
      <LayerHead kicker="BYGG FLOKKEN" title="Inviter 3 hundevenner" onClose={onClose} />
      <p className="muted">Jo flere i nabolaget, jo bedre blir Nå skjer, arrangementer og matching.</p>
      <div className="inviteSlots">
        {[0, 1, 2].map((i) => <span key={i} className={i < app.inviteCount ? "on" : ""}><Icon name={i < app.inviteCount ? "check" : "userPlus"} size={22} /></span>)}
      </div>
      <div className="rewardBox"><span className="chIcon big tint-sun"><Icon name="gift" size={22} /></span><div><b>Lås opp Grunnlegger-merket</b><small>+500 poter når tre venner blir med</small></div></div>
      <button className="pillBtn primary block big" disabled={app.inviteCount >= 3} onClick={app.invite}><Icon name="send" size={18} /> {app.inviteCount >= 3 ? "Alle invitert!" : "Send invitasjon"}</button>
    </Layer>
  );
}

function Safety({ onClose }) {
  const app = useApp();
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Trygghet">
      <LayerHead kicker="TRYGGHET" title="Trygt sammen" onClose={onClose} />
      <div className="safetyStatus"><span className="chIcon big tint-mint"><Icon name="shield" size={22} /></span><div><b>Nødprofil 75 % ferdig</b><small>Legg til veterinær og nødkontakt før dere trenger det.</small><Bar value={75} tone="mint" /></div></div>
      <button className="rowBtn" onClick={() => { app.setVerified(true); app.flash("Profilen er verifisert", "verified"); }}><Icon name="verified" size={18} /> {app.verified ? "Profilen er verifisert" : "Verifiser profilen"} <Icon name="chevronRight" size={17} /></button>
      <button className="rowBtn danger" onClick={() => app.open("lostDog")}><Icon name="alert" size={18} /> Meld hund savnet <Icon name="chevronRight" size={17} /></button>
      <h5>Trygge møter</h5>
      <p className="muted">Møt nye hundeeiere på offentlige steder, sjekk profilhistorikk og avslutt møtet hvis noe føles feil.</p>
      <h5>Rapportering</h5>
      <p className="muted">Blokker eller rapporter profiler og innlegg rett fra menyene i appen. Alt behandles av moderatorer.</p>
    </Layer>
  );
}

function LostDog({ onClose }) {
  const app = useApp();
  const [text, setText] = useState("");
  return (
    <Layer onClose={onClose} className="sheet urgent" tone="urgent" label="Mistet hund">
      <LayerHead kicker="HASTEVARSEL" title="Mistet hund" onClose={onClose} />
      <p className="muted">Varselet går ut til hundeeiere i {app.city}. Del aldri privat adresse offentlig.</p>
      <div className="lostWho"><Avatar src={ME.photo} size={48} /><span><b>{app.profile.name}</b><small>{app.profile.bio}</small></span></div>
      <label className="field"><span>Sist sett</span><textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="F.eks. ved Mosvatnet kl. 14, blå sele, redd for fremmede…" /></label>
      <button className="pillBtn danger block big" onClick={() => { app.setLostDogActive(true); app.closeAll(); app.setTab("For deg"); app.flash("Hastevarsel sendt til nærområdet", "alert"); }}><Icon name="alert" size={18} /> Send hastevarsel</button>
    </Layer>
  );
}

function Recap({ onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="recap" label="Ukesoppsummering">
      <CloseBtn onClick={onClose} light />
      <span className="kicker light">POTESJARM · UKE 39</span>
      <Avatar src={ME.photo} size={84} ring="mint" />
      <h2>{app.profile.name} + {ME.owner}</h2>
      <p className="hand">en uke ute sammen ♡</p>
      <b className="recapBig">{fmtKm(app.weekKm + 18.3)}<small> km</small></b>
      <div className="recapStats"><span><b>7</b>turer</span><span><b>{app.streak}</b>streak</span><span><b>{app.paws.toLocaleString("nb-NO")}</b>poter</span></div>
      <button className="pillBtn white" onClick={() => app.flash("Delingskort lagret", "share")}><Icon name="share" size={17} /> Del ukekort</button>
    </Layer>
  );
}

function Premium({ onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="sheet" label="Potesjarm+">
      <LayerHead kicker="POTESJARM+ · FORHÅNDSVISNING" title="Mer av livet dere lever sammen" onClose={onClose} />
      <p className="muted">Ingen betaling er koblet til ennå – vi vil bare vite om du er interessert.</p>
      <div className="premiumGrid">
        {[["layers", "Dypere turstatistikk", "Historikk, rekorder og trender"], ["trophy", "Sesongutfordringer", "Eksklusive merker"], ["dog", "Flere hunder", "Én konto, hele flokken"], ["route", "Planlegg ruter", "Lagre og del favoritter"]].map(([i, t, s]) => (
          <span key={t}><Icon name={i} size={22} /><b>{t}</b><small>{s}</small></span>
        ))}
      </div>
      <button className="pillBtn primary block big" onClick={() => { onClose(); app.flash("Takk! Vi sier fra når det er klart", "star"); }}>Jeg er interessert</button>
    </Layer>
  );
}

function Onboarding() {
  const app = useApp();
  return (
    <Layer onClose={() => {}} className="onboarding" tone="brand" label="Velkommen">
      <PawLogo size={64} />
      <span className="kicker">VELKOMMEN TIL POTESJARM</span>
      <h1>Hundeliv er bedre sammen.</h1>
      <p>Finn turvenner i nabolaget, bli med på treff, bygg streaks og bli kjent med hundefolka i {app.city}.</p>
      <div className="onboardGrid">
        {[["dog", "Hundevenner i nærheten", "sun"], ["live", "Nå skjer – akkurat nå", "coral"], ["flame", "Streaks og utfordringer", "blue"], ["users", "Grupper og arrangementer", "mint"]].map(([i, t, c]) => (
          <span key={t} className={"tint-" + c}><i><Icon name={i} size={20} /></i>{t}</span>
        ))}
      </div>
      <button className="pillBtn primary big" onClick={app.finishOnboarding}>Kom i gang <Icon name="arrowRight" size={18} /></button>
    </Layer>
  );
}

function WalkMode() {
  const app = useApp();
  const w = app.walk;
  const mm = String(Math.floor(w.seconds / 60)).padStart(2, "0");
  const ss = String(w.seconds % 60).padStart(2, "0");
  return (
    <div className="walkMode" role="dialog" aria-label="Tur pågår">
      <div className="walkTop">
        <span className="heroLive"><i /> TUR PÅGÅR</span>
        <button className="closeBtn light" onClick={app.cancelWalk} aria-label="Avbryt"><Icon name="x" size={18} /></button>
      </div>
      <div className="walkPulse"><Avatar src={ME.photo} size={120} ring="mint" /></div>
      <b className="walkKm">{w.km.toFixed(2).replace(".", ",")}<small> km</small></b>
      <p>{mm}:{ss} · {app.profile.name} er på tur</p>
      <div className="walkStats">
        <span><b>{Math.round(w.km * 1312)}</b><small>skritt</small></span>
        <span><b>{w.seconds > 20 ? (w.seconds / 60 / Math.max(w.km, 0.01)).toFixed(0) : "–"}</b><small>min/km</small></span>
        <span><b>+{Math.round(w.km * 100)}</b><small>poter</small></span>
      </div>
      <button className="pillBtn white big" onClick={app.finishWalk}><Icon name="check" size={18} stroke={2.6} /> Avslutt tur</button>
    </div>
  );
}

function WalkSummary({ data: s, onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="celebrate" tone="brand" label="Tur fullført">
      <span className="confetti" aria-hidden="true">{Array.from({ length: 14 }).map((_, i) => <i key={i} />)}</span>
      <span className="chIcon huge tint-coral"><Icon name="flame" size={36} /></span>
      <span className="kicker">TUR FULLFØRT</span>
      <h2>Streaken lever – {s.streak} dager!</h2>
      <p className="muted">{app.profile.name} og du la enda en tur til historien deres.</p>
      <div className="summaryStats">
        <span><b>{s.km.toFixed(2).replace(".", ",")} km</b><small>distanse</small></span>
        <span><b>{Math.floor(s.seconds / 60)} min</b><small>tid</small></span>
        <span><b>+{s.paws}</b><small>poter</small></span>
      </div>
      <div className="fieldRow two">
        <button className="pillBtn soft" onClick={() => { onClose(); app.open("postComposer"); }}><Icon name="share" size={16} /> Del turen</button>
        <button className="pillBtn primary" onClick={() => { onClose(); app.setTab("Aktivitet"); }}>Se fremgang <Icon name="arrowRight" size={16} /></button>
      </div>
    </Layer>
  );
}

const MAP = {
  meetupComposer: MeetupComposer,
  postComposer: PostComposer,
  eventComposer: EventComposer,
  meetup: MeetupDetail,
  event: EventDetail,
  dog: DogProfile,
  story: StoryViewer,
  comments: Comments,
  postMenu: PostMenu,
  search: Search,
  notifications: Notifications,
  inbox: Inbox,
  chat: Chat,
  profile: Profile,
  settings: Settings,
  city: CityPicker,
  more: More,
  invite: Invite,
  safety: Safety,
  lostDog: LostDog,
  recap: Recap,
  premium: Premium,
  onboarding: Onboarding,
  walkSummary: WalkSummary,
};
