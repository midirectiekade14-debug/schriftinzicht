#!/usr/bin/env python3
"""
Parse all Calvijn bijbelverklaring OCR texts + Genesis DOCX into JSON.
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = Path("C:/Users/midir/schriftinzicht/scraped/calvijn")
OUTPUT_FILE = Path("C:/Users/midir/schriftinzicht/scraped/calvijn_nl_theologienet.json")


def parse_genesis_docx():
    """Parse Genesis 1-3 from DOCX file."""
    from docx import Document

    doc = Document(str(BASE_DIR / "calvijn-genesis-1-3.docx"))
    entries = []
    current_entry = None
    current_chapter = 1

    chapter_words = {
        'eerste': 1, '1ste': 1, '1e': 1,
        'tweede': 2, '2de': 2, '2e': 2,
        'derde': 3, '3de': 3, '3e': 3,
    }

    for i, p in enumerate(doc.paragraphs):
        text = p.text.strip()
        if not text:
            continue

        # Chapter headings
        ch_match = re.match(r'^(\d+)(?:ste|de|e)?\s+HOOFDSTUK', text, re.IGNORECASE)
        if ch_match:
            current_chapter = int(ch_match.group(1))
            continue
        ch_match2 = re.match(r'^HOOFDSTUK\s+(\d+)', text, re.IGNORECASE)
        if ch_match2:
            current_chapter = int(ch_match2.group(1))
            continue
        for word, num in chapter_words.items():
            if re.match(rf'^{word}\s+HOOFDSTUK', text, re.IGNORECASE):
                current_chapter = num
                break

        if i < 220:
            continue
        if 'EINDE HOOFDSTUK' in text.upper():
            continue

        # Verse range
        vr_match = re.match(r'^(\d+)\s*[-–]\s*(\d+)\.\s*(.*)', text)
        if vr_match:
            v1, v2 = int(vr_match.group(1)), int(vr_match.group(2))
            if 1 <= v1 <= 31:
                if current_entry and current_entry["text"].strip():
                    entries.append(current_entry)
                current_entry = {
                    "book": "Genesis", "chapter": current_chapter,
                    "verse": v1, "verse_end": v2,
                    "text": vr_match.group(3).strip() + "\n" if vr_match.group(3).strip() else ""
                }
                continue

        # Single verse
        v_match = re.match(r'^(\d+)\.\s+(.+)', text)
        if v_match:
            vn = int(v_match.group(1))
            if 1 <= vn <= 31:
                if current_entry and current_entry["text"].strip():
                    entries.append(current_entry)
                current_entry = {
                    "book": "Genesis", "chapter": current_chapter,
                    "verse": vn, "verse_end": None, "text": ""
                }
                continue

        if current_entry:
            current_entry["text"] += text + "\n"

    if current_entry and current_entry["text"].strip():
        entries.append(current_entry)

    for e in entries:
        e["text"] = e["text"].strip()
    return entries


def parse_ocr_text_pageheader(txt_file, book_map):
    """
    Parse OCR text using page headers like "42 HEBREEN 3:5" to track book/chapter,
    and verse patterns like "5. ..." to split commentary.

    book_map: dict mapping uppercase OCR name fragments -> normalized book name
    e.g. {"HEBREEN": "Hebreeen", "HEBR": "Hebreeen", "JAKOBUS": "Jakobus", ...}
    """
    with open(txt_file, 'r', encoding='utf-8') as f:
        text = f.read()

    lines = text.split('\n')
    entries = []
    current_book = None
    current_chapter = None
    current_verse = None
    current_verse_end = None
    current_text = []

    # Page header: "NUMBER BOOKNAME chapter:verse" or "BOOKNAME chapter:verse"
    page_header_re = re.compile(
        r'^\d*\s*(' + '|'.join(re.escape(k) for k in book_map.keys()) + r')\s+(\d+)\s*:\s*(\d+)',
        re.IGNORECASE
    )

    # Chapter heading
    chapter_re = re.compile(r'^(?:HOOFDSTUK|HOOFD[-\s]?STUK)\s+(\w+)', re.IGNORECASE)

    # Roman/written numerals for chapters
    roman_map = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
        'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12,
        'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16
    }

    # Verse commentary start: "5. text..." or "5-8. text..."
    verse_re = re.compile(r'^\s*(\d+)\.\s+(.{10,})')
    verse_range_re = re.compile(r'^\s*(\d+)\s*[-–,]\s*(\d+)\.\s+(.{10,})')

    # Page boundary
    page_re = re.compile(r'^--- PAGE \d+ ---$')

    # Book title detection - for "DE INHOUD VAN DEN ZENDBRIEF..."
    book_title_re = re.compile(
        r'(?:ZENDBRIEF|BRIEF)\s+(?:VAN\s+PAULUS\s+)?(?:AAN\s+(?:DE\s+)?)?(' +
        '|'.join(re.escape(k) for k in book_map.keys()) + r')',
        re.IGNORECASE
    )

    def save_entry():
        if current_verse is not None and current_text and current_book:
            txt = '\n'.join(current_text).strip()
            if len(txt) > 20:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter or 1,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": txt
                })

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped or page_re.match(stripped):
            continue

        # Check page header for book/chapter tracking
        ph = page_header_re.match(stripped)
        if ph:
            book_key = ph.group(1).upper()
            for k, v in book_map.items():
                if k.upper() == book_key:
                    current_book = v
                    break
            ch = int(ph.group(2))
            if ch != current_chapter:
                current_chapter = ch
            continue

        # Book title detection
        bt = book_title_re.search(stripped)
        if bt and len(stripped) < 120:
            book_key = bt.group(1).upper()
            for k, v in book_map.items():
                if k.upper() == book_key:
                    current_book = v
                    break
            continue

        # Chapter heading
        ch_m = chapter_re.match(stripped)
        if ch_m and len(stripped) < 50:
            ch_val = ch_m.group(1)
            if ch_val.isdigit():
                current_chapter = int(ch_val)
            elif ch_val.upper() in roman_map:
                current_chapter = roman_map[ch_val.upper()]
            continue

        if not current_book:
            continue

        # Verse range
        vr = verse_range_re.match(stripped)
        if vr:
            v1, v2 = int(vr.group(1)), int(vr.group(2))
            if 1 <= v1 <= 176 and 1 <= v2 <= 176:
                save_entry()
                current_verse = v1
                current_verse_end = v2
                current_text = [vr.group(3).strip()]
                continue

        # Single verse
        vm = verse_re.match(stripped)
        if vm:
            vn = int(vm.group(1))
            if 1 <= vn <= 176:
                save_entry()
                current_verse = vn
                current_verse_end = None
                current_text = [vm.group(2).strip()]
                continue

        # Accumulate text
        if current_verse is not None:
            current_text.append(stripped)

    save_entry()
    return entries


def build_book_map(books_with_aliases):
    """Build a mapping from OCR name variants to normalized book names."""
    bmap = {}
    for canonical, aliases in books_with_aliases:
        for alias in aliases:
            bmap[alias] = canonical
    return bmap


def main():
    all_entries = []

    # 1. Genesis DOCX
    print("Parsing Genesis 1-3 (DOCX)...")
    genesis = parse_genesis_docx()
    all_entries.extend(genesis)
    print(f"  -> {len(genesis)} entries")

    # 2. Hebreeen-Judas
    print("\nParsing Hebreeen-Judas (OCR)...")
    bmap_hj = build_book_map([
        ("Hebreeen", ["HEBREEN", "HEBREËN", "HEBR"]),
        ("Jakobus", ["JAKOBUS", "JAKOBIJS", "JAKOB"]),
        ("1 Petrus", ["1 PETRUS", "EERSTE PETRUS"]),
        ("2 Petrus", ["2 PETRUS", "TWEEDE PETRUS"]),
        ("1 Johannes", ["1 JOHANNES", "EERSTE JOHANNES"]),
        ("Judas", ["JUDAS"]),
    ])
    hj = parse_ocr_text_pageheader(
        BASE_DIR / "calvijn-bijbelverklaring-hebreeen-judas.txt", bmap_hj)
    all_entries.extend(hj)
    books_hj = {}
    for e in hj:
        books_hj[e["book"]] = books_hj.get(e["book"], 0) + 1
    for b, c in sorted(books_hj.items()):
        print(f"  -> {b}: {c} entries")

    # 3. Galaten-Filemon
    print("\nParsing Galaten-Filemon (OCR)...")
    bmap_gf = build_book_map([
        ("Galaten", ["GALATEN", "GALAT"]),
        ("Efeze", ["EFEZ", "EFEZIËRS", "EFEZIËES", "EFEZIERS"]),
        ("Filippenzen", ["FILIPP", "FILIPPENSEN", "FILIPPENZ"]),
        ("Kolossenzen", ["KOLOSS", "COLOSS", "KOLOSSENZEN", "COLOSSENSEN"]),
        ("1 Thessalonicenzen", ["1 THESSALONICENSEN", "EERSTE THESSALONICENSEN", "1 THESS"]),
        ("2 Thessalonicenzen", ["2 THESSALONICENSEN", "TWEEDE THESSALONICENSEN", "2 THESS"]),
        ("1 Timotheus", ["1 TIMOTHEUS", "1 TIMOTHEÜS", "EERSTE TIMOTHEUS", "1 TIM"]),
        ("2 Timotheus", ["2 TIMOTHEUS", "2 TIMOTHEÜS", "TWEEDE TIMOTHEUS", "2 TIM"]),
        ("Titus", ["TITUS"]),
        ("Filemon", ["FILEMON", "FILÉMON"]),
    ])
    gf = parse_ocr_text_pageheader(
        BASE_DIR / "calvijn-bijbelverklaring-galaten-filemon.txt", bmap_gf)
    all_entries.extend(gf)
    books_gf = {}
    for e in gf:
        books_gf[e["book"]] = books_gf.get(e["book"], 0) + 1
    for b, c in sorted(books_gf.items()):
        print(f"  -> {b}: {c} entries")

    # 4. Romeinen - 2 Korinthe
    print("\nParsing Romeinen - 2 Korinthe (OCR)...")
    bmap_rk = build_book_map([
        ("Romeinen", ["ROMEINEN", "ROMEIN", "ROM"]),
        ("1 Korinthe", ["1 KORINTHE", "1 KORINT", "1 CORINTH", "EERSTE KORINTHE", "I KORINTHE"]),
        ("2 Korinthe", ["2 KORINTHE", "2 KORINT", "2 CORINTH", "TWEEDE KORINTHE", "II KORINTHE"]),
    ])
    rk = parse_ocr_text_pageheader(
        BASE_DIR / "calvijn-bijbelverklaring-romeinen-1-2-korinthe.txt", bmap_rk)
    all_entries.extend(rk)
    books_rk = {}
    for e in rk:
        books_rk[e["book"]] = books_rk.get(e["book"], 0) + 1
    for b, c in sorted(books_rk.items()):
        print(f"  -> {b}: {c} entries")

    # Clean all text
    for e in all_entries:
        e["text"] = re.sub(r'\n{3,}', '\n\n', e["text"]).strip()

    # Write output
    print(f"\n{'='*60}")
    print(f"Writing {len(all_entries)} entries to {OUTPUT_FILE}")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY:")
    book_summary = {}
    for e in all_entries:
        book_summary[e["book"]] = book_summary.get(e["book"], 0) + 1
    for book in sorted(book_summary.keys()):
        print(f"  {book}: {book_summary[book]} entries")
    print(f"  TOTAL: {len(all_entries)} entries")


if __name__ == "__main__":
    main()
