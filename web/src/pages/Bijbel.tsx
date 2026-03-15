import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BibleBook } from '../types/database';

export default function Bijbel() {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('bible_books')
      .select('*')
      .order('book_order', { ascending: true })
      .then(({ data }) => {
        setBooks(data || []);
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

  const otBooks = books.filter((b) => b.testament === 'OT');
  const ntBooks = books.filter((b) => b.testament === 'NT');

  return (
    <>
      <div className="screen-header">
        <h1>Bijbel</h1>
      </div>
      <div className="page">
        <div className="section-header">
          <h2>Oude Testament</h2>
        </div>
        {otBooks.map((book) => (
          <Link
            key={book.id}
            to={`/bijbel/${book.id}?name=${encodeURIComponent(book.name)}&chapters=${book.chapter_count}`}
            className="book-item"
          >
            <span className="book-abbrev">{book.abbreviation}</span>
            <span className="book-name">{book.name}</span>
            <span className="chapter-count">{book.chapter_count} hfst.</span>
          </Link>
        ))}

        <div className="section-header">
          <h2>Nieuwe Testament</h2>
        </div>
        {ntBooks.map((book) => (
          <Link
            key={book.id}
            to={`/bijbel/${book.id}?name=${encodeURIComponent(book.name)}&chapters=${book.chapter_count}`}
            className="book-item"
          >
            <span className="book-abbrev">{book.abbreviation}</span>
            <span className="book-name">{book.name}</span>
            <span className="chapter-count">{book.chapter_count} hfst.</span>
          </Link>
        ))}
      </div>
    </>
  );
}
