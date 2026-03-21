import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { thematicPlan, getWeekOfYear, SEASON_COLORS } from '../data/thematicPlan';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import { truncate } from '../lib/truncate';

const PROGRESS_KEY = 'si-thematic-progress';
const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

type Progress = Record<string, boolean>;

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
}

function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // ma=0, zo=6
}

interface OudvaderSnippet {
  authorName: string;
  era: string | null;
  text: string;
  verseRef: string;
}

export default function Leesrooster() {
  const currentWeekNum = getWeekOfYear();
  const [weekNum, setWeekNum] = useState(currentWeekNum);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [bookIdMap, setBookIdMap] = useState<Record<string, string>>({});
  const [expandedDay, setExpandedDay] = useState<number>(getDayOfWeek());
  const [snippets, setSnippets] = useState<Record<number, OudvaderSnippet | null>>({});

  const week = thematicPlan.find(w => w.week === weekNum) || thematicPlan[0];
  const seasonColor = SEASON_COLORS[week.season] || 'var(--text-faint)';

  // Load book name → UUID mapping
  useEffect(() => {
    supabase.from('bible_books').select('id, name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        for (const b of data) map[b.name] = b.id;
        setBookIdMap(map);
      }
    });
  }, []);

  // Fetch oudvader snippets for readings of the current week
  useEffect(() => {
    if (!Object.keys(bookIdMap).length) return;

    async function fetchSnippets() {
      const results: Record<number, OudvaderSnippet | null> = {};

      for (let i = 0; i < week.readings.length; i++) {
        const r = week.readings[i];
        const uuid = bookIdMap[r.book];
        if (!uuid) { results[i] = null; continue; }

        try {
          // Get verse IDs for the highlight range
          const { data: verses } = await supabase.from('bible_verses')
            .select('id')
            .eq('book_id', uuid)
            .eq('chapter', r.chapter)
            .gte('verse', r.highlightStart)
            .lte('verse', r.highlightEnd);

          if (!verses?.length) { results[i] = null; continue; }
          const verseIds = verses.map(v => v.id);

          // Try commentaries first
          const { data: comms } = await supabase.from('commentaries')
            .select('commentary_text, authors(name, era)')
            .in('verse_id', verseIds)
            .eq('scope', 'verse')
            .limit(1);

          if (comms?.length) {
            const c = comms[0] as any;
            results[i] = {
              authorName: c.authors?.name || 'Onbekend',
              era: c.authors?.era || null,
              text: c.commentary_text || '',
              verseRef: `${r.book} ${r.chapter}:${r.highlightStart}${r.highlightEnd !== r.highlightStart ? '-' + r.highlightEnd : ''}`,
            };
            continue;
          }

          // Fallback: try sermons
          const { data: chapterVerses } = await supabase.from('bible_verses')
            .select('id')
            .eq('book_id', uuid)
            .eq('chapter', r.chapter);

          if (chapterVerses?.length) {
            const chapterIds = chapterVerses.map(v => v.id);
            const { data: sermons } = await supabase.from('sermons')
              .select('sermon_text, title, authors(name, era)')
              .in('start_verse_id', chapterIds)
              .limit(1);

            if (sermons?.length) {
              const s = sermons[0] as any;
              results[i] = {
                authorName: s.authors?.name || 'Onbekend',
                era: s.authors?.era || null,
                text: s.sermon_text || '',
                verseRef: s.title || `${r.book} ${r.chapter}`,
              };
              continue;
            }
          }

          results[i] = null;
        } catch {
          results[i] = null;
        }
      }

      setSnippets(results);
    }

    fetchSnippets();
  }, [weekNum, bookIdMap]);

  const toggleProgress = (dayIdx: number) => {
    const key = `${weekNum}-${dayIdx}`;
    const next = { ...progress, [key]: !progress[key] };
    setProgress(next);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  };

  const weekProgress = week.readings.reduce((count, _, i) => {
    return count + (progress[`${weekNum}-${i}`] ? 1 : 0);
  }, 0);

  return (
    <>
      <div className="screen-header"><h1>Leesrooster</h1></div>
      <div className="page lr-page">
        <Logo />

        {/* Seizoen badge + week navigatie */}
        <div className="lr-season-bar" style={{ borderLeftColor: seasonColor }}>
          <span className="lr-season-label" style={{ color: seasonColor }}>{week.season}</span>
          <span className="lr-week-label">Week {weekNum}</span>
        </div>

        {/* Week navigatie */}
        <div className="lr-day-nav">
          <button className="lr-day-btn" disabled={weekNum <= 1}
            onClick={() => setWeekNum(w => w - 1)}>
            &lsaquo; Vorige
          </button>
          {weekNum !== currentWeekNum && (
            <button className="lr-today-btn" onClick={() => setWeekNum(currentWeekNum)}>
              Deze week
            </button>
          )}
          <button className="lr-day-btn" disabled={weekNum >= 52}
            onClick={() => setWeekNum(w => w + 1)}>
            Volgende &rsaquo;
          </button>
        </div>

        {/* Thema header */}
        <div className="lr-theme-header">
          <h2 className="lr-theme-title">{week.theme}</h2>
          <p className="lr-theme-desc">{week.description}</p>
        </div>

        {/* Voortgang */}
        <div className="lr-progress-row">
          <div className="lr-progress">
            <div className="lr-progress-fill" style={{ width: `${(weekProgress / 7) * 100}%`, backgroundColor: seasonColor }} />
          </div>
          <span className="lr-progress-label">{weekProgress}/7</span>
        </div>

        {/* Dagelijkse lezingen */}
        <div className="lr-readings-list">
          {week.readings.map((reading, i) => {
            const done = !!progress[`${weekNum}-${i}`];
            const isExpanded = expandedDay === i;
            const uuid = bookIdMap[reading.book];
            const linkTo = uuid
              ? `/bijbel/${uuid}/${reading.chapter}?name=${encodeURIComponent(reading.book)}`
              : '/bijbel';
            const verseRange = reading.verseStart === reading.verseEnd
              ? `${reading.verseStart}`
              : `${reading.verseStart}-${reading.verseEnd}`;
            const highlightRange = reading.highlightStart === reading.highlightEnd
              ? `vs. ${reading.highlightStart}`
              : `vs. ${reading.highlightStart}-${reading.highlightEnd}`;
            const snippet = snippets[i];

            return (
              <div key={i} className={`lr-day-card${done ? ' done' : ''}${isExpanded ? ' expanded' : ''}`}>
                <div className="lr-day-top" onClick={() => setExpandedDay(isExpanded ? -1 : i)}>
                  <button className="lr-checkbox" onClick={(e) => { e.stopPropagation(); toggleProgress(i); }}>
                    {done ? '\u2611' : '\u2610'}
                  </button>
                  <div className="lr-day-info">
                    <span className="lr-day-name">{DAYS[i]}</span>
                    <span className="lr-reading-ref">{reading.book} {reading.chapter}:{verseRange}</span>
                  </div>
                  <span className="lr-expand-icon">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>

                {isExpanded && (
                  <div className="lr-day-detail">
                    <div className="lr-highlight-badge" style={{ borderLeftColor: seasonColor }}>
                      <span className="lr-highlight-label">Kernverzen: {highlightRange}</span>
                    </div>

                    {/* Oudvader snippet */}
                    {snippet && (
                      <div className="lr-snippet">
                        <div className="lr-snippet-header">
                          <span className="lr-snippet-author">{snippet.authorName}</span>
                          {snippet.era && <span className="lr-snippet-era">{snippet.era}</span>}
                        </div>
                        <p className="lr-snippet-text">&ldquo;{truncate(snippet.text, 250)}&rdquo;</p>
                      </div>
                    )}

                    <Link className="lr-read-btn" to={linkTo}>
                      Lees {reading.book} {reading.chapter} &rarr;
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Jaaroverzicht mini */}
        <div className="lr-year-overview">
          <div className="lr-year-label">Jaaroverzicht</div>
          <div className="lr-year-grid">
            {thematicPlan.map(w => {
              const wDone = w.readings.every((_, i) => progress[`${w.week}-${i}`]);
              const wPartial = w.readings.some((_, i) => progress[`${w.week}-${i}`]);
              const isCurrent = w.week === weekNum;
              const color = SEASON_COLORS[w.season] || '#666';
              return (
                <button
                  key={w.week}
                  className={`lr-year-dot${wDone ? ' done' : wPartial ? ' partial' : ''}${isCurrent ? ' current' : ''}`}
                  style={{ backgroundColor: wDone ? color : undefined, borderColor: isCurrent ? color : undefined }}
                  onClick={() => setWeekNum(w.week)}
                  title={`Week ${w.week}: ${w.theme}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
