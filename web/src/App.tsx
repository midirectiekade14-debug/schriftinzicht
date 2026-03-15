import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Zoeken from './pages/Zoeken';
import Bijbel from './pages/Bijbel';
import Hoofdstukken from './pages/Hoofdstukken';
import Verzen from './pages/Verzen';
import Oudvaders from './pages/Oudvaders';
import Catechismus from './pages/Catechismus';
import Instellingen from './pages/Instellingen';

const tabs = [
  { path: '/zoeken', label: 'Zoeken', icon: '⌕' },
  { path: '/bijbel', label: 'Bijbel', icon: '◈' },
  { path: '/oudvaders', label: 'Oudvaders', icon: '◉' },
  { path: '/catechismus', label: 'Catechismus', icon: '◇' },
  { path: '/instellingen', label: 'Config', icon: '⊛' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Navigate to="/zoeken" replace />} />
          <Route path="/zoeken" element={<Zoeken />} />
          <Route path="/bijbel" element={<Bijbel />} />
          <Route path="/bijbel/:bookId" element={<Hoofdstukken />} />
          <Route path="/bijbel/:bookId/:chapter" element={<Verzen />} />
          <Route path="/oudvaders" element={<Oudvaders />} />
          <Route path="/catechismus" element={<Catechismus />} />
          <Route path="/instellingen" element={<Instellingen />} />
        </Routes>

        <nav className="tab-bar">
          {tabs.map((tab) => (
            <NavLink key={tab.path} to={tab.path}>
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </BrowserRouter>
  );
}
