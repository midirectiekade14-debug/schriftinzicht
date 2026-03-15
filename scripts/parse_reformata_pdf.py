#!/usr/bin/env python3
"""
Parse Calvijn verklaringen PDFs (reformata.nl) into JSON for Supabase import.
Handles all 44 PDFs with various formatting patterns.

Usage:
    python scripts/parse_reformata_pdf.py data/calvijn-verklaringen/ --output data/calvijn-complete.json
    python scripts/parse_reformata_pdf.py "data/calvijn-verklaringen/25. Romeinen [Calvijn].pdf" --output data/test.json
"""
import pdfplumber, re, json, sys, io, os, argparse
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ─── Book name mapping ────────────────────────────────────────────────────────
# Filename fragments → Dutch Bible book names (matching bible_books.json)
FILENAME_TO_BOOKS = {
    "01. Genesis": ["Genesis"],
    "02. Exodus": ["Exodus", "Leviticus", "Numeri", "Deuteronomium"],
    "03. Jozua": ["Jozua"],
    "04. Psalmen": ["Psalmen"],
    "05. Jesaja": ["Jesaja"],
    "06. Jeremia": ["Jeremia"],
    "07. Klaagliederen": ["Klaagliederen"],
    "08. Ezechiel": ["Ezechiël"],
    "09. Daniel": ["Daniël"],
    "10. Hosea": ["Hosea"],
    "11. Joel": ["Joël"],
    "12. Amos": ["Amos"],
    "13. Obadja": ["Obadja"],
    "14. Jona": ["Jona", "Micha", "Nahum"],
    "15. Micha": ["Micha"],
    "16. Nahum": ["Nahum"],
    "17. Habakuk": ["Habakuk"],
    "18. Zefanja": ["Zefanja"],
    "19. Haggai": ["Haggaï"],
    "20. Zacharia": ["Zacharia"],
    "21. Maleachi": ["Maleachi"],
    "22. Evangeliën": ["Mattheüs", "Marcus", "Lucas"],
    "23. Johannes": ["Johannes"],
    "24. Handelingen": ["Handelingen der apostelen"],
    "25. Romeinen": ["Romeinen"],
    "26. 1 Korinthe": ["1 Korinthiërs"],
    "27. 2 Korinthe": ["2 Korinthiërs"],
    "28. Galaten": ["Galaten"],
    "29. Efeze": ["Efeziërs"],
    "30. Filippenzen": ["Filippenzen"],
    "31. Kolossenzen": ["Kolossenzen"],
    "32. 1 Thessalonicenzen": ["1 Thessalonicenzen"],
    "33. 2 Thessalonicenzen": ["2 Thessalonicenzen"],
    "34. 1 Timotheüs": ["1 Timotheüs"],
    "35. 2 Timotheüs": ["2 Timotheüs"],
    "36. Titus": ["Titus"],
    "37. Filemon": ["Filemon"],
    "38. Hebreeën": ["Hebreeën"],
    "39. Jakobus": ["Jakobus"],
    "40. 1 Petrus": ["1 Petrus"],
    "41. 2 Petrus": ["2 Petrus"],
    "42. 1 Johannes": ["1 Johannes"],
    "43. Judas": ["Judas"],
    "44. Pastorale brieven": ["1 Timotheüs", "2 Timotheüs", "Titus"],
}

# Text patterns → Dutch Bible book names for in-text detection
BOOK_PATTERNS = {
    r"genesis": "Genesis",
    r"exodus": "Exodus",
    r"leviticus": "Leviticus",
    r"numeri": "Numeri",
    r"deuteronomium": "Deuteronomium",
    r"jozua": "Jozua",
    r"psalmen?": "Psalmen",
    r"jesaja": "Jesaja",
    r"jeremia": "Jeremia",
    r"klaagliederen": "Klaagliederen",
    r"ezech?i[eë]l": "Ezechiël",
    r"dani[eë]l": "Daniël",
    r"hosea": "Hosea",
    r"jo[eë]l": "Joël",
    r"amos": "Amos",
    r"obadja": "Obadja",
    r"jona": "Jona",
    r"micha": "Micha",
    r"nahum": "Nahum",
    r"habakuk": "Habakuk",
    r"zefanja": "Zefanja",
    r"hagga[ïi]": "Haggaï",
    r"zacharia": "Zacharia",
    r"maleachi": "Maleachi",
    r"matth?e[uü]s": "Mattheüs",
    r"marcus": "Marcus",
    r"lukas": "Lucas",
    r"johannes": "Johannes",
    r"handelingen": "Handelingen der apostelen",
    r"romeinen": "Romeinen",
    r"1\s*korinthe": "1 Korinthiërs",
    r"2\s*korinthe": "2 Korinthiërs",
    r"1\s*korinth": "1 Korinthiërs",
    r"2\s*korinth": "2 Korinthiërs",
    r"galaten": "Galaten",
    r"efez(?:e|i[eë]rs)": "Efeziërs",
    r"filippenzen": "Filippenzen",
    r"kolossenzen": "Kolossenzen",
    r"1\s*thessalonicenzen": "1 Thessalonicenzen",
    r"2\s*thessalonicenzen": "2 Thessalonicenzen",
    r"1\s*timoth?e[uü]s": "1 Timotheüs",
    r"2\s*timoth?e[uü]s": "2 Timotheüs",
    r"titus": "Titus",
    r"filemon": "Filemon",
    r"hebre[eë]+n": "Hebreeën",
    r"jakobus": "Jakobus",
    r"1\s*petrus": "1 Petrus",
    r"2\s*petrus": "2 Petrus",
    r"1\s*johannes": "1 Johannes",
    r"2\s*johannes": "2 Johannes",
    r"3\s*johannes": "3 Johannes",
    r"judas": "Judas",
    r"openbaring": "Openbaring van Johannes",
    # Spelling variants found in PDF headers
    r"jacobus": "Jakobus",
    r"thessalonicensen": "1 Thessalonicenzen",
    r"1\s*thessalonicensen": "1 Thessalonicenzen",
    r"2\s*thessalonicensen": "2 Thessalonicenzen",
    r"timotheus": "1 Timotheüs",
    r"1\s*timotheus": "1 Timotheüs",
    r"2\s*timotheus": "2 Timotheüs",
    r"1\s*korinthe\b": "1 Korinthiërs",
    r"2\s*korinthe\b": "2 Korinthiërs",
}

# Short abbreviations used in verse headers (e.g., "MATT. 3:1" or "LUK. 1:5")
ABBREV_MAP = {
    "gen": "Genesis", "ex": "Exodus", "lev": "Leviticus",
    "num": "Numeri", "deut": "Deuteronomium", "joz": "Jozua",
    "ps": "Psalmen", "jes": "Jesaja", "jer": "Jeremia",
    "kla": "Klaagliederen", "ezech": "Ezechiël", "ez": "Ezechiël",
    "dan": "Daniël", "hos": "Hosea", "joel": "Joël", "joël": "Joël",
    "am": "Amos", "ob": "Obadja", "jona": "Jona", "mi": "Micha",
    "nah": "Nahum", "hab": "Habakuk", "zef": "Zefanja",
    "hag": "Haggaï", "zach": "Zacharia", "mal": "Maleachi",
    "matt": "Mattheüs", "matth": "Mattheüs",
    "mar": "Marcus", "mark": "Marcus",
    "luk": "Lucas", "luc": "Lucas",
    "joh": "Johannes",
    "hand": "Handelingen der apostelen",
    "rom": "Romeinen",
    "1 kor": "1 Korinthiërs", "2 kor": "2 Korinthiërs",
    "1 cor": "1 Korinthiërs", "2 cor": "2 Korinthiërs",
    "gal": "Galaten", "ef": "Efeziërs",
    "fil": "Filippenzen", "kol": "Kolossenzen",
    "1 thess": "1 Thessalonicenzen", "2 thess": "2 Thessalonicenzen",
    "1 tim": "1 Timotheüs", "2 tim": "2 Timotheüs",
    "tit": "Titus", "filem": "Filemon",
    "hebr": "Hebreeën", "heb": "Hebreeën",
    "jak": "Jakobus",
    "1 petr": "1 Petrus", "2 petr": "2 Petrus",
    "1 joh": "1 Johannes", "2 joh": "2 Johannes", "3 joh": "3 Johannes",
    "jud": "Judas", "judas": "Judas",
    "openb": "Openbaring van Johannes",
    # Spelling variants found in PDFs
    "jacobus": "Jakobus",
    "thessalonicensen": "1 Thessalonicenzen",  # misspelling in PDF headers
    "1 thessalonicensen": "1 Thessalonicenzen",
    "2 thessalonicensen": "2 Thessalonicenzen",
    "timotheus": "1 Timotheüs",
    "1 timotheus": "1 Timotheüs",
    "2 timotheus": "2 Timotheüs",
    "korinthe": "1 Korinthiërs",
    "1 korinthe": "1 Korinthiërs",
    "2 korinthe": "2 Korinthiërs",
    "petrus": "1 Petrus",
    "1 petrus": "1 Petrus",
    "2 petrus": "2 Petrus",
    "johannes": "Johannes",
    "1 johannes": "1 Johannes",
    "2 johannes": "2 Johannes",
    "3 johannes": "3 Johannes",
    "filemon": "Filemon",
    "hosea": "Hosea",
}


# Books with only 1 chapter — auto-set chapter=1
SINGLE_CHAPTER_BOOKS = {
    "Obadja", "Filemon", "2 Johannes", "3 Johannes", "Judas",
}


def get_books_from_filename(filename):
    """Determine which books a PDF contains from its filename."""
    stem = Path(filename).stem  # Remove .pdf
    for prefix, books in FILENAME_TO_BOOKS.items():
        if stem.lower().startswith(prefix.lower()):
            return books
    return []


def resolve_book_name(text):
    """Try to resolve a text string to a Bible book name."""
    text = text.strip().rstrip('.')
    # Try abbreviation map first
    key = text.lower().strip()
    if key in ABBREV_MAP:
        return ABBREV_MAP[key]
    # Try full name patterns
    for pattern, name in BOOK_PATTERNS.items():
        if re.match(pattern, text, re.IGNORECASE):
            return name
    return None


def extract_text_from_pdf(pdf_path):
    """Extract all text from a PDF file, skipping first few pages (title/TOC)."""
    pages_text = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                pages_text.append(t)
    return pages_text


# ─── Section header regex patterns ───────────────────────────────────────────

# Pattern 1: "ROMEINEN 1:1-7" or "JONA 1." or "GENESIS 12." or "GALATEN. 1"
# Also handles Roman numerals: "HOSEA I." and no-space dots: "1 KORINTHE.10"
# Book name + optional dot + chapter number + optional verse range
SECTION_HEADER_RE = re.compile(
    r'^(?:\[\d+\]\s*)?'  # optional page number ONLY in brackets like [32]
    r'((?:[123]\s+)?[A-Z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF]+(?:\s+(?:DER\s+)?[A-Z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF]+)*)'  # Book name
    r'\.?\s*(\d{1,3}|[IVXLC]+)'  # Optional dot + Chapter (arabic or roman)
    r'(?:\s*[:.]\s*(\d{1,3}))?'  # Optional start verse
    r'(?:\s*[-–]\s*(\d{1,3}))?'  # Optional end verse
    r'\s*\.?\s*$',  # End of line
    re.MULTILINE
)

# Pattern 2: Evangeliën style "(N.) LUKAS 1:5-13."
EVANGELIEN_HEADER_RE = re.compile(
    r'^\(?(\d+)\.\)?\s+'  # Section number
    r'((?:[123]\s+)?[A-Z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF]+(?:\.\s*)?)'  # Book name/abbrev
    r'\s*(\d{1,3})\s*:\s*(\d{1,3})'  # Chapter:verse
    r'(?:\s*[-–]\s*(\d{1,3}))?'  # Optional end verse
    r'\s*\.?\s*$',
    re.MULTILINE
)

# Pattern 3: "PSALM 119." or "PSALM 2."
PSALM_HEADER_RE = re.compile(
    r'^(?:\[?\d+\]?\s*)?PSALM\s+(\d{1,3})\s*\.?\s*$',
    re.MULTILINE | re.IGNORECASE
)

# Pattern 4: Chapter headers "HOOFDSTUK 1" or "HOOFDSTUK I"
CHAPTER_HEADER_RE = re.compile(
    r'^(?:\[?\d+\]?\s*)?(?:HOOFDSTUK|Hoofdstuk|HET\s+\w+\s+HOOFDSTUK)\s+(\d+|[IVXLC]+)\s*\.?\s*$',
    re.MULTILINE
)

# Pattern 5: Verse-level entries "N. text..." at line start
VERSE_NUM_RE = re.compile(r'^(\d{1,3})\.\s+(.{5,})', re.MULTILINE)

# Pattern 6: "Vs. N-M" or "Vers N"
VS_RE = re.compile(r'^(?:Vs|VS|Vers)\.?\s+(\d{1,3})(?:\s*[-–,]\s*(\d{1,3}))?', re.MULTILINE | re.IGNORECASE)

# Book header in running text (for multi-book PDFs)
BOOK_HEADER_RE = re.compile(
    r'^((?:[123]\s+)?(?:' +
    '|'.join([
        'GENESIS', 'EXODUS', 'LEVITICUS', 'NUMERI', 'DEUTERONOMIUM',
        'JOZUA', 'PSALMEN?', 'JESAJA', 'JEREMIA', 'KLAAGLIEDEREN',
        r'EZECH?I[EË]L', r'DANI[EË]L', 'HOSEA', r'JO[EË]L', 'AMOS',
        'OBADJA', 'JONA', 'MICHA', 'NAHUM', 'HABAKUK', 'ZEFANJA',
        r'HAGGA[ÏI]', 'ZACHARIA', 'MALEACHI',
        r'MATTH?E[UÜ]S', 'MARCUS', 'LUKAS', 'JOHANNES',
        'HANDELINGEN', 'ROMEINEN',
        r'1\s*KORINTHE', r'2\s*KORINTHE',
        'GALATEN', r'EFEZ(?:E|IËRS)', 'FILIPPENZEN', 'KOLOSSENZEN',
        r'1\s*THESSALONICENZEN', r'2\s*THESSALONICENZEN',
        r'1\s*TIMOTHEÜS', r'2\s*TIMOTHEÜS', 'TITUS', 'FILEMON',
        r'HEBRE[EË]+N', 'JAKOBUS',
        r'1\s*PETRUS', r'2\s*PETRUS',
        r'1\s*JOHANNES', r'2\s*JOHANNES', r'3\s*JOHANNES',
        'JUDAS', 'OPENBARING',
    ]) +
    r'))\s*$',
    re.MULTILINE | re.IGNORECASE
)

# Detect "Pagina N van M" footer
PAGE_FOOTER_RE = re.compile(r'^Pagina\s+\d+\s+van\s+\d+\s*$', re.MULTILINE)

# Roman numeral conversion
def roman_to_int(s):
    """Convert Roman numeral string to integer."""
    roman = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100}
    result = 0
    s = s.upper()
    for i in range(len(s)):
        if i + 1 < len(s) and roman.get(s[i], 0) < roman.get(s[i+1], 0):
            result -= roman.get(s[i], 0)
        else:
            result += roman.get(s[i], 0)
    return result


def parse_chapter_num(s):
    """Parse a chapter number from arabic or roman numeral string."""
    s = s.strip().rstrip('.')
    try:
        return int(s)
    except ValueError:
        return roman_to_int(s)


def clean_text(text):
    """Clean extracted text."""
    # Remove page footers
    text = PAGE_FOOTER_RE.sub('', text)
    # Remove page number markers like [32]
    text = re.sub(r'\[\d+\]', '', text)
    # Normalize whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def is_intro_page(text):
    """Detect if a page is introductory (title, TOC, publisher info)."""
    indicators = [
        'VERKLARING VAN DE BIJBEL',
        'DOOR\nJohannes Calvijn',
        'DE GROOT GOUDRIAAN',
        'ISBN 90',
        'NUR 700',
        'Ongewijzigde fotografische herdruk',
        'Legenda Kleur Uitleg',
    ]
    for ind in indicators:
        if ind in text:
            return True
    return False


def parse_epistles(full_text, allowed_books):
    """
    Parse epistles/letters format.
    Headers like: ROMEINEN 1:1-7
    Then verse-by-verse commentary with "N. text..." pattern.
    """
    entries = []
    lines = full_text.split('\n')

    current_book = allowed_books[0] if len(allowed_books) == 1 else None
    current_chapter = None
    current_verse = None
    current_verse_end = None
    body = []

    def flush():
        nonlocal current_verse, body
        if current_book and current_chapter and current_verse and body:
            text = '\n'.join(body).strip()
            text = clean_commentary_text(text)
            if len(text) > 30:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": text
                })
        body = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_verse:
                body.append('')
            continue

        # Skip page footers
        if PAGE_FOOTER_RE.match(stripped):
            continue

        # Check for section header: "BOEK CHAPTER:START-END"
        m = SECTION_HEADER_RE.match(stripped)
        if m:
            book_candidate = resolve_book_name(m.group(1))
            if book_candidate and (not allowed_books or book_candidate in allowed_books):
                flush()
                current_book = book_candidate
                current_chapter = parse_chapter_num(m.group(2))
                if m.group(3):
                    current_verse = int(m.group(3))
                    current_verse_end = int(m.group(4)) if m.group(4) else None
                else:
                    current_verse = None
                    current_verse_end = None
                body = []
                continue

        # Check for chapter header
        cm = CHAPTER_HEADER_RE.match(stripped)
        if cm:
            flush()
            ch_str = cm.group(1)
            try:
                current_chapter = int(ch_str)
            except ValueError:
                current_chapter = roman_to_int(ch_str)
            current_verse = None
            body = []
            continue

        # Check for book header in multi-book PDFs
        bm = BOOK_HEADER_RE.match(stripped)
        if bm and len(stripped) < 40:
            book_candidate = resolve_book_name(bm.group(1))
            if book_candidate and (not allowed_books or book_candidate in allowed_books):
                flush()
                current_book = book_candidate
                # Single-chapter books: auto-set chapter 1
                current_chapter = 1 if book_candidate in SINGLE_CHAPTER_BOOKS else None
                current_verse = None
                body = []
                continue

        # For single-chapter books: if we have a book but no chapter, set chapter=1
        if current_book and current_book in SINGLE_CHAPTER_BOOKS and current_chapter is None:
            current_chapter = 1

        # Verse-level detection within a chapter
        if current_chapter:
            # "Vs. N" or "Vers N"
            vm = VS_RE.match(stripped)
            if vm:
                flush()
                current_verse = int(vm.group(1))
                current_verse_end = int(vm.group(2)) if vm.group(2) else None
                body = [stripped]
                continue

            # "N. text..."
            nm = VERSE_NUM_RE.match(stripped)
            if nm:
                vnum = int(nm.group(1))
                # Sanity: verse numbers should be reasonable
                if 1 <= vnum <= 176:  # 176 = max verses (Psalm 119)
                    # Check it's a reasonable next verse
                    if current_verse is None or (vnum >= current_verse and vnum <= current_verse + 30):
                        flush()
                        current_verse = vnum
                        current_verse_end = None
                        body = [nm.group(2)]
                        continue

        # Accumulate body text
        if current_verse:
            body.append(stripped)

    flush()
    return entries


def parse_evangelien(full_text, allowed_books):
    """
    Parse Evangeliën harmony format.
    Headers like: (2.) LUKAS 1:5-13.
    """
    entries = []
    lines = full_text.split('\n')

    current_book = None
    current_chapter = None
    current_verse = None
    current_verse_end = None
    body = []
    in_commentary = False

    def flush():
        nonlocal body, in_commentary
        if current_book and current_chapter and current_verse and body:
            text = '\n'.join(body).strip()
            text = clean_commentary_text(text)
            if len(text) > 30:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": text
                })
        body = []
        in_commentary = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if in_commentary:
                body.append('')
            continue

        if PAGE_FOOTER_RE.match(stripped):
            continue

        # Check for Evangeliën section header: "(N.) BOEK CHAPTER:VERSE"
        m = EVANGELIEN_HEADER_RE.match(stripped)
        if m:
            book_text = m.group(2).rstrip('.').strip()
            book_candidate = resolve_book_name(book_text)
            if book_candidate:
                flush()
                current_book = book_candidate
                current_chapter = int(m.group(3))
                current_verse = int(m.group(4))
                current_verse_end = int(m.group(5)) if m.group(5) else None
                in_commentary = True
                continue

        # Also detect inline section refs like "MATTH. 3:1-6." or "LUK. 1:5."
        ref_m = re.match(
            r'^((?:[123]\s+)?[A-Z][A-Za-z\u00C0-\u00FF]+)\.?\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*\.\s*$',
            stripped
        )
        if ref_m:
            book_candidate = resolve_book_name(ref_m.group(1))
            if book_candidate and (not allowed_books or book_candidate in allowed_books):
                flush()
                current_book = book_candidate
                current_chapter = int(ref_m.group(2))
                current_verse = int(ref_m.group(3))
                current_verse_end = int(ref_m.group(4)) if ref_m.group(4) else None
                in_commentary = True
                continue

        # Verse number within section
        if current_chapter and in_commentary:
            nm = VERSE_NUM_RE.match(stripped)
            if nm:
                vnum = int(nm.group(1))
                if 1 <= vnum <= 176:
                    flush()
                    current_verse = vnum
                    current_verse_end = None
                    in_commentary = True
                    body = [nm.group(2)]
                    continue

        if in_commentary:
            body.append(stripped)

    flush()
    return entries


def parse_psalmen(full_text):
    """
    Parse Psalmen format.
    Headers like: PSALM 2. followed by verse numbers.
    """
    entries = []
    lines = full_text.split('\n')

    current_psalm = None
    current_verse = None
    current_verse_end = None
    body = []

    def flush():
        nonlocal body
        if current_psalm and current_verse and body:
            text = '\n'.join(body).strip()
            text = clean_commentary_text(text)
            if len(text) > 30:
                entries.append({
                    "book": "Psalmen",
                    "chapter": current_psalm,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": text
                })
        body = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_verse:
                body.append('')
            continue

        if PAGE_FOOTER_RE.match(stripped):
            continue

        # Psalm header
        pm = PSALM_HEADER_RE.match(stripped)
        if pm:
            flush()
            current_psalm = int(pm.group(1))
            current_verse = None
            body = []
            continue

        if current_psalm:
            # Verse number
            nm = VERSE_NUM_RE.match(stripped)
            if nm:
                vnum = int(nm.group(1))
                if 1 <= vnum <= 176:
                    flush()
                    current_verse = vnum
                    current_verse_end = None
                    body = [nm.group(2)]
                    continue

            # "Vs. N" pattern
            vm = VS_RE.match(stripped)
            if vm:
                flush()
                current_verse = int(vm.group(1))
                current_verse_end = int(vm.group(2)) if vm.group(2) else None
                body = [stripped]
                continue

        if current_verse:
            body.append(stripped)

    flush()
    return entries


def parse_prophets(full_text, allowed_books):
    """
    Parse prophets format.
    Headers like: JONA 1. or HOSEA 3.
    Verse numbers embedded as "N. text..."
    """
    entries = []
    lines = full_text.split('\n')

    current_book = allowed_books[0] if len(allowed_books) == 1 else None
    current_chapter = None
    current_verse = None
    current_verse_end = None
    body = []

    def flush():
        nonlocal body
        if current_book and current_chapter and current_verse and body:
            text = '\n'.join(body).strip()
            text = clean_commentary_text(text)
            if len(text) > 30:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": text
                })
        body = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_verse:
                body.append('')
            continue

        if PAGE_FOOTER_RE.match(stripped):
            continue

        # Check for "BOEK N." header (book + chapter)
        m = SECTION_HEADER_RE.match(stripped)
        if m and len(stripped) < 50:
            book_candidate = resolve_book_name(m.group(1))
            if book_candidate and (not allowed_books or book_candidate in allowed_books):
                flush()
                current_book = book_candidate
                current_chapter = parse_chapter_num(m.group(2))
                if m.group(3):
                    current_verse = int(m.group(3))
                    current_verse_end = int(m.group(4)) if m.group(4) else None
                else:
                    current_verse = None
                body = []
                continue

        # Book-only header for multi-book PDFs
        bm = BOOK_HEADER_RE.match(stripped)
        if bm and len(stripped) < 40:
            book_candidate = resolve_book_name(bm.group(1))
            if book_candidate and (not allowed_books or book_candidate in allowed_books):
                flush()
                current_book = book_candidate
                current_chapter = 1 if book_candidate in SINGLE_CHAPTER_BOOKS else None
                current_verse = None
                body = []
                continue

        # Chapter header
        cm = CHAPTER_HEADER_RE.match(stripped)
        if cm:
            flush()
            ch_str = cm.group(1)
            try:
                current_chapter = int(ch_str)
            except ValueError:
                current_chapter = roman_to_int(ch_str)
            current_verse = None
            body = []
            continue

        # For single-chapter books: auto-set chapter 1
        if current_book and current_book in SINGLE_CHAPTER_BOOKS and current_chapter is None:
            current_chapter = 1

        if current_chapter:
            # "Vs. N" pattern
            vm = VS_RE.match(stripped)
            if vm:
                flush()
                current_verse = int(vm.group(1))
                current_verse_end = int(vm.group(2)) if vm.group(2) else None
                body = [stripped]
                continue

            # "N. text..."
            nm = VERSE_NUM_RE.match(stripped)
            if nm:
                vnum = int(nm.group(1))
                if 1 <= vnum <= 176:
                    if current_verse is None or (vnum >= current_verse and vnum <= current_verse + 30):
                        flush()
                        current_verse = vnum
                        current_verse_end = None
                        body = [nm.group(2)]
                        continue

        if current_verse:
            body.append(stripped)

    flush()
    return entries


def clean_commentary_text(text):
    """Remove Bible text quotes at the start, keep just the commentary."""
    # Remove leading/trailing whitespace and normalize
    text = text.strip()
    # Remove excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text


def detect_pdf_type(filename, pages_text):
    """Detect which parser to use based on filename and content."""
    stem = Path(filename).stem.lower()

    if 'psalmen' in stem:
        return 'psalmen'
    if 'evangeliën' in stem or 'evangelien' in stem:
        return 'evangelien'

    # Check content for type indicators
    sample = '\n'.join(pages_text[:20])  # First 20 pages

    # Count different header types
    epistle_headers = len(re.findall(
        r'^[A-Z\u00C0-\u00FF][\w\u00C0-\u00FF\s]+\d+\s*:\s*\d+',
        sample, re.MULTILINE
    ))
    prophet_headers = len(re.findall(
        r'^[A-Z\u00C0-\u00FF][\w\u00C0-\u00FF]+\s+\d+\s*\.\s*$',
        sample, re.MULTILINE
    ))

    # Books in OT prophets category
    prophet_books = {'jona', 'micha', 'nahum', 'habakuk', 'zefanja',
                     'haggai', 'zacharia', 'maleachi', 'hosea', 'joel',
                     'amos', 'obadja', 'jesaja', 'jeremia', 'klaagliederen',
                     'ezechiel', 'daniel', 'jozua', 'genesis'}
    for pb in prophet_books:
        if pb in stem:
            return 'prophets'

    # Default to epistles for NT books
    return 'epistles'


def parse_single_pdf(pdf_path):
    """Parse a single PDF file and return entries."""
    filename = os.path.basename(pdf_path)
    allowed_books = get_books_from_filename(filename)

    print(f"  Processing: {filename}")
    print(f"    Expected books: {allowed_books}")

    pages_text = extract_text_from_pdf(pdf_path)
    if not pages_text:
        print(f"    WARNING: No text extracted!")
        return []

    # Skip intro pages
    start_idx = 0
    for i, page in enumerate(pages_text):
        if not is_intro_page(page):
            start_idx = i
            break

    full_text = '\n'.join(pages_text[start_idx:])

    # Detect parser type
    pdf_type = detect_pdf_type(filename, pages_text)
    print(f"    Parser type: {pdf_type}")

    # Parse
    if pdf_type == 'psalmen':
        entries = parse_psalmen(full_text)
    elif pdf_type == 'evangelien':
        entries = parse_evangelien(full_text, allowed_books)
    elif pdf_type == 'prophets':
        entries = parse_prophets(full_text, allowed_books)
    else:
        entries = parse_epistles(full_text, allowed_books)

    # If primary parser yields too few results, try fallback
    if len(entries) < 5:
        print(f"    Primary parser yielded only {len(entries)} entries, trying fallback...")
        # Try prophets parser as fallback
        fallback = parse_prophets(full_text, allowed_books)
        if len(fallback) > len(entries):
            entries = fallback
            print(f"    Fallback (prophets) yielded {len(entries)} entries")
        else:
            # Try epistles parser
            fallback = parse_epistles(full_text, allowed_books)
            if len(fallback) > len(entries):
                entries = fallback
                print(f"    Fallback (epistles) yielded {len(entries)} entries")

    print(f"    Parsed: {len(entries)} entries")

    # Show book distribution
    book_counts = {}
    for e in entries:
        book_counts[e['book']] = book_counts.get(e['book'], 0) + 1
    for book, count in sorted(book_counts.items()):
        print(f"      {book}: {count}")

    return entries


def parse_directory(dir_path, output_path):
    """Parse all PDFs in a directory."""
    pdf_dir = Path(dir_path)
    pdf_files = sorted(pdf_dir.glob("*.pdf"))

    print(f"Found {len(pdf_files)} PDF files in {dir_path}")
    print()

    all_entries = []
    for pdf_path in pdf_files:
        entries = parse_single_pdf(str(pdf_path))
        all_entries.extend(entries)
        print()

    # Deduplicate: keep first occurrence per (book, chapter, verse)
    seen = set()
    unique = []
    for e in all_entries:
        key = (e['book'], e['chapter'], e['verse'])
        if key not in seen:
            seen.add(key)
            unique.append(e)

    print(f"{'='*60}")
    print(f"Total entries: {len(all_entries)}")
    print(f"Unique entries (after dedup): {len(unique)}")

    # Final book distribution
    book_counts = {}
    for e in unique:
        book_counts[e['book']] = book_counts.get(e['book'], 0) + 1
    print(f"\nBook distribution:")
    for book, count in sorted(book_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {book}: {count}")

    # Save
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to {output_path}")

    return unique


def main():
    parser = argparse.ArgumentParser(description="Parse Calvijn reformata.nl PDFs into JSON")
    parser.add_argument("input", help="PDF file or directory of PDFs")
    parser.add_argument("--output", "-o", default="data/calvijn-complete.json", help="Output JSON file")
    args = parser.parse_args()

    input_path = Path(args.input)
    if input_path.is_dir():
        parse_directory(str(input_path), args.output)
    elif input_path.is_file():
        entries = parse_single_pdf(str(input_path))
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"Saved {len(entries)} entries to {args.output}")
    else:
        print(f"Error: {input_path} not found")
        sys.exit(1)


if __name__ == "__main__":
    main()
