"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { events as seedEvents, feed as seedFeed, initialComments, initialMessages, meetups as seedMeetups, ME, PHOTO } from "../lib/data";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const STORAGE_KEY = "potesjarm-v2";
const PERSISTED = ["city", "liked", "saved", "going", "joinedGroups", "followed", "eventGoing", "savedPlaces", "savedRoutes", "lostDogActive", "verified", "profile", "privacy", "push", "streak", "weekKm", "paws", "myMeetups", "myPosts", "myEvents", "inviteCount"];

export function AppProvider({ children }) {
  const [tab, setTabState] = useState("For deg");
  const [groupId, setGroupId] = useState(null);
  const [city, setCity] = useState("Stavanger");
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});
  const [going, setGoing] = useState({ m1: false });
  const [joinedGroups, setJoinedGroups] = useState({ g2: true });
  const [followed, setFollowed] = useState({});
  const [eventGoing, setEventGoing] = useState({});
  const [savedPlaces, setSavedPlaces] = useState({});
  const [savedRoutes, setSavedRoutes] = useState({});
  const [lostDogActive, setLostDogActive] = useState(false);
  const [verified, setVerified] = useState(false);
  const [profile, setProfile] = useState({ name: ME.dog, bio: `${ME.breed} · ${ME.age}` });
  const [privacy, setPrivacy] = useState(true);
  const [push, setPush] = useState(true);
  const [streak, setStreak] = useState(18);
  const [weekKm, setWeekKm] = useState(18.6);
  const [paws, setPaws] = useState(2840);
  const [inviteCount, setInviteCount] = useState(1);
  const [myMeetups, setMyMeetups] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [comments, setComments] = useState(initialComments);
  const [messages, setMessages] = useState(initialMessages);
  const [walk, setWalk] = useState(null); // { seconds, km } mens tur pågår
  const [overlays, setOverlays] = useState([]);
  const [toast, setToast] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef();

  const setters = { city: setCity, liked: setLiked, saved: setSaved, going: setGoing, joinedGroups: setJoinedGroups, followed: setFollowed, eventGoing: setEventGoing, savedPlaces: setSavedPlaces, savedRoutes: setSavedRoutes, lostDogActive: setLostDogActive, verified: setVerified, profile: setProfile, privacy: setPrivacy, push: setPush, streak: setStreak, weekKm: setWeekKm, paws: setPaws, myMeetups: setMyMeetups, myPosts: setMyPosts, myEvents: setMyEvents, inviteCount: setInviteCount };
  const values = { city, liked, saved, going, joinedGroups, followed, eventGoing, savedPlaces, savedRoutes, lostDogActive, verified, profile, privacy, push, streak, weekKm, paws, myMeetups, myPosts, myEvents, inviteCount };

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      for (const k of PERSISTED) if (raw[k] !== undefined) setters[k](raw[k]);
      if (!localStorage.getItem("potesjarm-onboarded")) setOverlays([{ type: "onboarding" }]);
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const out = {};
      for (const k of PERSISTED) out[k] = values[k];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ...PERSISTED.map((k) => values[k])]);

  // Turmodus: simulert GPS-tikk.
  useEffect(() => {
    if (!walk) return;
    const t = setInterval(() => setWalk((w) => (w ? { seconds: w.seconds + 1, km: w.km + 0.0023 } : w)), 1000);
    return () => clearInterval(t);
  }, [!!walk]);

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

  const toggle = (setter, id) => setter((m) => ({ ...m, [id]: !m[id] }));

  const actions = {
    flash, open, close, closeAll, setTab,
    openGroup: (id) => { setTabState("Grupper"); setGroupId(id); setOverlays([]); window.scrollTo({ top: 0 }); },
    closeGroup: () => setGroupId(null),
    setCity: (c) => { setCity(c); flash("Byttet til " + c, "pin"); },
    toggleLike: (id) => toggle(setLiked, id),
    toggleSave: (id) => { flash(saved[id] ? "Fjernet fra lagret" : "Lagret", "bookmark"); toggle(setSaved, id); },
    toggleGoing: (id) => { flash(going[id] ? "Du er meldt av treffet" : "Du er med! Verten har fått beskjed", going[id] ? "x" : "check"); toggle(setGoing, id); },
    toggleGroup: (id) => { flash(joinedGroups[id] ? "Du har forlatt gruppa" : "Velkommen i gruppa!", joinedGroups[id] ? "x" : "users"); toggle(setJoinedGroups, id); },
    toggleFollow: (id) => { flash(followed[id] ? "Følger ikke lenger" : "Du følger nå denne hunden", "heart"); toggle(setFollowed, id); },
    toggleEvent: (id) => { flash(eventGoing[id] ? "Påmelding fjernet" : "Du er påmeldt!", eventGoing[id] ? "x" : "calendar"); toggle(setEventGoing, id); },
    togglePlace: (id) => toggle(setSavedPlaces, id),
    toggleRoute: (id) => toggle(setSavedRoutes, id),
    addComment: (postId, text) => setComments((c) => ({ ...c, [postId]: [...(c[postId] || []), { name: `${ME.owner} & ${profile.name}`, avatar: ME.photo, text }] })),
    sendMessage: (convId, text) => setMessages((m) => ({ ...m, [convId]: [...(m[convId] || []), { me: true, t: text }] })),
    addMeetup: (m) => {
      const id = "u" + Date.now();
      setMyMeetups((l) => [{ ...m, id, host: "santos", going: ["santos"], km: 0.2, mine: true }, ...l]);
      setGoing((g) => ({ ...g, [id]: true }));
      flash("Treffet er ute! Hundeeiere i nærheten får beskjed", "live");
      return id;
    },
    addPost: (text, place) => {
      setMyPosts((l) => [{ id: Date.now(), kind: "photo", author: `${ME.owner} & ${profile.name}`, avatar: ME.photo, time: "Nå", place: place || city, photo: PHOTO.hug, text, likes: 0, comments: 0 }, ...l]);
      flash("Publisert i fellesskapet", "check");
    },
    addEvent: (e) => {
      const id = "ue" + Date.now();
      setMyEvents((l) => [{ ...e, id, going: 1, faces: ["santos"], host: `${ME.owner} & ${profile.name}`, program: [[e.time, "Oppmøte"]], photo: PHOTO.hills }, ...l]);
      setEventGoing((g) => ({ ...g, [id]: true }));
      flash("Arrangementet er publisert", "calendar");
    },
    startWalk: () => { setOverlays([]); setWalk({ seconds: 0, km: 0 }); },
    finishWalk: () => {
      if (!walk) return;
      const km = Math.max(walk.km, 0.42);
      const summary = { km, seconds: Math.max(walk.seconds, 60), paws: Math.round(km * 100) + 20, streak: streak + 1 };
      setWalk(null);
      setStreak(streak + 1);
      setWeekKm(+(weekKm + km).toFixed(2));
      setPaws(paws + summary.paws);
      setOverlays([{ type: "walkSummary", data: summary }]);
    },
    cancelWalk: () => setWalk(null),
    setProfile, setPrivacy, setPush, setVerified, setLostDogActive,
    invite: () => { setInviteCount((c) => Math.min(3, c + 1)); flash("Invitasjon sendt", "send"); },
    finishOnboarding: () => { try { localStorage.setItem("potesjarm-onboarded", "1"); } catch {} close("onboarding"); },
  };

  const allMeetups = useMemo(() => [...myMeetups, ...seedMeetups], [myMeetups]);
  const allPosts = useMemo(() => [...myPosts, ...seedFeed], [myPosts]);
  const allEvents = useMemo(() => [...myEvents, ...seedEvents], [myEvents]);

  const value = {
    tab, groupId, ...values, comments, messages, walk, overlays, toast, hydrated,
    meetups: allMeetups, posts: allPosts, events: allEvents,
    top: overlays[overlays.length - 1],
    has: (type) => overlays.some((o) => o.type === type),
    ...actions,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
