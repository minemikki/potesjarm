const styles = [
  { name: "Natur", sub: "Naturlig & tidløs", img: "/images/potesjarm-ai-1.webp" },
  { name: "Royal", sub: "Konge for en dag", img: "/images/potesjarm-ai-2.webp" },
  { name: "Cinematic", sub: "Filmatisk stemning", img: "/images/potesjarm-ai-3.webp" },
  { name: "Kunstnerisk", sub: "Unik & kreativ", img: "/images/potesjarm-ai-4.webp" },
  { name: "Memorial", sub: "Et vakkert minne", img: "/images/potesjarm-ai-5.webp" },
  { name: "Sesong", sub: "Jul, sommer & mer", img: "/images/potesjarm-ai-6.webp" },
];

const packs = [
  {
    name: "Basic",
    price: "349 kr",
    items: ["1 bilde", "1 stil", "Høy oppløsning", "Digital levering"],
  },
  {
    name: "Premium",
    price: "549 kr",
    badge: "Mest valgt",
    items: ["3 bilder", "Valgfri stil", "Høy oppløsning", "Ubegrensede revisjoner"],
  },
  {
    name: "Ultimate",
    price: "799 kr",
    items: ["5 bilder", "Alle stiler", "Høy oppløsning", "Eksklusiv bakgrunn"],
  },
];

const reviews = [
  ["Ingrid H.", "Helt nydelig resultat! Jeg ble faktisk rørt. Fantastisk service og super rask levering!"],
  ["Thomas K.", "Bedre enn jeg forventet. Bildene ser helt magiske ut!"],
  ["Sofie M.", "Den beste gaven til en hundeeier. Kommer garantert til å bestille igjen!"],
];

export default function Home() {
  return (
    <main>
      <div className="trustbar">
        <span>🚚 Gratis frakt over 799 kr</span>
        <span>🇳🇴 Norsk nettbutikk</span>
        <span>🛡 Trygg betaling med Vipps/Klarna</span>
        <span>★★★★★ 4,8/5 fra hundeeiere</span>
      </div>

      <header className="nav">
        <a className="brand" href="#top">
          <span className="paw">🐾</span>
          <span>
            <strong>Potesjarm</strong>
            <small>MER ENN BARE EN HUNDEBUTIKK</small>
          </span>
        </a>

        <nav>
          <a className="active" href="#top">Hjem</a>
          <a href="#stiler">Digitale produkter</a>
          <a href="#stiler">Kategorier</a>
          <a href="#inspirasjon">Inspirasjon</a>
          <a href="#om">Om oss</a>
          <a href="#kontakt">Kundeservice</a>
        </nav>

        <div className="icons">
          <span>⌕</span><span>♡</span><span>♙</span><span>▣</span>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="heroBg" />
        <div className="heroShade" />
        <div className="heroCopy">
          <div className="eyebrow light">FOR ET AKTIVT, LYKKELIGERE HUNDELIV</div>
          <h1>Mer enn et bilde.<br />Et minne for livet.</h1>
          <p>
            Unike, personlige hundeportretter i fantastiske stiler.<br />
            Skapt med kjærlighet – fra ditt bilde til et kunstverk du vil elske.
          </p>
          <div className="heroBtns">
            <a className="pill lightBtn" href="#stiler">Utforsk stilene →</a>
            <a className="pill outlineBtn" href="#inspirasjon">▶ Se video (0:45)</a>
          </div>
          <div className="heroStats">
            <div>▣<span><b>Digital levering</b><small>1–24 timer</small></span></div>
            <div>♙<span><b>Ubegrensede revisjoner</b><small>på premium</small></span></div>
            <div>◇<span><b>Fornøydgaranti</b><small>100% trygghet</small></span></div>
            <div>♧<span><b>Elsket av</b><small>1000+ hundeeiere</small></span></div>
          </div>
        </div>
        <div className="scribble">Eventyr ser<br />bedre ut sammen ♡</div>
      </section>

      <section className="styleSection" id="stiler">
        <div className="sectionRow">
          <h2>Velg din stil →</h2>
          <div className="micro">Samme hund. Uendelige muligheter. &nbsp; ◀ ▶</div>
        </div>
        <div className="styleGrid">
          {styles.map((s) => (
            <article className="styleCard" key={s.name}>
              <img src={s.img} alt="" />
              <div className="styleShade" />
              <div className="styleText">
                <h3>{s.name}</h3>
                <p>{s.sub}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="howPrice">
        <div className="how">
          <h2>Enkelt. Raskt. Magisk.</h2>
          <p>Last opp et bilde, velg stil, og få et unikt kunstverk av hunden din – klart på kort tid.</p>
          <div className="steps">
            <div><div className="circle">📷</div><b>1. Last opp bilde</b><span>Velg dine favorittbilder av hunden din.</span></div>
            <div><div className="circle">🎨</div><b>2. Velg stil</b><span>Utforsk våre unike stiler og tilpass.</span></div>
            <div><div className="circle">➤</div><b>3. Motta kunstverk</b><span>Få ditt bilde digitalt på e-post.</span></div>
          </div>
        </div>

        <div className="pricing" id="pakker">
          <h2>Våre populære pakker</h2>
          <div className="priceGrid">
            {packs.map((p) => (
              <article className={"priceCard " + (p.badge ? "featured" : "")} key={p.name}>
                {p.badge && <div className="badge">{p.badge}</div>}
                <h3>{p.name}</h3>
                <div className="price">{p.price}</div>
                <ul>{p.items.map((i) => <li key={i}>✓ {i}</li>)}</ul>
                <button>Velg {p.name}</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="results" id="inspirasjon">
        <div className="resultsCopy">
          <h2>Virkelige hunder.<br />Utrolige resultater.</h2>
          <p>Se hvordan vanlige bilder blir til unike kunstverk.</p>
          <a className="pill lightBtn" href="#stiler">Se flere transformasjoner →</a>
        </div>
        <div className="beforeAfter">
          <div className="label left">Før</div>
          <div className="label right">Etter</div>
          <img src="/images/potesjarm-ai-2.webp" alt="" />
          <div className="divider" />
          <div className="knob">↔</div>
        </div>
        <div className="miniGallery">
          <img src="/images/potesjarm-ai-2.webp" alt="" />
          <img src="/images/potesjarm-ai-6.webp" alt="" />
          <img src="/images/potesjarm-ai-3.webp" alt="" />
        </div>
      </section>

      <section className="reviews">
        <div className="sectionRow">
          <h2>Hva kundene våre sier</h2>
          <div className="micro">◀ ▶</div>
        </div>
        <div className="reviewGrid">
          {reviews.map(([name, text], i) => (
            <article className="review" key={name}>
              <div className="avatar">{i + 1}</div>
              <div>
                <div className="stars">★★★★★</div>
                <p>“{text}”</p>
                <b>{name}</b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="finalCta" id="om">
        <div className="finalBg" />
        <div className="finalShade" />
        <div className="finalCopy">
          <h2>Skap minner som varer</h2>
          <p>Gjør ditt bilde til et kunstverk i dag.</p>
        </div>
        <a className="pill lightBtn finalBtn" href="#pakker">Kom i gang →</a>
        <div className="finalScript">Livet er<br />bedre med hund ♡</div>
      </section>

      <footer id="kontakt">
        <div>🇳🇴 Norsk nettbutikk</div>
        <div>🛡 Trygg betaling med Vipps/Klarna</div>
        <div>◉ Digital levering 1–24t</div>
        <div>Følg oss &nbsp; ◎ ♪ f ▶</div>
      </footer>
    </main>
  );
}
