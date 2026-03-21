#!/usr/bin/env python3
"""Parse Da Costa Bijbellezingen PDFs into verse-linked commentaries."""
import pdfplumber, re, json, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stdout.reconfigure(line_buffering=True)

BASE = Path("C:/Users/midir/schriftinzicht")

# Pattern: chapter:verse at start of line (Da Costa style: "1:1", "1:2", "12:10" etc.)
VERSE_START_RE = re.compile(r'^(\d{1,3})\s*[:.]\s*(\d{1,3})\b')

def extract_pages_text(path, start_page=0, end_page=None):
    """Extract text from specific page range."""
    pdf = pdfplumber.open(str(path))
    pages = pdf.pages[start_page:end_page]
    texts = []
    for p in pages:
        t = p.extract_text()
        if t:
            texts.append(t)
    pdf.close()
    return '\n'.join(texts)

def parse_dacosta_text(text, default_book="Genesis"):
    """Parse Da Costa text into verse entries."""
    lines = text.split('\n')
    entries = []
    current_book = default_book
    current_chapter = None
    current_verse = None
    body_parts = []

    # Book detection patterns
    book_patterns = [
        (r'\bGENESIS\b', 'Genesis'), (r'\bEXODUS\b', 'Exodus'),
        (r'\bLEVITICUS\b', 'Leviticus'), (r'\bNUMERI\b', 'Numeri'),
        (r'\bDEUTERONOMIUM\b', 'Deuteronomium'),
        (r'\bJOZUA\b', 'Jozua'), (r'\bRICHTEREN\b', 'Richteren'), (r'\bRUTH\b', 'Ruth'),
        (r'\b1\s*SAMU[EÜ]L\b', '1 Samuel'), (r'\b2\s*SAMU[EÜ]L\b', '2 Samuel'),
        (r'\b1\s*KONINGEN\b', '1 Koningen'), (r'\b2\s*KONINGEN\b', '2 Koningen'),
        (r'\b1\s*KRONIEKEN\b', '1 Kronieken'), (r'\b2\s*KRONIEKEN\b', '2 Kronieken'),
        (r'\bEZRA\b', 'Ezra'), (r'\bNEHEMIA\b', 'Nehemia'), (r'\bESTHER\b', 'Esther'),
        (r'\bJOB\b', 'Job'), (r'\bPSALMEN\b', 'Psalmen'), (r'\bSPREUKEN\b', 'Spreuken'),
        (r'\bPREDIKER\b', 'Prediker'), (r'\bHOOGLIED\b', 'Hooglied'),
        (r'\bJESAJA\b', 'Jesaja'), (r'\bJEREMIA\b', 'Jeremia'),
        (r'\bKLAAGLIEDEREN\b', 'Klaagliederen'),
        (r'\bEZECHI[EË]L\b', 'Ezechiël'), (r'\bDANI[EË]L\b', 'Daniël'),
        (r'\bHOSEA\b', 'Hosea'), (r'\bJO[EË]L\b', 'Joël'), (r'\bAMOS\b', 'Amos'),
        (r'\bOBADJA\b', 'Obadja'), (r'\bJONA\b', 'Jona'), (r'\bMICHA\b', 'Micha'),
        (r'\bNAHUM\b', 'Nahum'), (r'\bHABAKUK\b', 'Habakuk'), (r'\bZEFANJA\b', 'Zefanja'),
        (r'\bHAGGA[IÏ]\b', 'Haggaï'), (r'\bZACHARIA\b', 'Zacharia'), (r'\bMALEACHI\b', 'Maleachi'),
        (r'\bMATTH[EÜ]S\b', 'Mattheüs'), (r'\bMARKUS\b', 'Markus'), (r'\bMARCUS\b', 'Markus'),
        (r'\bLUKAS\b', 'Lukas'), (r'\bJOHANNES\b', 'Johannes'),
        (r'\bHANDELINGEN\b', 'Handelingen'), (r'\bROMEINEN\b', 'Romeinen'),
        (r'\b1\s*KORINTHE\b', '1 Korinthe'), (r'\b2\s*KORINTHE\b', '2 Korinthe'),
        (r'\bGALATEN\b', 'Galaten'), (r'\bEFEZE\b', 'Efeze'),
        (r'\bFILIPPENZEN\b', 'Filippenzen'), (r'\bKOLOSSENZEN\b', 'Kolossenzen'),
        (r'\bHEBREE[EË]N\b', 'Hebreeën'), (r'\bJAKOBUS\b', 'Jakobus'),
        (r'\b1\s*PETRUS\b', '1 Petrus'), (r'\b2\s*PETRUS\b', '2 Petrus'),
        (r'\b1\s*JOHANNES\b', '1 Johannes'), (r'\bJUDAS\b', 'Judas'),
        (r'\bOPENBARING\b', 'Openbaring van Johannes'),
    ]

    def flush():
        nonlocal current_chapter, current_verse
        if current_book and current_chapter and current_verse and body_parts:
            body = '\n'.join(body_parts).strip()
            if len(body) > 30:
                entries.append({
                    'book': current_book,
                    'chapter': current_chapter,
                    'verse': current_verse,
                    'verse_end': None,
                    'text': body[:8000]
                })

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check for book headers (short lines in CAPS)
        if len(stripped) < 80:
            up = stripped.upper()
            for pat, name in book_patterns:
                if re.search(pat, up) and (
                    up.startswith('HET BOEK') or
                    up.startswith('DE ') or
                    re.match(r'^' + pat + r'[\s.]*$', up) or
                    'BOEK ' + name.upper() in up
                ):
                    flush()
                    current_book = name
                    current_chapter = None
                    current_verse = None
                    body_parts = []
                    break

        # Check for verse markers (1:1, 2:3 etc.)
        m = VERSE_START_RE.match(stripped)
        if m:
            ch = int(m.group(1))
            vs = int(m.group(2))
            if ch <= 150 and vs <= 200:
                rest = stripped[m.end():].strip()
                if len(rest) > 3 or not body_parts:
                    flush()
                    current_chapter = ch
                    current_verse = vs
                    body_parts = [stripped]
                    continue

        # Otherwise, add to body
        if current_chapter and current_verse:
            body_parts.append(stripped)

    flush()
    return entries

# ─── Process Da Costa PDFs ───────────────────────────────────────────────────

all_entries = []

pdf_configs = [
    ('dacosta_werken/deel_1.pdf', 'Genesis'),
    ('dacosta_werken/deel_2.pdf', None),
    ('dacosta_werken/deel_3.pdf', None),
    ('dacosta_werken/deel_4.pdf', None),
    ('dacosta_werken/deel_5.pdf', None),
]

for pdf_path, default_book in pdf_configs:
    full_path = BASE / pdf_path
    if not full_path.exists():
        print(f"{pdf_path}: NOT FOUND")
        continue

    print(f"\n=== {pdf_path} ===")

    try:
        pdf = pdfplumber.open(str(full_path))
        num_pages = len(pdf.pages)
        pdf.close()
        print(f"  {num_pages} pages")

        # Process in chunks of 200 pages
        chunk_size = 200
        file_entries = []

        for start in range(0, num_pages, chunk_size):
            end = min(start + chunk_size, num_pages)
            text = extract_pages_text(full_path, start, end)
            entries = parse_dacosta_text(text, default_book)
            file_entries.extend(entries)

            if entries:
                print(f"  Pages {start+1}-{end}: {len(entries)} entries", flush=True)

        # Deduplicate
        seen = set()
        unique = []
        for e in file_entries:
            k = (e['book'], e['chapter'], e['verse'])
            if k not in seen:
                seen.add(k)
                unique.append(e)

        print(f"  Total: {len(unique)} unique entries")
        all_entries.extend(unique)

    except Exception as e:
        print(f"  ERROR: {e}")
        import traceback
        traceback.print_exc()

# Final dedup
seen = set()
final = []
for e in all_entries:
    k = (e['book'], e['chapter'], e['verse'])
    if k not in seen:
        seen.add(k)
        final.append(e)

print(f"\n=== TOTAAL: {len(final)} unieke Da Costa entries ===")

# Distribution per book
books = {}
for e in final:
    books[e['book']] = books.get(e['book'], 0) + 1
for b in sorted(books.keys()):
    print(f"  {b}: {books[b]}")

# Save
out = BASE / 'dacosta_bijbellezingen.json'
with open(str(out), 'w', encoding='utf-8') as f:
    json.dump(final, f, ensure_ascii=False, indent=2)
print(f"\nSaved to {out}")
