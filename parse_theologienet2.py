#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse_theologienet2.py - Improved parser for Theologienet.nl DOCX files
"""

import os, re, json, sys, io, zipfile
import docx
from pathlib import Path
from html.parser import HTMLParser

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path("C:/Users/midir/schriftinzicht")

# ─── Book name map ───────────────────────────────────────────────────────────

BOOK_MAP = {
    "genesis": "Genesis", "exodus": "Exodus", "leviticus": "Leviticus",
    "numeri": "Numeri", "deuteronomium": "Deuteronomium", "jozua": "Jozua",
    "richteren": "Richteren", "ruth": "Ruth",
    "1 samuel": "1 Samuel", "2 samuel": "2 Samuel", "1samuel": "1 Samuel", "2samuel": "2 Samuel",
    "1 koningen": "1 Koningen", "2 koningen": "2 Koningen",
    "1 kronieken": "1 Kronieken", "2 kronieken": "2 Kronieken",
    "ezra": "Ezra", "nehemia": "Nehemia", "esther": "Esther", "job": "Job",
    "psalmen": "Psalmen", "psalm": "Psalmen", "ps.": "Psalmen",
    "spreuken": "Spreuken", "prediker": "Prediker", "hooglied": "Hooglied",
    "jesaja": "Jesaja", "jeremia": "Jeremia", "klaagliederen": "Klaagliederen",
    "ezechiël": "Ezechiël", "ezechiel": "Ezechiël",
    "daniël": "Daniël", "daniel": "Daniël",
    "hosea": "Hosea", "joël": "Joël", "joel": "Joël", "amos": "Amos",
    "obadja": "Obadja", "jona": "Jona", "micha": "Micha", "nahum": "Nahum",
    "habakuk": "Habakuk", "zefanja": "Zefanja",
    "haggaï": "Haggaï", "haggai": "Haggaï",
    "zacharia": "Zacharia", "maleachi": "Maleachi",
    "mattheüs": "Mattheüs", "mattheus": "Mattheüs",
    "markus": "Markus", "marcus": "Markus",
    "lukas": "Lukas", "lucas": "Lukas",
    "johannes": "Johannes",
    "handelingen": "Handelingen",
    "romeinen": "Romeinen",
    "1 korinthe": "1 Korinthe", "2 korinthe": "2 Korinthe",
    "1 korinthiërs": "1 Korinthe", "2 korinthiërs": "2 Korinthe",
    "1 korinthiers": "1 Korinthe", "2 korinthiers": "2 Korinthe",
    "galaten": "Galaten",
    "efeze": "Efeze", "eféze": "Efeze",
    "filippenzen": "Filippenzen",
    "kolossenzen": "Kolossenzen",
    "1 thessalonicenzen": "1 Thessalonicenzen", "2 thessalonicenzen": "2 Thessalonicenzen",
    "1 timotheüs": "1 Timotheüs", "1 timotheus": "1 Timotheüs",
    "2 timotheüs": "2 Timotheüs", "2 timotheus": "2 Timotheüs",
    "titus": "Titus", "filemon": "Filemon",
    "hebreeën": "Hebreeën", "hebreeen": "Hebreeën",
    "jakobus": "Jakobus",
    "1 petrus": "1 Petrus", "2 petrus": "2 Petrus",
    "1 johannes": "1 Johannes", "2 johannes": "2 Johannes", "3 johannes": "3 Johannes",
    "judas": "Judas",
    "openbaring": "Openbaring van Johannes",
    "openbaring van johannes": "Openbaring van Johannes",
    # Abbreviations
    "gen": "Genesis", "gen.": "Genesis",
    "ex": "Exodus", "ex.": "Exodus", "exod": "Exodus",
    "lev": "Leviticus", "num": "Numeri",
    "deut": "Deuteronomium", "deut.": "Deuteronomium",
    "joz": "Jozua", "richt": "Richteren",
    "1 sam": "1 Samuel", "2 sam": "2 Samuel", "1 sam.": "1 Samuel", "2 sam.": "2 Samuel",
    "1 kon": "1 Koningen", "2 kon": "2 Koningen",
    "1 kron": "1 Kronieken", "2 kron": "2 Kronieken",
    "neh": "Nehemia", "est": "Esther",
    "ps": "Psalmen", "ps.": "Psalmen",
    "spr": "Spreuken", "pred": "Prediker", "hoogl": "Hooglied",
    "jes": "Jesaja", "jes.": "Jesaja",
    "jer": "Jeremia", "jer.": "Jeremia",
    "klaagl": "Klaagliederen",
    "ez": "Ezechiël", "ez.": "Ezechiël",
    "dan": "Daniël", "dan.": "Daniël",
    "hos": "Hosea", "am": "Amos",
    "ob": "Obadja", "jon": "Jona", "mi": "Micha", "nah": "Nahum",
    "hab": "Habakuk", "zef": "Zefanja",
    "hag": "Haggaï", "hag.": "Haggaï",
    "zach": "Zacharia", "zach.": "Zacharia",
    "mal": "Maleachi", "mal.": "Maleachi",
    "matt": "Mattheüs", "matth": "Mattheüs", "matt.": "Mattheüs", "matth.": "Mattheüs",
    "mark": "Markus", "mark.": "Markus",
    "luk": "Lukas", "luk.": "Lukas",
    "joh": "Johannes", "joh.": "Johannes",
    "hand": "Handelingen", "hand.": "Handelingen",
    "rom": "Romeinen", "rom.": "Romeinen",
    "1 kor": "1 Korinthe", "2 kor": "2 Korinthe",
    "1 kor.": "1 Korinthe", "2 kor.": "2 Korinthe",
    "1 cor": "1 Korinthe", "2 cor": "2 Korinthe",
    "gal": "Galaten", "gal.": "Galaten",
    "ef": "Efeze", "ef.": "Efeze",
    "fil": "Filippenzen", "fil.": "Filippenzen",
    "kol": "Kolossenzen", "kol.": "Kolossenzen",
    "1 thess": "1 Thessalonicenzen", "2 thess": "2 Thessalonicenzen",
    "1 tim": "1 Timotheüs", "2 tim": "2 Timotheüs",
    "1 tim.": "1 Timotheüs", "2 tim.": "2 Timotheüs",
    "tit": "Titus", "filem": "Filemon",
    "hebr": "Hebreeën", "heb": "Hebreeën",
    "jak": "Jakobus", "jak.": "Jakobus",
    "1 petr": "1 Petrus", "2 petr": "2 Petrus",
    "1 petr.": "1 Petrus", "2 petr.": "2 Petrus",
    "1 pet": "1 Petrus", "2 pet": "2 Petrus",
    "1 joh": "1 Johannes", "2 joh": "2 Johannes", "3 joh": "3 Johannes",
    "1 joh.": "1 Johannes", "2 joh.": "2 Johannes", "3 joh.": "3 Johannes",
    "openb": "Openbaring van Johannes", "openb.": "Openbaring van Johannes",
    "op": "Openbaring van Johannes",
}

def resolve_book(name):
    return BOOK_MAP.get(name.lower().strip().rstrip('.'))

# Verse reference regex (handles all common formats)
_book_keys = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pattern = "|".join(re.escape(k) for k in _book_keys)

VERSE_RE = re.compile(
    r'\b(' + _book_pattern + r')\s*\.?\s*(\d{1,3})\s*[: ]\s*(\d{1,3})'
    r'(?:\s*(?:en|[-–en])\s*(\d{1,3}))?',
    re.IGNORECASE
)

# Standalone verse ref: "Book N:V" on its own line
STANDALONE_RE = re.compile(
    r'^\s*(' + _book_pattern + r')\s*\.?\s*(\d{1,3})\s*[:\-]\s*(\d{1,3})'
    r'(?:\s*[-–en]\s*(\d{1,3}))?\s*[\.!]?\s*$',
    re.IGNORECASE
)

def find_first_ref(text):
    """Find first verse reference in text."""
    for m in VERSE_RE.finditer(text):
        book = resolve_book(m.group(1))
        if book:
            vs_end = int(m.group(4)) if m.group(4) else None
            return (book, int(m.group(2)), int(m.group(3)), vs_end)
    return None

def find_all_refs(text):
    """Find all verse references in text."""
    results = []
    seen = set()
    for m in VERSE_RE.finditer(text):
        book = resolve_book(m.group(1))
        if book:
            ch, vs = int(m.group(2)), int(m.group(3))
            vs_end = int(m.group(4)) if m.group(4) else None
            key = (book, ch, vs)
            if key not in seen:
                seen.add(key)
                results.append((book, ch, vs, vs_end))
    return results

def clean_text(text):
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def get_paragraphs(docx_path):
    d = docx.Document(str(docx_path))
    result = []
    for p in d.paragraphs:
        text = p.text.strip()
        if text:
            style = p.style.name if p.style else 'Normal'
            result.append((style, text))
    return result


# ─── Parser A: Sermon collection with TOC ────────────────────────────────────
# Used for: Spurgeon preken (all), Van der Groe, Boston

def parse_sermon_collection(docx_path):
    """
    Pattern:
    TOC: "N. Sermon title\nVerse quote\nBook ch:v." (Normal paragraphs)
    Then actual content: "N. Sermon title" repeated, then body.

    Strategy: Find all sermon title positions in the content area (past TOC),
    for each title check title + next few paras for verse ref,
    collect body until next title.
    """
    entries = []
    paras = get_paragraphs(docx_path)
    n = len(paras)

    # Numbered title pattern: "N. TITLE" or "N. Title"
    title_re = re.compile(r'^(\d+)\.\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÊÂÎÔÛÆŒ]', re.UNICODE)
    # CAPS title: detect sermon boundary
    caps_re = re.compile(r'^[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÊÂÎÔÛÆŒ\s\-,\'\"]+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÊÂÎÔÛÆŒ]$')

    # Find TOC boundary: look for the SECOND occurrence of "1." title
    first_one = None
    second_one = None
    for i, (style, text) in enumerate(paras):
        if title_re.match(text) and text.startswith('1.'):
            if first_one is None:
                first_one = i
            elif second_one is None:
                second_one = i
                break

    # Content starts at second_one (or first_one if no duplicate)
    content_start = second_one if second_one is not None else (first_one if first_one is not None else 0)

    # Also try: find first Body Text or Heading style past frontmatter
    if content_start == 0:
        for i, (style, text) in enumerate(paras):
            if style in ('Body Text', 'Body Text 2', 'Body Text 3') and i > 20:
                content_start = max(0, i - 5)
                break

    # Find sermon starts in content area
    sermon_positions = []  # (para_idx, verse_ref)

    i = content_start
    while i < n:
        style, text = paras[i]
        # Check if this is a sermon title (numbered or heading)
        is_title = (
            (style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4') and i > 10) or
            (title_re.match(text) and i >= content_start)
        )

        if is_title and i >= content_start:
            # Look for verse ref in title + next 4 paragraphs
            ref = find_first_ref(text)
            if not ref:
                for j in range(i + 1, min(i + 5, n)):
                    _, next_text = paras[j]
                    ref = find_first_ref(next_text)
                    if ref:
                        break
                    # Check standalone ref
                    m = STANDALONE_RE.match(next_text)
                    if m:
                        book = resolve_book(m.group(1))
                        if book:
                            vs_end = int(m.group(4)) if m.group(4) else None
                            ref = (book, int(m.group(2)), int(m.group(3)), vs_end)
                            break

            if ref:
                sermon_positions.append((i, ref))

        i += 1

    # Also look for standalone verse references that start new sections
    # (for Van der Groe pattern where title has inline ref like "Psalm 4: 7")
    if len(sermon_positions) < 3:
        sermon_positions = []
        for i in range(content_start, n):
            style, text = paras[i]
            ref = find_first_ref(text)
            if ref and len(text) < 250:
                # Check if previous paragraph was title-like
                if i > 0:
                    prev_style, prev_text = paras[i-1]
                    if prev_style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4') or \
                       title_re.match(prev_text) or len(prev_text) < 100:
                        sermon_positions.append((max(0, i-1), ref))
                        continue
                sermon_positions.append((i, ref))

    # Deduplicate: if same ref appears twice (TOC + content), keep second
    seen_refs = {}
    deduped = []
    for pos, ref in sermon_positions:
        key = ref[:3]  # (book, ch, vs)
        if key in seen_refs:
            # Replace earlier with later position
            deduped = [(p, r) for p, r in deduped if r[:3] != key]
        seen_refs[key] = pos
        deduped.append((pos, ref))

    sermon_positions = sorted(deduped, key=lambda x: x[0])

    # Extract content for each sermon
    for si, (pos, ref) in enumerate(sermon_positions):
        end_pos = sermon_positions[si + 1][0] if si + 1 < len(sermon_positions) else n

        # Collect all paragraphs in this range
        body_parts = []
        for j in range(pos, min(end_pos, n)):
            _, txt = paras[j]
            body_parts.append(txt)

        text = clean_text('\n'.join(body_parts))
        if len(text) > 80:
            book, ch, vs, vs_end = ref
            entries.append({
                "book": book,
                "chapter": ch,
                "verse": vs,
                "verse_end": vs_end,
                "text": text
            })

    return entries


# ─── Parser B: Verse-by-verse commentary (Calvijn Genesis) ───────────────────

def parse_calvijn_genesis(docx_path):
    """
    Calvijn Genesis structure:
    - Chapter heading: "Xste HOOFDSTUK" or "HOOFDSTUK X"
    - Verse block: "1. Verse text\n2. Verse text\n..."
    - Commentary: "1. Commentary text\n..." (verse number repeated)
    """
    entries = []
    paras = get_paragraphs(docx_path)
    n = len(paras)
    book = "Genesis"

    ch_re = re.compile(r'(\d+)\s*(?:ste|de|e|ste)?\s*HOOFDSTUK', re.IGNORECASE)
    verse_start_re = re.compile(r'^(\d{1,2})\.\s+(.{10,})')

    current_chapter = None
    mode = 'preamble'
    verse_nums_seen = set()
    current_verse = None
    body_parts = []

    def flush():
        if current_chapter and current_verse and body_parts:
            text = clean_text('\n'.join(body_parts))
            if len(text) > 30:
                entries.append({
                    "book": book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": None,
                    "text": text
                })

    for i, (style, text) in enumerate(paras):
        ch_m = ch_re.search(text)
        if ch_m and ('HOOFDSTUK' in text.upper() or style in ('Heading 1','Heading 2','Heading 3')):
            flush()
            current_chapter = int(ch_m.group(1))
            mode = 'verse_text'
            verse_nums_seen = set()
            current_verse = None
            body_parts = []
            continue

        if current_chapter is None:
            continue

        vm = verse_start_re.match(text)
        if vm:
            vnum = int(vm.group(1))

            if mode == 'verse_text':
                verse_nums_seen.add(vnum)
                continue

            elif mode == 'commentary':
                if vnum in verse_nums_seen or len(verse_nums_seen) == 0:
                    flush()
                    current_verse = vnum
                    body_parts = [text]
                    continue
                else:
                    if current_verse:
                        body_parts.append(text)

        else:
            # Non-verse paragraph
            if mode == 'verse_text' and verse_nums_seen:
                mode = 'commentary'
                # Start commentary mode - this first non-verse para might be commentary for v1
                if current_verse is None and verse_nums_seen:
                    current_verse = min(verse_nums_seen)
                if current_verse:
                    body_parts.append(text)
            elif mode == 'commentary' and current_verse:
                body_parts.append(text)

    flush()
    return entries


# ─── Parser C: Inline commentary with verse refs (generic) ───────────────────

def parse_inline_commentary(docx_path, min_body_len=50):
    """
    Generic: paragraphs contain verse refs. Group paragraphs by most recent ref.
    For each verse ref found inline, collect following text as commentary.
    """
    entries = []
    paras = get_paragraphs(docx_path)

    current_ref = None
    body_parts = []
    last_heading = None

    def flush():
        if current_ref and body_parts:
            text = clean_text('\n'.join(body_parts))
            if len(text) > min_body_len:
                book, ch, vs, vs_end = current_ref
                entries.append({
                    "book": book,
                    "chapter": ch,
                    "verse": vs,
                    "verse_end": vs_end,
                    "text": text
                })

    for style, text in paras:
        is_heading = style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4')
        refs = find_all_refs(text)

        if refs:
            ref = refs[0]
            if current_ref != ref:
                # New verse reference
                if is_heading or len(text) < 300:
                    flush()
                    current_ref = ref
                    body_parts = [text]
                else:
                    body_parts.append(text)
            else:
                body_parts.append(text)
        else:
            if current_ref:
                if is_heading and len(text) < 100:
                    # New section without verse - might reset context
                    # Keep collecting under same ref unless it's clearly a new chapter
                    body_parts.append(text)
                else:
                    body_parts.append(text)

    flush()
    return entries


# ─── Parser D: Kohlbrugge (TOC + numbered sermons) ───────────────────────────

def parse_kohlbrugge(docx_path):
    """
    Kohlbrugge structure:
    TOC: "N. Title\nVerse text. Book ch:v" pairs
    Content: "N. Title" heading, then sermon body with verse refs in text.
    """
    entries = parse_sermon_collection(docx_path)
    if len(entries) < 5:
        entries = parse_inline_commentary(docx_path)
    return entries


# ─── Parser E: Calvijn EPUB ──────────────────────────────────────────────────

def parse_calvijn_epub(epub_path):
    """Parse Calvijn Romans EPUB (which is actually an EPUB3 zip)."""
    entries = []

    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts = []
            self._skip = False
            self._tags = []

        def handle_starttag(self, tag, attrs):
            self._tags.append(tag)
            if tag in ('script', 'style'):
                self._skip = True

        def handle_endtag(self, tag):
            if self._tags and self._tags[-1] == tag:
                self._tags.pop()
            if tag in ('script', 'style'):
                self._skip = False
            if tag in ('p','div','h1','h2','h3','h4','h5','br','li','tr'):
                self.parts.append('\n')

        def handle_data(self, data):
            if not self._skip:
                self.parts.append(data)

        def get_text(self):
            return ''.join(self.parts)

    try:
        with zipfile.ZipFile(str(epub_path), 'r') as zf:
            html_files = sorted([
                f for f in zf.namelist()
                if f.lower().endswith(('.html', '.xhtml', '.htm'))
                and not any(x in f for x in ('__', 'nav', 'toc'))
            ])
            if not html_files:
                html_files = sorted([
                    f for f in zf.namelist()
                    if f.lower().endswith(('.html', '.xhtml', '.htm'))
                ])

            all_paragraphs = []
            for hf in html_files:
                try:
                    content = zf.read(hf).decode('utf-8', errors='replace')
                    parser = TextExtractor()
                    parser.feed(content)
                    text = parser.get_text()
                    paras = [p.strip() for p in text.split('\n') if p.strip() and len(p.strip()) > 5]
                    all_paragraphs.extend(paras)
                except Exception as e:
                    pass

            # Parse paragraphs for verse refs
            current_ref = None
            body_parts = []

            def flush():
                if current_ref and body_parts:
                    text = clean_text('\n'.join(body_parts))
                    if len(text) > 50:
                        book, ch, vs, vs_end = current_ref
                        entries.append({
                            "book": book, "chapter": ch, "verse": vs,
                            "verse_end": vs_end, "text": text
                        })

            for para in all_paragraphs:
                ref = find_first_ref(para)
                if ref and len(para) < 400:
                    if current_ref != ref:
                        flush()
                        current_ref = ref
                        body_parts = [para]
                    else:
                        body_parts.append(para)
                elif current_ref:
                    body_parts.append(para)

            flush()

    except zipfile.BadZipFile:
        print(f"  EPUB {epub_path.name}: not a valid zip, skipping")
    except Exception as e:
        print(f"  EPUB {epub_path.name} error: {e}")

    return entries


# ─── Helper functions ─────────────────────────────────────────────────────────

def load_json(path):
    try:
        return json.load(open(str(path), encoding='utf-8'))
    except Exception:
        return []

def save_json(path, data):
    with open(str(path), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  => Saved {len(data)} entries to {path.name}")

def merge_entries(base, new, threshold=20):
    """If base has fewer than threshold entries, replace; otherwise append new unique entries."""
    if len(base) < threshold:
        return new
    base_keys = set((e['book'], e['chapter'], e['verse']) for e in base)
    merged = list(base)
    for e in new:
        k = (e['book'], e['chapter'], e['verse'])
        if k not in base_keys:
            merged.append(e)
            base_keys.add(k)
    return merged


# ─── Main ─────────────────────────────────────────────────────────────────────

results = {}
new_entries_per_author = {}
failures = []

print("=" * 60)
print("Processing Spurgeon (alle preken)...")
print("=" * 60)
spurgeon_new = []
for fname in ['spurgeon_johannes.docx', 'spurgeon_lukas.docx',
              'spurgeon_markus.docx', 'spurgeon_mattheus.docx',
              'spurgeon_ot.docx', 'spurgeon_nt.docx']:
    fp = BASE_DIR / fname
    if fp.exists():
        try:
            e = parse_sermon_collection(fp)
            print(f"  {fname}: {len(e)} entries")
            spurgeon_new.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
            failures.append(fname)
    else:
        print(f"  MISSING: {fname}")
        failures.append(fname)

existing = load_json(BASE_DIR / 'spurgeon.json')
merged = merge_entries(existing, spurgeon_new)
results['spurgeon'] = merged
new_entries_per_author['spurgeon'] = len(spurgeon_new)
save_json(BASE_DIR / 'spurgeon_nl.json', spurgeon_new)

print("\nProcessing Calvijn...")
calvijn_new = []

# Genesis DOCX
fp = BASE_DIR / 'calvijn_genesis.docx'
if fp.exists():
    try:
        e = parse_calvijn_genesis(fp)
        print(f"  calvijn_genesis.docx: {len(e)} entries")
        calvijn_new.extend(e)
    except Exception as ex:
        print(f"  ERROR calvijn_genesis.docx: {ex}")
        failures.append('calvijn_genesis.docx')

# Inline commentary fallback for genesis
if len(calvijn_new) < 5:
    try:
        e = parse_inline_commentary(BASE_DIR / 'calvijn_genesis.docx')
        print(f"  calvijn_genesis fallback: {len(e)} entries")
        calvijn_new = e
    except:
        pass

# Romeinen EPUB
fp = BASE_DIR / 'calvijn_romeinen.epub'
if fp.exists():
    try:
        e = parse_calvijn_epub(fp)
        print(f"  calvijn_romeinen.epub: {len(e)} entries")
        calvijn_new.extend(e)
    except Exception as ex:
        print(f"  ERROR calvijn_romeinen.epub: {ex}")
        failures.append('calvijn_romeinen.epub')

existing = load_json(BASE_DIR / 'calvijn.json')
merged = merge_entries(existing, calvijn_new)
results['calvijn'] = merged
new_entries_per_author['calvijn'] = len(calvijn_new)
save_json(BASE_DIR / 'calvijn_extra.json', calvijn_new)

print("\nProcessing Kohlbrügge...")
kohlbrugge_new = []
for fname in ['kohlbrugge_galaten.docx', 'kohlbrugge_romeinen.docx']:
    fp = BASE_DIR / fname
    if fp.exists():
        try:
            e = parse_kohlbrugge(fp)
            print(f"  {fname}: {len(e)} entries")
            kohlbrugge_new.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
            failures.append(fname)

existing = load_json(BASE_DIR / 'kohlbrugge.json')
merged = merge_entries(existing, kohlbrugge_new)
results['kohlbrugge'] = merged
new_entries_per_author['kohlbrugge'] = len(kohlbrugge_new)
save_json(BASE_DIR / 'kohlbrugge_extra.json', kohlbrugge_new)

print("\nProcessing Brakel (De Redelijke Godsdienst)...")
brakel_new = []
fp = BASE_DIR / 'brakel_rgd.docx'
if fp.exists():
    try:
        e = parse_inline_commentary(fp)
        print(f"  brakel_rgd.docx: {len(e)} entries")
        brakel_new.extend(e)
    except Exception as ex:
        print(f"  ERROR brakel_rgd.docx: {ex}")
        failures.append('brakel_rgd.docx')

existing = load_json(BASE_DIR / 'brakel.json')
merged = merge_entries(existing, brakel_new)
results['brakel'] = merged
new_entries_per_author['brakel'] = len(brakel_new)
save_json(BASE_DIR / 'brakel_extra.json', brakel_new)

print("\nProcessing Van der Groe...")
vandergroe_new = []
fp = BASE_DIR / 'vandergroe_leerredenen.docx'
if fp.exists():
    try:
        e = parse_sermon_collection(fp)
        print(f"  vandergroe_leerredenen.docx (sermon): {len(e)} entries")
        if len(e) < 5:
            e = parse_inline_commentary(fp)
            print(f"  vandergroe_leerredenen.docx (inline): {len(e)} entries")
        vandergroe_new.extend(e)
    except Exception as ex:
        print(f"  ERROR vandergroe_leerredenen.docx: {ex}")
        failures.append('vandergroe_leerredenen.docx')

existing = load_json(BASE_DIR / 'vandergroe.json')
merged = merge_entries(existing, vandergroe_new)
results['vandergroe'] = merged
new_entries_per_author['vandergroe'] = len(vandergroe_new)
save_json(BASE_DIR / 'vandergroe_extra.json', vandergroe_new)

print("\nProcessing Hellenbroek...")
hellenbroek_new = []
fp = BASE_DIR / 'hellenbroek_catechisatie.docx'
if fp.exists():
    try:
        e = parse_inline_commentary(fp)
        print(f"  hellenbroek_catechisatie.docx: {len(e)} entries")
        hellenbroek_new.extend(e)
    except Exception as ex:
        print(f"  ERROR hellenbroek_catechisatie.docx: {ex}")
        failures.append('hellenbroek_catechisatie.docx')

existing = load_json(BASE_DIR / 'hellenbroek.json')
merged = merge_entries(existing, hellenbroek_new)
results['hellenbroek'] = merged
new_entries_per_author['hellenbroek'] = len(hellenbroek_new)
save_json(BASE_DIR / 'hellenbroek_extra.json', hellenbroek_new)

print("\nProcessing Comrie...")
comrie_new = []
fp = BASE_DIR / 'comrie_abc.docx'
if fp.exists():
    try:
        e = parse_inline_commentary(fp)
        print(f"  comrie_abc.docx: {len(e)} entries")
        comrie_new.extend(e)
    except Exception as ex:
        print(f"  ERROR comrie_abc.docx: {ex}")
        failures.append('comrie_abc.docx')

existing = load_json(BASE_DIR / 'comrie.json')
merged = merge_entries(existing, comrie_new)
results['comrie'] = merged
new_entries_per_author['comrie'] = len(comrie_new)
save_json(BASE_DIR / 'comrie_extra.json', comrie_new)

print("\nProcessing Boston...")
boston_new = []
for fname in ['boston_4staten.docx', 'boston_7ental_2.docx', 'boston_7ental_3.docx']:
    fp = BASE_DIR / fname
    if fp.exists():
        try:
            e = parse_sermon_collection(fp)
            print(f"  {fname} (sermon): {len(e)} entries")
            if len(e) < 5:
                e = parse_inline_commentary(fp)
                print(f"  {fname} (inline): {len(e)} entries")
            boston_new.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
            failures.append(fname)

existing = load_json(BASE_DIR / 'boston.json')
merged = merge_entries(existing, boston_new)
results['boston'] = merged
new_entries_per_author['boston'] = len(boston_new)
save_json(BASE_DIR / 'boston_extra.json', boston_new)

print("\nProcessing Da Costa...")
dacosta_new = []
for fname in ['dacosta_hagar.docx', 'dacosta_profetie.docx', 'dacosta_meijer.docx']:
    fp = BASE_DIR / fname
    if fp.exists():
        try:
            e = parse_sermon_collection(fp)
            if len(e) < 3:
                e = parse_inline_commentary(fp)
            print(f"  {fname}: {len(e)} entries")
            dacosta_new.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
            failures.append(fname)

existing = load_json(BASE_DIR / 'dacosta.json')
merged = merge_entries(existing, dacosta_new)
results['dacosta'] = merged
new_entries_per_author['dacosta'] = len(dacosta_new)
save_json(BASE_DIR / 'dacosta_extra.json', dacosta_new)

print("\nProcessing Bunyan...")
bunyan_new = []
for fname in ['bunyan_christenreis.docx', 'bunyan_christinnereis.docx']:
    fp = BASE_DIR / fname
    if fp.exists():
        try:
            e = parse_inline_commentary(fp)
            print(f"  {fname}: {len(e)} entries")
            bunyan_new.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
            failures.append(fname)

existing = load_json(BASE_DIR / 'bunyan.json')
merged = merge_entries(existing, bunyan_new)
results['bunyan'] = merged
new_entries_per_author['bunyan'] = len(bunyan_new)
save_json(BASE_DIR / 'bunyan_extra.json', bunyan_new)

print("\nProcessing Smijtegelt (no new files)...")
existing = load_json(BASE_DIR / 'smijtegelt.json')
results['smijtegelt'] = existing
new_entries_per_author['smijtegelt'] = 0

# ─── Final summary ────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("RESULTATEN")
print("=" * 60)
print(f"{'Auteur':<20} {'Nieuw':>8} {'Totaal':>8}")
print("-" * 40)
total = 0
for author in ['spurgeon', 'calvijn', 'kohlbrugge', 'brakel', 'vandergroe',
               'hellenbroek', 'comrie', 'boston', 'dacosta', 'bunyan', 'smijtegelt']:
    new_n = new_entries_per_author.get(author, 0)
    total_n = len(results.get(author, []))
    print(f"  {author:<18} {new_n:>8} {total_n:>8}")
    total += total_n

print("-" * 40)
print(f"  {'TOTAAL':<18} {'':>8} {total:>8}")
if failures:
    print(f"\nFAILURES: {failures}")
else:
    print("\nGeen fouten.")
