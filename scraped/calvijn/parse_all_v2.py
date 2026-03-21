#!/usr/bin/env python3
"""
Parse Calvijn bijbelverklaring OCR texts + Genesis DOCX into JSON.
V2: Uses page headers for book/chapter/verse tracking, and verse number
    patterns for splitting commentary within pages.
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


def parse_ocr_file(txt_file, book_aliases):
    """
    Parse OCR text using a two-pass approach:
    1. First pass: identify page headers to map pages -> book/chapter/verse
    2. Second pass: within each page, find verse commentary starts

    book_aliases: list of (canonical_name, [alias1, alias2, ...])
    """
    with open(txt_file, 'r', encoding='utf-8') as f:
        text = f.read()

    # Build alias lookup
    alias_to_book = {}
    for canonical, aliases in book_aliases:
        for a in aliases:
            alias_to_book[a.upper()] = canonical

    all_alias_pattern = '|'.join(
        re.escape(a) for _, aliases in book_aliases for a in aliases
    )

    # Page header regex: "NUMBER BOOKNAME chapter:verse" or "BOOKNAME chapter:verse NUMBER"
    # Examples: "16 HEBREEN 1:14, 2." or "HEBREËN 1:3, 19" or "HEBREEN 2:9, 10."
    page_header_re = re.compile(
        r'^\s*\d*\s*(' + all_alias_pattern + r')[.,]?\s+(\d+)\s*:\s*(\d+)',
        re.IGNORECASE
    )
    # Also match reversed: "BOOKNAME chapter:verse. NUMBER"
    page_header_re2 = re.compile(
        r'^\s*(' + all_alias_pattern + r')[.,]?\s+(\d+)\s*:\s*(\d+)',
        re.IGNORECASE
    )

    # Chapter heading
    chapter_re = re.compile(
        r'^(?:HET\s+)?(?:EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE|ZESDE|ZEVENDE|ACHTSTE|NEGENDE|TIENDE|ELFDE|TWAALFDE|DERTIENDE|VEERTIENDE|VIJFTIENDE|ZESTIENDE)?\s*HOOFDSTUK[\s.]*(\d*)',
        re.IGNORECASE
    )

    chapter_word_map = {
        'EERSTE': 1, 'TWEEDE': 2, 'DERDE': 3, 'VIERDE': 4, 'VIJFDE': 5,
        'ZESDE': 6, 'ZEVENDE': 7, 'ACHTSTE': 8, 'NEGENDE': 9, 'TIENDE': 10,
        'ELFDE': 11, 'TWAALFDE': 12, 'DERTIENDE': 13, 'VEERTIENDE': 14,
        'VIJFTIENDE': 15, 'ZESTIENDE': 16,
    }

    # Book title: "ZENDBRIEF VAN PAULUS AAN DE EFEZIËRS" or "DE BRIEF AAN TITUS"
    book_title_re = re.compile(
        r'(?:ZENDBRIEF|BRIEF)\s+(?:VAN\s+(?:PAULUS\s+)?)?(?:AAN\s+(?:DE\s+)?)?(' + all_alias_pattern + r')',
        re.IGNORECASE
    )
    # Also: "DE INHOUD ... ZENDBRIEF VAN JAKOBUS"
    book_title_re2 = re.compile(
        r'ZENDBRIEF\s+VAN\s+(' + all_alias_pattern + r')',
        re.IGNORECASE
    )

    # Verse start in commentary: starts with verse number + capital letter or quote
    # "2 Welken Hij gesteld heeft." or "3 Dewelke alzoo..." or "5-8. Van deze..."
    verse_start_re = re.compile(
        r'^(\d+)\s+([A-Z][a-zéèëïöüàáâ])',
    )
    verse_range_start_re = re.compile(
        r'^(\d+)\s*[-–,]\s*(\d+)[\s.]+([A-Z][a-zéèëïöüàáâ])',
    )

    # Cross-reference pattern (to skip): "1 Cor. 10:11" or "Hebr. 4:15"
    crossref_re = re.compile(
        r'^\d+\s+(?:Cor|Kor|Tim|Thess|Petr|Joh|Sam|Kon|Kron|Hebr|Rom|Gal|Ef|Fil|Kol|Tit|Jak|Jud)\.',
        re.IGNORECASE
    )

    lines = text.split('\n')
    entries = []
    current_book = None
    current_chapter = None
    current_verse = None
    current_verse_end = None
    current_text = []
    in_preamble = True  # Skip until we find first chapter heading or commentary

    def save_entry():
        nonlocal current_verse, current_verse_end, current_text
        if current_verse is not None and current_text and current_book:
            txt = '\n'.join(current_text).strip()
            if len(txt) > 30:
                entries.append({
                    "book": current_book,
                    "chapter": current_chapter or 1,
                    "verse": current_verse,
                    "verse_end": current_verse_end,
                    "text": txt
                })
        current_text = []

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Page boundary
        if stripped.startswith('--- PAGE'):
            continue

        # Book title detection
        bt = book_title_re.search(stripped) or book_title_re2.search(stripped)
        if bt and len(stripped) < 120:
            matched = bt.group(1).upper()
            for key, canonical in alias_to_book.items():
                if key == matched:
                    if current_book != canonical:
                        save_entry()
                        current_book = canonical
                        current_chapter = None
                        current_verse = None
                        in_preamble = True
                    break
            continue

        # Page header -> update book/chapter
        ph = page_header_re.match(stripped) or page_header_re2.match(stripped)
        if ph:
            matched = ph.group(1).upper()
            for key, canonical in alias_to_book.items():
                if key == matched:
                    current_book = canonical
                    break
            ch = int(ph.group(2))
            current_chapter = ch
            in_preamble = False
            continue

        # Chapter heading
        ch_m = chapter_re.match(stripped)
        if ch_m and len(stripped) < 80:
            # Extract chapter number
            if ch_m.group(1) and ch_m.group(1).isdigit():
                current_chapter = int(ch_m.group(1))
            else:
                # Try word-based
                for word, num in chapter_word_map.items():
                    if word in stripped.upper():
                        current_chapter = num
                        break
            in_preamble = False
            continue

        # Skip if no book yet
        if not current_book or in_preamble:
            # Check if this is "UITLEGGING" which marks start of commentary
            if stripped == "UITLEGGING." or stripped == "UITLEGGING":
                in_preamble = False
            continue

        # Skip cross-references
        if crossref_re.match(stripped):
            continue

        # Skip page numbers (just digits)
        if re.match(r'^\d{1,3}$', stripped):
            continue

        # Skip marginal references like "Ps 81:51" or "Lev. 19:18"
        if re.match(r'^[A-Z][a-z]{0,4}[.,]?\s+\d+\s*:\s*\d+', stripped) and len(stripped) < 30:
            continue

        # Verse range start
        vr = verse_range_start_re.match(stripped)
        if vr:
            v1, v2 = int(vr.group(1)), int(vr.group(2))
            if 1 <= v1 <= 176 and 1 <= v2 <= 176 and v2 > v1:
                save_entry()
                current_verse = v1
                current_verse_end = v2
                current_text = [stripped]
                continue

        # Verse start
        vs = verse_start_re.match(stripped)
        if vs:
            vn = int(vs.group(1))
            # Check it's not a cross-reference
            rest = stripped[len(vs.group(0))-1:].strip()
            # Reasonable verse number
            if 1 <= vn <= 176:
                save_entry()
                current_verse = vn
                current_verse_end = None
                current_text = [stripped]
                continue

        # Accumulate text
        if current_verse is not None:
            current_text.append(stripped)

    save_entry()
    return entries


def main():
    all_entries = []

    # 1. Genesis DOCX
    print("Parsing Genesis 1-3 (DOCX)...")
    genesis = parse_genesis_docx()
    all_entries.extend(genesis)
    print(f"  -> {len(genesis)} entries")

    # 2. Hebreeen-Judas
    print("\nParsing Hebreeen-Judas (OCR)...")
    hj = parse_ocr_file(
        BASE_DIR / "calvijn-bijbelverklaring-hebreeen-judas.txt",
        [
            ("Hebreeen", ["HEBREEN", "HEBREËN", "HEBR", "HEBREEËN", "HEBRE"]),
            ("Jakobus", ["JAKOBUS", "JAKOBIJS"]),
        ]
    )
    all_entries.extend(hj)
    report_books(hj)

    # 3. Galaten-Filemon
    print("\nParsing Galaten-Filemon (OCR)...")
    gf = parse_ocr_file(
        BASE_DIR / "calvijn-bijbelverklaring-galaten-filemon.txt",
        [
            ("Galaten", ["GALATEN"]),
            ("Efeze", ["EFEZ", "EFEZIËRS", "EFEZIERS", "EFEZIËES"]),
            ("Filippenzen", ["FILIPPENSEN", "FILIPP"]),
            ("Kolossenzen", ["KOLOSSENZEN", "COLOSSENSEN", "KOLOSS", "COLOSS"]),
            ("1 Thessalonicenzen", ["1 THESSALONICENSEN"]),
            ("2 Thessalonicenzen", ["2 THESSALONICENSEN"]),
            ("1 Timotheus", ["1 TIMOTHEUS", "1 TIMOTHEÜS"]),
            ("2 Timotheus", ["2 TIMOTHEUS", "2 TIMOTHEÜS"]),
            ("Titus", ["TITUS"]),
            ("Filemon", ["FILEMON", "FILÉMON"]),
        ]
    )
    all_entries.extend(gf)
    report_books(gf)

    # 4. Romeinen - 2 Korinthe
    print("\nParsing Romeinen - 2 Korinthe (OCR)...")
    rk = parse_ocr_file(
        BASE_DIR / "calvijn-bijbelverklaring-romeinen-1-2-korinthe.txt",
        [
            ("Romeinen", ["ROMEINEN", "ROMEIN"]),
            ("1 Korinthe", ["1 KORINTHE", "1 KORINT", "I KORINTHE"]),
            ("2 Korinthe", ["2 KORINTHE", "2 KORINT", "II KORINTHE"]),
        ]
    )
    all_entries.extend(rk)
    report_books(rk)

    # Clean
    for e in all_entries:
        e["text"] = re.sub(r'\n{3,}', '\n\n', e["text"]).strip()

    # Write
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


def report_books(entries):
    books = {}
    for e in entries:
        books[e["book"]] = books.get(e["book"], 0) + 1
    for b, c in sorted(books.items()):
        print(f"  -> {b}: {c} entries")
    if not books:
        print("  -> (no entries parsed)")


if __name__ == "__main__":
    main()
