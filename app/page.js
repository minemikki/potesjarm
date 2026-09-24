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

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("potesjarm-demo") || "{}");
      if (saved.city) setCity(saved.city);
      if (saved.joined) setJoined(saved.joined);
      if (saved.likes) setLiked(saved.likes);
      if (saved.joinedCircles) setJoinedCircles(saved.joinedCircles);
      if (saved.followedDogs) setFollowedDogs(saved.followedDogs);
      if (!localStorage.getItem("potesjarm-onboarded")) setShowOnboarding(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("potesjarm-demo", JSON.stringify({ city, joined, liked, joinedCircles, followedDogs }));
    } catch {}
  }, [city, joined, liked, joinedCircles, followedDogs]);

  useEffect(() => {
    if (!walkActive) return;
    const t = setInterval(() => {
      setWalkSeconds((s) => s + 1);
      setWalkDistance((d) => d + 0.003);
    }, 1000);
    return () => clearInterval(t);
  }, [walkActive]);

  const finishWalk = () => {
    setWalkActive(false);
    setWalkSeconds(0);
    setWalkDistance(0);
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
          <button onClick={() => setCity(city === "Stavanger" ? "Sandnes" : "Stavanger")}>
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
        </nav>

        <button className="primaryCta" onClick={() => setShowComposer(true)}>＋ Send signal</button>

        <button className="miniProfile" onClick={() => setShowProfile(true)}>
          <div className="avatar dogAvatar" />
          <div><b>Michael & Santos</b><span>18 dagers streak 🔥</span></div>
        </button>
      </aside>

      <section className="mainColumn">
        <header className="mobileHeader">
          <a className="logo" href="#"><span className="logoMark">♥</span><span>Potesjarm</span></a>
          <button className="cityPill" onClick={() => setCity(city === "Stavanger" ? "Sandnes" : "Stavanger")}>⌖ {city}⌄</button>
        </header>

        <div className="topBar">
          <div>
            <span className="kicker">LOKALT HUNDELIV</span>
            <h1>{tab === "For deg" ? `God morgen, ${city} 🐾` : tab}</h1>
          </div>
          <div className="topActions">
            <button onClick={() => setShowSearch(true)}>⌕</button><button onClick={() => setShowNotifications(true)}>♢</button>
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
                    <button>•••</button>
                  </div>
                  <h3>{post.title}</h3><p>{post.body}</p>
                  <img src={post.image} alt="" />
                  <div className="postMeta">
                    <button onClick={() => setLiked({ ...liked, [post.id]: !liked[post.id] })} className={liked[post.id] ? "liked" : ""}>{liked[post.id] ? "♥" : "♡"} {post.likes + (liked[post.id] ? 1 : 0)}</button>
                    <button>◯ {post.comments}</button><button className="save">⌑</button>
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
              {dogs.map((d,i) => <article className="dogCard" key={d.name}><img src={d.image} alt=""/><div className="dogInfo"><div><h3>{d.name}</h3><p>{d.breed}</p><span>⌖ {d.distance}</span></div><button className={followedDogs[i] ? "followed" : ""} onClick={() => setFollowedDogs({...followedDogs,[i]:!followedDogs[i]})}>{followedDogs[i] ? "♥" : "♡"}</button></div><div className="dogStats"><span>🔥 {d.streak} dager</span><span>♥ {d.match}% match</span></div></article>)}
            </div>
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
          <button onClick={() => setWalkActive(true)}>Start tur</button>
        </section>

        <section className="challengeCard">
          <span>UKENS UTFORDRING</span><h3>Utforsk 5 nye steder</h3><p>3 av 5 fullført</p><div className="progress"><i/></div><small>2 turer igjen til Fjellpote-merket 🏔️</small>
        </section>

        <section className="upcoming">
          <div className="sectionTitle compact"><div><span>KOMMER</span><h2>Nær deg</h2></div></div>
          <article><b>14</b><div><strong>Kveldstur rundt Mosvatnet</strong><span>Ons · 18:00 · 12 med</span></div></article>
          <article><b>18</b><div><strong>Strandtur på Solastranden</strong><span>Søn · 11:00 · 28 med</span></div></article>
        </section>
      </aside>

      <nav className="bottomNav">
        {nav.map(item => <button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}><span>{item==="For deg"?"⌂":item==="Signals"?"◉":item==="Sirkler"?"◎":"♙"}</span><small>{item}</small></button>)}
        <button onClick={()=>setTab("Kart")} className={tab==="Kart"?"active":""}><span>⌖</span><small>Kart</small></button>
      </nav>

      {showComposer && <div className="modalBackdrop" onClick={()=>setShowComposer(false)}><div className="composer" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowComposer(false)}>×</button><span>NYTT SIGNAL</span><h2>Hva skjer?</h2><textarea value={draftSignal} onChange={e=>setDraftSignal(e.target.value)} placeholder="F.eks. Noen som vil gå Mosvatnet kl. 18?"/><div className="composerTags"><button>🐕 Tur</button><button>🎾 Lek</button><button>❓ Spørsmål</button></div><button className="publish" onClick={addSignal}>Send signal</button></div></div>}

      {showPostComposer && <div className="modalBackdrop" onClick={()=>setShowPostComposer(false)}><div className="composer" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowPostComposer(false)}>×</button><span>NYTT INNLEGG</span><h2>Del hundelivet.</h2><textarea value={draftPost} onChange={e=>setDraftPost(e.target.value)} placeholder="Hva har du og hunden din gjort i dag?"/><div className="composerTags"><button>📷 Bilde</button><button>📍 Sted</button><button>🐾 Tur</button></div><button className="publish" onClick={addPost}>Publiser</button></div></div>}

      {showSearch && <div className="modalBackdrop" onClick={()=>setShowSearch(false)}><div className="searchModal" onClick={e=>e.stopPropagation()}><div className="searchBox"><span>⌕</span><input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Søk hund, sirkel, sted eller tur..."/><button onClick={()=>setShowSearch(false)}>×</button></div><div className="searchResults"><span>FORSLAG</span>{dogs.filter(d=>d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(d=><div key={d.name}><img src={d.image} alt=""/><div><b>{d.name}</b><small>{d.breed} · {d.distance}</small></div><button>Se profil</button></div>)}{circles.filter(c=>c.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,3).map(c=><div key={c.title}><img src={c.image} alt=""/><div><b>{c.title}</b><small>{c.members} medlemmer</small></div><button>Åpne</button></div>)}</div></div></div>}

      {showNotifications && <div className="drawerBackdrop" onClick={()=>setShowNotifications(false)}><aside className="drawer" onClick={e=>e.stopPropagation()}><div className="drawerHead"><div><span>AKTIVITET</span><h2>Varsler</h2></div><button onClick={()=>setShowNotifications(false)}>×</button></div><div className="notification"><b>🐾 Luna vil bli turvenn</b><p>94% match med Santos · 8 min siden</p></div><div className="notification"><b>🔥 18 dagers streak!</b><p>Én tur i dag holder streaken levende.</p></div><div className="notification"><b>🌲 Ny challenge i Stavanger</b><p>Utforsk 5 nye steder før søndag.</p></div><div className="notification"><b>🎾 Signal nær deg</b><p>Milo søker lekekamerat på Tjensvoll.</p></div></aside></div>}

      {showProfile && <div className="drawerBackdrop" onClick={()=>setShowProfile(false)}><aside className="drawer profileDrawer" onClick={e=>e.stopPropagation()}><div className="profileCover"><button onClick={()=>setShowProfile(false)}>×</button></div><div className="profileAvatar dogAvatar"/><h2>Santos</h2><p className="profileSub">Schæfer · Stavanger · 3 år</p><div className="profileStats"><div><b>18</b><span>streak</span></div><div><b>243</b><span>turer</span></div><div><b>812 km</b><span>sammen</span></div></div><div className="profileChips"><span>⚡ Høy energi</span><span>🌲 Fjelltur</span><span>🎾 Røff lek</span><span>🐕 Store hunder</span></div><h3>Merker</h3><div className="badgeRow"><span>🏔️<small>Fjellpote</small></span><span>🌧️<small>Regnkriger</small></span><span>🔥<small>14 dager</small></span><span>🌙<small>Nattugle</small></span></div><button className="profileAction">Rediger hundeprofil</button></aside></div>}

      {walkActive && <div className="walkOverlay"><div className="walkTop"><span>LIVE TUR</span><button onClick={finishWalk}>×</button></div><div className="walkPulse">🐾</div><h2>{walkDistance.toFixed(2)} km</h2><p>{String(Math.floor(walkSeconds/60)).padStart(2,"0")}:{String(walkSeconds%60).padStart(2,"0")} · Santos er på tur</p><div className="walkStats"><div><b>{Math.round(walkDistance*1312)}</b><span>skritt</span></div><div><b>{Math.round(walkDistance*72)}</b><span>kcal</span></div><div><b>+{Math.round(walkDistance*100)}</b><span>poter</span></div></div><button className="endWalk" onClick={finishWalk}>Avslutt tur</button></div>}

      {showOnboarding && <div className="modalBackdrop onboardingBackdrop"><div className="onboarding"><span className="onboardPaw">♥</span><span>VELKOMMEN TIL POTESJARM</span><h1>Hundeliv er bedre sammen.</h1><p>Finn turvenner, send lokale signals, bygg streaks og skap hundens historie – alt i byen din.</p><div className="onboardFeatures"><span>🐕 Lokale hundevenner</span><span>◉ Signals akkurat nå</span><span>🔥 Streaks & challenges</span><span>◎ Sirkler & fellesskap</span></div><button onClick={()=>{localStorage.setItem("potesjarm-onboarded","1");setShowOnboarding(false)}}>Kom i gang →</button></div></div>}
    </main>
  );
}
