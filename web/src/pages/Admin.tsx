import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

// Admin sub-pages are lazy-loaded so non-admins never download the
// LiveEditor / Authors / Content / Confessions / Catechism bundles
// (security audit M-2 close — defence-in-depth on top of RLS).
// The chunks are only fetched after the server-side is_admin() RPC has
// confirmed the user. A non-admin who navigates to /beheer gets the
// Admin shell (which holds only the auth check + redirect) and is
// bounced before any admin code is fetched.
const Dashboard  = lazy(() => import('./admin/Dashboard'));
const Authors    = lazy(() => import('./admin/Authors'));
const Content    = lazy(() => import('./admin/Content'));
const Confessions = lazy(() => import('./admin/Confessions'));
const Catechism  = lazy(() => import('./admin/Catechism'));
const LiveEditor = lazy(() => import('./admin/LiveEditor'));

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
  // Derive the unknown initial state without calling setState in the
  // effect (avoids react-hooks/set-state-in-effect cascading renders).
  const [isAdmin, setIsAdmin] = useState<boolean | null>(() => isLoggedIn ? null : false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return;
      setIsAdmin(error ? false : data === true);
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
          <Suspense fallback={<div className="adm-loading"><div className="spinner" /></div>}>
            {section === 'dashboard' && <Dashboard />}
            {section === 'live' && <LiveEditor />}
            {section === 'authors' && <Authors />}
            {section === 'content' && <Content />}
            {section === 'confessions' && <Confessions />}
            {section === 'catechism' && <Catechism />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
