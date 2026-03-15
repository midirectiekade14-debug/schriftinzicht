import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Author } from '../types/database';

export default function Oudvaders() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('authors')
      .select('*')
      .order('born_year', { ascending: true })
      .then(({ data }) => {
        setAuthors(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <div className="screen-header"><h1>Oudvaders</h1></div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (authors.length === 0) {
    return (
      <>
        <div className="screen-header"><h1>Oudvaders</h1></div>
        <div className="page"><div className="empty-text">Geen auteurs gevonden.</div></div>
      </>
    );
  }

  return (
    <>
      <div className="screen-header">
        <h1>Oudvaders</h1>
      </div>
      <div className="page">
        {authors.map((a) => {
          const years = a.born_year
            ? `${a.born_year}\u2013${a.died_year || '?'}`
            : '';

          return (
            <div key={a.id} className="author-card">
              {a.portrait_url ? (
                <img src={a.portrait_url} alt={a.name} className="portrait" />
              ) : (
                <div className="portrait portrait-placeholder">
                  {a.name.charAt(0)}
                </div>
              )}
              <div className="author-info">
                <div className="author-name">{a.name}</div>
                {years && <div className="author-years">{years}</div>}
                {a.era && <div className="author-era">{a.era}</div>}
                {a.biography && <div className="author-bio">{a.biography}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
