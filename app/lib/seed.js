/* =========================================================================
   Seed-innhold: EKTE, offentlig informasjon.

   Dette er det eneste innholdet som finnes i appen før ekte brukere kommer.
   Alt her er offentlige friluftsområder og offentlig regelverk – ikke
   brukergenerert innhold, og ikke noe vi har funnet på.

   Regler for denne fila:
   - Alt merkes synlig i UI som "Potesjarm-guide" / "Offentlig informasjon"
   - Ingen vurderinger, ingen stjerner, ingen "12 anbefaler" før ekte
     brukere faktisk har lagt det inn
   - `verified: false` betyr at detaljene ikke er bekreftet lokalt ennå.
     UI-et sier det rett ut og lar brukere bekrefte (og tjene Poter for det).
   - Vi påstår aldri at et sted er inngjerdet, båndtvangsfritt eller
     hundevennlig uten at det er bekreftet.

   TODO før lansering: utvid per kommune vi åpner, og få en lokal person til
   å bekrefte hvert sted i den kommunen først.
   ========================================================================= */

import { BANDTVANG } from "./geo";

// type: tursti | park | strand | skog | utsiktspunkt
export const seedPlaces = [
  // --- Stavanger ---
  { id: "s-mosvatnet", kommuneId: "stavanger", name: "Mosvatnet", type: "tursti", lat: 58.943, lng: 5.716, about: "Opparbeidet turvei hele veien rundt vannet. Flatt og lett underlag.", verified: false },
  { id: "s-sormarka", kommuneId: "stavanger", name: "Sørmarka", type: "skog", lat: 58.917, lng: 5.755, about: "Stort tur- og skogsområde med mange stier og lysløype.", verified: false },
  { id: "s-vaulen", kommuneId: "stavanger", name: "Vaulen badeplass", type: "strand", lat: 58.914, lng: 5.737, about: "Offentlig badeplass i Hillevåg med turvei langs sjøen.", verified: false },
  { id: "s-byhaugen", kommuneId: "stavanger", name: "Byhaugen", type: "utsiktspunkt", lat: 58.981, lng: 5.72, about: "Utsiktspunkt med turveier i skogen rundt.", verified: false },
  { id: "s-store", kommuneId: "stavanger", name: "Stokkavatnet", type: "tursti", lat: 58.956, lng: 5.7, about: "Rundtur på turvei rundt Store Stokkavatn.", verified: false },

  // --- Sola / Sandnes ---
  { id: "so-solastranden", kommuneId: "sola", name: "Solastranden", type: "strand", lat: 58.888, lng: 5.598, about: "Lang sandstrand på Jæren. Del av verneområde – egne ferdselsregler deler av året.", verified: false },
  { id: "sa-sandvedparken", kommuneId: "sandnes", name: "Sandvedparken", type: "park", lat: 58.86, lng: 5.74, about: "Grøntdrag gjennom Sandnes med turvei langs Storåna.", verified: false },
  { id: "sa-dalsnuten", kommuneId: "sandnes", name: "Dalsnuten", type: "utsiktspunkt", lat: 58.878, lng: 5.812, about: "Populær topptur fra Gramstad med utsikt over Sandnes.", verified: false },

  // --- Oslo ---
  { id: "o-frognerparken", kommuneId: "oslo", name: "Frognerparken", type: "park", lat: 59.927, lng: 10.7, about: "Stor bypark med brede gressflater og turveier.", verified: false },
  { id: "o-sognsvann", kommuneId: "oslo", name: "Sognsvann", type: "tursti", lat: 59.974, lng: 10.727, about: "Rundtur på god sti rundt vannet, inngang til Nordmarka.", verified: false },
  { id: "o-ekeberg", kommuneId: "oslo", name: "Ekebergparken", type: "park", lat: 59.897, lng: 10.768, about: "Skog og åpne områder med utsikt over fjorden.", verified: false },
  { id: "o-huk", kommuneId: "oslo", name: "Huk, Bygdøy", type: "strand", lat: 59.896, lng: 10.674, about: "Badeplass på Bygdøy. Eget område for hundebading – sjekk skilting på stedet.", verified: false },
  { id: "o-ostensjo", kommuneId: "oslo", name: "Østensjøvannet", type: "tursti", lat: 59.887, lng: 10.833, about: "Turvei rundt vannet. Naturreservat med strenge båndregler hele året.", verified: false },

  // --- Bergen ---
  { id: "b-floyen", kommuneId: "bergen", name: "Fløyen", type: "skog", lat: 60.396, lng: 5.35, about: "Turterreng rett over sentrum med mange merkede stier.", verified: false },
  { id: "b-nygardsparken", kommuneId: "bergen", name: "Nygårdsparken", type: "park", lat: 60.386, lng: 5.324, about: "Bypark med turveier og store trær.", verified: false },
  { id: "b-nordnesparken", kommuneId: "bergen", name: "Nordnesparken", type: "park", lat: 60.398, lng: 5.305, about: "Park ytterst på Nordnes med sjøutsikt.", verified: false },

  // --- Trondheim ---
  { id: "t-bymarka", kommuneId: "trondheim", name: "Bymarka", type: "skog", lat: 63.41, lng: 10.31, about: "Stort markaområde vest for byen med et nett av stier.", verified: false },
  { id: "t-ladestien", kommuneId: "trondheim", name: "Ladestien", type: "tursti", lat: 63.446, lng: 10.45, about: "Kyststi langs Ladehalvøya med flere badeplasser.", verified: false },
  { id: "t-estenstad", kommuneId: "trondheim", name: "Estenstadmarka", type: "skog", lat: 63.39, lng: 10.48, about: "Turområde øst i byen med lysløype.", verified: false },

  // --- Kristiansand ---
  { id: "k-baneheia", kommuneId: "kristiansand", name: "Baneheia", type: "skog", lat: 58.158, lng: 7.993, about: "Bynært turområde med vann og opparbeidede stier.", verified: false },
  { id: "k-odderoya", kommuneId: "kristiansand", name: "Odderøya", type: "tursti", lat: 58.138, lng: 8.005, about: "Turstier og kyststi rett ved sentrum.", verified: false },

  // --- Tromsø ---
  { id: "tr-prestvannet", kommuneId: "tromso", name: "Prestvannet", type: "tursti", lat: 69.66, lng: 18.95, about: "Rundtur rundt vannet på toppen av Tromsøya.", verified: false },
  { id: "tr-telegrafbukta", kommuneId: "tromso", name: "Telegrafbukta", type: "strand", lat: 69.637, lng: 18.925, about: "Friområde og badeplass sør på Tromsøya.", verified: false },

  // --- Stavanger-regionen forøvrig ---
  { id: "r-viste", kommuneId: "randaberg", name: "Vistestranden", type: "strand", lat: 59.006, lng: 5.607, about: "Sandstrand på Randaberg med kyststi.", verified: false },
  { id: "h-djupadalen", kommuneId: "haugesund", name: "Djupadalen", type: "skog", lat: 59.42, lng: 5.29, about: "Turområde med vann og opparbeidede stier.", verified: false },

  // --- Øvrige store byer ---
  { id: "d-hamborgstrom", kommuneId: "drammen", name: "Hamborgstrømskogen", type: "skog", lat: 59.75, lng: 10.19, about: "Bynær skog med turveier over Drammen sentrum.", verified: false },
  { id: "f-gamlebyen", kommuneId: "fredrikstad", name: "Gamlebyen og vollene", type: "park", lat: 59.203, lng: 10.955, about: "Turvei rundt festningsvollene.", verified: false },
  { id: "bo-ronvikfjellet", kommuneId: "bodo", name: "Rønvikfjellet", type: "utsiktspunkt", lat: 67.293, lng: 14.43, about: "Utsikt over Bodø og Vestfjorden, stier fra byen.", verified: false },
  { id: "a-aksla", kommuneId: "alesund", name: "Byrampen og Aksla", type: "utsiktspunkt", lat: 62.474, lng: 6.16, about: "Trappetur opp til utsikten over Ålesund.", verified: false },
];

export const placeTypes = {
  tursti: { label: "Tursti", icon: "route", color: "mint" },
  park: { label: "Park", icon: "trees", color: "mint" },
  strand: { label: "Strand", icon: "waves", color: "blue" },
  skog: { label: "Turområde", icon: "trees", color: "mint" },
  utsiktspunkt: { label: "Utsiktspunkt", icon: "mountain", color: "violet" },
};

/**
 * Offisielle områdegrupper. Når vi åpner en kommune oppretter vi én gruppe
 * per kommune, tydelig merket "Opprettet av Potesjarm". Ingen fake medlemmer
 * og ingen fake aktivitet – gruppa starter tom, som seg hør og bør.
 */
export function officialGroupFor(kommune) {
  if (!kommune) return null;
  return {
    id: "official-" + kommune.id,
    name: `Hundeliv ${kommune.name}`,
    about: `Åpen gruppe for alle hundeeiere i ${kommune.name}. Del turtips, spør om råd og bli kjent med folk i nærområdet.`,
    official: true,
    kommuneId: kommune.id,
    tag: "Lokalt",
    color: "blue",
  };
}

/** Ekte, offentlig regelverk vi kan vise fra dag 1. */
export const publicInfo = [
  {
    id: "bandtvang",
    title: "Båndtvang",
    body: `Generell båndtvang i Norge gjelder fra ${BANDTVANG.from} til ${BANDTVANG.to} (${BANDTVANG.law}). ${BANDTVANG.note}`,
    icon: "info",
    source: "Hundeloven",
  },
  {
    id: "opprydding",
    title: "Rydd opp etter hunden",
    body: "De aller fleste kommuner har egne forskrifter om opprydding på offentlig sted. Ta alltid med pose.",
    icon: "info",
    source: "Kommunale forskrifter",
  },
  {
    id: "naturreservat",
    title: "Naturreservat og verneområder",
    body: "I mange verneområder er det båndtvang hele året, og noen steder er hund ikke tillatt i hekketiden. Følg skiltingen på stedet.",
    icon: "info",
    source: "Naturmangfoldloven",
  },
];
