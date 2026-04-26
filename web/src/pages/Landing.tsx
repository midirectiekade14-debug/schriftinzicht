import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BrandIcon from '../components/BrandIcon';

interface Stats {
  authors: number;
  commentaries: number;
  sermons: number;
  kanttekeningen: number;
}

export default function Landing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 200);
    const t2 = setTimeout(() => setStep(2), 1000);
    const t3 = setTimeout(() => setStep(3), 1600);
    const t4 = setTimeout(() => setStep(4), 2200);
    const t5 = setTimeout(() => setStep(5), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [authorsRes, commentariesRes, sermonsRes, kantRes] = await Promise.all([
          supabase.from('authors').select('id', { count: 'exact', head: true }),
          supabase.from('commentaries').select('id', { count: 'exact', head: true }),
          supabase.from('sermons').select('id', { count: 'exact', head: true }),
          supabase.from('kanttekeningen').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          authors: authorsRes.count ?? 0,
          commentaries: commentariesRes.count ?? 0,
          sermons: sermonsRes.count ?? 0,
          kanttekeningen: kantRes.count ?? 0,
        });
      } catch {
        // Stats zijn niet kritiek — toon pagina zonder stats
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="landing landing-page">
      <div className="landing-glow" />
      <div className="landing-glow-inner" />

      {/* Hero section */}
      <div className="landing-hero">
        <div className={`landing-icon ${step >= 1 ? 'landing-visible' : ''}`}>
          <BrandIcon />
        </div>

        {/* Brand text */}
        <div className="landing-brand">
          <div className={`landing-rule ${step >= 2 ? 'landing-visible' : ''}`} />
          <h1 className={`landing-main ${step >= 2 ? 'landing-visible' : ''}`}>SCHRIFT</h1>
          <h2 className={`landing-sub ${step >= 3 ? 'landing-visible' : ''}`}>INZICHT</h2>
          <div className={`landing-rule landing-rule-sm ${step >= 3 ? 'landing-visible' : ''}`} />
        </div>

        {/* Value proposition */}
        <p className={`landing-tagline ${step >= 4 ? 'landing-visible' : ''}`}>
          Vier eeuwen bijbelverklaring op een plek
        </p>
      </div>

      {/* CTA */}
      <div className={`landing-actions ${step >= 5 ? 'landing-visible' : ''}`}>
        <button className="landing-cta" onClick={() => navigate('/zoeken')}>
          Begin met ontdekken
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className={`landing-stats ${step >= 5 ? 'landing-visible' : ''}`}>
          <div className="landing-stat">
            <span className="landing-stat-num">{stats.authors}</span>
            <span className="landing-stat-label">Auteurs</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-num">{stats.commentaries.toLocaleString('nl-NL')}</span>
            <span className="landing-stat-label">Verklaringen</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-num">{stats.kanttekeningen.toLocaleString('nl-NL')}</span>
            <span className="landing-stat-label">Kanttekeningen</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="landing-stat-num">{stats.sermons.toLocaleString('nl-NL')}</span>
            <span className="landing-stat-label">Preken</span>
          </div>
        </div>
      )}

    </div>
  );
}
