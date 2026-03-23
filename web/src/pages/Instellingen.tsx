import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const THEME_KEY = 'si-theme';

export default function Instellingen() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/inloggen', { replace: true });
  };
  const [light, setLight] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === 'light'; }
    catch { return false; }
  });

  useEffect(() => {
    if (light) {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem(THEME_KEY, 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(THEME_KEY, 'dark');
    }
  }, [light]);

  const toggleTheme = () => setLight(!light);

  return (
    <>
      <div className="screen-header">
        <h1>Instellingen</h1>
      </div>
      <div className="page">
        <div className="settings-section">
          <h3>Weergave</h3>
          <div className="setting-row" onClick={toggleTheme} style={{ cursor: 'pointer' }}>
            <span>Thema</span>
            <span className="setting-value">{light ? 'Licht' : 'Donker'} {light ? '☽' : '☀'}</span>
          </div>
          <div className="setting-row">
            <span>Lettergrootte</span>
            <span className="setting-value">Normaal</span>
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
            <div className="setting-row" onClick={() => navigate('/inloggen')} style={{ cursor: 'pointer' }}>
              <span>Inloggen</span>
              <span className="setting-value">→</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
