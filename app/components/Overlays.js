"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon, { PawLogo } from "./Icon";
import { useApp } from "./store";
import { Avatar, AvatarStack, Bar, Chips, CloseBtn, DogAvatar, Empty, Img, Layer, LayerHead, Meter, RouteSketch, SourceTag } from "./ui";
import { dogTraits, expiryOptions, fmtKm, fmtNum, genitive, img, meetupTypes, ownerGoals, PHOTO } from "../lib/data";
import { kommuneById, omrader, placeLabel, placeShort, radiusOptions, roundCoord, searchPlaces } from "../lib/geo";
import { placeTypes } from "../lib/seed";
import { MODE } from "../lib/content";
import { paceMinPerKm, pawsForWalk } from "../lib/track";

export default function Overlays() {
  const app = useApp();
  return (
    <>
      {app.overlays.map((o) => {
        const C = MAP[o.type];
        return C ? <C key={o.type} data={o.data} onClose={() => app.close(o.type)} /> : null;
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

/* ========================= Onboarding ========================= */
/**
 * Første møte med appen. Målet er at brukeren kommer ut med:
 *   - et ekte sted (kommune + valgfritt område + radius)
 *   - en hundeprofil
 *   - en klar forståelse av at appen er nyttig alene, og blir bedre med flere
 * Vi lover aldri et fellesskap som ikke finnes der ennå.
 */
function Onboarding() {
  const app = useApp();
  const [step, setStep] = useState(0);
  // Starter uten sted valgt – en ny bruker skal aldri få et sted "gratis".
  // Ingen kommune er forhåndsvalgt eller vist som aktiv før brukeren faktisk
  // søker og trykker på et treff.
  const [loc, setLoc] = useState({ kommuneId: null, omrade: null, radiusKm: 10 });
  const [dog, setDog] = useState({ dogName: "", ownerName: "", breed: "", age: "", size: "", energy: "" });
  const [play, setPlay] = useState([]);
  const [goals, setGoals] = useState([]);

  const kommune = kommuneById[loc.kommuneId];
  // Fire innholdssteg (Sted, Hund, Liker, Ønsker) + velkomst og klar-skjerm.
  const steps = ["Velkommen", "Sted", "Hund", "Liker", "Ønsker", "Klar"];
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = (thenWalk) => {
    app.completeOnboarding({
      location: loc,
      profile: { ...app.profile, ...dog, play, goals },
    });
    if (thenWalk) app.startWalk();
  };

  return (
    <Layer onClose={() => {}} className="onboarding" tone="brand" label="Velkommen">
      <div className="onboardSteps" aria-hidden="true">
        {steps.map((s, i) => <i key={s} className={i <= step ? "on" : ""} />)}
      </div>

      {step === 0 && (
        <>
          <PawLogo size={64} />
          <span className="kicker">VELKOMMEN TIL POTESJARM</span>
          <h1>Hundeliv er bedre sammen.</h1>
          <p>Spor turene, bygg streak og bli kjent med hundefolk i nabolaget.</p>
          <div className="onboardGrid">
            {[
              ["walk", "Turer, streak og merker", "mint", "Virker fra dag 1"],
              ["live", "Nå skjer – spontane treff", "coral", "Når flere blir med"],
              ["users", "Grupper og arrangementer", "violet", "Bygges lokalt"],
              ["compass", "Turområder i kommunen din", "blue", "Klart nå"],
            ].map(([i, t, c, note]) => (
              <span key={t} className={"tint-" + c}><i><Icon name={i} size={20} /></i><b>{t}</b><small>{note}</small></span>
            ))}
          </div>
          <button className="pillBtn primary big" onClick={() => setStep(1)}>Kom i gang <Icon name="arrowRight" size={18} /></button>
        </>
      )}

      {step === 1 && (
        <>
          <span className="kicker">STEG 1 AV 4</span>
          <h1>Hvor bor dere?</h1>
          <p>Vi bruker stedet til å vise turer, treff og folk i nærheten. Posisjonen din deles aldri nøyaktig.</p>
          <LocationForm value={loc} onChange={setLoc} />
          <button className="pillBtn primary big" onClick={() => setStep(2)} disabled={!kommune}>
            Videre <Icon name="arrowRight" size={18} />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <span className="kicker">STEG 2 AV 4</span>
          <h1>Fortell om hunden</h1>
          <p>Dette brukes til å finne turvenner som passer. Du kan endre alt senere.</p>
          <div className="onboardForm">
            <div className="fieldRow two">
              <label className="field"><span>Hundens navn</span><input value={dog.dogName} onChange={(e) => setDog({ ...dog, dogName: e.target.value })} placeholder="F.eks. Luna" autoFocus /></label>
              <label className="field"><span>Ditt navn</span><input value={dog.ownerName} onChange={(e) => setDog({ ...dog, ownerName: e.target.value })} placeholder="F.eks. Kari" /></label>
            </div>
            <div className="fieldRow two">
              <label className="field"><span>Rase</span><input value={dog.breed} onChange={(e) => setDog({ ...dog, breed: e.target.value })} placeholder="F.eks. blandingshund" /></label>
              <label className="field"><span>Alder</span><input value={dog.age} onChange={(e) => setDog({ ...dog, age: e.target.value })} placeholder="F.eks. 3 år" /></label>
            </div>
            <div className="field">
              <span>Størrelse</span>
              <div className="miniChips">{dogTraits.size.map((s) => <button key={s} className={dog.size === s ? "active" : ""} onClick={() => setDog({ ...dog, size: s })}>{s}</button>)}</div>
            </div>
            <div className="field">
              <span>Energinivå</span>
              <div className="miniChips">{dogTraits.energy.map((s) => <button key={s} className={dog.energy === s ? "active" : ""} onClick={() => setDog({ ...dog, energy: s })}>{s}</button>)}</div>
            </div>
          </div>
          <button className="pillBtn primary big" onClick={() => setStep(3)} disabled={!dog.dogName.trim()}>
            Videre <Icon name="arrowRight" size={18} />
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <span className="kicker">STEG 3 AV 4</span>
          <h1>Hva liker {dog.dogName || "hunden"}?</h1>
          <p>Vi bruker dette til å foreslå turvenner og aktiviteter som passer. Velg gjerne flere.</p>
          <div className="onboardForm">
            <div className="field">
              <span>Favorittaktiviteter</span>
              <div className="miniChips wrap">{dogTraits.play.map((s) => <button key={s} className={play.includes(s) ? "active" : ""} onClick={() => toggle(play, setPlay, s)}>{s}</button>)}</div>
            </div>
          </div>
          <button className="pillBtn primary big" onClick={() => setStep(4)}>
            Videre <Icon name="arrowRight" size={18} />
          </button>
          <button className="linkish center" onClick={() => setStep(4)}>Hopp over</button>
        </>
      )}

      {step === 4 && (
        <>
          <span className="kicker">STEG 4 AV 4</span>
          <h1>Hva ønsker dere fra Potesjarm?</h1>
          <p>Vi løfter fram det som betyr mest for dere først. Du kan endre dette når som helst.</p>
          <div className="onboardForm">
            <div className="field">
              <div className="goalList">
                {ownerGoals.map((g) => (
                  <button key={g.id} className={"goalItem" + (goals.includes(g.id) ? " active" : "")} onClick={() => toggle(goals, setGoals, g.id)}>
                    <span className="chIcon tint-blue"><Icon name={g.icon} size={18} /></span>
                    <b>{g.label}</b>
                    {goals.includes(g.id) && <Icon name="check" size={18} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="pillBtn primary big" onClick={() => setStep(5)}>
            Videre <Icon name="arrowRight" size={18} />
          </button>
          <button className="linkish center" onClick={() => setStep(5)}>Hopp over</button>
        </>
      )}

      {step === 5 && (
        <>
          <span className="chIcon huge tint-mint"><Icon name="paw" size={36} /></span>
          <span className="kicker">KLAR</span>
          <h1>{dog.dogName} er klar 🐾</h1>
          <p>
            {app.stats.dogs > 0
              ? <>Allerede {app.stats.dogs} {app.stats.dogs === 1 ? "hund" : "hunder"} i {kommune?.name}. Si hei!</>
              : <>Blant de første i {kommune?.name}. Lokalt innhold vokser med fellesskapet.</>}
          </p>
          <div className="onboardGrid">
            <span className="tint-blue"><i><Icon name="walk" size={20} /></i><b>Gå en tur</b><small>Start streaken</small></span>
            <span className="tint-mint"><i><Icon name="compass" size={20} /></i><b>Se turområder</b><small>I {kommune?.name}</small></span>
            <span className="tint-coral"><i><Icon name="live" size={20} /></i><b>Lag et treff</b><small>Finn turvenner</small></span>
            <span className="tint-sun"><i><Icon name="gift" size={20} /></i><b>Inviter noen</b><small>Bygg flokken</small></span>
          </div>
          <button className="pillBtn primary big" onClick={() => finish(true)}><Icon name="play" size={16} fill="currentColor" stroke={0} /> Start deres første tur</button>
          <button className="linkish center" onClick={() => finish(false)}>Utforsk appen først</button>
        </>
      )}
    </Layer>
  );
}

/* ========================= Stedsvelger ========================= */
function LocationForm({ value, onChange }) {
  const [q, setQ] = useState("");
  const searching = q.trim().length > 0;
  const results = useMemo(() => searchPlaces(q, 8), [q]);
  const kommune = kommuneById[value.kommuneId];
  const areas = omrader[value.kommuneId] || [];

  // Velger brukeren et treff, skal det ALDRI stå igjen sammen med et
  // tidligere valgt sted – det nye stedet erstatter det gamle fullstendig,
  // og søkefeltet tømmes med det samme slik at "valgt" og "søker" ikke
  // kan vises på én gang.
  const pick = (r) => {
    // Nytt sted erstatter det gamle fullstendig – også en tidligere delt
    // posisjon (lat/lng), som ikke lenger gir mening for en annen kommune.
    onChange({ kommuneId: r.kommune.id, omrade: r.omrade || null, radiusKm: value.radiusKm ?? 10 });
    setQ("");
  };

  const usingMyPos = typeof value.lat === "number";
  // "idle" | "locating" | "denied" | "error"
  const [posState, setPosState] = useState("idle");

  const useMyPos = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPosState("error");
      return;
    }
    setPosState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosState("idle");
        onChange({
          ...value,
          lat: roundCoord(pos.coords.latitude),
          lng: roundCoord(pos.coords.longitude),
          accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
          positionAt: Date.now(),
        });
      },
      (err) => setPosState(err.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    );
  };
  const clearMyPos = () => {
    const { lat, lng, accuracy, positionAt, ...rest } = value;
    setPosState("idle");
    onChange(rest);
  };

  return (
    <div className="locationForm">
      <div className="searchInput small">
        <Icon name="search" size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk etter kommune eller bydel…" autoFocus={!kommune} />
        {q && <button className="ghostIcon" onClick={() => setQ("")} aria-label="Tøm"><Icon name="x" size={16} /></button>}
      </div>

      {searching && (
        <div className="locResults">
          {results.length === 0 && <p className="muted">Fant ikke «{q}». Prøv kommunenavnet.</p>}
          {results.map((r, i) => (
            <button key={i} className="locResult" onClick={() => pick(r)}>
              <Icon name="pin" size={16} />
              <span><b>{r.omrade || r.kommune.name}</b><small>{r.omrade ? r.kommune.name : "Kommune"}</small></span>
            </button>
          ))}
        </div>
      )}

      {/* Vises kun når vi IKKE aktivt søker – aldri samtidig med treffliste,
          så det aldri kan se ut som to steder er valgt på én gang. */}
      {!searching && kommune && (
        <div className="locPicked">
          <span className="chIcon tint-mint"><Icon name="pin" size={16} /></span>
          <div><b>{placeLabel(value)}</b><small>{kommune.name} kommune</small></div>
          {value.omrade && <button className="ghostIcon" onClick={() => onChange({ ...value, omrade: null })} aria-label="Fjern bydel"><Icon name="x" size={16} /></button>}
        </div>
      )}
      {!searching && !kommune && (
        <div className="locPicked locEmpty">
          <span className="chIcon tint-muted"><Icon name="pin" size={16} /></span>
          <div><b>Ikke valgt ennå</b><small>Søk etter kommunen din over</small></div>
        </div>
      )}

      {kommune && areas.length > 0 && (
        <div className="field">
          <span>Område (valgfritt)</span>
          <div className="miniChips scroll">
            {areas.map((a) => (
              <button key={a} className={value.omrade === a ? "active" : ""} onClick={() => onChange({ ...value, omrade: value.omrade === a ? null : a })}>{a}</button>
            ))}
          </div>
        </div>
      )}

      {kommune && (
        <div className="field">
          <span>Vis innhold innenfor</span>
          <div className="miniChips">
            {radiusOptions.map((r) => (
              <button key={r.label} className={value.radiusKm === r.km ? "active" : ""} onClick={() => onChange({ ...value, radiusKm: r.km })}>{r.label}</button>
            ))}
          </div>
          <div className="locCenter">
            <small className="muted">
              {value.radiusKm == null
                ? "Viser alt i kommunen"
                : posState === "locating"
                  ? "Finner posisjon…"
                  : usingMyPos
                    ? <>Bruker omtrentlig posisjon{value.accuracy ? ` · ± ${value.accuracy} m` : ""}</>
                    : `Måles fra sentrum av ${kommune.name}`}
            </small>
            {usingMyPos ? (
              <button className="linkish" onClick={clearMyPos}>Bruk sentrum i stedet</button>
            ) : (
              <button className="linkish" onClick={useMyPos} disabled={posState === "locating"}>
                <Icon name="pin" size={13} /> {posState === "locating" ? "Finner…" : "Bruk min posisjon"}
              </button>
            )}
          </div>
          {posState === "denied" && (
            <p className="fineprint warn"><Icon name="alert" size={13} /> Posisjonstilgang ble ikke gitt. Vi bruker sentrum av {kommune.name}.</p>
          )}
          {posState === "error" && (
            <p className="fineprint warn"><Icon name="alert" size={13} /> Fikk ikke posisjonen din. Vi bruker sentrum av {kommune.name}.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LocationPicker({ onClose }) {
  const app = useApp();
  const [loc, setLoc] = useState(app.location);
  return (
    <Layer onClose={onClose} className="sheet" label="Velg sted">
      <LayerHead kicker="DITT OMRÅDE" title="Hvor vil du se hundeliv?" onClose={onClose} />
      <LocationForm value={loc} onChange={setLoc} />
      <p className="fineprint"><Icon name="shield" size={14} /> Hele Norge er støttet. Fellesskapet er størst der flest har blitt med.</p>
      <button className="pillBtn primary block big" onClick={() => { app.setLocation(loc); onClose(); }}>Lagre sted</button>
    </Layer>
  );
}

/* ========================= Komponere ========================= */
const WHEN = [
  { id: "Nå", startsIn: 0 },
  { id: "Om 30 min", startsIn: 30 },
  { id: "I kveld", startsIn: 240 },
  { id: "I morgen", startsIn: 1200 },
];

function MeetupComposer({ data, onClose }) {
  const app = useApp();
  const withDog = data?.with ? app.dogById(data.with) : null;
  const [type, setType] = useState("tur");
  const [title, setTitle] = useState(withDog ? `Tur med ${withDog.name}?` : "");
  const [when, setWhen] = useState("Nå");
  const [expiry, setExpiry] = useState("2t");
  const [place, setPlace] = useState(data?.place || app.places[0]?.name || "");
  const [max, setMax] = useState(6);
  const t = meetupTypes.find((x) => x.id === type);

  const submit = () => {
    const w = WHEN.find((x) => x.id === when);
    app.addMeetup({
      type,
      title: title.trim() || `${t.label} ved ${place || app.kommune?.name}`,
      when,
      startsIn: w.startsIn,
      expiry,
      place: place || app.kommune?.name,
      max,
      pace: "Rolig",
      note: "",
    });
    onClose();
    app.setTab("Nå skjer");
  };

  return (
    <Layer onClose={onClose} className="sheet composer" label="Lag treff">
      <LayerHead kicker="LAG TREFF" title="Hva har du lyst til?" onClose={onClose} />
      {withDog && <div className="inviteWith"><Avatar src={withDog.photo} name={withDog.name} size={34} /> Invitasjon sendes til {withDog.owner} & {withDog.name}</div>}

      <div className="typePicker">
        {meetupTypes.slice(0, 5).map((x) => (
          <button key={x.id} className={"tint-" + x.color + (type === x.id ? " active" : "")} onClick={() => setType(x.id)}>
            <span><Icon name={x.icon} size={22} /></span>
            {x.label}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Tittel</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`F.eks. ${t.label.toLowerCase()} ved ${app.places[0]?.name || "vannet"}`} autoFocus />
      </label>

      <div className="field">
        <span>Når</span>
        <div className="miniChips">{WHEN.map((w) => <button key={w.id} className={when === w.id ? "active" : ""} onClick={() => setWhen(w.id)}>{w.id}</button>)}</div>
      </div>

      <div className="fieldRow two">
        <label className="field">
          <span>Hvor</span>
          {app.places.length > 0 ? (
            <select value={place} onChange={(e) => setPlace(e.target.value)}>
              {app.places.map((p) => <option key={p.id}>{p.name}</option>)}
              <option value="">Annet sted…</option>
            </select>
          ) : (
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Møtested" />
          )}
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

      <div className="field">
        <span>Synlig i</span>
        <div className="miniChips">
          {expiryOptions.map((e) => <button key={e.id} className={expiry === e.id ? "active" : ""} onClick={() => setExpiry(e.id)}>{e.label}</button>)}
        </div>
      </div>

      <p className="fineprint"><Icon name="shield" size={14} /> Møt alltid på et offentlig sted. Treffet forsvinner av seg selv når tiden er ute.</p>
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
        <DogAvatar me size={42} />
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`Fortell om turen med ${app.me.dogName || "hunden din"}…`} autoFocus />
      </div>
      <div className="miniChips">
        <button className={place ? "active" : ""} onClick={() => setPlace(place ? "" : app.places[0]?.name || app.kommune?.name)}>
          <Icon name="pin" size={14} /> {place || "Legg til sted"}
        </button>
        <button onClick={() => app.flash("Bildeopplasting kommer med innlogging", "camera")}><Icon name="camera" size={14} /> Bilde</button>
      </div>
      <button className="pillBtn primary block big" disabled={!text.trim()} onClick={() => { app.addPost(text.trim(), place); onClose(); app.setTab("For deg"); }}>
        Publiser
      </button>
    </Layer>
  );
}

function EventComposer({ onClose }) {
  const app = useApp();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Tur");
  const [date, setDate] = useState(() => new Date(Date.now() + 864e5 * 7).toISOString().slice(0, 10));
  const [time, setTime] = useState("12:00");
  const [place, setPlace] = useState(app.places[0]?.name || "");
  const submit = () => {
    if (!title.trim()) return;
    const d = new Date(date + "T12:00");
    app.addEvent({
      title: title.trim(), tag, time, place: place || app.kommune?.name,
      day: String(d.getDate()),
      month: d.toLocaleDateString("nb-NO", { month: "short" }).replace(".", ""),
      weekday: d.toLocaleDateString("nb-NO", { weekday: "short" }).replace(".", "").replace(/^./, (c) => c.toUpperCase()),
      about: "",
    });
    onClose();
  };
  return (
    <Layer onClose={onClose} className="sheet composer" label="Nytt arrangement">
      <LayerHead kicker="NYTT ARRANGEMENT" title="Samle hundefolk" onClose={onClose} />
      <label className="field"><span>Navn</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="F.eks. søndagstur for alle" autoFocus /></label>
      <div className="field"><span>Type</span><div className="miniChips">{["Tur", "Valp", "Fjell", "Sosialt"].map((t) => <button key={t} className={tag === t ? "active" : ""} onClick={() => setTag(t)}>{t}</button>)}</div></div>
      <div className="fieldRow three">
        <label className="field"><span>Dato</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="field"><span>Tid</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="field">
          <span>Sted</span>
          {app.places.length > 0
            ? <select value={place} onChange={(e) => setPlace(e.target.value)}>{app.places.map((p) => <option key={p.id}>{p.name}</option>)}</select>
            : <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Møtested" />}
        </label>
      </div>
      <button className="pillBtn primary block big" disabled={!title.trim()} onClick={submit}><Icon name="calendar" size={18} /> Publiser</button>
    </Layer>
  );
}

/* ========================= Detaljer ========================= */
function MeetupDetail({ data: id, onClose }) {
  const app = useApp();
  const m = app.meetups.find((x) => x.id === id);
  if (!m) return null;
  const t = meetupTypes.find((x) => x.id === m.type) || meetupTypes[0];
  const host = m.host === "self" ? null : app.dogById(m.host);
  const isGoing = !!app.going[m.id];
  const people = isGoing && !m.going.includes("self") ? [...m.going, "self"] : m.going;

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
          <span><Icon name="pin" size={17} /><b>{m.place}</b><small>Møtested</small></span>
          <span><Icon name="bolt" size={17} /><b>{m.pace}</b><small>Tempo</small></span>
          <span><Icon name="users" size={17} /><b>{people.length} av {m.max}</b><small>hunder</small></span>
        </div>
        {m.note && <p className="detailText">{m.note}</p>}

        <h4>Vert</h4>
        <button className="memberRow hostRow" onClick={() => m.host !== "self" && app.open("dog", m.host)}>
          <DogAvatar id={m.host} me={m.host === "self"} size={42} />
          <span><b>{m.host === "self" ? "Deg" : `${host?.owner} & ${host?.name}`}</b><small>{m.host === "self" ? "Du er vert" : host?.breed}</small></span>
          <span className="hostBadge">Vert</span>
          {m.host !== "self" && <Icon name="chevronRight" size={18} />}
        </button>

        <h4>Hvem kommer</h4>
        <div className="whoGoing">
          {people.map((pid) => (
            <span key={pid}>
              <DogAvatar id={pid} me={pid === "self"} size={48} />
              <small>{pid === "self" ? app.me.dogName || "Deg" : app.dogById(pid)?.name}</small>
            </span>
          ))}
          {Array.from({ length: Math.max(0, Math.min(3, m.max - people.length)) }).map((_, i) => (
            <span key={"e" + i} className="openSpot"><i><Icon name="plus" size={18} /></i><small>Ledig</small></span>
          ))}
        </div>

        {/* Treff-chat er åpen for verten og alle som er med. */}
        {(isGoing || m.mine) && (
          <>
            <h4>Treff-chat</h4>
            <button className="rowBtn" onClick={() => { app.close("meetup"); app.open("meetupChat", m.id); }}>
              <Icon name="comment" size={18} /> Åpne chatten for treffet <Icon name="chevronRight" size={17} />
            </button>
          </>
        )}

        {/* Etter at treffet har startet: spør om det ble noe av. Ingen poter for
            svaret lokalt – ekte fullføring krever bekreftelse fra flere via backend. */}
        {(isGoing || m.mine) && m.startsIn <= 0 && !app.meetupConfirms[m.id] && (
          <div className="afterMeetup">
            <b>Ble turen noe av?</b>
            <div className="afterMeetupBtns">
              <button className="pillBtn soft" onClick={() => app.confirmMeetup(m.id, true)}>Ja</button>
              <button className="pillBtn soft" onClick={() => app.confirmMeetup(m.id, false)}>Nei</button>
            </div>
          </div>
        )}
        {app.meetupConfirms[m.id] === "yes" && <p className="fineprint"><Icon name="check" size={14} /> Notert – dere var ute sammen.</p>}

        <p className="fineprint"><Icon name="shield" size={14} /> Møt på et offentlig sted. Del aldri hjemmeadressen din i et treff.</p>
      </div>
      <div className="detailFoot">
        {m.mine ? (
          <button className="pillBtn danger soft" onClick={() => { app.cancelMeetup(m.id); onClose(); }}>
            <Icon name="x" size={16} /> Avlys treffet
          </button>
        ) : (
          <>
            <button className="pillBtn soft" onClick={() => { app.close("meetup"); app.open("chat", m.host); }}>
              <Icon name="comment" size={17} /> Skriv til verten
            </button>
            <button className={"pillBtn " + (isGoing ? "done" : "primary")} onClick={() => app.toggleGoing(m.id)}>
              {isGoing ? <><Icon name="check" size={16} stroke={2.6} /> Du er med</> : "Bli med"}
            </button>
          </>
        )}
      </div>
    </Layer>
  );
}

/** Gruppechat for et treff – alle som er med kan skrive. Ingen fake meldinger. */
function MeetupChat({ data: id, onClose }) {
  const app = useApp();
  const m = app.meetups.find((x) => x.id === id);
  const [text, setText] = useState("");
  const end = useRef();
  const convId = "meetup:" + id;
  const list = app.messages[convId] || [];
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [list.length]);
  if (!m) return null;
  const people = app.going[m.id] && !m.going.includes("self") ? [...m.going, "self"] : m.going;
  return (
    <Layer onClose={onClose} className="chatBox" label="Treff-chat">
      <div className="chatHead">
        <button className="ghostIcon" onClick={onClose} aria-label="Tilbake"><Icon name="chevronLeft" size={22} /></button>
        <span className="chIcon tint-coral"><Icon name="live" size={18} /></span>
        <span><b>{m.title}</b><small>{people.length} {people.length === 1 ? "deltaker" : "deltakere"}</small></span>
      </div>
      <div className="chatBody">
        {list.length === 0 && <p className="muted center">Start samtalen. Alle som er med på treffet ser den.</p>}
        {list.map((msg, i) => <div key={i} className={"bubble " + (msg.me ? "mine" : "theirs")}>{msg.t}</div>)}
        <span ref={end} />
      </div>
      <form className="inputRow" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; app.sendMessage(convId, text.trim()); setText(""); }}>
        <DogAvatar me size={34} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv en melding…" autoFocus />
        <button className="sendBtn" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
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
      <div className="detailCover" style={e.photo ? { backgroundImage: `url(${img(e.photo, 900, 560)})` } : undefined}>
        <CloseBtn onClick={onClose} light />
        <span className="dateChip big"><b>{e.day}</b><small>{e.month}</small></span>
      </div>
      <div className="detailBody">
        <span className="kicker">{e.tag?.toUpperCase()}{e.host ? ` · ${e.host.toUpperCase()}` : ""}</span>
        <h2>{e.title}</h2>
        <div className="facts">
          <span><Icon name="calendar" size={17} /><b>{e.weekday} {e.day}. {e.month}</b><small>kl. {e.time}</small></span>
          <span><Icon name="pin" size={17} /><b>{e.place}</b><small>{app.kommune?.name}</small></span>
          <span><Icon name="users" size={17} /><b>{e.going + (on && !e.mine ? 1 : 0)}</b><small>påmeldt</small></span>
        </div>
        {e.about && <p className="detailText">{e.about}</p>}
        {e.program?.length > 0 && (
          <>
            <h4>Program</h4>
            <ol className="timeline">{e.program.map(([t, what]) => <li key={t}><b>{t}</b><span>{what}</span></li>)}</ol>
          </>
        )}
        <h4>Hvem kommer</h4>
        <div className="whoGoing">
          {(e.faces || []).map((fid) => <span key={fid}><DogAvatar id={fid} size={48} /><small>{app.dogById(fid)?.name}</small></span>)}
          {on && <span><DogAvatar me size={48} ring="mint" /><small>Dere</small></span>}
          {!on && (e.faces || []).length === 0 && <p className="muted">Ingen påmeldte ennå – bli den første.</p>}
        </div>
      </div>
      <div className="detailFoot">
        <button className="pillBtn soft" onClick={() => app.shareLink(`/arrangement/${e.id}`, "Lenke til arrangementet er kopiert")}><Icon name="share" size={17} /> Del</button>
        <button className={"pillBtn " + (on ? "done" : "primary")} onClick={() => app.toggleEvent(e.id)}>
          {on ? <><Icon name="check" size={16} stroke={2.6} /> Påmeldt</> : "Meld på"}
        </button>
      </div>
    </Layer>
  );
}

function PlaceDetail({ data: id, onClose }) {
  const app = useApp();
  const p = app.places.find((x) => x.id === id);
  if (!p) return null;
  const t = placeTypes[p.type] || placeTypes.tursti;
  const verified = !!app.verifiedPlaces[p.id];
  return (
    <Layer onClose={onClose} className="sheet" label={p.name}>
      <LayerHead kicker={t.label.toUpperCase()} title={p.name} onClose={onClose} />
      <p className="detailText">{p.about}</p>
      <SourceTag />
      <div className="facts">
        <span><Icon name="pin" size={17} /><b>{app.kommune?.name}</b><small>Kommune</small></span>
        <span><Icon name={t.icon} size={17} /><b>{t.label}</b><small>Type</small></span>
        <span><Icon name="verified" size={17} /><b>{verified || p.verified ? "Bekreftet" : "Ikke bekreftet"}</b><small>Av hundeeiere</small></span>
      </div>
      <p className="fineprint"><Icon name="info" size={14} /> Sjekk alltid skilting på stedet. Reglene varierer mellom kommuner og årstider.</p>
      <div className="fieldRow two">
        <button className="pillBtn soft" onClick={() => app.togglePlace(p.id)}>
          <Icon name="star" size={16} fill={app.savedPlaces[p.id] ? "currentColor" : "none"} /> {app.savedPlaces[p.id] ? "Lagret" : "Lagre"}
        </button>
        <button className="pillBtn primary" onClick={() => { onClose(); app.open("meetupComposer", { place: p.name }); }}>
          <Icon name="plus" size={16} stroke={2.6} /> Lag treff her
        </button>
      </div>
    </Layer>
  );
}

// Energinivå-etikett (min profil) → tall (1–5), for å sammenligne med hundens.
const ENERGY_NUM = { "Rolig": 2, "Middels": 3, "Høy": 4, "Veldig høy": 5 };

/**
 * Ekte, forklarbare fellestrekk mellom brukeren og en hund – ikke en
 * oppdiktet «92 % match». Vi viser bare det vi faktisk kan utlede fra data
 * begge har fylt ut. Har vi ikke nok, sier vi det.
 */
function commonalities(me, d) {
  const out = [];
  const myPlay = me.play || [];
  const shared = (d.play || []).filter((p) => myPlay.includes(p));
  shared.slice(0, 2).forEach((p) => out.push(`Begge liker ${p.toLowerCase()}`));
  const myEnergy = ENERGY_NUM[me.energy];
  if (myEnergy && d.energy && Math.abs(myEnergy - d.energy) <= 1) out.push("Likt energinivå");
  if (me.size && d.size && me.size === d.size) out.push(`Samme størrelse (${d.size.toLowerCase()})`);
  out.push("I samme område");
  return out;
}

function DogProfile({ data: id, onClose }) {
  const app = useApp();
  const d = app.dogById(id);
  if (!d) return null;
  const rel = app.relationTo(d.id);
  const common = commonalities(app.me, d);
  const headline = common.length >= 3 ? "God turmatch" : common.length === 2 ? "Noe til felles" : "Ny å bli kjent med";
  const [showAll, setShowAll] = useState(false);
  const shownCommon = showAll ? common : common.slice(0, 3);
  return (
    <Layer onClose={onClose} className="dogProfile" label={d.name}>
      <div className="dogHero">
        <Img id={d.photo} w={900} h={700} className="dogHeroImg" brand fallbackLabel={d.name?.charAt(0)} />
        <CloseBtn onClick={onClose} light />
        <div className="dogHeroText">
          <h2>{d.name} {d.online && <span className="onlinePill"><i /> Ute nå</span>}</h2>
          <p>{d.breed} · {d.age} · eier: {d.owner}</p>
        </div>
      </div>
      <div className="dogProfileBody">
        {/* Forklarbare fellestrekk i stedet for en oppdiktet matchprosent. */}
        <div className="matchWhy">
          <div className="matchWhyHead">
            <span className="chIcon tint-mint"><Icon name="paw" size={18} /></span>
            <div><b>{headline}</b><small>{common.length} til felles med {app.me.dogName || "hunden din"}</small></div>
          </div>
          <ul className="matchList">
            {shownCommon.map((c) => <li key={c}><Icon name="check" size={15} /> {c}</li>)}
          </ul>
          {common.length > 3 && (
            <button className="linkish" onClick={() => setShowAll(!showAll)}>{showAll ? "Vis mindre" : `Se alle ${common.length}`}</button>
          )}
        </div>
        <div className="dogFacts">
          <span><small>Energi</small><Meter value={d.energy} /></span>
          <span><small>Størrelse</small><b>{d.size}</b></span>
          <span><small>Streak</small><b><Icon name="flame" size={15} /> {d.streak} d</b></span>
        </div>
        {d.play?.length > 0 && (
          <>
            <h4>Liker</h4>
            <div className="tags">{d.play.map((p) => <small key={p}>{p}</small>)}</div>
          </>
        )}
      </div>
      <div className="detailFoot dogFoot">
        <button className={"iconAction" + (rel.following ? " on" : "")} onClick={() => app.toggleFollow(d.id)}>
          <Icon name="heart" size={18} fill={rel.following ? "currentColor" : "none"} /> {rel.following ? "Følger" : "Følg"}
        </button>
        {rel.friend ? (
          <button className="iconAction on"><Icon name="check" size={18} /> Hundevenn</button>
        ) : rel.requested ? (
          <button className="iconAction" onClick={() => app.cancelFriend(d.id)}><Icon name="clock" size={18} /> Sendt</button>
        ) : (
          <button className="iconAction" onClick={() => app.requestFriend(d.id)}><Icon name="userPlus" size={18} /> Hundevenn</button>
        )}
        <button className="iconAction" onClick={() => { onClose(); app.open("chat", d.id); }}><Icon name="comment" size={18} /> Melding</button>
        <button className="pillBtn primary" onClick={() => { onClose(); app.open("meetupComposer", { with: d.id }); }}><Icon name="walk" size={17} /> Foreslå tur</button>
      </div>
    </Layer>
  );
}

/* ========================= Historier ========================= */
function StoryViewer({ data: start, onClose }) {
  const app = useApp();
  const stories = app.stories;
  const [i, setI] = useState(start || 0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const s = stories[i];
  const d = app.dogById(s?.dogId);

  useEffect(() => {
    if (paused || !s) return;
    const t = setTimeout(() => (i < stories.length - 1 ? setI(i + 1) : closeRef.current()), 5000);
    return () => clearTimeout(t);
  }, [i, paused, s, stories.length]);

  if (!s || !d) return null;
  return (
    <Layer kind="story" onClose={onClose} className="storyBox" label="Historie">
      <div className="storyBars">
        {stories.map((_, k) => <span key={k}><i className={k < i ? "full" : k === i ? (paused ? "run paused" : "run") : ""} key={k === i ? "r" + i : k} /></span>)}
      </div>
      <div className="storyHead">
        <Avatar src={d.photo} name={d.name} size={36} />
        <span><b>{d.name}</b><small>{d.owner}</small></span>
        <button className="ghostIcon light" onClick={() => setPaused(!paused)} aria-label="Pause"><Icon name={paused ? "play" : "pause"} size={18} /></button>
        <CloseBtn onClick={onClose} light />
      </div>
      <img className="storyImg" src={img(s.photo, 800, 1300)} alt="" />
      <button className="storyNav prev" onClick={() => i > 0 && setI(i - 1)} aria-label="Forrige" />
      <button className="storyNav next" onClick={() => (i < stories.length - 1 ? setI(i + 1) : onClose())} aria-label="Neste" />
      <p className="storyCaption hand">{s.caption}</p>
      <form className="storyReply" onSubmit={(e) => { e.preventDefault(); if (!reply.trim()) return; app.flash(`Svar sendt til ${d.owner}`, "send"); setReply(""); }}>
        <input value={reply} onChange={(e) => setReply(e.target.value)} onFocus={() => setPaused(true)} placeholder={`Svar ${d.owner}…`} />
        <button className="ghostIcon light" aria-label="Send"><Icon name="send" size={20} /></button>
      </form>
    </Layer>
  );
}

/* ========================= Sosialt ========================= */
function Comments({ data: post, onClose }) {
  const app = useApp();
  const [text, setText] = useState("");
  const list = (app.comments[post.id] || []).filter((c) => !app.blocked[c.name]);
  return (
    <Layer kind="drawer" onClose={onClose} className="commentsBox" label="Kommentarer">
      <LayerHead kicker={post.author.toUpperCase()} title="Kommentarer" onClose={onClose} />
      <div className="commentList">
        {list.length === 0 && <p className="muted">Ingen kommentarer ennå. Si hei!</p>}
        {list.map((c, i) => (
          <div className="comment" key={i}>
            <Avatar src={c.avatar} name={c.name} size={36} />
            <div><b>{c.name}</b><p>{c.text}</p></div>
          </div>
        ))}
      </div>
      <form className="inputRow" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; app.addComment(post.id, text.trim()); setText(""); }}>
        <DogAvatar me size={34} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv en kommentar…" autoFocus />
        <button className="sendBtn" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </Layer>
  );
}

function PostMenu({ data: post, onClose }) {
  const app = useApp();
  return (
    <Layer kind="sheet" onClose={onClose} className="actionSheet" label="Valg">
      <span className="sheetHandle" />
      <b className="sheetTitle">{post.author}</b>
      <button onClick={() => { app.toggleSave(post.id); onClose(); }}><Icon name="bookmark" size={19} /> {app.saved[post.id] ? "Fjern fra lagret" : "Lagre innlegg"}</button>
      <button onClick={() => { onClose(); app.hidePost(post.id); }}><Icon name="eyeOff" size={19} /> Ikke interessert</button>
      <button onClick={() => { onClose(); app.reportPost(post.id); }}><Icon name="flag" size={19} /> Rapporter innlegg</button>
      <button className="danger" onClick={() => { onClose(); app.blockAuthor(post.author); }}><Icon name="ban" size={19} /> Blokker {post.author}</button>
      <button className="cancel" onClick={onClose}>Avbryt</button>
    </Layer>
  );
}

function Search({ onClose }) {
  const app = useApp();
  const [q, setQ] = useState("");
  const n = q.trim().toLowerCase();
  const hit = (s) => !n || (s || "").toLowerCase().includes(n);
  const rDogs = app.dogs.filter((d) => hit(d.name + d.breed + d.owner)).slice(0, 4);
  const rGroups = app.groups.filter((g) => hit(g.name)).slice(0, 3);
  const rPlaces = app.places.filter((p) => hit(p.name + p.type)).slice(0, 4);
  const rMeet = app.meetups.filter((m) => hit(m.title + m.place)).slice(0, 3);
  const none = !rDogs.length && !rGroups.length && !rPlaces.length && !rMeet.length;

  return (
    <Layer kind="top" onClose={onClose} className="searchBox" label="Søk">
      <div className="searchInput">
        <Icon name="search" size={20} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Søk i ${app.kommune?.name}…`} />
        <CloseBtn onClick={onClose} />
      </div>
      <div className="searchResults">
        {none && (
          <p className="muted">
            {q ? <>Ingen treff på «{q}» i {app.kommune?.name}.</> : <>Søk etter turområder, hunder, grupper eller treff i {app.kommune?.name}.</>}
          </p>
        )}
        {rPlaces.length > 0 && <h5>Turområder</h5>}
        {rPlaces.map((p) => (
          <button key={p.id} className="resultRow" onClick={() => { onClose(); app.open("place", p.id); }}>
            <span className="resultIcon"><Icon name={placeTypes[p.type]?.icon || "pin"} size={18} /></span>
            <span><b>{p.name}</b><small>{placeTypes[p.type]?.label}</small></span>
            <Icon name="chevronRight" size={17} />
          </button>
        ))}
        {rDogs.length > 0 && <h5>Hunder</h5>}
        {rDogs.map((d) => (
          <button key={d.id} className="resultRow" onClick={() => { onClose(); app.open("dog", d.id); }}>
            <Avatar src={d.photo} name={d.name} size={40} />
            <span><b>{d.name}</b><small>{d.breed}</small></span>
            <Icon name="chevronRight" size={17} />
          </button>
        ))}
        {rMeet.length > 0 && <h5>Nå skjer</h5>}
        {rMeet.map((m) => (
          <button key={m.id} className="resultRow" onClick={() => { onClose(); app.open("meetup", m.id); }}>
            <span className="resultIcon"><Icon name="live" size={18} /></span>
            <span><b>{m.title}</b><small>{m.when} · {m.place}</small></span>
            <Icon name="chevronRight" size={17} />
          </button>
        ))}
        {rGroups.length > 0 && <h5>Grupper</h5>}
        {rGroups.map((g) => (
          <button key={g.id} className="resultRow" onClick={() => app.openGroup(g.id)}>
            <Avatar src={g.photo} name={g.name} size={40} square />
            <span><b>{g.name}</b><small>{g.official ? "Offisiell gruppe" : `${fmtNum(g.members)} medlemmer`}</small></span>
            <Icon name="chevronRight" size={17} />
          </button>
        ))}
      </div>
    </Layer>
  );
}

function Notifications({ onClose }) {
  const app = useApp();
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Varsler">
      <LayerHead kicker="AKTIVITET" title="Varsler" onClose={onClose} />
      {app.notifications.length === 0 ? (
        <Empty icon="bell" title="Ingen varsler ennå" text="Du får beskjed når noen vil gå tur, svarer på et treff eller streaken din står i fare." />
      ) : (
        app.notifications.map((n) => (
          <button key={n.id} className="noteRow" onClick={() => n.dog && app.open("dog", n.dog)}>
            {n.dog ? <DogAvatar id={n.dog} size={44} /> : <span className={"noteIcon tint-" + n.color}><Icon name={n.icon} size={20} /></span>}
            <span><b>{n.text}</b><small>{n.meta}</small></span>
          </button>
        ))
      )}
    </Layer>
  );
}

function Inbox({ onClose }) {
  const app = useApp();
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Meldinger">
      <LayerHead kicker="MELDINGER" title="Innboks" onClose={onClose} />
      {app.conversations.length === 0 ? (
        <Empty
          icon="mail"
          title="Ingen samtaler ennå"
          text="Når du blir med på et treff eller sender melding til en hundeeier, havner samtalen her."
          cta="Se treff"
          onCta={() => { onClose(); app.setTab("Nå skjer"); }}
        />
      ) : (
        app.conversations.map((c) => {
          const d = app.dogById(c.dog);
          const last = (app.messages[c.id] || []).slice(-1)[0];
          return (
            <button key={c.id} className="noteRow" onClick={() => app.open("chat", c.id)}>
              <DogAvatar id={c.dog} size={48} online={d?.online} />
              <span><b>{d?.owner} & {d?.name}</b><small className="clip">{last?.me ? "Du: " : ""}{last?.t || c.preview}</small></span>
              {c.unread > 0 && <i className="countBadge">{c.unread}</i>}
            </button>
          );
        })
      )}
    </Layer>
  );
}

function Chat({ data: id, onClose }) {
  const app = useApp();
  const conv = app.conversations.find((x) => x.id === id);
  const dogId = conv ? conv.dog : id;
  const convId = conv ? conv.id : id;
  const d = app.dogById(dogId);
  const [text, setText] = useState("");
  const end = useRef();
  const list = app.messages[convId] || [];
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [list.length]);
  if (!d) return null;
  return (
    <Layer onClose={onClose} className="chatBox" label="Samtale">
      <div className="chatHead">
        <button className="ghostIcon" onClick={onClose} aria-label="Tilbake"><Icon name="chevronLeft" size={22} /></button>
        <Avatar src={d.photo} name={d.name} size={40} online={d.online} />
        <span><b>{d.owner} & {d.name}</b><small>{d.online ? "Ute på tur nå" : "Aktiv nylig"}</small></span>
        <button className="pillBtn small soft" onClick={() => { onClose(); app.open("meetupComposer", { with: d.id }); }}><Icon name="walk" size={15} /> Foreslå tur</button>
      </div>
      <div className="chatBody">
        {list.length === 0 && <p className="muted center">Si hei til {d.owner}.</p>}
        {list.map((m, i) => <div key={i} className={"bubble " + (m.me ? "mine" : "theirs")}>{m.t}</div>)}
        <span ref={end} />
      </div>
      <form className="inputRow" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; app.sendMessage(convId, text.trim()); setText(""); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv en melding…" autoFocus />
        <button className="sendBtn" aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
    </Layer>
  );
}

/* ========================= Meg ========================= */
function Profile({ onClose }) {
  const app = useApp();
  const me = app.me;
  const [edit, setEdit] = useState(!me.dogName);
  const [form, setForm] = useState({ dogName: me.dogName, ownerName: me.ownerName, breed: me.breed, age: me.age });

  return (
    <Layer kind="drawer" onClose={onClose} className="profileBox" label="Min profil">
      <div className="profileCover" style={{ backgroundImage: `url(${img(PHOTO.hills, 900, 400)})` }}><CloseBtn onClick={onClose} light /></div>
      <div className="profileTop">
        <DogAvatar me size={96} ring="mint" />
        {app.verified && <span className="verifiedTag"><Icon name="verified" size={15} /> Verifisert</span>}
      </div>
      <div className="detailBody">
        {edit ? (
          <div className="profileEdit">
            <div className="fieldRow two">
              <label className="field"><span>Hundens navn</span><input value={form.dogName} onChange={(e) => setForm({ ...form, dogName: e.target.value })} placeholder="Navn" /></label>
              <label className="field"><span>Ditt navn</span><input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder="Ditt navn" /></label>
            </div>
            <div className="fieldRow two">
              <label className="field"><span>Rase</span><input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></label>
              <label className="field"><span>Alder</span><input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
            </div>
          </div>
        ) : (
          <>
            <h2>{me.dogName}{me.ownerName ? <small> & {me.ownerName}</small> : null}</h2>
            <p className="muted">{[me.breed, me.age].filter(Boolean).join(" · ")}{me.breed || me.age ? " · " : ""}{placeLabel(app.location)}</p>
          </>
        )}

        {/* Alle tallene er brukerens egne. Nye brukere ser nuller. */}
        <div className="profileStats">
          <span><b>{me.streak}</b><small>streak</small></span>
          <span><b>{me.totalWalks}</b><small>turer</small></span>
          <span><b>{fmtKm(me.totalKm)}</b><small>km</small></span>
          <span><b>{fmtNum(me.paws)}</b><small>poter</small></span>
        </div>

        <div className="levelCard flat">
          <div><b>Nivå {app.level.level} · {app.level.name}</b><small>{app.level.next ? `${fmtNum(app.level.toNext)} poter til ${app.level.next.name}` : "Høyeste nivå"}</small></div>
          <Bar value={app.level.pct} tone="sun" />
        </div>

        <h4>Merker</h4>
        {app.badgeProgress.filter((b) => b.done).length === 0 ? (
          <p className="muted">Ingen merker ennå. Første tur gir «Første tur».</p>
        ) : (
          <div className="miniBadges">
            {app.badgeProgress.filter((b) => b.done).slice(0, 4).map((b) => (
              <span key={b.id} className={"tint-" + b.color}><i><Icon name={b.icon} size={20} /></i><small>{b.name}</small></span>
            ))}
          </div>
        )}

        <button className="rowBtn" onClick={() => app.open("recap")}><Icon name="sparkle" size={18} /> Ukesoppsummering <Icon name="chevronRight" size={17} /></button>
        <button className="rowBtn" onClick={() => app.open("premium")}><Icon name="star" size={18} /> Potesjarm+ <small>kommer senere</small> <Icon name="chevronRight" size={17} /></button>
      </div>
      <div className="detailFoot">
        <button className="pillBtn primary" onClick={() => { if (edit) { app.setProfile(form); app.flash("Profilen er oppdatert"); } setEdit(!edit); }}>
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

      <h5>Sted</h5>
      <button className="rowBtn" onClick={() => app.open("location")}>
        <Icon name="pin" size={18} /> {placeLabel(app.location)} <Icon name="chevronRight" size={17} />
      </button>

      <h5>Personvern</h5>
      <Toggle on={app.privacy} set={app.setPrivacy} title="Vis meg i nærområdet" sub={`Andre i ${app.kommune?.name} kan finne ${app.me.dogName || "hunden din"}.`} />
      <Toggle on={app.push} set={app.setPush} title="Varsler" sub="Treff, meldinger og streak." />
      <p className="fineprint"><Icon name="shield" size={14} /> Vi viser aldri nøyaktig posisjon eller hjemmeadresse – bare omtrentlig område.</p>

      <h5>Trygghet</h5>
      <button className="rowBtn" onClick={() => app.open("safety")}><Icon name="shield" size={18} /> Trygghet og nødprofil <Icon name="chevronRight" size={17} /></button>
      <button className="rowBtn" onClick={() => app.open("blocked")}>
        <Icon name="ban" size={18} /> Blokkerte profiler
        {Object.keys(app.blocked).length > 0 && <span className="rowCount">{Object.keys(app.blocked).length}</span>}
        <Icon name="chevronRight" size={17} />
      </button>

      <h5>Innhold</h5>
      <label className="toggleRow">
        <span><b>Vis demo-innhold</b><small>Oppdiktede hunder og innlegg i Stavanger, kun for å vise designet. Er av som standard.</small></span>
        <input type="checkbox" checked={app.mode === MODE.DEMO} onChange={(e) => app.setMode(e.target.checked ? MODE.DEMO : MODE.LIVE)} />
        <i className="switch" />
      </label>

      <h5>Konto</h5>
      <button className="rowBtn" onClick={() => app.open("invite")}><Icon name="gift" size={18} /> Inviter hundeeiere <Icon name="chevronRight" size={17} /></button>
      <button className="rowBtn danger" onClick={app.resetAll}><Icon name="logout" size={18} /> Nullstill appen <Icon name="chevronRight" size={17} /></button>
    </Layer>
  );
}

function More({ onClose }) {
  const app = useApp();
  const go = (fn) => { onClose(); fn(); };
  const sections = [
    ["Din hund", [
      ["Min profil", "paw", () => app.open("profile")],
      ["Aktivitet", "flame", () => app.setTab("Aktivitet")],
      ["Merker", "trophy", () => app.open("profile")],
    ]],
    ["Utforsk", [
      ["Hunder", "dog", () => app.setTab("Hunder")],
      ["Kart", "pin", () => app.setTab("Kart")],
      ["Arrangementer", "calendar", () => app.setTab("Arrangementer")],
      ["Turområder", "compass", () => app.setTab("Utforsk")],
    ]],
    ["Konto", [
      ["Meldinger", "mail", () => app.open("inbox")],
      ["Varsler", "bell", () => app.open("notifications")],
      ["Innstillinger", "settings", () => app.open("settings")],
      ["Trygghet", "shield", () => app.open("safety")],
    ]],
  ];
  return (
    <Layer kind="sheet" onClose={onClose} className="moreSheet" label="Mer">
      <span className="sheetHandle" />
      <div className="moreProfile" onClick={() => go(() => app.open("profile"))}>
        <DogAvatar me size={48} ring="mint" />
        <div><b>{app.me.dogName || "Hunden din"}</b><small>Nivå {app.level.level} · {app.level.name}</small></div>
        <Icon name="chevronRight" size={18} />
      </div>
      {sections.map(([title, items]) => (
        <div key={title} className="moreSection">
          <h5>{title}</h5>
          <div className="moreList">
            {items.map(([label, icon, fn]) => (
              <button key={label} className="moreRow" onClick={() => go(fn)}>
                <Icon name={icon} size={19} /> <span>{label}</span> <Icon name="chevronRight" size={16} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="pillBtn primary block" onClick={() => go(() => app.startWalk())}>
        <Icon name="play" size={14} fill="currentColor" stroke={0} /> Start tur
      </button>
    </Layer>
  );
}

function Invite({ onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="sheet" label="Inviter">
      <LayerHead kicker="BYGG FLOKKEN" title={`Få med hundeeiere i ${app.kommune?.name}`} onClose={onClose} />
      <p className="muted">
        Potesjarm blir bedre jo flere i nærområdet som er med. Treff, hundevenner og arrangementer krever at det faktisk finnes folk her.
      </p>
      <div className="inviteSlots">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < app.invitesActivated ? "on" : ""}>
            <Icon name={i < app.invitesActivated ? "check" : "userPlus"} size={22} />
          </span>
        ))}
      </div>
      {app.invitesSent > 0 && (
        <p className="muted small">
          {app.invitesSent} invitasjon{app.invitesSent === 1 ? "" : "er"} sendt · {app.invitesActivated} av 3 bekreftet
        </p>
      )}
      <div className="rewardBox">
        <span className="chIcon big tint-sun"><Icon name="star" size={22} /></span>
        <div>
          <b>Grunnlegger-merket</b>
          <small>
            Låses opp når tre venner faktisk har registrert seg, lagt til hund og gått sin første tur – ikke bare
            klikket på lenka. Vi kan foreløpig ikke bekrefte dette uten en server, så tellingen står på 0 her.
          </small>
        </div>
      </div>
      <button className="pillBtn primary block" onClick={app.invite}>
        <Icon name="send" size={18} /> Del invitasjon
      </button>
    </Layer>
  );
}

function Safety({ onClose }) {
  const app = useApp();
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Trygghet">
      <LayerHead kicker="TRYGGHET" title="Trygt sammen" onClose={onClose} />
      <div className="safetyStatus">
        <span className="chIcon big tint-mint"><Icon name="shield" size={22} /></span>
        <div>
          <b>Nødprofil</b>
          <small>Legg inn veterinær og nødkontakt før dere trenger det.</small>
          <Bar value={app.verified ? 60 : 20} tone="mint" />
        </div>
      </div>
      <button className="rowBtn" onClick={() => { app.setVerified(true); app.flash("Profilen er merket som verifisert", "verified"); }}>
        <Icon name="verified" size={18} /> {app.verified ? "Profilen er verifisert" : "Verifiser profilen"} <Icon name="chevronRight" size={17} />
      </button>
      <button className="rowBtn danger" onClick={() => app.open("lostDog")}><Icon name="alert" size={18} /> Meld hund savnet <Icon name="chevronRight" size={17} /></button>
      <h5>Trygge møter</h5>
      <p className="muted">Møt nye hundeeiere på offentlige steder. Del aldri hjemmeadresse i et treff, og avslutt møtet hvis noe føles feil.</p>
      <h5>Rapportering</h5>
      <p className="muted">Du kan blokkere eller rapportere profiler og innlegg fra menyene i appen.</p>
    </Layer>
  );
}

function Blocked({ onClose }) {
  const app = useApp();
  const list = Object.keys(app.blocked);
  return (
    <Layer kind="drawer" onClose={onClose} className="listDrawer" label="Blokkerte profiler">
      <LayerHead kicker="TRYGGHET" title="Blokkerte profiler" onClose={onClose} />
      {list.length === 0 ? (
        <Empty icon="ban" title="Ingen blokkerte profiler" text="Blokkerer du noen fra menyen på et innlegg, dukker de opp her." />
      ) : (
        <>
          <p className="muted">Du ser ikke innlegg fra disse profilene. Full blokkering på tvers av chat, grupper og søk kommer når kontoene er koblet til backend.</p>
          {list.map((author) => (
            <div key={author} className="rowBtn" style={{ cursor: "default" }}>
              <Icon name="ban" size={18} /> <span style={{ flex: 1 }}>{author}</span>
              <button className="linkish" onClick={() => app.unblockAuthor(author)}>Opphev</button>
            </div>
          ))}
        </>
      )}
    </Layer>
  );
}

function LostDog({ onClose }) {
  const app = useApp();
  const [text, setText] = useState("");
  return (
    <Layer onClose={onClose} className="sheet urgent" tone="urgent" label="Mistet hund">
      <LayerHead kicker="HASTEVARSEL" title="Mistet hund" onClose={onClose} />
      <p className="muted">
        Varselet går til hundeeiere i {app.kommune?.name}.
        {app.stats.dogs === 0 && " Akkurat nå er det ingen andre registrerte hundeeiere her – varselet blir liggende til noen blir med."}
      </p>
      <div className="lostWho">
        <DogAvatar me size={48} />
        <span><b>{app.me.dogName || "Hunden din"}</b><small>{[app.me.breed, app.me.age].filter(Boolean).join(" · ")}</small></span>
      </div>
      <label className="field">
        <span>Sist sett</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="F.eks. ved vannet kl. 14, blå sele, redd for fremmede…" />
      </label>
      <p className="fineprint"><Icon name="shield" size={14} /> Del aldri hjemmeadressen din i et offentlig varsel. Varselet utløper automatisk etter 48 timer.</p>
      <button className="pillBtn danger block big" onClick={() => { app.raiseLostDog(text); app.closeAll(); app.setTab("For deg"); app.flash("Hastevarsel er aktivert", "alert"); }}>
        <Icon name="alert" size={18} /> Send hastevarsel
      </button>
    </Layer>
  );
}

function Recap({ onClose }) {
  const app = useApp();
  const me = app.me;
  return (
    <Layer onClose={onClose} className="recap" label="Ukesoppsummering">
      <CloseBtn onClick={onClose} light />
      <span className="kicker light">POTESJARM · DENNE UKA</span>
      <DogAvatar me size={84} ring="mint" />
      <h2>{me.dogName || "Hunden din"}{me.ownerName ? ` + ${me.ownerName}` : ""}</h2>
      {me.weekWalks === 0 ? (
        <>
          <p className="hand">uka har ikke startet ennå ♡</p>
          <b className="recapBig">0<small> km</small></b>
          <p className="muted">Gå en tur, så fylles kortet opp.</p>
          <button className="pillBtn white" onClick={() => { onClose(); app.startWalk(); }}><Icon name="play" size={16} fill="currentColor" stroke={0} /> Start tur</button>
        </>
      ) : (
        <>
          <p className="hand">en uke ute sammen ♡</p>
          <b className="recapBig">{fmtKm(me.weekKm)}<small> km</small></b>
          <div className="recapStats">
            <span><b>{me.weekWalks}</b>turer</span>
            <span><b>{me.streak}</b>streak</span>
            <span><b>{fmtNum(me.paws)}</b>poter</span>
          </div>
          <button className="pillBtn white" onClick={() => app.shareLink(`/uke/${me.dogName || "hund"}`, "Lenke til ukekortet er kopiert")}><Icon name="share" size={17} /> Del ukekort</button>
        </>
      )}
    </Layer>
  );
}

function Premium({ onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="sheet" label="Potesjarm+">
      <LayerHead kicker="POTESJARM+" title="Kommer senere" onClose={onClose} />
      <p className="muted">Ingen betaling er koblet til, og vi prioriterer ikke dette før fellesskapet er i gang. Si fra hvis noe her hadde vært nyttig for deg.</p>
      <div className="premiumGrid">
        {[
          ["layers", "Dypere turstatistikk", "Historikk og trender"],
          ["trophy", "Sesongutfordringer", "Egne merker"],
          ["dog", "Flere hunder", "Én konto, hele flokken"],
          ["route", "Ruteplanlegging", "Lagre favoritter"],
        ].map(([i, t, s]) => (
          <span key={t}><Icon name={i} size={22} /><b>{t}</b><small>{s}</small></span>
        ))}
      </div>
      <button className="pillBtn primary block big" onClick={() => { onClose(); app.flash("Takk! Vi sier fra når det er klart", "star"); }}>Jeg er interessert</button>
    </Layer>
  );
}

/* ========================= Tur =========================
   Ekte GPS-status, ingen simulert bevegelse. Distansen kommer utelukkende
   fra app.walk.session.totalMeters, som bare øker når store.js har mottatt
   og godkjent et faktisk GPS-punkt (se app/lib/track.js). */
function WalkMode() {
  const app = useApp();
  const w = app.walk;
  const s = w.session;
  const mm = String(Math.floor(w.seconds / 60)).padStart(2, "0");
  const ss = String(w.seconds % 60).padStart(2, "0");
  const km = s.totalMeters / 1000;
  const pace = paceMinPerKm(s.totalMeters, w.seconds, app.gpsConfig);
  const paws = pawsForWalk(s.totalMeters);

  // Blokkerende feiltilstander: ingen tur-UI mens vi ikke kan spore i det hele tatt.
  if (s.status === "permission_denied" || s.status === "unsupported") {
    return (
      <div className="walkMode walkBlocked" role="dialog" aria-label="GPS utilgjengelig">
        <div className="walkTop">
          <span className="heroLive"><i /> TUR</span>
          <button className="closeBtn light" onClick={app.cancelWalk} aria-label="Avbryt"><Icon name="x" size={18} /></button>
        </div>
        <span className="chIcon huge tint-coral"><Icon name="alert" size={36} /></span>
        <h2>
          {s.status === "permission_denied" ? "Vi har ikke tilgang til posisjonen din" : "Nettleseren støtter ikke GPS-sporing"}
        </h2>
        <p>
          {s.status === "permission_denied"
            ? "Gi Potesjarm tilgang til posisjon i nettleserinnstillingene for å spore turen. Uten posisjon kan vi ikke måle ekte distanse."
            : "Prøv en annen nettleser eller enhet for å bruke turtracking."}
        </p>
        <div className="fieldRow two">
          {s.status === "permission_denied" && (
            <button className="pillBtn soft" onClick={app.retryGps}><Icon name="locate" size={16} /> Prøv igjen</button>
          )}
          <button className="pillBtn white" onClick={app.cancelWalk}><Icon name="x" size={16} /> Avbryt tur</button>
        </div>
      </div>
    );
  }

  const statusLine =
    s.status === "waiting_gps"
      ? s.lastRejection === "poor_accuracy"
        ? "Lav GPS-nøyaktighet – venter på bedre signal…"
        : "Venter på GPS…"
      : s.status === "signal_lost"
        ? "GPS-signal mistet – fortsetter når det er tilbake"
        : `${app.me.dogName || "Hunden din"} er på tur`;

  return (
    <div className="walkMode" role="dialog" aria-label="Tur pågår">
      <div className="walkTop">
        <span className="heroLive"><i /> TUR PÅGÅR</span>
        <button className="closeBtn light" onClick={app.cancelWalk} aria-label="Avbryt"><Icon name="x" size={18} /></button>
      </div>
      <div className="walkPulse"><DogAvatar me size={120} ring="mint" /></div>
      <b className="walkKm">{km.toFixed(2).replace(".", ",")}<small> km</small></b>
      <p className={"walkStatusLine" + (s.status === "waiting_gps" || s.status === "signal_lost" ? " waiting" : "")}>
        {mm}:{ss} · {statusLine}
      </p>
      {s.lastAccuracy != null && s.status !== "waiting_gps" && (
        <p className="walkAccuracy">GPS ±{Math.round(s.lastAccuracy)} m</p>
      )}
      <div className="walkStats">
        <span><b>{pace == null ? "–" : pace.toFixed(1)}</b><small>min/km</small></span>
        <span><b>+{paws}</b><small>poter</small></span>
        <span><b>{s.pointsAccepted}</b><small>GPS-punkter</small></span>
      </div>
      <button className="pillBtn white big" onClick={app.finishWalk}><Icon name="check" size={18} stroke={2.6} /> Avslutt tur</button>
    </div>
  );
}

function WalkSummary({ data: s, onClose }) {
  const app = useApp();
  return (
    <Layer onClose={onClose} className="celebrate" tone="brand" label="Tur fullført">
      <CloseBtn onClick={onClose} light />
      <span className="confetti" aria-hidden="true">{Array.from({ length: 14 }).map((_, i) => <i key={i} />)}</span>
      <span className="chIcon huge tint-coral"><Icon name={s.first ? "paw" : "flame"} size={36} /></span>
      <span className="kicker">TUR FULLFØRT</span>
      <h2>{s.first ? "Første tur i boks!" : `Streaken lever – ${s.streak} ${s.streak === 1 ? "dag" : "dager"}!`}</h2>
      <p className="muted">
        {s.first ? "Merket «Første tur» er låst opp. Nå begynner historien deres." : `${app.me.dogName || "Dere"} la enda en tur til historien.`}
      </p>
      <div className="summaryStats">
        <span><b>{s.km.toFixed(2).replace(".", ",")} km</b><small>distanse</small></span>
        <span><b>{s.seconds < 60 ? `${s.seconds} sek` : `${Math.floor(s.seconds / 60)} min`}</b><small>tid</small></span>
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
  onboarding: Onboarding,
  location: LocationPicker,
  meetupComposer: MeetupComposer,
  postComposer: PostComposer,
  eventComposer: EventComposer,
  meetup: MeetupDetail,
  meetupChat: MeetupChat,
  event: EventDetail,
  place: PlaceDetail,
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
  more: More,
  invite: Invite,
  safety: Safety,
  blocked: Blocked,
  lostDog: LostDog,
  recap: Recap,
  premium: Premium,
  walkSummary: WalkSummary,
};
