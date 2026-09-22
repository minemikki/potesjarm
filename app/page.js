const styles=[
["Adventure","NORSK NATUR. STORE OPPLEVELSER.","https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=90"],
["Royal","KONGELIG PERSONLIGHET.","https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=90"],
["Cinematic","SOM EN FILMPLAKAT.","https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=900&q=90"],
["Studio","TIDLØST OG ELEGANT.","https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=900&q=90"],
["Memorial","ET KJÆRT MINNE FOR ALLTID.","https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=90"],
["Fun & Creative","SLIPP FANTASIEN LØS.","https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=900&q=90"]
];
const packs=[
["DIGITAL","349 kr",["1 premium bilde","Høyoppløselig fil","Klar for print og sosiale medier"]],
["PLUS","549 kr",["3 unike bilder","Mobilbakgrunn","Sosiale medier format","Klar for print"]],
["CINEMATIC","799 kr",["3 bilder + kort video","5–10 sek AI-video","Flere formater","Perfekt for deling"]]
];
export default function Home(){
return <main>
<header className="top">
<a className="logo" href="#top"><span className="paw">●</span><span><b>Potesjarm</b><small>FOR LIVET MED HUND</small></span></a>
<nav><a href="#studio">Studio</a><a href="#stiler">Produkter</a><a href="#inspirasjon">Inspirasjon</a><a href="#om">Om oss</a></nav>
<div className="right">⌕ <span>🛒</span><a className="cta" href="#pakker">Lag ditt portrett</a></div>
</header>

<section className="hero" id="top">
<div className="heroBg"/>
<div className="heroOverlay"/>
<div className="heroCopy">
<div className="eyebrow light">POTESJARM STUDIO</div>
<h1>Mer enn et bilde.<br/>Et minne for livet.</h1>
<p>Vi forvandler dine bilder til unike, profesjonelle portretter<br/>av hunden din – i stiler som passer deres personlighet.<br/>Perfekt som gave, til veggen eller for å bevare et kjært minne.</p>
<div className="actions"><a className="primary" href="#pakker">Lag ditt portrett →</a><a className="ghost" href="#stiler">Se eksempler</a></div>
<div className="trust"><span>⚡ <b>Rask levering</b><small>1–3 dager</small></span><span>∞ <b>Høyoppløselig</b><small>klar for print</small></span><span>♡ <b>100% fornøyd</b><small>garanti</small></span></div>
</div>
<div className="scribble">Same<br/>Adventures<br/>Different<br/>Pawspective<br/><span>🐾</span></div>
</section>

<section className="styles" id="stiler">
<div className="styleHead"><div><div className="eyebrow">VELG DIN STIL</div><h2>Hver hund har sin historie</h2><p>Utforsk våre mest populære stiler. Du laster opp bildene – vi skaper magien.</p></div><a href="#pakker">Se alle stiler →</a></div>
<div className="cards">{styles.map(([n,s,img])=><article className="card" key={n}><img src={img} alt=""/><div className="shade"/><div className="cardText"><h3>{n}</h3><span>{s}</span></div></article>)}</div>
</section>

<section className="mid" id="studio">
<div className="how">
<div className="eyebrow">SLIK FUNGERER DET</div><h2>Enkelt. Raskt. Magisk.</h2>
<div className="steps">
<div><div className="icon">▣</div><b>1. Last opp bilder</b><p>Last opp 2–3 bilder<br/>av hunden din.</p></div>
<div><div className="icon">●</div><b>2. Velg stil og pakke</b><p>Finn stilen som passer<br/>deres personlighet.</p></div>
<div><div className="icon">↓</div><b>3. Motta ditt kunstverk</b><p>Få dine bilder digitalt<br/>innen 1–3 dager.</p></div>
</div>
<div className="note">Fra ditt bilde<br/>til et kunstverk ♡</div>
</div>

<div className="pricing" id="pakker">
<div className="eyebrow">VELG DIN PAKKE</div>
<div className="packGrid">{packs.map(([n,p,items],i)=><article className={"pack "+(i===1?"featured":"")} key={n}>
{i===1&&<div className="popular">MEST POPULÆR</div>}
<h3>{n}</h3><div className="price">{p}</div>
<ul>{items.map(x=><li key={x}>✓ {x}</li>)}</ul>
<button>Velg pakke</button>
</article>)}</div>
</div>
</section>

<section className="gallery" id="inspirasjon">
<div className="quote">“<br/>Dette ble helt utrolig!<br/>Gråt når jeg så det.<br/>Tusen takk!<small>– Line & Max</small><span>★★★★★</span></div>
<img src="https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&w=900&q=90" alt=""/>
<img src="https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=900&q=90" alt=""/>
<img src="https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=90" alt=""/>
<div className="quote">“<br/>Den beste gaven<br/>jeg har gitt.<br/>Anbefales på det<br/>varmeste!<small>– Thomas & Luna</small><span>★★★★★</span></div>
</section>

<footer id="om"><span>—</span> Potesjarm Studio <span>—</span><small>HUNDER GJØR LIVET BEDRE. VI GJØR MINNENE VAKRERE. 🐾</small></footer>
</main>
}