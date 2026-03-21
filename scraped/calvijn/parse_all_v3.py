#!/usr/bin/env python3
"""
Parse Calvijn bijbelverklaring OCR texts + Genesis DOCX into JSON.
V3: Improved book/chapter detection, handles both old and modern Dutch sections.
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
    Parse OCR text into verse-level commentary entries.

    Strategy:
    - Page headers like "28 ROMEINEN 1:7" or "EFEZE 2:10. 29" track current book/chapter
    - Headers without verse like "28 ROMEINEN 1" still update book/chapter
    - Verse commentary starts with "2 Welken Hij..." or "5-8. Van deze..."
    - Book titles like "ZENDBRIEF VAN PAULUS AAN DE ROMEINEN" or
      "TWEEDE BRIEF VAN DE APOSTEL PAULUS AAN TIMOTHEÜS" switch book context
    """
    with open(txt_file, 'r', encoding='utf-8') as f:
        text = f.read()

    # Build alias lookup
    alias_to_book = {}
    for canonical, aliases in book_aliases:
        for a in aliases:
            alias_to_book[a.upper()] = canonical

    all_aliases = sorted(
        [a for _, aliases in book_aliases for a in aliases],
        key=len, reverse=True  # longest first for regex matching
    )
    all_alias_pattern = '|'.join(re.escape(a) for a in all_aliases)

    # Page header patterns (flexible: with or without verse number)
    # "28 ROMEINEN 1:7, 8." or "EFEZE 2:10. 29" or "28 ROMEINEN 1"
    page_header_cv = re.compile(
        r'^\s*\d*\s*(' + all_alias_pattern + r')[\s.,]+(\d+)\s*:\s*(\d+)',
        re.IGNORECASE
    )
    # Without verse: "28 ROMEINEN 1" or "EFEZE 2"
    page_header_c = re.compile(
        r'^\s*\d*\s*(' + all_alias_pattern + r')[\s.,]+(\d+)\b',
        re.IGNORECASE
    )
    # Reversed: "ROMEINEN 1:4, 5. 27"
    page_header_rev = re.compile(
        r'^\s*(' + all_alias_pattern + r')[\s.,]+(\d+)\s*:\s*(\d+)',
        re.IGNORECASE
    )

    # Chapter heading (standalone)
    chapter_word_map = {
        'EERSTE': 1, 'TWEEDE': 2, 'DERDE': 3, 'VIERDE': 4, 'VIJFDE': 5,
        'ZESDE': 6, 'ZEVENDE': 7, 'ACHTSTE': 8, 'NEGENDE': 9, 'TIENDE': 10,
        'ELFDE': 11, 'TWAALFDE': 12, 'DERTIENDE': 13, 'VEERTIENDE': 14,
        'VIJFTIENDE': 15, 'ZESTIENDE': 16,
    }
    chapter_re_num = re.compile(r'^(?:HET\s+)?HOOFDSTUK\s+(\d+)', re.IGNORECASE)
    chapter_re_roman = re.compile(
        r'^(?:HET\s+)?HOOFDSTUK\s+(I{1,4}V?I{0,3}|VI{0,3}|IX|XI{0,3}|XIV|XV|XVI)\b',
        re.IGNORECASE
    )
    chapter_re_word = re.compile(
        r'^(?:HET\s+)?(' + '|'.join(chapter_word_map.keys()) + r')\s+HOOFDSTUK',
        re.IGNORECASE
    )

    roman_map = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
        'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12,
        'XIII': 13, 'XIV': 14, 'XV': 15, 'XVI': 16,
    }

    # Book title patterns
    book_title_patterns = [
        re.compile(r'(?:ZENDBRIEF|BRIEF)\s+(?:VAN\s+(?:PAULUS|APOSTEL PAULUS|DE APOSTEL PAULUS)\s+)?(?:AAN\s+(?:DE\s+)?)?(' + all_alias_pattern + r')', re.IGNORECASE),
        re.compile(r'ZENDBRIEF\s+VAN\s+(' + all_alias_pattern + r')', re.IGNORECASE),
        # Generic: "BRIEF ... BOOKNAME"
        re.compile(r'BRIEF\s+.*?(' + all_alias_pattern + r')', re.IGNORECASE),
    ]

    # Special overrides for "TWEEDE" prefix
    tweede_tim_re = re.compile(r'TWEEDE\s+(?:BRIEF|ZENDBRIEF)\s+.*?TIMOTH', re.IGNORECASE)
    tweede_thess_re = re.compile(r'TWEEDE\s+(?:BRIEF|ZENDBRIEF)\s+.*?THESSALONIC', re.IGNORECASE)
    # "PASTORALE BRIEVEN" -> 1 Timotheus (it's the first pastoral letter)
    pastorale_re = re.compile(r'PASTORALE\s+BRIEVEN', re.IGNORECASE)

    # Standalone book name on its own line (like "GALATEN" or "I CORINTHIËRS")
    standalone_book_re = re.compile(
        r'^\s*(' + all_alias_pattern + r')\s*$',
        re.IGNORECASE
    )

    # Verse commentary start: digit + space + Capital letter (not a cross-ref)
    verse_start_re = re.compile(r'^(\d+)\.\s+([A-Z])')  # "5. Hier spreekt..."
    verse_start_re2 = re.compile(r'^(\d+)\s+([A-Z][a-zéèëïöüàáâ])')  # "5 Hier spreekt..."
    verse_range_re = re.compile(r'^(\d+)\s*[-–,]\s*(\d+)[.\s]+([A-Z])')

    # Cross-reference (skip these)
    crossref_re = re.compile(
        r'^\d+\s+(?:Cor|Kor|Tim|Thess|Petr|Joh|Sam|Kon|Kron|Hebr|Rom|Gal|Ef|Fil|Kol|Tit|Jak|Jud|Gen|Ex|Lev|Num|Deut|Jes|Jer|Ez|Dan|Hos|Matt|Mark|Luk|Hand|Openb)\.',
        re.IGNORECASE
    )

    # Marginal reference: "Ps 81:51" or "Lev. 19:18" or "Rom. 1:16."
    marginal_re = re.compile(
        r'^[A-Z][a-z]{0,5}[.,]?\s+\d+\s*:\s*\d+',
    )

    lines = text.split('\n')
    entries = []
    current_book = None
    current_chapter = None
    current_verse = None
    current_verse_end = None
    current_text = []
    in_preamble = True

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

    def match_book(text_fragment):
        """Try to match a book alias in text."""
        frag_upper = text_fragment.upper()
        for key, canonical in alias_to_book.items():
            if key in frag_upper:
                return canonical
        return None

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith('--- PAGE'):
            continue

        # Try standalone book name (single word on its own line)
        if len(stripped) < 40:
            sb = standalone_book_re.match(stripped)
            if sb:
                matched = sb.group(1).upper()
                new_book = None
                for key, canonical in alias_to_book.items():
                    if key == matched:
                        new_book = canonical
                        break
                if new_book:
                    save_entry()
                    current_book = new_book
                    current_chapter = None
                    current_verse = None
                    in_preamble = True
                    continue

        # Special: "TWEEDE BRIEF/ZENDBRIEF ... TIMOTHEÜS" -> 2 Timotheus
        if len(stripped) < 150:
            if tweede_tim_re.search(stripped):
                save_entry()
                current_book = "2 Timotheus"
                current_chapter = None
                current_verse = None
                in_preamble = True
                continue
            if tweede_thess_re.search(stripped):
                save_entry()
                current_book = "2 Thessalonicenzen"
                current_chapter = None
                current_verse = None
                in_preamble = True
                continue

        # Try book title detection (for section headers)
        if len(stripped) < 150:
            for bt_re in book_title_patterns:
                bt = bt_re.search(stripped)
                if bt:
                    matched = bt.group(1).upper()
                    new_book = None
                    for key, canonical in alias_to_book.items():
                        if key == matched:
                            new_book = canonical
                            break
                    if new_book and new_book != current_book:
                        save_entry()
                        current_book = new_book
                        current_chapter = None
                        current_verse = None
                        in_preamble = True
                    break

        # Page header with chapter:verse
        ph = page_header_cv.match(stripped) or page_header_rev.match(stripped)
        if ph:
            matched = ph.group(1).upper()
            for key, canonical in alias_to_book.items():
                if key == matched:
                    current_book = canonical
                    break
            current_chapter = int(ph.group(2))
            in_preamble = False
            continue

        # Page header with chapter only
        if len(stripped) < 40:
            ph2 = page_header_c.match(stripped)
            if ph2:
                matched = ph2.group(1).upper()
                for key, canonical in alias_to_book.items():
                    if key == matched:
                        current_book = canonical
                        break
                current_chapter = int(ph2.group(2))
                in_preamble = False
                continue

        # Chapter heading
        if len(stripped) < 80:
            cm = chapter_re_num.match(stripped)
            if cm:
                current_chapter = int(cm.group(1))
                in_preamble = False
                continue

            cm = chapter_re_roman.match(stripped)
            if cm:
                r = cm.group(1).upper()
                if r in roman_map:
                    current_chapter = roman_map[r]
                    in_preamble = False
                    continue

            cm = chapter_re_word.match(stripped)
            if cm:
                w = cm.group(1).upper()
                if w in chapter_word_map:
                    current_chapter = chapter_word_map[w]
                    in_preamble = False
                    continue

        # Skip if no book context
        if not current_book:
            continue

        # UITLEGGING marks start of commentary
        if stripped in ("UITLEGGING.", "UITLEGGING"):
            in_preamble = False
            continue

        if in_preamble:
            # Check for chapter heading to exit preamble
            continue

        # Skip cross-references and marginal notes
        if crossref_re.match(stripped):
            continue
        if re.match(r'^\d{1,3}$', stripped):
            continue
        if marginal_re.match(stripped) and len(stripped) < 30:
            continue

        # Verse range start: "5-8. Van deze..." or "5, 8 Van"
        vr = verse_range_re.match(stripped)
        if vr:
            v1, v2 = int(vr.group(1)), int(vr.group(2))
            if 1 <= v1 <= 176 and 1 <= v2 <= 176 and v2 >= v1:
                save_entry()
                current_verse = v1
                current_verse_end = v2
                current_text = [stripped]
                continue

        # Verse start with period: "5. Hier spreekt..."
        vs1 = verse_start_re.match(stripped)
        if vs1:
            vn = int(vs1.group(1))
            if 1 <= vn <= 176:
                save_entry()
                current_verse = vn
                current_verse_end = None
                current_text = [stripped]
                continue

        # Verse start without period: "5 Hier spreekt..."
        vs2 = verse_start_re2.match(stripped)
        if vs2 and not crossref_re.match(stripped):
            vn = int(vs2.group(1))
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
            ("Hebreeen", ["HEBREEN", "HEBREËN", "HEBREEËN", "HEBRE"]),
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
            ("Efeze", ["EFEZE", "EFEZIËRS", "EFEZIERS"]),
            ("Filippenzen", ["FILIPPENSEN", "ILIPPENSEN"]),
            ("Kolossenzen", ["COLOSSENSEN", "KOLOSSENZEN"]),
            ("1 Thessalonicenzen", ["1 THESSALONICENSEN", "EERSTE THESSALONICENSEN", "THESSALONICENSEN"]),
            ("2 Thessalonicenzen", ["2 THESSALONICENSEN", "TWEEDE THESSALONICENSEN"]),
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
            ("Romeinen", ["ROMEINEN"]),
            ("1 Korinthe", ["1 KORINTHE", "1 KORINT", "1 CORINTHE", "I CORINTHIËRS", "I KORINTHE", "1 CORINTHIËRS", "CORINTHIËRS"]),
            ("2 Korinthe", ["2 KORINTHE", "2 KORINT", "2 CORINTHE", "II CORINTHIËRS", "II KORINTHE", "2 CORINTHIËRS"]),
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
