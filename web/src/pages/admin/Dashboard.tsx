import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Stats {
  bible_verses: number;
  commentaries: number;
  kanttekeningen: number;
  sermons: number;
  authors: number;
  confession_articles: number;
  catechism_questions: number;
  cross_references: number;
}

const STAT_ITEMS: { key: keyof Stats; label: string; icon: string }[] = [
  { key: 'bible_verses', label: 'Bijbelverzen', icon: '📖' },
  { key: 'authors', label: 'Auteurs', icon: '🖋' },
  { key: 'commentaries', label: 'Verklaringen', icon: '📝' },
  { key: 'kanttekeningen', label: 'Kanttekeningen', icon: '🔖' },
  { key: 'sermons', label: 'Preken', icon: '🎙' },
  { key: 'confession_articles', label: 'Belijdenisartikelen', icon: '✝' },
  { key: 'catechism_questions', label: 'Catechismusvragen', icon: '📜' },
  { key: 'cross_references', label: 'Kruisverwijzingen', icon: '🔗' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topAuthors, setTopAuthors] = useState<{ name: string; commentaries: number; sermons: number }[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    setLoading(true);
    const tables = ['bible_verses', 'commentaries', 'kanttekeningen', 'sermons', 'authors', 'confession_articles', 'catechism_questions', 'cross_references'] as const;
    const counts: Partial<Record<keyof Stats, number>> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
        counts[t] = count || 0;
      })
    );
    setStats(counts as Stats);

    // Top auteurs: 3 queries ipv N+1 per auteur
    const [{ data: authors }, { data: commRows }, { data: sermonRows }] = await Promise.all([
      supabase.from('authors').select('id, name'),
      supabase.from('commentaries').select('author_id'),
      supabase.from('sermons').select('author_id'),
    ]);

    if (authors && authors.length > 0) {
      const commMap = new Map<string, number>();
      for (const r of commRows || []) {
        commMap.set(r.author_id, (commMap.get(r.author_id) || 0) + 1);
      }
      const sermonMap = new Map<string, number>();
      for (const r of sermonRows || []) {
        sermonMap.set(r.author_id, (sermonMap.get(r.author_id) || 0) + 1);
      }
      const authorStats = authors.map((a) => ({
        name: a.name,
        commentaries: commMap.get(a.id) || 0,
        sermons: sermonMap.get(a.id) || 0,
      }));
      setTopAuthors(authorStats.sort((a, b) => (b.commentaries + b.sermons) - (a.commentaries + a.sermons)).slice(0, 10));
    }
    setLoading(false);
  }

  useEffect(() => {
    Promise.resolve().then(loadStats);
  }, []);

  if (loading) return <div className="adm-section-loading"><div className="spinner" /></div>;

  return (
    <div className="adm-dashboard">
      <h2>Dashboard</h2>
      <div className="adm-stats-grid">
        {stats && STAT_ITEMS.map(({ key, label, icon }) => (
          <div key={key} className="adm-stat-card">
            <span className="adm-stat-icon">{icon}</span>
            <span className="adm-stat-count">{stats[key].toLocaleString('nl-NL')}</span>
            <span className="adm-stat-label">{label}</span>
          </div>
        ))}
      </div>

      {topAuthors.length > 0 && (
        <div className="adm-top-authors">
          <h3>Top auteurs</h3>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Auteur</th>
                <th>Verklaringen</th>
                <th>Preken</th>
                <th>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {topAuthors.map((a) => (
                <tr key={a.name}>
                  <td>{a.name}</td>
                  <td>{a.commentaries.toLocaleString('nl-NL')}</td>
                  <td>{a.sermons.toLocaleString('nl-NL')}</td>
                  <td className="adm-stat-total">{(a.commentaries + a.sermons).toLocaleString('nl-NL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
