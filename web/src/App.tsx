import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import FontScaleButton from './components/FontScaleButton';
import ThemeToggle from './components/ThemeToggle';
import AppSidebar from './components/AppSidebar';
import ErrorBoundary from './components/ErrorBoundary';
import EditOverlay from './components/EditOverlay';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';

/* ── Lazy-loaded pages ── */
const Landing = lazy(() => import('./pages/Landing'));
const Demo = lazy(() => import('./pages/Demo'));
const Inloggen = lazy(() => import('./pages/Inloggen'));
const Zoeken = lazy(() => import('./pages/Zoeken'));
const Bijbel = lazy(() => import('./pages/Bijbel'));
const Hoofdstukken = lazy(() => import('./pages/Hoofdstukken'));
const Verzen = lazy(() => import('./pages/Verzen'));
const Oudvaders = lazy(() => import('./pages/Oudvaders'));
const Catechismus = lazy(() => import('./pages/Catechismus'));
const Belijdenissen = lazy(() => import('./pages/Belijdenissen'));
const BelijdenisDetail = lazy(() => import('./pages/BelijdenisDetail'));
const Instellingen = lazy(() => import('./pages/Instellingen'));
const Preek = lazy(() => import('./pages/Preek'));
const Boeklezer = lazy(() => import('./pages/Boeklezer'));
const Preekvoorbereiding = lazy(() => import('./pages/Preekvoorbereiding'));
const Bladwijzers = lazy(() => import('./pages/Bladwijzers'));
const Leesrooster = lazy(() => import('./pages/Leesrooster'));
const Admin = lazy(() => import('./pages/Admin'));

/* ── SVG Tab Icons ── */
const IconZoeken = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="6" /><line x1="13.5" y1="13.5" x2="17" y2="17" />
  </svg>
);
const IconBijbel = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4C2 4 5 3 10 3C15 3 18 4 18 4V16C18 16 15 15 10 15C5 15 2 16 2 16V4Z" />
    <line x1="10" y1="3" x2="10" y2="15" />
  </svg>
);
const IconPreek = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    {/* Ganzeveer — duidelijk herkenbaar */}
    <path d="M15.5 1.5C13 3 9.5 7.5 8 11C7 13.5 6.5 16 7 17.5C7.3 18.3 8 18.5 8.8 18C9.8 17.3 10.5 15 11 13" />
    <path d="M15.5 1.5C17 1.5 17.5 3 17 4.5C16.3 6.5 14 9 12 10.5" />
    <path d="M8 11L4 12" />
    <line x1="4" y1="12" x2="3.5" y2="17.5" strokeWidth="1" />
    <path d="M15.5 1.5L17.5 1" strokeWidth="0.8" />
  </svg>
);
const IconBelijdenissen = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="2" x2="10" y2="17" />
    <line x1="5" y1="6" x2="15" y2="6" />
  </svg>
);
const IconBladwijzers = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M5 3C5 2.44772 5.44772 2 6 2H14C14.5523 2 15 2.44772 15 3V17.5L10 14L5 17.5V3Z" />
  </svg>
);
const IconLeesrooster = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <line x1="3" y1="7" x2="17" y2="7" />
    <line x1="7" y1="3" x2="7" y2="7" />
    <line x1="7" y1="10.5" x2="13" y2="10.5" />
    <line x1="7" y1="13.5" x2="11" y2="13.5" />
  </svg>
);
const IconOudvaders = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="6" r="3" /><path d="M4 17C4 13.5 6.5 11 10 11C13.5 11 16 13.5 16 17" />
  </svg>
);
const IconInstellingen = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="2.5" />
    <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4.05 4.05l1.4 1.4M14.55 14.55l1.4 1.4M4.05 15.95l1.4-1.4M14.55 5.45l1.4-1.4" />
  </svg>
);
const IconMeer = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <circle cx="4" cy="10" r="1.5" fill="currentColor" /><circle cx="10" cy="10" r="1.5" fill="currentColor" /><circle cx="16" cy="10" r="1.5" fill="currentColor" />
  </svg>
);

const tabs = [
  { path: '/zoeken', label: 'Zoeken', Icon: IconZoeken },
  { path: '/bijbel', label: 'Bijbel', Icon: IconBijbel },
  { path: '/preekvoorbereiding', label: 'Preek', Icon: IconPreek },
  { path: '/leesrooster', label: 'Leesrooster', Icon: IconLeesrooster },
];

const moreItems = [
  { path: '/belijdenissen', label: 'Belijdenissen', Icon: IconBelijdenissen },
  { path: '/oudvaders', label: 'Oudvaders', Icon: IconOudvaders },
  { path: '/bladwijzers', label: 'Bladwijzers', Icon: IconBladwijzers },
  { path: '/instellingen', label: 'Instellingen', Icon: IconInstellingen },
];

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMoreActive = moreItems.some(m => location.pathname.startsWith(m.path));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="more-menu-wrapper" ref={ref}>
      {open && (
        <div className="more-menu">
          {moreItems.map((item) => (
            <button
              key={item.path}
              className={`more-menu-item${location.pathname.startsWith(item.path) ? ' active' : ''}`}
              onClick={() => { navigate(item.path); setOpen(false); }}
            >
              <span className="tab-icon" aria-hidden="true"><item.Icon /></span>
              {item.label}
            </button>
          ))}
        </div>
      )}
      <button
        className={`tab-bar-btn${isMoreActive ? ' active' : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Meer opties"
        aria-expanded={open}
      >
        <span className="tab-icon" aria-hidden="true"><IconMeer /></span>
        Meer
      </button>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isBoeklezer = location.pathname.startsWith('/boeklezer');
  useKeyboardShortcuts();

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Ga naar inhoud</a>
      <InstallPrompt />
      <OfflineBanner />
      <div className="app-body">
        {!isBoeklezer && <AppSidebar />}
        <div className="app-main" id="main-content">
          <Routes>
            <Route path="/zoeken" element={<Zoeken />} />
            <Route path="/bijbel" element={<Bijbel />} />
            <Route path="/bijbel/:bookId" element={<Hoofdstukken />} />
            <Route path="/bijbel/:bookId/:chapter" element={<Verzen />} />
            <Route path="/preekvoorbereiding" element={<Preekvoorbereiding />} />
            <Route path="/belijdenissen" element={<Belijdenissen />} />
            <Route path="/belijdenis/:slug" element={<BelijdenisDetail />} />
            <Route path="/catechismus" element={<Catechismus />} />
            <Route path="/oudvaders" element={<Oudvaders />} />
            <Route path="/preek/:id" element={<Preek />} />
            <Route path="/boeklezer/:authorId" element={<Boeklezer />} />
            <Route path="/bladwijzers" element={<Bladwijzers />} />
            <Route path="/leesrooster" element={<Leesrooster />} />
            <Route path="/instellingen" element={<Instellingen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>

      <ThemeToggle />
      <FontScaleButton />
      <EditOverlay />

      <nav className="tab-bar" aria-label="Hoofdnavigatie">
        {tabs.map((tab) => (
          <NavLink key={tab.path} to={tab.path}>
            <span className="tab-icon" aria-hidden="true"><tab.Icon /></span>
            {tab.label}
          </NavLink>
        ))}
        <MoreMenu />
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="page-loader" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/inloggen" element={<Inloggen />} />
            <Route path="/beheer" element={<Admin />} />
            <Route path="/*" element={<AppShell />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
