"use client";

import { useEffect, useMemo, useState } from "react";

const dogImg = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=86`;

const feed = [
  {
    id: 1,
    owner: "Lise & Luna",
    meta: "2 t siden · Stavanger",
    title: "Magisk kveldstur ved Mosvatnet i dag",
    body: "Sola, frisk luft og glade hunder! 🐾💙",
    image: dogImg("photo-1552053831-71594a27632d"),
    likes: 56,
    comments: 8,
  },
  {
    id: 2,
    owner: "Anders & Balto",
    meta: "34 min siden · Madla",
    title: "Fant en ny favorittsti",
    body: "Rolig på morgenen, masse plass og perfekt for langline.",
    image: dogImg("photo-1561037404-61cd46aa615b"),
    likes: 31,
    comments: 5,
  },
];

const signals = [
  { title: "Tur rundt Mosvatnet kl. 18", by: "Anders & Balto", meta: "Nå · 1,2 km unna", action: "Bli med", tone: "blue", members: 4 },
  { title: "Lekekamerat i kveld?", by: "Kari & Milo", meta: "12 min siden · Tjensvoll", action: "Vis interesse", tone: "amber", members: 3 },
  { title: "Noen på hundeparken nå?", by: "Henrik & Nala", meta: "25 min siden · Madla", action: "Jeg kommer", tone: "green", members: 5 },
  { title: "Rolig kveldstur i Sandnes", by: "Siri & Max", meta: "1 t siden · Sandnes", action: "Se signal", tone: "violet", members: 2 },
];

const circles = [
  { title: "Schæfer Rogaland", body: "For alle med schæfer og schæfer-interesse i Rogaland.", members: "482", image: dogImg("photo-1589941013453-ec89f33b5e95") },
  { title: "Valper Stavanger", body: "For valpeeiere og deg som venter valp.", members: "1,1k", image: dogImg("photo-1558788353-f76d92427f16") },
  { title: "Små hunder", body: "Chihuahua, pomeranian, fransk bulldog og flere.", members: "689", image: dogImg("photo-1517849845537-4d257902454a") },
  { title: "Fjelltur med hund", body: "For turglade hunder og eiere i Rogaland.", members: "1,4k", image: dogImg("photo-1507146426996-ef05306b995a") },
];

const dogs = [
  { name: "Luna", breed: "Golden retriever · 2 år", distance: "1,2 km unna", image: dogImg("photo-1552053831-71594a27632d"), streak: 28, match: 94 },
  { name: "Balto", breed: "Schæfer · 3 år", distance: "2,8 km unna", image: dogImg("photo-1589941013453-ec89f33b5e95"), streak: 41, match: 91 },
  { name: "Milo", breed: "Cockapoo · 1 år", distance: "3,4 km unna", image: dogImg("photo-1517423440428-a5a00ad493e8"), streak: 16, match: 88 },
];

const leaderboard = [
  { rank: 1, name: "Luna", owner: "Lise", km: 42.8, streak: 28, image: dogImg("photo-1552053831-71594a27632d") },
  { rank: 2, name: "Balto", owner: "Anders", km: 39.4, streak: 41, image: dogImg("photo-1589941013453-ec89f33b5e95") },
  { rank: 3, name: "Santos", owner: "Michael", km: 36.9, streak: 18, image: dogImg("photo-1589941013453-ec89f33b5e95") },
  { rank: 4, name: "Milo", owner: "Kari", km: 31.7, streak: 16, image: dogImg("photo-1517423440428-a5a00ad493e8") },
  { rank: 5, name: "Nala", owner: "Henrik", km: 29.2, streak: 11, image: dogImg("photo-1517849845537-4d257902454a") },
];

const challenges = [
  { id: "places", title: "Utforsk 5 nye steder", progress: 3, target: 5, reward: "🏔️ Fjellpote", end: "3 dager igjen" },
  { id: "distance", title: "Gå 25 km denne uka", progress: 18.6, target: 25, reward: "🔥 Ukeshelt", end: "3 dager igjen" },
  { id: "streak", title: "7 turdager på rad", progress: 6, target: 7, reward: "🐾 Stabil pote", end: "I morgen" },
];

const conversations = [
  { id: 1, name: "Lise & Luna", preview: "Vi kan møtes ved Mosvatnet kl. 18 😊", unread: 2, image: dogImg("photo-1552053831-71594a27632d") },
  { id: 2, name: "Anders & Balto", preview: "Balto elsker den ruta!", unread: 0, image: dogImg("photo-1589941013453-ec89f33b5e95") },
  { id: 3, name: "Kari & Milo", preview: "Passer torsdag for dere?", unread: 1, image: dogImg("photo-1517423440428-a5a00ad493e8") },
];

const events = [
  { id: 1, day: "27", month: "SEP", title: "Felles kveldstur rundt Mosvatnet", meta: "18:00 · Stavanger · 22 påmeldt", tag: "Tur" },
  { id: 2, day: "29", month: "SEP", title: "Valpetreff på Hundvåg", meta: "12:00 · Hundvåg · 14 påmeldt", tag: "Valp" },
  { id: 3, day: "04", month: "OKT", title: "Søndagstur til Dalsnuten", meta: "10:30 · Sandnes · 31 påmeldt", tag: "Fjell" },
];

const cities = ["Stavanger","Sandnes","Bergen","Oslo","Trondheim","Kristiansand"];
const moments = [
  { name:"Luna", label:"Morgentur", image:dogImg("photo-1552053831-71594a27632d") },
  { name:"Balto", label:"På fjellet", image:dogImg("photo-1589941013453-ec89f33b5e95") },
  { name:"Milo", label:"Valpeliv", image:dogImg("photo-1517423440428-a5a00ad493e8") },
  { name:"Nala", label:"Strand", image:dogImg("photo-1517849845537-4d257902454a") },
];

export default function Home() {
  const [tab, setTab] = useState("For deg");
  const [city, setCity] = useState("Stavanger");
  const [signalFilter, setSignalFilter] = useState("Alle");
  const [liked, setLiked] = useState({});
  const [joined, setJoined] = useState({});
  const [showComposer, setShowComposer] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [walkActive, setWalkActive] = useState(false);
  const [walkSeconds, setWalkSeconds] = useState(0);
  const [walkDistance, setWalkDistance] = useState(0);
  const [joinedCircles, setJoinedCircles] = useState({});
  const [followedDogs, setFollowedDogs] = useState({});
  const [localSignals, setLocalSignals] = useState(signals);
  const [localPosts, setLocalPosts] = useState(feed);
  const [draftSignal, setDraftSignal] = useState("");
  const [draftPost, setDraftPost] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInbox, setShowInbox] = useState(false);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState({
    1: ["Hei! Så signalet ditt 👋", "Vi kan møtes ved Mosvatnet kl. 18 😊"],
    2: ["Takk for turen sist!", "Balto elsker den ruta!"],
    3: ["Hei! Milo er ledig for lek denne uka.", "Passer torsdag for dere?"],
  });
  const [showDogMatch, setShowDogMatch] = useState(null);
  const [activityView, setActivityView] = useState("Oversikt");
  const [eventJoined, setEventJoined] = useState({});
  const [profileName, setProfileName] = useState("Santos");
  const [profileBio, setProfileBio] = useState("Schæfer · Stavanger · 3 år");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showComments, setShowComments] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentsByPost, setCommentsByPost] = useState({
    1:[{name:"Kari & Milo",text:"Åå, så fint der! 😍"},{name:"Henrik & Nala",text:"Vi må bli med neste gang."}],
    2:[{name:"Lise & Luna",text:"Denne stien er gull tidlig på dagen!"}],
  });
  const [savedPosts, setSavedPosts] = useState({});
  const [showPostMenu, setShowPostMenu] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [localEvents, setLocalEvents] = useState(events);
  const [showMoment, setShowMoment] = useState(null);
  const [toast, setToast] = useState("");
  const [walkSummary, setWalkSummary] = useState(null);
  const [privacyNearby, setPrivacyNearby] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("potesjarm-demo") || "{}");
      if (saved.city) setCity(saved.city);
      if (saved.joined) setJoined(saved.joined);
      if (saved.likes) setLiked(saved.likes);
      if (saved.joinedCircles) setJoinedCircles(saved.joinedCircles);
      if (saved.followedDogs) setFollowedDogs(saved.followedDogs);
      if (saved.savedPosts) setSavedPosts(saved.savedPosts);
      if (saved.eventJoined) setEventJoined(saved.eventJoined);
      if (!localStorage.getItem("potesjarm-onboarded")) setShowOnboarding(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("potesjarm-demo", JSON.stringify({ city, joined, liked, joinedCircles, followedDogs, savedPosts, eventJoined }));
    } catch {}
  }, [city, joined, liked, joinedCircles, followedDogs, savedPosts, eventJoined]);

  useEffect(() => {
    if (!walkActive) return;
    const t = setInterval(() => {
      setWalkSeconds((s) => s + 1);
      setWalkDistance((d) => d + 0.003);
    }, 1000);
    return () => clearInterval(t);
  }, [walkActive]);

  const finishWalk = () => {
    if (walkSeconds > 3) {
      setWalkSummary({ distance: Math.max(walkDistance, .42), seconds: Math.max(walkSeconds, 420), paws: Math.max(Math.round(walkDistance*100), 42) });
    }
    setWalkActive(false);
    setWalkSeconds(0);
    setWalkDistance(0);
  };

  const flash = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  };

  const addComment = () => {
    if (!showComments || !commentDraft.trim()) return;
    const id = showComments.id;
    setCommentsByPost({...commentsByPost,[id]:[...(commentsByPost[id]||[]),{name:"Michael & Santos",text:commentDraft.trim()}]});
    setCommentDraft("");
  };

  const createEvent = () => {
    if (!eventTitle.trim()) return;
    const id = Date.now();
    setLocalEvents([{id,day:"05",month:"OKT",title:eventTitle.trim(),meta:"12:00 · "+city+" · 1 påmeldt",tag:"Community"},...localEvents]);
    setEventJoined({...eventJoined,[id]:true});
    setEventTitle("");
    setShowCreateEvent(false);
    flash("Event opprettet ✓");
  };

  const addSignal = () => {
    if (!draftSignal.trim()) return;
    setLocalSignals([{ title: draftSignal.trim(), by: "Michael & Santos", meta: "Nå · " + city, action: "Bli med", tone: "blue", members: 1 }, ...localSignals]);
    setDraftSignal("");
    setShowComposer(false);
  };

  const addPost = () => {
    if (!draftPost.trim()) return;
    setLocalPosts([{ id: Date.now(), owner: "Michael & Santos", meta: "Nå · " + city, title: "Nytt fra Santos", body: draftPost.trim(), image: dogImg("photo-1589941013453-ec89f33b5e95"), likes: 0, comments: 0 }, ...localPosts]);
    setDraftPost("");
    setShowPostComposer(false);
  };

  const nav = ["For deg", "Signals", "Sirkler", "Hunder"];
  const visibleSignals = useMemo(() => {
    if (signalFilter === "Alle") return signals;
    return signals.filter((s) => {
      const map = { Turer: "Tur", Lek: "Lek", Nå: "Nå" };
      return s.title.includes(map[signalFilter] || signalFilter) || s.meta.includes(map[signalFilter] || signalFilter);
    });
  }, [signalFilter, localSignals]);

  return (
    <main className="appShell">
      <aside className="desktopRail">
        <a className="logo" href="#">
          <span className="logoMark">♥</span>
          <span>Potesjarm</span>
        </a>

        <div className="cityCard">
          <span>Din by</span>
          <button onClick={() => setShowCityPicker(true)}>
            <b>{city}</b><small>Bytt område</small>
          </button>
        </div>

        <nav className="railNav">
          {nav.map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
              <span>{item === "For deg" ? "⌂" : item === "Signals" ? "◉" : item === "Sirkler" ? "◎" : "♙"}</span>
              {item}
            </button>
          ))}
          <button onClick={() => setTab("Kart")} className={tab === "Kart" ? "active" : ""}><span>⌖</span>Kart</button>
          <button onClick={() => setTab("Aktivitet")} className={tab === "Aktivitet" ? "active" : ""}><span>🔥</span>Aktivitet</button>
          <button onClick={() => setTab("Events")} className={tab === "Events" ? "active" : ""}><span>◫</span>Events</button>
        </nav>

        <button className="primaryCta" onClick={() => setShowComposer(true)}>＋ Send signal</button>
        <button className="settingsLink" onClick={() => setShowSettings(true)}>⚙ Innstillinger</button>

        <button className="miniProfile" onClick={() => setShowProfile(true)}>
          <div className="avatar dogAvatar" />
          <div><b>Michael & Santos</b><span>18 dagers streak 🔥</span></div>
        </button>
      </aside>

      <section className="mainColumn">
        <header className="mobileHeader">
          <a className="logo" href="#"><span className="logoMark">♥</span><span>Potesjarm</span></a>
          <div className="mobileHeaderActions"><button onClick={() => setShowInbox(true)}>✉</button><button className="cityPill" onClick={() => setShowCityPicker(true)}>⌖ {city}⌄</button></div>
        </header>

        <div className="topBar">
          <div>
            <span className="kicker">LOKALT HUNDELIV</span>
            <h1>{tab === "For deg" ? `God morgen, ${city} 🐾` : tab}</h1>
          </div>
          <div className="topActions">
            <button onClick={() => setShowSearch(true)}>⌕</button><button onClick={() => setShowInbox(true)}>✉</button><button onClick={() => setShowNotifications(true)}>♢</button>
          </div>
        </div>

        <div className="mobileTabs">
          {nav.map((item) => <button key={item} onClick={() => setTab(item)} className={tab === item ? "active" : ""}>{item}</button>)}
        </div>

        {tab === "For deg" && (
          <>
            <section className="heroCard">
              <div className="heroCopy">
                <span className="liveDot">● LIVE I {city.toUpperCase()}</span>
                <h2>Hvem vil ut<br/>på tur i dag?</h2>
                <p>Finn hundevenner, lokale turer og små øyeblikk rundt deg.</p>
                <div className="heroBtns"><button onClick={() => setShowComposer(true)}>Send signal</button><button onClick={() => setTab("Kart")}>Åpne kart</button></div>
              </div>
              <div className="heroDog" />
              <div className="heroBadge"><b>12</b><span>aktive nå</span></div>
            </section>

            <div className="momentsRow">
              <button className="moment addMoment" onClick={()=>setShowPostComposer(true)}><span>＋</span><small>Din story</small></button>
              {moments.map(m=><button className="moment" key={m.name} onClick={()=>setShowMoment(m)}><span><img src={m.image} alt=""/></span><b>{m.name}</b><small>{m.label}</small></button>)}
            </div>
            <div className="homeShortcuts">
              <button onClick={()=>setTab("Aktivitet")}><span>🔥</span><div><b>18 dagers streak</b><small>Se fremgang og challenges</small></div><strong>→</strong></button>
              <button onClick={()=>setTab("Events")}><span>◫</span><div><b>3 events nær deg</b><small>Neste: Mosvatnet fredag</small></div><strong>→</strong></button>
            </div>
            <div className="sectionTitle"><div><span>AKKURAT NÅ</span><h2>Signals nær deg</h2></div><button onClick={() => setTab("Signals")}>Se alle →</button></div>
            <div className="signalStrip">
              {localSignals.slice(0,3).map((s, i) => (
                <button key={s.title} className={"miniSignal " + s.tone} onClick={() => setJoined({ ...joined, [i]: !joined[i] })}>
                  <span className="signalIcon">{i === 0 ? "🐕" : i === 1 ? "🎾" : "🌲"}</span>
                  <b>{s.title}</b><small>{s.meta}</small>
                  <strong>{joined[i] ? "Du er med ✓" : s.action}</strong>
                </button>
              ))}
            </div>

            <div className="sectionTitle"><div><span>FOR DEG</span><h2>Fra hundelivet rundt deg</h2></div><button>Tilpass</button></div>
            <div className="quickPost"><button onClick={() => setShowPostComposer(true)}>＋ Del et øyeblikk fra hundelivet</button></div>
            <div className="feed">
              {localPosts.map((post) => (
                <article className="post" key={post.id}>
                  <div className="postHead">
                    <div className="avatar dogAvatar small" />
                    <div><b>{post.owner}</b><span>{post.meta}</span></div>
                    <button onClick={()=>setShowPostMenu(post)}>•••</button>
                  </div>
                  <h3>{post.title}</h3><p>{post.body}</p>
                  <img src={post.image} alt="" />
                  <div className="postMeta">
                    <button onClick={() => setLiked({ ...liked, [post.id]: !liked[post.id] })} className={liked[post.id] ? "liked" : ""}>{liked[post.id] ? "♥" : "♡"} {post.likes + (liked[post.id] ? 1 : 0)}</button>
                    <button onClick={()=>setShowComments(post)}>◯ {(commentsByPost[post.id]||[]).length || post.comments}</button><button onClick={()=>flash("Delingslenke kopiert i demo")} >↗</button><button onClick={()=>setSavedPosts({...savedPosts,[post.id]:!savedPosts[post.id]})} className={"save "+(savedPosts[post.id]?"saved":"")}>{savedPosts[post.id]?"▣":"⌑"}</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "Signals" && (
          <>
            <section className="signalHero">
              <div><span className="liveDot">● LIVE</span><h2>Hva skjer rundt deg nå?</h2><p>Korte, lokale signaler som gjør det lettere å møtes.</p></div>
              <button onClick={() => setShowComposer(true)}>＋ Nytt signal</button>
            </section>
            <div className="filters">
              {["Alle","Turer","Lek","Spørsmål","Nå"].map(f => <button key={f} onClick={() => setSignalFilter(f)} className={signalFilter===f?"active":""}>{f}</button>)}
            </div>
            <div className="signalList">
              {visibleSignals.map((s, i) => (
                <article className="signalCard" key={s.title}>
                  <div className={"statusOrb " + s.tone}>●</div>
                  <div className="signalText"><span>{s.by}</span><h3>{s.title}</h3><p>{s.meta}</p><small>{s.members} er interesserte</small></div>
                  <button onClick={() => setJoined({ ...joined, ["sig"+i]: !joined["sig"+i] })}>{joined["sig"+i] ? "Med ✓" : s.action}</button>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "Sirkler" && (
          <>
            <section className="simpleIntro"><span>FELLESSKAP</span><h2>Finn flokken din.</h2><p>Lokale og interessebaserte sirkler for folk som faktisk har noe til felles.</p></section>
            <div className="filters"><button className="active">Alle</button><button>Rase</button><button>Aktivitet</button><button>Valp</button><button>Lokalt</button></div>
            <div className="circleGrid">
              {circles.map((c,i) => <article className="circleCard" key={c.title}><img src={c.image} alt=""/><div><h3>{c.title}</h3><p>{c.body}</p><span>{c.members} medlemmer</span><button className={joinedCircles[i] ? "joined" : ""} onClick={() => setJoinedCircles({...joinedCircles,[i]:!joinedCircles[i]})}>{joinedCircles[i] ? "✓" : "＋"}</button></div></article>)}
            </div>
          </>
        )}

        {tab === "Hunder" && (
          <>
            <section className="simpleIntro"><span>UTFORSK</span><h2>Nye snuter i nærheten.</h2><p>Finn turvenner med samme tempo, energi og lekestil.</p></section>
            <div className="dogGrid">
              {dogs.map((d,i) => <article className="dogCard" key={d.name}><button className="dogOpen" onClick={() => setShowDogMatch(d)}><img src={d.image} alt=""/></button><div className="dogInfo"><div><h3>{d.name}</h3><p>{d.breed}</p><span>⌖ {d.distance}</span></div><button className={followedDogs[i] ? "followed" : ""} onClick={() => setFollowedDogs({...followedDogs,[i]:!followedDogs[i]})}>{followedDogs[i] ? "♥" : "♡"}</button></div><div className="dogStats"><span>🔥 {d.streak} dager</span><span>♥ {d.match}% match</span></div></article>)}
            </div>
          </>
        )}

        {tab === "Aktivitet" && (
          <>
            <section className="simpleIntro activityIntro"><span>GAMIFICATION</span><h2>Gjør hver tur til fremgang.</h2><p>Bygg streak, samle merker og se hvordan dere ligger an lokalt.</p></section>
            <div className="activityTabs">{["Oversikt","Leaderboard","Merker"].map(v=><button key={v} onClick={()=>setActivityView(v)} className={activityView===v?"active":""}>{v}</button>)}</div>
            {activityView === "Oversikt" && <div className="activityGrid">
              <article className="metricHero"><span>UKA DI</span><b>36,9 km</b><small>+14% fra forrige uke</small><div className="bars">{[45,70,52,82,64,92,38].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div></article>
              <article className="metricCard"><span>🔥</span><b>18 dager</b><small>Nåværende streak</small></article>
              <article className="metricCard"><span>🐾</span><b>2 840</b><small>Poter denne uka</small></article>
              <article className="metricCard"><span>🏆</span><b>#3</b><small>I Stavanger</small></article>
            </div>}
            {activityView === "Oversikt" && <div className="challengeList">{challenges.map(c=><article key={c.id}><div><span>{c.end}</span><h3>{c.title}</h3><p>{c.reward}</p></div><div className="challengeProgress"><b>{c.progress} / {c.target}</b><div><i style={{width:Math.min(100,(c.progress/c.target)*100)+"%"}}/></div></div></article>)}</div>}
            {activityView === "Leaderboard" && <div className="leaderboard">{leaderboard.map(row=><article key={row.rank} className={row.name==="Santos"?"me":""}><b className="rank">{row.rank}</b><img src={row.image} alt=""/><div><strong>{row.name}</strong><span>{row.owner}</span></div><div className="lbScore"><b>{row.km} km</b><span>🔥 {row.streak}</span></div></article>)}</div>}
            {activityView === "Merker" && <div className="badgeGallery">{[["🏔️","Fjellpote","Fullført"],["🌧️","Regnkriger","Fullført"],["🔥","14 dager","Fullført"],["🌙","Nattugle","8/10"],["❄️","Vinterpote","Låst"],["🌊","Badehund","2/5"],["🗺️","Utforsker","12/20"],["💯","100 km","82/100"]].map(([icon,name,status])=><article key={name}><span>{icon}</span><h3>{name}</h3><p>{status}</p></article>)}</div>}
          </>
        )}

        {tab === "Events" && (
          <>
            <section className="simpleIntro eventIntro"><div><span>SKJER I NÆRHETEN</span><h2>Møt flokken i virkeligheten.</h2><p>Lokale turer, valpetreff og hundevennlige aktiviteter.</p></div><button onClick={()=>setShowCreateEvent(true)}>＋ Lag event</button></section>
            <div className="eventList">{localEvents.map(e=><article key={e.id}><div className="eventDate"><b>{e.day}</b><span>{e.month}</span></div><div className="eventCopy"><span>{e.tag}</span><h3>{e.title}</h3><p>{e.meta}</p></div><button onClick={()=>setEventJoined({...eventJoined,[e.id]:!eventJoined[e.id]})}>{eventJoined[e.id]?"Påmeldt ✓":"Bli med"}</button></article>)}</div>
          </>
        )}

        {tab === "Kart" && (
          <section className="mapPanel">
            <div className="mapCanvas">
              <div className="road r1"/><div className="road r2"/><div className="lake"/>
              {[[18,26,"🐾"],[58,30,"🐕"],[43,58,"🎾"],[71,68,"🌲"],[28,72,"🐾"]].map(([x,y,icon],i)=><div key={i} className="mapPin" style={{left:x+"%",top:y+"%"}}>{icon}</div>)}
              <div className="youPin">●</div>
            </div>
            <div className="mapSheet"><span>RUNDT DEG</span><h2>5 ting skjer i nærheten</h2><p>Mosvatnet · Madla · Tjensvoll · sentrum</p><button onClick={()=>setTab("Signals")}>Se aktive signals →</button></div>
          </section>
        )}
      </section>

      <aside className="rightRail">
        <section className="streakCard">
          <div className="streakTop"><span>DIN STREAK</span><b>🔥 18 dager</b></div>
          <div className="week">{["M","T","O","T","F","L","S"].map((d,i)=><span className={i<6?"done":""} key={i}>{i<6?"🐾":d}</span>)}</div>
          <p>Én tur i dag holder streaken levende.</p>
          <button onClick={() => setWalkActive(true)}>Start tur</button><button className="secondaryRailBtn" onClick={() => setTab("Aktivitet")}>Se fremgang</button>
        </section>

        <section className="challengeCard">
          <span>UKENS UTFORDRING</span><h3>Utforsk 5 nye steder</h3><p>3 av 5 fullført</p><div className="progress"><i/></div><small>2 turer igjen til Fjellpote-merket 🏔️</small>
        </section>

        <section className="upcoming">
          <div className="sectionTitle compact"><div><span>KOMMER</span><h2>Nær deg</h2></div></div>
          <article onClick={()=>setTab("Events")}><b>27</b><div><strong>Kveldstur rundt Mosvatnet</strong><span>Fre · 18:00 · 22 med</span></div></article>
          <article onClick={()=>setTab("Events")}><b>29</b><div><strong>Valpetreff på Hundvåg</strong><span>Søn · 12:00 · 14 med</span></div></article>
        </section>
      </aside>

      <nav className="bottomNav">
        {nav.map(item => <button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}><span>{item==="For deg"?"⌂":item==="Signals"?"◉":item==="Sirkler"?"◎":"♙"}</span><small>{item}</small></button>)}
        <button onClick={()=>setTab("Kart")} className={tab==="Kart"?"active":""}><span>⌖</span><small>Kart</small></button>
      </nav>
      <button className="mobileFab" onClick={()=>setShowComposer(true)}>＋</button>

      {showComposer && <div className="modalBackdrop" onClick={()=>setShowComposer(false)}><div className="composer" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowComposer(false)}>×</button><span>NYTT SIGNAL</span><h2>Hva skjer?</h2><textarea value={draftSignal} onChange={e=>setDraftSignal(e.target.value)} placeholder="F.eks. Noen som vil gå Mosvatnet kl. 18?"/><div className="composerTags"><button>🐕 Tur</button><button>🎾 Lek</button><button>❓ Spørsmål</button></div><button className="publish" onClick={addSignal}>Send signal</button></div></div>}

      {showPostComposer && <div className="modalBackdrop" onClick={()=>setShowPostComposer(false)}><div className="composer" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowPostComposer(false)}>×</button><span>NYTT INNLEGG</span><h2>Del hundelivet.</h2><textarea value={draftPost} onChange={e=>setDraftPost(e.target.value)} placeholder="Hva har du og hunden din gjort i dag?"/><div className="composerTags"><button>📷 Bilde</button><button>📍 Sted</button><button>🐾 Tur</button></div><button className="publish" onClick={addPost}>Publiser</button></div></div>}

      {showSearch && <div className="modalBackdrop" onClick={()=>setShowSearch(false)}><div className="searchModal" onClick={e=>e.stopPropagation()}><div className="searchBox"><span>⌕</span><input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Søk hund, sirkel, sted eller tur..."/><button onClick={()=>setShowSearch(false)}>×</button></div><div className="searchResults"><span>FORSLAG</span>{dogs.filter(d=>d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(d=><div key={d.name}><img src={d.image} alt=""/><div><b>{d.name}</b><small>{d.breed} · {d.distance}</small></div><button>Se profil</button></div>)}{circles.filter(c=>c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,3).map(c=><div key={c.title}><img src={c.image} alt=""/><div><b>{c.title}</b><small>{c.members} medlemmer</small></div><button>Åpne</button></div>)}</div></div></div>}

      {showNotifications && <div className="drawerBackdrop" onClick={()=>setShowNotifications(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawerHead"><div><span>AKTIVITET</span><h2>Varsler</h2></div><button onClick={()=>setShowNotifications(false)}>×</button></div><div className="notification"><b>🐾 Luna vil bli turvenn</b><p>94% match med Santos · 8 min siden</p></div><div className="notification"><b>🔥 18 dagers streak!</b><p>Én tur i dag holder streaken levende.</p></div><div className="notification"><b>🌲 Ny challenge i Stavanger</b><p>Utforsk 5 nye steder før søndag.</p></div><div className="notification"><b>🎾 Signal nær deg</b><p>Milo søker lekekamerat på Tjensvoll.</p></div></aside></div>}

      {showProfile && <div className="drawerBackdrop" onClick={()=>setShowProfile(false)}><aside className="drawer profileDrawer" onClick={e=>e.stopPropagation()}><div className="profileCover"><button onClick={()=>setShowProfile(false)}>×</button></div><div className="profileAvatar dogAvatar"/>{editingProfile ? <div className="profileEdit"><input value={profileName} onChange={e=>setProfileName(e.target.value)}/><input value={profileBio} onChange={e=>setProfileBio(e.target.value)}/></div> : <><h2>{profileName}</h2><p className="profileSub">{profileBio}</p></>}<div className="profileStats"><div><b>18</b><span>streak</span></div><div><b>243</b><span>turer</span></div><div><b>812 km</b><span>sammen</span></div></div><div className="profileChips"><span>⚡ Høy energi</span><span>🌲 Fjelltur</span><span>🎾 Røff lek</span><span>🐕 Store hunder</span></div><h3>Merker</h3><div className="badgeRow"><span>🏔️<small>Fjellpote</small></span><span>🌧️<small>Regnkriger</small></span><span>🔥<small>14 dager</small></span><span>🌙<small>Nattugle</small></span></div><button className="profileAction" onClick={()=>setEditingProfile(!editingProfile)}>{editingProfile ? "Lagre profil" : "Rediger hundeprofil"}</button></aside></div>}


      {showComments && <div className="drawerBackdrop" onClick={()=>setShowComments(null)}><aside className="drawer commentsDrawer" onClick={e=>e.stopPropagation()}><div className="drawerHead"><div><span>SAMTALE</span><h2>Kommentarer</h2></div><button onClick={()=>setShowComments(null)}>×</button></div><div className="commentsList">{(commentsByPost[showComments.id]||[]).map((c,i)=><div className="commentItem" key={i}><div className="avatar dogAvatar small"/><div><b>{c.name}</b><p>{c.text}</p><span>Lik · Svar</span></div></div>)}</div><form className="commentComposer" onSubmit={e=>{e.preventDefault();addComment()}}><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Skriv en kommentar..."/><button>Send</button></form></aside></div>}

      {showPostMenu && <div className="actionSheetBackdrop" onClick={()=>setShowPostMenu(null)}><div className="actionSheet" onClick={e=>e.stopPropagation()}><div className="sheetHandle"/><b>{showPostMenu.owner}</b><button onClick={()=>{setSavedPosts({...savedPosts,[showPostMenu.id]:true});setShowPostMenu(null);flash("Innlegg lagret")}}>⌑ Lagre innlegg</button><button onClick={()=>{setShowPostMenu(null);flash("Du ser færre lignende innlegg")}}>◌ Ikke interessert</button><button onClick={()=>{setShowPostMenu(null);flash("Innlegg rapportert til moderering")}}>⚑ Rapporter innlegg</button><button className="danger" onClick={()=>{setShowPostMenu(null);flash("Bruker blokkert i demo")}}>⊘ Blokker bruker</button><button onClick={()=>setShowPostMenu(null)}>Avbryt</button></div></div>}

      {showSettings && <div className="drawerBackdrop" onClick={()=>setShowSettings(false)}><aside className="drawer settingsDrawer" onClick={e=>e.stopPropagation()}><div className="drawerHead"><div><span>PREFERANSER</span><h2>Innstillinger</h2></div><button onClick={()=>setShowSettings(false)}>×</button></div><section><h3>Personvern</h3><label className="toggleRow"><div><b>Vis meg i nærmiljøet</b><span>Andre kan finne Santos i Hunder.</span></div><input type="checkbox" checked={privacyNearby} onChange={e=>setPrivacyNearby(e.target.checked)}/></label><label className="toggleRow"><div><b>Push-varsler</b><span>Signals, meldinger og streaks.</span></div><input type="checkbox" checked={pushEnabled} onChange={e=>setPushEnabled(e.target.checked)}/></label></section><section><h3>By og område</h3><button className="settingButton" onClick={()=>{setShowSettings(false);setShowCityPicker(true)}}>⌖ {city}<span>Endre →</span></button></section><section><h3>Sikkerhet</h3><button className="settingButton">Blokkerte profiler<span>0 →</span></button><button className="settingButton">Rapporter og trygghet<span>Åpne →</span></button></section></aside></div>}

      {showCityPicker && <div className="modalBackdrop" onClick={()=>setShowCityPicker(false)}><div className="cityPicker" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowCityPicker(false)}>×</button><span>VELG OMRÅDE</span><h2>Hvor skjer hundelivet?</h2><p>Feed, Signals og events tilpasses byen din.</p><div>{cities.map(c=><button key={c} className={city===c?"active":""} onClick={()=>{setCity(c);setShowCityPicker(false);flash("Byttet til "+c)}}><span>⌖</span><b>{c}</b>{city===c&&<i>✓</i>}</button>)}</div></div></div>}

      {showCreateEvent && <div className="modalBackdrop" onClick={()=>setShowCreateEvent(false)}><div className="composer eventComposer" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowCreateEvent(false)}>×</button><span>NYTT EVENT</span><h2>Samle hundefolk.</h2><input value={eventTitle} onChange={e=>setEventTitle(e.target.value)} placeholder="F.eks. Søndagstur på Byhaugen"/><div className="eventFormGrid"><button>📍 {city}</button><button>🗓 5. okt</button><button>🕛 12:00</button><button>🐕 Alle hunder</button></div><textarea placeholder="Beskriv turen eller treffet..."/><button className="publish" onClick={createEvent}>Publiser event</button></div></div>}

      {showMoment && <div className="momentBackdrop" onClick={()=>setShowMoment(null)}><div className="momentViewer" onClick={e=>e.stopPropagation()}><div className="momentProgress"><i/></div><div className="momentHead"><div><img src={showMoment.image} alt=""/><b>{showMoment.name}</b></div><button onClick={()=>setShowMoment(null)}>×</button></div><img className="momentImage" src={showMoment.image} alt=""/><div className="momentCaption"><span>{showMoment.label}</span><b>Et lite øyeblikk fra hundelivet 🐾</b></div></div></div>}

      {walkSummary && <div className="modalBackdrop celebrationBackdrop" onClick={()=>setWalkSummary(null)}><div className="walkSummaryCard" onClick={e=>e.stopPropagation()}><span className="celebrateIcon">🔥</span><span>TUR FULLFØRT</span><h2>Streaken lever!</h2><p>Santos og du la enda en tur til historien deres.</p><div className="summaryStats"><div><b>{walkSummary.distance.toFixed(2)} km</b><span>Distanse</span></div><div><b>{Math.floor(walkSummary.seconds/60)} min</b><span>Tid</span></div><div><b>+{walkSummary.paws}</b><span>Poter</span></div></div><div className="streakCelebration">🔥 <b>19 dager</b><span>Ny streak</span></div><button onClick={()=>{setWalkSummary(null);setTab("Aktivitet")}}>Se fremgangen →</button></div></div>}

      {showInbox && <div className="drawerBackdrop" onClick={()=>setShowInbox(false)}><aside className="drawer inboxDrawer" onClick={e=>e.stopPropagation()}><div className="drawerHead"><div><span>MELDINGER</span><h2>Innboks</h2></div><button onClick={()=>setShowInbox(false)}>×</button></div>{conversations.map(c=><button className="conversationRow" key={c.id} onClick={()=>setActiveConversation(c)}><img src={c.image} alt=""/><div><b>{c.name}</b><span>{c.preview}</span></div>{c.unread>0&&<i>{c.unread}</i>}</button>)}</aside></div>}

      {activeConversation && <div className="modalBackdrop" onClick={()=>setActiveConversation(null)}><div className="chatModal" onClick={e=>e.stopPropagation()}><div className="chatHead"><button onClick={()=>setActiveConversation(null)}>←</button><img src={activeConversation.image} alt=""/><div><b>{activeConversation.name}</b><span>Aktiv nylig</span></div></div><div className="chatBody">{(messages[activeConversation.id]||[]).map((m,i)=><div key={i} className={"bubble "+(i%2?"mine":"theirs")}>{m}</div>)}</div><form className="chatComposer" onSubmit={e=>{e.preventDefault();if(!messageDraft.trim())return;setMessages({...messages,[activeConversation.id]:[...(messages[activeConversation.id]||[]),messageDraft.trim()]});setMessageDraft("")}}><input value={messageDraft} onChange={e=>setMessageDraft(e.target.value)} placeholder="Skriv en melding..."/><button>Send</button></form></div></div>}

      {showDogMatch && <div className="modalBackdrop" onClick={()=>setShowDogMatch(null)}><div className="dogMatchModal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowDogMatch(null)}>×</button><img className="matchHero" src={showDogMatch.image} alt=""/><div className="matchScore"><b>{showDogMatch.match}%</b><span>match med Santos</span></div><h2>{showDogMatch.name}</h2><p>{showDogMatch.breed} · {showDogMatch.distance}</p><div className="matchReasons"><span>✓ Samme energinivå</span><span>✓ Liker aktive turer</span><span>✓ Passende lekestil</span><span>✓ Bor i nærheten</span></div><div className="matchActions"><button onClick={()=>{setShowDogMatch(null);setShowInbox(true)}}>Send melding</button><button onClick={()=>{setShowDogMatch(null);setShowComposer(true)}}>Foreslå tur</button></div></div></div>}

      {walkActive && <div className="walkOverlay"><div className="walkTop"><span>LIVE TUR</span><button onClick={finishWalk}>×</button></div><div className="walkPulse">🐾</div><h2>{walkDistance.toFixed(2)} km</h2><p>{String(Math.floor(walkSeconds/60)).padStart(2,"0")}:{String(walkSeconds%60).padStart(2,"0")} · Santos er på tur</p><div className="walkStats"><div><b>{Math.round(walkDistance*1312)}</b><span>skritt</span></div><div><b>{Math.round(walkDistance*72)}</b><span>kcal</span></div><div><b>+{Math.round(walkDistance*100)}</b><span>poter</span></div></div><button className="endWalk" onClick={finishWalk}>Avslutt tur</button></div>}

      {toast && <div className="toast">{toast}</div>}

      {showOnboarding && <div className="modalBackdrop onboardingBackdrop"><div className="onboarding"><span className="onboardPaw">♥</span><span>VELKOMMEN TIL POTESJARM</span><h1>Hundeliv er bedre sammen.</h1><p>Finn turvenner, send lokale signals, bygg streaks og skap hundens historie – alt i byen din.</p><div className="onboardFeatures"><span>🐕 Lokale hundevenner</span><span>◉ Signals akkurat nå</span><span>🔥 Streaks & challenges</span><span>◎ Sirkler & fellesskap</span></div><button onClick={()=>{localStorage.setItem("potesjarm-onboarded","1");setShowOnboarding(false)}}>Kom i gang →</button></div></div>}
    </main>
  );
}
