/* =========================================================================
   Innholdskilde – ett sted som bestemmer hva appen faktisk har å vise.

   GRUNNPRINSIPP: absolutt ingenting falskt.

   Appen kjører i én av to moduser:

   - "live"  Slik appen faktisk er for en ekte bruker. Brukergenerert innhold
             starter TOMT. Vi viser ekte nuller, ekte tomme lister og ekte
             oppfordringer. Det eneste innholdet er offentlig seed-info
             (turområder, regelverk) og den offisielle områdegruppa.
             Dette er modusen vi lanserer med.

   - "demo"  Kun for å vise fram designet. Alt demo-innhold er merket synlig
             i UI-et, og det ligger BARE i kommunen det hører hjemme i
             (Stavanger). Bytter du til en annen kommune i demo-modus får du
             den ekte dag-1-opplevelsen. Det er med vilje: det er sånn en ny
             by faktisk kommer til å se ut.

   Alle tall i appen regnes ut herfra. Ingen hardkodede "1 248 aktive".
   Finnes det ingenting, viser vi 0.
   ========================================================================= */

import { kommuneById, radiusCenter, withinRadius } from "./geo";
import { officialGroupFor, seedPlaces } from "./seed";
import * as demo from "./demo";

export const MODE = { LIVE: "live", DEMO: "demo" };

/** Kommunen demo-innholdet hører hjemme i. */
export const DEMO_KOMMUNE = "stavanger";

/* -------------------------------------------------------------------------
   Terskler for cold start.

   Poenget: en tom by skal føles som en by som ikke har startet ennå,
   ikke som en app som er ødelagt. Derfor låser vi funksjoner som krever
   folk, i stedet for å fylle dem med oppdiktet innhold.
   ------------------------------------------------------------------------- */
export const COLD_START = {
  // Lokal toppliste gir ikke mening med to deltakere. Under denne grensa
  // viser vi personlige rekorder og nasjonale utfordringer i stedet.
  leaderboardMinActive: 10,
  // Under denne grensa sier vi tydelig at området er helt i starten.
  earlyAreaMaxDogs: 5,
};

/* -------------------------------------------------------------------------
   Kilde
   ------------------------------------------------------------------------- */

function inArea(loc, item) {
  if (!loc || !item) return false;
  if (item.kommuneId && item.kommuneId !== loc.kommuneId) return false;
  // Radiusen måles fra brukerens egen delte posisjon når den finnes, ellers
  // fra kommunens sentroide (se radiusCenter). Slik blir radius reell, ikke
  // bare kosmetisk.
  const center = radiusCenter(loc);
  if (!center) return false;
  if (item.lat == null || item.lng == null) return true;
  return withinRadius(center, item, loc.radiusKm);
}

/**
 * Alt innholdet appen har for et gitt sted, i en gitt modus.
 * Returnerer alltid arrays – aldri null – slik at UI-et kan telle trygt.
 */
export function getContent(mode, loc) {
  const kommune = kommuneById[loc?.kommuneId];
  const official = officialGroupFor(kommune);

  // Offentlig seed finnes uansett modus – det er ekte informasjon.
  const places = seedPlaces.filter((p) => inArea(loc, p));

  const isDemoArea = mode === MODE.DEMO && loc?.kommuneId === DEMO_KOMMUNE;

  if (!isDemoArea) {
    // Ekte dag 1: ingen brukere, ingen innlegg, ingen treff.
    return {
      demo: false,
      kommune,
      posts: [],
      meetups: [],
      dogs: [],
      groups: official ? [official] : [],
      events: [],
      places,
      conversations: [],
      notifications: [],
      stories: [],
    };
  }

  // Demo-modus i demo-kommunen: vis fixtures, merket som demo.
  return {
    demo: true,
    kommune,
    posts: demo.posts,
    meetups: demo.meetups,
    dogs: demo.dogs,
    groups: official ? [official, ...demo.groups] : demo.groups,
    events: demo.events,
    places,
    conversations: demo.conversations,
    notifications: demo.notifications,
    stories: demo.stories,
  };
}

/**
 * Tellere. Hver eneste verdi kommer fra faktisk innhold.
 * Er det tomt, er tallet 0 – og det skal det stå.
 */
export function getStats(content) {
  const meetups = content.meetups || [];
  return {
    dogs: (content.dogs || []).length,
    meetupsNow: meetups.filter((m) => m.startsIn <= 30).length,
    meetups: meetups.length,
    events: (content.events || []).length,
    groups: (content.groups || []).length,
    places: (content.places || []).length,
    posts: (content.posts || []).length,
    // "Aktive" er hunder vi faktisk vet er ute nå. Ingen pynting.
    activeNow: (content.dogs || []).filter((d) => d.online).length,
  };
}

/** Er dette området så nytt at vi bør si det rett ut? */
export function isEarlyArea(stats) {
  return stats.dogs <= COLD_START.earlyAreaMaxDogs;
}

/** Har området nok folk til at en lokal toppliste betyr noe? */
export function leaderboardUnlocked(stats) {
  return stats.dogs >= COLD_START.leaderboardMinActive;
}
