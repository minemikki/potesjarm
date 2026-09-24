"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { badges, challenges, levelFor, PAWS } from "../lib/data";
import { defaultLocation, kommuneById } from "../lib/geo";
import { COLD_START, getContent, getStats, isEarlyArea, leaderboardUnlocked, MODE } from "../lib/content";
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

  useEffect(() => {
    if (!walk) return;
    const t = setInterval(() => setWalk((w) => (w ? { ...w, seconds: w.seconds + 1, km: w.km + 0.0023 } : w)), 1000);
    return () => clearInterval(t);
  }, [!!walk]);

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

    startWalk: () => { setOverlays([]); setWalk({ seconds: 0, km: 0, at: Date.now() }); },
    cancelWalk: () => setWalk(null),
    finishWalk: () => {
      if (!walk) return;
      const km = +Math.max(walk.km, 0.01).toFixed(2);
      const seconds = Math.max(walk.seconds, 1);
      const earned = Math.round(km * PAWS.perKm) + PAWS.walkCompleted;
      const last = state.walks[0];
      const continues = last && !sameDay(last.at, Date.now());
      const firstToday = !last || !sameDay(last.at, Date.now());
      const newStreak = firstToday ? state.streak + 1 : state.streak;

      setWalk(null);
      setState((s) => ({
        ...s,
        walks: [{ at: Date.now(), km, seconds }, ...s.walks],
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
    // meg
    me, level, challengeProgress, badgeProgress, dogById,
    ...actions,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
