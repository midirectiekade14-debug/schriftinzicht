#!/usr/bin/env python3
"""
Parse Calvijn NL bijbelverklaringen PDFs (dewoesteweg.nl) into JSON for Supabase.
"""
import pdfplumber, re, json, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path("C:/Users/midir/schriftinzicht")

# Book abbreviation -> Dutch name (matching bible_books.json)
BOOK_MAP = {
    "gen": "Genesis", "genesis": "Genesis",
    "ex": "Exodus", "lev": "Leviticus", "num": "Numeri",
    "deut": "Deuteronomium", "joz": "Jozua",
    "ps": "Psalmen", "psalm": "Psalmen",
    "spr": "Spreuken", "pred": "Prediker",
    "jes": "Jesaja", "jer": "Jeremia",
    "ez": "Ezechiël", "ezech": "Ezechiël", "ezechiel": "Ezechiël",
    "dan": "Daniël", "hos": "Hosea",
    "matt": "Mattheüs", "matth": "Mattheüs", "mattheus": "Mattheüs",
    "mark": "Markus", "luk": "Lukas", "luc": "Lukas",
    "joh": "Johannes", "hand": "Handelingen",
    "rom": "Romeinen", "romeinen": "Romeinen",
    "1 kor": "1 Korinthe", "2 kor": "2 Korinthe",
    "1 cor": "1 Korinthe", "2 cor": "2 Korinthe",
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

# Verse reference pattern
VERSE_RE = re.compile(
    r'(?:(?:1|2|3)\s+)?'
    r'(?:Gen(?:esis)?|Ex|Lev|Num|Deut|Joz|Ps(?:alm)?|Spr|Pred|Jes|Jer|Ez(?:ech(?:iel)?)?|Dan|Hos|'
    r'Matt?h?(?:eus)?|Mark|Luk|Luc|Joh|Hand|Rom(?:einen)?|Kor|Cor|Gal(?:aten)?|Ef(?:eze)?|Fil|Kol|'
    r'Thess|Tim|Tit|Filem|Hebr?(?:eeen)?|Jak|Petr?|Joh|Jud(?:as)?|Openb)'
    r'\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})',
    re.IGNORECASE
)


def extract_text_from_pdf(pdf_path):
    """Extract all text from a PDF file."""
    text = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text.append(t)
    return '\n'.join(text)


def parse_genesis(text):
    """Parse Genesis 1-3 commentary. Structure: chapter headings + verse-by-verse."""
    entries = []
    # Split into chapters
    chapter_re = re.compile(r'(?:HOOFDSTUK|Hoofdstuk)\s+(\d+)')
    verse_re = re.compile(r'^(\d{1,2})\.\s+(.+)', re.MULTILINE)

    lines = text.split('\n')
    current_chapter = None
    current_verse = None
    body = []

    def flush():
        if current_chapter and current_verse and body:
            t = '\n'.join(body).strip()
            if len(t) > 30:
                entries.append({
                    "book": "Genesis",
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": None,
                    "text": t
                })

    for line in lines:
        cm = chapter_re.search(line)
        if cm and len(line) < 40:
            flush()
            current_chapter = int(cm.group(1))
            current_verse = None
            body = []
            continue

        if current_chapter:
            vm = re.match(r'^(\d{1,2})\.\s+(.+)', line)
            if vm:
                flush()
                current_verse = int(vm.group(1))
                body = [vm.group(2)]
            elif current_verse:
                body.append(line)

    flush()
    return entries


def parse_chapter_verse(text, book_name, default_chapter=None):
    """
    Generic parser for commentaries with chapter:verse structure.
    Looks for patterns like "Vers N" or "N." at start of lines.
    """
    entries = []
    lines = text.split('\n')

    chapter_re = re.compile(r'(?:HOOFDSTUK|Hoofdstuk|Kapitel|Hfdst\.?)\s+(\d+)', re.IGNORECASE)
    verse_header_re = re.compile(r'^(?:Vers|V\.?s?\.?|vs\.?)\s+(\d+)', re.IGNORECASE)
    # Also match "N. Text" pattern where N is verse number
    numbered_re = re.compile(r'^(\d{1,3})\.\s+(.{10,})')

    current_chapter = default_chapter
    current_verse = None
    body = []

    def flush():
        if current_chapter and current_verse and body:
            t = '\n'.join(body).strip()
            if len(t) > 50:
                entries.append({
                    "book": book_name,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": None,
                    "text": t[:8000]
                })

    for line in lines:
        # Chapter detection
        cm = chapter_re.search(line)
        if cm and len(line) < 60:
            flush()
            current_chapter = int(cm.group(1))
            current_verse = None
            body = []
            continue

        # Verse header detection
        vm = verse_header_re.match(line.strip())
        if vm:
            flush()
            current_verse = int(vm.group(1))
            body = [line]
            continue

        # Verse with text
        if current_chapter:
            nm = numbered_re.match(line)
            if nm:
                vnum = int(nm.group(1))
                # Only accept as new verse if reasonable
                if 1 <= vnum <= 180:
                    flush()
                    current_verse = vnum
                    body = [nm.group(2)]
                    continue

        if current_verse:
            body.append(line)

    flush()
    return entries


def parse_inline_refs(text, expected_book=None):
    """
    Parse text that has inline verse references. Group text by reference.
    """
    entries = []
    # Find all verse references with their positions
    ref_pattern = re.compile(
        r'\b((?:(?:1|2|3)\s+)?(?:Gen(?:esis)?|Ex|Lev|Num|Deut|Ps(?:alm)?|Spr|Jes|Jer|'
        r'Ez(?:ech)?|Dan|Matt?h?|Mark|Luk|Luc|Joh|Hand|Rom|Kor|Cor|Gal|Ef|Fil|Kol|'
        r'Thess|Tim|Tit|Filem|Hebr?|Jak|Petr?|Jud|Openb))'
        r'\s*\.?\s*(\d{1,3})\s*[:\s]\s*(\d{1,3})',
        re.IGNORECASE
    )

    paragraphs = text.split('\n')
    current_ref = None
    body = []

    def flush():
        if current_ref and body:
            t = '\n'.join(body).strip()
            if len(t) > 50:
                book, ch, vs = current_ref
                entries.append({
                    "book": book,
                    "chapter": ch,
                    "verse": vs,
                    "verse_end": None,
                    "text": t[:8000]
                })

    for para in paragraphs:
        m = ref_pattern.search(para)
        if m:
            book_key = m.group(1).lower().strip().rstrip('.')
            book = resolve_book(book_key)
            if book:
                ch = int(m.group(2))
                vs = int(m.group(3))
                new_ref = (book, ch, vs)
                if new_ref != current_ref:
                    flush()
                    current_ref = new_ref
                    body = [para]
                else:
                    body.append(para)
            else:
                if current_ref:
                    body.append(para)
        else:
            if current_ref:
                body.append(para)

    flush()
    return entries


# ─── Process each PDF ────────────────────────────────────────────────────────

all_entries = []

# 1. Genesis 1-3
print("Processing Genesis 1-3...")
text = extract_text_from_pdf(BASE / "calvijn_nl/genesis1-3.pdf")
entries = parse_genesis(text)
if len(entries) < 10:
    entries = parse_chapter_verse(text, "Genesis")
if len(entries) < 10:
    entries = parse_inline_refs(text, "Genesis")
print(f"  Genesis: {len(entries)} entries")
all_entries.extend(entries)

# 2. Galatenbrief
print("Processing Galatenbrief...")
text = extract_text_from_pdf(BASE / "calvijn_nl/galatenbrief.pdf")
entries = parse_chapter_verse(text, "Galaten")
if len(entries) < 10:
    entries = parse_inline_refs(text, "Galaten")
print(f"  Galaten: {len(entries)} entries")
all_entries.extend(entries)

# 3. Romeinenbrief
print("Processing Romeinenbrief...")
text = extract_text_from_pdf(BASE / "calvijn_nl/romeinenbrief.pdf")
entries = parse_chapter_verse(text, "Romeinen")
if len(entries) < 10:
    entries = parse_inline_refs(text, "Romeinen")
print(f"  Romeinen: {len(entries)} entries")
all_entries.extend(entries)

# 4. Timotheüs
print("Processing Timotheüs...")
text = extract_text_from_pdf(BASE / "calvijn_nl/timotheus.pdf")
# This covers 1 Tim + 2 Tim + Titus
entries = parse_chapter_verse(text, "1 Timotheüs")
# Also try inline refs for multi-book coverage
extra = parse_inline_refs(text)
seen = set((e['book'], e['chapter'], e['verse']) for e in entries)
for e in extra:
    k = (e['book'], e['chapter'], e['verse'])
    if k not in seen:
        entries.append(e)
        seen.add(k)
print(f"  Timotheüs+Titus: {len(entries)} entries")
all_entries.extend(entries)

# 5. Hebreeën 5-6
print("Processing Hebreeën 5-6...")
text = extract_text_from_pdf(BASE / "calvijn_nl/hebr5-6.pdf")
entries = parse_chapter_verse(text, "Hebreeën", default_chapter=5)
if len(entries) < 3:
    entries = parse_inline_refs(text)
print(f"  Hebreeën: {len(entries)} entries")
all_entries.extend(entries)

# Deduplicate
seen = set()
unique = []
for e in all_entries:
    k = (e['book'], e['chapter'], e['verse'])
    if k not in seen:
        seen.add(k)
        unique.append(e)

print(f"\nTotal unique entries: {len(unique)}")

# Save
out_path = BASE / "calvijn_nl_parsed.json"
with open(str(out_path), 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)
print(f"Saved to {out_path}")

# Show sample
for e in unique[:5]:
    print(f"  {e['book']} {e['chapter']}:{e['verse']} -> {e['text'][:80]}...")
