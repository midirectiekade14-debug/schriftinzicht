import { Link, useLocation } from 'react-router-dom';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Pagina niet gevonden');
  const location = useLocation();

  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '4rem', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ fontSize: 56, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>404</div>
      <h2 style={{ marginBottom: 12 }}>Pagina niet gevonden</h2>
      <p style={{ color: 'var(--text-faint)', marginBottom: 24 }}>
        De pagina <code style={{ fontFamily: 'monospace' }}>{location.pathname}</code> bestaat niet of is verplaatst.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link to="/bijbel" className="landing-cta">Naar de Bijbel</Link>
        <Link to="/zoeken" className="landing-cta" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>Zoeken</Link>
      </div>
    </div>
  );
}
