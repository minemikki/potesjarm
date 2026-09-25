"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { badges, challenges, levelFor, PAWS } from "../lib/data";
import { defaultLocation, kommuneById, roundCoord } from "../lib/geo";
import { isLostDogLive } from "../lib/lostdog";
import { COLD_START, getContent, getStats, isEarlyArea, leaderboardUnlocked, MODE } from "../lib/content";
import { GPS_CONFIG, applyGpsSample, createWalkSession, isValidWalk, pawsForWalk } from "../lib/track";
import { isNewOsloDay, isSameOsloDay, isSameOsloWeek, nextStreak, osloDateKey, osloHour } from "../lib/time";
import { migrateState as migrateStateLib, pawsTotal, pushLedgerOnce } from "../lib/ledger";
import { cancelFriendRequest, sendFriendRequest, toggleFollow as toggleFollowLib } from "../lib/friends";
import { relationStatus } from "../lib/social";
import * as demo from "../lib/demo";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { loadMyData, persistProfileAndDog } from "../lib/db/sync";
import { listMeetupsNear, createMeetup as dbCreateMeetup, cancelMeetup as dbCancelMeetup, joinMeetup, leaveMeetup } from "../lib/db/meetups";
import { discoverDogs, getDog } from "../lib/db/dogs";
import * as social from "../lib/db/social";
import * as groupsDb from "../lib/db/groups";
import * as chatDb from "../lib/db/chat";
import * as feedDb from "../lib/db/feed";
import * as notifDb from "../lib/db/notifications";
import { meetupComposerToRow, rowToConversation, rawMessageToMessage, rowToNotification } from "../lib/mapdb";
import { canStartDirectChat, mergeMessages, sortConversations } from "../lib/chat";
import { mergeFeed, toggleLikeOptimistic, toggleSaveOptimistic, applyLikeResult } from "../lib/feed";
import { mergeNotifications, notificationTarget } from "../lib/notifications";
import { enablePush as enableBrowserPush, pushStatusText } from "../lib/push";

const FEED_PAGE = 25;

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

/**
 * Under bygging/testing/visning før ekte lansering: ikke tving nye besøkende
 * gjennom onboarding ved hvert besøk. Sett tilbake til `true` (eller bygg med
 * NEXT_PUBLIC_FORCE_ONBOARDING = "on") når appen er klar for at ekte kunder
 * skal registrere hund og komme i gang – onboarding-flyten er uendret, bare
 * den automatiske åpningen er skrudd av her. E2e-testene bygger med "on" så
 * de kan teste selve onboarding-flyten.
 */
const FORCE_ONBOARDING = process.env.NEXT_PUBLIC_FORCE_ONBOARDING === "on";

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
  // Innkommende hundevenn-forespørsler jeg har mottatt (eier-id -> request-id).
  // Kun ekte når backend er på; lokalt/demo forblir denne tom.
  friendReqIn: {},
  friends: {},
  eventGoing: {},
  savedPlaces: {},
  verifiedPlaces: {},
  // Blokkerte forfattere (visningsnavn -> true). Filtrerer feed og kommentarer.
  // Full kaskade til hunder/grupper/søk/chat krever en delt bruker-id fra
  // backend (samme person på tvers av flater); lokalt blokkerer vi på det
  // eneste identitetssignalet vi har i klienten – forfatternavnet.
  blocked: {},
  // Innlegg brukeren har skjult ("ikke interessert") eller rapportert – begge
  // fjerner innlegget fra feeden med en gang (ekte konsekvens, ikke bare en
  // toast). reports lagrer at noe er meldt; en ekte modereringskø krever backend.
  hiddenPosts: {},
  reports: {},
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

export function AppProvider({ children, authUser = null }) {
  const [state, setState] = useState(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  // Siste state, lest synkront av persist() (unngår utdaterte closures).
  const stateRef = useRef(state);
  stateRef.current = state;
  // Brukerens primærhund i Supabase (id), så profil-lagring oppdaterer samme
  // rad i stedet for å lage duplikater.
  const primaryDogIdRef = useRef(null);
  const backend = !!(authUser?.id && isSupabaseConfigured);
  // Ekte treff hentet fra Supabase for kommunen brukeren følger (se
  // refreshMeetups nedenfor). Tom liste = faktisk ingen treff, ikke en feil.
  const [realMeetups, setRealMeetups] = useState([]);
  // Ekte, oppdagbare hunder i kommunen (discover_dogs). Tom = ingen andre hunder.
  const [realDogs, setRealDogs] = useState([]);
  // Enkelt-hunder hentet på forespørsel (f.eks. en treffverts hund) som ikke
  // ligger i realDogs. Slås sammen i dogById slik at profilen kan åpnes.
  const [extraDogs, setExtraDogs] = useState({});
  // Ekte grupper i kommunen + detaljene for den åpne gruppa (medlemmer/innlegg).
  const [realGroups, setRealGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupPosts, setGroupPosts] = useState([]);
  // Ekte samtaler (innboks) + meldinger per samtale. extraConvs holder en
  // nyopprettet samtale med en gang, så den kan åpnes før listen er hentet.
  const [realConversations, setRealConversations] = useState([]);
  const [extraConvs, setExtraConvs] = useState({});
  const [chatMsgs, setChatMsgs] = useState({});
  // Ekte feed (hjem) med cursor-paginering, lagrede innlegg, og kommentarer
  // per innlegg. Tomme uten backend.
  const [realFeed, setRealFeed] = useState([]);
  const [feedCursor, setFeedCursor] = useState(null);
  const [feedHasMore, setFeedHasMore] = useState(false);
  const [savedFeed, setSavedFeed] = useState([]);
  const [feedComments, setFeedComments] = useState({});
  // Ekte varsler + ulest-antall + innstillinger. Tomme uten backend.
  const [realNotifications, setRealNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifSettings, setNotifSettings] = useState(null);
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
      if (!raw?.onboarded && FORCE_ONBOARDING) setOverlays([{ type: "onboarding" }]);
    } catch {
      if (FORCE_ONBOARDING) setOverlays([{ type: "onboarding" }]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [hydrated, state]);

  // Når en ekte bruker er logget inn og Supabase er satt opp, er skyen
  // fasit: last profil + primærhund derfra og flett inn. Finnes en hund,
  // er brukeren onboardet (ekte tegn, ikke gjettet).
  useEffect(() => {
    if (!backend) return;
    let active = true;
    (async () => {
      const { profile, location, primaryDogId, onboarded } = await loadMyData(authUser.id);
      if (!active) return;
      primaryDogIdRef.current = primaryDogId;
      // Sosial graf (følge/venner/forespørsler/blokkering) fra Supabase.
      const graph = await social.loadSocialGraph(authUser.id);
      if (!active) return;
      setState((s) => ({
        ...s,
        profile: profile ? { ...s.profile, ...profile } : s.profile,
        location: location ? { ...s.location, ...location } : s.location,
        onboarded: onboarded || s.onboarded,
        followed: graph.followed,
        friends: graph.friends,
        friendReqOut: graph.friendReqOut,
        friendReqIn: graph.friendReqIn,
        blocked: graph.blocked,
      }));
      if (onboarded) setOverlays((o) => o.filter((x) => x.type !== "onboarding"));
    })();
    return () => {
      active = false;
    };
  }, [backend, authUser?.id]);

  // Sosial graf på nytt etter en mutasjon (server er fasit).
  const refreshSocial = useCallback(async () => {
    if (!backend) return;
    const graph = await social.loadSocialGraph(authUser.id);
    setState((s) => ({
      ...s,
      followed: graph.followed,
      friends: graph.friends,
      friendReqOut: graph.friendReqOut,
      friendReqIn: graph.friendReqIn,
      blocked: graph.blocked,
    }));
  }, [backend, authUser?.id]);

  // Ekte, oppdagbare hunder i kommunen brukeren følger.
  const refreshDogs = useCallback(async () => {
    if (!backend) return;
    const kommuneId = stateRef.current.location.kommuneId;
    if (!kommuneId) return;
    const { data } = await discoverDogs(kommuneId, kommuneById[kommuneId]?.name || "");
    setRealDogs(data);
  }, [backend, authUser?.id]);

  useEffect(() => {
    refreshDogs();
  }, [refreshDogs, state.location.kommuneId]);

  // Ekte grupper i kommunen (medlemstall + min rolle). joinedGroups speiler
  // faktisk medlemskap fra databasen.
  const refreshGroups = useCallback(async () => {
    if (!backend) return;
    const kommuneId = stateRef.current.location.kommuneId;
    if (!kommuneId) return;
    const { data } = await groupsDb.listGroups(kommuneId);
    setRealGroups(data);
    setState((s) => {
      const joined = {};
      for (const g of data) if (g.joined) joined[g.id] = true;
      return { ...s, joinedGroups: joined };
    });
  }, [backend, authUser?.id]);

  useEffect(() => {
    refreshGroups();
  }, [refreshGroups, state.location.kommuneId]);

  // Detaljene for den åpne gruppa: medlemmer + innlegg (blokkerte skjult i RPC).
  const refreshGroupDetail = useCallback(async () => {
    if (!backend || !groupId) return;
    const [m, p] = await Promise.all([groupsDb.listMembers(groupId), groupsDb.listPosts(groupId)]);
    setGroupMembers(m.data);
    setGroupPosts(p.data);
  }, [backend, groupId]);

  useEffect(() => {
    if (backend && groupId) refreshGroupDetail();
    else { setGroupMembers([]); setGroupPosts([]); }
  }, [backend, groupId, refreshGroupDetail]);

  // Ekte treff for kommunen brukeren følger. Kalles på nytt etter at man
  // oppretter/melder seg på/av et treff, slik at listen alltid speiler
  // databasen (server-fasit vinner over en optimistisk lokal toggle).
  const refreshMeetups = useCallback(async () => {
    if (!backend) return;
    const kommuneId = stateRef.current.location.kommuneId;
    if (!kommuneId) return;
    const { data } = await listMeetupsNear(kommuneId, authUser.id);
    setRealMeetups(data);
    setState((s) => {
      const going = { ...s.going };
      for (const m of data) going[m.id] = m.iAmGoing;
      return { ...s, going };
    });
  }, [backend, authUser?.id]);

  useEffect(() => {
    refreshMeetups();
  }, [refreshMeetups, state.location.kommuneId]);

  /* ---- Sprint 5: ekte chat (samtaler + meldinger + Realtime) ---- */

  // Innboksen: alle mine samtaler med siste melding + ulest-antall.
  const refreshConversations = useCallback(async () => {
    if (!backend) return;
    const { data } = await chatDb.listConversations();
    setRealConversations(sortConversations(data));
  }, [backend, authUser?.id]);

  useEffect(() => {
    if (backend) refreshConversations();
    else { setRealConversations([]); setExtraConvs({}); setChatMsgs({}); }
  }, [backend, refreshConversations]);

  // Meldinger i én samtale. Serveren er fasit (joinede navn, rekkefølge),
  // men vi fletter inn evt. optimistiske meldinger som ikke er lagret ennå.
  const refreshMessages = useCallback(async (convId) => {
    if (!backend || !convId) return;
    const { data } = await chatDb.listMessages(convId);
    setChatMsgs((m) => ({ ...m, [convId]: mergeMessages(m[convId] || [], data) }));
  }, [backend]);

  // Samtale-id fra den øverste chat-overlayen (kun ekte uuid-er, ikke demo).
  const topOverlay = overlays[overlays.length - 1];
  const activeChatConvId =
    backend && topOverlay && (topOverlay.type === "chat" || topOverlay.type === "meetupChat")
      && typeof topOverlay.data === "string" && /^[0-9a-f]{8}-/.test(topOverlay.data)
      ? topOverlay.data : null;

  // Åpen samtale: last meldinger, marker lest, og abonner på nye via Realtime.
  // Realtime håndhever RLS (msg read) – bare medlemmer får hendelsene.
  useEffect(() => {
    if (!activeChatConvId) return;
    let alive = true;
    refreshMessages(activeChatConvId);
    chatDb.markRead(activeChatConvId).then(() => { if (alive) refreshConversations(); });
    const unsub = chatDb.subscribeMessages(activeChatConvId, () => {
      if (!alive) return;
      refreshMessages(activeChatConvId);
      chatDb.markRead(activeChatConvId).then(() => { if (alive) refreshConversations(); });
    });
    return () => { alive = false; unsub(); };
  }, [activeChatConvId, refreshMessages, refreshConversations]);

  /* ---- Sprint 6: ekte feed (innlegg + likes + kommentarer + saves) ---- */

  // Hjem-feeden for kommunen: egne + fulgte + grupper + lokale (relevans i RPC).
  const refreshFeed = useCallback(async () => {
    if (!backend) return;
    const kommuneId = stateRef.current.location.kommuneId;
    const { data } = await feedDb.listFeed(kommuneId, { limit: FEED_PAGE });
    setRealFeed(data);
    setFeedHasMore(data.length === FEED_PAGE);
    setFeedCursor(data.length ? data[data.length - 1].createdAt : null);
  }, [backend, authUser?.id]);

  useEffect(() => {
    if (backend) refreshFeed();
    else { setRealFeed([]); setSavedFeed([]); setFeedComments({}); setFeedCursor(null); setFeedHasMore(false); }
  }, [backend, refreshFeed, state.location.kommuneId]);

  // «Last mer»: hent neste side med created_at-cursor og slå sammen (dedupe).
  const loadMoreFeed = useCallback(async () => {
    if (!backend || !feedCursor) return;
    const kommuneId = stateRef.current.location.kommuneId;
    const { data } = await feedDb.listFeed(kommuneId, { limit: FEED_PAGE, before: feedCursor });
    setRealFeed((cur) => mergeFeed(cur, data));
    setFeedHasMore(data.length === FEED_PAGE);
    setFeedCursor(data.length ? data[data.length - 1].createdAt : feedCursor);
    if (!data.length) setFeedHasMore(false);
  }, [backend, feedCursor, authUser?.id]);

  // Lagrede innlegg (egen liste).
  const refreshSaved = useCallback(async () => {
    if (!backend) return;
    const { data } = await feedDb.listSavedPosts({ limit: 50 });
    setSavedFeed(data);
  }, [backend, authUser?.id]);

  // Oppdater ett innlegg på tvers av alle lister det kan ligge i.
  const patchPost = useCallback((postId, fn) => {
    const map = (list) => list.map((p) => (p.id === postId ? fn(p) : p));
    setRealFeed(map);
    setSavedFeed(map);
    setGroupPosts(map);
  }, []);

  // Kommentarer for ett innlegg (blokkerte skjult i RPC).
  const loadComments = useCallback(async (postId) => {
    if (!backend || !postId) return;
    const { data } = await feedDb.listComments(postId);
    setFeedComments((m) => ({ ...m, [postId]: data }));
  }, [backend]);

  /* ---- Sprint 7: ekte varsler (notifications) + Realtime ---- */

  const refreshNotifications = useCallback(async () => {
    if (!backend) return;
    const [{ data: list }, { data: unread }] = await Promise.all([
      notifDb.listNotifications({ limit: 40 }),
      notifDb.unreadCount(),
    ]);
    setRealNotifications(list);
    setNotifUnread(unread);
  }, [backend, authUser?.id]);

  const refreshNotificationSettings = useCallback(async () => {
    if (!backend) return;
    const { data } = await notifDb.getSettings();
    if (data) setNotifSettings(data);
  }, [backend, authUser?.id]);

  useEffect(() => {
    if (!backend) { setRealNotifications([]); setNotifUnread(0); setNotifSettings(null); return; }
    refreshNotifications();
    refreshNotificationSettings();
    // Realtime: nye varsler dukker opp uten refresh (RLS => bare mine).
    const unsub = notifDb.subscribeNotifications(authUser.id, (row) => {
      setRealNotifications((cur) => mergeNotifications(cur, [rowToNotification(row)]));
      // Ulest-teller hentes på nytt (server er fasit; dedupe kan endre den).
      notifDb.unreadCount().then(({ data }) => setNotifUnread(data));
    });
    return unsub;
  }, [backend, authUser?.id, refreshNotifications, refreshNotificationSettings]);

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
    const notBlocked = (list) => list.filter((x) => (!x.author || !state.blocked[x.author]) && !state.hiddenPosts[x.id]);
    // Med backend er databasen fasit for treff og hunder – ingen lokal
    // blanding. Blokkerte eiere filtreres bort fra hunde-oppdagelse (A blokkerer
    // B => B forsvinner). Uten backend beholdes den gamle lokale/demo-oppførselen.
    const dogs = backend
      ? realDogs.filter((d) => !(d.ownerId && state.blocked[d.ownerId]))
      : content.dogs;
    return {
      ...content,
      meetups: backend ? realMeetups : [...mine(state.myMeetups), ...content.meetups],
      dogs,
      groups: backend ? realGroups : content.groups,
      // Med backend er hjem-feeden ekte (relevans + blokkering i RPC).
      // Uten backend: blokkerte forfattere OG skjulte/rapporterte innlegg
      // forsvinner faktisk fra feeden – ikke bare en toast.
      posts: backend ? realFeed : notBlocked([...mine(state.myPosts), ...content.posts]),
      events: [...mine(state.myEvents), ...content.events],
    };
  }, [content, state.myMeetups, state.myPosts, state.myEvents, state.location.kommuneId, state.blocked, backend, realMeetups, realDogs, realGroups, realFeed]);

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

  /** Slår opp en hund i det innholdet som faktisk finnes (+ enkelt-hentede). */
  const dogById = useCallback(
    (id) => {
      if (id === "self") return { id: "self", name: me.dogName, owner: me.ownerName, breed: me.breed, age: me.age, photo: me.photo };
      return contentWithMine.dogs.find((d) => d.id === id) || extraDogs[id] || null;
    },
    [contentWithMine.dogs, extraDogs, me]
  );

  /* --------------------------------------------------------------------
     Handlinger
     -------------------------------------------------------------------- */
  const flash = useCallback((text, icon = "check") => {
    clearTimeout(toastTimer.current);
    setToast({ text, icon, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Skriver profil + primærhund til Supabase når en ekte bruker er innlogget.
  // Uten backend er dette en no-op (prototypen lever kun i localStorage).
  // Feiler skrivingen, sier vi det ærlig – vi later aldri som den lyktes.
  const persist = useCallback(
    async (profileOverride, locationOverride) => {
      if (!backend) return;
      const s = stateRef.current;
      const profile = profileOverride || s.profile;
      const location = locationOverride || s.location;
      const { primaryDogId, error } = await persistProfileAndDog(
        authUser.id,
        profile,
        location,
        primaryDogIdRef.current
      );
      if (error) {
        flash("Kunne ikke lagre til skyen – prøv igjen", "alert");
        return;
      }
      if (primaryDogId) primaryDogIdRef.current = primaryDogId;
    },
    [backend, authUser?.id, flash]
  );

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
      persist(undefined, location);
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
      // Ekte treff: skriv til meetup_participants, og la databasen ha siste
      // ord (refreshMeetups henter faktisk tilstand etterpå).
      const m = contentWithMine.meetups.find((x) => x.id === id);
      if (backend && m?.real) {
        const write = wasOn ? leaveMeetup(id, authUser.id) : joinMeetup(id, authUser.id, primaryDogIdRef.current);
        write.then(({ error }) => {
          if (error) flash("Kunne ikke oppdatere – prøv igjen", "alert");
        }).finally(refreshMeetups);
      }
    },
    toggleGroup: (id) => {
      const wasIn = !!stateRef.current.joinedGroups[id];
      if (backend) {
        // Optimistisk, men databasen er fasit (refreshGroups etterpå).
        setState((s) => ({ ...s, joinedGroups: { ...s.joinedGroups, [id]: !wasIn } }));
        flash(wasIn ? "Du har forlatt gruppa" : "Velkommen i gruppa!", "users");
        const write = wasIn ? groupsDb.leaveGroup(id) : groupsDb.joinGroup(id);
        write.then(({ error }) => {
          if (error) flash(error.message || "Kunne ikke oppdatere – prøv igjen", "alert");
        }).finally(() => { refreshGroups(); refreshGroupDetail(); });
        return;
      }
      toggleIn("joinedGroups", id, "Velkommen i gruppa!", "Du har forlatt gruppa", "users");
    },
    // Opprett en gruppe (du blir admin). Kun backend.
    createGroup: (name, about, kind) => {
      if (!backend) return;
      groupsDb.createGroup(name, about, kind, stateRef.current.location.kommuneId).then(({ data, error }) => {
        if (error) { flash(error.message || "Kunne ikke opprette gruppa", "alert"); return; }
        flash("Gruppa er opprettet!", "users");
        refreshGroups();
        if (data?.id) { setTabState("Grupper"); setGroupId(data.id); }
      });
    },
    // Lag innlegg i den åpne gruppa (krever medlemskap – håndheves i RPC).
    createGroupPost: (groupIdArg, body, photo = null) => {
      if (!backend) return;
      groupsDb.createPost(groupIdArg, body, primaryDogIdRef.current, photo).then(({ error }) => {
        if (error) { flash(error.message || "Kunne ikke publisere – prøv igjen", "alert"); return; }
        flash("Innlegget er publisert", "check");
        refreshGroupDetail();
      });
    },
    deleteGroupPost: (postId) => {
      if (!backend) return;
      groupsDb.deletePost(postId).then(({ error }) => {
        flash(error ? "Kunne ikke slette – prøv igjen" : "Innlegget er slettet", error ? "alert" : "check");
        refreshGroupDetail();
      });
    },
    reportGroupPost: (postId) => {
      if (!backend) { flash("Takk – vi ser på innlegget", "flag"); return; }
      groupsDb.reportPost(postId).then(({ error }) => {
        flash(error ? "Kunne ikke rapportere – prøv igjen" : "Takk – rapporten er sendt", error ? "alert" : "flag");
      });
    },
    removeGroupMember: (groupIdArg, profileId) => {
      if (!backend) return;
      groupsDb.removeMember(groupIdArg, profileId).then(({ error }) => {
        flash(error ? (error.message || "Kunne ikke fjerne medlem") : "Medlem fjernet", error ? "alert" : "check");
        refreshGroupDetail(); refreshGroups();
      });
    },
    setGroupRole: (groupIdArg, profileId, role) => {
      if (!backend) return;
      groupsDb.setMemberRole(groupIdArg, profileId, role).then(({ error }) => {
        flash(error ? (error.message || "Kunne ikke endre rolle") : "Rolle oppdatert", error ? "alert" : "check");
        refreshGroupDetail();
      });
    },
    // FØLGE (énveis) – ingen bekreftelse fra den andre trengs. Godtar enten en
    // hunde-id (lokal/demo) eller et hundeobjekt (for ekte hunder trenger vi
    // også eier-id til vennskaps-/blokk-logikk).
    toggleFollow: (arg) => {
      const dogId = typeof arg === "string" ? arg : arg?.id;
      const isReal = typeof arg === "object" && arg?.real;
      let nowOn;
      setState((s) => {
        nowOn = !s.followed[dogId];
        return { ...s, followed: toggleFollowLib(s.followed, dogId) };
      });
      flash(nowOn ? "Du følger nå denne hunden" : "Følger ikke lenger", "heart");
      if (backend && isReal) {
        const write = nowOn ? social.followDog(dogId) : social.unfollowDog(dogId);
        write.then(({ error }) => {
          if (error) flash("Kunne ikke oppdatere følging – prøv igjen", "alert");
        }).finally(refreshSocial);
      }
    },
    // HUNDEVENN (toveis) – vi sender en forespørsel. Den blir aldri "venner"
    // lokalt; det krever at den andre eieren godtar (via backend/RPC).
    requestFriend: (arg) => {
      const isReal = typeof arg === "object" && arg?.real;
      const ownerId = isReal ? arg.ownerId : (typeof arg === "string" ? arg : arg?.id);
      if (backend && isReal) {
        social.sendFriendRequest(ownerId, primaryDogIdRef.current, null).then(({ data, error }) => {
          if (error) {
            flash("Kunne ikke sende forespørsel. Prøv igjen.", "alert");
            return;
          }
          flash("Forespørsel sendt. Dere blir hundevenner når den andre godtar", "userPlus");
        }).finally(refreshSocial);
        // Optimistisk: marker som sendt til refresh bekrefter.
        setState((s) => ({ ...s, friendReqOut: { ...s.friendReqOut, [ownerId]: true } }));
        return;
      }
      setState((s) => sendFriendRequest(s, ownerId));
      flash("Forespørsel sendt. Dere blir hundevenner når den andre godtar", "userPlus");
    },
    cancelFriend: (arg) => {
      const isReal = typeof arg === "object" && arg?.real;
      const ownerId = isReal ? arg.ownerId : (typeof arg === "string" ? arg : arg?.id);
      if (backend && isReal) {
        const reqId = stateRef.current.friendReqOut[ownerId];
        setState((s) => { const o = { ...s.friendReqOut }; delete o[ownerId]; return { ...s, friendReqOut: o }; });
        if (typeof reqId === "string") social.cancelFriendRequest(reqId).finally(refreshSocial);
        flash("Forespørsel trukket tilbake", "x");
        return;
      }
      setState((s) => cancelFriendRequest(s, ownerId));
      flash("Forespørsel trukket tilbake", "x");
    },
    // Mottatt forespørsel: godta (blir venner) eller avslå. Kun ekte/backend.
    acceptFriend: (arg) => {
      const ownerId = typeof arg === "object" ? arg.ownerId : arg;
      const reqId = stateRef.current.friendReqIn[ownerId];
      if (!backend || typeof reqId !== "string") return;
      social.acceptFriendRequest(reqId).then(({ error }) => {
        flash(error ? "Kunne ikke godta – prøv igjen" : "Dere er hundevenner!", error ? "alert" : "check");
      }).finally(refreshSocial);
    },
    declineFriend: (arg) => {
      const ownerId = typeof arg === "object" ? arg.ownerId : arg;
      const reqId = stateRef.current.friendReqIn[ownerId];
      if (!backend || typeof reqId !== "string") return;
      social.declineFriendRequest(reqId).then(({ error }) => {
        if (error) flash("Kunne ikke avslå – prøv igjen", "alert");
      }).finally(refreshSocial);
    },
    // Blokkér en eier (via hundeprofil). Kaskaderer i databasen (fjerner
    // følging/vennskap/ventende forespørsler begge veier).
    blockOwner: (arg) => {
      const isReal = typeof arg === "object" && arg?.real;
      const ownerId = isReal ? arg.ownerId : null;
      if (!backend || !ownerId) return;
      setState((s) => ({ ...s, blocked: { ...s.blocked, [ownerId]: true } }));
      social.blockUser(ownerId).then(({ error }) => {
        flash(error ? "Kunne ikke blokkere – prøv igjen" : "Eieren er blokkert", error ? "alert" : "ban");
      }).finally(() => { refreshSocial(); refreshDogs(); refreshFeed(); refreshGroupDetail(); });
    },
    unblockOwner: (ownerId) => {
      if (!backend || !ownerId) return;
      setState((s) => { const b = { ...s.blocked }; delete b[ownerId]; return { ...s, blocked: b }; });
      social.unblockUser(ownerId).finally(() => { refreshSocial(); refreshDogs(); });
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
    // Lokal/demo-chat (uendret). Ekte chat går via sendChatMessage.
    sendMessage: (convId, text) => setMessages((m) => ({ ...m, [convId]: [...(m[convId] || []), { me: true, t: text }] })),

    /* ---- Sprint 5: ekte chat ---- */

    // Åpne en 1:1-samtale med en annen bruker. Backend: hent/opprett ekte
    // samtale (self-chat + blokkering nektes både her og i RPC-en). Uten
    // backend faller vi tilbake på den lokale/demo-chatten mot hunde-id.
    startDirectChat: async (otherProfileId, meta = {}) => {
      if (!backend) { open("chat", meta.dogId || otherProfileId); return; }
      if (!canStartDirectChat({ meId: authUser.id, otherId: otherProfileId, blocked: stateRef.current.blocked })) {
        flash("Du kan ikke sende melding til denne brukeren", "alert");
        return;
      }
      const { data: convId, error } = await chatDb.getOrCreateDirect(otherProfileId);
      if (error || !convId) { flash("Kunne ikke åpne samtalen", "alert"); return; }
      setExtraConvs((m) => ({
        ...m,
        [convId]: rowToConversation({
          id: convId, kind: "direct", other_id: otherProfileId,
          other_name: meta.otherName, other_dog_id: meta.dogId,
          other_dog_name: meta.dogName, other_photo: meta.photo,
        }),
      }));
      open("chat", convId);
      refreshConversations();
    },

    // Åpne treff-chatten. Backend: hent/opprett samtalen (kun vert/deltaker –
    // håndheves i RPC-en). Uten backend: den lokale/demo-treffchatten.
    startMeetupChat: async (meetupId) => {
      if (!backend) { open("meetupChat", meetupId); return; }
      const { data: convId, error } = await chatDb.getOrCreateMeetup(meetupId);
      if (error || !convId) { flash("Kunne ikke åpne treff-chatten", "alert"); return; }
      const m = contentWithMine.meetups.find((x) => x.id === meetupId);
      setExtraConvs((mm) => ({
        ...mm,
        [convId]: rowToConversation({ id: convId, kind: "meetup", meetup_id: meetupId, meetup_title: m?.title }),
      }));
      open("meetupChat", convId);
      refreshConversations();
    },

    // Send en melding i en ekte samtale (optimistisk + RPC + dedupe).
    sendChatMessage: (convId, text) => {
      const body = (text || "").trim();
      if (!body) return;
      if (!backend) { setMessages((m) => ({ ...m, [convId]: [...(m[convId] || []), { me: true, t: body }] })); return; }
      const tmpId = "tmp:" + Date.now();
      setChatMsgs((m) => ({
        ...m,
        [convId]: mergeMessages(m[convId] || [], [
          { id: tmpId, mine: true, senderId: authUser.id, body, at: new Date().toISOString() },
        ]),
      }));
      chatDb.sendMessage(convId, body).then(({ data, error }) => {
        if (error || !data) {
          flash("Meldingen ble ikke sendt", "alert");
          setChatMsgs((m) => ({ ...m, [convId]: (m[convId] || []).filter((x) => x.id !== tmpId) }));
          return;
        }
        // Erstatt den optimistiske med den ekte raden (merge kollapser tmp).
        setChatMsgs((m) => ({
          ...m,
          [convId]: mergeMessages(m[convId] || [], [rawMessageToMessage(data, authUser.id)]),
        }));
        refreshMessages(convId);
        refreshConversations();
      });
    },

    // Marker en samtale som lest (nullstiller ulest-badgen).
    markConversationRead: (convId) => {
      if (!backend || !convId) return;
      chatDb.markRead(convId).then(() => refreshConversations());
    },

    /* ---- Sprint 6: ekte feed ---- */

    loadMoreFeed,
    refreshFeed,
    refreshSaved,
    loadComments,

    // Lag et ekte innlegg (hjem eller gruppe). Kommune settes server-side.
    createRealPost: async ({ body = null, dogId = null, groupId = null, photo = null, kind = null } = {}) => {
      if (!backend) return null;
      const { data: id, error } = await feedDb.createPost({
        body, dogId: dogId ?? primaryDogIdRef.current, groupId, photo, kind,
        municipalityId: stateRef.current.location.kommuneId,
      });
      if (error || !id) { flash("Kunne ikke publisere – prøv igjen", "alert"); return null; }
      if (groupId) { refreshGroupDetail(); refreshGroups(); }
      else refreshFeed();
      flash("Innlegget er publisert", "check");
      return id;
    },

    // Slett eget innlegg (eller som gruppeadmin/moderator).
    deleteRealPost: async (postId) => {
      if (!backend) return;
      const { error } = await feedDb.deletePost(postId);
      if (error) { flash("Kunne ikke slette innlegget", "alert"); return; }
      const drop = (list) => list.filter((p) => p.id !== postId);
      setRealFeed(drop); setSavedFeed(drop); setGroupPosts(drop);
      flash("Innlegget er slettet", "x");
    },

    // Like/unlike med optimistisk oppdatering + tilbakerulling ved feil.
    likeRealPost: async (post) => {
      if (!backend || !post) return;
      const wasLiked = post.likedByMe;
      patchPost(post.id, toggleLikeOptimistic);
      const res = wasLiked ? await feedDb.unlikePost(post.id) : await feedDb.likePost(post.id);
      if (res.error) { patchPost(post.id, toggleLikeOptimistic); flash("Kunne ikke oppdatere", "alert"); return; }
      if (typeof res.data === "number") patchPost(post.id, (p) => applyLikeResult(p, { likes: res.data, liked: !wasLiked }));
    },

    // Lagre/fjern lagring med optimistisk oppdatering + tilbakerulling.
    saveRealPost: async (post) => {
      if (!backend || !post) return;
      const wasSaved = post.savedByMe;
      patchPost(post.id, toggleSaveOptimistic);
      const res = wasSaved ? await feedDb.unsavePost(post.id) : await feedDb.savePost(post.id);
      if (res.error) { patchPost(post.id, toggleSaveOptimistic); flash("Kunne ikke lagre", "alert"); return; }
      refreshSaved();
      flash(wasSaved ? "Fjernet fra lagret" : "Lagret", "bookmark");
    },

    // Kommenter (optimistisk +1 på telleren, sannheten hentes etterpå).
    createRealComment: async (postId, body) => {
      if (!backend) return;
      const { error } = await feedDb.createComment(postId, body);
      if (error) { flash("Kunne ikke kommentere", "alert"); return; }
      patchPost(postId, (p) => ({ ...p, comments: (p.comments || 0) + 1 }));
      loadComments(postId);
    },
    deleteRealComment: async (postId, commentId) => {
      if (!backend) return;
      const { error } = await feedDb.deleteComment(commentId);
      if (error) { flash("Kunne ikke slette kommentaren", "alert"); return; }
      patchPost(postId, (p) => ({ ...p, comments: Math.max(0, (p.comments || 0) - 1) }));
      loadComments(postId);
    },

    // Rapporter et innlegg (ekte rad i reports).
    reportRealPost: async (postId) => {
      if (!backend) { flash("Takk – vi ser på innlegget", "flag"); return; }
      const { error } = await feedDb.reportPost(postId);
      flash(error ? "Kunne ikke rapportere – prøv igjen" : "Takk – vi ser på innlegget", error ? "alert" : "flag");
    },

    /* ---- Sprint 7: varsler ---- */

    refreshNotifications,

    markNotificationRead: (id) => {
      if (!backend) return;
      setRealNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setNotifUnread((c) => Math.max(0, c - 1));
      notifDb.markRead(id);
    },

    markAllNotificationsRead: () => {
      if (!backend) return;
      setRealNotifications((list) => list.map((n) => ({ ...n, read: true })));
      setNotifUnread(0);
      notifDb.markAllRead();
    },

    // Åpne riktig skjerm fra et varsel (marker lest først). Ingen døde knapper:
    // er referansen slettet, vis en ærlig beskjed i stedet.
    openNotification: async (n) => {
      if (!n) return;
      if (backend && !n.read) {
        setRealNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setNotifUnread((c) => Math.max(0, c - 1));
        notifDb.markRead(n.id);
      }
      const t = notificationTarget(n);
      close("notifications");
      if (!t) return;
      if (t.overlay === "dog") {
        const known = contentWithMine.dogs.find((d) => d.id === t.id) || extraDogs[t.id];
        if (!known && backend) {
          const { data } = await getDog(t.id, kommuneById[stateRef.current.location.kommuneId]?.name || "", stateRef.current.location.kommuneId);
          if (data) setExtraDogs((m) => ({ ...m, [t.id]: data }));
        }
        open("dog", t.id);
      } else if (t.overlay === "post") {
        const { data } = await feedDb.getPost(t.id);
        if (data) open("comments", data);
        else flash("Innlegget finnes ikke lenger", "alert");
      } else if (t.overlay === "chat") {
        open("chat", t.id);
      } else if (t.overlay === "meetup") {
        const exists = contentWithMine.meetups.find((m) => m.id === t.id);
        if (exists) open("meetup", t.id);
        else flash("Treffet er ikke tilgjengelig lenger", "alert");
      }
    },

    updateNotificationSettings: async (patch) => {
      if (!backend) return;
      // Optimistisk, server er fasit.
      setNotifSettings((s) => ({ ...(s || {}), ...patch }));
      const { data, error } = await notifDb.updateSettings(patch);
      if (error) { flash("Kunne ikke lagre innstillingen", "alert"); refreshNotificationSettings(); return; }
      if (data) setNotifSettings(data);
    },

    // Slå på pushvarsler – men aldri på liksom. Registrerer et ekte abonnement
    // kun hvis nettleser + server (VAPID) faktisk er klare; ellers ærlig beskjed.
    enablePush: async () => {
      const res = await enableBrowserPush();
      if (res.ok && res.subscription) {
        await notifDb.registerPushSubscription({ ...res.subscription, userAgent: navigator.userAgent });
        flash("Pushvarsler er på", "bell");
      } else {
        flash(pushStatusText(res.reason), res.reason === "granted" ? "bell" : "alert");
      }
    },

    // INGEN poter for å opprette et treff. Hvert treff har en unik id, så en
    // opprettelses-belønning kan aldri dedupliseres – den ville vært fritt
    // farmbar (lag treff, få poter, gjenta). Verdien av et treff er at det
    // faktisk skjer; den belønningen hører til en server-bekreftet
    // fullføringsflyt, ikke til selve opprettelsen.
    addMeetup: (m) => {
      // Ekte treff: skriv til Supabase slik at andre hundeeiere faktisk ser
      // det – et lokalt-bare treff ville vært usynlig for alle andre.
      if (backend) {
        const row = meetupComposerToRow(m, { hostId: authUser.id, municipalityId: stateRef.current.location.kommuneId });
        if (m.groupId) row.group_id = m.groupId; // treff knyttet til en gruppe
        dbCreateMeetup(row).then(({ error }) => {
          if (error) {
            flash("Kunne ikke publisere treffet – prøv igjen", "alert");
            return;
          }
          flash("Treffet er ute! Det vises nå i Nå skjer", "live");
          refreshMeetups();
        });
        return null;
      }
      const id = "u" + Date.now();
      setState((s) => ({
        ...s,
        myMeetups: [{ ...m, id, kommuneId: s.location.kommuneId, host: "self", going: ["self"], max: m.max, mine: true }, ...s.myMeetups],
        going: { ...s.going, [id]: true },
      }));
      flash("Treffet er ute! Det vises nå i Nå skjer", "live");
      return id;
    },
    // Vert avlyser sitt eget treff – ekte konsekvens: det fjernes fra lista.
    cancelMeetup: (id) => {
      const m = contentWithMine.meetups.find((x) => x.id === id);
      if (backend && m?.real) {
        dbCancelMeetup(id, authUser.id).then(({ error }) => {
          if (error) flash("Kunne ikke avlyse – prøv igjen", "alert");
          else flash("Treffet er avlyst. Deltakere får beskjed", "x");
          refreshMeetups();
        });
        return;
      }
      setState((s) => {
        const going = { ...s.going };
        delete going[id];
        return { ...s, myMeetups: s.myMeetups.filter((x) => x.id !== id), going };
      });
      flash("Treffet er avlyst", "x");
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
            : `Turen ble for kort til å telle – du må gå minst ${GPS_CONFIG.MIN_VALID_WALK_M} m.`,
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
      // Lagre til Supabase med de nettopp innsamlede verdiene (ikke stale state).
      persist(data.profile, data.location);
    },
    setProfile: (p) => {
      patch((s) => ({ profile: { ...s.profile, ...p } }));
      persist({ ...stateRef.current.profile, ...p });
    },
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
    // «Ikke interessert» skjuler innlegget fra feeden (ekte konsekvens).
    hidePost: (id) => {
      patch((s) => ({ hiddenPosts: { ...s.hiddenPosts, [id]: true } }));
      flash("Du ser færre slike innlegg", "eyeOff");
    },
    // Rapporter: skjuler innlegget nå og noterer meldingen. En ekte
    // modereringskø med oppfølging krever backend.
    reportPost: (id) => {
      patch((s) => ({ hiddenPosts: { ...s.hiddenPosts, [id]: true }, reports: { ...s.reports, [id]: Date.now() } }));
      flash("Takk. Innlegget er skjult og meldt", "flag");
    },
    // Kopierer en delelenke til utklippstavlen. Ingen falsk «kopiert» – vi sier
    // det bare når det faktisk lot seg gjøre.
    shareLink: (path, label = "Lenke kopiert") => {
      const url = (typeof location !== "undefined" ? location.origin : "https://potesjarm.no") + path;
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(() => flash(label, "check")).catch(() => flash("Kunne ikke kopiere lenken", "alert"));
      } else {
        flash("Deling krever en nettleser med utklippstavle", "alert");
      }
    },
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

  // Ekte innboks: samtalene fra serveren + evt. en nyåpnet samtale som ennå
  // ikke er i lista. Uten backend brukes demo-samtalene fra contentWithMine.
  const realConversationsMerged = useMemo(() => {
    const map = new Map();
    for (const c of realConversations) map.set(c.id, c);
    for (const id in extraConvs) if (!map.has(id)) map.set(id, extraConvs[id]);
    return sortConversations([...map.values()]);
  }, [realConversations, extraConvs]);

  const value = {
    ...state,
    hydrated,
    tab, groupId, overlays, toast, walk, comments, messages,
    // innhold
    ...contentWithMine,
    content: contentWithMine,
    // Ekte chat overstyrer demo-samtalene når backend er på.
    conversations: backend ? realConversationsMerged : contentWithMine.conversations,
    conversationById: (id) => realConversations.find((c) => c.id === id) || extraConvs[id] || null,
    chatMessagesFor: (convId) => chatMsgs[convId] || [],
    // Ekte feed-tilstand (backend). commentsFor gir kommentarene for ett innlegg.
    feedHasMore,
    savedPosts: savedFeed,
    commentsFor: (postId) => feedComments[postId] || [],
    // Ekte varsler overstyrer demo-varslene når backend er på.
    notifications: backend ? realNotifications : contentWithMine.notifications,
    notifUnread,
    notifSettings,
    stats,
    kommune: kommuneById[state.location.kommuneId],
    // Relasjonsstatus (følge/hundevenn/blokkert) for en hund – se friends.js.
    // Godtar en hunde-id (lokal/demo) eller et hundeobjekt. For ekte hunder
    // er følge per hund og vennskap/blokkering per eier.
    relationTo: (arg) => {
      if (arg && typeof arg === "object") {
        return relationStatus(state, arg.real ? { dogId: arg.id, ownerId: arg.ownerId } : arg.id);
      }
      return relationStatus(state, arg);
    },
    // Åpne en hundeprofil. Finnes ikke hunden lokalt (f.eks. en treffverts
    // hund), hentes den fra Supabase først – aldri en oppdiktet plassholder.
    openDog: async (dogId) => {
      if (!dogId) return;
      const known = contentWithMine.dogs.find((d) => d.id === dogId) || extraDogs[dogId];
      if (known || !backend) { open("dog", dogId); return; }
      const { data } = await getDog(dogId, kommuneById[stateRef.current.location.kommuneId]?.name || "", stateRef.current.location.kommuneId);
      if (data) setExtraDogs((m) => ({ ...m, [dogId]: data }));
      open("dog", dogId);
    },
    // Ærlig, utløpsbevisst status – UI skal lese denne, ikke rå lostDogActive.
    lostDogLive: isLostDogLive(state),
    usingMyPosition: typeof state.location.lat === "number",
    isDemo: content.demo,
    isEarly: isEarlyArea(stats),
    leaderboardUnlocked: leaderboardUnlocked(stats),
    coldStart: COLD_START,
    demoLeaderboard: demo.leaderboard,
    gpsConfig: GPS_CONFIG,
    // Er vi koblet til en ekte backend (innlogget + Supabase)? Styrer om
    // grupper viser ekte medlemmer/innlegg eller den lokale/demo-veien.
    backend,
    groupId,
    myProfileId: authUser?.id || null,
    // Ekte gruppedata for den åpne gruppa (tom uten backend).
    groupMembers,
    groupPosts,
    // Ekte gruppetreff = delmengden av treffene som hører til denne gruppa.
    groupMeetupsFor: (gid) => contentWithMine.meetups.filter((m) => m.groupId === gid),
    // meg
    me, level, challengeProgress, badgeProgress, dogById,
    ...actions,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
