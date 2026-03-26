import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { thematicPlan, getWeekOfYear, SEASON_COLORS } from '../data/thematicPlan';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';
import useDocumentTitle from '../hooks/useDocumentTitle';

const PROGRESS_KEY = 'si-thematic-progress';
const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];

const NT_BOOKS = new Set([
  'Mattheüs', 'Markus', 'Lukas', 'Johannes', 'Handelingen',
  'Romeinen', 'Korinthe', '1 Korinthe', '2 Korinthe',
  'Galaten', 'Efeze', 'Filippenzen', 'Kolossenzen',
  '1 Thessalonicenzen', '2 Thessalonicenzen',
  '1 Timotheüs', '2 Timotheüs', 'Titus', 'Filemon',
  'Hebreeën', 'Jakobus', '1 Petrus', '2 Petrus',
  '1 Johannes', '2 Johannes', '3 Johannes', 'Judas', 'Openbaring',
]);

type Progress = Record<string, boolean>;

function loadProgress(): Progress {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
}

function getDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1; // ma=0, zo=6
}

interface VerseSnippet {
  verses: { verse: number; text: string }[];
}

export default function Leesrooster() {
  useDocumentTitle('Leesrooster');
  const currentWeekNum = getWeekOfYear();
  const [weekNum, setWeekNum] = useState(currentWeekNum);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [bookIdMap, setBookIdMap] = useState<Record<string, string>>({});
  const [expandedDay, setExpandedDay] = useState<number>(getDayOfWeek());
  const [snippets, setSnippets] = useState<Record<number, VerseSnippet | null>>({});

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

  // Fetch kernverzen (actual Bible verses) for highlight ranges
  useEffect(() => {
    if (!Object.keys(bookIdMap).length) return;

    async function fetchSnippets() {
      const results: Record<number, VerseSnippet | null> = {};

      for (let i = 0; i < week.readings.length; i++) {
        const r = week.readings[i];
        const uuid = bookIdMap[r.book];
        if (!uuid) { results[i] = null; continue; }

        try {
          const { data: verses } = await supabase.from('bible_verses')
            .select('verse, text_sv')
            .eq('book_id', uuid)
            .eq('chapter', r.chapter)
            .gte('verse', r.highlightStart)
            .lte('verse', r.highlightEnd)
            .order('verse', { ascending: true });

          if (verses?.length) {
            results[i] = { verses: verses.map(v => ({ verse: v.verse, text: v.text_sv })) };
          } else {
            results[i] = null;
          }
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
              ? `/bijbel/${uuid}/${reading.chapter}?name=${encodeURIComponent(reading.book)}&hlStart=${reading.verseStart}&hlEnd=${reading.verseEnd}`
              : '/bijbel';
            const verseRange = reading.verseStart === reading.verseEnd
              ? `${reading.verseStart}`
              : `${reading.verseStart}-${reading.verseEnd}`;
            const highlightRange = reading.highlightStart === reading.highlightEnd
              ? `vs. ${reading.highlightStart}`
              : `vs. ${reading.highlightStart}-${reading.highlightEnd}`;
            const snippet = snippets[i];
            const isNT = NT_BOOKS.has(reading.book);

            return (
              <div key={i} className={`lr-day-card${done ? ' done' : ''}${isExpanded ? ' expanded' : ''}`}>
                <div className="lr-day-top" onClick={() => setExpandedDay(isExpanded ? -1 : i)}>
                  <button className="lr-checkbox" onClick={(e) => { e.stopPropagation(); toggleProgress(i); }}
                    aria-label={done ? 'Gelezen' : 'Markeer als gelezen'} />
                  <div className="lr-day-info">
                    <span className="lr-day-name">{DAYS[i]}</span>
                    <span className="lr-reading-ref">
                      <span className={`lr-testament-badge ${isNT ? 'nt' : 'ot'}`}>{isNT ? 'NT' : 'OT'}</span>
                      {reading.book} {reading.chapter}:{verseRange}
                    </span>
                  </div>
                  <span className="lr-expand-icon">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>

                {isExpanded && (
                  <div className="lr-day-detail">
                    <div className="lr-highlight-badge" style={{ borderLeftColor: seasonColor }}>
                      <span className="lr-highlight-label">Kernverzen: {highlightRange}</span>
                    </div>

                    {/* Kernverzen */}
                    {snippet && (
                      <div className="lr-kernverzen">
                        {snippet.verses.map(v => (
                          <p key={v.verse} className="lr-kernvers">
                            <sup className="lr-kernvers-num">{v.verse}</sup>
                            {v.text}
                          </p>
                        ))}
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

        {/* Jaaroverzicht */}
        <div className="lr-year-overview">
          <div className="lr-year-label">Jaaroverzicht — klik op een week</div>
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
                  style={{
                    backgroundColor: wDone ? color : `${color}18`,
                    borderColor: isCurrent ? color : wPartial ? `${color}60` : 'transparent',
                  }}
                  onClick={() => setWeekNum(w.week)}
                  title={`Week ${w.week}: ${w.theme} (${w.season})`}
                >
                  {w.week}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
