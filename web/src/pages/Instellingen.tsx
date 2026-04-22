import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useTheme from '../hooks/useTheme';
import { clickable } from '../lib/a11y';

const FONT_SCALE_KEY = 'si-font-scale';
const FONT_SCALE_LABELS = ['Normaal', 'Groot', 'Groter', 'Extra groot', 'Maximaal'];

export default function Instellingen() {
  useDocumentTitle('Instellingen');
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const { isLight, toggle: toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/inloggen', { replace: true });
  };

  const [fontScaleLevel, setFontScaleLevel] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(FONT_SCALE_KEY) || '0', 10);
      return saved >= 0 && saved < FONT_SCALE_LABELS.length ? saved : 0;
    } catch { return 0; }
  });

  useEffect(() => {
    const onStorage = () => {
      try {
        const saved = parseInt(localStorage.getItem(FONT_SCALE_KEY) || '0', 10);
        if (saved >= 0 && saved < FONT_SCALE_LABELS.length) setFontScaleLevel(saved);
      } catch { /* noop */ }
    };
    window.addEventListener('storage', onStorage);
    const interval = window.setInterval(onStorage, 1000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div className="screen-header">
        <h1>Instellingen</h1>
      </div>
      <div className="page">
        <div className="settings-section">
          <h3>Weergave</h3>
          <div className="setting-row" {...clickable(toggleTheme, { label: `Thema wisselen, nu ${isLight ? 'licht' : 'donker'}` })} style={{ cursor: 'pointer' }}>
            <span>Thema</span>
            <span className="setting-value">{isLight ? 'Licht' : 'Donker'} {isLight ? '☽' : '☀'}</span>
          </div>
          <div className="setting-row">
            <span>Lettergrootte</span>
            <span className="setting-value">{FONT_SCALE_LABELS[fontScaleLevel]}</span>
          </div>
        </div>

        <div className="settings-section">
          <h3>Over SchriftInzicht</h3>
          <div className="setting-row">
            <span>Versie</span>
            <span className="setting-value">0.1.0</span>
          </div>
          <p className="about-text">
            SchriftInzicht brengt bijbelverklaringen van de oudvaders samen op
            één plek. Doorzoek verklaringen van Matthew Henry, de Statenvertaling
            met kanttekeningen, Dächsel en meer — gesorteerd per vers in een
            vergelijkende tijdlijn.
          </p>
        </div>

        <div className="settings-section">
          <h3>Bronnen</h3>
          <p className="source-text">
            &bull; Statenvertaling met Kanttekeningen<br />
            &bull; Matthew Henry — Bijbelverklaring (1706)<br />
            &bull; Dächsel — Bijbelverklaring<br />
            &bull; Heidelbergse Catechismus<br />
            &bull; Nederlandse Geloofsbelijdenis<br />
            &bull; Dordtse Leerregels
          </p>
          <p className="pd-note">Alle bronnen zijn publiek domein.</p>
        </div>

        <div className="settings-section">
          <h3>Contact</h3>
          <a href="mailto:info@schriftinzicht.nl" className="link">
            info@schriftinzicht.nl
          </a>
        </div>

        {/* Account */}
        <div className="settings-section">
          <h3>Account</h3>
          {isLoggedIn ? (
            <>
              <div className="setting-row">
                <span>Ingelogd als</span>
                <span className="setting-value">{user?.email}</span>
              </div>
              <button className="settings-logout" onClick={handleLogout}>Uitloggen</button>
            </>
          ) : (
            <div className="setting-row" {...clickable(() => navigate('/inloggen'), { label: 'Ga naar inloggen' })} style={{ cursor: 'pointer' }}>
              <span>Inloggen</span>
              <span className="setting-value">→</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
