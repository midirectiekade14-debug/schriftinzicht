#!/usr/bin/env python3
"""Parse Smijtegelt 50 Keurstoffen PDF into verse-linked commentaries."""
import pdfplumber, re, json, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path(__file__).parent

BOOK_MAP = {
    "gen": "Genesis", "genesis": "Genesis", "ex": "Exodus", "exodus": "Exodus",
    "lev": "Leviticus", "num": "Numeri", "deut": "Deuteronomium",
    "joz": "Jozua", "richt": "Richteren", "ruth": "Ruth",
    "1 sam": "1 Samuel", "2 sam": "2 Samuel",
    "1 kon": "1 Koningen", "2 kon": "2 Koningen",
    "1 kron": "1 Kronieken", "2 kron": "2 Kronieken",
    "ezr": "Ezra", "neh": "Nehemia", "est": "Esther", "job": "Job",
    "ps": "Psalmen", "psalm": "Psalmen", "ps.": "Psalmen",
    "spr": "Spreuken", "pred": "Prediker", "hoogl": "Hooglied",
    "jes": "Jesaja", "jer": "Jeremia", "klaagl": "Klaagliederen",
    "ez": "Ezechiël", "dan": "Daniël",
    "hos": "Hosea", "joel": "Joël", "am": "Amos",
    "ob": "Obadja", "jon": "Jona", "mi": "Micha", "nah": "Nahum",
    "hab": "Habakuk", "zef": "Zefanja", "hag": "Haggaï",
    "zach": "Zacharia", "mal": "Maleachi",
    "matt": "Mattheüs", "matth": "Mattheüs", "matth.": "Mattheüs",
    "mark": "Markus", "luk": "Lukas", "luc": "Lukas",
    "joh": "Johannes", "joh.": "Johannes",
    "hand": "Handelingen", "hand.": "Handelingen",
    "rom": "Romeinen", "rom.": "Romeinen",
    "1 kor": "1 Korinthe", "2 kor": "2 Korinthe",
    "gal": "Galaten", "ef": "Efeze",
    "fil": "Filippenzen", "kol": "Kolossenzen",
    "1 thess": "1 Thessalonicenzen", "2 thess": "2 Thessalonicenzen",
    "1 tim": "1 Timotheüs", "2 tim": "2 Timotheüs",
    "tit": "Titus", "filem": "Filemon",
    "hebr": "Hebreeën", "heb": "Hebreeën",
    "jak": "Jakobus", "1 petr": "1 Petrus", "2 petr": "2 Petrus",
    "1 joh": "1 Johannes", "2 joh": "2 Johannes", "3 joh": "3 Johannes",
    "jud": "Judas", "openb": "Openbaring van Johannes",
    # Full Dutch names
    "mattheüs": "Mattheüs", "johannes": "Johannes", "romeinen": "Romeinen",
    "hebreeën": "Hebreeën", "openbaring": "Openbaring van Johannes",
    "filippenzen": "Filippenzen", "kolossenzen": "Kolossenzen",
    "handelingen": "Handelingen", "jesaja": "Jesaja", "jeremia": "Jeremia",
    "zacharia": "Zacharia", "maleachi": "Maleachi", "spreuken": "Spreuken",
    "hooglied": "Hooglied", "psalmen": "Psalmen", "galaten": "Galaten",
    "efeze": "Efeze", "lukas": "Lukas", "markus": "Markus",
    "jakobus": "Jakobus", "judas": "Judas", "titus": "Titus",
}

# Sorted by length (longest first) for regex matching
_keys = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pat = "|".join(re.escape(k) for k in _keys)

ref_re = re.compile(
    r'\b(' + _book_pat + r')\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})',
    re.IGNORECASE
)

def find_first_ref(text):
    m = ref_re.search(text)
    if m:
        key = m.group(1).lower().strip().rstrip('.')
        book = BOOK_MAP.get(key)
        if book:
            return (book, int(m.group(2)), int(m.group(3)))
    return None

# Extract PDF text
print("Extracting text from PDF...")
pdf = pdfplumber.open(str(BASE / "smijtegelt/50_keurstoffen.pdf"))
pages_text = []
for page in pdf.pages:
    t = page.extract_text()
    if t:
        pages_text.append(t)
pdf.close()

full_text = '\n'.join(pages_text)
lines = full_text.split('\n')
print(f"Total: {len(lines)} lines, {len(full_text)} chars")

# Strategy: Find sermon boundaries
# Each sermon starts with something like "LEERREDE N" or is numbered "1." etc.
# The TOC (pages 8-14 approximately) lists all 50 sermons with their texts

# Find sermon start patterns in main text
sermon_re = re.compile(r'^(?:LEERREDE|LEER\s*REDE|Leerrede)\s+(\w+)', re.IGNORECASE)
numbered_re = re.compile(r'^(\d{1,2})\.\s+(.{10,})')

# First pass: find TOC entries to know the Bible texts
toc_entries = []  # (sermon_num, book, chapter, verse)
in_toc = False

for i, line in enumerate(lines):
    stripped = line.strip()
    # TOC area is roughly pages 8-14 (chars 3000-20000 or so)
    if i < 50:
        continue
    if i > 500 and not in_toc:
        break

    # TOC entries look like: "N. TITLE" followed by a Bible ref nearby
    m = numbered_re.match(stripped)
    if m and int(m.group(1)) <= 50:
        num = int(m.group(1))
        # Look for verse ref in this line and next few lines
        ref = find_first_ref(stripped)
        if not ref:
            for j in range(i+1, min(i+5, len(lines))):
                ref = find_first_ref(lines[j])
                if ref:
                    break
        if ref:
            toc_entries.append((num, ref[0], ref[1], ref[2]))
            in_toc = True

print(f"Found {len(toc_entries)} TOC entries")

# Second pass: find actual sermon content positions
# Sermons start with "LEERREDE" or with the numbered title repeated
sermon_positions = []

for i, line in enumerate(lines):
    if i < 200:  # Skip early pages (TOC, preface)
        continue
    stripped = line.strip()

    m = sermon_re.match(stripped)
    if m:
        # Find which sermon number this is
        word = m.group(1).upper()
        # Try to parse Roman or Dutch number words
        number_words = {
            'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7,
            'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12, 'XIII': 13,
            'XIV': 14, 'XV': 15, 'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19,
            'XX': 20, 'XXI': 21, 'XXII': 22, 'XXIII': 23, 'XXIV': 24,
            'XXV': 25, 'XXVI': 26, 'XXVII': 27, 'XXVIII': 28, 'XXIX': 29,
            'XXX': 30, 'XXXI': 31, 'XXXII': 32, 'XXXIII': 33, 'XXXIV': 34,
            'XXXV': 35, 'XXXVI': 36, 'XXXVII': 37, 'XXXVIII': 38, 'XXXIX': 39,
            'XL': 40, 'XLI': 41, 'XLII': 42, 'XLIII': 43, 'XLIV': 44,
            'XLV': 45, 'XLVI': 46, 'XLVII': 47, 'XLVIII': 48, 'XLIX': 49, 'L': 50,
        }
        num = number_words.get(word)
        if num is None:
            try:
                num = int(word)
            except ValueError:
                continue

        # Look for verse ref nearby
        ref = None
        for j in range(i, min(i+10, len(lines))):
            ref = find_first_ref(lines[j])
            if ref:
                break

        if not ref:
            # Try to get from TOC
            for tnum, book, ch, vs in toc_entries:
                if tnum == num:
                    ref = (book, ch, vs)
                    break

        if ref:
            sermon_positions.append((i, num, ref))

print(f"Found {len(sermon_positions)} sermon positions in content")

# If we didn't find LEERREDE patterns, try alternative detection
if len(sermon_positions) < 10:
    print("Trying alternative sermon detection...")
    # Look for page numbers followed by sermon-like titles
    for i, line in enumerate(lines):
        if i < 200:
            continue
        stripped = line.strip()
        # Pattern: just a number at start of line (page number) followed by sermon content
        if re.match(r'^\d{1,3}$', stripped):
            # Check next lines for a sermon title + verse ref
            for j in range(i+1, min(i+5, len(lines))):
                ref = find_first_ref(lines[j])
                if ref and len(lines[j].strip()) < 200:
                    sermon_positions.append((j, len(sermon_positions)+1, ref))
                    break

# Deduplicate sermons by ref
seen_refs = {}
for pos, num, ref in sermon_positions:
    key = ref
    if key not in seen_refs or pos > seen_refs[key][0]:
        seen_refs[key] = (pos, num, ref)
sermon_positions = sorted(seen_refs.values(), key=lambda x: x[0])

print(f"After dedup: {len(sermon_positions)} sermons")

# Extract content for each sermon
entries = []
for si, (pos, num, ref) in enumerate(sermon_positions):
    end_pos = sermon_positions[si+1][0] if si+1 < len(sermon_positions) else len(lines)

    # Collect all text in range
    body = '\n'.join(lines[pos:min(end_pos, pos+500)])  # Cap at ~500 lines per sermon
    body = body.strip()

    if len(body) > 100:
        book, ch, vs = ref
        entries.append({
            "book": book,
            "chapter": ch,
            "verse": vs,
            "verse_end": None,
            "text": body
        })

print(f"\nTotal entries: {len(entries)}")
for e in entries[:5]:
    print(f"  {e['book']} {e['chapter']}:{e['verse']} ({len(e['text'])} chars)")

# Save
out = BASE / "smijtegelt_keurstoffen.json"
with open(str(out), 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
print(f"Saved to {out}")
