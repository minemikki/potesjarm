"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { badges, challenges, levelFor, PAWS } from "../lib/data";
import { defaultLocation, kommuneById } from "../lib/geo";
import { COLD_START, getContent, getStats, isEarlyArea, leaderboardUnlocked, MODE } from "../lib/content";
import { GPS_CONFIG, applyGpsSample, createWalkSession, isValidWalk, pawsForWalk } from "../lib/track";
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
  profile: { dogName: "", ownerName: "", breed: "", age: "", size: "", energy: "", play: [], photo: null },
  // Brukerens egen, faktiske aktivitet.
  walks: [],
  streak: 0,
  paws: 0,
  placesVisited: [],
  // Relasjoner og handlinger
  liked: {},
  saved: {},
  going: {},
  joinedGroups: {},
  followed: {},
  eventGoing: {},
  savedPlaces: {},
  verifiedPlaces: {},
  myMeetups: [],
  myPosts: [],
  myEvents: [],
  invitesActivated: 0,
  lostDogActive: false,
  verified: false,
  privacy: true,
  push: true,
};

const startOfWeek = (d = new Date()) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // mandag = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

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
      if (raw) setState({ ...EMPTY, ...raw, profile: { ...EMPTY.profile, ...(raw.profile || {}) } });
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
    return {
      ...content,
      meetups: [...mine(state.myMeetups), ...content.meetups],
      posts: [...mine(state.myPosts), ...content.posts],
      events: [...mine(state.myEvents), ...content.events],
    };
  }, [content, state.myMeetups, state.myPosts, state.myEvents, state.location.kommuneId]);

  const stats = useMemo(() => getStats(contentWithMine), [contentWithMine]);

  /** Brukerens egne tall. I demo-modus legger vi demo-historikk til grunn. */
  const me = useMemo(() => {
    const base = state.mode === MODE.DEMO ? demo.demoProfile : null;
    const walks = state.walks;
    const week = startOfWeek();
    const weekWalks = walks.filter((w) => new Date(w.at) >= week);
    const today = walks.filter((w) => sameDay(w.at, Date.now()));
    const sum = (list, k) => list.reduce((a, w) => a + (w[k] || 0), 0);

    return {
      dogName: state.profile.dogName || base?.dogName || "",
      ownerName: state.profile.ownerName || "",
      breed: state.profile.breed || base?.breed || "",
      age: state.profile.age || base?.age || "",
      photo: state.profile.photo || base?.photo || null,
      streak: state.streak + (base?.streak || 0),
      paws: state.paws + (base?.paws || 0),
      totalKm: +(sum(walks, "km") + (base?.totalKm || 0)).toFixed(1),
      totalWalks: walks.length + (base?.totalWalks || 0),
      weekKm: +(sum(weekWalks, "km") + (base?.weekKm || 0)).toFixed(1),
      weekWalks: weekWalks.length + (base?.weekWalks || 0),
      todayMinutes: Math.round(sum(today, "seconds") / 60),
      placesVisited: state.placesVisited.length,
      meetupsJoined: Object.values(state.going).filter(Boolean).length,
      founder: state.invitesActivated >= 3 ? 1 : 0,
      morningWalks: walks.filter((w) => new Date(w.at).getHours() < 9).length,
      nightWalks: walks.filter((w) => new Date(w.at).getHours() >= 21).length,
      rainWalks: 0,
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

  const awardPaws = (n) => setState((s) => ({ ...s, paws: s.paws + n }));

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
    toggleGoing: (id) => {
      const on = !state.going[id];
      toggleIn("going", id, "Du er med! Verten har fått beskjed", "Du er meldt av treffet", on ? "check" : "x");
      if (on) awardPaws(PAWS.meetupJoined);
    },
    toggleGroup: (id) => toggleIn("joinedGroups", id, "Velkommen i gruppa!", "Du har forlatt gruppa", "users"),
    toggleFollow: (id) => toggleIn("followed", id, "Du følger nå denne hunden", "Følger ikke lenger", "heart"),
    toggleEvent: (id) => toggleIn("eventGoing", id, "Du er påmeldt!", "Påmelding fjernet", "calendar"),
    togglePlace: (id) => toggleIn("savedPlaces", id, "Sted lagret", "Fjernet fra lagrede", "star"),
    verifyPlace: (id) => {
      if (state.verifiedPlaces[id]) return;
      setState((s) => ({ ...s, verifiedPlaces: { ...s.verifiedPlaces, [id]: true }, paws: s.paws + PAWS.verifyPlace }));
      flash(`Takk! +${PAWS.verifyPlace} poter for å bekrefte stedet`, "verified");
    },

    addComment: (postId, text) =>
      setComments((c) => ({ ...c, [postId]: [...(c[postId] || []), { name: `${me.ownerName || "Du"} & ${me.dogName}`, avatar: me.photo, text, mine: true }] })),
    sendMessage: (convId, text) => setMessages((m) => ({ ...m, [convId]: [...(m[convId] || []), { me: true, t: text }] })),

    addMeetup: (m) => {
      const id = "u" + Date.now();
      setState((s) => ({
        ...s,
        myMeetups: [{ ...m, id, kommuneId: s.location.kommuneId, host: "self", going: ["self"], max: m.max, mine: true }, ...s.myMeetups],
        going: { ...s.going, [id]: true },
        paws: s.paws + PAWS.meetupHosted,
      }));
      flash("Treffet er ute! Hundeeiere i nærheten får beskjed", "live");
      return id;
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
      const last = state.walks[0];
      const firstToday = !last || !sameDay(last.at, Date.now());
      const newStreak = firstToday ? state.streak + 1 : state.streak;

      setState((s) => ({
        ...s,
        walks: [{ at: Date.now(), km, seconds, meters: session.totalMeters, pointsAccepted: session.pointsAccepted }, ...s.walks],
        streak: newStreak,
        paws: s.paws + earned + (firstToday ? PAWS.streakDay : 0),
      }));
      setOverlays([{ type: "walkSummary", data: { km, seconds, paws: earned, streak: newStreak, first: state.walks.length === 0 } }]);
    },

    completeOnboarding: (data) => {
      patch({ ...data, onboarded: true });
      close("onboarding");
      flash("Velkommen til Potesjarm!", "paw");
    },
    setProfile: (p) => patch((s) => ({ profile: { ...s.profile, ...p } })),
    setVerified: (v) => patch({ verified: v }),
    setLostDogActive: (v) => patch({ lostDogActive: v }),
    setPrivacy: (v) => patch({ privacy: v }),
    setPush: (v) => patch({ push: v }),
    invite: () => {
      setState((s) => ({ ...s, invitesActivated: Math.min(3, s.invitesActivated + 1) }));
      flash("Invitasjon sendt. Poter kommer når vennen fullfører første tur", "send");
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
