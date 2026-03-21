import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const CONFESSIONS = [
  {
    slug: 'hc',
    title: 'Heidelbergse Catechismus',
    year: 1563,
    desc: '52 zondagen met 129 vragen en antwoorden over het christelijk geloof.',
    path: '/catechismus',
  },
  {
    slug: 'ngb',
    title: 'Nederlandse Geloofsbelijdenis',
    year: 1561,
    desc: '37 artikelen opgesteld door Guido de Br\u00E8s, beleden door de Gereformeerde kerken.',
    path: '/belijdenis/ngb',
  },
  {
    slug: 'dl',
    title: 'Dordtse Leerregels',
    year: 1619,
    desc: 'Vijf hoofdstukken vastgesteld door de Synode van Dordrecht over de leer der verkiezing.',
    path: '/belijdenis/dl',
  },
];

export default function Belijdenissen() {
  return (
    <>
      <div className="screen-header">
        <h1>Belijdenisgeschriften</h1>
      </div>
      <div className="page">
        <Logo />
        <p className="bel-intro">
          De Drie Formulieren van Enigheid vormen samen de belijdenis van de Gereformeerde kerken.
        </p>
        <div className="bel-grid">
          {CONFESSIONS.map(c => (
            <Link key={c.slug} to={c.path} className="bel-card">
              <span className="bel-year">{c.year}</span>
              <span className="bel-title">{c.title}</span>
              <span className="bel-desc">{c.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
