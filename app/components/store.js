"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { badges, challenges, levelFor, PAWS } from "../lib/data";
import { defaultLocation, kommuneById, roundCoord } from "../lib/geo";
import { isLostDogLive } from "../lib/lostdog";
import { COLD_START, getContent, getStats, isEarlyArea, leaderboardUnlocked, MODE } from "../lib/content";
import { GPS_CONFIG, applyGpsSample, createWalkSession, isValidWalk, pawsForWalk } from "../lib/track";
import { isNewOsloDay, isSameOsloDay, isSameOsloWeek, nextStreak, osloDateKey, osloHour } from "../lib/time";
import { migrateState as migrateStateLib, pawsTotal, pushLedgerOnce } from "../lib/ledger";
import { cancelFriendRequest, relationStatus, sendFriendRequest, toggleFollow as toggleFollowLib } from "../lib/friends";
import * as demo from "../lib/demo";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const STORAGE_KEY = "potesjarm-v3";

/**
 * Alt som lagres for brukeren. Merk at ALLE tellere starter på null.
 * En ny bruker har ingen streak, ingen kilometer og ingen poter – og det
 * er nettopp det vi skal vise. Ingen falsk historikk.
 */
const EMPTY = {
  mode: MODE.LIVE,
  location: defaultLocation,
  onboarded: false,
  // Hundeprofilen fylles ut i onboarding.
  profile: { dogName: "", ownerName: "", breed: "", age: "", size: "", energy: "", play: [], comfort: [], goals: [], photo: null },
  // Brukerens egen, faktiske aktivitet.
  walks: [],
  streak: 0,
  // Poter har ÉN sannhet: en hovedbok av begrunnede transaksjoner (speiler
  // paw_ledger i supabase/schema.sql). Det finnes ingen `paws`-tall en
  // handling bare kan legge til – summen er alltid utledet fra `pawLedger`
  // i `me` under. Hver rad har en deterministisk id (reason+refId), som gjør
  // enhver belønning idempotent: samme bruker + samme handling + samme
  // objekt kan aldri gi mer enn én rad, uansett hvor mange ganger den
  // handlingen trigges (f.eks. meld deg av og på samme treff).
  pawLedger: [],
  placesVisited: [],
  // Relasjoner og handlinger
  liked: {},
  saved: {},
  going: {},
  joinedGroups: {},
  followed: {},
  // Hundevenn-graf: se app/lib/friends.js. friendReqOut = forespørsler jeg har
  // sendt (pending). friends = BEKREFTEDE venner – settes aldri av et klikk i
  // live-modus (krever at den andre godtar via backend), bare av demo-fixtures.
  friendReqOut: {},
  friends: {},
  eventGoing: {},
  savedPlaces: {},
  verifiedPlaces: {},
  // Blokkerte forfattere (visningsnavn -> true). Filtrerer feed og kommentarer.
  // Full kaskade til hunder/grupper/søk/chat krever en delt bruker-id fra
  // backend (samme person på tvers av flater); lokalt blokkerer vi på det
  // eneste identitetssignalet vi har i klienten – forfatternavnet.
  blocked: {},
  myMeetups: [],
  myPosts: [],
  myEvents: [],
  // Svar på «ble turen noe av?» per treff-id ("yes"/"no").
  meetupConfirms: {},
  // Reelle, lokale handlinger: brukeren har faktisk trykket "send".
  invitesSent: 0,
  // IKKE det samme som "aktivert". En invitasjon er bare aktivert når
  // vennen har registrert seg, lagt til hund OG fullført en gyldig tur –
  // noe klienten ikke kan vite eller late som uten en backend som bekrefter
  // det. Uten backend kan denne aldri bli mer enn 0, med vilje. Se invite().
  invitesActivated: 0,
  // Hastevarsel for mistet hund. lostDogSince gir varselet en levetid (se
  // app/lib/lostdog.js) slik at et gammelt varsel ikke blir stående som
  // aktivt etter at hunden er funnet. lostDogNote er «sist sett»-teksten
  // brukeren faktisk skrev; lostDogResolvedAt settes når de trykker «Funnet».
  lostDogActive: false,
  lostDogSince: null,
  lostDogNote: "",
  lostDogResolvedAt: null,
  verified: false,
  privacy: true,
  push: true,
};

/**
 * Leser lagret state fra en tidligere versjon av appen og retter den opp i
 * stedet for å late som den alltid var riktig:
 *  - et gammelt flatt `paws`-tall blir én forklart ledger-rad, ikke tapt
 *  - `invitesActivated` som ble satt av den gamle (feilaktige) invite()-koden
 *    – som aktiverte Founder-status ved rent klikk – nullstilles. Den
 *    proveniensen var aldri gyldig, og vi later ikke som den var det.
 */
function migrateState(raw) {
  return migrateStateLib(raw, EMPTY);
}

export function AppProvider({ children }) {
  const [state, setState] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTabState] = useState("For deg");
  const [groupId, setGroupId] = useState(null);
  const [comments, setComments] = useState({});
  const [messages, setMessages] = useState({});
  const [walk, setWalk] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const patch = useCallback((p) => setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) })), []);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (raw) setState(migrateState(raw));
      if (!raw?.onboarded) setOverlays([{ type: "onboarding" }]);
    } catch {
      setOverlays([{ type: "onboarding" }]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [hydrated, state]);

  // Demo-modus laster demo-samtaler slik at chatten har noe å vise.
  useEffect(() => {
    if (state.mode === MODE.DEMO) {
      setComments((c) => (Object.keys(c).length ? c : demo.initialComments));
      setMessages((m) => (Object.keys(m).length ? m : demo.initialMessages));
    }
  }, [state.mode]);

  /* --------------------------------------------------------------------
     Ekte GPS-turtracking (app/lib/track.js).

     Distanse kommer ALDRI fra en tidtaker. Den eneste tingen klokken styrer
     er `seconds` – rent visningsformål. Faktisk distanse legges bare til
     når navigator.geolocation.watchPosition gir oss et punkt som
     applyGpsSample() godkjenner (brukbar nøyaktighet, realistisk fart,
     faktisk bevegelse). Står brukeren stille, mister vi signal, eller
     nekter nettleseren posisjon, øker distansen med 0.
     -------------------------------------------------------------------- */
  const watchIdRef = useRef(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  const beginWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setWalk((w) => (w ? { ...w, session: { ...w.session, status: "unsupported" } } : w));
      return;
    }
    clearWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        setWalk((w) => (w ? { ...w, session: applyGpsSample(w.session, point) } : w));
      },
      (err) => {
        setWalk((w) => {
          if (!w) return w;
          const permissionDenied = err.code === 1; // GeolocationPositionError.PERMISSION_DENIED
          const status = permissionDenied ? "permission_denied" : w.session.pointsAccepted > 0 ? "signal_lost" : "waiting_gps";
          return { ...w, session: { ...w.session, status, lastRejection: permissionDenied ? "permission_denied" : "position_unavailable" } };
        });
      },
      GPS_CONFIG.WATCH_OPTIONS
    );
  }, [clearWatch]);

  // Klokken. Går uansett GPS-status – tid er ikke aktivitet.
  useEffect(() => {
    if (!walk) return;
    const t = setInterval(() => setWalk((w) => (w ? { ...w, seconds: w.seconds + 1 } : w)), 1000);
    return () => clearInterval(t);
  }, [!!walk]);

  // Rydd opp GPS-abonnementet hvis provideren skulle unmounte midt i en tur.
  useEffect(() => () => clearWatch(), [clearWatch]);

  /* --------------------------------------------------------------------
     Innhold og tellere – alt regnet ut, ingenting hardkodet.
     -------------------------------------------------------------------- */
  const content = useMemo(() => getContent(state.mode, state.location), [state.mode, state.location]);

  const contentWithMine = useMemo(() => {
    const own = state.location.kommuneId;
    const mine = (list) => list.filter((x) => !x.kommuneId || x.kommuneId === own);
    const notBlocked = (list) => list.filter((x) => !x.author || !state.blocked[x.author]);
    return {
      ...content,
      meetups: [...mine(state.myMeetups), ...content.meetups],
      // Blokkerte forfattere forsvinner faktisk fra feeden – ikke bare en toast.
      posts: notBlocked([...mine(state.myPosts), ...content.posts]),
      events: [...mine(state.myEvents), ...content.events],
    };
  }, [content, state.myMeetups, state.myPosts, state.myEvents, state.location.kommuneId, state.blocked]);

  const stats = useMemo(() => getStats(contentWithMine), [contentWithMine]);

  /** Brukerens egne tall. I demo-modus legger vi demo-historikk til grunn. */
  const me = useMemo(() => {
    const base = state.mode === MODE.DEMO ? demo.demoProfile : null;
    const walks = state.walks;
    const now = Date.now();
    const weekWalks = walks.filter((w) => isSameOsloWeek(w.at, now));
    const today = walks.filter((w) => isSameOsloDay(w.at, now));
    const sum = (list, k) => list.reduce((a, w) => a + (w[k] || 0), 0);
    // Poters eneste sannhet er hovedboken – se pushLedgerOnce/EMPTY.pawLedger.
    const pawLedgerTotal = pawsTotal(state.pawLedger);

    return {
      dogName: state.profile.dogName || base?.dogName || "",
      ownerName: state.profile.ownerName || "",
      breed: state.profile.breed || base?.breed || "",
      age: state.profile.age || base?.age || "",
      photo: state.profile.photo || base?.photo || null,
      // Profilattributter eksponeres slik at hundeprofilen kan regne ut ekte
      // fellestrekk (se commonalities() i Overlays.js) i stedet for en % match.
      size: state.profile.size || "",
      energy: state.profile.energy || "",
      play: state.profile.play || [],
      goals: state.profile.goals || [],
      streak: state.streak + (base?.streak || 0),
      paws: pawLedgerTotal + (base?.paws || 0),
      totalKm: +(sum(walks, "km") + (base?.totalKm || 0)).toFixed(1),
      totalWalks: walks.length + (base?.totalWalks || 0),
      weekKm: +(sum(weekWalks, "km") + (base?.weekKm || 0)).toFixed(1),
      weekWalks: weekWalks.length + (base?.weekWalks || 0),
      // AKTIV gangetid i dag, ikke veggklokketid – se movingSeconds i
      // app/lib/track.js. Uten dette kunne "gå i 20 minutter" vinnes ved å
      // stå stille i 19 minutter og gå 50 m på slutten av turen.
      todayMinutes: Math.round(sum(today, "movingSeconds") / 60),
      placesVisited: state.placesVisited.length,
      meetupsJoined: Object.values(state.going).filter(Boolean).length,
      // Kan aldri bli 1 uten en backend som faktisk bekrefter at en invitert
      // venn har fullført onboarding + første tur. Se invite()-kommentaren.
      founder: state.invitesActivated >= 3 ? 1 : 0,
      morningWalks: walks.filter((w) => osloHour(w.at) < 9).length,
      nightWalks: walks.filter((w) => osloHour(w.at) >= 21).length,
      newPlaces: state.placesVisited.length,
      isNew: walks.length === 0 && state.mode === MODE.LIVE,
    };
  }, [state, state.mode]);

  const level = useMemo(() => levelFor(me.paws), [me.paws]);

  /** Fremgang på utfordringer, regnet ut fra brukerens faktiske tall. */
  const challengeProgress = useMemo(
    () => challenges.map((c) => ({ ...c, progress: me[c.metric] || 0, done: (me[c.metric] || 0) >= c.target })),
    [me]
  );

  /** Merker. Ingenting er "oppnådd" uten at tallet faktisk er der. */
  const badgeProgress = useMemo(
    () =>
      badges.map((b) => {
        const v = me[b.metric] || 0;
        return { ...b, value: v, done: v >= b.target, pct: Math.min(100, (v / b.target) * 100) };
      }),
    [me]
  );

  /** Slår opp en hund i det innholdet som faktisk finnes. */
  const dogById = useCallback(
    (id) => {
      if (id === "self") return { id: "self", name: me.dogName, owner: me.ownerName, breed: me.breed, age: me.age, photo: me.photo };
      return contentWithMine.dogs.find((d) => d.id === id) || null;
    },
    [contentWithMine.dogs, me]
  );

  /* --------------------------------------------------------------------
     Handlinger
     -------------------------------------------------------------------- */
  const flash = useCallback((text, icon = "check") => {
    clearTimeout(toastTimer.current);
    setToast({ text, icon, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const open = useCallback((type, data) => setOverlays((o) => [...o.filter((x) => x.type !== type), { type, data }]), []);
  const close = useCallback((type) => setOverlays((o) => (type ? o.filter((x) => x.type !== type) : o.slice(0, -1))), []);
  const closeAll = useCallback(() => setOverlays([]), []);

  const setTab = useCallback((t) => {
    setTabState(t);
    setGroupId(null);
    setOverlays((o) => o.filter((x) => x.type === "onboarding"));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggleIn = (key, id, msgOn, msgOff, icon) =>
    setState((s) => {
      const on = !s[key][id];
      if (msgOn) flash(on ? msgOn : msgOff, icon);
      return { ...s, [key]: { ...s[key], [id]: on } };
    });

  const actions = {
    flash, open, close, closeAll, setTab,
    patch,
    setMode: (mode) => { patch({ mode }); flash(mode === MODE.DEMO ? "Demo-innhold er på" : "Viser ekte data", mode === MODE.DEMO ? "sparkle" : "check"); },
    setLocation: (location) => {
      patch({ location });
      const k = kommuneById[location.kommuneId];
      flash("Du følger nå " + (location.omrade || k?.name || ""), "pin");
    },
    openGroup: (id) => { setTabState("Grupper"); setGroupId(id); setOverlays([]); window.scrollTo({ top: 0 }); },
    closeGroup: () => setGroupId(null),

    toggleLike: (id) => toggleIn("liked", id),
    toggleSave: (id) => toggleIn("saved", id, "Lagret", "Fjernet fra lagret", "bookmark"),
    // INGEN poter for å melde seg på et treff. Å trykke «bli med» er et klikk,
    // ikke en gjennomført aktivitet – og en klikk-belønning kan farmes ved å
    // melde seg av og på. Poter for treff hører til en server-bekreftet
    // «gikk dere tur sammen?»-flyt (se PAWS-kommentaren i data.js). Å ha vært
    // med teller fortsatt ærlig mot sosiale merker via `going`-state, uten
    // valuta for selve klikket.
    toggleGoing: (id) => {
      let wasOn;
      setState((s) => {
        wasOn = !!s.going[id];
        return { ...s, going: { ...s.going, [id]: !wasOn } };
      });
      flash(wasOn ? "Du er meldt av treffet" : "Du er med! Verten har fått beskjed", wasOn ? "x" : "check");
    },
    toggleGroup: (id) => toggleIn("joinedGroups", id, "Velkommen i gruppa!", "Du har forlatt gruppa", "users"),
    // FØLGE (énveis) – ingen bekreftelse fra den andre trengs.
    toggleFollow: (id) => {
      let nowOn;
      setState((s) => {
        nowOn = !s.followed[id];
        return { ...s, followed: toggleFollowLib(s.followed, id) };
      });
      flash(nowOn ? "Du følger nå denne hunden" : "Følger ikke lenger", "heart");
    },
    // HUNDEVENN (toveis) – vi sender en forespørsel. Den blir aldri "venner"
    // lokalt; det krever at den andre eieren godtar via backend. Vi later
    // aldri som om den er godtatt.
    requestFriend: (id) => {
      setState((s) => sendFriendRequest(s, id));
      flash("Forespørsel sendt. Dere blir hundevenner når den andre godtar", "userPlus");
    },
    cancelFriend: (id) => {
      setState((s) => cancelFriendRequest(s, id));
      flash("Forespørsel trukket tilbake", "x");
    },
    toggleEvent: (id) => toggleIn("eventGoing", id, "Du er påmeldt!", "Påmelding fjernet", "calendar"),
    togglePlace: (id) => toggleIn("savedPlaces", id, "Sted lagret", "Fjernet fra lagrede", "star"),
    // Å bekrefte et sted er en førstehånds-påstand om et ekte, navngitt sted
    // brukeren kjenner – derfor teller det også som et besøkt/kjent sted
    // (placesVisited), som er signalet «Utforsker»-merket og «nye steder»-
    // utfordringen måles mot. Idempotent per sted: bekrefter du det samme
    // stedet igjen, skjer ingenting.
    verifyPlace: (id) => {
      let already;
      setState((s) => {
        already = !!s.verifiedPlaces[id];
        if (already) return s;
        let s2 = {
          ...s,
          verifiedPlaces: { ...s.verifiedPlaces, [id]: true },
          placesVisited: s.placesVisited.includes(id) ? s.placesVisited : [...s.placesVisited, id],
        };
        s2 = pushLedgerOnce(s2, "verify_place", id, PAWS.verifyPlace);
        return s2;
      });
      if (!already) flash(`Takk! +${PAWS.verifyPlace} poter for å bekrefte stedet`, "verified");
    },

    addComment: (postId, text) =>
      setComments((c) => ({ ...c, [postId]: [...(c[postId] || []), { name: `${me.ownerName || "Du"} & ${me.dogName}`, avatar: me.photo, text, mine: true }] })),
    sendMessage: (convId, text) => setMessages((m) => ({ ...m, [convId]: [...(m[convId] || []), { me: true, t: text }] })),

    // INGEN poter for å opprette et treff. Hvert treff har en unik id, så en
    // opprettelses-belønning kan aldri dedupliseres – den ville vært fritt
    // farmbar (lag treff, få poter, gjenta). Verdien av et treff er at det
    // faktisk skjer; den belønningen hører til en server-bekreftet
    // fullføringsflyt, ikke til selve opprettelsen.
    addMeetup: (m) => {
      const id = "u" + Date.now();
      setState((s) => ({
        ...s,
        myMeetups: [{ ...m, id, kommuneId: s.location.kommuneId, host: "self", going: ["self"], max: m.max, mine: true }, ...s.myMeetups],
        going: { ...s.going, [id]: true },
      }));
      flash("Treffet er ute! Hundeeiere i nærheten får beskjed", "live");
      return id;
    },
    // Vert avlyser sitt eget treff – ekte konsekvens: det fjernes fra lista.
    cancelMeetup: (id) => {
      setState((s) => {
        const going = { ...s.going };
        delete going[id];
        return { ...s, myMeetups: s.myMeetups.filter((x) => x.id !== id), going };
      });
      flash("Treffet er avlyst. Deltakere får beskjed", "x");
    },
    // Etter et treff: «Ble turen noe av?». Lagrer svaret. Ingen poter deles ut
    // her lokalt – en ekte fullføring (og eventuell belønning/hundevenn-forslag)
    // krever at flere parter bekrefter via backend.
    confirmMeetup: (id, happened) => {
      setState((s) => ({ ...s, meetupConfirms: { ...s.meetupConfirms, [id]: happened ? "yes" : "no" } }));
      flash(happened ? "Så fint! Takk for at dere var ute" : "Notert – kanskje neste gang", happened ? "heart" : "check");
    },
    addPost: (text, place) => {
      setState((s) => ({
        ...s,
        myPosts: [{ id: Date.now(), kommuneId: s.location.kommuneId, kind: "photo", author: `${me.ownerName || "Du"} & ${me.dogName}`, avatar: me.photo, time: "Nå", place: place || kommuneById[s.location.kommuneId]?.name, text, likes: 0, comments: 0, mine: true }, ...s.myPosts],
      }));
      flash("Publisert i fellesskapet", "check");
    },
    addEvent: (e) => {
      const id = "ue" + Date.now();
      setState((s) => ({
        ...s,
        myEvents: [{ ...e, id, kommuneId: s.location.kommuneId, going: 1, faces: [], host: `${me.ownerName || "Du"} & ${me.dogName}`, program: [[e.time, "Oppmøte"]], mine: true }, ...s.myEvents],
        eventGoing: { ...s.eventGoing, [id]: true },
      }));
      flash("Arrangementet er publisert", "calendar");
    },

    startWalk: () => {
      setOverlays([]);
      setWalk({ session: createWalkSession("waiting_gps"), seconds: 0, startedAt: Date.now() });
      beginWatch();
    },
    // Avbryter uten å lagre noe som helst – ingen delvis "fake" tur opprettes.
    cancelWalk: () => { clearWatch(); setWalk(null); },
    // Etter et nektet/tapt signal: prøv å be om posisjon på nytt.
    retryGps: () => { setWalk((w) => (w ? { ...w, session: { ...w.session, status: "waiting_gps" } } : w)); beginWatch(); },
    finishWalk: () => {
      if (!walk) return;
      clearWatch();
      const { session, seconds } = walk;
      const valid = isValidWalk(session);

      setWalk(null);

      if (!valid) {
        // Ingen ekte distanse (eller for kort) => ingen tur registreres.
        // Ingen streak, ingen poter, ingen badge- eller challenge-fremgang.
        flash(
          session.pointsAccepted === 0
            ? "Fikk ikke et brukbart GPS-signal. Gå ut i åpent terreng og prøv igjen."
            : `Turen var for kort til å telle (minst ${GPS_CONFIG.MIN_VALID_WALK_M} m kreves).`,
          "alert"
        );
        return;
      }

      const km = +(session.totalMeters / 1000).toFixed(2);
      const earned = pawsForWalk(session.totalMeters);
      const now = Date.now();
      const walkId = "w" + now;
      const last = state.walks[0];
      // Ekte, sammenhengende kalenderdager i Oslo-tid – mandag så fredag skal
      // ALDRI øke streaken fra 1 til 2, den skal falle tilbake til 1.
      const newStreak = nextStreak(last?.at ?? null, now, state.streak);
      const firstToday = isNewOsloDay(last?.at ?? null, now);
      const streakDayId = osloDateKey(now); // naturlig idempotent: maks én bonus per Oslo-kalenderdag

      setState((s) => {
        let s2 = {
          ...s,
          walks: [
            {
              at: now,
              km,
              seconds,
              movingSeconds: session.movingSeconds,
              meters: session.totalMeters,
              pointsAccepted: session.pointsAccepted,
              suspicious: session.suspicious,
            },
            ...s.walks,
          ],
          streak: newStreak,
        };
        s2 = pushLedgerOnce(s2, "walk", walkId, earned);
        if (firstToday) s2 = pushLedgerOnce(s2, "streak_day", streakDayId, PAWS.streakDay);
        return s2;
      });
      setOverlays([{ type: "walkSummary", data: { km, seconds, paws: earned, streak: newStreak, first: state.walks.length === 0 } }]);
    },

    completeOnboarding: (data) => {
      patch({ ...data, onboarded: true });
      close("onboarding");
      flash("Velkommen til Potesjarm!", "paw");
    },
    setProfile: (p) => patch((s) => ({ profile: { ...s.profile, ...p } })),
    setVerified: (v) => patch({ verified: v }),
    // Hastevarsel: lagrer «sist sett»-teksten og et starttidspunkt som gir
    // varselet en levetid (app/lib/lostdog.js). Et nytt varsel nullstiller
    // en tidligere «funnet»-markering.
    raiseLostDog: (note = "") =>
      patch({ lostDogActive: true, lostDogSince: Date.now(), lostDogNote: note.trim(), lostDogResolvedAt: null }),
    resolveLostDog: () => patch({ lostDogActive: false, lostDogResolvedAt: Date.now() }),
    // Bakoverkompatibel enkel bryter (brukes fortsatt noen steder i UI).
    setLostDogActive: (v) =>
      patch((s) => (v
        ? { lostDogActive: true, lostDogSince: s.lostDogSince || Date.now(), lostDogResolvedAt: null }
        : { lostDogActive: false, lostDogResolvedAt: Date.now() })),
    setPrivacy: (v) => patch({ privacy: v }),
    setPush: (v) => patch({ push: v }),
    blockAuthor: (author) => {
      if (!author) return;
      patch((s) => ({ blocked: { ...s.blocked, [author]: true } }));
      flash(`${author} er blokkert. Du ser ikke innleggene deres lenger`, "ban");
    },
    unblockAuthor: (author) => patch((s) => {
      const b = { ...s.blocked };
      delete b[author];
      return { blocked: b };
    }),
    // Deler brukerens EGEN, personvern-avrundede posisjon, som radiusen da
    // måles fra i stedet for kommunesentroiden. Opt-in, engangsavlesning –
    // vi abonnerer ikke på og lagrer aldri en rå posisjon. Se radiusCenter().
    useMyLocation: () => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        flash("Nettleseren støtter ikke posisjon", "alert");
        return;
      }
      flash("Finner posisjon…", "pin");
      const kName = kommuneById[state.location.kommuneId]?.name || "kommunen";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = roundCoord(pos.coords.latitude);
          const lng = roundCoord(pos.coords.longitude);
          const accuracy = pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null;
          patch((s) => ({ location: { ...s.location, lat, lng, accuracy, positionAt: Date.now() } }));
          flash(accuracy ? `Bruker omtrentlig posisjon · ± ${accuracy} m` : "Bruker omtrentlig posisjon", "check");
        },
        (err) => {
          flash(err.code === 1 ? `Posisjonstilgang ble ikke gitt. Vi bruker sentrum av ${kName}.` : `Fikk ikke posisjonen din. Vi bruker sentrum av ${kName}.`, "alert");
        },
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
      );
    },
    // Slår av bruk av egen posisjon – radius faller tilbake til kommunesenter.
    clearMyLocation: () =>
      patch((s) => {
        const { lat, lng, positionAt, ...rest } = s.location;
        return { location: rest };
      }),
    // Dette teller BARE at brukeren har sendt en invitasjon – ikke at den er
    // aktivert. `invitesActivated` (og Founder-status/poter) kan aldri settes
    // herfra: det krever en backend som bekrefter at vennen har registrert
    // seg, lagt til hund OG fullført en gyldig tur. Uten det ville et rent
    // knappetrykk kunne låse opp Founder-status.
    invite: () => {
      setState((s) => ({ ...s, invitesSent: s.invitesSent + 1 }));
      flash("Invitasjon sendt. Poter kommer når vennen fullfører sin første tur", "send");
    },
    resetAll: () => { try { localStorage.removeItem(STORAGE_KEY); } catch {} location.reload(); },
  };

  const value = {
    ...state,
    hydrated,
    tab, groupId, overlays, toast, walk, comments, messages,
    // innhold
    ...contentWithMine,
    content: contentWithMine,
    stats,
    kommune: kommuneById[state.location.kommuneId],
    // Relasjonsstatus (følge/hundevenn/blokkert) for en hund – se friends.js.
    relationTo: (id) => relationStatus(state, id),
    // Ærlig, utløpsbevisst status – UI skal lese denne, ikke rå lostDogActive.
    lostDogLive: isLostDogLive(state),
    usingMyPosition: typeof state.location.lat === "number",
    isDemo: content.demo,
    isEarly: isEarlyArea(stats),
    leaderboardUnlocked: leaderboardUnlocked(stats),
    coldStart: COLD_START,
    demoLeaderboard: demo.leaderboard,
    gpsConfig: GPS_CONFIG,
    // meg
    me, level, challengeProgress, badgeProgress, dogById,
    ...actions,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
