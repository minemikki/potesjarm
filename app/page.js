const styles = [
  { name: "Adventure", sub: "Norsk natur. Store opplevelser.", cls: "adventure" },
  { name: "Royal", sub: "Kongelig personlighet.", cls: "royal" },
  { name: "Cinematic", sub: "Som en filmplakat.", cls: "cinematic" },
  { name: "Studio", sub: "Tidløst og elegant.", cls: "studio" },
  { name: "Memorial", sub: "Et kjært minne for alltid.", cls: "memorial" },
  { name: "Fun & Creative", sub: "Slipp fantasien løs.", cls: "fun" },
];

const packages = [
  { name: "Digital", price: "349 kr", items: ["1 premiumbilde", "Høyoppløselig fil", "Klar for print og sosiale medier"] },
  { name: "Plus", price: "549 kr", popular: true, items: ["3 unike bilder", "Mobilbakgrunn", "Sosiale medier-format", "Klar for print"] },
  { name: "Cinematic", price: "799 kr", items: ["3 bilder + kort video", "5–10 sek AI-video", "Flere formater", "Perfekt for deling"] },
];

export default function Home() {
  return (
    <main>
      <header className="nav">
        <a className="brand" href="#top">
          <span className="paw">●</span>
          <span><b>Potesjarm</b><small>FOR LIVET MED HUND</small></span>
        </a>
        <nav>
          <a href="#studio">Studio</a>
          <a href="#stiler">Stiler</a>
          <a href="#pakker">Pakker</a>
          <a href="#om">Om oss</a>
        </nav>
        <a className="navCta" href="#pakker">Lag ditt portrett</a>
      </header>

      <section className="hero" id="top">
        <div className="heroShade" />
        <div className="heroContent">
          <span className="kicker">POTESJARM STUDIO</span>
          <h1>Mer enn et bilde.<br/>Et minne for livet.</h1>
          <p>Vi forvandler favorittbildet av hunden din til et unikt, profesjonelt portrett med personlighet.</p>
          <div className="heroBtns">
            <a className="primary" href="#pakker">Lag ditt portrett →</a>
            <a className="secondary" href="#stiler">Se eksempler</a>
          </div>
          <div className="heroTrust">
            <span>⚡ 1–3 dager</span>
            <span>∞ Høyoppløselig</span>
            <span>♡ Personlig kvalitetssjekk</span>
          </div>
        </div>
        <div className="heroDog">
          <div className="dogHead">🐕</div>
          <div className="glasses">◐━◑</div>
          <div className="heroNote">Samme hund.<br/>En helt ny historie.</div>
        </div>
      </section>

      <section className="section" id="stiler">
        <div className="sectionHead">
          <div>
            <span className="kicker dark">VELG DIN STIL</span>
            <h2>Hver hund har sin historie.</h2>
          </div>
          <p>Velg uttrykket som passer hunden din. Du laster opp bildene — vi tar oss av resten.</p>
        </div>

        <div className="styleGrid">
          {styles.map((s) => (
            <article key={s.name} className={"styleCard " + s.cls}>
              <div className="fakeDog">🐶</div>
              <div className="styleOverlay">
                <h3>{s.name}</h3>
                <span>{s.sub}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="process" id="studio">
        <div className="processCopy">
          <span className="kicker dark">SLIK FUNGERER DET</span>
          <h2>Enkelt. Raskt. Magisk.</h2>
          <div className="steps">
            <div><b>1</b><h3>Last opp bilder</h3><p>Send 2–3 tydelige bilder av hunden din.</p></div>
            <div><b>2</b><h3>Velg stil</h3><p>Velg univers og pakken som passer best.</p></div>
            <div><b>3</b><h3>Motta kunstverket</h3><p>Vi leverer filene digitalt når de er kvalitetssjekket.</p></div>
          </div>
        </div>

        <div className="packages" id="pakker">
          {packages.map((p) => (
            <article key={p.name} className={"package " + (p.popular ? "featured" : "")}>
              {p.popular && <span className="popular">MEST POPULÆR</span>}
              <h3>{p.name}</h3>
              <div className="price">{p.price}</div>
              <ul>{p.items.map((item)=><li key={item}>✓ {item}</li>)}</ul>
              <button>Velg pakke</button>
            </article>
          ))}
        </div>
      </section>

      <section className="gallery">
        <article className="quote darkBox">“Dette ble helt utrolig. Gråt når jeg så det.”<small>— Eksempel på kundesitat</small></article>
        <article className="galleryArt one"><span>ADVENTURE</span><div>🐕</div></article>
        <article className="galleryArt two"><span>CINEMATIC</span><div>🐶</div></article>
        <article className="galleryArt three"><span>ROYAL</span><div>🐕‍🦺</div></article>
        <article className="quote darkBox">“Den perfekte gaven til en hundeeier.”<small>— Eksempel på kundesitat</small></article>
      </section>

      <section className="about" id="om">
        <span className="kicker dark">POTESJARM STUDIO</span>
        <h2>Hunden din er ikke generisk.<br/>Portrettet burde heller ikke være det.</h2>
        <p>Vi bygger Potesjarm rundt én idé: personlige produkter og minner som faktisk føles verdt å ta vare på.</p>
        <a className="primary darkBtn" href="#pakker">Start ditt portrett →</a>
      </section>

      <footer>
        <div className="brand"><span className="paw">●</span><span><b>Potesjarm</b><small>FOR LIVET MED HUND</small></span></div>
        <span>© 2026 Potesjarm</span>
      </footer>
    </main>
  );
}
