import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CatechismQuestion } from '../types/database';

interface SundaySection {
  title: string;
  questions: CatechismQuestion[];
}

export default function Catechismus() {
  const [sections, setSections] = useState<SundaySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase
      .from('catechism_questions')
      .select('*')
      .order('question_number', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const grouped: Record<number, CatechismQuestion[]> = {};
          for (const q of data) {
            const sunday = q.lord_day || 0;
            if (!grouped[sunday]) grouped[sunday] = [];
            grouped[sunday].push(q);
          }
          setSections(
            Object.entries(grouped)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([sunday, questions]) => ({
                title: Number(sunday) > 0 ? `Zondag ${sunday}` : 'Overig',
                questions,
              }))
          );
        }
        setLoading(false);
      });
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <>
        <div className="screen-header"><h1>Catechismus</h1></div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <div className="screen-header"><h1>Catechismus</h1></div>
        <div className="page welcome">
          <h1>Catechismus</h1>
          <p>De Heidelbergse Catechismus wordt vannacht geladen.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="screen-header">
        <h1>Catechismus</h1>
      </div>
      <div className="page">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="catechism-section-header">
              <h2>{section.title}</h2>
            </div>
            {section.questions.map((q) => {
              const isExpanded = expanded[q.id];
              return (
                <div
                  key={q.id}
                  className="question-card"
                  onClick={() => toggleExpand(q.id)}
                >
                  <div className="question-number">Vraag {q.question_number}</div>
                  <div className="question-text">{q.question_text}</div>
                  {isExpanded && (
                    <div className="answer-container">
                      <div className="answer-label">Antwoord:</div>
                      <div className="answer-text">{q.answer_text}</div>
                    </div>
                  )}
                  {!isExpanded && (
                    <div className="expand-hint">Tik voor antwoord &#9660;</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
