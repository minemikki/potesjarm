"use client";

import { useMemo, useState } from "react";

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

  const nav = ["For deg", "Signals", "Sirkler", "Hunder"];
  const visibleSignals = useMemo(() => {
    if (signalFilter === "Alle") return signals;
    return signals.filter((s) => {
      const map = { Turer: "Tur", Lek: "Lek", Nå: "Nå" };
      return s.title.includes(map[signalFilter] || signalFilter) || s.meta.includes(map[signalFilter] || signalFilter);
    });
  }, [signalFilter]);

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

        <div className="miniProfile">
          <div className="avatar dogAvatar" />
          <div><b>Michael & Santos</b><span>18 dagers streak 🔥</span></div>
        </div>
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
            <button>⌕</button><button>♢</button>
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
              {signals.slice(0,3).map((s, i) => (
                <button key={s.title} className={"miniSignal " + s.tone} onClick={() => setJoined({ ...joined, [i]: !joined[i] })}>
                  <span className="signalIcon">{i === 0 ? "🐕" : i === 1 ? "🎾" : "🌲"}</span>
                  <b>{s.title}</b><small>{s.meta}</small>
                  <strong>{joined[i] ? "Du er med ✓" : s.action}</strong>
                </button>
              ))}
            </div>

            <div className="sectionTitle"><div><span>FOR DEG</span><h2>Fra hundelivet rundt deg</h2></div><button>Tilpass</button></div>
            <div className="feed">
              {feed.map((post) => (
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
              {circles.map(c => <article className="circleCard" key={c.title}><img src={c.image} alt=""/><div><h3>{c.title}</h3><p>{c.body}</p><span>{c.members} medlemmer</span><button>＋</button></div></article>)}
            </div>
          </>
        )}

        {tab === "Hunder" && (
          <>
            <section className="simpleIntro"><span>UTFORSK</span><h2>Nye snuter i nærheten.</h2><p>Finn turvenner med samme tempo, energi og lekestil.</p></section>
            <div className="dogGrid">
              {dogs.map(d => <article className="dogCard" key={d.name}><img src={d.image} alt=""/><div className="dogInfo"><div><h3>{d.name}</h3><p>{d.breed}</p><span>⌖ {d.distance}</span></div><button>♡</button></div><div className="dogStats"><span>🔥 {d.streak} dager</span><span>♥ {d.match}% match</span></div></article>)}
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
          <button>Start tur</button>
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

      {showComposer && <div className="modalBackdrop" onClick={()=>setShowComposer(false)}><div className="composer" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowComposer(false)}>×</button><span>NYTT SIGNAL</span><h2>Hva skjer?</h2><textarea placeholder="F.eks. Noen som vil gå Mosvatnet kl. 18?"/><div className="composerTags"><button>🐕 Tur</button><button>🎾 Lek</button><button>❓ Spørsmål</button></div><button className="publish" onClick={()=>setShowComposer(false)}>Send signal</button></div></div>}
    </main>
  );
}
