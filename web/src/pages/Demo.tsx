import { Link } from 'react-router-dom';

const ERA_COLORS: Record<string, string> = {
  Reformatie: '#D4A574',
  'Nadere Reformatie': '#8BB89E',
  'Puriteinse periode': '#7BA8C8',
  '19e eeuw': '#C8A870',
};

const TIMELINE = [
  {
    author: 'Calvijn', year: 1557, era: 'Reformatie',
    snippet: 'David belijdt hier dat hij onder Gods hoede veilig is en niets te vrezen heeft. Het woord \u201Cmijn\u201D wijst op een persoonlijke, levende betrekking.',
  },
  {
    author: 'À Brakel', year: 1700, era: 'Nadere Reformatie',
    snippet: 'De Heere is mijn Herder — dit is de taal des geloofs, waardoor de ziel zich persoonlijk aan God toevertrouwt als haar Leidsman en Verzorger.',
  },
  {
    author: 'Matthew Henry', year: 1706, era: 'Puriteinse periode',
    snippet: 'De HEERE is mijn Herder \u2014 niet slechts een Herder, maar m\u00EDjn Herder. Wie de Heere tot Herder heeft, mag verzekerd zijn dat hem niets zal ontbreken.',
  },
  {
    author: 'Spurgeon', year: 1880, era: '19e eeuw',
    snippet: 'De titel waarmee David de Heere benoemt is vol vertroostende betekenis. Het kleine woordje \u201Cmijn\u201D verandert theologie in geloofsbeleving.',
  },
];

const DAILY_VERSE = {
  ref: 'Jesaja 40:31',
  text: 'Maar dien den HEERE verwachten, zullen de kracht vernieuwen; zij zullen opvaren met vleugelen, gelijk de arenden.',
  author: 'Matthew Henry',
  year: 1706,
  commentary: 'Hier wordt de belofte gegeven aan hen die op de Heere wachten. Niet die in eigen kracht strijden, maar die in stilheid en vertrouwen hun sterkte vinden.',
};

const THEMES = ['Genade', 'Geloof', 'Verkiezing', 'Verbond', 'Bekering', 'Troost', 'Gebed', 'Lijden'];

const SB_PORTRAITS = 'https://mkwqiqssuhunbhvwrsdt.supabase.co/storage/v1/object/public/portraits';

const AUTHORS_SAMPLE = [
  { name: 'Luther', years: '1483\u20131546', era: 'Reformatie', img: `${SB_PORTRAITS}/maarten-luther.jpg` },
  { name: 'Calvijn', years: '1509\u20131564', era: 'Reformatie', img: `${SB_PORTRAITS}/johannes-calvijn.jpg` },
  { name: '\u00C0 Brakel', years: '1635\u20131711', era: 'Nadere Reformatie', img: `${SB_PORTRAITS}/wilhelmus-brakel.jpg` },
  { name: 'M. Henry', years: '1662\u20131714', era: 'Puriteinse periode', img: `${SB_PORTRAITS}/matthew-henry.jpg` },
  { name: 'Spurgeon', years: '1834\u20131892', era: '19e eeuw', img: `${SB_PORTRAITS}/c-h-spurgeon.jpg` },
  { name: 'Boston', years: '1676\u20131732', era: 'Puriteinse periode', img: `${SB_PORTRAITS}/thomas-boston.jpg` },
  { name: 'Bunyan', years: '1628\u20131688', era: 'Puriteinse periode', img: `${SB_PORTRAITS}/john-bunyan.jpg` },
  { name: 'Hellenbroek', years: '1658\u20131731', era: 'Nadere Reformatie', img: `${SB_PORTRAITS}/abraham-hellenbroek.jpg` },
  { name: 'Kohlbrugge', years: '1803\u20131875', era: '19e eeuw', img: `${SB_PORTRAITS}/h-f-kohlbr-gge.jpg` },
  { name: 'Smijtegelt', years: '1665\u20131739', era: 'Nadere Reformatie', img: `${SB_PORTRAITS}/bernardus-smijtegelt.jpg` },
  { name: 'Van der Groe', years: '1711\u20131784', era: 'Nadere Reformatie', img: `${SB_PORTRAITS}/theodorus-van-der-groe.jpg` },
];

const BIBLE_SAMPLE = [
  { name: 'Genesis', ch: 50 }, { name: 'Psalmen', ch: 150 },
  { name: 'Jesaja', ch: 66 }, { name: 'Markus', ch: 16 },
  { name: 'Lukas', ch: 24 }, { name: 'Johannes', ch: 21 },
  { name: 'Romeinen', ch: 16 }, { name: 'Hebre\u00EBen', ch: 13 },
];

const PREEK_COMMENTARIES = [
  {
    author: 'Calvijn', year: 1540, era: 'Reformatie',
    text: 'Paulus leert ons hier dat alles wat de gelovigen overkomt, hun tot heil strekt. De gouden keten toont de onverbrekelijke samenhang van Gods heilswerk.',
  },
  {
    author: 'Spurgeon', year: 1880, era: '19e eeuw',
    text: 'Alle dingen werken mede ten goede — niet elk ding afzonderlijk, maar alle tezamen. De zwarste draden zijn nodig voor het weefsel van Gods voorzienigheid.',
  },
];

function SectionHeader({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) {
  return (
    <div className="demo-section-header">
      <span className="demo-label">{label}</span>
      <h2 className="demo-title">{title}</h2>
      {subtitle && <p className="demo-desc">{subtitle}</p>}
    </div>
  );
}

export default function Demo() {
  return (
    <div className="demo">
      <div className="demo-content">

        {/* SECTIE 1: TIJDLIJN */}
        <SectionHeader
          label="SCHRIFTINZICHT"
          title={'\u00C9\u00E9n vers, vier eeuwen'}
          subtitle="Zie bij elk vers wat theologen door de eeuwen heen verklaarden, chronologisch geordend."
        />

        <div className="demo-verse-card">
          <span className="demo-verse-ref">Psalm 23:1</span>
          <p className="demo-verse-text">De HEERE is mijn Herder, mij zal niets ontbreken.</p>
        </div>

        <div className="demo-timeline">
          {TIMELINE.map((item, i) => (
            <div key={i} className="demo-tl-row" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="demo-tl-dot-col">
                <span className="demo-tl-dot" style={{ background: ERA_COLORS[item.era] }} />
                {i < TIMELINE.length - 1 && <span className="demo-tl-line" />}
              </div>
              <div className="demo-tl-card">
                <div className="demo-tl-head">
                  <span className="demo-tl-author">{item.author}</span>
                  <span className="demo-tl-year" style={{ color: ERA_COLORS[item.era] }}>{item.year}</span>
                </div>
                <p className="demo-tl-snippet">{item.snippet}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="demo-divider" />

        {/* SECTIE 2: DAGVERS */}
        <SectionHeader
          label="DAGVERS"
          title="Elke dag een overdenking"
          subtitle="Dagelijks een tekst met uitleg van een oudvader. Begin de dag met Gods Woord."
        />

        <div className="demo-daily-card">
          <span className="demo-daily-badge">{'\u2726'}  Dagvers</span>
          <span className="demo-daily-ref">{DAILY_VERSE.ref}</span>
          <p className="demo-daily-text">{DAILY_VERSE.text}</p>
          <div className="demo-daily-rule" />
          <span className="demo-daily-author">{DAILY_VERSE.author} {'\u00B7'} {DAILY_VERSE.year}</span>
          <p className="demo-daily-commentary">{DAILY_VERSE.commentary}</p>
        </div>

        <div className="demo-divider" />

        {/* SECTIE 3: ZOEK OP THEMA */}
        <SectionHeader
          label="ZOEKEN"
          title="Zoek op thema"
          subtitle="Niet alleen op vers, maar ook op woorden: rechtvaardiging, verkiezing, verbond."
        />

        <div className="demo-themes">
          {THEMES.map(t => <span key={t} className="demo-theme-tag">{t}</span>)}
        </div>

        <div className="demo-divider" />

        {/* SECTIE 4: BIJBEL BLADEREN */}
        <SectionHeader
          label="BIJBEL"
          title="Statenvertaling"
          subtitle="Blader door het Oude en Nieuwe Testament. Tik een vers aan voor verklaringen en kanttekeningen."
        />

        <div className="demo-books-grid">
          {BIBLE_SAMPLE.map(b => (
            <div key={b.name} className="demo-book-card">
              <span className="demo-book-name">{b.name}</span>
              <span className="demo-book-ch">{b.ch} hfdst.</span>
            </div>
          ))}
        </div>

        <div className="demo-divider" />

        {/* SECTIE 5: OUDVADERS — met foto's */}
        <SectionHeader
          label="OUDVADERS"
          title="Theologen door de eeuwen"
          subtitle="Van Luther tot Spurgeon \u2014 ontdek wie ze waren en lees hun verklaringen."
        />

        <div className="demo-authors-grid">
          {AUTHORS_SAMPLE.map(a => {
            const eraColor = ERA_COLORS[a.era] || '#C4956A';
            return (
              <div key={a.name} className="demo-author-card">
                {a.img ? (
                  <img
                    src={a.img}
                    alt={a.name}
                    className="demo-author-photo"
                  />
                ) : (
                  <div className="demo-author-avatar" style={{ borderColor: eraColor + '30' }}>
                    <span style={{ color: eraColor }}>{a.name.charAt(0)}</span>
                  </div>
                )}
                <span className="demo-author-name">{a.name}</span>
                <span className="demo-author-years">{a.years}</span>
              </div>
            );
          })}
        </div>

        <div className="demo-divider" />

        {/* SECTIE 6: PREEKVOORBEREIDING */}
        <SectionHeader
          label="PREEKVOORBEREIDING"
          title="Alle verklaringen bij uw tekst"
          subtitle="Voer uw preektekst in en ontvang verklaringen, belijdenisverwijzingen en kruisreferenties."
        />

        <div className="demo-preek-card">
          <div className="demo-preek-verse-block">
            <span className="demo-preek-ref">Romeinen 8:28-30</span>
            <p className="demo-preek-verse">En wij weten, dat dengenen, die God liefhebben, alle dingen medewerken ten goede...</p>
          </div>
          <div className="demo-preek-tabs">
            {[{ label: 'Verklaringen', count: 4 }, { label: 'Belijdenissen', count: 3 }, { label: 'Kruisverwijzingen', count: 4 }].map((tab, i) => (
              <div key={tab.label} className={`demo-preek-tab ${i === 0 ? 'active' : ''}`}>
                <span>{tab.label}</span>
                <span className="demo-preek-tab-count">{tab.count}</span>
              </div>
            ))}
          </div>
          {PREEK_COMMENTARIES.map((c, i) => (
            <div key={i} className="demo-preek-comment" style={{ borderLeftColor: ERA_COLORS[c.era] }}>
              <div className="demo-preek-comment-head">
                <span className="demo-preek-comment-author">{c.author}</span>
                <span className="demo-preek-era-badge" style={{ background: (ERA_COLORS[c.era] || '#C4956A') + '18', color: ERA_COLORS[c.era] }}>{c.era}</span>
              </div>
              <p className="demo-preek-comment-text">{c.text}</p>
            </div>
          ))}
        </div>

        <div className="demo-divider" />

        {/* SECTIE 7: CATECHISMUS */}
        <SectionHeader
          label="MEER"
          title="Heidelbergse Catechismus"
          subtitle="Alle 52 Zondagen met bewijsteksten, direct gekoppeld aan de Bijbelverklaringen."
        />

        <div className="demo-cat-card">
          <span className="demo-cat-label">Zondag 1 {'\u00B7'} Vraag 1</span>
          <p className="demo-cat-question">Wat is uw enige troost, beide in het leven en sterven?</p>
          <p className="demo-cat-answer">Dat ik met lichaam en ziel, beide in het leven en sterven, niet mijn, maar mijns getrouwen Zaligmakers Jezus Christus eigen ben...</p>
          <div className="demo-cat-refs">
            {['1 Kor 6:19-20', 'Rom 14:7-9', 'Joh 10:28'].map(r => (
              <span key={r} className="demo-cat-ref-tag">{r}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="demo-cta">
          <Link to="/inloggen" className="demo-cta-btn">Begin met ontdekken</Link>
        </div>
      </div>
    </div>
  );
}
