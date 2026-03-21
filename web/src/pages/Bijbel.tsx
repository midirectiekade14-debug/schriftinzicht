import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BibleBook } from '../types/database';
import Logo from '../components/Logo';
import { displayBookName } from '../lib/parseReference';

export default function Bijbel() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openBook, setOpenBook] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('bible_books')
      .select('*')
      .order('book_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) { setError('Kon bijbelboeken niet laden.'); }
        else { setBooks(data || []); }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <div className="screen-header"><h1>Bijbel</h1></div>
        <div className="page"><div className="loader"><div className="spinner" /></div></div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="screen-header"><h1>Bijbel</h1></div>
        <div className="page"><div className="error-box">{error}</div></div>
      </>
    );
  }

  const otBooks = books.filter((b) => b.testament === 'OT');
  const ntBooks = books.filter((b) => b.testament === 'NT');

  const toggleBook = (bookId: string) => {
    setOpenBook(prev => prev === bookId ? null : bookId);
  };

  const renderBook = (book: BibleBook) => {
    const isOpen = openBook === book.id;
    const chapters = Array.from({ length: book.chapter_count }, (_, i) => i + 1);
    return (
      <div key={book.id} className="bible-book-entry">
        <button className="bible-book-row" onClick={() => toggleBook(book.id)}>
          <span className="bible-book-name">{displayBookName(book.name)}</span>
          <span className="bible-book-meta">
            <span className="bible-book-ch-count">{book.chapter_count}</span>
            <span className={`bible-book-arrow ${isOpen ? 'open' : ''}`}>{'\u203A'}</span>
          </span>
        </button>
        {isOpen && (
          <div className="bible-ch-grid">
            {chapters.map((ch) => (
              <button
                key={ch}
                className="bible-ch-btn"
                onClick={() => navigate(`/bijbel/${book.id}/${ch}?name=${encodeURIComponent(book.name)}`)}
              >
                {ch}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="screen-header">
        <h1>Bijbel</h1>
      </div>
      <div className="page">
        <Logo />
        <div className="bible-two-col">
          <div className="bible-col">
            <div className="bible-col-header">Oude Testament</div>
            {otBooks.map(renderBook)}
          </div>
          <div className="bible-col">
            <div className="bible-col-header">Nieuwe Testament</div>
            {ntBooks.map(renderBook)}
          </div>
        </div>
      </div>
    </>
  );
}
