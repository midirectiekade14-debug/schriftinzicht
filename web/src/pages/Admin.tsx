import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Dashboard from './admin/Dashboard';
import Authors from './admin/Authors';
import Content from './admin/Content';
import Confessions from './admin/Confessions';
import Catechism from './admin/Catechism';
import LiveEditor from './admin/LiveEditor';

type Section = 'dashboard' | 'live' | 'authors' | 'content' | 'confessions' | 'catechism';

const NAV_ITEMS: { key: Section; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'live', label: 'Live Editor', icon: '✏' },
  { key: 'authors', label: 'Auteurs', icon: '🖋' },
  { key: 'content', label: 'Tekstbeheer', icon: '📝' },
  { key: 'confessions', label: 'Belijdenissen', icon: '✝' },
  { key: 'catechism', label: 'Catechismus', icon: '📜' },
];

export default function Admin() {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [section, setSection] = useState<Section>('dashboard');
  // Admin check is done server-side via the is_admin() SECURITY DEFINER
  // function so the client cannot lie about its role (security audit M-1).
  // The earlier hardcoded email allowlist also leaked the owner's address
  // into the public bundle (I-1) — removed here.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { setIsAdmin(false); return; }
    let cancelled = false;
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setIsAdmin(false); return; }
      setIsAdmin(data === true);
    });
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  if (authLoading || isAdmin === null) return <div className="adm-loading"><div className="spinner" /></div>;
  if (!isLoggedIn) return <Navigate to="/inloggen?return=/beheer" replace />;
  if (!isAdmin) return <Navigate to="/zoeken" replace />;

  return (
    <div className="adm">
      <header className="adm-header">
        <div className="adm-header-left">
          <span className="adm-header-icon">⚙</span>
          <span className="adm-header-title">SchriftInzicht Beheer</span>
        </div>
        <div className="adm-header-right">
          <span className="adm-header-user">{user?.email}</span>
          <button className="adm-logout" onClick={async () => { await supabase.auth.signOut(); window.location.href = '/inloggen'; }}>Uitloggen</button>
        </div>
      </header>

      <div className="adm-body">
        <nav className="adm-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              className={`adm-nav-item${section === item.key ? ' active' : ''}`}
              onClick={() => setSection(item.key)}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <main className="adm-main">
          {section === 'dashboard' && <Dashboard />}
          {section === 'live' && <LiveEditor />}
          {section === 'authors' && <Authors />}
          {section === 'content' && <Content />}
          {section === 'confessions' && <Confessions />}
          {section === 'catechism' && <Catechism />}
        </main>
      </div>
    </div>
  );
}
