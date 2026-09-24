// Demo-data for Potesjarm-prototypen. Byttes ut med Supabase når prosjektet er aktivt igjen.

export const img = (id, w = 900, h) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=80`;

export const PHOTO = {
  hero: "1612774412771-005ed8e861d2",
  luna: "1558788353-f76d92427f16",
  balto: "1589941013453-ec89f33b5e95",
  milo: "1587300003388-59208cc962cb",
  nala: "1543466835-00a7907e9de1",
  max: "1537151625747-768eb6cf92b2",
  bella: "1561037404-61cd46aa615b",
  odin: "1491604612772-6853927639ef",
  frida: "1591160690555-5debfba289f0",
  kaja: "1534361960057-19889db9621e",
  bamse: "1510771463146-e89e6e86560e",
  pug: "1517849845537-4d257902454a",
  trail: "1544568100-847a948585b9",
  duo: "1548199973-03cce0bbc87b",
  beach: "1530281700549-e82e7bf110d6",
  puppies: "1444212477490-ca407925329e",
  pack: "1494947665470-20322015e3a8",
  ball: "1508948956644-0017e845d797",
  moor: "1605897472359-85e4b94d685d",
  lake: "1501785888041-af3ef285b470",
  fjord: "1476514525535-07fb3b4ae5f1",
  peaks: "1506905925346-21bda4d32df4",
  hills: "1469474968028-56623f02e42e",
  hug: "1522276498395-f4f68f7f8454",
  corgis: "1551717743-49959800b1f6",
};

export const ME = { owner: "Michael", dog: "Santos", breed: "Schæfer", age: "3 år", photo: PHOTO.balto };

export const cities = ["Stavanger", "Sandnes", "Bergen", "Oslo", "Trondheim", "Kristiansand"];

export const areasByCity = {
  Stavanger: ["Mosvatnet", "Madla", "Tjensvoll", "Hundvåg", "Storhaug", "Sørmarka"],
  Sandnes: ["Sandvedparken", "Dalsnuten", "Lura", "Hana", "Riska", "Sentrum"],
  Bergen: ["Fløyen", "Nordnes", "Fana", "Laksevåg", "Møhlenpris", "Sandviken"],
  Oslo: ["Frognerparken", "Grünerløkka", "Sognsvann", "Bygdøy", "Tøyen", "Nordmarka"],
  Trondheim: ["Bymarka", "Lade", "Øya", "Byåsen", "Bakklandet", "Estenstadmarka"],
  Kristiansand: ["Baneheia", "Bystranda", "Odderøya", "Lund", "Vågsbygd", "Ravnedalen"],
};

// Hunder i nabolaget. `ring` styrer farge på historie-ringen.
export const dogs = [
  { id: "luna", name: "Luna", owner: "Lise", breed: "Golden retriever", age: "2 år", km: 1.2, photo: PHOTO.luna, ring: "coral", online: true, match: 94, energy: 4, size: "Stor", play: ["Apportering", "Bading"], streak: 28, story: "Morgenbad i Mosvatnet" },
  { id: "balto", name: "Balto", owner: "Anders", breed: "Schæfer", age: "5 år", km: 2.8, photo: PHOTO.balto, ring: "blue", online: true, match: 91, energy: 5, size: "Stor", play: ["Røff lek", "Fjelltur"], streak: 41, story: "Toppen av Dalsnuten!" },
  { id: "milo", name: "Milo", owner: "Kari", breed: "Australian shepherd", age: "1 år", km: 3.4, photo: PHOTO.milo, ring: "mint", online: true, match: 88, energy: 5, size: "Medium", play: ["Løping", "Triks"], streak: 16, story: "Valpekurs dag 3" },
  { id: "nala", name: "Nala", owner: "Henrik", breed: "Beagle", age: "3 år", km: 0.9, photo: PHOTO.nala, ring: "sun", online: true, match: 86, energy: 3, size: "Medium", play: ["Snusing", "Rolig lek"], streak: 11, story: "Fant noe spennende…" },
  { id: "max", name: "Max", owner: "Siri", breed: "Corgi", age: "4 år", km: 1.8, photo: PHOTO.max, ring: "violet", online: true, match: 82, energy: 3, size: "Liten", play: ["Rolig lek", "Kos"], streak: 9, story: "Bytur i sentrum" },
  { id: "bella", name: "Bella", owner: "Ingrid", breed: "Jack russell", age: "2 år", km: 2.1, photo: PHOTO.bella, ring: "coral", online: false, match: 79, energy: 5, size: "Liten", play: ["Apportering", "Løping"], streak: 22, story: "Hundvåg i sola" },
  { id: "odin", name: "Odin", owner: "Jonas", breed: "Husky", age: "6 år", km: 4.2, photo: PHOTO.odin, ring: "blue", online: true, match: 77, energy: 5, size: "Stor", play: ["Løping", "Sledetrekk"], streak: 34, story: "Ullandhaug-runden" },
  { id: "frida", name: "Frida", owner: "Emma", breed: "Golden retriever", age: "8 mnd", km: 1.5, photo: PHOTO.frida, ring: "mint", online: true, match: 90, energy: 4, size: "Medium", play: ["Valpelek", "Bading"], streak: 6, story: "Første gang på stranda" },
];

export const stories = dogs.map((d) => ({ dogId: d.id, caption: d.story, photo: d.photo }));

export const feed = [
  { id: 1, kind: "photo", author: "Emma & Frida", avatar: PHOTO.frida, time: "2 t siden", place: "Mosvatnet", photo: PHOTO.trail, text: "Magisk kveldstur ved Mosvatnet! 🧡", likes: 42, comments: 6 },
  { id: 2, kind: "walk", author: "Anders & Balto", avatar: PHOTO.balto, time: "3 t siden", place: "Dalsnuten", km: 5.4, minutes: 96, elevation: 318, text: "Endelig toppen igjen. Balto var ustoppelig i dag.", likes: 64, comments: 9, kudos: ["luna", "milo", "nala"] },
  { id: 3, kind: "photo", author: "Daniel & Nala", avatar: PHOTO.nala, time: "4 t siden", place: "Hundvåg", photo: PHOTO.duo, text: "Helgegjengen på Hundvåg strand 🌊", likes: 28, comments: 4 },
  { id: 4, kind: "group", author: "Stavanger Hundesirkel", avatar: PHOTO.puppies, time: "1 d siden", place: "Sørmarka", photo: PHOTO.pack, sticker: "Ny turgjeng!", title: "Søndagstur i Sørmarka", text: "Bli med på en rolig fellestur for store og små. Alle er velkomne!", likes: 56, comments: 12 },
  { id: 5, kind: "photo", author: "Lise & Luna", avatar: PHOTO.luna, time: "1 d siden", place: "Sola strand", photo: PHOTO.beach, text: "Luna har oppdaget at bølger er det beste som finnes.", likes: 91, comments: 15 },
  { id: 6, kind: "photo", author: "Kari & Milo", avatar: PHOTO.milo, time: "2 d siden", place: "Tjensvoll", photo: PHOTO.ball, text: "Ballen er livet. Noen som vil trene innkalling sammen?", likes: 37, comments: 8 },
];

export const initialComments = {
  1: [{ name: "Kari & Milo", avatar: PHOTO.milo, text: "Åå, så fint der!" }, { name: "Henrik & Nala", avatar: PHOTO.nala, text: "Vi må bli med neste gang." }],
  2: [{ name: "Lise & Luna", avatar: PHOTO.luna, text: "Rått! Hvor lang tid brukte dere opp?" }],
  3: [{ name: "Emma & Frida", avatar: PHOTO.frida, text: "Frida vil også på stranda 😍" }],
};

// Nå skjer: spontane, lokale treff.
export const meetupTypes = [
  { id: "tur", label: "Tur", icon: "walk", color: "blue" },
  { id: "lek", label: "Lek", icon: "ball", color: "coral" },
  { id: "trening", label: "Trening", icon: "target", color: "violet" },
  { id: "valp", label: "Valpetreff", icon: "sprout", color: "mint" },
  { id: "kafe", label: "Kafé", icon: "coffee", color: "sun" },
];

export const meetups = [
  { id: "m1", type: "tur", title: "Tur rundt Mosvatnet", host: "balto", when: "Nå", startsIn: 0, place: "Mosvatnet, hovedinngang", km: 1.2, going: ["balto", "luna", "nala"], max: 8, pace: "Rolig", note: "Vi går den store runden, ca. 45 min. Alle størrelser velkommen." },
  { id: "m2", type: "lek", title: "Lekekamerat i hundeparken?", host: "milo", when: "Om 20 min", startsIn: 20, place: "Sørmarka hundepark", km: 2.4, going: ["milo", "bella"], max: 6, pace: "Høy energi", note: "Milo har masse energi og trenger noen å løpe med." },
  { id: "m3", type: "valp", title: "Valpetreff med sosialisering", host: "frida", when: "I dag 17:30", startsIn: 150, place: "Tjensvoll ballbinge", km: 1.5, going: ["frida", "max", "nala", "luna"], max: 10, pace: "Rolig", note: "For valper under 1 år. Vi øver på hilsing og ro." },
  { id: "m4", type: "trening", title: "Innkallingstrening på langline", host: "nala", when: "I kveld 19:00", startsIn: 240, place: "Madlamark", km: 0.9, going: ["nala"], max: 5, pace: "Middels", note: "Ta med godbiter og langline. Vi bytter på å være forstyrrelse." },
  { id: "m5", type: "kafe", title: "Kaffe og kos på Potevenn", host: "max", when: "I morgen 11:00", startsIn: 1200, place: "Potevenn Kafé, sentrum", km: 0.8, going: ["max", "luna"], max: 8, pace: "Rolig", note: "Hundevennlig kafé med vannskåler og godbiter." },
];

export const groups = [
  { id: "g1", name: "Schæfer Rogaland", about: "For alle med schæfer og schæfer-interesse i Rogaland.", members: 482, photo: PHOTO.balto, tag: "Rase", color: "blue", activeNow: 12, faces: ["balto", "odin", "luna"] },
  { id: "g2", name: "Valper Stavanger", about: "For valpeeiere og deg som venter valp. Tips, treff og trygg sosialisering.", members: 1104, photo: PHOTO.puppies, tag: "Valp", color: "mint", activeNow: 31, faces: ["frida", "milo", "max"] },
  { id: "g3", name: "Små hunder", about: "Chihuahua, pomeranian, fransk bulldog og flere. Lek på egne premisser.", members: 689, photo: PHOTO.pug, tag: "Rase", color: "sun", activeNow: 8, faces: ["max", "bella", "nala"] },
  { id: "g4", name: "Fjelltur med hund", about: "Turglade hunder og eiere som elsker fjell, vidde og lange dager ute.", members: 1432, photo: PHOTO.moor, tag: "Aktivitet", color: "violet", activeNow: 19, faces: ["odin", "balto", "milo"] },
  { id: "g5", name: "Storhaug hundevenner", about: "Nabolagsgruppa for Storhaug. Lån hundepass, del tips og gå tur sammen.", members: 236, photo: PHOTO.corgis, tag: "Lokalt", color: "coral", activeNow: 5, faces: ["nala", "max", "frida"] },
  { id: "g6", name: "Badehunder Jæren", about: "Strand, bølger og våte poter hele året.", members: 518, photo: PHOTO.beach, tag: "Aktivitet", color: "blue", activeNow: 14, faces: ["luna", "frida", "bella"] },
];

export const events = [
  { id: "e1", day: "27", month: "sep", weekday: "Fre", time: "18:30", title: "Kveldstur til Mosvatnet", place: "Mosvatnet", photo: PHOTO.lake, going: 12, tag: "Tur", host: "Stavanger Hundesirkel", about: "En rolig fellestur rundt vannet i solnedgang. Vi møtes ved Tjodhallen og går i samlet tempo. Perfekt for nye i byen.", faces: ["luna", "balto", "nala"], program: [["18:30", "Oppmøte ved Tjodhallen"], ["18:45", "Vi går den store runden"], ["19:45", "Kaffe og kos ved kiosken"]] },
  { id: "e2", day: "29", month: "sep", weekday: "Søn", time: "12:00", title: "Valpetreff på Hundvåg", place: "Hundvåg", photo: PHOTO.puppies, going: 8, tag: "Valp", host: "Valper Stavanger", about: "Trygg sosialisering for valper under ett år, med hundetrener til stede.", faces: ["frida", "milo", "max"], program: [["12:00", "Hilserunde i små grupper"], ["12:30", "Lek og miljøtrening"], ["13:15", "Spørsmål til trener"]] },
  { id: "e3", day: "4", month: "okt", weekday: "Lør", time: "10:00", title: "Fjelltur til Dalsnuten", place: "Dalsnuten", photo: PHOTO.peaks, going: 16, tag: "Fjell", host: "Fjelltur med hund", about: "Klassikeren på Jæren. Moderat stigning, flott utsikt og matpakke på toppen.", faces: ["odin", "balto", "milo"], program: [["10:00", "Oppmøte Gramstad parkering"], ["11:15", "Matpause på toppen"], ["12:30", "Ned via Fjogstadnuten"]] },
  { id: "e4", day: "12", month: "okt", weekday: "Lør", time: "13:00", title: "Høstbad og grill på Sola", place: "Sola strand", photo: PHOTO.beach, going: 21, tag: "Sosialt", host: "Badehunder Jæren", about: "Årets siste strandtreff! Vi fyrer opp grillen og lar hundene bade.", faces: ["luna", "frida", "bella"], program: [["13:00", "Oppmøte ved kiosken"], ["13:30", "Bading og lek"], ["15:00", "Grill"]] },
];

export const places = [
  { id: 1, name: "Mosvatnet", type: "Tursti", rating: 4.8, km: 1.2, tags: ["Vann", "Bånd"], icon: "trees", color: "mint", photo: PHOTO.lake },
  { id: 2, name: "Sørmarka hundepark", type: "Hundepark", rating: 4.6, km: 2.4, tags: ["Inngjerdet", "Lek"], icon: "ball", color: "coral", photo: PHOTO.ball },
  { id: 3, name: "Sola hundestrand", type: "Strand", rating: 4.9, km: 11, tags: ["Bad", "Løs hund"], icon: "waves", color: "blue", photo: PHOTO.beach },
  { id: 4, name: "Potevenn Kafé", type: "Hundevennlig", rating: 4.7, km: 0.8, tags: ["Inne", "Vannskål"], icon: "coffee", color: "sun", photo: PHOTO.corgis },
];

export const routes = [
  { id: 1, title: "Mosvatnet rundt", km: 3.2, time: "42 min", level: "Lett", saves: 128, photo: PHOTO.lake, path: "M10 60 C 30 20, 70 10, 90 35 S 80 85, 50 80 S 5 80, 10 60" },
  { id: 2, title: "Dalsnuten med hund", km: 5.7, time: "1 t 35 min", level: "Moderat", saves: 94, photo: PHOTO.peaks, path: "M8 80 L 30 62 L 42 66 L 60 30 L 72 38 L 92 12" },
  { id: 3, title: "Sola strandrunde", km: 4.4, time: "58 min", level: "Lett", saves: 76, photo: PHOTO.beach, path: "M6 30 C 30 40, 50 20, 70 34 S 92 60, 94 78" },
];

export const leaderboard = [
  { rank: 1, dog: "luna", km: 42.8 },
  { rank: 2, dog: "balto", km: 39.4 },
  { rank: 3, dog: "santos", km: 36.9 },
  { rank: 4, dog: "milo", km: 31.7 },
  { rank: 5, dog: "odin", km: 29.2 },
  { rank: 6, dog: "nala", km: 24.5 },
];

export const challenges = [
  { id: "places", title: "Utforsk 5 nye tursteder", progress: 3, target: 5, reward: "Fjellpote", icon: "pin", end: "2 dager igjen", color: "coral" },
  { id: "distance", title: "Gå 25 km denne uka", progress: 18.6, target: 25, unit: "km", reward: "Ukeshelt", icon: "flame", end: "3 dager igjen", color: "blue" },
  { id: "social", title: "Gå tur med 3 nye hunder", progress: 1, target: 3, reward: "Flokkleder", icon: "users", end: "5 dager igjen", color: "mint" },
];

export const badges = [
  { id: "fjell", name: "Fjellpote", status: "done", icon: "mountain", color: "blue" },
  { id: "regn", name: "Regnkriger", status: "done", icon: "rain", color: "violet" },
  { id: "streak14", name: "14 dager", status: "done", icon: "flame", color: "coral" },
  { id: "natt", name: "Nattugle", status: "8/10", icon: "moon", color: "violet", pct: 80 },
  { id: "bad", name: "Badehund", status: "2/5", icon: "waves", color: "blue", pct: 40 },
  { id: "utforsk", name: "Utforsker", status: "12/20", icon: "compass", color: "mint", pct: 60 },
  { id: "100", name: "100 km", status: "82/100", icon: "trophy", color: "sun", pct: 82 },
  { id: "vinter", name: "Vinterpote", status: "Låst", icon: "snow", color: "muted", pct: 0 },
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
  { id: 1, icon: "heart", color: "coral", dog: "luna", text: "Luna vil bli turvenn med Santos", meta: "94 % match · 8 min" },
  { id: 2, icon: "flame", color: "sun", text: "18 dager på rad! Én tur i dag holder streaken i live.", meta: "I dag" },
  { id: 3, icon: "users", color: "blue", dog: "milo", text: "Milo inviterte deg til lek i Sørmarka hundepark", meta: "Om 20 min · 2,4 km" },
  { id: 4, icon: "trophy", color: "mint", text: "Du er nr. 3 i Stavanger denne uka", meta: "Aktivitet" },
];

export const dogById = (id) => (id === "santos" ? { id: "santos", name: ME.dog, owner: ME.owner, breed: ME.breed, age: ME.age, photo: ME.photo } : dogs.find((d) => d.id === id));

export const fmtKm = (n) => n.toLocaleString("nb-NO", { maximumFractionDigits: 1, minimumFractionDigits: n < 10 && n % 1 ? 1 : 0 });
