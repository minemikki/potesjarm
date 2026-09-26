"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "leaflet/dist/leaflet.css";
import Icon from "./Icon";
import { useApp } from "./store";
import { PostCard, FeedPostCard, InviteCard, InlineEmpty, DogTile, dogSignal } from "./Home";
import { Avatar, AvatarStack, Bar, Chips, DogAvatar, Empty, Img, Meter, SectionHead, SourceTag } from "./ui";
import { fmtKm, fmtNum, img, meetupTypes, PHOTO } from "../lib/data";
import { BANDTVANG, inBandtvang, kommuneById, placeShort, distanceKm, roundCoord, regionName, regionOfKommune } from "../lib/geo";
import { placeTypes, publicInfo } from "../lib/seed";
import { getDogCommonalities, commonalityHeadline } from "../lib/social";
import { ShareCard } from "./Moments";
import { INTENTS, groupByBucket, milestone, startLabel, streakLine, MEETUP_IDEAS } from "../lib/today";

/* ========================= Nå skjer ========================= */
/*
 * Signaturen. Spørsmålet skjermen svarer på: «hva gjør hundefolk rundt meg
 * akkurat nå – og kan jeg bli med?» Øverst senker vi terskelen for å lage noe
 * selv (ferdige intensjoner i stedet for et skjema), under ligger treffene
 * gruppert på tid, skrevet som invitasjoner.
 */
export function NowView() {
  const app = useApp();
  const [type, setType] = useState("alle");
  const all = app.meetups;
  const list = all.filter((m) => type === "alle" || (type === "mine" ? app.going[m.id] || m.mine : m.type === type));
  const buckets = groupByBucket(list);
  const usedTypes = meetupTypes.filter((t) => all.some((m) => m.type === t.id));

  return (
    <div className="view now2">
      <section className="goOut">
        <h2>Skal dere ut?</h2>
        <p>Velg hva dere har lyst til – treffet er ute på sekunder.</p>
        <div className="intentRow">
          {INTENTS.map((it) => (
            <button key={it.id} className="intent" onClick={() => app.open("meetupComposer", { intent: it.id })}>
              <Icon name={it.icon} size={17} /> {it.label}
            </button>
          ))}
        </div>
      </section>

      {all.length > 0 && usedTypes.length > 1 && (
        <Chips
          items={[{ id: "alle", label: "Alle" }, ...usedTypes.map((t) => ({ id: t.id, label: t.label, icon: t.icon })), { id: "mine", label: "Mine", icon: "check" }]}
          value={type}
          onChange={setType}
        />
      )}

      {all.length === 0 ? (
        <>
          <div className="nowCold">
            <span className="nowColdIcon"><Icon name="live" size={22} /></span>
            <h3>Ingen åpne treff akkurat nå.</h3>
            <p>Det første kan starte med dere – ofte holder det med én annen hund. Velg en av tingene over, så ser alle i {app.kommune?.name || "området"} det med en gang.</p>
            <button className="linkish" onClick={() => app.open("invite")}><Icon name="gift" size={15} /> Inviter en hundevenn</button>
          </div>
          <div className="ideaList">
            <span className="ideaRowLabel">Idéer å starte med</span>
            {MEETUP_IDEAS.map((idea) => (
              <button key={idea.id} className="ideaCard" onClick={() => app.open("meetupComposer", { intent: idea.intent })}>
                <span className="ideaCardIcon"><Icon name={idea.icon} size={18} /></span>
                <span className="ideaCardText"><b>{idea.label}</b><small>{idea.sub}</small></span>
                <span className="ideaTag">Idé</span>
              </button>
            ))}
          </div>
        </>
      ) : list.length === 0 ? (
        <p className="nowNone">Ingen treff i denne kategorien nå. <button className="linkish inline" onClick={() => setType("alle")}>Vis alle</button></p>
      ) : (
        buckets.map((b) => (
          <section key={b.id} className="bucket">
            <h2 className="bucketHead">
              {b.id === "now" && <i className="liveDot" />}
              {b.label}
              <small>{b.items.length}</small>
            </h2>
            <div className="inviteList">
              {b.items.map((m) => <InviteCard key={m.id} m={m} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/* ========================= Grupper ========================= */
/*
 * Grupper er små lokale miljøer, ikke en katalog. Øverst: dine egne. Under:
 * rader som sier hva gruppa faktisk er (ekte medlemstall, neste gruppetreff).
 */
export function GroupsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");
  if (app.groupId) return <GroupPage id={app.groupId} />;

  const mine = app.groups.filter((g) => app.joinedGroups[g.id]);
  const rest = app.groups.filter((g) => !app.joinedGroups[g.id]);
  const tags = [...new Set(rest.map((g) => g.tag).filter(Boolean))];
  const list = rest.filter((g) => filter === "Alle" || g.tag === filter);

  return (
    <div className="view groups2">
      {mine.length > 0 && (
        <section className="sec">
          <div className="secHead"><h2>Dine grupper</h2></div>
          <div className="groupList">{mine.map((g) => <GroupRow key={g.id} g={g} />)}</div>
        </section>
      )}

      <section className="sec">
        <div className="secHead">
          <h2>{mine.length ? "Flere i nærheten" : `Lokale miljøer i ${app.kommune?.name || "området"}`}</h2>
          {app.backend && <button className="linkish" onClick={() => app.open("groupComposer")}><Icon name="plus" size={14} stroke={2.6} /> Start en gruppe</button>}
        </div>
        {rest.length > 3 && tags.length > 1 && <Chips items={["Alle", ...tags]} value={filter} onChange={setFilter} />}
        {app.groups.length === 0 ? (
          <InlineEmpty
            icon="users"
            tone="violet"
            title={`Ingen lokale grupper i ${app.kommune?.name || "området"} ennå.`}
            text="Grupper lages av hundeeiere selv – for nabolaget, rasen eller turene dere går."
            cta={app.backend ? "Start den første gruppen" : "Foreslå en gruppe"}
            onCta={app.backend ? () => app.open("groupComposer") : () => app.flash("Gruppeoppretting kommer med innlogging", "users")}
          />
        ) : list.length === 0 ? (
          <p className="nowNone">Du er med i alle gruppene her.</p>
        ) : (
          <div className="groupList">{list.map((g) => <GroupRow key={g.id} g={g} />)}</div>
        )}
        {app.groups.length === 1 && !app.backend && (
          <InlineEmpty
            icon="sprout"
            tone="mint"
            title={`Savner du «Valper ${app.kommune?.name || ""}» eller en rasegruppe?`}
            text="Grupper starter når noen tar initiativet. Det kan være deg."
            cta="Foreslå en gruppe"
            onCta={() => app.flash("Gruppeoppretting kommer med innlogging", "users")}
          />
        )}
      </section>
    </div>
  );
}

function groupSignal(app, g) {
  const parts = [];
  if (g.members) parts.push(`${fmtNum(g.members)} ${g.members === 1 ? "medlem" : "medlemmer"}`);
  const next = app.groupMeetupsFor?.(g.id)?.[0];
  if (next) parts.push(`Treff ${startLabel(next.startsIn)}`);
  if (!parts.length) parts.push(g.official ? "Åpen for alle i området" : "Ny gruppe");
  return parts.join(" · ");
}

function GroupRow({ g }) {
  const app = useApp();
  const joined = !!app.joinedGroups[g.id];
  return (
    <article className={"groupRow tint-" + (g.color || "violet")}>
      <button className="groupRowMain" onClick={() => app.openGroup(g.id)}>
        {g.photo
          ? <Img id={g.photo} w={160} h={160} className="groupRowImg" />
          : <span className="groupRowIcon"><Icon name="users" size={22} /></span>}
        <span className="groupRowText">
          <b>{g.name}{g.official && <Icon name="shield" size={13} />}</b>
          <small>{[g.tag, groupSignal(app, g)].filter(Boolean).join(" · ")}</small>
          {g.about && <p>{g.about}</p>}
        </span>
      </button>
      <button className={"joinBtn" + (joined ? " done" : "")} onClick={() => app.toggleGroup(g.id)} aria-pressed={joined}>
        {joined ? <><Icon name="check" size={14} stroke={2.8} /> Medlem</> : "Bli med"}
      </button>
    </article>
  );
}

/** Kort, relativ "for X siden" for et ISO-tidspunkt. */
/* Ekte innlegg-komponering i en gruppe (krever medlemskap). */
function GroupComposeInline({ groupId }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    app.createGroupPost(groupId, text.trim());
    setText(""); setOpen(false);
  };
  if (!open) {
    return (
      <button className="composeBar" onClick={() => setOpen(true)}>
        <DogAvatar me size={36} />
        <span>Skriv noe til gruppen…</span>
        <Icon name="image" size={20} />
      </button>
    );
  }
  return (
    <div className="gCompose">
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv noe til gruppen…" autoFocus rows={3} />
      <div className="gComposeFoot">
        <button className="pillBtn soft compact" onClick={() => { setOpen(false); setText(""); }}>Avbryt</button>
        <button className="pillBtn primary compact" onClick={submit} disabled={!text.trim()}>Publiser</button>
      </div>
    </div>
  );
}

function GroupPage({ id }) {
  const app = useApp();
  const g = app.groups.find((x) => x.id === id);
  const [tab, setTab] = useState("Innlegg");
  if (!g) return null;
  const joined = !!app.joinedGroups[g.id];
  const canModerate = g.myRole === "admin" || g.myRole === "moderator";
  // Ekte tall: har gruppa et medlemstall viser vi det, ellers «Ny gruppe».
  const memberText = g.members ? `${fmtNum(g.members)} ${g.members === 1 ? "medlem" : "medlemmer"}` : "Ny gruppe";
  const kName = kommuneById[g.kommuneId]?.name || app.kommune?.name;
  const tabs = ["Innlegg", "Treff", "Medlemmer", "Om"];
  // Ekte gruppedata når vi er koblet til backend; ellers lokal/demo-veien.
  const posts = app.backend ? app.groupPosts : app.posts;
  const meetups = app.backend ? app.groupMeetupsFor(g.id) : app.meetups;

  return (
    <div className="view groupPage">
      <section className="gHead">
        {/* Kompakt merkevare-cover – identitet, ikke dekorativ tomflate. */}
        <div className={"gCover" + (g.photo ? "" : " branded")} style={g.photo ? { backgroundImage: `url(${img(g.photo, 1200, 360)})` } : undefined}>
          <button className="gBack" onClick={app.closeGroup} aria-label="Tilbake"><Icon name="chevronLeft" size={20} /></button>
        </div>
        {/* Identitet: avatar forankret ved cover-kanten, tittel + metadata ved siden. */}
        <div className="gIdentity">
          {g.photo
            ? <Img id={g.photo} w={160} h={160} className="gAvatar" rounded />
            : <span className="gAvatar blank"><Icon name="users" size={26} /></span>}
          <div className="gInfo">
            <h2>{g.name}</h2>
            <p className="gMeta">{[kName, g.tag === "Lokalt" ? "Lokal gruppe" : g.tag, memberText].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        {g.official && <span className="gBadge"><Icon name="shield" size={13} /> Potesjarm-offisiell</span>}
        <p className="gDesc">
          {g.about} {tab !== "Om" && <button className="linkish inline" onClick={() => setTab("Om")}>Mer</button>}
        </p>
        <div className="gActions">
          <button className={"pillBtn " + (joined ? "done" : "primary")} onClick={() => app.toggleGroup(g.id)}>
            {joined ? <><Icon name="check" size={16} stroke={2.6} /> Medlem</> : "Bli med"}
          </button>
          <button className="pillBtn soft compact" onClick={() => app.open("invite")}><Icon name="userPlus" size={16} /> Inviter</button>
          <button className="iconBtn ghost" onClick={() => app.open("groupMenu", g.id)} aria-label="Mer"><Icon name="more" size={20} /></button>
        </div>
      </section>

      <nav className="gTabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}
      </nav>

      {tab === "Innlegg" && (
        <>
          {/* Bare medlemmer kan skrive (håndheves også i RPC). */}
          {joined && (
            app.backend
              ? <GroupComposeInline groupId={g.id} />
              : (
                <button className="composeBar" onClick={() => app.open("postComposer")}>
                  <DogAvatar me size={36} />
                  <span>Del noe med {g.name}…</span>
                  <Icon name="image" size={20} />
                </button>
              )
          )}
          {posts.length === 0 ? (
            <Empty
              icon="camera"
              title="Ingen innlegg ennå"
              text={joined ? "Start den første samtalen i gruppa." : "Bli med for å skrive det første innlegget."}
              cta={joined ? (app.backend ? null : "Skriv det første") : "Bli med"}
              onCta={joined ? () => app.open("postComposer") : () => app.toggleGroup(g.id)}
            />
          ) : app.backend ? (
            <div className="feedGrid">{posts.map((p) => <FeedPostCard key={p.id} post={p} canModerate={canModerate} />)}</div>
          ) : (
            <div className="feedGrid two">{posts.slice(0, 4).map((p) => <PostCard key={p.id} post={p} />)}</div>
          )}
        </>
      )}

      {tab === "Treff" && (
        <>
          {joined && (
            <button className="pillBtn primary block" onClick={() => app.open("meetupComposer", { group: g.id, groupName: g.name })}>
              <Icon name="plus" size={17} /> Lag treff i gruppen
            </button>
          )}
          {meetups.length === 0 ? (
            <Empty icon="live" tone="coral" title="Ingen treff i gruppen ennå" text={joined ? "Lag det første treffet for medlemmene." : "Bli med for å lage et treff."} cta={joined ? "Lag treff" : "Bli med"} onCta={joined ? () => app.open("meetupComposer", { group: g.id, groupName: g.name }) : () => app.toggleGroup(g.id)} />
          ) : (
            <div className="inviteList">{meetups.map((m) => <InviteCard key={m.id} m={m} />)}</div>
          )}
        </>
      )}

      {tab === "Medlemmer" && (
        app.backend ? (
          app.groupMembers.length === 0 ? (
            <Empty icon="users" tone="violet" title="Ingen medlemmer ennå" text="Bli med, så er du det første medlemmet." cta={joined ? null : "Bli med"} onCta={() => app.toggleGroup(g.id)} />
          ) : (
            <div className="memberList">
              {app.groupMembers.map((m) => (
                <div key={m.profileId} className="memberRow">
                  <button className="memberMain" onClick={() => m.dogId && app.openDog(m.dogId)}>
                    <Avatar src={m.dogPhoto} name={m.dogName || m.ownerName} size={46} />
                    <span>
                      <b>{m.ownerName}{m.dogName ? ` & ${m.dogName}` : ""}</b>
                      <small>{m.dogBreed || (m.role === "admin" ? "Admin" : m.role === "moderator" ? "Moderator" : "Medlem")}</small>
                    </span>
                  </button>
                  {(m.role === "admin" || m.role === "moderator") && (
                    <span className={"roleBadge " + m.role}>{m.role === "admin" ? "Admin" : "Moderator"}</span>
                  )}
                  {canModerate && m.profileId !== app.myProfileId && m.role !== "admin" && (
                    <button className="iconBtn ghost" onClick={() => app.removeGroupMember(g.id, m.profileId)} aria-label="Fjern medlem"><Icon name="x" size={18} /></button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          (g.faces || []).length === 0 ? (
            <Empty icon="users" tone="violet" title="Gruppa er helt ny" text="Bli med, så er du blant de første medlemmene." cta={joined ? null : "Bli med"} onCta={() => app.toggleGroup(g.id)} />
          ) : (
            <div className="memberList">
              {(g.faces || []).map((mid) => {
                const d = app.dogById(mid);
                if (!d) return null;
                return (
                  <button key={mid} className="memberRow" onClick={() => app.open("dog", mid)}>
                    <Avatar src={d.photo} name={d.name} size={46} online={d.online} />
                    <span><b>{d.owner} & {d.name}</b><small>{d.breed}</small></span>
                    <Icon name="chevronRight" size={18} />
                  </button>
                );
              })}
            </div>
          )
        )
      )}

      {tab === "Om" && (
        <div className="groupAbout">
          <h4>Om gruppa</h4>
          <p>{g.about}</p>
          {g.official ? (
            <div className="aboutCard tint-mint">
              <span className="chIcon tint-mint"><Icon name="shield" size={18} /></span>
              <div><b>Offisiell områdegruppe</b><small>Opprettet og driftet av Potesjarm for hundeeiere i {app.kommune?.name}.</small></div>
            </div>
          ) : (
            <div className="aboutCard">
              <span className="chIcon tint-blue"><Icon name="users" size={18} /></span>
              <div><b>Laget av hundeeiere</b><small>{fmtNum(g.members)} medlemmer i {app.kommune?.name}.</small></div>
            </div>
          )}
          <h4>Kjøreregler</h4>
          <ul className="ruleList">
            <li><Icon name="heart" size={15} /> Vær vennlig og inkluderende mot både folk og hunder.</li>
            <li><Icon name="shield" size={15} /> Møt på offentlige steder. Del aldri hjemmeadresser.</li>
            <li><Icon name="paw" size={15} /> Respekter båndtvang og skilting på turområdene.</li>
            <li><Icon name="flag" size={15} /> Rapporter upassende innhold – vi følger opp.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ========================= Hunder ========================= */
/*
 * «Hunder jeg kan møte i nærheten» – ikke en katalog. Bilde først, navn,
 * rase · alder, og ETT ekte signal (fellestrekk / du følger). Ingen matchprosent.
 */
const DOG_FILTERS = [
  { id: "Alle", label: "Alle" },
  { id: "Rolige", label: "Rolige", test: (d) => d.energy != null && d.energy <= 3 },
  { id: "Aktive", label: "Aktive", test: (d) => d.energy != null && d.energy >= 4 },
  { id: "Små", label: "Små", test: (d) => /liten/i.test(d.size || "") },
  { id: "Store", label: "Store", test: (d) => /stor/i.test(d.size || "") },
  { id: "Følger", label: "Du følger", icon: "heart" },
];

export function DogsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");

  if (app.dogs.length === 0) {
    return (
      <div className="view">
        <InlineEmpty
          icon="dog"
          tone="sun"
          title={`Ingen andre hunder i ${app.kommune?.name || "området"} ennå.`}
          text={`${app.me.dogName || "Hunden din"} kan være den første. Inviter en venn og bygg hundelivet sammen.`}
          cta="Inviter en hundevenn"
          onCta={() => app.open("invite")}
          secondary="Se et større område"
          onSecondary={() => app.open("location")}
        />
      </div>
    );
  }

  const f = DOG_FILTERS.find((x) => x.id === filter);
  const available = DOG_FILTERS.filter((x) => x.id === "Alle" || (x.id === "Følger" ? app.dogs.some((d) => app.followed[d.id]) : app.dogs.some(x.test)));
  const list = app.dogs
    .filter((d) => filter === "Alle" || (filter === "Følger" ? app.followed[d.id] : f?.test?.(d)))
    .map((d) => ({ d, common: getDogCommonalities(app.me, d, { sameArea: true }).length }))
    .sort((a, b) => b.common - a.common)
    .map((x) => x.d);

  return (
    <div className="view dogs2">
      {available.length > 1 && <Chips items={available} value={filter} onChange={setFilter} />}
      {list.length === 0 ? (
        <p className="nowNone">Ingen hunder her med det filteret. <button className="linkish inline" onClick={() => setFilter("Alle")}>Vis alle</button></p>
      ) : (
        <div className="dogGrid2">{list.map((d) => <DogCard2 key={d.id} d={d} />)}</div>
      )}
    </div>
  );
}

function DogCard2({ d }) {
  const app = useApp();
  const following = !!app.followed[d.id];
  return (
    <article className="dog2">
      <button className="dog2Photo" onClick={() => app.openDog(d.id)} aria-label={`Åpne ${d.name}`}>
        <Img id={d.photo} w={520} h={620} className="dog2Img" brand fallbackLabel={d.name?.charAt(0)} />
      </button>
      <button className={"dog2Heart" + (following ? " on" : "")} onClick={() => app.toggleFollow(d)} aria-label={following ? `Slutt å følge ${d.name}` : `Følg ${d.name}`} aria-pressed={following}>
        <Icon name="heart" size={18} fill={following ? "currentColor" : "none"} />
      </button>
      <button className="dog2Body" onClick={() => app.openDog(d.id)}>
        <b>{d.name}</b>
        <small>{[d.breed, d.age].filter(Boolean).join(" · ")}</small>
        {dogSignal(app, d) && <span className="dog2Signal">{dogSignal(app, d)}</span>}
      </button>
    </article>
  );
}

/* ========================= Kart ========================= */
/*
 * Hundekartet over byen: ekte kart (Leaflet + åpne kartfliser), pins for
 * turområder og aktive treff. Ingen oppdiktet «populært»-data. Posisjonen din
 * vises kun hvis du selv har delt den, og da bare omtrentlig.
 */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILES_URL || "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTR = process.env.NEXT_PUBLIC_MAP_TILES_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export function MapView() {
  const app = useApp();
  const [layer, setLayer] = useState("Alt");
  const [sel, setSel] = useState(null);
  const [pinEls, setPinEls] = useState([]);
  const [ready, setReady] = useState(false);
  const [asList, setAsList] = useState(false);
  const [myPos, setMyPos] = useState(null); // { lat, lng } – kun på egen klient
  const [posState, setPosState] = useState("idle"); // idle | locating | denied | error
  const box = useRef(null);
  const mapRef = useRef(null);
  const LRef = useRef(null);
  const meRef = useRef(null);
  const k = app.kommune;
  const region = regionOfKommune(app.location?.kommuneId);

  // Kartet viser KUN ekte, kartfestede ting: godkjente steder og aktive treff
  // med koordinater. app.mapMeetups er allerede personvernfiltrert i backend.
  const placePins = app.places.filter((p) => typeof p.lat === "number").map((p) => ({ kind: "place", id: p.id, lat: p.lat, lng: p.lng, label: p.name, icon: placeTypes[p.type]?.icon || "pin", color: placeTypes[p.type]?.color || "mint" }));
  const meetPins = (app.mapMeetups || []).filter((m) => typeof m.lat === "number").map((m) => {
    const t = meetupTypes.find((x) => x.id === m.type) || meetupTypes[0];
    return { kind: "meetup", id: m.id, lat: m.lat, lng: m.lng, label: m.title, icon: t.icon, color: t.color, live: (m.startsIn || 0) <= 10 };
  });
  const pins = [...(layer !== "Steder" ? meetPins : []), ...(layer !== "Treff" ? placePins : [])];
  const pinKey = pins.map((p) => p.kind + p.id).join("|") + (myPos ? "|me" : "");

  // Opprett kartet én gang (kun i nettleseren).
  useEffect(() => {
    if (asList) return; // ingen kart å bygge i listevisning
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !box.current || mapRef.current) return;
      const L = mod.default || mod;
      LRef.current = L;
      const center = [k?.lat || 58.97, k?.lng || 5.73];
      const zoom = (app.location.radiusKm || 10) > 20 ? 11 : 12;
      const map = L.map(box.current, { zoomControl: false, attributionControl: true }).setView(center, zoom);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: "abcd", maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: "topright" }).addTo(map);
      map.on("click", () => setSel(null));
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      dead = true;
      setReady(false);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      meRef.current = null;
    };
  }, [k?.id, asList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pins som Leaflet-markører; innholdet tegnes med React via portaler.
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;
    const markers = pins.map((p) => {
      const mk = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: "pinHost", html: "", iconSize: [40, 40], iconAnchor: [20, 38] }),
        keyboard: true,
        title: p.label,
      }).addTo(map);
      mk.on("click", (e) => { L.DomEvent.stopPropagation(e); setSel(p); });
      return { p, mk };
    });
    // Egen posisjon som en egen, tydelig markør (kun lokalt, aldri delt).
    if (myPos) {
      meRef.current = L.marker([myPos.lat, myPos.lng], {
        icon: L.divIcon({ className: "pinHost meHost", html: "", iconSize: [26, 26], iconAnchor: [13, 13] }),
        keyboard: false,
        title: "Din posisjon (omtrentlig)",
      }).addTo(map);
    }
    setPinEls(markers.map(({ p, mk }) => ({ p, el: mk.getElement() })));
    return () => { markers.forEach(({ mk }) => mk.remove()); if (meRef.current) { meRef.current.remove(); meRef.current = null; } };
  }, [pinKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const findMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { setPosState("error"); return; }
    setPosState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosState("idle");
        const p = { lat: roundCoord(pos.coords.latitude), lng: roundCoord(pos.coords.longitude) };
        setMyPos(p);
        if (mapRef.current) mapRef.current.setView([p.lat, p.lng], 13);
      },
      (err) => setPosState(err.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    );
  };

  const selMeetup = sel?.kind === "meetup" ? (app.meetups.find((m) => m.id === sel.id) || (app.mapMeetups || []).find((m) => m.id === sel.id)) : null;
  const selPlace = sel?.kind === "place" ? app.places.find((p) => p.id === sel.id) : null;

  return (
    <div className="view mapView2">
      <div className="map2Head">
        <div className="map2Tools">
          <Chips items={["Alt", "Treff", "Steder"]} value={layer} onChange={(v) => { setLayer(v); setSel(null); }} />
        </div>
        <div className="map2HeadBtns">
          <button className="pillBtn soft small" onClick={findMe} disabled={posState === "locating"} aria-label="Finn min posisjon">
            <Icon name="pin" size={15} /> {posState === "locating" ? "Finner…" : "Min posisjon"}
          </button>
          <button className="pillBtn soft small" onClick={() => { setAsList(!asList); setSel(null); }} aria-pressed={asList}>
            <Icon name={asList ? "map" : "list"} size={15} /> {asList ? "Kart" : "Liste"}
          </button>
        </div>
      </div>
      {posState === "denied" && <p className="fineprint warn mapPosNote"><Icon name="alert" size={13} /> Vi fikk ikke posisjonen din. Viser {k?.name || "området"} i stedet.</p>}

      {asList ? (
        <MapList pins={pins} myPos={myPos} onSelect={setSel} sel={sel} selMeetup={selMeetup} selPlace={selPlace} />
      ) : (
        <div className="map2">
          <div ref={box} className="map2Canvas" aria-label={`Kart over ${k?.name || "området"}`} />
          {pinEls.map(({ p, el }) => el && createPortal(
            <span className={"pin2 tint-" + p.color + (sel?.id === p.id ? " sel" : "") + (p.kind === "meetup" ? " meet" : "")}>
              <Icon name={p.icon} size={17} />
              {p.live && <i className="liveDot" />}
            </span>,
            el,
            p.kind + p.id
          ))}
          <div className="map2Sheet">
            {selMeetup ? (
              <InviteCard m={selMeetup} />
            ) : selPlace ? (
              <PlaceSheet place={selPlace} myPos={myPos} onClose={() => setSel(null)} />
            ) : pins.length === 0 ? (
              <MapEmpty kommune={k} region={region} />
            ) : (
              <div className="map2Summary">
                <b>Hundekartet i {k?.name || "området"}</b>
                <p>
                  {[meetPins.length ? `${meetPins.length} ${meetPins.length === 1 ? "treff" : "treff"} nå` : null, placePins.length ? `${placePins.length} ${placePins.length === 1 ? "sted" : "steder"}` : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mapSheetBtns">
                  <button className="pillBtn primary small" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={15} stroke={2.6} /> Lag treff</button>
                  <button className="pillBtn soft small" onClick={() => app.open("placeSuggest")}><Icon name="pin" size={15} /> Foreslå sted</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Cold start: ærlig tomt kart. Kommune valgt vs. bare region kjent. */
function MapEmpty({ kommune, region }) {
  const app = useApp();
  return (
    <div className="map2Summary mapEmpty">
      {kommune ? (
        <>
          <b>Ingen hundesteder i {kommune.name} ennå</b>
          <p>Vi bygger Potesjarm {region ? `i ${regionName(region)} ` : ""}by for by. Kjenner du et godt sted, eller vil du ta det første treffet?</p>
        </>
      ) : (
        <>
          <b>Vi bygger Potesjarm i {region ? regionName(region) : "Rogaland"} by for by</b>
          <p>Velg kommunen din for å se hundeliv i nærheten.</p>
        </>
      )}
      <div className="mapSheetBtns">
        <button className="pillBtn primary small" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={15} stroke={2.6} /> Lag det første treffet</button>
        <button className="pillBtn soft small" onClick={() => app.open("placeSuggest")}><Icon name="pin" size={15} /> Foreslå et sted</button>
      </div>
    </div>
  );
}

/* Tilgjengelig alternativ til kartet: samme pins som en liste. */
function MapList({ pins, myPos, onSelect, sel, selMeetup, selPlace }) {
  const app = useApp();
  if (pins.length === 0) return <MapEmpty kommune={app.kommune} region={regionOfKommune(app.location?.kommuneId)} />;
  return (
    <div className="mapList">
      {selMeetup ? <InviteCard m={selMeetup} /> : selPlace ? <PlaceSheet place={selPlace} myPos={myPos} onClose={() => onSelect(null)} /> : null}
      <ul className="mapListItems">
        {pins.map((p) => {
          const dist = myPos ? distanceKm(myPos, { lat: p.lat, lng: p.lng }) : null;
          return (
            <li key={p.kind + p.id}>
              <button className={"mapListRow" + (sel?.id === p.id ? " sel" : "")} onClick={() => onSelect(p)}>
                <span className={"chIcon tint-" + p.color}><Icon name={p.icon} size={17} /></span>
                <span className="mapListText"><b>{p.label || (p.kind === "meetup" ? "Treff" : "Sted")}</b><small>{p.kind === "meetup" ? "Treff" : "Sted"}{dist != null ? ` · ${fmtKm(dist)} km unna` : ""}</small></span>
                <Icon name="chevronRight" size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PlaceSheet({ place, myPos, onClose }) {
  const app = useApp();
  const t = placeTypes[place.type] || placeTypes.tursti;
  // Ekte antall kommende treff fra serveren (place_detail/places_in_area).
  // Uten backend faller vi tilbake på et lokalt tekst-treff, aldri et påstått tall.
  const here = typeof place.upcomingMeetups === "number"
    ? place.upcomingMeetups
    : app.meetups.filter((m) => m.placeId === place.id || (place.name && (m.place || "").toLowerCase().startsWith(place.name.toLowerCase()))).length;
  const dist = myPos && typeof place.lat === "number" ? distanceKm(myPos, { lat: place.lat, lng: place.lng }) : place.distanceKm;
  return (
    <div className="placeSheet">
      <div className="placeSheetHead">
        <span className={"chIcon big tint-" + t.color}><Icon name={t.icon} size={22} /></span>
        <div>
          <span className="kicker">{t.label.toUpperCase()}{dist != null ? ` · ${fmtKm(dist)} km unna` : ""}</span>
          <h3>{place.name}</h3>
        </div>
        <button className="ghostIcon" onClick={onClose} aria-label="Lukk"><Icon name="x" size={18} /></button>
      </div>
      <p>{here > 0 ? `${here} ${here === 1 ? "kommende treff" : "kommende treff"} her. ` : ""}{place.about}</p>
      <div className="mapSheetBtns">
        <button className="pillBtn soft small" onClick={() => app.togglePlace(place.id)}>
          <Icon name="star" size={15} fill={app.savedPlaces[place.id] ? "currentColor" : "none"} /> {app.savedPlaces[place.id] ? "Lagret" : "Lagre"}
        </button>
        <button className="pillBtn primary small" onClick={() => app.open("meetupComposer", { place: place.name, placeId: place.id, lat: place.lat, lng: place.lng })}>
          <Icon name="plus" size={15} stroke={2.6} /> Treff her
        </button>
      </div>
    </div>
  );
}

/* ========================= Aktivitet ========================= */
/*
 * Historien om dere – ikke et fitness-dashboard. Én setning øverst som sier
 * hva dere har gjort sammen, uka som stolper, streak alltid positivt, og
 * delbare øyeblikk når ekte milepæler er nådd.
 */
export function ActivityView() {
  const app = useApp();
  const me = app.me;
  const dog = me.dogName || "Hunden din";

  const records = useMemo(() => {
    const w = app.walks;
    const longest = w.reduce((a, x) => Math.max(a, x.km), 0);
    const longestTime = w.reduce((a, x) => Math.max(a, x.seconds), 0);
    return { longest, longestTime, total: me.totalKm, walks: me.totalWalks };
  }, [app.walks, me]);

  const weekDays = useMemo(() => {
    const out = Array(7).fill(0);
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    for (const w of app.walks) {
      const d = new Date(w.at);
      if (d >= monday) out[(d.getDay() + 6) % 7] += w.km;
    }
    return out;
  }, [app.walks]);
  const maxDay = Math.max(...weekDays, 1);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const ms = milestone(me.totalKm);
  const earned = app.badgeProgress.filter((b) => b.done);
  const next = app.badgeProgress.filter((b) => !b.done).sort((a, b) => (b.pct || 0) - (a.pct || 0)).slice(0, 3);
  const weekly = app.challengeProgress.filter((c) => c.scope === "ukentlig");

  return (
    <div className="view act2">
      <section className="story2">
        <span className="story2Kicker">Denne uka</span>
        <h2>
          {me.weekKm > 0
            ? <>{dog} og du har gått <em>{fmtKm(me.weekKm)} km</em> sammen denne uka.</>
            : <>Ingen turer registrert denne uka ennå.</>}
        </h2>
        <p>{streakLine({ streak: me.streak, totalWalks: me.totalWalks, walkedToday: me.todayMinutes > 0 })}</p>
        <div className="weekBars2" aria-label="Kilometer per dag denne uka">
          {weekDays.map((v, i) => (
            <span key={i} className={i === todayIdx ? "today" : ""}>
              <i style={{ height: v > 0 ? Math.max(10, (v / maxDay) * 100) + "%" : "4px" }} className={v > 0 ? "on" : ""} />
              <small>{"MTOTFLS"[i]}</small>
            </span>
          ))}
        </div>
        <div className="inlineStats">
          <span><b>{me.streak}</b> {me.streak === 1 ? "dag" : "dager"} på rad</span>
          <span><b>{fmtKm(me.totalKm)}</b> km totalt</span>
          <span><b>{fmtNum(me.paws)}</b> poter</span>
          <span>Nivå <b>{app.level.level}</b> · {app.level.name}</span>
        </div>
        <button className="pillBtn primary" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start en tur</button>
      </section>

      {(me.streak >= 3 || ms) && (
        <section className="sec">
          <div className="secHead"><h2>Øyeblikk å dele</h2></div>
          <div className="strip moments">
            {me.streak >= 3 && (
              <ShareCard big={`${me.streak} dager`} unit="ute sammen" line="på rad, hver eneste dag" facts={[app.kommune?.name]} shareText={`${me.streak} dager på rad ute med ${dog}!`} />
            )}
            {ms && (
              <ShareCard tone="mint" big={`${ms} km`} unit="sammen" line={`${dog} og du har passert ${ms} km`} facts={[`${fmtKm(me.totalKm)} km totalt`, `${me.totalWalks} turer`]} shareText={`${dog} og jeg har gått over ${ms} km sammen!`} />
            )}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="secHead"><h2>Ukas mål</h2></div>
        <div className="goalList">
          {weekly.map((c) => (
            <div key={c.id} className={"goalRow" + (c.done ? " done" : "")}>
              <span className={"goalIcon tint-" + c.color}><Icon name={c.done ? "check" : c.icon} size={15} /></span>
              <div>
                <b>{c.title}</b>
                <i className="todayBar"><i style={{ width: Math.min(100, (c.progress / c.target) * 100) + "%" }} /></i>
                <small>{c.unit === "km" ? fmtKm(c.progress) : c.progress} av {c.target} {c.unit} · +{c.reward} poter</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="secHead"><h2>Milepæler</h2><span className="progressPill">{earned.length} av {app.badgeProgress.length}</span></div>
        <div className="badgeRow">
          {[...earned, ...next].map((b) => (
            <div key={b.id} className={"badge2 tint-" + b.color + (b.done ? " done" : "")}>
              <span className="badgeMedal" style={{ "--p": b.pct }}><Icon name={b.icon} size={22} /></span>
              <b>{b.name}</b>
              <small>{b.done ? "Oppnådd" : `${fmtKm(b.value)} / ${b.target}`}</small>
            </div>
          ))}
        </div>
        <p className="fineprint"><Icon name="shield" size={14} /> Milepæler deles bare ut for turer dere faktisk har gått.</p>
      </section>

      <section className="sec">
        <div className="secHead"><h2>Lokal toppliste</h2></div>
        <Leaderboard records={records} />
      </section>
    </div>
  );
}

/**
 * Cold start på topplista: en lokal ranking med to deltakere er meningsløs.
 * Under terskelen viser vi personlige rekorder i stedet, og sier tydelig
 * hva som skal til for å låse opp den lokale.
 */
function Leaderboard({ records }) {
  const app = useApp();
  if (!app.leaderboardUnlocked) {
    return (
      <div className="lockedBoard">
        <div className="lockedHead">
          <span className="chIcon big tint-sun"><Icon name="trophy" size={22} /></span>
          <div>
            <h3>Lokal toppliste låses opp ved {app.coldStart.leaderboardMinActive} aktive</h3>
            <p>
              {app.stats.dogs === 0
                ? `Ingen andre hunder er registrert i ${app.kommune?.name} ennå.`
                : `${app.stats.dogs} av ${app.coldStart.leaderboardMinActive} hunder er med i ${app.kommune?.name}.`}
            </p>
          </div>
        </div>
        <Bar value={app.leaderboardActive ?? app.stats.dogs} max={app.coldStart.leaderboardMinActive} tone="sun" />
        <button className="pillBtn primary" onClick={() => app.open("invite")}><Icon name="gift" size={16} /> Inviter hundeeiere</button>

        <h4>Dine egne rekorder</h4>
        <div className="recordGrid">
          <span><b>{fmtKm(records.longest)} km</b><small>Lengste tur</small></span>
          <span><b>{Math.round(records.longestTime / 60)} min</b><small>Lengste tid</small></span>
          <span><b>{records.walks}</b><small>Turer totalt</small></span>
          <span><b>{fmtKm(records.total)} km</b><small>Totalt gått</small></span>
        </div>
        {records.walks === 0 && <p className="muted">Gå din første tur, så begynner rekordene å samle seg.</p>}
      </div>
    );
  }

  // Rangeringsraddata finnes bare som demo-fixtures. I live-modus har vi ingen
  // ekte topplistekilde ennå (den krever backend-aggregering av ekte turer), så
  // vi later ALDRI som om demo-navn er en ekte lokal ranking. Uten dette vernet
  // ville en fremtidig live-hundekilde kunne dytte demo-hunder inn i topplista.
  // Backend: ekte, server-aggregerte rader ({dog_name, km}). Demo: fixtures med
  // hunde-oppslag. Live uten backend later vi ALDRI som demo-navn er en ranking.
  const realRows = app.leaderboard?.rows || [];
  if (app.leaderboard) {
    if (realRows.length === 0) {
      return (
        <div className="leaderboard">
          <Empty icon="trophy" title="Topplista er ikke klar ennå" text="Lokal ranking kommer når nok ekte turer er registrert i området." />
        </div>
      );
    }
    return (
      <div className="leaderboard">
        {realRows.map((r, i) => (
          <div key={i} className="lbRow">
            <b className="rank">{i + 1}</b>
            <Avatar name={r.dog_name} size={40} />
            <span><b>{r.dog_name}</b></span>
            <b>{fmtKm(r.km)} km</b>
          </div>
        ))}
      </div>
    );
  }
  const rows = app.isDemo ? app.demoLeaderboard : [];
  if (rows.length === 0) {
    return (
      <div className="leaderboard">
        <Empty icon="trophy" title="Topplista er ikke klar ennå" text="Lokal ranking kommer når nok ekte turer er registrert i området." />
      </div>
    );
  }
  return (
    <div className="leaderboard">
      {rows.map((r) => {
        const d = app.dogById(r.dog);
        if (!d) return null;
        return (
          <div key={r.rank} className="lbRow">
            <b className="rank">{r.rank}</b>
            <Avatar src={d.photo} name={d.name} size={40} />
            <span><b>{d.name}</b><small>{d.owner}</small></span>
            <b>{fmtKm(r.km)} km</b>
          </div>
        );
      })}
    </div>
  );
}

/* ========================= Arrangementer ========================= */
/*
 * Arrangementer = planlagt og litt større (fellestur, kurs, helg). Vises som en
 * tidslinje med datoer – tydelig annerledes enn de spontane Nå skjer-treffene.
 */
export function EventsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");
  const tags = [...new Set(app.events.map((e) => e.tag).filter(Boolean))];
  const list = app.events.filter((e) => filter === "Alle" || (filter === "Påmeldt" ? app.eventGoing[e.id] : e.tag === filter));

  return (
    <div className="view events2">
      <div className="eventsBar">
        {app.events.length > 2 && <Chips items={["Alle", ...tags, "Påmeldt"]} value={filter} onChange={setFilter} />}
        <button className="pillBtn soft small" onClick={() => app.open("eventComposer")}><Icon name="plus" size={15} stroke={2.6} /> Lag arrangement</button>
      </div>

      {list.length === 0 ? (
        <InlineEmpty
          icon="calendar"
          tone="blue"
          title={app.events.length === 0 ? `Ingen planlagte arrangementer i ${app.kommune?.name || "området"} ennå.` : "Ingenting på dette filteret."}
          text={app.events.length === 0 ? "En fellestur på søndag, et valpekurs eller en dugnad. Skal dere bare ut i dag? Bruk Nå skjer." : null}
          cta={app.events.length === 0 ? "Lag det første" : null}
          onCta={() => app.open("eventComposer")}
          secondary={app.events.length === 0 ? "Gå til Nå skjer" : "Vis alle"}
          onSecondary={() => (app.events.length === 0 ? app.setTab("Nå skjer") : setFilter("Alle"))}
        />
      ) : (
        <ol className="eventList">
          {list.map((e) => <EventRow key={e.id} e={e} />)}
        </ol>
      )}
    </div>
  );
}

export function EventRow({ e }) {
  const app = useApp();
  const on = !!app.eventGoing[e.id];
  const going = e.going + (on && !e.mine ? 1 : 0);
  return (
    <li className="eventRow">
      <span className="dateChip"><b>{e.day}</b><small>{e.month}</small></span>
      <button className="eventRowMain" onClick={() => app.open("event", e.id)}>
        <small className="eventRowTag">{[e.tag, e.weekday && `${e.weekday} ${e.time}`].filter(Boolean).join(" · ")}</small>
        <b>{e.title}</b>
        <small>{e.place}{going > 0 ? ` · ${going} påmeldt` : ""}</small>
      </button>
      <button className={"joinBtn" + (on ? " done" : "")} onClick={() => app.toggleEvent(e.id)} aria-pressed={on}>
        {on ? <><Icon name="check" size={14} stroke={2.8} /> Påmeldt</> : "Meld på"}
      </button>
    </li>
  );
}

/* ========================= Utforsk ========================= */
/* «Oppdag nye ting å gjøre med hunden din» – seksjoner, ikke en innholdsvegg. */
export function ExploreView() {
  const app = useApp();
  const groups = app.groups.slice(0, 6);
  const events = app.events.slice(0, 3);
  return (
    <div className="view explore2">
      <section className="sec">
        <div className="secHead"><h2>Turområder</h2><SourceTag /></div>
        {app.places.length === 0 ? (
          <InlineEmpty
            icon="compass"
            tone="mint"
            title={`Vi har ikke lagt inn turområder i ${app.kommune?.name || "området"} ennå.`}
            text="Guiden bygges kommune for kommune. Kjenner du et godt sted, vil vi gjerne vite om det."
            cta="Foreslå et sted"
            onCta={() => app.open("placeSuggest")}
          />
        ) : (
          <div className="placeGrid">{app.places.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
        )}
      </section>

      {groups.length > 0 && (
        <section className="sec">
          <div className="secHead"><h2>Lokale grupper</h2><button className="linkish" onClick={() => app.setTab("Grupper")}>Alle <Icon name="arrowRight" size={14} /></button></div>
          <div className="groupList">{groups.slice(0, 3).map((g) => <GroupRow key={g.id} g={g} />)}</div>
        </section>
      )}

      {events.length > 0 && (
        <section className="sec">
          <div className="secHead"><h2>Kommende arrangementer</h2><button className="linkish" onClick={() => app.setTab("Arrangementer")}>Alle <Icon name="arrowRight" size={14} /></button></div>
          <ol className="eventList">{events.map((e) => <EventRow key={e.id} e={e} />)}</ol>
        </section>
      )}

      {app.dogs.length > 0 && (
        <section className="sec">
          <div className="secHead"><h2>Hunder i nærheten</h2><button className="linkish" onClick={() => app.setTab("Hunder")}>Alle <Icon name="arrowRight" size={14} /></button></div>
          <div className="strip">{app.dogs.slice(0, 10).map((d) => <DogTile key={d.id} d={d} />)}</div>
        </section>
      )}

      <section className="sec">
        <div className="secHead"><h2>Regler og trygghet</h2></div>
        <div className={"bandtvangCard" + (inBandtvang() ? " active" : "")}>
          <span className="chIcon big tint-sun"><Icon name="info" size={22} /></span>
          <div>
            <h3>{inBandtvang() ? "Det er båndtvang nå" : "Det er ikke generell båndtvang nå"}</h3>
            <p>Generell båndtvang gjelder {BANDTVANG.from}–{BANDTVANG.to} ({BANDTVANG.law}).</p>
            <small>{BANDTVANG.note}</small>
          </div>
        </div>
        <div className="stepList">
          <button className="stepRow" onClick={() => app.open("safety")}><span className="stepCheck"><Icon name="shield" size={16} /></span><b>Nødprofil for {app.me.dogName || "hunden din"}</b><Icon name="chevronRight" size={16} /></button>
          <button className="stepRow" onClick={() => app.open("lostDog")}><span className="stepCheck"><Icon name="alert" size={16} /></span><b>Meld hunden savnet</b><Icon name="chevronRight" size={16} /></button>
          <button className="stepRow" onClick={() => app.open("safety")}><span className="stepCheck"><Icon name="users" size={16} /></span><b>Trygge møter med nye folk</b><Icon name="chevronRight" size={16} /></button>
        </div>
        {publicInfo.map((i) => (
          <details key={i.id} className="infoFold">
            <summary>{i.title}</summary>
            <p>{i.body}</p>
            <SourceTag icon="info">{i.source}</SourceTag>
          </details>
        ))}
      </section>
    </div>
  );
}

function PlaceCard({ place }) {
  const app = useApp();
  const t = placeTypes[place.type] || placeTypes.tursti;
  const verified = !!app.verifiedPlaces[place.id];
  return (
    <article className={"place tint-" + t.color}>
      <div className="placeBody">
        <div className="placeTop">
          <span className={"chIcon big"}><Icon name={t.icon} size={22} /></span>
          <button className={"saveBtn" + (app.savedPlaces[place.id] ? " on" : "")} onClick={() => app.togglePlace(place.id)} aria-label="Lagre sted">
            <Icon name="star" size={17} fill={app.savedPlaces[place.id] ? "currentColor" : "none"} />
          </button>
        </div>
        <span className="placeType">{t.label}</span>
        <h3>{place.name}</h3>
        <p>{place.about}</p>
        <div className="placeFoot">
          {verified || place.verified ? (
            <span className="verifiedNote"><Icon name="verified" size={14} /> Bekreftet</span>
          ) : (
            <button className="linkish" onClick={() => app.verifyPlace(place.id)}>
              <Icon name="check" size={14} /> Har du vært her? Bekreft
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
