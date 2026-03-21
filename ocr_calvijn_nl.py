#!/usr/bin/env python3
"""
OCR Calvijn NL gescande PDFs → JSON entries voor Supabase.
Gebruikt PyMuPDF (fitz) + Tesseract OCR.

PDFs:
  - galaten-filemon.pdf (444 pgs) → Galaten t/m Filemon
  - hebreeen-judas.pdf (138 pgs) → Hebreeën t/m Judas
  - romeinen-korinthe.pdf (379 pgs) → Romeinen, 1 Kor, 2 Kor
  - bergrede_matt5.pdf (12 pgs) → Mattheüs 5
  - ezechiel16.pdf (11 pgs) → Ezechiël 16
"""
import fitz
import pytesseract
from PIL import Image
import io, json, re, sys, time
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

BASE = Path("C:/Users/midir/schriftinzicht")
NL_DIR = BASE / "calvijn_nl"
PROGRESS_FILE = BASE / "ocr_calvijn_progress.json"

BOOK_MAP = {
    "gen": "Genesis", "genesis": "Genesis",
    "ex": "Exodus", "lev": "Leviticus", "num": "Numeri",
    "deut": "Deuteronomium",
    "ps": "Psalmen", "psalm": "Psalmen",
    "spr": "Spreuken", "pred": "Prediker",
    "jes": "Jesaja", "jer": "Jeremia",
    "ez": "Ezechiël", "ezech": "Ezechiël", "ezechiel": "Ezechiël",
    "dan": "Daniël",
    "matt": "Mattheüs", "matth": "Mattheüs", "mattheus": "Mattheüs",
    "mark": "Markus", "luk": "Lukas", "luc": "Lukas",
    "joh": "Johannes", "hand": "Handelingen",
    "rom": "Romeinen", "romeinen": "Romeinen",
    "1 kor": "1 Korinthe", "1 cor": "1 Korinthe", "1kor": "1 Korinthe",
    "2 kor": "2 Korinthe", "2 cor": "2 Korinthe", "2kor": "2 Korinthe",
    "gal": "Galaten", "galaten": "Galaten",
    "ef": "Efeze", "efeze": "Efeze",
    "fil": "Filippenzen", "kol": "Kolossenzen",
    "1 thess": "1 Thessalonicenzen", "2 thess": "2 Thessalonicenzen",
    "1 tim": "1 Timotheüs", "2 tim": "2 Timotheüs",
    "tit": "Titus", "filem": "Filemon",
    "hebr": "Hebreeën", "heb": "Hebreeën", "hebreeen": "Hebreeën",
    "jak": "Jakobus",
    "1 petr": "1 Petrus", "2 petr": "2 Petrus",
    "1 joh": "1 Johannes", "2 joh": "2 Johannes", "3 joh": "3 Johannes",
    "jud": "Judas", "judas": "Judas",
    "openb": "Openbaring van Johannes",
}


def resolve_book(name):
    name = name.lower().strip().rstrip('.')
    return BOOK_MAP.get(name)


def ocr_pdf(pdf_path, dpi=300):
    """OCR all pages of a PDF, return list of (page_num, text)."""
    doc = fitz.open(str(pdf_path))
    pages = []
    total = len(doc)
    start = time.time()

    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        img = Image.open(io.BytesIO(pix.tobytes('png')))
        text = pytesseract.image_to_string(img, lang='nld')
        pages.append((i, text))

        if (i + 1) % 10 == 0 or i == total - 1:
            elapsed = time.time() - start
            rate = (i + 1) / elapsed
            remaining = (total - i - 1) / rate if rate > 0 else 0
            print(f"  [{pdf_path.name}] {i+1}/{total} pages | {rate:.1f} pg/s | ~{remaining:.0f}s remaining",
                  flush=True)

    doc.close()
    return pages


# ── Chapter/verse detection in OCR text ──────────────────────────────────

# Book header patterns (e.g., "DE BRIEF AAN DE GALATEN" or "GALATEN")
BOOK_HEADER_RE = re.compile(
    r'(?:DE\s+)?(?:BRIEF|VERKLARING|UITLEGGING)\s+'
    r'(?:AAN|VAN|OVER)\s+(?:DE\s+)?'
    r'([\w\s]+?)(?:\s*\n|\s*$)',
    re.IGNORECASE
)

# Chapter patterns
CHAPTER_RE = re.compile(
    r'(?:HOOFDSTUK|Hoofdstuk|Hfdst\.?|Kapitel|CAPITTEL|Capittel|Cap\.?)\s+(\d+)',
    re.IGNORECASE
)

# Verse patterns
VERSE_RE = re.compile(
    r'^(?:Vs?\.\s*|Vers\s+|vs\.\s*)(\d{1,3})',
    re.IGNORECASE | re.MULTILINE
)

# Numbered line: "N. Text..."
NUMBERED_RE = re.compile(r'^(\d{1,3})\.\s+(.{10,})', re.MULTILINE)

# Book name in header
BOOK_NAMES_RE = re.compile(
    r'(?:GALATEN|EFEZE|FILIPPENZEN|KOLOSSENZEN|THESSALONICENZEN|'
    r'TIMOTHE[ÜU]S|TITUS|FILEMON|HEBRE[EË]EN|JAKOBUS|PETRUS|'
    r'JOHANNES|JUDAS|ROMEINEN|KORINTHE|MATTHE[ÜU]S|EZECHIEL|EZECHIËL)',
    re.IGNORECASE
)


def detect_book_from_text(text):
    """Try to detect book name from header text."""
    m = BOOK_NAMES_RE.search(text[:500])
    if m:
        name = m.group(0).strip()
        # Normalize
        name_lower = name.lower()
        for key, val in BOOK_MAP.items():
            if key in name_lower or name_lower.startswith(key[:3]):
                return val
    return None


def parse_ocr_pages(pages, default_book=None):
    """
    Parse OCR'd pages into commentary entries.
    Returns list of {book, chapter, verse, verse_end, text}.
    """
    entries = []
    current_book = default_book
    current_chapter = None
    current_verse = None
    body = []

    def flush():
        nonlocal current_verse, body
        if current_book and current_chapter and current_verse and body:
            t = '\n'.join(body).strip()
            # Clean OCR artifacts
            t = re.sub(r'\n{3,}', '\n\n', t)
            if len(t) > 50:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": None,
                    "text": t[:8000]
                })
        body = []

    for page_num, text in pages:
        if not text or len(text.strip()) < 20:
            continue

        lines = text.split('\n')

        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                if current_verse:
                    body.append('')
                continue

            # Detect book change from headers
            if len(line_stripped) < 80:
                book_detected = detect_book_from_text(line_stripped)
                if book_detected:
                    # Check for "1" or "2" prefix
                    prefix_m = re.match(r'(\d)\s*(?:E|DE)', line_stripped)
                    if prefix_m:
                        book_detected_check = f"{prefix_m.group(1)} {book_detected}"
                        if book_detected_check in BOOK_MAP.values():
                            book_detected = book_detected_check
                    if book_detected != current_book:
                        flush()
                        current_book = book_detected
                        current_chapter = None
                        current_verse = None
                        continue

            # Detect chapter
            cm = CHAPTER_RE.search(line_stripped)
            if cm and len(line_stripped) < 60:
                flush()
                current_chapter = int(cm.group(1))
                current_verse = None
                continue

            # Detect verse header ("Vs. N" / "Vers N")
            vm = VERSE_RE.match(line_stripped)
            if vm:
                flush()
                current_verse = int(vm.group(1))
                rest = VERSE_RE.sub('', line_stripped).strip()
                if rest:
                    body = [rest]
                continue

            # Detect numbered verse ("N. text...")
            if current_chapter:
                nm = NUMBERED_RE.match(line_stripped)
                if nm:
                    vnum = int(nm.group(1))
                    if 1 <= vnum <= 180:
                        # Heuristic: only accept as verse if it's near current or sequential
                        if current_verse is None or abs(vnum - (current_verse or 0)) < 30:
                            flush()
                            current_verse = vnum
                            body = [nm.group(2)]
                            continue

            # Regular text line
            if current_verse:
                body.append(line_stripped)

    flush()
    return entries


# ── PDF processing configuration ─────────────────────────────────────────

PDF_CONFIG = [
    {
        "file": "galaten-filemon.pdf",
        "default_book": "Galaten",
        "description": "Galaten t/m Filemon",
    },
    {
        "file": "hebreeen-judas.pdf",
        "default_book": "Hebreeën",
        "description": "Hebreeën t/m Judas",
    },
    {
        "file": "romeinen-korinthe.pdf",
        "default_book": "Romeinen",
        "description": "Romeinen, 1&2 Korinthe",
    },
    {
        "file": "bergrede_matt5.pdf",
        "default_book": "Mattheüs",
        "description": "Mattheüs 5 (Bergrede)",
    },
    {
        "file": "ezechiel16.pdf",
        "default_book": "Ezechiël",
        "description": "Ezechiël 16",
    },
]


def main():
    print("=" * 60)
    print("Calvijn NL — OCR Pipeline")
    print("=" * 60)

    # Load existing progress
    progress = {}
    if PROGRESS_FILE.exists():
        with open(PROGRESS_FILE, 'r') as f:
            progress = json.load(f)

    all_entries = []

    # Load existing parsed entries
    existing_file = BASE / "calvijn_nl_parsed.json"
    if existing_file.exists():
        with open(existing_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
        print(f"Bestaande entries geladen: {len(existing)}")
        all_entries.extend(existing)

    for cfg in PDF_CONFIG:
        pdf_path = NL_DIR / cfg["file"]
        if not pdf_path.exists():
            print(f"\n[SKIP] {cfg['file']} niet gevonden")
            continue

        if cfg["file"] in progress and progress[cfg["file"]].get("done"):
            print(f"\n[SKIP] {cfg['file']} al verwerkt ({progress[cfg['file']].get('entries', 0)} entries)")
            # Load cached OCR entries
            cache_file = BASE / f"ocr_cache_{cfg['file'].replace('.pdf', '.json')}"
            if cache_file.exists():
                with open(cache_file, 'r', encoding='utf-8') as f:
                    cached = json.load(f)
                all_entries.extend(cached)
            continue

        print(f"\n{'─' * 60}")
        print(f"OCR: {cfg['file']} ({cfg['description']})")
        print(f"{'─' * 60}")

        start = time.time()
        pages = ocr_pdf(pdf_path, dpi=250)  # 250 dpi = good balance speed/quality
        ocr_time = time.time() - start
        print(f"  OCR klaar in {ocr_time:.0f}s")

        # Save raw OCR text
        raw_file = BASE / f"ocr_raw_{cfg['file'].replace('.pdf', '.txt')}"
        with open(raw_file, 'w', encoding='utf-8') as f:
            for pg_num, text in pages:
                f.write(f"\n{'='*40} PAGE {pg_num} {'='*40}\n")
                f.write(text)
        print(f"  Raw tekst opgeslagen: {raw_file.name}")

        # Parse entries
        entries = parse_ocr_pages(pages, default_book=cfg["default_book"])
        print(f"  Geparsed: {len(entries)} entries")

        if entries:
            books = set(e['book'] for e in entries)
            for book in sorted(books):
                count = sum(1 for e in entries if e['book'] == book)
                print(f"    {book}: {count} verzen")

        # Cache entries
        cache_file = BASE / f"ocr_cache_{cfg['file'].replace('.pdf', '.json')}"
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)

        all_entries.extend(entries)

        # Update progress
        progress[cfg["file"]] = {
            "done": True,
            "entries": len(entries),
            "ocr_time_s": round(ocr_time),
            "pages": len(pages),
        }
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(progress, f, indent=2)

    # Deduplicate all entries
    seen = set()
    unique = []
    for e in all_entries:
        k = (e['book'], e['chapter'], e['verse'])
        if k not in seen:
            seen.add(k)
            unique.append(e)

    print(f"\n{'=' * 60}")
    print(f"Totaal unieke entries: {len(unique)}")

    # Save combined
    out_path = BASE / "calvijn_nl_all.json"
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print(f"Opgeslagen: {out_path}")

    # Stats per book
    books = {}
    for e in unique:
        books[e['book']] = books.get(e['book'], 0) + 1
    print("\nPer boek:")
    for book in sorted(books.keys()):
        print(f"  {book}: {books[book]}")


if __name__ == "__main__":
    main()
