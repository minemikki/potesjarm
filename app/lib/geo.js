/* =========================================================================
   Norsk geografi for Potesjarm.

   Hele Norge skal være støttet teknisk fra dag 1, selv om vi bare bygger
   community aktivt by for by. Hierarkiet er:

     fylke → kommune → område/bydel → radius rundt brukeren

   VIKTIG FØR LANSERING:
   Lista under dekker alle 15 fylker og de aller fleste kommunene, men er
   skrevet for hånd og MÅ verifiseres mot offisielle kilder før vi går live:
     - SSB klassifikasjon av kommuner (klass.ssb.no/klassifikasjoner/131)
     - Kartverket / Geonorge for koordinater og stedsnavn
   Norge har 357 kommuner (per 2024). Der lista mangler noe, lar vi brukeren
   søke fritt og melde fra – vi later aldri som om et sted ikke finnes.

   Koordinatene er omtrentlige kommunesentre og brukes til avstand/radius,
   ikke til navigasjon.
   ========================================================================= */

// ---------------------------------------------------------------------------
// Fylker (per 1. januar 2024, etter at flere sammenslåinger ble reversert)
// ---------------------------------------------------------------------------
export const fylker = [
  { id: "oslo", name: "Oslo" },
  { id: "akershus", name: "Akershus" },
  { id: "ostfold", name: "Østfold" },
  { id: "buskerud", name: "Buskerud" },
  { id: "innlandet", name: "Innlandet" },
  { id: "vestfold", name: "Vestfold" },
  { id: "telemark", name: "Telemark" },
  { id: "agder", name: "Agder" },
  { id: "rogaland", name: "Rogaland" },
  { id: "vestland", name: "Vestland" },
  { id: "moreromsdal", name: "Møre og Romsdal" },
  { id: "trondelag", name: "Trøndelag" },
  { id: "nordland", name: "Nordland" },
  { id: "troms", name: "Troms" },
  { id: "finnmark", name: "Finnmark" },
];

// ---------------------------------------------------------------------------
// Kommuner. [id, navn, fylke, lat, lng]
// ---------------------------------------------------------------------------
const K = [
  // Oslo
  ["oslo", "Oslo", "oslo", 59.913, 10.739],

  // Akershus
  ["barum", "Bærum", "akershus", 59.89, 10.52],
  ["asker", "Asker", "akershus", 59.834, 10.435],
  ["lillestrom", "Lillestrøm", "akershus", 59.956, 11.049],
  ["nordrefollo", "Nordre Follo", "akershus", 59.79, 10.83],
  ["ullensaker", "Ullensaker", "akershus", 60.144, 11.174],
  ["as", "Ås", "akershus", 59.665, 10.788],
  ["frogn", "Frogn", "akershus", 59.667, 10.63],
  ["nesodden", "Nesodden", "akershus", 59.815, 10.655],
  ["vestby", "Vestby", "akershus", 59.596, 10.749],
  ["nittedal", "Nittedal", "akershus", 60.05, 10.88],
  ["lorenskog", "Lørenskog", "akershus", 59.928, 10.964],
  ["radoy", "Rælingen", "akershus", 59.925, 11.03],
  ["enebakk", "Enebakk", "akershus", 59.766, 11.14],
  ["aurskogholand", "Aurskog-Høland", "akershus", 59.85, 11.45],
  ["nes", "Nes", "akershus", 60.12, 11.48],
  ["eidsvoll", "Eidsvoll", "akershus", 60.33, 11.26],
  ["hurdal", "Hurdal", "akershus", 60.42, 11.07],
  ["nannestad", "Nannestad", "akershus", 60.21, 11.02],
  ["gjerdrum", "Gjerdrum", "akershus", 60.07, 11.05],
  ["lunner", "Lunner", "akershus", 60.29, 10.59],
  ["jevnaker", "Jevnaker", "akershus", 60.24, 10.39],

  // Østfold
  ["fredrikstad", "Fredrikstad", "ostfold", 59.221, 10.934],
  ["sarpsborg", "Sarpsborg", "ostfold", 59.284, 11.109],
  ["moss", "Moss", "ostfold", 59.434, 10.658],
  ["halden", "Halden", "ostfold", 59.124, 11.388],
  ["indreostfold", "Indre Østfold", "ostfold", 59.55, 11.18],
  ["rakkestad", "Rakkestad", "ostfold", 59.427, 11.343],
  ["rade", "Råde", "ostfold", 59.35, 10.86],
  ["valer", "Våler", "ostfold", 59.47, 10.95],
  ["skiptvet", "Skiptvet", "ostfold", 59.47, 11.17],
  ["marker", "Marker", "ostfold", 59.48, 11.68],
  ["hvaler", "Hvaler", "ostfold", 59.05, 11.02],
  ["aremark", "Aremark", "ostfold", 59.25, 11.7],

  // Buskerud
  ["drammen", "Drammen", "buskerud", 59.744, 10.204],
  ["kongsberg", "Kongsberg", "buskerud", 59.666, 9.65],
  ["ringerike", "Ringerike", "buskerud", 60.17, 10.26],
  ["ovreeiker", "Øvre Eiker", "buskerud", 59.75, 9.93],
  ["nedreeiker", "Lier", "buskerud", 59.79, 10.25],
  ["modum", "Modum", "buskerud", 59.88, 9.93],
  ["holbu", "Hole", "buskerud", 60.07, 10.27],
  ["flesberg", "Flesberg", "buskerud", 59.85, 9.47],
  ["rollag", "Rollag", "buskerud", 60.03, 9.33],
  ["nore", "Nore og Uvdal", "buskerud", 60.17, 9.0],
  ["sigdal", "Sigdal", "buskerud", 60.05, 9.65],
  ["krodsherad", "Krødsherad", "buskerud", 60.17, 9.8],
  ["flaa", "Flå", "buskerud", 60.42, 9.47],
  ["nesbuskerud", "Nesbyen", "buskerud", 60.57, 9.1],
  ["gol", "Gol", "buskerud", 60.7, 8.95],
  ["hemsedal", "Hemsedal", "buskerud", 60.86, 8.55],
  ["al", "Ål", "buskerud", 60.63, 8.56],
  ["hol", "Hol", "buskerud", 60.61, 8.31],

  // Innlandet
  ["hamar", "Hamar", "innlandet", 60.795, 11.068],
  ["lillehammer", "Lillehammer", "innlandet", 61.115, 10.466],
  ["gjovik", "Gjøvik", "innlandet", 60.796, 10.692],
  ["elverum", "Elverum", "innlandet", 60.881, 11.562],
  ["ringsaker", "Ringsaker", "innlandet", 60.92, 10.96],
  ["stange", "Stange", "innlandet", 60.72, 11.19],
  ["kongsvinger", "Kongsvinger", "innlandet", 60.19, 11.99],
  ["nordreland", "Nordre Land", "innlandet", 60.85, 10.0],
  ["sondreland", "Søndre Land", "innlandet", 60.72, 10.3],
  ["ostretoten", "Østre Toten", "innlandet", 60.68, 10.87],
  ["vestretoten", "Vestre Toten", "innlandet", 60.68, 10.65],
  ["gran", "Gran", "innlandet", 60.39, 10.56],
  ["sorodal", "Sør-Odal", "innlandet", 60.19, 11.65],
  ["nordodal", "Nord-Odal", "innlandet", 60.42, 11.55],
  ["eidskog", "Eidskog", "innlandet", 60.0, 12.1],
  ["grue", "Grue", "innlandet", 60.47, 12.03],
  ["asnes", "Åsnes", "innlandet", 60.62, 12.0],
  ["valerinn", "Våler", "innlandet", 60.75, 11.8],
  ["trysil", "Trysil", "innlandet", 61.31, 12.29],
  ["engerdal", "Engerdal", "innlandet", 61.76, 11.95],
  ["amot", "Åmot", "innlandet", 61.13, 11.35],
  ["stor", "Stor-Elvdal", "innlandet", 61.45, 11.1],
  ["rendalen", "Rendalen", "innlandet", 61.9, 11.07],
  ["tolga", "Tolga", "innlandet", 62.42, 11.0],
  ["tynset", "Tynset", "innlandet", 62.28, 10.78],
  ["alvdal", "Alvdal", "innlandet", 62.11, 10.63],
  ["folldal", "Folldal", "innlandet", 62.13, 10.0],
  ["os", "Os", "innlandet", 62.5, 11.23],
  ["dovre", "Dovre", "innlandet", 62.07, 9.25],
  ["lesja", "Lesja", "innlandet", 62.12, 8.86],
  ["skjak", "Skjåk", "innlandet", 61.88, 8.58],
  ["lom", "Lom", "innlandet", 61.84, 8.57],
  ["vaga", "Vågå", "innlandet", 61.88, 9.1],
  ["nordfron", "Nord-Fron", "innlandet", 61.58, 9.7],
  ["sorfron", "Sør-Fron", "innlandet", 61.5, 9.9],
  ["ringebu", "Ringebu", "innlandet", 61.53, 10.14],
  ["oyer", "Øyer", "innlandet", 61.27, 10.4],
  ["gausdal", "Gausdal", "innlandet", 61.22, 10.15],
  ["sel", "Sel", "innlandet", 61.9, 9.53],
  ["vestreslidre", "Vestre Slidre", "innlandet", 61.12, 8.93],
  ["ostreslidre", "Øystre Slidre", "innlandet", 61.18, 9.07],
  ["nordaurdal", "Nord-Aurdal", "innlandet", 60.92, 9.28],
  ["soraurdal", "Sør-Aurdal", "innlandet", 60.72, 9.5],
  ["etnedal", "Etnedal", "innlandet", 60.87, 9.6],
  ["vang", "Vang", "innlandet", 61.12, 8.57],

  // Vestfold
  ["tonsberg", "Tønsberg", "vestfold", 59.267, 10.408],
  ["sandefjord", "Sandefjord", "vestfold", 59.132, 10.225],
  ["larvik", "Larvik", "vestfold", 59.054, 10.028],
  ["horten", "Horten", "vestfold", 59.417, 10.485],
  ["holmestrand", "Holmestrand", "vestfold", 59.489, 10.314],
  ["faerder", "Færder", "vestfold", 59.12, 10.42],

  // Telemark
  ["skien", "Skien", "telemark", 59.209, 9.609],
  ["porsgrunn", "Porsgrunn", "telemark", 59.141, 9.656],
  ["notodden", "Notodden", "telemark", 59.559, 9.259],
  ["bamble", "Bamble", "telemark", 59.03, 9.6],
  ["kragero", "Kragerø", "telemark", 58.868, 9.411],
  ["midttelemark", "Midt-Telemark", "telemark", 59.38, 9.05],
  ["tinn", "Tinn", "telemark", 59.88, 8.98],
  ["seljord", "Seljord", "telemark", 59.48, 8.62],
  ["kviteseid", "Kviteseid", "telemark", 59.4, 8.5],
  ["nissedal", "Nissedal", "telemark", 59.03, 8.52],
  ["fyresdal", "Fyresdal", "telemark", 59.18, 8.1],
  ["tokke", "Tokke", "telemark", 59.55, 8.2],
  ["vinje", "Vinje", "telemark", 59.57, 7.98],
  ["hjartdal", "Hjartdal", "telemark", 59.6, 8.85],
  ["siljan", "Siljan", "telemark", 59.3, 9.75],
  ["drangedal", "Drangedal", "telemark", 59.1, 9.05],

  // Agder
  ["kristiansand", "Kristiansand", "agder", 58.147, 7.996],
  ["arendal", "Arendal", "agder", 58.461, 8.772],
  ["grimstad", "Grimstad", "agder", 58.34, 8.593],
  ["mandal", "Lindesnes", "agder", 58.028, 7.456],
  ["farsund", "Farsund", "agder", 58.095, 6.804],
  ["flekkefjord", "Flekkefjord", "agder", 58.297, 6.66],
  ["lillesand", "Lillesand", "agder", 58.25, 8.38],
  ["vennesla", "Vennesla", "agder", 58.27, 7.97],
  ["songdalen", "Kvinesdal", "agder", 58.31, 6.96],
  ["risor", "Risør", "agder", 58.72, 9.23],
  ["tvedestrand", "Tvedestrand", "agder", 58.62, 8.93],
  ["froland", "Froland", "agder", 58.53, 8.63],
  ["birkenes", "Birkenes", "agder", 58.33, 8.23],
  ["iveland", "Iveland", "agder", 58.42, 7.93],
  ["evjehornnes", "Evje og Hornnes", "agder", 58.59, 7.81],
  ["bygland", "Bygland", "agder", 58.85, 7.8],
  ["valle", "Valle", "agder", 59.2, 7.53],
  ["bykle", "Bykle", "agder", 59.35, 7.35],
  ["aseral", "Åseral", "agder", 58.62, 7.42],
  ["hagebostad", "Hægebostad", "agder", 58.42, 7.22],
  ["lyngdal", "Lyngdal", "agder", 58.14, 7.07],
  ["sirdal", "Sirdal", "agder", 58.85, 6.87],
  ["gjerstad", "Gjerstad", "agder", 58.87, 9.0],
  ["amli", "Åmli", "agder", 58.77, 8.47],

  // Rogaland
  ["stavanger", "Stavanger", "rogaland", 58.97, 5.731],
  ["sandnes", "Sandnes", "rogaland", 58.852, 5.735],
  ["haugesund", "Haugesund", "rogaland", 59.413, 5.268],
  ["sola", "Sola", "rogaland", 58.888, 5.615],
  ["randaberg", "Randaberg", "rogaland", 59.0, 5.62],
  ["klepp", "Klepp", "rogaland", 58.78, 5.64],
  ["time", "Time", "rogaland", 58.74, 5.74],
  ["ha", "Hå", "rogaland", 58.62, 5.65],
  ["gjesdal", "Gjesdal", "rogaland", 58.76, 5.99],
  ["strand", "Strand", "rogaland", 59.05, 5.99],
  ["eigersund", "Eigersund", "rogaland", 58.45, 5.998],
  ["karmoy", "Karmøy", "rogaland", 59.28, 5.28],
  ["tysver", "Tysvær", "rogaland", 59.38, 5.57],
  ["vindafjord", "Vindafjord", "rogaland", 59.52, 5.9],
  ["suldal", "Suldal", "rogaland", 59.48, 6.42],
  ["hjelmeland", "Hjelmeland", "rogaland", 59.23, 6.18],
  ["sauda", "Sauda", "rogaland", 59.65, 6.35],
  ["lund", "Lund", "rogaland", 58.55, 6.42],
  ["sokndal", "Sokndal", "rogaland", 58.35, 6.28],
  ["bjerkreim", "Bjerkreim", "rogaland", 58.6, 6.0],
  ["bokn", "Bokn", "rogaland", 59.23, 5.45],
  ["utsira", "Utsira", "rogaland", 59.31, 4.88],
  ["kvitsoy", "Kvitsøy", "rogaland", 59.07, 5.43],

  // Vestland
  ["bergen", "Bergen", "vestland", 60.393, 5.325],
  ["alver", "Alver", "vestland", 60.55, 5.28],
  ["oygarden", "Øygarden", "vestland", 60.4, 5.05],
  ["askoy", "Askøy", "vestland", 60.47, 5.18],
  ["bjornafjorden", "Bjørnafjorden", "vestland", 60.19, 5.47],
  ["voss", "Voss", "vestland", 60.63, 6.42],
  ["forde", "Sunnfjord", "vestland", 61.452, 5.856],
  ["kinn", "Kinn", "vestland", 61.6, 5.03],
  ["stord", "Stord", "vestland", 59.78, 5.5],
  ["kvinnherad", "Kvinnherad", "vestland", 59.98, 6.0],
  ["os_vestland", "Osterøy", "vestland", 60.53, 5.52],
  ["fjell", "Bømlo", "vestland", 59.78, 5.22],
  ["sogndal", "Sogndal", "vestland", 61.23, 7.1],
  ["luster", "Luster", "vestland", 61.42, 7.4],
  ["laerdal", "Lærdal", "vestland", 61.1, 7.48],
  ["ardal", "Årdal", "vestland", 61.23, 7.7],
  ["aurland", "Aurland", "vestland", 60.9, 7.19],
  ["vik", "Vik", "vestland", 61.09, 6.58],
  ["hoyanger", "Høyanger", "vestland", 61.22, 6.07],
  ["gulen", "Gulen", "vestland", 60.98, 5.25],
  ["solund", "Solund", "vestland", 61.08, 4.83],
  ["hyllestad", "Hyllestad", "vestland", 61.17, 5.3],
  ["fjaler", "Fjaler", "vestland", 61.3, 5.32],
  ["askvoll", "Askvoll", "vestland", 61.35, 5.06],
  ["bremanger", "Bremanger", "vestland", 61.83, 5.13],
  ["stad", "Stad", "vestland", 62.03, 5.35],
  ["gloppen", "Gloppen", "vestland", 61.77, 6.23],
  ["stryn", "Stryn", "vestland", 61.91, 6.72],
  ["ullensvang", "Ullensvang", "vestland", 60.32, 6.65],
  ["ulvik", "Ulvik", "vestland", 60.57, 6.92],
  ["eidfjord", "Eidfjord", "vestland", 60.47, 7.07],
  ["kvam", "Kvam", "vestland", 60.38, 6.15],
  ["samnanger", "Samnanger", "vestland", 60.4, 5.85],
  ["vaksdal", "Vaksdal", "vestland", 60.48, 5.73],
  ["modalen", "Modalen", "vestland", 60.85, 5.9],
  ["masfjorden", "Masfjorden", "vestland", 60.85, 5.42],
  ["austrheim", "Austrheim", "vestland", 60.78, 4.93],
  ["fedje", "Fedje", "vestland", 60.78, 4.72],
  ["tysnes", "Tysnes", "vestland", 60.0, 5.6],
  ["fitjar", "Fitjar", "vestland", 59.92, 5.32],
  ["sveio", "Sveio", "vestland", 59.55, 5.35],
  ["etne", "Etne", "vestland", 59.67, 5.93],
  ["austevoll", "Austevoll", "vestland", 60.08, 5.22],
  ["hardanger", "Eidsvåg", "vestland", 60.42, 6.55],

  // Møre og Romsdal
  ["alesund", "Ålesund", "moreromsdal", 62.472, 6.155],
  ["molde", "Molde", "moreromsdal", 62.737, 7.161],
  ["kristiansund", "Kristiansund", "moreromsdal", 63.11, 7.73],
  ["ulstein", "Ulstein", "moreromsdal", 62.34, 5.85],
  ["volda", "Volda", "moreromsdal", 62.15, 6.07],
  ["orsta", "Ørsta", "moreromsdal", 62.2, 6.13],
  ["sula", "Sula", "moreromsdal", 62.42, 6.25],
  ["giske", "Giske", "moreromsdal", 62.52, 6.05],
  ["haram", "Haram", "moreromsdal", 62.62, 6.4],
  ["sykkylven", "Sykkylven", "moreromsdal", 62.38, 6.58],
  ["stranda", "Stranda", "moreromsdal", 62.31, 6.94],
  ["fjord", "Fjord", "moreromsdal", 62.28, 7.15],
  ["vestnes", "Vestnes", "moreromsdal", 62.63, 7.08],
  ["rauma", "Rauma", "moreromsdal", 62.57, 7.68],
  ["aukra", "Aukra", "moreromsdal", 62.8, 6.92],
  ["averoy", "Averøy", "moreromsdal", 63.05, 7.65],
  ["tingvoll", "Tingvoll", "moreromsdal", 62.91, 8.2],
  ["sunndal", "Sunndal", "moreromsdal", 62.68, 8.57],
  ["surnadal", "Surnadal", "moreromsdal", 62.97, 8.65],
  ["hustadvika", "Hustadvika", "moreromsdal", 62.88, 7.18],
  ["gjemnes", "Gjemnes", "moreromsdal", 62.87, 7.95],
  ["smola", "Smøla", "moreromsdal", 63.4, 8.0],
  ["aure", "Aure", "moreromsdal", 63.27, 8.53],
  ["heroy_mr", "Herøy", "moreromsdal", 62.35, 5.7],
  ["sande_mr", "Sande", "moreromsdal", 62.25, 5.48],
  ["vanylven", "Vanylven", "moreromsdal", 62.07, 5.63],
  ["hareid", "Hareid", "moreromsdal", 62.37, 6.02],

  // Trøndelag
  ["trondheim", "Trondheim", "trondelag", 63.43, 10.395],
  ["steinkjer", "Steinkjer", "trondelag", 64.015, 11.495],
  ["stjordal", "Stjørdal", "trondelag", 63.47, 10.92],
  ["levanger", "Levanger", "trondelag", 63.75, 11.3],
  ["verdal", "Verdal", "trondelag", 63.79, 11.48],
  ["namsos", "Namsos", "trondelag", 64.47, 11.5],
  ["malvik", "Malvik", "trondelag", 63.43, 10.67],
  ["melhus", "Melhus", "trondelag", 63.28, 10.28],
  ["skaun", "Skaun", "trondelag", 63.25, 10.15],
  ["orkland", "Orkland", "trondelag", 63.3, 9.85],
  ["indrefosen", "Indre Fosen", "trondelag", 63.6, 10.0],
  ["heim", "Heim", "trondelag", 63.35, 9.15],
  ["hitra", "Hitra", "trondelag", 63.57, 8.8],
  ["froya", "Frøya", "trondelag", 63.72, 8.67],
  ["orland", "Ørland", "trondelag", 63.7, 9.7],
  ["afjord", "Åfjord", "trondelag", 63.97, 10.22],
  ["osen", "Osen", "trondelag", 64.3, 10.53],
  ["roan", "Nærøysund", "trondelag", 64.87, 11.23],
  ["flatanger", "Flatanger", "trondelag", 64.5, 10.85],
  ["overhalla", "Overhalla", "trondelag", 64.48, 11.87],
  ["grong", "Grong", "trondelag", 64.47, 12.3],
  ["hoylandet", "Høylandet", "trondelag", 64.62, 12.28],
  ["snasa", "Snåsa", "trondelag", 64.25, 12.38],
  ["lierne", "Lierne", "trondelag", 64.43, 13.6],
  ["royrvik", "Røyrvik", "trondelag", 64.88, 13.57],
  ["namsskogan", "Namsskogan", "trondelag", 64.92, 13.18],
  ["inderoy", "Inderøy", "trondelag", 63.87, 11.28],
  ["meraker", "Meråker", "trondelag", 63.42, 11.75],
  ["selbu", "Selbu", "trondelag", 63.22, 11.03],
  ["tydal", "Tydal", "trondelag", 63.05, 11.55],
  ["holtalen", "Holtålen", "trondelag", 62.8, 11.13],
  ["roros", "Røros", "trondelag", 62.575, 11.383],
  ["midtregauldal", "Midtre Gauldal", "trondelag", 62.98, 10.32],
  ["rennebu", "Rennebu", "trondelag", 62.83, 9.87],
  ["oppdal", "Oppdal", "trondelag", 62.6, 9.68],
  ["rindal", "Rindal", "trondelag", 63.05, 9.2],

  // Nordland
  ["bodo", "Bodø", "nordland", 67.28, 14.405],
  ["narvik", "Narvik", "nordland", 68.438, 17.427],
  ["rana", "Rana", "nordland", 66.313, 14.142],
  ["vefsn", "Vefsn", "nordland", 65.83, 13.19],
  ["alstahaug", "Alstahaug", "nordland", 65.95, 12.5],
  ["vestvagoy", "Vestvågøy", "nordland", 68.2, 13.6],
  ["vagan", "Vågan", "nordland", 68.23, 14.57],
  ["hadsel", "Hadsel", "nordland", 68.55, 14.9],
  ["sortland", "Sortland", "nordland", 68.7, 15.42],
  ["andoy", "Andøy", "nordland", 69.32, 16.12],
  ["ojksnes", "Øksnes", "nordland", 68.85, 15.03],
  ["bo_nordland", "Bø", "nordland", 68.7, 14.65],
  ["flakstad", "Flakstad", "nordland", 68.1, 13.35],
  ["moskenes", "Moskenes", "nordland", 67.93, 13.0],
  ["vaeroy", "Værøy", "nordland", 67.67, 12.68],
  ["rost", "Røst", "nordland", 67.52, 12.1],
  ["fauske", "Fauske", "nordland", 67.26, 15.4],
  ["sorfold", "Sørfold", "nordland", 67.6, 15.6],
  ["steigen", "Steigen", "nordland", 67.93, 15.02],
  ["hamaroy", "Hamarøy", "nordland", 68.07, 15.68],
  ["saltdal", "Saltdal", "nordland", 67.1, 15.42],
  ["beiarn", "Beiarn", "nordland", 67.03, 14.67],
  ["gildeskal", "Gildeskål", "nordland", 67.0, 14.1],
  ["meloy", "Meløy", "nordland", 66.83, 13.65],
  ["rodoy", "Rødøy", "nordland", 66.68, 13.1],
  ["lurøy", "Lurøy", "nordland", 66.42, 12.95],
  ["traena", "Træna", "nordland", 66.5, 12.1],
  ["nesna", "Nesna", "nordland", 66.2, 13.02],
  ["hemnes", "Hemnes", "nordland", 66.07, 13.6],
  ["leirfjord", "Leirfjord", "nordland", 66.07, 12.95],
  ["donna", "Dønna", "nordland", 66.1, 12.5],
  ["heroy_nordland", "Herøy", "nordland", 65.98, 12.3],
  ["vevelstad", "Vevelstad", "nordland", 65.72, 12.5],
  ["bronnoy", "Brønnøy", "nordland", 65.47, 12.2],
  ["sommna", "Sømna", "nordland", 65.28, 12.13],
  ["binda", "Bindal", "nordland", 65.07, 12.5],
  ["grane", "Grane", "nordland", 65.52, 13.4],
  ["hattfjelldal", "Hattfjelldal", "nordland", 65.6, 13.98],
  ["evenes", "Evenes", "nordland", 68.5, 16.7],
  ["ballangen", "Lødingen", "nordland", 68.4, 16.0],
  ["tjeldsund", "Tjeldsund", "nordland", 68.58, 16.4],

  // Troms
  ["tromso", "Tromsø", "troms", 69.649, 18.955],
  ["harstad", "Harstad", "troms", 68.798, 16.541],
  ["malselv", "Målselv", "troms", 69.05, 18.55],
  ["bardu", "Bardu", "troms", 68.85, 18.35],
  ["senja", "Senja", "troms", 69.25, 17.87],
  ["balsfjord", "Balsfjord", "troms", 69.23, 19.23],
  ["lyngen", "Lyngen", "troms", 69.58, 20.22],
  ["storfjord", "Storfjord", "troms", 69.32, 20.3],
  ["kafjord", "Kåfjord", "troms", 69.48, 20.95],
  ["nordreisa", "Nordreisa", "troms", 69.77, 21.02],
  ["skjervoy", "Skjervøy", "troms", 70.03, 20.97],
  ["kvaenangen", "Kvænangen", "troms", 69.98, 21.97],
  ["karlsoy", "Karlsøy", "troms", 70.0, 19.5],
  ["lyngsalpene", "Gratangen", "troms", 68.73, 17.5],
  ["salangen", "Salangen", "troms", 68.87, 17.85],
  ["dyroy", "Dyrøy", "troms", 69.07, 17.85],
  ["sorreisa", "Sørreisa", "troms", 69.13, 18.15],
  ["ibestad", "Ibestad", "troms", 68.78, 17.15],
  ["kvafjord", "Kvæfjord", "troms", 68.75, 16.35],

  // Finnmark
  ["alta", "Alta", "finnmark", 69.968, 23.271],
  ["hammerfest", "Hammerfest", "finnmark", 70.663, 23.682],
  ["sorvaranger", "Sør-Varanger", "finnmark", 69.727, 30.045],
  ["vadso", "Vadsø", "finnmark", 70.075, 29.75],
  ["karasjok", "Karasjok", "finnmark", 69.47, 25.51],
  ["kautokeino", "Kautokeino", "finnmark", 69.01, 23.04],
  ["porsanger", "Porsanger", "finnmark", 70.15, 24.98],
  ["tana", "Tana", "finnmark", 70.2, 28.18],
  ["nesseby", "Nesseby", "finnmark", 70.17, 28.6],
  ["batsfjord", "Båtsfjord", "finnmark", 70.63, 29.72],
  ["berlevag", "Berlevåg", "finnmark", 70.86, 29.08],
  ["vardo", "Vardø", "finnmark", 70.37, 31.11],
  ["gamvik", "Gamvik", "finnmark", 71.03, 28.25],
  ["lebesby", "Lebesby", "finnmark", 70.55, 26.5],
  ["nordkapp", "Nordkapp", "finnmark", 70.98, 25.97],
  ["masoy", "Måsøy", "finnmark", 70.98, 24.65],
  ["hasvik", "Hasvik", "finnmark", 70.48, 22.15],
  ["loppa", "Loppa", "finnmark", 70.25, 21.8],
];

export const kommuner = K.map(([id, name, fylke, lat, lng]) => ({ id, name, fylke, lat, lng }));
export const kommuneById = Object.fromEntries(kommuner.map((k) => [k.id, k]));

// ---------------------------------------------------------------------------
// Områder / bydeler. Bare der de finnes offisielt eller er i vanlig bruk.
// Andre kommuner klarer seg fint med kommune + radius.
// ---------------------------------------------------------------------------
export const omrader = {
  oslo: ["Gamle Oslo", "Grünerløkka", "Sagene", "St. Hanshaugen", "Frogner", "Ullern", "Vestre Aker", "Nordre Aker", "Bjerke", "Grorud", "Stovner", "Alna", "Østensjø", "Nordstrand", "Søndre Nordstrand"],
  bergen: ["Arna", "Bergenhus", "Fana", "Fyllingsdalen", "Laksevåg", "Ytrebygda", "Årstad", "Åsane"],
  trondheim: ["Midtbyen", "Østbyen", "Lerkendal", "Heimdal"],
  stavanger: ["Eiganes og Våland", "Hillevåg", "Hinna", "Hundvåg", "Madla", "Storhaug", "Tasta", "Rennesøy", "Finnøy"],
  sandnes: ["Sentrum", "Austrått", "Bogafjell", "Figgjo", "Ganddal", "Hana", "Lura", "Riska", "Sviland", "Trones", "Høle", "Forsand"],
  trondelag: [],
  barum: ["Sandvika", "Bekkestua", "Stabekk", "Høvik", "Rykkinn", "Kolsås", "Fornebu", "Lommedalen"],
  drammen: ["Bragernes", "Strømsø", "Konnerud", "Åssiden", "Mjøndalen", "Svelvik"],
  fredrikstad: ["Sentrum", "Gressvik", "Kråkerøy", "Rolvsøy", "Onsøy", "Torp"],
  kristiansand: ["Kvadraturen", "Lund", "Vågsbygd", "Randesund", "Tveit", "Søgne", "Songdalen"],
  tromso: ["Sentrum", "Tromsdalen", "Kvaløysletta", "Storelva", "Kroken"],
  alesund: ["Sentrum", "Spjelkavik", "Ellingsøy", "Skodje", "Ørskog"],
  bodo: ["Sentrum", "Rønvik", "Mørkved", "Bodøsjøen", "Tverlandet"],
  sarpsborg: ["Sentrum", "Grålum", "Hafslundsøy", "Sandesund", "Varteig"],
  skien: ["Sentrum", "Gulset", "Klyve", "Skotfoss", "Gjerpen"],
  tonsberg: ["Sentrum", "Eik", "Sem", "Nøtterøy", "Husøy"],
  haugesund: ["Sentrum", "Skåredalen", "Gard", "Vormedal"],
  sola: ["Sola sentrum", "Tananger", "Røyneberg", "Dysjaland"],
  asker: ["Asker sentrum", "Heggedal", "Vollen", "Slemmestad", "Røyken", "Hurum"],
  lillestrom: ["Lillestrøm", "Strømmen", "Skedsmokorset", "Sørumsand", "Fetsund"],
};

// ---------------------------------------------------------------------------
// Radius. "Hele kommunen" er null = ingen radiusfilter.
// ---------------------------------------------------------------------------
export const radiusOptions = [
  { km: 2, label: "2 km", hint: "Nabolaget" },
  { km: 5, label: "5 km", hint: "Nærområdet" },
  { km: 10, label: "10 km", hint: "Byen" },
  { km: 25, label: "25 km", hint: "Regionen" },
  { km: null, label: "Hele kommunen", hint: "Alt i kommunen" },
];

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

/** Avstand i km mellom to punkter (haversine). */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Er punktet innenfor valgt radius? radiusKm = null betyr hele kommunen. */
export function withinRadius(center, point, radiusKm) {
  if (radiusKm == null) return true;
  const d = distanceKm(center, point);
  return d == null ? true : d <= radiusKm;
}

/**
 * Personvern: rund av en koordinat før den lagres/vises. 3 desimaler er
 * ca. 100 m i Norge – nok til at en radius blir meningsfull, men ikke så
 * presist at det avslører hjemmeadressen. Vi lagrer ALDRI en rå posisjon.
 */
export function roundCoord(n) {
  return typeof n === "number" ? Math.round(n * 1000) / 1000 : n;
}

/**
 * Senteret en radius faktisk måles fra.
 *
 * Tidligere ble alltid kommunens sentroide brukt, uansett hvor brukeren var –
 * så radiusen var mest kosmetisk. Nå:
 *   1. brukerens egen (personvern-avrundede) posisjon hvis den er delt
 *   2. ellers kommunens sentroide som ærlig fallback
 *
 * Bydel/område har vi ikke ekte koordinater for ennå (det krever et
 * verifisert datasett – vi dikter dem ikke opp), så et valgt område alene
 * flytter ikke senteret. UI-et sier hvilket senter som faktisk brukes.
 */
export function radiusCenter(loc) {
  if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
    return { lat: loc.lat, lng: loc.lng, source: "user" };
  }
  const k = kommuneById[loc?.kommuneId];
  return k ? { lat: k.lat, lng: k.lng, source: "kommune" } : null;
}

/** Søk i kommuner og områder. Returnerer treff sortert på relevans. */
export function searchPlaces(query, limit = 12) {
  const q = query.trim().toLowerCase();
  if (!q) return kommuner.slice(0, limit).map((k) => ({ type: "kommune", kommune: k }));

  const norm = (s) => s.toLowerCase().replace(/[æ]/g, "ae").replace(/[ø]/g, "o").replace(/[å]/g, "a");
  const nq = norm(q);
  const hits = [];

  for (const k of kommuner) {
    const nk = norm(k.name);
    if (nk.startsWith(nq)) hits.push({ type: "kommune", kommune: k, score: 0 });
    else if (nk.includes(nq)) hits.push({ type: "kommune", kommune: k, score: 1 });
  }
  for (const [kid, list] of Object.entries(omrader)) {
    const k = kommuneById[kid];
    if (!k) continue;
    for (const o of list) {
      const no = norm(o);
      if (no.startsWith(nq)) hits.push({ type: "omrade", kommune: k, omrade: o, score: 2 });
      else if (no.includes(nq)) hits.push({ type: "omrade", kommune: k, omrade: o, score: 3 });
    }
  }
  return hits.sort((a, b) => a.score - b.score || a.kommune.name.localeCompare(b.kommune.name, "nb")).slice(0, limit);
}

/** "Madla, Stavanger" eller bare "Stavanger". */
export function placeLabel(loc) {
  if (!loc) return "";
  const k = kommuneById[loc.kommuneId];
  if (!k) return "";
  return loc.omrade ? `${loc.omrade}, ${k.name}` : k.name;
}

/** Kort variant til trange flater: "Madla" eller "Stavanger". */
export function placeShort(loc) {
  if (!loc) return "";
  return loc.omrade || kommuneById[loc.kommuneId]?.name || "";
}

/** Teksten vi bruker når vi beskriver dekningsområdet. */
export function radiusLabel(loc) {
  if (!loc) return "";
  const r = radiusOptions.find((o) => o.km === loc.radiusKm);
  if (!r || r.km == null) return `hele ${kommuneById[loc.kommuneId]?.name || "kommunen"}`;
  const from = loc && typeof loc.lat === "number" ? "posisjonen din" : placeShort(loc);
  return `${r.km} km rundt ${from}`;
}

/** Har brukeren delt sin egen posisjon (som radiusen da måles fra)? */
export function hasUserPosition(loc) {
  return !!(loc && typeof loc.lat === "number" && typeof loc.lng === "number");
}

/**
 * Hvilket senter radiusen faktisk måles fra, som et eksplisitt navn:
 *   user_approximate_location – brukerens egen delte, avrundede posisjon
 *   municipality_center        – kommunens sentroide (fallback)
 * (neighborhood_center er reservert til vi har verifiserte bydelskoordinater;
 *  et valgt område flytter derfor ikke senteret ennå.)
 */
export function locationMode(loc) {
  return hasUserPosition(loc) ? "user_approximate_location" : "municipality_center";
}

export const defaultLocation = { kommuneId: "stavanger", omrade: null, radiusKm: 10 };

/**
 * Båndtvang er ekte, offentlig informasjon – ikke noe vi finner på.
 * Generell båndtvang i Norge: 1. april – 20. august (hundeloven § 6).
 * Mange kommuner har utvidet båndtvang utover dette, og egne regler for
 * f.eks. badeplasser, kirkegårder og beiteområder.
 */
export const BANDTVANG = {
  from: "1. april",
  to: "20. august",
  law: "hundeloven § 6",
  note: "Mange kommuner har utvidet båndtvang. Sjekk alltid reglene i din kommune.",
};

/** Er vi i perioden med generell båndtvang? */
export function inBandtvang(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if (m > 4 && m < 8) return true;
  if (m === 4) return d >= 1;
  if (m === 8) return d <= 20;
  return false;
}
