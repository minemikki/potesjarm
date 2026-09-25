"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import { useApp } from "./store";
import { MeetupCard, PostCard, FeedPostCard } from "./Home";
import { Avatar, AvatarStack, Bar, Chips, DogAvatar, Empty, Img, Meter, SectionHead, SourceTag } from "./ui";
import { fmtKm, fmtNum, img, meetupTypes, PHOTO } from "../lib/data";
import { BANDTVANG, inBandtvang, kommuneById, placeShort } from "../lib/geo";
import { placeTypes, publicInfo } from "../lib/seed";
import { getDogCommonalities, commonalityHeadline } from "../lib/social";

/* ========================= Nå skjer ========================= */
export function NowView() {
  const app = useApp();
  const [type, setType] = useState("alle");
  const [sort, setSort] = useState("tid");

  const list = useMemo(() => {
    const l = app.meetups.filter((m) => type === "alle" || (type === "mine" ? app.going[m.id] || m.mine : m.type === type));
    return [...l].sort((a, b) => (sort === "tid" ? a.startsIn - b.startsIn : 0));
  }, [app.meetups, type, sort, app.going]);

  return (
    <div className="view">
      <section className="nowHero">
        <div>
          <span className="heroLive">
            {app.stats.meetupsNow > 0 ? <><i /> {app.stats.meetupsNow} STARTER SNART</> : <>NÅ SKJER I {app.kommune?.name?.toUpperCase()}</>}
          </span>
          <h2>{app.stats.meetups > 0 ? "Hvem er ute med hunden nå?" : "Bli den første ute"}</h2>
          <p>
            {app.stats.meetups > 0
              ? "Bli med på noe spontant – eller lag ditt eget treff på ti sekunder."
              : "Et treff varer bare noen timer og forsvinner av seg selv. Perfekt for en spontan tur."}
          </p>
        </div>
        <div className="nowHeroSide">
          <button className="pillBtn white big" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={19} stroke={2.6} /> Lag treff</button>
        </div>
      </section>

      {app.stats.meetups > 0 && (
        <div className="toolbar">
          <Chips
            items={[{ id: "alle", label: "Alle", icon: "grid" }, ...meetupTypes.map((t) => ({ id: t.id, label: t.label, icon: t.icon })), { id: "mine", label: "Mine", icon: "check" }]}
            value={type}
            onChange={setType}
          />
        </div>
      )}

      {list.length === 0 ? (
        <Empty
          icon="live"
          tone="coral"
          title={app.stats.meetups === 0 ? `Ingen treff i ${app.kommune?.name} akkurat nå` : "Ingen treff i denne kategorien"}
          text={
            app.stats.meetups === 0
              ? "Når noen legger ut et treff, dukker det opp her med en gang. Vær den som starter."
              : "Prøv en annen kategori, eller lag et treff selv."
          }
          cta="Lag treff"
          onCta={() => app.open("meetupComposer")}
          secondary={app.stats.meetups === 0 ? "Inviter hundeeiere" : null}
          onSecondary={() => app.open("invite")}
        />
      ) : (
        <div className="meetGrid">
          {list.map((m) => <MeetupCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}

/* ========================= Grupper ========================= */
export function GroupsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");
  if (app.groupId) return <GroupPage id={app.groupId} />;

  const mine = app.groups.filter((g) => app.joinedGroups[g.id]);
  const list = app.groups.filter((g) => filter === "Alle" || g.tag === filter);

  return (
    <div className="view">
      {mine.length > 0 && (
        <section className="block first">
          <SectionHead title="Dine grupper" />
          <div className="myGroups">
            {mine.map((g) => (
              <button key={g.id} className={"myGroup tint-" + (g.color || "blue")} onClick={() => app.openGroup(g.id)}>
                {g.photo ? <Img id={g.photo} w={160} h={160} className="myGroupImg" /> : <span className="groupIconBox"><Icon name="users" size={22} /></span>}
                <span><b>{g.name}</b><small>{g.official ? "Offisiell områdegruppe" : `${fmtNum(g.members)} medlemmer`}</small></span>
                <Icon name="chevronRight" size={18} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="block first">
        <SectionHead title="Finn flokken din" action={app.backend ? "Lag gruppe" : null} onAction={app.backend ? () => app.open("groupComposer") : null} />
        {app.groups.length > 1 && <Chips items={["Alle", "Rase", "Aktivitet", "Valp", "Lokalt"]} value={filter} onChange={setFilter} />}
        {app.groups.length === 0 ? (
          <Empty
            icon="users"
            tone="violet"
            title={`Ingen lokale grupper i ${app.kommune?.name || "området"} ennå`}
            text="Grupper lages av hundeeiere selv. Bli den første som starter en."
            cta={app.backend ? "Start den første gruppen" : "Foreslå en gruppe"}
            onCta={app.backend ? () => app.open("groupComposer") : () => app.flash("Gruppeoppretting kommer med innlogging", "users")}
          />
        ) : (
          <div className="groupGrid">
            {list.map((g) => <GroupCard key={g.id} g={g} />)}
          </div>
        )}
        {app.groups.length === 1 && !app.backend && (
          <Empty
            icon="users"
            tone="violet"
            title="Bare den offisielle gruppa foreløpig"
            text={`Grupper lages av hundeeiere selv. Savner du «Valper ${app.kommune?.name}» eller en rasegruppe, kan du starte den.`}
            cta="Foreslå en gruppe"
            onCta={() => app.flash("Gruppeoppretting kommer med innlogging", "users")}
          />
        )}
      </section>
    </div>
  );
}

function GroupCard({ g }) {
  const app = useApp();
  const joined = !!app.joinedGroups[g.id];
  return (
    <article className={"groupCard tint-" + (g.color || "blue")}>
      <button className="groupCover" onClick={() => app.openGroup(g.id)}>
        {g.photo ? <Img id={g.photo} w={600} h={360} className="groupCoverImg" /> : <span className="groupCoverBlank"><Icon name="users" size={34} /></span>}
        <span className="groupTag">{g.tag}</span>
        {g.official && <span className="officialTag"><Icon name="shield" size={12} /> Potesjarm</span>}
      </button>
      <div className="groupInfo">
        <h3 onClick={() => app.openGroup(g.id)}>{g.name}</h3>
        <p>{g.about}</p>
        <div className="groupFoot">
          <span>
            {g.faces?.length > 0 && <AvatarStack ids={g.faces} size={22} />}
            {g.official && !g.members ? "Ny gruppe" : `${fmtNum(g.members)} medlemmer`}
          </span>
          <button className={"pillBtn small " + (joined ? "done" : "primary")} onClick={() => app.toggleGroup(g.id)}>
            {joined ? <><Icon name="check" size={14} stroke={2.6} /> Medlem</> : "Bli med"}
          </button>
        </div>
      </div>
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
            <div className="meetGrid">{meetups.map((m) => <MeetupCard key={m.id} m={m} />)}</div>
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
export function DogsView() {
  const app = useApp();
  const [energy, setEnergy] = useState("Alle");
  const [size, setSize] = useState("Alle");

  if (app.stats.dogs === 0) {
    return (
      <div className="view">
        <Empty
          icon="dog"
          tone="sun"
          title={`Ingen hunder i ${app.kommune?.name} ennå`}
          text="Kjenner du noen med hund i området?"
          cta="Inviter hundeeiere"
          onCta={() => app.open("invite")}
          secondary="Utvid radius"
          onSecondary={() => app.open("location")}
        />
      </div>
    );
  }

  // Fellestrekk med ekte profilfelt (ingen oppdiktet matchprosent). Sortér
  // etter hvor mye hver hund faktisk har til felles med brukerens hund.
  const commonFor = (d) => getDogCommonalities(app.me, d, { sameArea: true });
  const list = app.dogs
    .filter((d) => energy === "Alle" || (energy === "Rolig" ? d.energy <= 3 : d.energy >= 4))
    .filter((d) => size === "Alle" || d.size === size)
    .map((d) => ({ d, common: commonFor(d) }))
    .sort((a, b) => b.common.length - a.common.length);
  const best = list[0]?.d;
  const bestCommon = list[0]?.common || [];

  return (
    <div className="view">
      {best && (
        <section className="matchSpot" onClick={() => app.open("dog", best.id)}>
          <Img id={best.photo} w={900} h={700} className="matchSpotImg" />
          <div className="matchSpotBody">
            <span className="kicker light">{bestCommon.length >= 2 ? "GOD TURMATCH I NÆRHETEN" : "HUND I NÆRHETEN"}</span>
            <h2>{best.name} <small>{best.breed}{best.age ? `, ${best.age}` : ""}</small></h2>
            <p>{bestCommon.length ? bestCommon.slice(0, 2).join(" · ") : `Ny å bli kjent med i ${app.kommune?.name || "området"}.`}</p>
            <div className="matchSpotFoot">
              <span className="commonBadge"><Icon name="paw" size={15} /> {bestCommon.length} til felles</span>
              <button className="pillBtn white" onClick={(e) => { e.stopPropagation(); app.open("meetupComposer", { with: best.id }); }}>
                <Icon name="walk" size={17} /> Foreslå tur
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="toolbar">
        <Chips items={[{ id: "Alle", label: "All energi", icon: "bolt" }, { id: "Rolig", label: "Rolig" }, { id: "Høy", label: "Høy energi" }]} value={energy} onChange={setEnergy} />
        <Chips items={[{ id: "Alle", label: "Alle størrelser" }, "Liten", "Medium", "Stor"]} value={size} onChange={setSize} />
      </div>

      <div className="dogGrid">
        {list.map(({ d, common }) => (
          <article key={d.id} className="dogCard">
            <button className="dogPhoto" onClick={() => app.open("dog", d.id)}>
              <Img id={d.photo} w={520} h={560} className="dogPhotoImg" brand fallbackLabel={d.name?.charAt(0)} />
              {common.length >= 2 && <span className="commonPill"><Icon name="paw" size={12} /> {common.length} til felles</span>}
              {d.online && <span className="onlinePill"><i /> Ute nå</span>}
            </button>
            <div className="dogBody">
              <div className="dogName">
                <h3>{d.name}</h3>
                <button className={"heartBtn" + (app.followed[d.id] ? " on" : "")} onClick={() => app.toggleFollow(d)} aria-label="Følg">
                  <Icon name="heart" size={18} fill={app.followed[d.id] ? "currentColor" : "none"} />
                </button>
              </div>
              <p>{d.breed}{d.age ? ` · ${d.age}` : ""}{d.area ? ` · ${d.area}` : ""}</p>
              <div className="dogTraits">
                {d.energy != null && <span><Meter value={d.energy} /> Energi</span>}
                {d.play?.[0] && <span className="trait">{d.play[0]}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ========================= Kart ========================= */
export function MapView() {
  const app = useApp();
  const [layer, setLayer] = useState("Alt");
  const [sel, setSel] = useState(null);

  const k = app.kommune;
  // Pins plasseres ut fra faktiske koordinater, relativt til kommunesenteret.
  const span = Math.max(0.06, (app.location.radiusKm || 20) / 60);
  const toXY = (lat, lng) => ({
    x: 50 + ((lng - k.lng) / (span * 1.9)) * 50,
    y: 50 - ((lat - k.lat) / span) * 50,
  });

  const placePins = app.places.map((p) => ({ ...toXY(p.lat, p.lng), kind: "place", id: p.id, label: p.name, icon: placeTypes[p.type]?.icon || "pin", color: placeTypes[p.type]?.color || "mint" }));
  const meetPins = app.meetups.filter((m) => m.lat).map((m) => {
    const t = meetupTypes.find((x) => x.id === m.type) || meetupTypes[0];
    return { ...toXY(m.lat, m.lng), kind: "meetup", id: m.id, label: t.label, icon: t.icon, color: t.color };
  });

  const pins = [...(layer !== "Steder" ? meetPins : []), ...(layer !== "Treff" ? placePins : [])]
    .filter((p) => p.x > 4 && p.x < 96 && p.y > 4 && p.y < 96);

  const selMeetup = sel?.kind === "meetup" ? app.meetups.find((m) => m.id === sel.id) : null;
  const selPlace = sel?.kind === "place" ? app.places.find((p) => p.id === sel.id) : null;

  return (
    <div className="view mapView">
      <div className="mapCanvas">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mapArt" aria-hidden="true">
          <rect width="100" height="100" fill="#eef1e4" />
          <path d="M0 0H38C30 18 20 24 0 30Z" fill="#dcebd0" />
          <path d="M62 100C60 80 72 66 100 60V100Z" fill="#d6e8cc" />
          <path d="M36 44C42 36 58 38 60 50S50 70 40 66 30 52 36 44Z" fill="#b9dcef" />
          <path d="M-5 56C20 50 40 58 60 50S90 36 105 40" stroke="#fff" strokeWidth="2.4" fill="none" />
          <path d="M30 -5C34 30 26 60 34 105" stroke="#fff" strokeWidth="1.8" fill="none" />
          <path d="M70 -5C66 30 76 70 68 105" stroke="#fff" strokeWidth="1.4" fill="none" />
        </svg>

        {pins.map((p, i) => (
          <button key={i} className={"mapPin tint-" + p.color + (sel?.id === p.id ? " sel" : "")} style={{ left: p.x + "%", top: p.y + "%" }} onClick={() => setSel(p)}>
            <Icon name={p.icon} size={18} />
            <span>{p.label}</span>
          </button>
        ))}
        <span className="youPin" style={{ left: "50%", top: "50%" }} title="Omtrentlig posisjon" />

        <div className="mapTools">
          <Chips items={["Alt", "Treff", "Steder"]} value={layer} onChange={(v) => { setLayer(v); setSel(null); }} />
        </div>

        <div className="mapSheet">
          {selMeetup ? (
            <MeetupCard m={selMeetup} />
          ) : selPlace ? (
            <PlaceSheet place={selPlace} onClose={() => setSel(null)} />
          ) : (
            <>
              <span className="kicker">{app.kommune?.name?.toUpperCase()}</span>
              <h3>
                {pins.length === 0
                  ? "Ingenting kartfestet her ennå"
                  : `${meetPins.length ? meetPins.length + " treff og " : ""}${placePins.length} turområder`}
              </h3>
              <p>
                {pins.length === 0
                  ? "Turområder og treff dukker opp på kartet etter hvert som de legges inn."
                  : "Posisjonen din vises alltid omtrentlig – aldri nøyaktig adresse."}
              </p>
              <div className="mapSheetBtns">
                <button className="pillBtn primary" onClick={() => app.open("meetupComposer")}><Icon name="plus" size={17} stroke={2.6} /> Lag treff</button>
                <button className="pillBtn soft" onClick={() => app.setTab("Utforsk")}><Icon name="compass" size={17} /> Steder</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceSheet({ place, onClose }) {
  const app = useApp();
  const t = placeTypes[place.type] || placeTypes.tursti;
  return (
    <div className="placeSheet">
      <div className="placeSheetHead">
        <span className={"chIcon big tint-" + t.color}><Icon name={t.icon} size={22} /></span>
        <div>
          <span className="kicker">{t.label.toUpperCase()}</span>
          <h3>{place.name}</h3>
        </div>
        <button className="ghostIcon" onClick={onClose} aria-label="Lukk"><Icon name="x" size={18} /></button>
      </div>
      <p>{place.about}</p>
      <SourceTag />
      <div className="mapSheetBtns">
        <button className="pillBtn soft" onClick={() => app.togglePlace(place.id)}>
          <Icon name="star" size={16} fill={app.savedPlaces[place.id] ? "currentColor" : "none"} /> {app.savedPlaces[place.id] ? "Lagret" : "Lagre"}
        </button>
        <button className="pillBtn primary" onClick={() => app.open("meetupComposer", { place: place.name })}>
          <Icon name="plus" size={16} stroke={2.6} /> Treff her
        </button>
      </div>
    </div>
  );
}

/* ========================= Aktivitet ========================= */
export function ActivityView() {
  const app = useApp();
  const [view, setView] = useState("Utfordringer");
  const me = app.me;

  // Personlige rekorder – alltid meningsfulle, uansett hvor få vi er.
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

  return (
    <div className="view">
      <section className="statHero">
        <div className="statMain">
          <span className="kicker light">DENNE UKA</span>
          <b className="bigNum">{fmtKm(me.weekKm)}<small> km</small></b>
          <p>
            {me.weekWalks === 0
              ? <><Icon name="paw" size={15} /> Ingen turer registrert ennå denne uka</>
              : <><Icon name="paw" size={15} /> {me.weekWalks} {me.weekWalks === 1 ? "tur" : "turer"} så langt</>}
          </p>
          <div className="weekBars">
            {weekDays.map((v, i) => (
              <span key={i}>
                <i style={{ height: v > 0 ? Math.max(8, (v / maxDay) * 100) + "%" : "4px" }} className={v > 0 ? "on" : ""} />
                <small>{"MTOTFLS"[i]}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="statSide">
          <div className="statTile coral"><Icon name="flame" size={22} /><b>{me.streak}</b><small>{me.streak === 1 ? "dag streak" : "dager streak"}</small></div>
          <div className="statTile sun"><Icon name="paw" size={22} /><b>{fmtNum(me.paws)}</b><small>poter</small></div>
          <div className="statTile mint"><Icon name="route" size={22} /><b>{fmtKm(me.totalKm)}</b><small>km totalt</small></div>
          <div className="levelCard">
            <div>
              <b>Nivå {app.level.level} · {app.level.name}</b>
              <small>{app.level.next ? `${fmtNum(app.level.toNext)} poter til ${app.level.next.name}` : "Høyeste nivå"}</small>
            </div>
            <Bar value={app.level.pct} tone="sun" />
          </div>
        </div>
      </section>

      <div className="toolbar">
        <Chips
          items={[{ id: "Utfordringer", label: "Utfordringer", icon: "target" }, { id: "Merker", label: "Merker", icon: "star" }, { id: "Toppliste", label: "Toppliste", icon: "trophy" }]}
          value={view}
          onChange={setView}
        />
        <button className="pillBtn primary" onClick={app.startWalk}><Icon name="play" size={14} fill="currentColor" stroke={0} /> Start tur</button>
      </div>

      {view === "Utfordringer" && (
        <div className="challengeGrid">
          {app.challengeProgress.map((c) => (
            <article key={c.id} className={"challenge tint-" + c.color + (c.done ? " done" : "")}>
              <span className="chIcon big"><Icon name={c.done ? "check" : c.icon} size={22} stroke={c.done ? 2.8 : 2} /></span>
              <div>
                <small className="chEnd">{c.scope}</small>
                <h3>{c.title}</h3>
                <Bar value={c.progress} max={c.target} tone={c.color} />
                <p><b>{fmtKm(c.progress)}</b> av {c.target} {c.unit} · <b>+{c.reward} poter</b></p>
              </div>
            </article>
          ))}
        </div>
      )}

      {view === "Merker" && (
        <>
          <div className="badgeGrid">
            {app.badgeProgress.map((b) => (
              <article key={b.id} className={"badge tint-" + b.color + (b.done ? " done" : b.value === 0 ? " locked" : "")}>
                <span className="badgeMedal" style={{ "--p": b.pct }}><Icon name={b.icon} size={26} /></span>
                <h3>{b.name}</h3>
                <small>{b.done ? "Oppnådd" : `${fmtKm(b.value)} / ${b.target}`}</small>
              </article>
            ))}
          </div>
          <p className="fineprint"><Icon name="shield" size={14} /> Merker deles bare ut for turer du faktisk har gått.</p>
        </>
      )}

      {view === "Toppliste" && <Leaderboard records={records} />}
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
        <Bar value={app.stats.dogs} max={app.coldStart.leaderboardMinActive} tone="sun" />
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
export function EventsView() {
  const app = useApp();
  const [filter, setFilter] = useState("Alle");
  const list = app.events.filter((e) => filter === "Alle" || (filter === "Påmeldt" ? app.eventGoing[e.id] : e.tag === filter));
  const [first, ...rest] = list;

  return (
    <div className="view">
      <div className="toolbar">
        {app.events.length > 0 && <Chips items={["Alle", "Tur", "Valp", "Fjell", "Sosialt", "Påmeldt"]} value={filter} onChange={setFilter} />}
        <button className="pillBtn primary" onClick={() => app.open("eventComposer")}><Icon name="plus" size={16} stroke={2.6} /> Lag arrangement</button>
      </div>

      {!first && (
        <Empty
          icon="calendar"
          title={app.events.length === 0 ? `Ingen arrangementer i ${app.kommune?.name} ennå` : "Ingen treff på dette filteret"}
          text={
            app.events.length === 0
              ? "En fellestur, et valpetreff eller en dugnad. Lag det første."
              : "Prøv et annet filter."
          }
          cta="Lag arrangement"
          onCta={() => app.open("eventComposer")}
        />
      )}

      {first && (
        <article className="eventFeature" onClick={() => app.open("event", first.id)}>
          {first.photo && <Img id={first.photo} w={1200} h={600} className="eventFeatureImg" />}
          <div className="eventFeatureBody">
            <span className="dateChip big"><b>{first.day}</b><small>{first.month}</small></span>
            <div>
              <span className="kicker light">{first.tag?.toUpperCase()} · NESTE UT</span>
              <h2>{first.title}</h2>
              <p><Icon name="clock" size={15} /> {first.weekday} {first.time} <Icon name="pin" size={15} /> {first.place}</p>
            </div>
            <button className={"pillBtn " + (app.eventGoing[first.id] ? "done" : "white")} onClick={(e) => { e.stopPropagation(); app.toggleEvent(first.id); }}>
              {app.eventGoing[first.id] ? <><Icon name="check" size={15} stroke={2.6} /> Påmeldt</> : "Meld på"}
            </button>
          </div>
        </article>
      )}

      {rest.length > 0 && (
        <div className="eventGrid">
          {rest.map((e) => (
            <article key={e.id} className="eventCard" onClick={() => app.open("event", e.id)}>
              <div className="eventImg">
                {e.photo ? <img src={img(e.photo, 600, 360)} alt="" loading="lazy" /> : <span className="eventImgBlank"><Icon name="calendar" size={30} /></span>}
                <span className="dateChip"><b>{e.day}</b><small>{e.month}</small></span>
              </div>
              <div className="eventBody">
                <span className="kicker">{e.tag?.toUpperCase()}</span>
                <h3>{e.title}</h3>
                <p><Icon name="clock" size={14} /> {e.weekday} {e.time} · {e.place}</p>
                <div className="eventFoot">
                  <span>{e.faces?.length > 0 && <AvatarStack ids={e.faces} size={22} />} {e.going + (app.eventGoing[e.id] && !e.mine ? 1 : 0)} påmeldt</span>
                  <button className={"pillBtn small " + (app.eventGoing[e.id] ? "done" : "primary")} onClick={(ev) => { ev.stopPropagation(); app.toggleEvent(e.id); }}>
                    {app.eventGoing[e.id] ? "Påmeldt" : "Meld på"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================= Utforsk ========================= */
export function ExploreView() {
  const app = useApp();
  const [view, setView] = useState("Steder");

  return (
    <div className="view">
      <div className="toolbar">
        <Chips
          items={[{ id: "Steder", label: "Turområder", icon: "pin" }, { id: "Regler", label: "Regler", icon: "shield" }, { id: "Trygghet", label: "Trygghet", icon: "alert" }]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "Steder" && (
        app.places.length === 0 ? (
          <Empty
            icon="compass"
            tone="mint"
            title={`Vi har ikke lagt inn turområder i ${app.kommune?.name} ennå`}
            text="Potesjarm-guiden bygges ut kommune for kommune. Kjenner du et godt turområde her, vil vi gjerne vite om det."
            cta="Foreslå et sted"
            onCta={() => app.flash("Takk! Stedsforslag kommer med innlogging", "pin")}
          />
        ) : (
          <>
            <div className="guideNote">
              <SourceTag />
              <p>Offentlige turområder. Vi viser ingen vurderinger før ekte brukere har lagt dem inn.</p>
            </div>
            <div className="placeGrid">
              {app.places.map((p) => <PlaceCard key={p.id} place={p} />)}
            </div>
          </>
        )
      )}

      {view === "Regler" && (
        <div className="infoList">
          <div className={"bandtvangCard" + (inBandtvang() ? " active" : "")}>
            <span className="chIcon big tint-sun"><Icon name="info" size={22} /></span>
            <div>
              <h3>{inBandtvang() ? "Det er båndtvang nå" : "Det er ikke generell båndtvang nå"}</h3>
              <p>Generell båndtvang gjelder {BANDTVANG.from}–{BANDTVANG.to} ({BANDTVANG.law}).</p>
              <small>{BANDTVANG.note}</small>
            </div>
          </div>
          {publicInfo.map((i) => (
            <article key={i.id} className="infoCard">
              <h3>{i.title}</h3>
              <p>{i.body}</p>
              <SourceTag icon="info">{i.source}</SourceTag>
            </article>
          ))}
        </div>
      )}

      {view === "Trygghet" && (
        <div className="safetyGrid">
          <article className="safetyCard tint-mint">
            <span className="chIcon big"><Icon name="shield" size={22} /></span>
            <h3>Nødprofil</h3>
            <p>Kontaktperson, veterinær og viktig info om {app.me.dogName || "hunden din"} hvis noe skjer.</p>
            <button className="linkish" onClick={() => app.open("safety")}>Åpne <Icon name="arrowRight" size={14} /></button>
          </article>
          <article className="safetyCard tint-coral">
            <span className="chIcon big"><Icon name="alert" size={22} /></span>
            <h3>Mistet hund</h3>
            <p>Send et varsel til hundeeiere i nærområdet med ett trykk.</p>
            <button className="linkish" onClick={() => app.open("lostDog")}>Lag varsel <Icon name="arrowRight" size={14} /></button>
          </article>
          <article className="safetyCard tint-blue">
            <span className="chIcon big"><Icon name="users" size={22} /></span>
            <h3>Trygge møter</h3>
            <p>Møt nye folk på offentlige steder, og rapporter enkelt hvis noe føles feil.</p>
            <button className="linkish" onClick={() => app.open("safety")}>Les mer <Icon name="arrowRight" size={14} /></button>
          </article>
        </div>
      )}
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
