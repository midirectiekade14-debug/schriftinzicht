#!/usr/bin/env python3
"""
Parse book-scope commentary PDFs into verse-level records.
For each author, extract chapter/verse segments and upload to Supabase.

Strategy per author:
- Dächsel: HOOFDSTUK N → verse lines starting with "N. "
- Henry: HOOFDSTUK N → "BookName N:V-V" verse-group headers
- Calvijn: BOOKNAME N (chapter header) → verse lines starting with "N. [A-Z]"
"""

import os
import sys
import re
import json
import subprocess
import requests
from pathlib import Path
from collections import defaultdict

SUPABASE_URL = "https://mkwqiqssuhunbhvwrsdt.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SUPABASE_KEY:
    sys.exit("ERROR: set SUPABASE_SERVICE_ROLE_KEY environment variable")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

BASE_DIR = Path("C:/Users/midir/schriftinzicht/pdf_import")

# Author config
AUTHORS = {
    "calvijn": {"author_id": 2, "source_work_id": 19, "year_written": 1557},
    "henry": {"author_id": 10, "source_work_id": 1, "year_written": 1706},
    "dachsel": {"author_id": 15, "source_work_id": 2, "year_written": 1865},
}

# Book name mappings (PDF name -> book_id, dutch name for Henry headers)
BOOK_NAME_TO_ID = {
    "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numeri": 4, "Deuteronomium": 5,
    "Jozua": 6, "Richteren": 7, "Ruth": 8, "1 Samuel": 9, "1 Samuël": 9,
    "2 Samuel": 10, "2 Samuël": 10, "1 Koningen": 11, "2 Koningen": 12,
    "1 Kronieken": 13, "2 Kronieken": 14, "Ezra": 15, "Nehemia": 16,
    "Esther": 17, "Job": 18, "Psalmen": 19, "Spreuken": 20, "Prediker": 21,
    "Hooglied": 22, "Jesaja": 23, "Jeremia": 24, "Klaagliederen": 25,
    "Ezechiël": 26, "Ezechiel": 26, "Daniël": 27, "Daniel": 27,
    "Hosea": 28, "Joël": 29, "Joel": 29, "Amos": 30, "Obadja": 31,
    "Jona": 32, "Micha": 33, "Nahum": 34, "Habakuk": 35, "Zefanja": 36,
    "Haggaï": 37, "Haggai": 37, "Zacharia": 38, "Maleachi": 39,
    "Mattheüs": 40, "Mattheus": 40, "Marcus": 41, "Markus": 41,
    "Lucas": 42, "Lukas": 42, "Johannes": 43,
    "Handelingen": 44, "Handelingen der apostelen": 44,
    "Romeinen": 45, "1 Korinthiërs": 46, "1 Korinthe": 46, "1 Corinthiërs": 46,
    "2 Korinthiërs": 47, "2 Korinthe": 47, "2 Corinthiërs": 47,
    "Galaten": 48, "Efeziërs": 49, "Efeze": 49,
    "Filippenzen": 50, "Kolossenzen": 51, "Colossenzen": 51,
    "1 Thessalonicenzen": 52, "2 Thessalonicenzen": 53,
    "1 Timotheüs": 54, "1 Timotheus": 54,
    "2 Timotheüs": 55, "2 Timotheus": 55,
    "Titus": 56, "Filemon": 57,
    "Hebreeën": 58, "Hebreeen": 58, "Jakobus": 59,
    "1 Petrus": 60, "2 Petrus": 61,
    "1 Johannes": 62, "2 Johannes": 63, "3 Johannes": 64, "3 Johanes": 64,
    "Judas": 65, "Openbaring": 66, "Openbaring van Johannes": 66,
}

# Load verse lookup: (book_id, chapter, verse) -> verse_id
VERSE_LOOKUP = {}
VERSE_LOOKUP_LOADED = False


def load_verse_lookup():
    """Load all bible verses into a lookup dict."""
    global VERSE_LOOKUP, VERSE_LOOKUP_LOADED
    if VERSE_LOOKUP_LOADED:
        return

    print("Loading verse lookup from Supabase...")
    base_headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    # Paginate per book to stay under 1000-row limit
    for book_id in range(1, 67):
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/bible_verses?select=id,book_id,chapter,verse&book_id=eq.{book_id}&order=id&limit=1000",
            headers=base_headers,
        )
        data = resp.json()
        for row in data:
            VERSE_LOOKUP[(row["book_id"], row["chapter"], row["verse"])] = row["id"]
        # Some large books have >1000 verses (Psalms=2461, Genesis=1533)
        if len(data) == 1000:
            last_id = data[-1]["id"]
            resp2 = requests.get(
                f"{SUPABASE_URL}/rest/v1/bible_verses?select=id,book_id,chapter,verse&book_id=eq.{book_id}&id=gt.{last_id}&order=id&limit=1000",
                headers=base_headers,
            )
            data2 = resp2.json()
            for row in data2:
                VERSE_LOOKUP[(row["book_id"], row["chapter"], row["verse"])] = row["id"]
            if len(data2) == 1000:
                last_id2 = data2[-1]["id"]
                resp3 = requests.get(
                    f"{SUPABASE_URL}/rest/v1/bible_verses?select=id,book_id,chapter,verse&book_id=eq.{book_id}&id=gt.{last_id2}&order=id&limit=1000",
                    headers=base_headers,
                )
                for row in resp3.json():
                    VERSE_LOOKUP[(row["book_id"], row["chapter"], row["verse"])] = row["id"]

    print(f"  Loaded {len(VERSE_LOOKUP)} verses")
    VERSE_LOOKUP_LOADED = True


def get_verse_id(book_id: int, chapter: int, verse: int) -> int | None:
    """Get verse_id for a specific book/chapter/verse."""
    return VERSE_LOOKUP.get((book_id, chapter, verse))


def extract_text(pdf_path: str) -> str:
    """Extract text from PDF."""
    txt_path = pdf_path.replace(".pdf", "_parsed.txt")
    try:
        subprocess.run(
            ["pdftotext", "-enc", "UTF-8", pdf_path, txt_path],
            capture_output=True, timeout=120
        )
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
            os.remove(txt_path)
            return text
    except Exception as e:
        print(f"  pdftotext failed: {e}")
    return ""


def guess_book_id(filename: str) -> int | None:
    """Get book_id from filename."""
    m = re.match(r"\d+\.\s*(.+?)\s*\[", filename)
    if not m:
        return None
    name = m.group(1).strip()
    if name in BOOK_NAME_TO_ID:
        return BOOK_NAME_TO_ID[name]
    for bname, bid in BOOK_NAME_TO_ID.items():
        if bname.lower() == name.lower():
            return bid
    for bname, bid in BOOK_NAME_TO_ID.items():
        if name.lower() in bname.lower() or bname.lower() in name.lower():
            return bid
    return None


def get_book_name_for_id(book_id: int) -> str:
    """Get a display name for a book_id."""
    for name, bid in BOOK_NAME_TO_ID.items():
        if bid == book_id and len(name) > 3:
            return name
    return str(book_id)


# ============================================================
# DÄCHSEL PARSER
# ============================================================
def parse_dachsel(text: str, book_id: int) -> list[dict]:
    """Parse Dächsel text into verse-level segments."""
    lines = text.split("\n")
    segments = []
    current_chapter = 0
    current_verse = 0
    current_text = []

    def flush():
        nonlocal current_text
        if current_chapter > 0 and current_verse > 0 and current_text:
            content = "\n".join(current_text).strip()
            if len(content) > 20:
                segments.append({
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "text": content,
                })
        current_text = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_text:
                current_text.append("")
            continue

        # Skip page markers / form feeds
        if stripped.startswith("\x0c"):
            stripped = stripped.lstrip("\x0c").strip()
            if not stripped:
                continue

        # Chapter header: HOOFDSTUK N.
        ch_match = re.match(r"^HOOFDSTUK\s+(\d+)\.?\s*$", stripped)
        if ch_match:
            flush()
            current_chapter = int(ch_match.group(1))
            current_verse = 0
            continue

        # Verse line: "N. Text..."
        verse_match = re.match(r"^(\d+)\.\s+(.+)", stripped)
        if verse_match and current_chapter > 0:
            proposed_verse = int(verse_match.group(1))
            # Sanity: verse number should be reasonable (1-200) and near previous
            if 1 <= proposed_verse <= 200:
                # Check if this is really a new verse or just a numbered point
                if proposed_verse >= current_verse or proposed_verse == 1:
                    flush()
                    current_verse = proposed_verse
                    current_text.append(verse_match.group(2))
                    continue

        # Continuation of current verse
        if current_verse > 0:
            current_text.append(stripped)

    flush()
    return segments


# ============================================================
# HENRY PARSER
# ============================================================
def parse_henry(text: str, book_id: int) -> list[dict]:
    """Parse Henry text into verse-group segments."""
    book_name = get_book_name_for_id(book_id)
    lines = text.split("\n")
    segments = []
    current_chapter = 0
    current_start_verse = 0
    current_end_verse = 0
    current_text = []

    # Build regex for this specific book
    # Henry uses "Genesis 1:1-2" style headers
    # Try multiple name variants
    name_variants = set()
    for name, bid in BOOK_NAME_TO_ID.items():
        if bid == book_id:
            name_variants.add(name)
    name_variants.add(book_name)

    # Escape for regex
    name_pattern = "|".join(re.escape(n) for n in name_variants)
    verse_ref_re = re.compile(
        rf"^(?:{name_pattern})\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?(?:\s|$)",
        re.IGNORECASE
    )
    chapter_re = re.compile(r"^HOOFDSTUK\s+(\d+)\.?\s*$")

    def flush():
        nonlocal current_text
        if current_chapter > 0 and current_start_verse > 0 and current_text:
            content = "\n".join(current_text).strip()
            if len(content) > 20:
                segments.append({
                    "chapter": current_chapter,
                    "verse": current_start_verse,
                    "end_verse": current_end_verse if current_end_verse > current_start_verse else None,
                    "text": content,
                })
        current_text = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_text:
                current_text.append("")
            continue

        # Strip form feeds
        stripped = stripped.lstrip("\x0c").strip()
        if not stripped:
            continue

        # Chapter header
        ch_match = chapter_re.match(stripped)
        if ch_match:
            flush()
            current_chapter = int(ch_match.group(1))
            current_start_verse = 0
            current_end_verse = 0
            continue

        # Verse reference header
        ref_match = verse_ref_re.match(stripped)
        if ref_match:
            flush()
            current_chapter = int(ref_match.group(1))
            current_start_verse = int(ref_match.group(2))
            current_end_verse = int(ref_match.group(3)) if ref_match.group(3) else current_start_verse
            # Include the line text after the reference
            rest = verse_ref_re.sub("", stripped).strip()
            if rest:
                current_text.append(rest)
            continue

        # Continuation
        if current_start_verse > 0:
            current_text.append(stripped)

    flush()
    return segments


# ============================================================
# CALVIJN PARSER
# ============================================================
def parse_calvijn(text: str, book_id: int) -> list[dict]:
    """Parse Calvijn text into verse-level segments."""
    book_name = get_book_name_for_id(book_id).upper()
    lines = text.split("\n")
    segments = []
    current_chapter = 0
    current_verse = 0
    current_text = []
    in_bible_text_block = False

    # Calvijn chapter headers: "GENESIS 1" or "PSALM 1" etc
    # Use uppercase book name
    name_variants = set()
    for name, bid in BOOK_NAME_TO_ID.items():
        if bid == book_id:
            name_variants.add(name.upper())
    name_variants.add(book_name)

    name_pattern = "|".join(re.escape(n) for n in name_variants)
    chapter_re = re.compile(rf"^(?:{name_pattern})\s+(\d+)\s*$")
    # Bible text inline block: "GENESIS 1 1. In den beginne..."
    bible_block_re = re.compile(rf"^(?:{name_pattern})\s+\d+\s+\d+\.\s+")

    # Also match bible text blocks as chapter indicators
    bible_block_ch_re = re.compile(rf"^(?:{name_pattern})\s+(\d+)\s+\d+\.\s+")

    def flush():
        nonlocal current_text
        if current_chapter > 0 and current_verse > 0 and current_text:
            content = "\n".join(current_text).strip()
            if len(content) > 20:
                segments.append({
                    "chapter": current_chapter,
                    "verse": current_verse,
                    "text": content,
                })
        current_text = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            if current_text:
                current_text.append("")
            continue

        stripped = stripped.lstrip("\x0c").strip()
        if not stripped:
            continue

        # Skip page numbers
        if re.match(r"^Pagina \d+ van \d+$", stripped):
            continue

        # Bible text blocks also indicate new chapter: "GENESIS 2 1. Alzoo..."
        bb_match = bible_block_ch_re.match(stripped)
        if bb_match:
            flush()
            current_chapter = int(bb_match.group(1))
            current_verse = 0
            in_bible_text_block = True
            continue

        # Standalone chapter header: "GENESIS 2"
        ch_match = chapter_re.match(stripped)
        if ch_match:
            flush()
            current_chapter = int(ch_match.group(1))
            current_verse = 0
            in_bible_text_block = False
            continue

        # Skip HOOFDSTUK lines (some Calvijn books use this)
        if re.match(r"^HOOFDSTUK\s+\d+", stripped):
            hm = re.match(r"^HOOFDSTUK\s+(\d+)", stripped)
            if hm:
                flush()
                current_chapter = int(hm.group(1))
                current_verse = 0
            continue

        # End of bible text block detection (when we hit a verse commentary)
        if in_bible_text_block:
            verse_match = re.match(r"^(\d+)\.\s+([A-Z])", stripped)
            if verse_match:
                in_bible_text_block = False
            else:
                continue

        # Verse commentary: "N. Text..." where Text starts with uppercase
        verse_match = re.match(r"^(\d+)\.\s+(.+)", stripped)
        if verse_match and current_chapter > 0:
            proposed_verse = int(verse_match.group(1))
            if 1 <= proposed_verse <= 200:
                # Heuristic: verse should progress or restart at 1
                if proposed_verse > current_verse or proposed_verse == 1 or current_verse == 0:
                    flush()
                    current_verse = proposed_verse
                    current_text.append(verse_match.group(2))
                    continue

        # Continuation
        if current_verse > 0:
            current_text.append(stripped)

    flush()
    return segments


# ============================================================
# UPLOAD
# ============================================================
def upload_batch(records: list[dict], batch_size: int = 200) -> int:
    """Upload records in batches. Returns count of successfully uploaded."""
    uploaded = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/commentaries",
            headers={**HEADERS, "Prefer": "return=minimal,resolution=merge-duplicates"},
            json=batch,
        )
        if resp.ok:
            uploaded += len(batch)
        else:
            # Try one by one for failed batch
            for rec in batch:
                resp2 = requests.post(
                    f"{SUPABASE_URL}/rest/v1/commentaries",
                    headers=HEADERS,
                    json=rec,
                )
                if resp2.ok:
                    uploaded += 1
                else:
                    pass  # Skip individual failures silently
    return uploaded


def process_author(author_key: str):
    """Process all PDFs for one author."""
    load_verse_lookup()

    conf = AUTHORS[author_key]
    pdf_dir = BASE_DIR / author_key
    if not pdf_dir.exists():
        print(f"Directory not found: {pdf_dir}")
        return

    # Choose parser
    if author_key == "dachsel":
        parser = parse_dachsel
    elif author_key == "henry":
        parser = parse_henry
    else:
        parser = parse_calvijn

    pdfs = sorted([f for f in os.listdir(pdf_dir) if f.endswith(".pdf")])
    print(f"\n{'='*60}")
    print(f"Parsing {author_key.upper()}: {len(pdfs)} PDFs")
    print(f"{'='*60}")

    total_uploaded = 0
    total_segments = 0
    total_skipped = 0

    # Multi-book PDFs (Calvijn)
    MULTI_BOOK = {
        "02. Exodus, Leviticus, Numeri & Deuteronomium [Calvijn].pdf": [2, 3, 4, 5],
        "22. Evangeliën [Calvijn].pdf": [40, 41, 42],
        "44. Pastorale brieven [Calvijn].pdf": [54, 55, 56],
    }

    for pdf_name in pdfs:
        # Skip non-PDF files
        if not pdf_name.endswith(".pdf"):
            continue

        pdf_path = str(pdf_dir / pdf_name)

        # Determine book_id(s)
        if pdf_name in MULTI_BOOK:
            book_ids = MULTI_BOOK[pdf_name]
        else:
            bid = guess_book_id(pdf_name)
            if bid is None:
                print(f"  SKIP: {pdf_name} (no book mapping)")
                continue
            book_ids = [bid]

        print(f"\n  {pdf_name} -> books={book_ids}")

        # Extract text
        text = extract_text(pdf_path)
        if not text or len(text) < 100:
            print(f"    Empty text, skipping")
            continue

        # For multi-book PDFs, parse with first book_id
        # (the parser will find chapters for all books within)
        primary_book_id = book_ids[0]
        segments = parser(text, primary_book_id)
        print(f"    Parsed: {len(segments)} segments")

        if not segments:
            continue

        # Build upload records
        records = []
        skipped = 0
        for seg in segments:
            ch = seg["chapter"]
            v = seg["verse"]

            # For multi-book PDFs, we need to figure out which book this chapter belongs to
            # by trying each book_id
            verse_id = None
            for bid in book_ids:
                verse_id = get_verse_id(bid, ch, v)
                if verse_id:
                    break

            if not verse_id:
                skipped += 1
                continue

            record = {
                "verse_id": verse_id,
                "author_id": conf["author_id"],
                "source_work_id": conf["source_work_id"],
                "commentary_text": seg["text"],
                "year_written": conf["year_written"],
                "language": "nl",
                "is_translated": author_key != "dachsel",
                "scope": "passage" if seg.get("end_verse") else "verse",
            }

            # For Henry passages, set end verse
            if seg.get("end_verse"):
                end_vid = None
                for bid in book_ids:
                    end_vid = get_verse_id(bid, ch, seg["end_verse"])
                    if end_vid:
                        break
                if end_vid:
                    record["passage_end_verse_id"] = end_vid

            records.append(record)

        print(f"    Records: {len(records)} (skipped {skipped} unmapped)")

        if records:
            uploaded = upload_batch(records)
            print(f"    Uploaded: {uploaded}")
            total_uploaded += uploaded

        total_segments += len(segments)
        total_skipped += skipped

    print(f"\n{'='*60}")
    print(f"  TOTAL: {total_segments} segments, {total_uploaded} uploaded, {total_skipped} skipped")
    print(f"{'='*60}")


def main():
    authors = sys.argv[1:] if len(sys.argv) > 1 else ["dachsel", "henry", "calvijn"]
    for author in authors:
        if author not in AUTHORS:
            print(f"Unknown author: {author}")
            continue
        process_author(author)
    print("\nAll done!")


if __name__ == "__main__":
    main()
