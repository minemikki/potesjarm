const styles = [
  {
    name: "Adventure",
    text: "Norsk natur. Store opplevelser.",
    image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Royal",
    text: "Kongelig personlighet.",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Cinematic",
    text: "Som en filmplakat.",
    image: "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Studio",
    text: "Rent. Tidløst. Elegant.",
    image: "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Memorial",
    text: "Et kjært minne for alltid.",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Fun & Creative",
    text: "Slipp fantasien løs.",
    image: "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=900&q=85",
  },
];

const packages = [
  {
    name: "Digital",
    price: "349",
    desc: "For deg som vil ha ett sterkt portrett.",
    items: ["1 premiumportrett", "Høyoppløselig JPG", "Mobil + printformat", "1 revisjon"],
  },
  {
    name: "Plus",
    price: "549",
    desc: "Vår mest populære pakke.",
    badge: "Mest populær",
    items: ["3 premiumportretter", "3 ulike komposisjoner", "Mobil + printformat", "2 revisjoner"],
  },
  {
    name: "Cinematic",
    price: "799",
    desc: "Når du vil ha noe som virkelig skiller seg ut.",
    items: ["3 premiumportretter", "Kort cinematic AI-video", "Story/Reels-format", "2 revisjoner"],
  },
];

export default function Home() {
  return (
    <main id="top">
      <div className="announcement">
        <span>Nyhet: Potesjarm Studio er åpent</span>
        <span>•</span>
        <span>Personlige hundeportretter laget med omtanke</span>
      </div>

      <header className="nav">
        <a className="brand" href="#top" aria-label="Potesjarm hjem">
          <span className="brandMark">P</span>
          <span className="brandType">
            <strong>Potesjarm</strong>
            <small>FOR LIVET MED HUND</small>
          </span>
        </a>

        <nav>
          <a href="#studio">Studio</a>
          <a href="#stiler">Stiler</a>
          <a href="#pakker">Priser</a>
          <a href="#om">Om</a>
        </nav>

        <a className="navCta" href="#pakker">Lag ditt portrett</a>
      </header>

      <section className="hero">
        <div className="heroMedia" />
        <div className="heroVeil" />
        <div className="heroContent">
          <div className="eyebrow light">POTESJARM STUDIO</div>
          <h1>Mer enn et bilde.<br />Et minne for livet.</h1>
          <p>
            Vi forvandler favorittbildet av hunden din til et personlig kunstverk —
            laget for å føles som hunden din, ikke som et tilfeldig filter.
          </p>

          <div className="heroActions">
            <a className="button primary" href="#pakker">Lag ditt portrett <span>→</span></a>
            <a className="button ghost" href="#stiler">Se stilene</a>
          </div>

          <div className="trustRow">
            <span><b>1–3</b> dager</span>
            <span><b>HD</b> filer</span>
            <span><b>100%</b> personlig</span>
          </div>
        </div>

        <div className="heroCard">
          <div className="heroCardTop">POTESJARM ORIGINAL</div>
          <div className="heroCardQuote">“Samme hund.<br />En helt ny historie.”</div>
          <div className="heroCardFoot">Custom portrait / 2026</div>
        </div>
      </section>

      <section className="intro" id="studio">
        <div>
          <div className="eyebrow">ET LITE STUDIO FOR STORE PERSONLIGHETER</div>
          <h2>Hunden din er ikke generisk.<br />Portrettet burde heller ikke være det.</h2>
        </div>
        <p>
          Du sender oss bildene. Vi bygger uttrykket rundt hundens personlighet,
          farger og særpreg, og kvalitetssjekker resultatet før levering.
        </p>
      </section>

      <section className="stylesSection" id="stiler">
        <div className="sectionTitleRow">
          <div>
            <div className="eyebrow">VELG ET UNIVERS</div>
            <h2>Finn uttrykket som passer.</h2>
          </div>
          <a href="#pakker">Se pakker <span>↗</span></a>
        </div>

        <div className="styleGrid">
          {styles.map((style, index) => (
            <article className="styleCard" key={style.name}>
              <img src={style.image} alt="" />
              <div className="styleShade" />
              <span className="styleIndex">0{index + 1}</span>
              <div className="styleCopy">
                <h3>{style.name}</h3>
                <p>{style.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="howItWorks">
        <div className="howHeading">
          <div className="eyebrow light">SLIK FUNGERER DET</div>
          <h2>Fra kamerarull<br />til kunstverk.</h2>
          <p>Tre enkle steg. Resten tar vi oss av.</p>
        </div>

        <div className="steps">
          <article>
            <span>01</span>
            <h3>Last opp</h3>
            <p>Velg 2–3 tydelige bilder som viser ansikt, pels og uttrykk godt.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Velg stil</h3>
            <p>Adventure, Royal, Cinematic, Studio, Memorial eller Creative.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Vi lager</h3>
            <p>Vi skaper, finjusterer og kvalitetssjekker før du mottar filene.</p>
          </article>
        </div>
      </section>

      <section className="pricingSection" id="pakker">
        <div className="pricingIntro">
          <div className="eyebrow">VELG PAKKE</div>
          <h2>Enkelt priset.<br />Laget personlig.</h2>
          <p>Ingen abonnement. Ingen skjulte kostnader.</p>
        </div>

        <div className="pricingGrid">
          {packages.map((pack) => (
            <article className={"priceCard " + (pack.badge ? "featured" : "")} key={pack.name}>
              {pack.badge && <div className="badge">{pack.badge}</div>}
              <div className="priceTop">
                <h3>{pack.name}</h3>
                <p>{pack.desc}</p>
              </div>
              <div className="price"><span>{pack.price}</span> kr</div>
              <ul>
                {pack.items.map((item) => <li key={item}>✓ {item}</li>)}
              </ul>
              <button>Velg {pack.name}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="showcase">
        <div className="showcaseImage leftImg" />
        <div className="showcaseCenter">
          <div className="eyebrow light">LAGET FOR Å BLI TATT VARE PÅ</div>
          <blockquote>“Et bilde du faktisk har lyst til å henge på veggen.”</blockquote>
          <p>Digital levering først. Print og canvas kommer senere.</p>
        </div>
        <div className="showcaseImage rightImg" />
      </section>

      <section className="about" id="om">
        <div className="aboutCard">
          <div className="eyebrow">POTESJARM</div>
          <h2>For livet med hund.</h2>
          <p>
            Potesjarm skal være mer enn en nettbutikk. Vi bygger et norsk hundebrand
            rundt ting som føles personlige, gjennomførte og verdt å beholde.
          </p>
          <a className="textLink" href="#pakker">Start med et portrett <span>→</span></a>
        </div>
        <div className="aboutImage">
          <img
            src="https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1400&q=90"
            alt="Hund ute i naturen"
          />
        </div>
      </section>

      <footer>
        <div className="brand footerBrand">
          <span className="brandMark">P</span>
          <span className="brandType">
            <strong>Potesjarm</strong>
            <small>FOR LIVET MED HUND</small>
          </span>
        </div>
        <div className="footerText">© 2026 Potesjarm Studio</div>
        <div className="footerLinks">
          <a href="#stiler">Stiler</a>
          <a href="#pakker">Priser</a>
          <a href="#om">Om</a>
        </div>
      </footer>
    </main>
  );
}
