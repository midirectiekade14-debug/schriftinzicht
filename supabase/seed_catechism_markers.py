"""
Generate SQL UPDATE statements that populate catechism_proof_texts.marker
based on the classical Heidelberg Catechism edition (CGK klassieke versie).

Approach:
  1. Parse the PDF to extract footnote lines per question.
  2. Parse the footnotes into letter-groups, expanding each ref into
     individual (book, chapter, verse) triples.
  3. Fetch DB rows per question (ordered by id) — which match insertion order.
  4. Greedy-match DB rows against the parsed sequence on exact (book, ch, v).
  5. Output SQL UPDATEs (and a list of mismatches to handle manually).

Run: python supabase/seed_catechism_markers.py
"""

import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PDF_PATH = REPO / "supabase" / "data" / "hc-klassieke-versie.pdf"
SQL_OUT = REPO / "supabase" / "data" / "catechism_markers.sql"
MISMATCH_OUT = REPO / "supabase" / "data" / "catechism_markers_mismatches.txt"

BOOK_MAP = {
    "Gen.": "Genesis", "Ex.": "Exodus", "Lev.": "Leviticus", "Num.": "Numeri",
    "Deut.": "Deuteronomium", "Joz.": "Jozua", "Richt.": "Richteren", "Ruth": "Ruth",
    "1 Sam.": "1 Samuël", "2 Sam.": "2 Samuël",
    "1 Kon.": "1 Koningen", "2 Kon.": "2 Koningen",
    "1 Kron.": "1 Kronieken", "2 Kron.": "2 Kronieken",
    "Ezra": "Ezra", "Neh.": "Nehemia", "Esth.": "Esther",
    "Job": "Job", "Ps.": "Psalmen", "Spr.": "Spreuken", "Pred.": "Prediker", "Hoogl.": "Hooglied",
    "Jes.": "Jesaja", "Jesaja": "Jesaja",
    "Jer.": "Jeremia", "Klaagl.": "Klaagliederen",
    "Ezech.": "Ezechiël", "Ez.": "Ezechiël",
    "Dan.": "Daniël", "Hos.": "Hosea", "Joël": "Joël", "Amos": "Amos",
    "Obadja": "Obadja", "Jona": "Jona", "Micha": "Micha",
    "Nah.": "Nahum", "Hab.": "Habakuk", "Zef.": "Zefanja", "Hagg.": "Haggaï",
    "Zach.": "Zacharia", "Mal.": "Maleachi",
    "Matth.": "Mattheüs", "Mark.": "Marcus", "Luk.": "Lucas", "Joh.": "Johannes",
    "Hand.": "Handelingen der apostelen", "Rom.": "Romeinen",
    "1 Kor.": "1 Korinthiërs", "2 Kor.": "2 Korinthiërs",
    "Gal.": "Galaten", "Ef.": "Efeziërs",
    "Filipp.": "Filippenzen", "Fil.": "Filippenzen",
    "Kol.": "Kolossenzen",
    "1 Thess.": "1 Thessalonicenzen", "2 Thess.": "2 Thessalonicenzen",
    "1 Tim.": "1 Timotheüs", "2 Tim.": "2 Timotheüs",
    "Tit.": "Titus", "Filem.": "Filemon", "Hebr.": "Hebreeën",
    "Jak.": "Jakobus",
    "1 Petr.": "1 Petrus", "2 Petr.": "2 Petrus",
    "1 Joh.": "1 Johannes", "2 Joh.": "2 Johannes", "3 Joh.": "3 Johannes",
    "Judas": "Judas", "Openb.": "Openbaring van Johannes", "Op.": "Openbaring van Johannes",
}
# Sort by length descending so longer prefixes match first.
BOOK_KEYS = sorted(BOOK_MAP.keys(), key=len, reverse=True)


def extract_pdf_text() -> str:
    from pypdf import PdfReader
    reader = PdfReader(str(PDF_PATH))
    return "\n".join(p.extract_text() for p in reader.pages)


def find_question_footnotes(text: str) -> dict[int, str]:
    """Walk through text, finding question-number lines and the footnote line(s) that follow."""
    lines = [l.strip() for l in text.split("\n")]
    out: dict[int, str] = {}
    cur_q: int | None = None
    cur_fn: str | None = None
    for i, line in enumerate(lines):
        m = re.match(r"^(\d{1,3})\s*$", line)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 129:
                if cur_q is not None and cur_fn:
                    out[cur_q] = cur_fn
                cur_q = n
                cur_fn = None
                continue
        # Footnote start
        if re.match(r"^\(a\)\s*\(?", line) or re.match(r"^\(a\)\S", line):
            cur_fn = line
        elif cur_fn is not None and re.match(r"^\([a-z]\)", line):
            # Continuation that itself starts with another letter marker
            cur_fn += " " + line
        elif cur_fn is not None:
            # Wrapped continuation: contains book.chapter:verse pattern
            if re.search(r"[A-Z][a-zëé]{1,12}\.?\s*\d+:\d+", line):
                cur_fn += " " + line
    if cur_q is not None and cur_fn:
        out[cur_q] = cur_fn
    return out


def split_letter_groups(footnote: str) -> list[tuple[str, str]]:
    """Split footnote into [(letter, body), ...]."""
    parts = re.split(r"\(([a-z])\)", footnote)
    # parts: ['', 'a', 'Rom. 14:8. ', 'b', '1 Kor. 6:19. ', ...]
    out = []
    for i in range(1, len(parts), 2):
        letter = parts[i]
        body = (parts[i + 1] if i + 1 < len(parts) else "").strip()
        out.append((letter, body))
    return out


def expand_refs(s: str) -> list[tuple[str, int, int]]:
    """Parse 'Joh. 6:39; 10:28. 2 Thess. 3:3. 1 Petr. 1:5.' → list of (book, ch, v).

    Strategy: tokenise the string by scanning for one of three patterns at each
    position: (1) a book abbreviation followed by ch:v, (2) a semicolon-separated
    new ch:v in the current book, (3) a comma-separated additional verse in the
    current chapter. Anything else is skipped.
    """
    out: list[tuple[str, int, int]] = []
    txt = re.sub(r"\s+", " ", s).strip()
    cur_book: str | None = None
    cur_chapter: int | None = None
    pos = 0
    while pos < len(txt):
        # Try book pattern first
        matched_book = None
        for abbrev in BOOK_KEYS:
            if txt.startswith(abbrev, pos):
                tail = txt[pos + len(abbrev):]
                # Must be followed by space + digits + ":"
                m = re.match(r"\s*(\d+):(\d+)", tail)
                if m:
                    matched_book = abbrev
                    cur_book = BOOK_MAP[abbrev]
                    cur_chapter = int(m.group(1))
                    out.append((cur_book, cur_chapter, int(m.group(2))))
                    pos += len(abbrev) + len(m.group(0))
                    break
        if matched_book:
            continue
        # Same-book continuation patterns (require cur_book set)
        if cur_book is not None:
            # Semicolon → new chapter:verse
            m = re.match(r"\s*;\s*(\d+):(\d+)", txt[pos:])
            if m:
                cur_chapter = int(m.group(1))
                out.append((cur_book, cur_chapter, int(m.group(2))))
                pos += len(m.group(0))
                continue
            # Comma → additional verse same chapter (only if not followed by ":")
            m = re.match(r"\s*,\s*(\d+)(?!\s*:)", txt[pos:])
            if m and cur_chapter is not None:
                out.append((cur_book, cur_chapter, int(m.group(1))))
                pos += len(m.group(0))
                continue
        # No pattern matched: advance one char
        pos += 1
    return out


def parse_pdf() -> dict[int, list[tuple[str, list[tuple[str, int, int]]]]]:
    text = extract_pdf_text()
    footnotes = find_question_footnotes(text)
    out: dict[int, list[tuple[str, list[tuple[str, int, int]]]]] = {}
    for q, fn in footnotes.items():
        groups = split_letter_groups(fn)
        out[q] = [(letter, expand_refs(body)) for letter, body in groups]
    return out


def fetch_db_rows() -> dict[int, list[dict]]:
    """Returns {question_number: [{id, book, chapter, verse}, ...]} ordered by id."""
    # We can't connect DB from this script. Instead, expect a JSON dump injected via stdin or env.
    json_path = REPO / "supabase" / "data" / "catechism_db_rows.json"
    if not json_path.exists():
        print(f"Missing {json_path} — please dump DB rows first.")
        sys.exit(1)
    return {int(k): v for k, v in json.loads(json_path.read_text(encoding="utf-8")).items()}


def main() -> None:
    parsed = parse_pdf()
    print(f"Parsed {len(parsed)} questions from PDF.")
    db = fetch_db_rows()
    print(f"Loaded {len(db)} questions from DB.")

    sql_lines: list[str] = []
    mismatches: list[str] = []
    full_match = 0
    partial_match = 0

    for qnum in sorted(set(parsed) & set(db)):
        groups = parsed[qnum]
        rows = db[qnum]
        # Build a flat expected list with letters
        expected: list[tuple[str, str, int, int]] = []  # (letter, book, ch, v)
        for letter, refs in groups:
            for book, ch, v in refs:
                expected.append((letter, book, ch, v))
        # Match each DB row by greedy walk
        ei = 0
        for ri, r in enumerate(rows):
            db_book, db_ch, db_v = r["book"], r["chapter"], r["verse"]
            matched = -1
            for j in range(ei, len(expected)):
                _, eb, ec, ev = expected[j]
                if eb == db_book and ec == db_ch and ev == db_v:
                    matched = j
                    break
            if matched >= 0:
                letter = expected[matched][0]
                # Classical edition skips 'j' (medieval convention: j and i interchangeable).
                # DB answer texts do NOT skip j. So shift every letter > 'i' one position back:
                # classical k → DB j, classical l → DB k, classical m → DB l, ...
                if letter > "i":
                    letter = chr(ord(letter) - 1)
                sql_lines.append(
                    f"UPDATE public.catechism_proof_texts SET marker = '{letter}', sort_order = {ri} WHERE id = {r['id']};"
                )
                ei = matched + 1
                full_match += 1
            else:
                mismatches.append(
                    f"Q{qnum} row {r['id']} ({db_book} {db_ch}:{db_v}) — no match"
                )
                partial_match += 1

    SQL_OUT.write_text("\n".join(sql_lines) + "\n", encoding="utf-8")
    MISMATCH_OUT.write_text("\n".join(mismatches) + "\n", encoding="utf-8")
    print(f"Wrote {len(sql_lines)} updates -> {SQL_OUT.relative_to(REPO)}")
    print(f"Mismatches: {len(mismatches)} -> {MISMATCH_OUT.relative_to(REPO)}")
    print(f"Match rate: {full_match}/{full_match + partial_match}")


if __name__ == "__main__":
    main()
