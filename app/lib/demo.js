/* =========================================================================
   DEMO-FIXTURES – oppdiktet innhold, kun for å vise fram designet.

   Dette er det eneste stedet i appen med oppdiktede hunder, innlegg og
   treff. Reglene rundt det:

   - Brukes BARE i demo-modus, og BARE i demo-kommunen (Stavanger).
     Bytter du kommune i demo-modus, får du den ekte tomme opplevelsen.
   - UI-et viser et synlig "Demo"-merke så lenge dette er i bruk.
   - Skal ALDRI være på i produksjon. Se content.js.

   Når Supabase er tilbake byttes hele denne fila ut med ekte spørringer,
   og live-modus blir den eneste modusen.
   ========================================================================= */

import { PHOTO } from "./data";

export const dogs = [
  { id: "luna", kommuneId: "stavanger", name: "Luna", owner: "Lise", breed: "Golden retriever", age: "2 år", lat: 58.943, lng: 5.716, photo: PHOTO.luna, ring: "coral", online: true, match: 94, energy: 4, size: "Stor", play: ["Apportering", "Bading"], streak: 28, story: "Morgenbad i Mosvatnet" },
  { id: "balto", kommuneId: "stavanger", name: "Balto", owner: "Anders", breed: "Schæfer", age: "5 år", lat: 58.955, lng: 5.7, photo: PHOTO.balto, ring: "blue", online: true, match: 91, energy: 5, size: "Stor", play: ["Røff lek", "Løping"], streak: 41, story: "Toppen av Dalsnuten!" },
  { id: "milo", kommuneId: "stavanger", name: "Milo", owner: "Kari", breed: "Australian shepherd", age: "1 år", lat: 58.93, lng: 5.74, photo: PHOTO.milo, ring: "mint", online: true, match: 88, energy: 5, size: "Medium", play: ["Løping", "Triks"], streak: 16, story: "Valpekurs dag 3" },
  { id: "nala", kommuneId: "stavanger", name: "Nala", owner: "Henrik", breed: "Beagle", age: "3 år", lat: 58.968, lng: 5.72, photo: PHOTO.nala, ring: "sun", online: true, match: 86, energy: 3, size: "Medium", play: ["Snusing", "Rolig lek"], streak: 11, story: "Fant noe spennende…" },
  { id: "max", kommuneId: "stavanger", name: "Max", owner: "Siri", breed: "Corgi", age: "4 år", lat: 58.97, lng: 5.733, photo: PHOTO.max, ring: "violet", online: true, match: 82, energy: 3, size: "Liten", play: ["Rolig lek"], streak: 9, story: "Bytur i sentrum" },
  { id: "bella", kommuneId: "stavanger", name: "Bella", owner: "Ingrid", breed: "Jack russell", age: "2 år", lat: 59.0, lng: 5.73, photo: PHOTO.bella, ring: "coral", online: false, match: 79, energy: 5, size: "Liten", play: ["Apportering", "Løping"], streak: 22, story: "Hundvåg i sola" },
  { id: "odin", kommuneId: "stavanger", name: "Odin", owner: "Jonas", breed: "Husky", age: "6 år", lat: 58.94, lng: 5.69, photo: PHOTO.odin, ring: "blue", online: true, match: 77, energy: 5, size: "Stor", play: ["Løping"], streak: 34, story: "Ullandhaug-runden" },
  { id: "frida", kommuneId: "stavanger", name: "Frida", owner: "Emma", breed: "Golden retriever", age: "8 mnd", lat: 58.95, lng: 5.75, photo: PHOTO.frida, ring: "mint", online: true, match: 90, energy: 4, size: "Medium", play: ["Valpelek", "Bading"], streak: 6, story: "Første gang på stranda" },
];

export const stories = dogs.map((d) => ({ dogId: d.id, caption: d.story, photo: d.photo }));

export const posts = [
  { id: 1, kommuneId: "stavanger", kind: "photo", author: "Emma & Frida", avatar: PHOTO.frida, time: "2 t siden", place: "Mosvatnet", photo: PHOTO.trail, text: "Magisk kveldstur ved Mosvatnet! 🧡", likes: 42, comments: 6 },
  { id: 2, kommuneId: "stavanger", kind: "walk", author: "Anders & Balto", avatar: PHOTO.balto, time: "3 t siden", place: "Dalsnuten", km: 5.4, minutes: 96, elevation: 318, text: "Endelig toppen igjen. Balto var ustoppelig i dag.", likes: 64, comments: 9, kudos: ["luna", "milo", "nala"] },
  { id: 3, kommuneId: "stavanger", kind: "photo", author: "Daniel & Nala", avatar: PHOTO.nala, time: "4 t siden", place: "Hundvåg", photo: PHOTO.duo, text: "Helgegjengen på Hundvåg strand 🌊", likes: 28, comments: 4 },
  { id: 4, kommuneId: "stavanger", kind: "group", author: "Stavanger Hundesirkel", avatar: PHOTO.puppies, time: "1 d siden", place: "Sørmarka", photo: PHOTO.pack, sticker: "Ny turgjeng!", title: "Søndagstur i Sørmarka", text: "Bli med på en rolig fellestur for store og små. Alle er velkomne!", likes: 56, comments: 12 },
  { id: 5, kommuneId: "stavanger", kind: "photo", author: "Lise & Luna", avatar: PHOTO.luna, time: "1 d siden", place: "Sola strand", photo: PHOTO.beach, text: "Luna har oppdaget at bølger er det beste som finnes.", likes: 91, comments: 15 },
  { id: 6, kommuneId: "stavanger", kind: "photo", author: "Kari & Milo", avatar: PHOTO.milo, time: "2 d siden", place: "Tjensvoll", photo: PHOTO.ball, text: "Ballen er livet. Noen som vil trene innkalling sammen?", likes: 37, comments: 8 },
];

export const initialComments = {
  1: [{ name: "Kari & Milo", avatar: PHOTO.milo, text: "Åå, så fint der!" }, { name: "Henrik & Nala", avatar: PHOTO.nala, text: "Vi må bli med neste gang." }],
  2: [{ name: "Lise & Luna", avatar: PHOTO.luna, text: "Rått! Hvor lang tid brukte dere opp?" }],
  3: [{ name: "Emma & Frida", avatar: PHOTO.frida, text: "Frida vil også på stranda 😍" }],
};

export const meetups = [
  { id: "m1", kommuneId: "stavanger", type: "tur", title: "Tur rundt Mosvatnet", host: "balto", when: "Nå", startsIn: 0, place: "Mosvatnet, hovedinngang", lat: 58.943, lng: 5.716, going: ["balto", "luna", "nala"], max: 8, pace: "Rolig", note: "Vi går den store runden, ca. 45 min. Alle størrelser velkommen." },
  { id: "m2", kommuneId: "stavanger", type: "lek", title: "Lekekamerat i hundeparken?", host: "milo", when: "Om 20 min", startsIn: 20, place: "Sørmarka", lat: 58.917, lng: 5.755, going: ["milo", "bella"], max: 6, pace: "Høy energi", note: "Milo har masse energi og trenger noen å løpe med." },
  { id: "m3", kommuneId: "stavanger", type: "valp", title: "Valpetreff med sosialisering", host: "frida", when: "I dag 17:30", startsIn: 150, place: "Tjensvoll", lat: 58.93, lng: 5.71, going: ["frida", "max", "nala", "luna"], max: 10, pace: "Rolig", note: "For valper under 1 år. Vi øver på hilsing og ro." },
  { id: "m4", kommuneId: "stavanger", type: "trening", title: "Innkallingstrening på langline", host: "nala", when: "I kveld 19:00", startsIn: 240, place: "Madlamark", lat: 58.955, lng: 5.68, going: ["nala"], max: 5, pace: "Middels", note: "Ta med godbiter og langline. Vi bytter på å være forstyrrelse." },
  { id: "m5", kommuneId: "stavanger", type: "kafe", title: "Kaffe og kos i sentrum", host: "max", when: "I morgen 11:00", startsIn: 1200, place: "Stavanger sentrum", lat: 58.97, lng: 5.733, going: ["max", "luna"], max: 8, pace: "Rolig", note: "Vi finner et sted med uteservering og vannskål." },
];

export const groups = [
  { id: "g1", kommuneId: "stavanger", name: "Schæfer Rogaland", about: "For alle med schæfer og schæfer-interesse i Rogaland.", members: 482, photo: PHOTO.balto, tag: "Rase", color: "blue", activeNow: 12, faces: ["balto", "odin", "luna"] },
  { id: "g2", kommuneId: "stavanger", name: "Valper Stavanger", about: "For valpeeiere og deg som venter valp. Tips, treff og trygg sosialisering.", members: 1104, photo: PHOTO.puppies, tag: "Valp", color: "mint", activeNow: 31, faces: ["frida", "milo", "max"] },
  { id: "g3", kommuneId: "stavanger", name: "Små hunder", about: "Chihuahua, pomeranian, fransk bulldog og flere. Lek på egne premisser.", members: 689, photo: PHOTO.pug, tag: "Rase", color: "sun", activeNow: 8, faces: ["max", "bella", "nala"] },
  { id: "g4", kommuneId: "stavanger", name: "Fjelltur med hund", about: "Turglade hunder og eiere som elsker fjell, vidde og lange dager ute.", members: 1432, photo: PHOTO.moor, tag: "Aktivitet", color: "violet", activeNow: 19, faces: ["odin", "balto", "milo"] },
  { id: "g5", kommuneId: "stavanger", name: "Storhaug hundevenner", about: "Nabolagsgruppa for Storhaug. Lån hundepass, del tips og gå tur sammen.", members: 236, photo: PHOTO.corgis, tag: "Lokalt", color: "coral", activeNow: 5, faces: ["nala", "max", "frida"] },
  { id: "g6", kommuneId: "stavanger", name: "Badehunder Jæren", about: "Strand, bølger og våte poter hele året.", members: 518, photo: PHOTO.beach, tag: "Aktivitet", color: "blue", activeNow: 14, faces: ["luna", "frida", "bella"] },
];

export const events = [
  { id: "e1", kommuneId: "stavanger", day: "27", month: "sep", weekday: "Fre", time: "18:30", title: "Kveldstur til Mosvatnet", place: "Mosvatnet", photo: PHOTO.lake, going: 12, tag: "Tur", host: "Stavanger Hundesirkel", about: "En rolig fellestur rundt vannet i solnedgang. Vi møtes ved Tjodhallen og går i samlet tempo. Perfekt for nye i byen.", faces: ["luna", "balto", "nala"], program: [["18:30", "Oppmøte ved Tjodhallen"], ["18:45", "Vi går den store runden"], ["19:45", "Kaffe og kos ved kiosken"]] },
  { id: "e2", kommuneId: "stavanger", day: "29", month: "sep", weekday: "Søn", time: "12:00", title: "Valpetreff på Hundvåg", place: "Hundvåg", photo: PHOTO.puppies, going: 8, tag: "Valp", host: "Valper Stavanger", about: "Trygg sosialisering for valper under ett år, med hundetrener til stede.", faces: ["frida", "milo", "max"], program: [["12:00", "Hilserunde i små grupper"], ["12:30", "Lek og miljøtrening"], ["13:15", "Spørsmål til trener"]] },
  { id: "e3", kommuneId: "stavanger", day: "4", month: "okt", weekday: "Lør", time: "10:00", title: "Fjelltur til Dalsnuten", place: "Dalsnuten", photo: PHOTO.peaks, going: 16, tag: "Fjell", host: "Fjelltur med hund", about: "Klassikeren på Jæren. Moderat stigning, flott utsikt og matpakke på toppen.", faces: ["odin", "balto", "milo"], program: [["10:00", "Oppmøte Gramstad parkering"], ["11:15", "Matpause på toppen"], ["12:30", "Ned via Fjogstadnuten"]] },
  { id: "e4", kommuneId: "stavanger", day: "12", month: "okt", weekday: "Lør", time: "13:00", title: "Høstbad og grill på Sola", place: "Sola strand", photo: PHOTO.beach, going: 21, tag: "Sosialt", host: "Badehunder Jæren", about: "Årets siste strandtreff! Vi fyrer opp grillen og lar hundene bade.", faces: ["luna", "frida", "bella"], program: [["13:00", "Oppmøte ved kiosken"], ["13:30", "Bading og lek"], ["15:00", "Grill"]] },
];

export const conversations = [
  { id: 1, dog: "luna", preview: "Vi kan møtes ved Mosvatnet kl. 18 😊", unread: 2 },
  { id: 2, dog: "balto", preview: "Balto elsker den ruta!", unread: 0 },
  { id: 3, dog: "milo", preview: "Passer torsdag for dere?", unread: 1 },
];

export const initialMessages = {
  1: [{ me: false, t: "Hei! Så treffet ditt 👋" }, { me: false, t: "Vi kan møtes ved Mosvatnet kl. 18 😊" }],
  2: [{ me: true, t: "Takk for turen sist!" }, { me: false, t: "Balto elsker den ruta!" }],
  3: [{ me: false, t: "Hei! Milo er ledig for lek denne uka." }, { me: false, t: "Passer torsdag for dere?" }],
};

export const notifications = [
  { id: 1, icon: "heart", color: "coral", dog: "luna", text: "Luna vil bli turvenn", meta: "94 % match · 8 min" },
  { id: 2, icon: "users", color: "blue", dog: "milo", text: "Milo inviterte deg til lek i Sørmarka", meta: "Om 20 min" },
  { id: 3, icon: "calendar", color: "mint", text: "Kveldstur til Mosvatnet starter om to timer", meta: "I dag 18:30" },
];

/** Demo-toppliste. Vises kun i demo-modus, og kun når terskelen er nådd. */
export const leaderboard = [
  { rank: 1, dog: "luna", km: 42.8 },
  { rank: 2, dog: "balto", km: 39.4 },
  { rank: 3, dog: "odin", km: 31.7 },
  { rank: 4, dog: "milo", km: 28.2 },
  { rank: 5, dog: "nala", km: 24.5 },
];

/** Demo-profil, slik en etablert bruker ser ut. Kun i demo-modus. */
export const demoProfile = {
  dogName: "Santos",
  breed: "Schæfer",
  age: "3 år",
  photo: PHOTO.balto,
  streak: 18,
  totalKm: 812,
  totalWalks: 243,
  paws: 2840,
  weekKm: 18.6,
  weekWalks: 4,
};
