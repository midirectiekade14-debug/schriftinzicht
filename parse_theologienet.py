#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
parse_theologienet.py
Parse downloaded DOCX files from Theologienet.nl and extract Bible verse commentaries.
"""

import os
import re
import json
import sys
import io
import docx
from pathlib import Path

# Force UTF-8 output
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE_DIR = Path("C:/Users/midir/schriftinzicht")

# ─── Bible book name mapping ────────────────────────────────────────────────

BOOK_MAP = {
    # Full Dutch names -> canonical
    "genesis": "Genesis", "exodus": "Exodus", "leviticus": "Leviticus",
    "numeri": "Numeri", "deuteronomium": "Deuteronomium", "jozua": "Jozua",
    "richteren": "Richteren", "ruth": "Ruth", "1 samuel": "1 Samuel",
    "2 samuel": "2 Samuel", "1 koningen": "1 Koningen", "2 koningen": "2 Koningen",
    "1 kronieken": "1 Kronieken", "2 kronieken": "2 Kronieken", "ezra": "Ezra",
    "nehemia": "Nehemia", "esther": "Esther", "job": "Job", "psalmen": "Psalmen",
    "psalm": "Psalmen", "spreuken": "Spreuken", "prediker": "Prediker",
    "hooglied": "Hooglied", "jesaja": "Jesaja", "jeremia": "Jeremia",
    "klaagliederen": "Klaagliederen", "klaag": "Klaagliederen",
    "ezechiël": "Ezechiël", "ezechiel": "Ezechiël", "ez": "Ezechiël",
    "daniël": "Daniël", "daniel": "Daniël", "hosea": "Hosea",
    "joël": "Joël", "joel": "Joël", "amos": "Amos", "obadja": "Obadja",
    "jona": "Jona", "micha": "Micha", "nahum": "Nahum",
    "habakuk": "Habakuk", "zefanja": "Zefanja", "haggaï": "Haggaï",
    "haggai": "Haggaï", "zacharia": "Zacharia", "maleachi": "Maleachi",
    "mattheüs": "Mattheüs", "mattheus": "Mattheüs", "marcus": "Markus",
    "markus": "Markus", "lukas": "Lukas", "lucas": "Lukas",
    "johannes": "Johannes", "handelingen": "Handelingen",
    "romeinen": "Romeinen", "1 korinthe": "1 Korinthe", "2 korinthe": "2 Korinthe",
    "1 korinthiers": "1 Korinthe", "2 korinthiers": "2 Korinthe",
    "1 korinthiërs": "1 Korinthe", "2 korinthiërs": "2 Korinthe",
    "galaten": "Galaten", "efeze": "Efeze", "eféze": "Efeze",
    "filippenzen": "Filippenzen", "kolossenzen": "Kolossenzen",
    "1 thessalonicenzen": "1 Thessalonicenzen", "2 thessalonicenzen": "2 Thessalonicenzen",
    "1 timotheüs": "1 Timotheüs", "1 timotheus": "1 Timotheüs",
    "2 timotheüs": "2 Timotheüs", "2 timotheus": "2 Timotheüs",
    "titus": "Titus", "filemon": "Filemon",
    "hebreeën": "Hebreeën", "hebreeen": "Hebreeën",
    "jakobus": "Jakobus", "jakob": "Jakobus",
    "1 petrus": "1 Petrus", "2 petrus": "2 Petrus",
    "1 johannes": "1 Johannes", "2 johannes": "2 Johannes", "3 johannes": "3 Johannes",
    "judas": "Judas", "openbaring": "Openbaring van Johannes",
    "openbaring van johannes": "Openbaring van Johannes",
    # Abbreviations
    "gen": "Genesis", "ex": "Exodus", "lev": "Leviticus", "num": "Numeri",
    "deut": "Deuteronomium", "joz": "Jozua", "richt": "Richteren",
    "1 sam": "1 Samuel", "2 sam": "2 Samuel",
    "1 kon": "1 Koningen", "2 kon": "2 Koningen",
    "1 kron": "1 Kronieken", "2 kron": "2 Kronieken",
    "neh": "Nehemia", "est": "Esther",
    "ps": "Psalmen", "spr": "Spreuken", "pred": "Prediker", "hoogl": "Hooglied",
    "jes": "Jesaja", "jer": "Jeremia", "klaagl": "Klaagliederen",
    "dan": "Daniël", "hos": "Hosea", "joël": "Joël", "am": "Amos",
    "ob": "Obadja", "jon": "Jona", "mi": "Micha", "nah": "Nahum",
    "hab": "Habakuk", "zef": "Zefanja", "hag": "Haggaï",
    "zach": "Zacharia", "mal": "Maleachi",
    "matt": "Mattheüs", "matth": "Mattheüs", "mark": "Markus", "luk": "Lukas",
    "joh": "Johannes", "hand": "Handelingen", "rom": "Romeinen",
    "1 kor": "1 Korinthe", "2 kor": "2 Korinthe",
    "1 cor": "1 Korinthe", "2 cor": "2 Korinthe",
    "gal": "Galaten", "ef": "Efeze", "fil": "Filippenzen",
    "kol": "Kolossenzen", "1 thess": "1 Thessalonicenzen", "2 thess": "2 Thessalonicenzen",
    "1 tim": "1 Timotheüs", "2 tim": "2 Timotheüs",
    "tit": "Titus", "filem": "Filemon",
    "hebr": "Hebreeën", "heb": "Hebreeën",
    "jak": "Jakobus", "1 petr": "1 Petrus", "2 petr": "2 Petrus",
    "1 pet": "1 Petrus", "2 pet": "2 Petrus",
    "1 joh": "1 Johannes", "2 joh": "2 Johannes", "3 joh": "3 Johannes",
    "openb": "Openbaring van Johannes", "op": "Openbaring van Johannes",
    # English abbreviations (for Spurgeon translated)
    "john": "Johannes", "luke": "Lukas", "mark": "Markus", "matt": "Mattheüs",
    "acts": "Handelingen", "rom": "Romeinen", "rev": "Openbaring van Johannes",
    "heb": "Hebreeën", "jas": "Jakobus",
}

# Build regex pattern for book names (longest first to avoid partial matches)
_book_keys = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pattern = "|".join(re.escape(k) for k in _book_keys)

# Verse reference pattern: "Gen 1:1", "Genesis 1:1-3", "Ps. 23:1", "Joh. 3:16", etc.
VERSE_RE = re.compile(
    r'\b('
    + _book_pattern +
    r')\s*\.?\s*(\d{1,3})\s*[:\-]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?',
    re.IGNORECASE
)

# Also match "Naam X: Y" format (with colon)
VERSE_RE2 = re.compile(
    r'\b('
    + _book_pattern +
    r')\s*\.?\s*(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?',
    re.IGNORECASE
)


def resolve_book(name):
    """Resolve a book name/abbrev to canonical Dutch name."""
    key = name.lower().strip()
    return BOOK_MAP.get(key)


def find_verse_refs(text):
    """Find all verse references in text. Returns list of (book, ch, vs, vs_end)."""
    results = []
    seen = set()
    for m in VERSE_RE.finditer(text):
        book_raw, ch, vs, vs_end = m.group(1), m.group(2), m.group(3), m.group(4)
        book = resolve_book(book_raw)
        if book:
            key = (book, int(ch), int(vs))
            if key not in seen:
                seen.add(key)
                results.append((book, int(ch), int(vs), int(vs_end) if vs_end else None))
    return results


def clean_text(text):
    """Clean up text for JSON output."""
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = text.strip()
    return text


def get_paragraphs(docx_path):
    """Load DOCX and return list of (style_name, text)."""
    d = docx.Document(str(docx_path))
    result = []
    for p in d.paragraphs:
        text = p.text.strip()
        if text:
            style = p.style.name if p.style else 'Normal'
            result.append((style, text))
    return result


# ─── Parser strategies ──────────────────────────────────────────────────────

def parse_spurgeon_preken(docx_path):
    """
    Parse Spurgeon sermon collections.
    Structure: Heading 2 = sermon title (often contains verse ref)
    Followed by verse quote paragraph, then sermon body.
    """
    entries = []
    paras = get_paragraphs(docx_path)

    i = 0
    current_book = None
    current_ch = None
    current_vs = None
    current_vs_end = None
    sermon_text_parts = []
    in_toc = True  # Skip TOC at start

    def flush():
        nonlocal sermon_text_parts
        if current_book and sermon_text_parts:
            text = clean_text('\n'.join(sermon_text_parts))
            if len(text) > 50:
                entries.append({
                    "book": current_book,
                    "chapter": current_ch,
                    "verse": current_vs,
                    "verse_end": current_vs_end,
                    "text": text
                })
        sermon_text_parts = []

    for idx, (style, text) in enumerate(paras):
        # Detect end of TOC: when Heading 2 repeats for actual content
        if style == 'Heading 2' and in_toc:
            # Check if there's a duplicate heading later (actual content)
            # We skip TOC by waiting for 'Body Text' style paragraphs
            pass

        if style in ('Heading 2', 'Heading 3', 'Heading 4') or (
            style == 'Normal' and re.match(r'^\d+\.?\s+[A-Z]', text) and len(text) < 100
        ):
            # Try to extract verse from title
            refs = find_verse_refs(text)
            if refs:
                flush()
                current_book, current_ch, current_vs, current_vs_end = refs[0]
                sermon_text_parts = []
                in_toc = False
            elif not in_toc:
                # Maybe chapter heading, just add to text
                pass

        elif style in ('Body Text', 'Normal') and not in_toc and current_book:
            # Check if this paragraph has a verse ref (verse quote at sermon start)
            refs = find_verse_refs(text)
            if refs and len(text) < 300:
                # This is the verse quote line - set reference if not set
                b, c, v, ve = refs[0]
                if current_book is None:
                    current_book, current_ch, current_vs, current_vs_end = b, c, v, ve
            sermon_text_parts.append(text)

        elif style == 'Normal' and not in_toc:
            # Look for verse quote followed by sermon content
            refs = find_verse_refs(text)
            if refs and len(text) < 400 and not sermon_text_parts:
                # This looks like a standalone verse reference = new sermon
                flush()
                current_book, current_ch, current_vs, current_vs_end = refs[0]
                sermon_text_parts = [text]
            elif current_book:
                sermon_text_parts.append(text)

        # Detect actual content start (past TOC)
        if style == 'Body Text' and in_toc:
            in_toc = False

    flush()
    return entries


def parse_spurgeon_sermon_smart(docx_path):
    """
    Smarter Spurgeon parser: scan for all Heading 2 titles, find verse refs in title or next line,
    collect body until next heading.
    """
    entries = []
    paras = get_paragraphs(docx_path)
    n = len(paras)

    # Find all heading positions
    heading_positions = []
    for i, (style, text) in enumerate(paras):
        if style in ('Heading 2', 'Heading 3'):
            heading_positions.append(i)

    # For each heading, try to find verse ref in title or next few paras
    for hi, pos in enumerate(heading_positions):
        style, title = paras[pos]

        # Find verse ref in title
        refs = find_verse_refs(title)

        # If not found in title, check next 3 paragraphs
        if not refs:
            for j in range(pos + 1, min(pos + 4, n)):
                _, txt = paras[j]
                refs = find_verse_refs(txt)
                if refs:
                    break

        if not refs:
            continue

        book, ch, vs, vs_end = refs[0]

        # Collect body text until next heading
        end_pos = heading_positions[hi + 1] if hi + 1 < len(heading_positions) else n
        body_parts = []
        for j in range(pos, end_pos):
            _, txt = paras[j]
            body_parts.append(txt)

        text = clean_text('\n'.join(body_parts))
        if len(text) > 80:
            entries.append({
                "book": book,
                "chapter": ch,
                "verse": vs,
                "verse_end": vs_end,
                "text": text
            })

    return entries


def parse_calvijn_genesis(docx_path):
    """
    Calvijn Genesis: verse is quoted as "N. text of verse", then commentary follows.
    Pattern: "1. In den beginne..." followed by commentary paragraphs starting with "1. In den beginne."
    Actually: verse quote starts, then "1. In den beginne." repeated as heading of commentary.
    """
    entries = []
    paras = get_paragraphs(docx_path)
    n = len(paras)

    current_chapter = None
    current_verse = None
    current_verse_end = None
    commentary_parts = []
    book = "Genesis"

    def flush():
        if current_chapter and current_verse and commentary_parts:
            text = clean_text('\n'.join(commentary_parts))
            if len(text) > 30:
                entries.append({
                    "book": book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": text
                })

    # Pattern for chapter heading: "Xste HOOFDSTUK." or "HOOFDSTUK X"
    ch_re = re.compile(r'(\d+)\s*(?:ste|de|e)?\s*HOOFDSTUK', re.IGNORECASE)
    # Pattern for verse number at start: "N. text" (in the verse listing section)
    verse_num_re = re.compile(r'^(\d+)\.\s+(.+)$')
    # Pattern for commentary verse heading: "N. First few words."
    # In Calvijn, the verse text is repeated verbatim then commentary starts

    in_verse_section = False
    verse_list = {}  # {verse_num: verse_text}

    for i, (style, text) in enumerate(paras):
        # Detect chapter heading
        ch_m = ch_re.search(text)
        if ch_m and ('HOOFDSTUK' in text.upper() or style in ('Heading 1', 'Heading 2', 'Heading 3')):
            flush()
            current_chapter = int(ch_m.group(1))
            current_verse = None
            commentary_parts = []
            in_verse_section = False
            verse_list = {}
            continue

        if current_chapter is None:
            continue

        # Detect verse listing section (the Bible text before commentary)
        vm = verse_num_re.match(text)
        if vm and int(vm.group(1)) >= 1 and int(vm.group(1)) <= 50:
            vnum = int(vm.group(1))
            vtext = vm.group(2)
            if not in_verse_section and vnum == 1:
                in_verse_section = True
            if in_verse_section:
                verse_list[vnum] = vtext
                continue

        # Commentary section: detect when verse number heading appears again
        # In Calvijn, commentary for verse N starts with "N. <start of verse text>."
        if in_verse_section or current_verse is not None:
            # Check if this is a commentary paragraph starting with verse number
            vm2 = verse_num_re.match(text)
            if vm2:
                vnum = int(vm2.group(1))
                if vnum in verse_list or (1 <= vnum <= 50):
                    # This starts commentary for verse vnum
                    flush()
                    current_verse = vnum
                    current_verse_end = None
                    commentary_parts = [text]
                    in_verse_section = False
                    continue

            if current_verse is not None:
                commentary_parts.append(text)

    flush()
    return entries


def parse_calvijn_genesis_v2(docx_path):
    """
    Better Calvijn parser: the structure is:
    1. Verse text block (Bible quotes, "1. In den beginne...", "2. De aarde...")
    2. Commentary block starting with "1. In den beginne." (with period, shorter)
    We look for paragraphs that start with digit+dot and match verse numbers.
    """
    entries = []
    paras = get_paragraphs(docx_path)
    n = len(paras)

    book = "Genesis"
    current_chapter = None
    current_verse = None
    body_parts = []

    def flush():
        if current_chapter and current_verse and body_parts:
            text = clean_text('\n'.join(body_parts))
            if len(text) > 40:
                entries.append({
                    "book": book,
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "verse_end": None,
                    "text": text
                })

    ch_re = re.compile(r'(\d+)\s*(?:ste|de|e)?\s*HOOFDSTUK', re.IGNORECASE)
    verse_re = re.compile(r'^(\d{1,2})\.\s+')

    # Two passes: first find chapter boundaries, then within each chapter
    # find the verse text section vs commentary section

    mode = 'preamble'  # preamble -> verse_text -> commentary
    verse_texts_seen = set()

    for i, (style, text) in enumerate(paras):
        ch_m = ch_re.search(text)
        if ch_m:
            flush()
            current_chapter = int(ch_m.group(1))
            current_verse = None
            body_parts = []
            mode = 'verse_text'
            verse_texts_seen = set()
            continue

        if current_chapter is None:
            continue

        vm = verse_re.match(text)
        if vm:
            vnum = int(vm.group(1))

            if mode == 'verse_text':
                verse_texts_seen.add(vnum)
                # Skip these - they're just the Bible text
                continue

            elif mode == 'commentary':
                if vnum in verse_texts_seen:
                    # New commentary section for this verse
                    flush()
                    current_verse = vnum
                    body_parts = [text]
                    continue
                else:
                    if current_verse:
                        body_parts.append(text)
            else:
                # mode == 'preamble', start of first verse text
                mode = 'verse_text'
                verse_texts_seen.add(vnum)
        else:
            # Non-verse-number paragraph
            if mode == 'verse_text' and verse_texts_seen:
                # Switching to commentary mode
                mode = 'commentary'
                # This paragraph might be commentary for verse 1
                if current_verse is None and 1 in verse_texts_seen:
                    current_verse = 1
                    body_parts = [text]
                elif current_verse:
                    body_parts.append(text)
            elif mode == 'commentary' and current_verse:
                body_parts.append(text)

    flush()
    return entries


def parse_generic_verse_commentary(docx_path, author_name=""):
    """
    Generic parser: scan all paragraphs for verse references.
    Group consecutive paragraphs under the most recently seen verse reference.
    """
    entries = []
    paras = get_paragraphs(docx_path)

    current_ref = None
    body_parts = []

    def flush():
        if current_ref and body_parts:
            text = clean_text('\n'.join(body_parts))
            if len(text) > 50:
                book, ch, vs, vs_end = current_ref
                entries.append({
                    "book": book,
                    "chapter": ch,
                    "verse": vs,
                    "verse_end": vs_end,
                    "text": text
                })

    for style, text in paras:
        refs = find_verse_refs(text)
        if refs:
            # Found a verse ref in this paragraph
            ref = refs[0]
            if current_ref and current_ref != ref:
                # Check if this is a heading/title-type paragraph
                if len(text) < 200:
                    flush()
                    current_ref = ref
                    body_parts = [text]
                else:
                    body_parts.append(text)
            else:
                if current_ref is None:
                    current_ref = ref
                body_parts.append(text)
        else:
            if current_ref:
                body_parts.append(text)

    flush()
    return entries


def parse_kohlbrugge(docx_path):
    """
    Kohlbrugge: TOC lists sermon titles with verse refs.
    Then sermon content: title (Heading or numbered), verse quote, then body.
    Pattern in TOC: "N. Title" followed by "Verse text. Book chapter:verse"
    """
    entries = []
    paras = get_paragraphs(docx_path)
    n = len(paras)

    # First, build list of (position, book, ch, vs) for each sermon start
    sermon_starts = []

    for i, (style, text) in enumerate(paras):
        refs = find_verse_refs(text)
        # Sermon starts: Heading 2/3 with title, followed by verse
        if style in ('Heading 2', 'Heading 3', 'Heading 4'):
            if refs:
                sermon_starts.append((i, refs[0]))
            else:
                # Check next paragraph for verse
                if i + 1 < n:
                    next_refs = find_verse_refs(paras[i+1][1])
                    if next_refs:
                        sermon_starts.append((i, next_refs[0]))
        elif re.match(r'^\d+\.\s+\S', text) and style == 'Normal':
            # Numbered sermon like "1. De genade..."
            if refs:
                sermon_starts.append((i, refs[0]))

    # If we found sermon starts, extract content for each
    if len(sermon_starts) > 1:
        for si, (pos, ref) in enumerate(sermon_starts):
            end_pos = sermon_starts[si + 1][0] if si + 1 < len(sermon_starts) else n
            body_parts = []
            for j in range(pos, end_pos):
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

    # Fallback: generic parsing
    if len(entries) < 5:
        entries = parse_generic_verse_commentary(docx_path)

    return entries


def parse_brakel(docx_path):
    """
    Brakel: Systematic theology, each chapter discusses theological themes
    with inline Bible references. Extract all verse citations with context.
    """
    return parse_generic_verse_commentary(docx_path)


def parse_vandergroe(docx_path):
    """
    Van der Groe: 12 sermons on various texts.
    Each sermon has a title with verse ref, then body.
    """
    return parse_spurgeon_sermon_smart(docx_path)


def parse_hellenbroek(docx_path):
    """Hellenbroek: catechism with Q&A, inline verse refs."""
    return parse_generic_verse_commentary(docx_path)


def parse_comrie(docx_path):
    """Comrie: doctrinal work with inline verse refs."""
    return parse_generic_verse_commentary(docx_path)


def parse_boston(docx_path):
    """
    Boston: sermons and theological works with verse refs.
    Boston 4-staten: 4 states of man, each section has verse refs.
    """
    return parse_spurgeon_sermon_smart(docx_path)


def parse_dacosta(docx_path):
    """Da Costa: Bible studies on specific texts."""
    return parse_generic_verse_commentary(docx_path)


def parse_bunyan(docx_path):
    """Bunyan: allegories and sermons with Scripture references."""
    return parse_generic_verse_commentary(docx_path)


# ─── EPUB parser for Calvijn Romeinen ───────────────────────────────────────

def parse_calvijn_epub(epub_path):
    """
    Parse Calvijn Romans EPUB.
    EPUB is a ZIP with HTML content files.
    """
    import zipfile
    from html.parser import HTMLParser

    entries = []

    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.text_parts = []
            self.skip_tags = {'script', 'style'}
            self.current_skip = False

        def handle_starttag(self, tag, attrs):
            if tag in self.skip_tags:
                self.current_skip = True

        def handle_endtag(self, tag):
            if tag in self.skip_tags:
                self.current_skip = False
            if tag in ('p', 'div', 'h1', 'h2', 'h3', 'h4', 'br'):
                self.text_parts.append('\n')

        def handle_data(self, data):
            if not self.current_skip:
                self.text_parts.append(data)

        def get_text(self):
            return ''.join(self.text_parts)

    try:
        with zipfile.ZipFile(str(epub_path), 'r') as zf:
            # Get all HTML/XHTML files
            html_files = sorted([
                f for f in zf.namelist()
                if f.endswith(('.html', '.xhtml', '.htm'))
                and not f.startswith('__')
            ])

            all_text = []
            for hf in html_files:
                try:
                    content = zf.read(hf).decode('utf-8', errors='replace')
                    parser = TextExtractor()
                    parser.feed(content)
                    all_text.append(parser.get_text())
                except Exception:
                    pass

            full_text = '\n'.join(all_text)

            # Split into paragraphs and find verse refs
            paragraphs = [p.strip() for p in full_text.split('\n') if p.strip()]

            current_ref = None
            body_parts = []

            def flush():
                if current_ref and body_parts:
                    text = clean_text('\n'.join(body_parts))
                    if len(text) > 50:
                        book, ch, vs, vs_end = current_ref
                        entries.append({
                            "book": book,
                            "chapter": ch,
                            "verse": vs,
                            "verse_end": vs_end,
                            "text": text
                        })

            for para in paragraphs:
                refs = find_verse_refs(para)
                if refs and len(para) < 300:
                    flush()
                    current_ref = refs[0]
                    body_parts = [para]
                elif current_ref:
                    body_parts.append(para)

            flush()

    except Exception as e:
        print(f"EPUB parse error: {e}")

    return entries


# ─── Main processing ─────────────────────────────────────────────────────────

def merge_entries(existing, new_entries, min_existing=20):
    """If existing has few entries, replace; otherwise merge."""
    if len(existing) < min_existing:
        return new_entries
    # Merge, avoiding exact duplicates
    existing_keys = set(
        (e['book'], e['chapter'], e['verse'])
        for e in existing
    )
    merged = list(existing)
    for e in new_entries:
        key = (e['book'], e['chapter'], e['verse'])
        if key not in existing_keys:
            merged.append(e)
            existing_keys.add(key)
    return merged


def load_json(path):
    try:
        return json.load(open(str(path), encoding='utf-8'))
    except Exception:
        return []


def save_json(path, data):
    with open(str(path), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(data)} entries to {path}")


# ─── Process all files ───────────────────────────────────────────────────────

results = {}
failures = []

# Spurgeon preken per Evangelie
spurgeon_new = []
for fname, label in [
    ('spurgeon_johannes.docx', 'Johannes'),
    ('spurgeon_lukas.docx', 'Lukas'),
    ('spurgeon_markus.docx', 'Markus'),
    ('spurgeon_mattheus.docx', 'Mattheüs'),
    ('spurgeon_ot.docx', 'OT'),
    ('spurgeon_nt.docx', 'NT'),
]:
    fpath = BASE_DIR / fname
    if fpath.exists():
        try:
            entries = parse_spurgeon_sermon_smart(fpath)
            print(f"  {fname}: {len(entries)} entries")
            spurgeon_new.extend(entries)
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            failures.append(fname)
    else:
        print(f"  MISSING: {fname}")
        failures.append(fname)

# Merge with existing spurgeon.json
existing_spurgeon = load_json(BASE_DIR / 'spurgeon.json')
spurgeon_merged = merge_entries(existing_spurgeon, spurgeon_new, min_existing=100)
results['spurgeon'] = spurgeon_merged
save_json(BASE_DIR / 'spurgeon_nl.json', spurgeon_new)

# Calvijn Genesis
calvijn_entries = []
calvijn_genesis_path = BASE_DIR / 'calvijn_genesis.docx'
if calvijn_genesis_path.exists():
    try:
        entries = parse_calvijn_genesis_v2(calvijn_genesis_path)
        print(f"  calvijn_genesis.docx: {len(entries)} entries")
        calvijn_entries.extend(entries)
    except Exception as e:
        print(f"  ERROR calvijn_genesis.docx: {e}")
        failures.append('calvijn_genesis.docx')

# Calvijn Romeinen EPUB
calvijn_epub_path = BASE_DIR / 'calvijn_romeinen.epub'
if calvijn_epub_path.exists():
    try:
        entries = parse_calvijn_epub(calvijn_epub_path)
        print(f"  calvijn_romeinen.epub: {len(entries)} entries")
        calvijn_entries.extend(entries)
    except Exception as e:
        print(f"  ERROR calvijn_romeinen.epub: {e}")
        failures.append('calvijn_romeinen.epub')

existing_calvijn = load_json(BASE_DIR / 'calvijn.json')
calvijn_merged = merge_entries(existing_calvijn, calvijn_entries, min_existing=10)
results['calvijn'] = calvijn_merged
save_json(BASE_DIR / 'calvijn_extra.json', calvijn_entries)

# Kohlbrugge
kohlbrugge_entries = []
for fname in ['kohlbrugge_galaten.docx', 'kohlbrugge_romeinen.docx']:
    fpath = BASE_DIR / fname
    if fpath.exists():
        try:
            entries = parse_kohlbrugge(fpath)
            print(f"  {fname}: {len(entries)} entries")
            kohlbrugge_entries.extend(entries)
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            failures.append(fname)

existing_kohlbrugge = load_json(BASE_DIR / 'kohlbrugge.json')
kohlbrugge_merged = merge_entries(existing_kohlbrugge, kohlbrugge_entries, min_existing=5)
results['kohlbrugge'] = kohlbrugge_merged
save_json(BASE_DIR / 'kohlbrugge_extra.json', kohlbrugge_entries)

# Brakel
brakel_entries = []
brakel_path = BASE_DIR / 'brakel_rgd.docx'
if brakel_path.exists():
    try:
        entries = parse_brakel(brakel_path)
        print(f"  brakel_rgd.docx: {len(entries)} entries")
        brakel_entries.extend(entries)
    except Exception as e:
        print(f"  ERROR brakel_rgd.docx: {e}")
        failures.append('brakel_rgd.docx')

existing_brakel = load_json(BASE_DIR / 'brakel.json')
brakel_merged = merge_entries(existing_brakel, brakel_entries, min_existing=5)
results['brakel'] = brakel_merged
save_json(BASE_DIR / 'brakel_extra.json', brakel_entries)

# Van der Groe
vandergroe_entries = []
vg_path = BASE_DIR / 'vandergroe_leerredenen.docx'
if vg_path.exists():
    try:
        entries = parse_vandergroe(vg_path)
        print(f"  vandergroe_leerredenen.docx: {len(entries)} entries")
        vandergroe_entries.extend(entries)
    except Exception as e:
        print(f"  ERROR vandergroe_leerredenen.docx: {e}")
        failures.append('vandergroe_leerredenen.docx')

existing_vg = load_json(BASE_DIR / 'vandergroe.json')
vg_merged = merge_entries(existing_vg, vandergroe_entries, min_existing=5)
results['vandergroe'] = vg_merged
save_json(BASE_DIR / 'vandergroe_extra.json', vandergroe_entries)

# Hellenbroek
hellenbroek_entries = []
hb_path = BASE_DIR / 'hellenbroek_catechisatie.docx'
if hb_path.exists():
    try:
        entries = parse_hellenbroek(hb_path)
        print(f"  hellenbroek_catechisatie.docx: {len(entries)} entries")
        hellenbroek_entries.extend(entries)
    except Exception as e:
        print(f"  ERROR hellenbroek_catechisatie.docx: {e}")
        failures.append('hellenbroek_catechisatie.docx')

existing_hb = load_json(BASE_DIR / 'hellenbroek.json')
hb_merged = merge_entries(existing_hb, hellenbroek_entries, min_existing=5)
results['hellenbroek'] = hb_merged
save_json(BASE_DIR / 'hellenbroek_extra.json', hellenbroek_entries)

# Comrie
comrie_entries = []
comrie_path = BASE_DIR / 'comrie_abc.docx'
if comrie_path.exists():
    try:
        entries = parse_comrie(comrie_path)
        print(f"  comrie_abc.docx: {len(entries)} entries")
        comrie_entries.extend(entries)
    except Exception as e:
        print(f"  ERROR comrie_abc.docx: {e}")
        failures.append('comrie_abc.docx')

existing_comrie = load_json(BASE_DIR / 'comrie.json')
comrie_merged = merge_entries(existing_comrie, comrie_entries, min_existing=5)
results['comrie'] = comrie_merged
save_json(BASE_DIR / 'comrie_extra.json', comrie_entries)

# Boston
boston_entries = []
for fname in ['boston_4staten.docx', 'boston_7ental_2.docx', 'boston_7ental_3.docx']:
    fpath = BASE_DIR / fname
    if fpath.exists():
        try:
            entries = parse_boston(fpath)
            print(f"  {fname}: {len(entries)} entries")
            boston_entries.extend(entries)
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            failures.append(fname)

existing_boston = load_json(BASE_DIR / 'boston.json')
boston_merged = merge_entries(existing_boston, boston_entries, min_existing=5)
results['boston'] = boston_merged
save_json(BASE_DIR / 'boston_extra.json', boston_entries)

# Da Costa
dacosta_entries = []
for fname in ['dacosta_hagar.docx', 'dacosta_profetie.docx', 'dacosta_meijer.docx']:
    fpath = BASE_DIR / fname
    if fpath.exists():
        try:
            entries = parse_dacosta(fpath)
            print(f"  {fname}: {len(entries)} entries")
            dacosta_entries.extend(entries)
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            failures.append(fname)

existing_dacosta = load_json(BASE_DIR / 'dacosta.json')
dacosta_merged = merge_entries(existing_dacosta, dacosta_entries, min_existing=5)
results['dacosta'] = dacosta_merged
save_json(BASE_DIR / 'dacosta_extra.json', dacosta_entries)

# Bunyan
bunyan_entries = []
for fname in ['bunyan_christenreis.docx', 'bunyan_christinnereis.docx']:
    fpath = BASE_DIR / fname
    if fpath.exists():
        try:
            entries = parse_bunyan(fpath)
            print(f"  {fname}: {len(entries)} entries")
            bunyan_entries.extend(entries)
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            failures.append(fname)

existing_bunyan = load_json(BASE_DIR / 'bunyan.json')
bunyan_merged = merge_entries(existing_bunyan, bunyan_entries, min_existing=5)
results['bunyan'] = bunyan_merged
save_json(BASE_DIR / 'bunyan_extra.json', bunyan_entries)

# Smijtegelt - no new files found, keep existing
existing_smijtegelt = load_json(BASE_DIR / 'smijtegelt.json')
results['smijtegelt'] = existing_smijtegelt
print(f"  smijtegelt: keeping {len(existing_smijtegelt)} existing entries (no new files found)")

# ─── Summary ─────────────────────────────────────────────────────────────────

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
total = 0
for author, entries in results.items():
    print(f"  {author}: {len(entries)} entries")
    total += len(entries)
print(f"\nTOTAL: {total} entries")
print(f"FAILURES: {failures if failures else 'None'}")
