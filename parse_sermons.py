#!/usr/bin/env python3
"""
Universal sermon parser for SchriftInzicht.
Extracts full sermons with titles from DOCX/PDF files.
Unlike commentary parsers, this keeps full sermon text (no truncation).

Usage: python parse_sermons.py
"""
import docx, re, json, sys, io, os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path(__file__).parent

# ─── Book name mapping (shared with parse_all_docx.py) ──────────────────────
BOOK_MAP = {}
_entries = [
    (["genesis", "gen", "gen."], "Genesis"),
    (["exodus", "ex", "ex.", "exod"], "Exodus"),
    (["leviticus", "lev", "lev."], "Leviticus"),
    (["numeri", "num", "num."], "Numeri"),
    (["deuteronomium", "deut", "deut."], "Deuteronomium"),
    (["jozua", "joz", "joz."], "Jozua"),
    (["richteren", "richt", "richt.", "ri"], "Richteren"),
    (["ruth"], "Ruth"),
    (["1 samuel", "1 sam", "1 sam.", "1samuel", "i sam"], "1 Samuel"),
    (["2 samuel", "2 sam", "2 sam.", "2samuel", "ii sam"], "2 Samuel"),
    (["1 koningen", "1 kon", "1 kon.", "1koningen", "i kon"], "1 Koningen"),
    (["2 koningen", "2 kon", "2 kon.", "2koningen", "ii kon"], "2 Koningen"),
    (["1 kronieken", "1 kron", "1 kron.", "i kron"], "1 Kronieken"),
    (["2 kronieken", "2 kron", "2 kron.", "ii kron"], "2 Kronieken"),
    (["ezra", "ezr"], "Ezra"),
    (["nehemia", "neh", "neh."], "Nehemia"),
    (["esther", "est", "est."], "Esther"),
    (["job"], "Job"),
    (["psalmen", "psalm", "ps", "ps.", "psa"], "Psalmen"),
    (["spreuken", "spr", "spr."], "Spreuken"),
    (["prediker", "pred", "pred."], "Prediker"),
    (["hooglied", "hoogl", "hoogl."], "Hooglied"),
    (["jesaja", "jes", "jes."], "Jesaja"),
    (["jeremia", "jer", "jer."], "Jeremia"),
    (["klaagliederen", "klaagl", "klaagl."], "Klaagliederen"),
    (["ezechiël", "ezechiel", "ez", "ez.", "ezech"], "Ezechiël"),
    (["daniël", "daniel", "dan", "dan."], "Daniël"),
    (["hosea", "hos", "hos."], "Hosea"),
    (["joël", "joel"], "Joël"),
    (["amos", "am", "am."], "Amos"),
    (["obadja", "ob", "ob."], "Obadja"),
    (["jona", "jon", "jon."], "Jona"),
    (["micha", "mi", "mi.", "mich"], "Micha"),
    (["nahum", "nah", "nah."], "Nahum"),
    (["habakuk", "hab", "hab."], "Habakuk"),
    (["zefanja", "zef", "zef."], "Zefanja"),
    (["haggaï", "haggai", "hag", "hag."], "Haggaï"),
    (["zacharia", "zach", "zach."], "Zacharia"),
    (["maleachi", "mal", "mal."], "Maleachi"),
    (["mattheüs", "mattheus", "matt", "matt.", "matth", "matth."], "Mattheüs"),
    (["markus", "marcus", "mark", "mark.", "marc"], "Markus"),
    (["lukas", "lucas", "luk", "luk.", "luc"], "Lukas"),
    (["johannes", "joh", "joh."], "Johannes"),
    (["handelingen", "hand", "hand."], "Handelingen"),
    (["romeinen", "rom", "rom."], "Romeinen"),
    (["1 korinthe", "1 kor", "1 kor.", "1 cor", "1 korinthiërs", "1korinthiers", "i kor"], "1 Korinthe"),
    (["2 korinthe", "2 kor", "2 kor.", "2 cor", "2 korinthiërs", "2korinthiers", "ii kor"], "2 Korinthe"),
    (["galaten", "gal", "gal."], "Galaten"),
    (["efeze", "eféze", "ef", "ef."], "Efeze"),
    (["filippenzen", "fil", "fil.", "filipp"], "Filippenzen"),
    (["kolossenzen", "kol", "kol."], "Kolossenzen"),
    (["1 thessalonicenzen", "1 thess", "1 thess.", "i thess"], "1 Thessalonicenzen"),
    (["2 thessalonicenzen", "2 thess", "2 thess.", "ii thess"], "2 Thessalonicenzen"),
    (["1 timotheüs", "1 timotheus", "1 tim", "1 tim.", "i tim"], "1 Timotheüs"),
    (["2 timotheüs", "2 timotheus", "2 tim", "2 tim.", "ii tim"], "2 Timotheüs"),
    (["titus", "tit", "tit."], "Titus"),
    (["filemon", "filem", "filem."], "Filemon"),
    (["hebreeën", "hebreeen", "hebr", "heb", "heb."], "Hebreeën"),
    (["jakobus", "jak", "jak."], "Jakobus"),
    (["1 petrus", "1 petr", "1 petr.", "1 pet", "i petr"], "1 Petrus"),
    (["2 petrus", "2 petr", "2 petr.", "2 pet", "ii petr"], "2 Petrus"),
    (["1 johannes", "1 joh", "1 joh.", "i joh"], "1 Johannes"),
    (["2 johannes", "2 joh", "2 joh.", "ii joh"], "2 Johannes"),
    (["3 johannes", "3 joh", "3 joh.", "iii joh"], "3 Johannes"),
    (["judas", "jud", "jud."], "Judas"),
    (["openbaring van johannes", "openbaring", "openb", "openb.", "op", "op."], "Openbaring van Johannes"),
]
for keys, val in _entries:
    for k in keys:
        BOOK_MAP[k] = val

_keys_sorted = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pat = "|".join(re.escape(k) for k in _keys_sorted)

VERSE_RE = re.compile(
    r'\b(' + _book_pat + r')\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?',
    re.IGNORECASE
)

def resolve_book(name):
    return BOOK_MAP.get(name.lower().strip().rstrip('.'))

def find_ref(text):
    m = VERSE_RE.search(text)
    if m:
        book = resolve_book(m.group(1))
        if book:
            end_v = int(m.group(4)) if m.group(4) else None
            return (book, int(m.group(2)), int(m.group(3)), end_v)
    return None

def get_paragraphs(path):
    d = docx.Document(str(path))
    return [(p.style.name if p.style else 'Normal', p.text.strip()) for p in d.paragraphs if p.text.strip()]

def get_pdf_pages(path):
    """Extract text from PDF using pdfplumber."""
    import pdfplumber
    pages = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return pages


# ─── Sermon parsers ──────────────────────────────────────────────────────────

def parse_numbered_sermons(path, collection=None):
    """Parse sermons with numbered titles like '1. Titel' or 'LEERREDE I'."""
    paras = get_paragraphs(path)
    entries = []

    # Patterns for sermon boundaries
    num_re = re.compile(r'^(\d{1,3})[.\)]\s+(.+)', re.UNICODE)
    leerrede_re = re.compile(r'^(?:LEERREDE|PREDICATIE|PREEK|PREECK|KEURSTOF)\s+(\w+)', re.IGNORECASE)

    sermons = []  # (index, title)
    for i, (style, text) in enumerate(paras):
        is_heading = style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4')
        m_num = num_re.match(text)
        m_leer = leerrede_re.match(text)

        if is_heading and (m_num or m_leer or len(text) < 200):
            title = text
            sermons.append((i, title))
        elif m_num and len(text) < 300:
            sermons.append((i, text))
        elif m_leer and len(text) < 300:
            sermons.append((i, text))

    # Extract sermon content between boundaries
    n = len(paras)
    for si, (pos, title) in enumerate(sermons):
        end = sermons[si + 1][0] if si + 1 < len(sermons) else n

        # Find verse reference in title or first few paragraphs
        ref = find_ref(title)
        if not ref:
            for j in range(pos + 1, min(pos + 10, end)):
                ref = find_ref(paras[j][1])
                if ref:
                    break

        if not ref:
            continue

        # Build full sermon text
        body = '\n'.join(paras[j][1] for j in range(pos, end))
        if len(body) < 100:
            continue

        # Clean title: take first line, strip number prefix
        clean_title = title.strip()
        m = num_re.match(clean_title)
        if m:
            clean_title = m.group(2).strip()
        if len(clean_title) > 200:
            clean_title = clean_title[:200]

        entry = {
            "title": clean_title,
            "book": ref[0],
            "chapter": ref[1],
            "verse": ref[2],
            "verse_end": ref[3],
            "text": body,
            "source_collection": collection,
        }
        entries.append(entry)

    return entries


def parse_heading_sermons(path, collection=None):
    """Parse sermons where headings mark sermon boundaries."""
    paras = get_paragraphs(path)
    entries = []
    n = len(paras)

    # Find all heading positions with verse references
    sermons = []
    for i, (style, text) in enumerate(paras):
        if style not in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4'):
            continue
        ref = find_ref(text)
        if not ref:
            for j in range(i + 1, min(i + 8, n)):
                ref = find_ref(paras[j][1])
                if ref:
                    break
        if ref:
            sermons.append((i, text, ref))

    for si, (pos, title, ref) in enumerate(sermons):
        end = sermons[si + 1][0] if si + 1 < len(sermons) else n
        body = '\n'.join(paras[j][1] for j in range(pos, end))
        if len(body) < 100:
            continue

        clean_title = title.strip()
        if len(clean_title) > 200:
            clean_title = clean_title[:200]

        entries.append({
            "title": clean_title,
            "book": ref[0],
            "chapter": ref[1],
            "verse": ref[2],
            "verse_end": ref[3],
            "text": body,
            "source_collection": collection,
        })

    return entries


def parse_pdf_sermons(path, collection=None):
    """Parse sermons from PDF files. Each PDF may be one sermon or multiple."""
    pages = get_pdf_pages(path)
    if not pages:
        return []

    full_text = '\n'.join(pages)

    # Try to find verse reference
    ref = find_ref(full_text[:2000])
    if not ref:
        ref = find_ref(full_text[:5000])
    if not ref:
        return []

    # Title from first meaningful line
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    title = lines[0] if lines else Path(path).stem
    if len(title) < 5 or len(title) > 200:
        title = Path(path).stem.replace('-', ' ').replace('_', ' ').title()

    return [{
        "title": title,
        "book": ref[0],
        "chapter": ref[1],
        "verse": ref[2],
        "verse_end": ref[3],
        "text": full_text,
        "source_collection": collection,
    }]


def parse_calvijn_pdf_sermons(pdf_dir, collection="Predicaties"):
    """Parse individual Calvijn sermon PDFs (one sermon per file)."""
    entries = []
    pdf_dir = Path(pdf_dir)
    if not pdf_dir.exists():
        return entries

    # Parse verse ref from filename: "Calvijn over Jesaja 53 vers 01-04.pdf"
    fname_re = re.compile(
        r'Calvijn over\s+(.+?)\s+(?:vers?|vs\.?)\s*(\d+)(?:\s*[-–]\s*(\d+))?'
        r'(?:\s+(?:en|&)\s+(.+?)\s+(?:vers?|vs\.?)\s*(\d+)(?:\s*[-–]\s*(\d+))?)?',
        re.IGNORECASE
    )

    for pdf_file in sorted(pdf_dir.glob('*.pdf')):
        m = fname_re.search(pdf_file.stem)
        if not m:
            continue

        book_name = m.group(1).strip().rstrip('.')
        book = resolve_book(book_name)
        if not book:
            # Try mapping common abbreviations
            if 'matth' in book_name.lower():
                book = 'Mattheüs'
            elif 'luk' in book_name.lower():
                book = 'Lukas'
            elif 'jes' in book_name.lower():
                book = 'Jesaja'
            else:
                print(f"  SKIP (no book match): {pdf_file.name} -> '{book_name}'")
                continue

        chapter_verse = m.group(2)
        # For these PDFs, the number IS the verse (chapter is in the book reference)
        # Need to determine chapter from the filename context
        # e.g., "Calvijn over Jesaja 53 vers 01-04" -> Jesaja, chapter=53, verse=1
        # Actually the filename has "book chapter vers verse"
        # Let me re-parse: "Jesaja 53 vers 01-04" means book=Jesaja, need to find chapter
        # The original filename pattern suggests: Book ChapterNumber vers VerseNumber

        # Re-parse more carefully
        book_chapter_re = re.compile(
            r'Calvijn over\s+(.+?)\s+(\d+)\s+(?:vers?|vs\.?)\s*(\d+)(?:\s*[-–]\s*(\d+))?',
            re.IGNORECASE
        )
        m2 = book_chapter_re.search(pdf_file.stem)
        if not m2:
            continue

        book_name2 = m2.group(1).strip().rstrip('.')
        book2 = resolve_book(book_name2)
        if not book2:
            if 'matth' in book_name2.lower():
                book2 = 'Mattheüs'
            elif 'luk' in book_name2.lower():
                book2 = 'Lukas'
            elif 'jes' in book_name2.lower():
                book2 = 'Jesaja'
        if not book2:
            continue

        chapter = int(m2.group(2))
        verse = int(m2.group(3))
        verse_end = int(m2.group(4)) if m2.group(4) else None

        try:
            pages = get_pdf_pages(pdf_file)
            text = '\n'.join(pages)
            if len(text) < 100:
                continue

            title = pdf_file.stem
            entries.append({
                "title": title,
                "book": book2,
                "chapter": chapter,
                "verse": verse,
                "verse_end": verse_end,
                "text": text,
                "source_collection": collection,
            })
            print(f"  {pdf_file.name}: {book2} {chapter}:{verse} ({len(text)} chars)")
        except Exception as e:
            print(f"  ERROR {pdf_file.name}: {e}")

    return entries


def parse_large_pdf_sermons(path, collection=None):
    """Parse a large PDF containing multiple sermons (like Smytegelt verzameld)."""
    pages = get_pdf_pages(path)
    if not pages:
        return []

    entries = []
    # Join all text and split by sermon markers
    full_text = '\n'.join(pages)

    # Try different sermon boundary patterns
    # Pattern 1: "PREEK N" or "PREDICATIE N" or "LEERREDE N"
    sermon_re = re.compile(
        r'^((?:PREEK|PREDICATIE|LEERREDE|KEURSTOF)\s+\w+.*?)$',
        re.IGNORECASE | re.MULTILINE
    )

    # Pattern 2: Numbered "N. Title"
    num_re = re.compile(r'^(\d{1,3})[.\)]\s+([A-Z].{5,})', re.MULTILINE)

    # Try pattern 1 first
    markers = list(sermon_re.finditer(full_text))
    if len(markers) < 3:
        markers = list(num_re.finditer(full_text))

    if len(markers) < 2:
        # Fallback: treat entire PDF as one sermon
        ref = find_ref(full_text[:5000])
        if ref:
            lines = [l.strip() for l in full_text.split('\n') if l.strip()]
            title = lines[0] if lines and len(lines[0]) < 200 else Path(path).stem
            return [{
                "title": title, "book": ref[0], "chapter": ref[1],
                "verse": ref[2], "verse_end": ref[3],
                "text": full_text, "source_collection": collection,
            }]
        return []

    for i, m in enumerate(markers):
        start = m.start()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(full_text)
        sermon_text = full_text[start:end].strip()

        if len(sermon_text) < 100:
            continue

        ref = find_ref(sermon_text[:2000])
        if not ref:
            continue

        title = m.group(0).strip()
        if len(title) > 200:
            title = title[:200]

        entries.append({
            "title": title,
            "book": ref[0],
            "chapter": ref[1],
            "verse": ref[2],
            "verse_end": ref[3],
            "text": sermon_text,
            "source_collection": collection,
        })

    return entries


def parse_docx_auto(path, collection=None):
    """Auto-detect best parsing strategy for a DOCX file."""
    try:
        paras = get_paragraphs(path)
    except Exception as e:
        print(f"  ERROR reading {path}: {e}")
        return []

    if not paras:
        return []

    # Count headings and numbered lines
    heading_count = sum(1 for s, t in paras if s in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4'))
    num_re = re.compile(r'^(\d{1,3})[.\)]\s+', re.UNICODE)
    numbered_count = sum(1 for _, t in paras if num_re.match(t))
    leerrede_re = re.compile(r'^(?:LEERREDE|PREDICATIE|PREEK|PREECK|KEURSTOF)\s+', re.IGNORECASE)
    leerrede_count = sum(1 for _, t in paras if leerrede_re.match(t))

    # Choose strategy
    if leerrede_count >= 3 or numbered_count >= 5:
        entries = parse_numbered_sermons(path, collection)
    elif heading_count >= 3:
        entries = parse_heading_sermons(path, collection)
    else:
        entries = parse_numbered_sermons(path, collection)
        if len(entries) < 2:
            entries = parse_heading_sermons(path, collection)

    return entries


# ─── Process all authors ─────────────────────────────────────────────────────

def main():
    all_sermons = {}

    # ── SMIJTEGELT (id=7) ──
    print("=" * 60)
    print("SMIJTEGELT (id=7)")
    print("=" * 60)
    smijtegelt = []

    docx_files = {
        '50_keurstoffen.docx': '50 Keurstoffen',
        '52_catechismus.docx': '52 Catechismuspreken',
        '16_predicaties.docx': '16 Predicaties',
        'deel1.docx': 'Een Woord op Zijn Tijd',
        'deel2.docx': 'Een Woord op Zijn Tijd',
        'deel3.docx': 'Een Woord op Zijn Tijd',
        'deel4.docx': 'Een Woord op Zijn Tijd',
        'zestal.docx': 'Zestal Leerredenen',
    }

    for fname, collection in docx_files.items():
        path = BASE / f"smijtegelt/{fname}"
        if path.exists():
            try:
                entries = parse_docx_auto(path, collection)
                print(f"  {fname}: {len(entries)} sermons [{collection}]")
                smijtegelt.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    # Smytegelt PDF from Theologienet
    smytegelt_pdf = BASE / "smytegelt-deel-1.pdf"
    if smytegelt_pdf.exists():
        try:
            entries = parse_large_pdf_sermons(smytegelt_pdf, "Verzamelde preken")
            print(f"  smytegelt-deel-1.pdf: {len(entries)} sermons")
            smijtegelt.extend(entries)
        except Exception as e:
            print(f"  ERROR smytegelt PDF: {e}")

    print(f"  TOTAL Smijtegelt: {len(smijtegelt)} sermons")
    all_sermons['smijtegelt'] = smijtegelt

    # ── CALVIJN (id=2) ──
    print("\n" + "=" * 60)
    print("CALVIJN (id=2)")
    print("=" * 60)
    calvijn = []

    calvijn_docx = {
        'calvijn_27preken_jeremia.docx': '27 Preken over Jeremia',
        'calvijn_11preken_1samuel.docx': '11 Preken over 1 Samuel',
        'calvijn_kerstpreken.docx': 'Kerstpreken',
    }
    for fname, collection in calvijn_docx.items():
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, collection)
                print(f"  {fname}: {len(entries)} sermons [{collection}]")
                calvijn.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    # Calvijn individual PDFs
    calvijn_pdfs = parse_calvijn_pdf_sermons(BASE / "calvijn_preken")
    print(f"  calvijn_preken/ PDFs: {len(calvijn_pdfs)} sermons")
    calvijn.extend(calvijn_pdfs)

    print(f"  TOTAL Calvijn: {len(calvijn)} sermons")
    all_sermons['calvijn'] = calvijn

    # ── KOHLBRÜGGE (id=14) ──
    print("\n" + "=" * 60)
    print("KOHLBRÜGGE (id=14)")
    print("=" * 60)
    kohlbrugge = []

    for i in range(1, 15):
        path = BASE / f"kohlbrugge_sv/deel_{i}.docx"
        if path.exists():
            try:
                entries = parse_heading_sermons(path, "Schriftverklaringen")
                if len(entries) < 2:
                    entries = parse_numbered_sermons(path, "Schriftverklaringen")
                print(f"  deel_{i}.docx: {len(entries)} sermons")
                kohlbrugge.extend(entries)
            except Exception as e:
                print(f"  ERROR deel_{i}: {e}")

    for fname, coll in [('kohlbrugge_galaten.docx', 'Galaten'), ('kohlbrugge_romeinen.docx', 'Romeinen')]:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, coll)
                print(f"  {fname}: {len(entries)} sermons")
                kohlbrugge.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Kohlbrügge: {len(kohlbrugge)} sermons")
    all_sermons['kohlbrugge'] = kohlbrugge

    # ── SPURGEON (id=13) ──
    print("\n" + "=" * 60)
    print("SPURGEON (id=13)")
    print("=" * 60)
    spurgeon = []

    spurgeon_files = [
        'spurgeon_johannes.docx', 'spurgeon_lukas.docx', 'spurgeon_markus.docx',
        'spurgeon_mattheus.docx', 'spurgeon_ot.docx', 'spurgeon_nt.docx',
        'spurgeon_ezechiel.docx', 'spurgeon_jesaja.docx',
        'spurgeon_32preken_nt.docx', 'spurgeon_20preken_ot.docx',
        'spurgeon_12jongelui.docx', 'spurgeon_7satan.docx',
    ]
    for fname in spurgeon_files:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, "Verzamelde preken")
                print(f"  {fname}: {len(entries)} sermons")
                spurgeon.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Spurgeon: {len(spurgeon)} sermons")
    all_sermons['spurgeon'] = spurgeon

    # ── VAN DER GROE (id=8) ──
    print("\n" + "=" * 60)
    print("VAN DER GROE (id=8)")
    print("=" * 60)
    vandergroe = []

    groe_collections = {
        'groe-12-leerreden-div-teksten.docx': '12 Leerredenen',
        'groe-14-biddagpreken.docx': '14 Biddagpreken',
        'groe-16-lijdenspreken.docx': '16 Lijdenspreken',
        'groe-5-preken-eeuwige-overwinning.docx': '5 Preken',
        'groe-7-preken-bartimeus-en-3-preken.docx': '10 Preken',
        'groe-bekering-17-preken.docx': '17 Bekeringspreken',
        'groe-biddagpreek.docx': 'Biddagpreek',
        'groe-catechismuspreken-zondag-28-tot-52.docx': 'Catechismuspreken',
        'groe-heidel-catechismuspreken.docx': 'Heidelbergse Catechismuspreken',
        'groe-tiental-preken.docx': 'Tiental Preken',
    }
    for fname, collection in groe_collections.items():
        path = BASE / f"vandergroe/{fname}"
        if path.exists():
            try:
                entries = parse_docx_auto(path, collection)
                print(f"  {fname}: {len(entries)} sermons [{collection}]")
                vandergroe.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Van der Groe: {len(vandergroe)} sermons")
    all_sermons['vandergroe'] = vandergroe

    # ── HELLENBROEK (id=9) ──
    print("\n" + "=" * 60)
    print("HELLENBROEK (id=9)")
    print("=" * 60)
    hellenbroek = []

    for fname, coll in [
        ('hellenbroek_13adventspreken.docx', 'Adventspreken'),
        ('hellenbroek_4keurstoffen.docx', 'Keurstoffen'),
    ]:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, coll)
                print(f"  {fname}: {len(entries)} sermons")
                hellenbroek.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Hellenbroek: {len(hellenbroek)} sermons")
    all_sermons['hellenbroek'] = hellenbroek

    # ── COMRIE (id=6) ──
    print("\n" + "=" * 60)
    print("COMRIE (id=6)")
    print("=" * 60)
    comrie = []

    for fname, coll in [
        ('comrie_11leerredenen.docx', 'Leerredenen'),
        ('comrie_14preken.docx', 'Preken'),
        ('comrie_abc.docx', 'ABC des Geloofs'),
    ]:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, coll)
                print(f"  {fname}: {len(entries)} sermons")
                comrie.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Comrie: {len(comrie)} sermons")
    all_sermons['comrie'] = comrie

    # ── BOSTON (id=12) ──
    print("\n" + "=" * 60)
    print("BOSTON (id=12)")
    print("=" * 60)
    boston = []

    boston_files = ['boston_4staten.docx']
    # Also check for boston_7ental_*.docx
    for f in sorted(BASE.glob('boston_7ental_*.docx')):
        boston_files.append(f.name)

    for fname in boston_files:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, "Zevenentallen")
                print(f"  {fname}: {len(entries)} sermons")
                boston.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Boston: {len(boston)} sermons")
    all_sermons['boston'] = boston

    # ── BRAKEL (id=4) ──
    print("\n" + "=" * 60)
    print("BRAKEL (id=4)")
    print("=" * 60)
    brakel = []

    for fname in ['brakel_rgd.docx', 'brakel_rgd2.docx']:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, "Redelijke Godsdienst")
                print(f"  {fname}: {len(entries)} sermons")
                brakel.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Brakel: {len(brakel)} sermons")
    all_sermons['brakel'] = brakel

    # ── VOETIUS (id=5) ──
    print("\n" + "=" * 60)
    print("VOETIUS (id=5)")
    print("=" * 60)
    voetius = []

    for fname in ['voetius_preek.docx', 'voetius_troost.docx']:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, "Preken")
                print(f"  {fname}: {len(entries)} sermons")
                voetius.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Voetius: {len(voetius)} sermons")
    all_sermons['voetius'] = voetius

    # ── BUNYAN (id=11) ──
    print("\n" + "=" * 60)
    print("BUNYAN (id=11)")
    print("=" * 60)
    bunyan = []

    for fname in ['bunyan_werken_1.docx', 'bunyan_werken_2.docx']:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, "Verzamelde werken")
                print(f"  {fname}: {len(entries)} sermons")
                bunyan.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    # Bunyan PDFs from Theologienet
    for pdf_name, coll in [
        ('bunyan-christenreis.pdf', 'De Christenreis'),
        ('bunyan-komen-en-welkom.pdf', 'Komen en Welkom bij Jezus Christus'),
    ]:
        path = BASE / pdf_name
        if path.exists():
            try:
                entries = parse_large_pdf_sermons(path, coll)
                print(f"  {pdf_name}: {len(entries)} sermons")
                bunyan.extend(entries)
            except Exception as e:
                print(f"  ERROR {pdf_name}: {e}")

    print(f"  TOTAL Bunyan: {len(bunyan)} sermons")
    all_sermons['bunyan'] = bunyan

    # ── LUTHER (id=1) ──
    print("\n" + "=" * 60)
    print("LUTHER (id=1)")
    print("=" * 60)
    luther = []

    for fname, coll in [
        ('luther_galaten.docx', 'Galaten'),
        ('luther_psalm117_118_127.docx', 'Psalmen'),
        ('luther_psalmen.docx', 'Psalmen'),
        ('luther_romeinen.docx', 'Romeinen'),
    ]:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_docx_auto(path, coll)
                print(f"  {fname}: {len(entries)} sermons")
                luther.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")

    print(f"  TOTAL Luther: {len(luther)} sermons")
    all_sermons['luther'] = luther

    # ─── Save results ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SAVING RESULTS")
    print("=" * 60)

    author_ids = {
        'smijtegelt': 7, 'calvijn': 2, 'kohlbrugge': 14, 'spurgeon': 13,
        'vandergroe': 8, 'hellenbroek': 9, 'comrie': 6, 'boston': 12,
        'brakel': 4, 'voetius': 5, 'bunyan': 11, 'luther': 1,
    }

    for author, entries in all_sermons.items():
        if not entries:
            print(f"  {author}: 0 sermons (skipped)")
            continue
        outpath = BASE / f"sermons_{author}.json"
        with open(str(outpath), 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"  {author} (id={author_ids.get(author, '?')}): {len(entries)} sermons -> {outpath.name}")

    total = sum(len(e) for e in all_sermons.values())
    print(f"\nGRAND TOTAL: {total} sermons extracted")

    return all_sermons


if __name__ == "__main__":
    main()
