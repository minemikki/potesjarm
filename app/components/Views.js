"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import { useApp } from "./store";
import { MeetupCard, PostCard } from "./Home";
import { Avatar, AvatarStack, Bar, Chips, Meter, RouteSketch, SectionHead } from "./ui";
import { areasByCity, badges, challenges, dogById, dogs, fmtKm, groups, img, leaderboard, meetupTypes, ME, places, PHOTO, routes } from "../lib/data";

/* ---------- Nå skjer ---------- */
export function NowView() {
  const app = useApp();
  const [type, setType] = useState("alle");
  const [sort, setSort] = useState("tid");
  const list = useMemo(() => {
    let l = app.meetups.filter((m) => type === "alle" || (type === "mine" ? app.going[m.id] || m.mine : m.type === type));
    return [...l].sort((a, b) => (sort === "tid" ? a.startsIn - b.startsIn : a.km - b.km));
  }, [app.meetups, type, sort, app.going]);
  const liveNow = app.meetups.filter((m) => m.startsIn <= 30);
  return (
    <div className="view">
      <section className="nowHero">
        <div>
          <span className="heroLive"><i /> {liveNow.length} TREFF STARTER SNART</span>
          <h2>Hvem er ute med hunden nå?</h2>
          <p>Bli med på noe spontant – eller lag ditt eget treff på ti sekunder.</p>
        </div>
        <div className="nowHeroSide">
          <AvatarStack ids={["balto", "luna", "nala", "milo"]} size={34} max={4} />
          <button className="pillBtn white big" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={19} stroke={2.6} /> Lag treff</button>
        </div>
      </section>

      <div className="toolbar">
        <Chips
          items={[{ id: "alle", label: "Alle", icon: "grid" }, ...meetupTypes.map((t) => ({ id: t.id, label: t.label, icon: t.icon })), { id: "mine", label: "Mine", icon: "check" }]}
          value={type}
          onChange={setType}
        />
        <div className="segmented">
          <button className={sort === "tid" ? "active" : ""} onClick={() => setSort("tid")}><Icon name="clock" size={15} /> Snarest</button>
          <button className={sort === "km" ? "active" : ""} onClick={() => setSort("km")}><Icon name="pin" size={15} /> Nærmest</button>
        </div>
      </div>

      {list.length ? (
        <div className="meetGrid">
          {list.map((m) => <MeetupCard key={m.id} m={m} />)}
        </div>
      ) : (
        <Empty icon="live" title="Ingen treff her ennå" text="Vær den første – lag et treff, så får hundeeiere i nærheten beskjed." cta="Lag treff" onCta={() => app.open("meetupComposer")} />
      )}
    </div>
  );
}

export function Empty({ icon, title, text, cta, onCta }) {
  return (
    <div className="empty">
      <span><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {cta && <button className="pillBtn primary" onClick={onCta}>{cta}</button>}
    </div>
  );
}

/* ---------- Grupper ---------- */
export function GroupsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");
  if (app.groupId) return <GroupPage id={app.groupId} />;
  const mine = groups.filter((g) => app.joinedGroups[g.id]);
  const list = groups.filter((g) => filter === "Alle" || g.tag === filter);
  return (
    <div className="view">
      {mine.length > 0 && (
        <section className="block first">
          <SectionHead title="Dine grupper" />
          <div className="myGroups">
            {mine.map((g) => (
              <button key={g.id} className={"myGroup tint-" + g.color} onClick={() => app.openGroup(g.id)}>
                <img src={img(g.photo, 160, 160)} alt="" />
                <span><b>{g.name}</b><small><i className="dotLive" /> {g.activeNow} aktive nå</small></span>
                <Icon name="chevronRight" size={18} />
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="block first">
        <SectionHead title="Finn flokken din" />
        <Chips items={["Alle", "Rase", "Aktivitet", "Valp", "Lokalt"]} value={filter} onChange={setFilter} />
        <div className="groupGrid">
          {list.map((g) => (
            <article key={g.id} className={"groupCard tint-" + g.color}>
              <button className="groupCover" onClick={() => app.openGroup(g.id)}>
                <img src={img(g.photo, 600, 360)} alt="" loading="lazy" />
                <span className="groupTag">{g.tag}</span>
              </button>
              <div className="groupInfo">
                <h3 onClick={() => app.openGroup(g.id)}>{g.name}</h3>
                <p>{g.about}</p>
                <div className="groupFoot">
                  <span><AvatarStack ids={g.faces} size={22} /> {g.members.toLocaleString("nb-NO")} medlemmer</span>
                  <button className={"pillBtn small " + (app.joinedGroups[g.id] ? "done" : "soft")} onClick={() => app.toggleGroup(g.id)}>
                    {app.joinedGroups[g.id] ? <><Icon name="check" size={14} stroke={2.6} /> Medlem</> : "Bli med"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function GroupPage({ id }) {
  const app = useApp();
  const g = groups.find((x) => x.id === id);
  const [tab, setTab] = useState("Innlegg");
  const joined = !!app.joinedGroups[g.id];
  const members = [...new Set([...g.faces, ...dogs.map((d) => d.id)])];
  return (
    <div className="view groupPage">
      <button className="backLink" onClick={app.closeGroup}><Icon name="chevronLeft" size={18} /> Alle grupper</button>
      <section className={"groupHeader tint-" + g.color}>
        <div className="groupBanner" style={{ backgroundImage: `url(${img(g.photo, 1400, 500)})` }} />
        <div className="groupHeaderBody">
          <img className="groupAvatar" src={img(g.photo, 200, 200)} alt="" />
          <div className="groupTitle">
            <span className="kicker">{g.tag.toUpperCase()} · {app.city.toUpperCase()}</span>
            <h2>{g.name}</h2>
            <p>{g.about}</p>
            <div className="groupMeta">
              <span><AvatarStack ids={g.faces} size={24} /> {g.members.toLocaleString("nb-NO")} medlemmer</span>
              <span><i className="dotLive" /> {g.activeNow} aktive nå</span>
            </div>
          </div>
          <div className="groupCtas">
            <button className={"pillBtn " + (joined ? "done" : "primary")} onClick={() => app.toggleGroup(g.id)}>
              {joined ? <><Icon name="check" size={16} stroke={2.6} /> Medlem</> : <><Icon name="plus" size={16} stroke={2.6} /> Bli med</>}
            </button>
            <button className="pillBtn soft" onClick={() => app.flash("Invitasjonslenke kopiert", "send")}><Icon name="userPlus" size={16} /> Inviter</button>
          </div>
        </div>
      </section>

      <Chips items={["Innlegg", "Treff", "Medlemmer"]} value={tab} onChange={setTab} />

      {tab === "Innlegg" && (
        <>
          <button className="composeBar" onClick={() => app.open("postComposer")}>
            <Avatar src={ME.photo} size={36} />
            <span>Del noe med {g.name}…</span>
            <Icon name="image" size={20} />
          </button>
          <div className="feedGrid two">
            {app.posts.slice(0, 4).map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </>
      )}
      {tab === "Treff" && (
        <div className="meetGrid">
          {app.meetups.slice(0, 3).map((m) => <MeetupCard key={m.id} m={m} />)}
        </div>
      )}
      {tab === "Medlemmer" && (
        <div className="memberList">
          {members.map((mid) => {
            const d = dogById(mid);
            return (
              <button key={mid} className="memberRow" onClick={() => app.open("dog", mid)}>
                <Avatar id={mid} size={46} online={d.online} />
                <span><b>{d.owner} & {d.name}</b><small>{d.breed} · {fmtKm(d.km)} km unna</small></span>
                {g.faces[0] === mid && <span className="roleTag">Admin</span>}
                <Icon name="chevronRight" size={18} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Hunder / matching ---------- */
export function DogsView() {
  const app = useApp();
  const [energy, setEnergy] = useState("Alle");
  const [size, setSize] = useState("Alle");
  const list = dogs
    .filter((d) => energy === "Alle" || (energy === "Rolig" ? d.energy <= 3 : d.energy >= 4))
    .filter((d) => size === "Alle" || d.size === size)
    .sort((a, b) => b.match - a.match);
  const best = list[0];
  return (
    <div className="view">
      {best && (
        <section className="matchSpot" onClick={() => app.open("dog", best.id)}>
          <img src={img(best.photo, 900, 700)} alt="" />
          <div className="matchSpotBody">
            <span className="kicker light">DAGENS BESTE MATCH</span>
            <h2>{best.name} <small>{best.breed}, {best.age}</small></h2>
            <p>Samme energi som {app.profile.name}, elsker {best.play[0].toLowerCase()} og bor bare {fmtKm(best.km)} km unna.</p>
            <div className="matchSpotFoot">
              <span className="matchRing" style={{ "--p": best.match }}><b>{best.match}%</b></span>
              <button className="pillBtn white" onClick={(e) => { e.stopPropagation(); app.open("meetupComposer", { with: best.id }); }}><Icon name="walk" size={17} /> Foreslå tur</button>
            </div>
          </div>
        </section>
      )}

      <div className="toolbar">
        <Chips items={[{ id: "Alle", label: "All energi", icon: "bolt" }, { id: "Rolig", label: "Rolig" }, { id: "Høy", label: "Høy energi" }]} value={energy} onChange={setEnergy} />
        <Chips items={[{ id: "Alle", label: "Alle størrelser" }, "Liten", "Medium", "Stor"]} value={size} onChange={setSize} />
      </div>

      <div className="dogGrid">
        {list.map((d) => (
          <article key={d.id} className="dogCard">
            <button className="dogPhoto" onClick={() => app.open("dog", d.id)}>
              <img src={img(d.photo, 520, 560)} alt="" loading="lazy" />
              <span className="matchPill"><Icon name="heart" size={13} fill="currentColor" stroke={0} /> {d.match}%</span>
              {d.online && <span className="onlinePill"><i /> Ute nå</span>}
            </button>
            <div className="dogBody">
              <div className="dogName">
                <h3>{d.name}</h3>
                <button className={"heartBtn" + (app.followed[d.id] ? " on" : "")} onClick={() => app.toggleFollow(d.id)} aria-label="Følg">
                  <Icon name="heart" size={18} fill={app.followed[d.id] ? "currentColor" : "none"} />
                </button>
              </div>
              <p>{d.breed} · {d.age} · {fmtKm(d.km)} km</p>
              <div className="dogTraits">
                <span><Meter value={d.energy} /> Energi</span>
                <span className="trait">{d.play[0]}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------- Kart ---------- */
const PINS = [
  { x: 22, y: 30, kind: "meetup", id: "m1", icon: "walk", color: "blue", label: "Tur nå" },
  { x: 62, y: 26, kind: "meetup", id: "m2", icon: "ball", color: "coral", label: "Lek" },
  { x: 46, y: 62, kind: "place", icon: "trees", color: "mint", label: "Mosvatnet" },
  { x: 76, y: 58, kind: "place", icon: "coffee", color: "sun", label: "Kafé" },
  { x: 30, y: 74, kind: "meetup", id: "m3", icon: "sprout", color: "mint", label: "Valpetreff" },
  { x: 84, y: 22, kind: "place", icon: "waves", color: "blue", label: "Strand" },
];

export function MapView() {
  const app = useApp();
  const [layer, setLayer] = useState("Alt");
  const [sel, setSel] = useState(null);
  const pins = PINS.filter((p) => layer === "Alt" || (layer === "Treff" ? p.kind === "meetup" : p.kind === "place"));
  const areas = areasByCity[app.city] || areasByCity.Stavanger;
  const selMeetup = sel?.kind === "meetup" ? app.meetups.find((m) => m.id === sel.id) : null;
  return (
    <div className="view mapView">
      <div className="mapCanvas">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mapArt" aria-hidden="true">
          <rect width="100" height="100" fill="#eef1e4" />
          <path d="M0 0H38C30 18 20 24 0 30Z" fill="#dcebd0" />
          <path d="M62 100C60 80 72 66 100 60V100Z" fill="#d6e8cc" />
          <path d="M36 44C42 36 58 38 60 50S50 70 40 66 30 52 36 44Z" fill="#b9dcef" />
          <path d="M100 0V34C88 30 80 20 78 0Z" fill="#b9dcef" />
          <path d="M-5 56C20 50 40 58 60 50S90 36 105 40" stroke="#fff" strokeWidth="2.4" fill="none" />
          <path d="M30 -5C34 30 26 60 34 105" stroke="#fff" strokeWidth="1.8" fill="none" />
          <path d="M70 -5C66 30 76 70 68 105" stroke="#fff" strokeWidth="1.4" fill="none" />
          <path d="M-5 84C30 80 60 90 105 82" stroke="#fff" strokeWidth="1.2" fill="none" />
          <path d="M22 30 C 30 40, 40 42, 46 62" stroke="#ff7a5c" strokeWidth=".8" strokeDasharray="1.6 1.4" fill="none" />
        </svg>
        {areas.slice(0, 4).map((a, i) => (
          <span key={a} className="mapLabel" style={{ left: [8, 52, 58, 70][i] + "%", top: [12, 10, 72, 86][i] + "%" }}>{a}</span>
        ))}
        {pins.map((p, i) => (
          <button key={i} className={"mapPin tint-" + p.color + (sel === p ? " sel" : "")} style={{ left: p.x + "%", top: p.y + "%" }} onClick={() => setSel(p)}>
            <Icon name={p.icon} size={18} />
            <span>{p.label}</span>
          </button>
        ))}
        <span className="youPin" style={{ left: "48%", top: "46%" }}><i /></span>

        <div className="mapTools">
          <Chips items={["Alt", "Treff", "Steder"]} value={layer} onChange={setLayer} />
          <button className="iconBtn" onClick={() => app.flash("Viser din posisjon", "locate")} aria-label="Min posisjon"><Icon name="locate" /></button>
        </div>

        <div className="mapSheet">
          {selMeetup ? (
            <MeetupCard m={selMeetup} />
          ) : (
            <>
              <span className="kicker">RUNDT DEG I {app.city.toUpperCase()}</span>
              <h3>{app.meetups.length} treff og {places.length} gode steder i nærheten</h3>
              <p>{areas.join(" · ")}</p>
              <div className="mapSheetBtns">
                <button className="pillBtn primary" onClick={() => app.setTab("Nå skjer")}><Icon name="live" size={17} /> Se treff</button>
                <button className="pillBtn soft" onClick={() => app.setTab("Utforsk")}><Icon name="compass" size={17} /> Steder</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Aktivitet ---------- */
const DAYS = [3.2, 5.8, 4.1, 7.4, 5.2, 8.9, 2.3];
export function ActivityView() {
  const app = useApp();
  const [view, setView] = useState("Oversikt");
  const level = 7;
  const xp = app.paws % 1000;
  return (
    <div className="view">
      <section className="statHero">
        <div className="statMain">
          <span className="kicker light">DENNE UKA</span>
          <b className="bigNum">{fmtKm(app.weekKm + 18.3)}<small> km</small></b>
          <p><Icon name="bolt" size={15} /> 14 % mer enn forrige uke</p>
          <div className="weekBars">
            {DAYS.map((v, i) => (
              <span key={i}><i style={{ height: (v / 9) * 100 + "%" }} className={i === 6 ? "today" : ""} /><small>{"MTOTFLS"[i]}</small></span>
            ))}
          </div>
        </div>
        <div className="statSide">
          <div className="statTile coral"><Icon name="flame" size={22} /><b>{app.streak}</b><small>dager streak</small></div>
          <div className="statTile sun"><Icon name="paw" size={22} /><b>{app.paws.toLocaleString("nb-NO")}</b><small>poter</small></div>
          <div className="statTile mint"><Icon name="trophy" size={22} /><b>#3</b><small>i {app.city}</small></div>
          <div className="levelCard">
            <div><b>Nivå {level} · Turkompis</b><small>{1000 - xp} poter til nivå {level + 1}</small></div>
            <Bar value={xp} max={1000} tone="sun" />
          </div>
        </div>
      </section>

      <div className="toolbar">
        <Chips items={[{ id: "Oversikt", label: "Utfordringer", icon: "target" }, { id: "Toppliste", label: "Toppliste", icon: "trophy" }, { id: "Merker", label: "Merker", icon: "star" }]} value={view} onChange={setView} />
        <button className="pillBtn primary" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start tur</button>
      </div>

      {view === "Oversikt" && (
        <div className="challengeGrid">
          {challenges.map((c) => (
            <article key={c.id} className={"challenge tint-" + c.color}>
              <span className="chIcon big"><Icon name={c.icon} size={22} /></span>
              <div>
                <small className="chEnd">{c.end}</small>
                <h3>{c.title}</h3>
                <Bar value={c.progress} max={c.target} tone={c.color} />
                <p><b>{fmtKm(c.progress)}{c.unit ? " " + c.unit : ""}</b> av {c.target}{c.unit ? " " + c.unit : ""} · Belønning: <b>{c.reward}</b></p>
              </div>
            </article>
          ))}
          <article className="challenge recapTease" onClick={() => app.open("recap")}>
            <span className="chIcon big"><Icon name="sparkle" size={22} /></span>
            <div><small className="chEnd">UKE 39</small><h3>Ukesoppsummering klar</h3><p>Se og del uka til {app.profile.name}.</p></div>
            <Icon name="chevronRight" size={20} />
          </article>
        </div>
      )}

      {view === "Toppliste" && (
        <div className="leaderboard">
          <div className="podium">
            {[1, 0, 2].map((i) => {
              const r = leaderboard[i];
              const d = dogById(r.dog);
              return (
                <div key={r.rank} className={"podiumSpot p" + r.rank}>
                  <Avatar id={r.dog} size={r.rank === 1 ? 72 : 58} ring={r.rank === 1 ? "sun" : "blue"} />
                  <b>{d.name}</b>
                  <small>{fmtKm(r.km)} km</small>
                  <span className="podiumBlock">{r.rank}</span>
                </div>
              );
            })}
          </div>
          {leaderboard.slice(3).map((r, i) => {
            const d = dogById(r.dog);
            return (
              <div key={i} className={"lbRow" + (r.dog === "santos" ? " me" : "")}>
                <b className="rank">{r.rank}</b>
                <Avatar id={r.dog} size={40} />
                <span><b>{d.name}{r.dog === "santos" ? " (dere)" : ""}</b><small>{d.owner}</small></span>
                <b>{fmtKm(r.km)} km</b>
              </div>
            );
          })}
        </div>
      )}

      {view === "Merker" && (
        <div className="badgeGrid">
          {badges.map((b) => (
            <article key={b.id} className={"badge tint-" + b.color + (b.status === "done" ? " done" : "") + (b.status === "Låst" ? " locked" : "")}>
              <span className="badgeMedal" style={{ "--p": b.status === "done" ? 100 : b.pct }}><Icon name={b.icon} size={26} /></span>
              <h3>{b.name}</h3>
              <small>{b.status === "done" ? "Fullført" : b.status}</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Arrangementer ---------- */
export function EventsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");
  const list = app.events.filter((e) => filter === "Alle" || (filter === "Påmeldt" ? app.eventGoing[e.id] : e.tag === filter));
  const [first, ...rest] = list;
  return (
    <div className="view">
      <div className="toolbar">
        <Chips items={["Alle", "Tur", "Valp", "Fjell", "Sosialt", "Påmeldt"]} value={filter} onChange={setFilter} />
        <button className="pillBtn primary" onClick={() => app.open("eventComposer")}><Icon name="plus" size={16} stroke={2.6} /> Lag arrangement</button>
      </div>
      {!first && <Empty icon="calendar" title="Ingen arrangementer her" text="Prøv et annet filter, eller lag noe selv." />}
      {first && (
        <article className="eventFeature" onClick={() => app.open("event", first.id)}>
          <img src={img(first.photo, 1200, 600)} alt="" />
          <div className="eventFeatureBody">
            <span className="dateChip big"><b>{first.day}</b><small>{first.month}</small></span>
            <div>
              <span className="kicker light">{first.tag.toUpperCase()} · NESTE UT</span>
              <h2>{first.title}</h2>
              <p><Icon name="clock" size={15} /> {first.weekday} {first.time} <Icon name="pin" size={15} /> {first.place}</p>
            </div>
            <button className={"pillBtn " + (app.eventGoing[first.id] ? "done" : "white")} onClick={(e) => { e.stopPropagation(); app.toggleEvent(first.id); }}>
              {app.eventGoing[first.id] ? <><Icon name="check" size={15} stroke={2.6} /> Påmeldt</> : "Meld på"}
            </button>
          </div>
        </article>
      )}
      <div className="eventGrid">
        {rest.map((e) => (
          <article key={e.id} className="eventCard" onClick={() => app.open("event", e.id)}>
            <div className="eventImg">
              <img src={img(e.photo, 600, 360)} alt="" loading="lazy" />
              <span className="dateChip"><b>{e.day}</b><small>{e.month}</small></span>
            </div>
            <div className="eventBody">
              <span className="kicker">{e.tag.toUpperCase()}</span>
              <h3>{e.title}</h3>
              <p><Icon name="clock" size={14} /> {e.weekday} {e.time} · {e.place}</p>
              <div className="eventFoot">
                <span><AvatarStack ids={e.faces} size={22} /> {e.going + (app.eventGoing[e.id] ? 1 : 0)} påmeldt</span>
                <button className={"pillBtn small " + (app.eventGoing[e.id] ? "done" : "soft")} onClick={(ev) => { ev.stopPropagation(); app.toggleEvent(e.id); }}>
                  {app.eventGoing[e.id] ? "Påmeldt" : "Meld på"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ---------- Utforsk ---------- */
export function ExploreView() {
  const app = useApp();
  const [view, setView] = useState("Steder");
  return (
    <div className="view">
      <div className="toolbar">
        <Chips items={[{ id: "Steder", label: "Steder", icon: "pin" }, { id: "Turruter", label: "Turruter", icon: "route" }, { id: "Trygghet", label: "Trygghet", icon: "shield" }]} value={view} onChange={setView} />
      </div>
      {view === "Steder" && (
        <div className="placeGrid">
          {places.map((p) => (
            <article key={p.id} className={"place tint-" + p.color}>
              <div className="placeImg">
                <img src={img(p.photo, 500, 320)} alt="" loading="lazy" />
                <button className={"saveBtn" + (app.savedPlaces[p.id] ? " on" : "")} onClick={() => { app.togglePlace(p.id); app.flash(app.savedPlaces[p.id] ? "Fjernet" : "Sted lagret", "star"); }} aria-label="Lagre sted">
                  <Icon name="star" size={17} fill={app.savedPlaces[p.id] ? "currentColor" : "none"} />
                </button>
              </div>
              <div className="placeBody">
                <span className="placeType"><Icon name={p.icon} size={14} /> {p.type}</span>
                <h3>{p.name}</h3>
                <p><Icon name="star" size={13} fill="currentColor" stroke={0} className="starIcon" /> {p.rating.toLocaleString("nb-NO")} · {fmtKm(p.km)} km unna</p>
                <div className="tags">{p.tags.map((t) => <small key={t}>{t}</small>)}</div>
              </div>
            </article>
          ))}
        </div>
      )}
      {view === "Turruter" && (
        <div className="routeGrid">
          {routes.map((r) => (
            <article key={r.id} className="routeCard">
              <RouteSketch path={r.path} />
              <div className="routeBody">
                <span className="kicker">{r.level.toUpperCase()}</span>
                <h3>{r.title}</h3>
                <p>{fmtKm(r.km)} km · {r.time} · {r.saves} har lagret</p>
                <div className="routeBtns">
                  <button className={"pillBtn small " + (app.savedRoutes[r.id] ? "done" : "soft")} onClick={() => app.toggleRoute(r.id)}>{app.savedRoutes[r.id] ? <><Icon name="check" size={14} stroke={2.6} /> Lagret</> : "Lagre rute"}</button>
                  <button className="pillBtn small primary" onClick={app.startWalk}><Icon name="play" size={12} fill="currentColor" stroke={0} /> Gå nå</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {view === "Trygghet" && (
        <div className="safetyGrid">
          <article className="safetyCard tint-mint"><span className="chIcon big"><Icon name="shield" size={22} /></span><h3>Nødprofil</h3><p>Kontaktperson, veterinær og viktig info om {app.profile.name} hvis noe skjer.</p><button className="linkish" onClick={() => app.open("safety")}>Åpne <Icon name="arrowRight" size={14} /></button></article>
          <article className="safetyCard tint-coral"><span className="chIcon big"><Icon name="alert" size={22} /></span><h3>Mistet hund</h3><p>Send et hastevarsel til hundeeiere i nærområdet med ett trykk.</p><button className="linkish" onClick={() => app.open("lostDog")}>Lag varsel <Icon name="arrowRight" size={14} /></button></article>
          <article className="safetyCard tint-blue"><span className="chIcon big"><Icon name="users" size={22} /></span><h3>Trygge møter</h3><p>Møt nye folk på offentlige steder, se verifiserte profiler og rapporter enkelt.</p><button className="linkish" onClick={() => app.open("safety")}>Les mer <Icon name="arrowRight" size={14} /></button></article>
        </div>
      )}
    </div>
  );
}
