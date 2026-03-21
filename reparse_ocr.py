#!/usr/bin/env python3
"""
Re-parse OCR raw text files with improved patterns.
The scanned PDFs use headers like "HEBREËN 1:3, 4." and "HOOFDSTUK N"
"""
import re, json, sys
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = Path(__file__).parent

BOOK_MAP = {
    "genesis": "Genesis",
    "galaten": "Galaten",
    "efeze": "Efeze",
    "filippenzen": "Filippenzen",
    "kolossenzen": "Kolossenzen",
    "thessalonicenzen": "1 Thessalonicenzen",
    "1 thessalonicenzen": "1 Thessalonicenzen",
    "2 thessalonicenzen": "2 Thessalonicenzen",
    "timotheüs": "1 Timotheüs",
    "1 timotheüs": "1 Timotheüs",
    "2 timotheüs": "2 Timotheüs",
    "timotheus": "1 Timotheüs",
    "titus": "Titus",
    "filemon": "Filemon",
    "hebreën": "Hebreeën",
    "hebreeen": "Hebreeën",
    "hebreeën": "Hebreeën",
    "jacobus": "Jakobus",
    "1 petrus": "1 Petrus",
    "2 petrus": "2 Petrus",
    "petrus": "1 Petrus",
    "1 johannes": "1 Johannes",
    "2 johannes": "2 Johannes",
    "3 johannes": "3 Johannes",
    "johannes": "1 Johannes",
    "judas": "Judas",
    "romeinen": "Romeinen",
    "korinthe": "1 Korinthe",
    "1 korinthe": "1 Korinthe",
    "2 korinthe": "2 Korinthe",
    "mattheüs": "Mattheüs",
    "mattheus": "Mattheüs",
    "ezechiël": "Ezechiël",
    "ezechiel": "Ezechiël",
}

# Header pattern: "HEBREËN 1:3, 4." or "EFEZE 2:1, 2."
# These appear as running headers or section titles
HEADER_REF_RE = re.compile(
    r'^(?:\d+\s+)?'  # optional page number
    r'((?:1|2|3)?\s*(?:HEBRE[ËE]N|GALATEN|EFEZE|FILIPPENZEN|KOLOSSENZEN|'
    r'THESSALONIC[EÉ]NZEN|TIMOTHE[ÜU]S|TITUS|FILEMON|JACOBUS|PETRUS|'
    r'JOHANNES|JUDAS|ROMEINEN|KORINTHE|MATTHE[ÜU]S|EZECHIEL|EZECHIËL))'
    r'\s+(\d+)\s*[:\.]\s*(\d+)',
    re.IGNORECASE
)

# Chapter header: "HET EERSTE HOOFDSTUK" or "HOOFDSTUK 3"
CHAPTER_WORDS = {
    'eerste': 1, 'tweede': 2, 'derde': 3, 'vierde': 4, 'vijfde': 5,
    'zesde': 6, 'zevende': 7, 'achtste': 8, 'negende': 9, 'tiende': 10,
    'elfde': 11, 'twaalfde': 12, 'dertiende': 13, 'veertiende': 14,
    'vijftiende': 15, 'zestiende': 16,
}

CHAPTER_RE = re.compile(
    r'(?:HET\s+)?(\w+)\s+HOOFDSTUK|HOOFDSTUK\s+(\d+)',
    re.IGNORECASE
)

# Book section headers in the OCR (e.g., standalone "GALATEN", "EFEZE", etc.)
BOOK_SECTION_RE = re.compile(
    r'^(?:DE\s+)?(?:ZENDBRIEF|BRIEF)\s+(?:AAN|VAN)\s+(?:DE\s+)?(.+?)$|'
    r'^(GALATEN|EFEZE|FILIPPENZEN|KOLOSSENZEN|HEBRE[ËE]N|JACOBUS|'
    r'(?:1|2|3)\s*(?:PETRUS|JOHANNES|THESSALONIC[EÉ]NZEN|TIMOTHE[ÜU]S|KORINTHE)|'
    r'TITUS|FILEMON|JUDAS|ROMEINEN|MATTHE[ÜU]S|EZECHIËL)$',
    re.IGNORECASE
)

# Verse pattern in Mattheüs/bergrede style: "MATTH. vs. 1." or "Vs. 3."
VERSE_VS_RE = re.compile(
    r'(?:MATTH?\.\s*)?[Vv][Ss]\.?\s*(\d+)',
    re.IGNORECASE
)


def resolve_book(raw_name):
    """Resolve raw OCR book name to canonical name."""
    name = raw_name.strip().lower().rstrip('.')
    # Remove leading numbers for prefix detection
    if name in BOOK_MAP:
        return BOOK_MAP[name]
    # Try partial match
    for key, val in BOOK_MAP.items():
        if key.startswith(name[:5]) or name.startswith(key[:5]):
            return val
    return None


def parse_raw_text(filepath, default_book=None):
    """Parse raw OCR text into commentary entries."""
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    entries = []
    current_book = default_book
    current_chapter = None
    current_verse = None
    body = []

    def flush():
        nonlocal body
        if current_book and current_chapter and current_verse and body:
            t = '\n'.join(body).strip()
            # Clean OCR artifacts
            t = re.sub(r'\n{3,}', '\n\n', t)
            # Remove page markers
            t = re.sub(r'={10,}\s*PAGE\s*\d+\s*={10,}', '', t)
            t = t.strip()
            if len(t) > 50:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": None,
                    "text": t
                })
        body = []

    lines = text.split('\n')

    for i, line in enumerate(lines):
        stripped = line.strip()

        # Skip page separators
        if re.match(r'^={5,}\s*PAGE\s*\d+\s*={5,}$', stripped):
            continue

        if not stripped:
            if current_verse and body:
                body.append('')
            continue

        # Check for book section header
        if len(stripped) < 60:
            bm = BOOK_SECTION_RE.match(stripped)
            if bm:
                new_book_raw = bm.group(1) or bm.group(2)
                if new_book_raw:
                    new_book = resolve_book(new_book_raw)
                    if new_book and new_book != current_book:
                        flush()
                        current_book = new_book
                        current_chapter = None
                        current_verse = None
                        print(f"  [BOOK] {current_book}")
                        continue

        # Check for chapter header
        if len(stripped) < 50:
            cm = CHAPTER_RE.search(stripped)
            if cm:
                if cm.group(2):
                    new_ch = int(cm.group(2))
                elif cm.group(1):
                    word = cm.group(1).lower()
                    new_ch = CHAPTER_WORDS.get(word)
                else:
                    new_ch = None

                if new_ch:
                    flush()
                    current_chapter = new_ch
                    current_verse = None
                    print(f"  [CH] {current_book} {current_chapter}")
                    continue

        # Check for verse reference header (e.g., "HEBREËN 1:3, 4.")
        hm = HEADER_REF_RE.match(stripped)
        if hm:
            book_raw = hm.group(1).strip()
            ch = int(hm.group(2))
            vs = int(hm.group(3))

            resolved = resolve_book(book_raw)
            if resolved:
                if resolved != current_book:
                    flush()
                    current_book = resolved
                if ch != current_chapter:
                    flush()
                    current_chapter = ch
                flush()
                current_verse = vs
                # Rest of line after the reference
                rest = HEADER_REF_RE.sub('', stripped).strip().rstrip('.')
                if rest and len(rest) > 10:
                    body = [rest]
                continue

        # Check for "Vs. N" pattern (bergrede style)
        if current_book:
            vm = VERSE_VS_RE.match(stripped)
            if vm:
                flush()
                current_verse = int(vm.group(1))
                rest = VERSE_VS_RE.sub('', stripped).strip()
                if rest:
                    body = [rest]
                continue

        # Regular text
        if current_verse:
            # Skip running headers (short lines that look like "20 HEBREËN 1:3.")
            if len(stripped) < 40 and HEADER_REF_RE.match(stripped):
                continue
            body.append(stripped)

    flush()
    return entries


# ─── Process each raw OCR file ─────────────────────────────────────────────

FILES = [
    ("ocr_raw_galaten-filemon.txt", "Galaten"),
    ("ocr_raw_hebreeen-judas.txt", "Hebreeën"),
    ("ocr_raw_romeinen-korinthe.txt", "Romeinen"),
    ("ocr_raw_bergrede_matt5.txt", "Mattheüs"),
    ("ocr_raw_ezechiel16.txt", "Ezechiël"),
]

all_new_entries = []

for filename, default_book in FILES:
    filepath = BASE / filename
    if not filepath.exists():
        print(f"[SKIP] {filename} niet gevonden")
        continue

    print(f"\n{'─' * 50}")
    print(f"Parsing: {filename} (default: {default_book})")
    print(f"{'─' * 50}")

    entries = parse_raw_text(filepath, default_book)
    print(f"  Resultaat: {len(entries)} entries")

    if entries:
        books = Counter(e['book'] for e in entries)
        for b, c in books.most_common():
            print(f"    {b}: {c}")

    all_new_entries.extend(entries)

# Save OCR-only entries
ocr_file = BASE / "calvijn_nl_ocr_entries.json"
with open(ocr_file, 'w', encoding='utf-8') as f:
    json.dump(all_new_entries, f, ensure_ascii=False, indent=2)
print(f"\nOCR entries opgeslagen: {ocr_file} ({len(all_new_entries)} items)")

# Merge with existing parsed entries
existing_file = BASE / "calvijn_nl_parsed.json"
existing = []
if existing_file.exists():
    with open(existing_file, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    print(f"Bestaande entries: {len(existing)}")

all_entries = existing + all_new_entries

# Deduplicate
seen = set()
unique = []
for e in all_entries:
    k = (e['book'], e['chapter'], e['verse'])
    if k not in seen:
        seen.add(k)
        unique.append(e)

# Save combined
out_file = BASE / "calvijn_nl_all.json"
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)

print(f"\nTotaal uniek: {len(unique)} entries")
print(f"Opgeslagen: {out_file}")

# Stats
books = Counter(e['book'] for e in unique)
print("\nPer boek:")
for b in sorted(books.keys()):
    print(f"  {b}: {books[b]}")
