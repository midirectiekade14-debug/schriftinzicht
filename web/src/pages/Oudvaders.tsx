import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { truncate } from '../lib/truncate';
import type { Author } from '../types/database';
import Logo from '../components/Logo';

interface SourceWork {
  id: string;
  title: string;
  year_published: number | null;
  language_orig: string;
}

interface SermonPreview {
  id: string;
  title: string;
  year_preached: number | null;
  source_collection: string | null;
}

/** Normalize title: strip leading numbering, fix casing */
function cleanTitle(t: string): string {
  // Remove leading "1. ", "2) " etc.
  let s = t.replace(/^\d+[\.\)]\s*/, '');
  // If entire string is UPPER CASE, convert to Title Case
  if (s.length > 5 && s === s.toUpperCase()) {
    s = s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  return s;
}

export default function Oudvaders() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [works, setWorks] = useState<Record<string, SourceWork[]>>({});
  const [sermons, setSermons] = useState<Record<string, SermonPreview[]>>({});
  const [worksLoading, setWorksLoading] = useState<Record<string, boolean>>({});
  const [sermonsExpanded, setSermonsExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from('authors')
      .select('*')
      .order('born_year', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { setError('Kon auteurs niet laden.'); }
        else { setAuthors(data || []); }
        setLoading(false);
      });
  }, []);

  const toggleAuthor = async (authorId: string) => {
    const isOpen = expanded[authorId];
    setExpanded(prev => ({ ...prev, [authorId]: !isOpen }));

    if (!isOpen && !works[authorId]) {
      setWorksLoading(prev => ({ ...prev, [authorId]: true }));
      const [worksRes, sermonsRes] = await Promise.all([
        supabase
          .from('source_works')
          .select('id, title, year_published, language_orig')
          .eq('author_id', authorId)
          .order('year_published', { ascending: true }),
        supabase
          .from('sermons')
          .select('id, title, year_preached, source_collection')
          .eq('author_id', authorId)
          .order('year_preached', { ascending: true })
          .limit(500),
      ]);
      setWorks(prev => ({ ...prev, [authorId]: worksRes.data || [] }));
      setSermons(prev => ({ ...prev, [authorId]: sermonsRes.data || [] }));
      setWorksLoading(prev => ({ ...prev, [authorId]: false }));
    }
  };

  if (loading) {
    return (
      <>
        <div className="screen-header"><h1>Oudvaders</h1></div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="screen-header"><h1>Oudvaders</h1></div>
        <div className="page"><div className="error-box">{error}</div></div>
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
        <Logo />
        {authors.map((a) => {
          const years = a.born_year
            ? `${a.born_year}\u2013${a.died_year || '?'}`
            : '';
          const isOpen = expanded[a.id];
          const authorWorks = works[a.id] || [];
          const isLoadingWorks = worksLoading[a.id];

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
                <button
                  className="ov-works-toggle"
                  onClick={() => toggleAuthor(a.id)}
                >
                  {isOpen ? 'Verberg werken \u25B4' : 'Bekijk werken \u25BE'}
                </button>

                {isOpen && (
                  <div className="ov-works-list">
                    {isLoadingWorks ? (
                      <div className="ov-works-loading">Laden...</div>
                    ) : (
                      <>
                        {/* Verklaringen / Werken */}
                        {authorWorks.length > 0 && (
                          <div className="ov-section">
                            <div className="ov-section-label">Verklaringen</div>
                            {authorWorks.map(w => (
                              <Link
                                key={w.id}
                                to={`/boeklezer/${a.id}`}
                                className="ov-work-item"
                              >
                                <span className="ov-work-title">{w.title}</span>
                                {w.year_published && (
                                  <span className="ov-work-year">{w.year_published}</span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Preken — gegroepeerd per bundel */}
                        {(sermons[a.id] || []).length > 0 && (() => {
                          const authorSermons = sermons[a.id];
                          // Group by source_collection
                          const byCollection = new Map<string, SermonPreview[]>();
                          const loose: SermonPreview[] = [];
                          for (const s of authorSermons) {
                            if (s.source_collection) {
                              const list = byCollection.get(s.source_collection) || [];
                              list.push(s);
                              byCollection.set(s.source_collection, list);
                            } else {
                              loose.push(s);
                            }
                          }

                          return (
                            <div className="ov-section">
                              <div className="ov-section-label">Preken ({authorSermons.length})</div>
                              {/* Bundels */}
                              {Array.from(byCollection.entries()).map(([coll, items]) => {
                                const collKey = `${a.id}-${coll}`;
                                const isCollOpen = sermonsExpanded[collKey];
                                const shown = isCollOpen ? items : items.slice(0, 3);
                                return (
                                  <div key={coll} className="ov-coll-group">
                                    <div className="ov-coll-title">{coll} ({items.length})</div>
                                    {shown.map(s => (
                                      <Link key={s.id} to={`/preek/${s.id}`} className="ov-work-item">
                                        <span className="ov-work-title">{truncate(cleanTitle(s.title), 60)}</span>
                                        {s.year_preached && <span className="ov-work-year">{s.year_preached}</span>}
                                      </Link>
                                    ))}
                                    {items.length > 3 && (
                                      <button
                                        className="ov-works-toggle ov-sermon-toggle"
                                        onClick={() => setSermonsExpanded(prev => ({ ...prev, [collKey]: !isCollOpen }))}
                                      >
                                        {isCollOpen ? `Minder tonen \u25B4` : `Alle ${items.length} tonen \u25BE`}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                              {/* Losse preken */}
                              {loose.length > 0 && loose.slice(0, 5).map(s => (
                                <Link key={s.id} to={`/preek/${s.id}`} className="ov-work-item">
                                  <span className="ov-work-title">{truncate(cleanTitle(s.title), 60)}</span>
                                  {s.year_preached && <span className="ov-work-year">{s.year_preached}</span>}
                                </Link>
                              ))}
                            </div>
                          );
                        })()}

                        {authorWorks.length === 0 && (sermons[a.id] || []).length === 0 && (
                          <div className="ov-works-empty">Geen werken gevonden.</div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
