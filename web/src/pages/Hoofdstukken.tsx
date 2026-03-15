import { Link, useParams, useSearchParams } from 'react-router-dom';

export default function Hoofdstukken() {
  const { bookId } = useParams();
  const [searchParams] = useSearchParams();
  const bookName = searchParams.get('name') || 'Boek';
  const chapterCount = parseInt(searchParams.get('chapters') || '0', 10);

  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

  return (
    <>
      <div className="screen-header">
        <Link to="/bijbel" className="back-link">&lsaquo; Bijbel</Link>
        <h1>{bookName}</h1>
      </div>
      <div className="page">
        <div className="chapter-grid">
          {chapters.map((ch) => (
            <Link
              key={ch}
              to={`/bijbel/${bookId}/${ch}?name=${encodeURIComponent(bookName)}`}
              className="chapter-btn"
            >
              {ch}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
