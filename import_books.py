#!/usr/bin/env python3
"""
Import reformata.nl PDF commentaries into Supabase as scope='book' records.
- Calvijn: 44 PDFs → replace all existing (already deleted)
- Henry: 66 PDFs → add book-scope alongside existing verse-level
- Dächsel: 66 PDFs → add book-scope alongside existing verse-level
"""

import os
import sys
import subprocess
import json
import re
import requests
from pathlib import Path

SUPABASE_URL = "https://mkwqiqssuhunbhvwrsdt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

BASE_DIR = Path("C:/Users/midir/schriftinzicht/pdf_import")

# Bible book name → book_id mapping
BOOK_NAME_TO_ID = {
    "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numeri": 4, "Deuteronomium": 5,
    "Jozua": 6, "Richteren": 7, "Ruth": 8, "1 Samuël": 9, "2 Samuël": 10,
    "1 Koningen": 11, "2 Koningen": 12, "1 Kronieken": 13, "2 Kronieken": 14,
    "Ezra": 15, "Nehemia": 16, "Esther": 17, "Job": 18, "Psalmen": 19,
    "Spreuken": 20, "Prediker": 21, "Hooglied": 22, "Jesaja": 23, "Jeremia": 24,
    "Klaagliederen": 25, "Ezechiël": 26, "Daniël": 27, "Hosea": 28, "Joël": 29,
    "Amos": 30, "Obadja": 31, "Jona": 32, "Micha": 33, "Nahum": 34,
    "Habakuk": 35, "Zefanja": 36, "Haggaï": 37, "Zacharia": 38, "Maleachi": 39,
    "Mattheüs": 40, "Marcus": 41, "Lucas": 42, "Johannes": 43,
    "Handelingen": 44, "Handelingen der apostelen": 44,
    "Romeinen": 45, "1 Korinthiërs": 46, "2 Korinthiërs": 47,
    "Galaten": 48, "Efeziërs": 49, "Filippenzen": 50, "Kolossenzen": 51,
    "1 Thessalonicenzen": 52, "2 Thessalonicenzen": 53,
    "1 Timotheüs": 54, "2 Timotheüs": 55, "Titus": 56, "Filemon": 57,
    "Hebreeën": 58, "Jakobus": 59, "1 Petrus": 60, "2 Petrus": 61,
    "1 Johannes": 62, "2 Johannes": 63, "3 Johannes": 64,
    "Judas": 65, "Openbaring": 66, "Openbaring van Johannes": 66,
    # Alternate spellings from PDFs
    "Ezechiel": 26, "Ezechiel": 26, "Daniel": 27, "Joel": 29,
    "Haggai": 37, "Mattheus": 40, "Matthaüs": 40,
    "1 Samuel": 9, "2 Samuel": 10,
    "1 Korinthe": 46, "2 Korinthe": 47,
    "1 Corinthiërs": 46, "2 Corinthiërs": 47,
    "Efeze": 49, "1 Timotheus": 54, "2 Timotheus": 55,
    "Hebreeen": 58, "Colossenzen": 51,
    "1 Thessalonicensen": 52, "2 Thessalonicensen": 53,
    "Markus": 41, "Lukas": 42,
    "3 Johanes": 64, "3 Johannes": 64,
}

# First verse IDs per book (chapter 1, verse 1)
FIRST_VERSE_IDS = {
    1: 1, 2: 1534, 3: 2746, 4: 3605, 5: 4893, 6: 5852, 7: 6510, 8: 7128,
    9: 7213, 10: 8022, 11: 8717, 12: 9533, 13: 10252, 14: 11194, 15: 12016,
    16: 12296, 17: 12702, 18: 12869, 19: 13927, 20: 16388, 21: 17303,
    22: 17524, 23: 17641, 24: 18932, 25: 20296, 26: 20450, 27: 21723,
    28: 22079, 29: 22273, 30: 22346, 31: 22492, 32: 22513, 33: 22561,
    34: 22665, 35: 22712, 36: 22768, 37: 22821, 38: 22859, 39: 23070,
    40: 23125, 41: 24196, 42: 24874, 43: 26025, 44: 26904, 45: 27910,
    46: 28343, 47: 28780, 48: 29036, 49: 29185, 50: 29340, 51: 29444,
    52: 29539, 53: 29628, 54: 29675, 55: 29788, 56: 29871, 57: 29917,
    58: 29942, 59: 30245, 60: 30353, 61: 30458, 62: 30519, 63: 30624,
    64: 30637, 65: 30651, 66: 30676,
}

# Author config
AUTHORS = {
    "calvijn": {"author_id": 2, "source_work_id": 19, "year_written": 1557},
    "henry": {"author_id": 10, "source_work_id": 1, "year_written": 1706},
    "dachsel": {"author_id": 15, "source_work_id": 2, "year_written": 1865},
}

# Calvijn PDF → book mapping (some PDFs contain multiple books)
CALVIJN_MULTI_BOOK = {
    "02. Exodus, Leviticus, Numeri & Deuteronomium [Calvijn].pdf": [2, 3, 4, 5],
    "22. Evangeliën [Calvijn].pdf": [40, 41, 42],  # Synoptici: Mat, Mar, Luc
    "44. Pastorale brieven [Calvijn].pdf": [54, 55, 56],  # 1Tim, 2Tim, Titus
}


def extract_text(pdf_path: str) -> str:
    """Extract text from PDF using pdftotext."""
    # Method 1: pdftotext to file, then read
    try:
        txt_path = pdf_path.replace(".pdf", ".txt")
        subprocess.run(
            ["pdftotext", "-enc", "UTF-8", pdf_path, txt_path],
            capture_output=True, timeout=120
        )
        if os.path.exists(txt_path):
            with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
            os.remove(txt_path)
            if text.strip():
                return text
    except Exception as e:
        print(f"  pdftotext failed: {e}")

    # Fallback: PyPDF2
    try:
        import PyPDF2
        parts = []
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return "\n".join(parts)
    except Exception as e:
        print(f"  PyPDF2 also failed: {e}")
        return ""


def clean_text(text: str) -> str:
    """Clean extracted PDF text."""
    # Remove form feeds
    text = text.replace("\x0c", "\n")
    # Normalize whitespace but keep paragraph breaks
    text = re.sub(r"[ \t]+", " ", text)
    # Collapse 3+ newlines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Remove leading/trailing whitespace per line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    return text.strip()


def guess_book_id(filename: str) -> list[int]:
    """Map a PDF filename to bible book ID(s)."""
    # Check multi-book mapping first
    if filename in CALVIJN_MULTI_BOOK:
        return CALVIJN_MULTI_BOOK[filename]

    # Extract the book name from filename pattern: "NN. BookName [Author].pdf"
    m = re.match(r"\d+\.\s*(.+?)\s*\[", filename)
    if not m:
        return []

    name = m.group(1).strip()

    # Direct lookup
    if name in BOOK_NAME_TO_ID:
        return [BOOK_NAME_TO_ID[name]]

    # Try case-insensitive
    for bname, bid in BOOK_NAME_TO_ID.items():
        if bname.lower() == name.lower():
            return [bid]

    # Try partial match
    for bname, bid in BOOK_NAME_TO_ID.items():
        if name.lower() in bname.lower() or bname.lower() in name.lower():
            return [bid]

    print(f"  WARNING: Could not map '{name}' to a bible book!")
    return []


def upload_commentary(author_key: str, book_id: int, text: str) -> bool:
    """Upload a single book-scope commentary to Supabase."""
    conf = AUTHORS[author_key]
    verse_id = FIRST_VERSE_IDS.get(book_id)
    if not verse_id:
        print(f"  ERROR: No first verse for book_id {book_id}")
        return False

    # Check if a book-scope record already exists for this author+book
    check_url = (
        f"{SUPABASE_URL}/rest/v1/commentaries"
        f"?author_id=eq.{conf['author_id']}"
        f"&verse_id=eq.{verse_id}"
        f"&scope=eq.book"
        f"&select=id"
    )
    check_resp = requests.get(check_url, headers=HEADERS)
    if check_resp.ok and check_resp.json():
        existing_id = check_resp.json()[0]["id"]
        # Update existing
        update_url = f"{SUPABASE_URL}/rest/v1/commentaries?id=eq.{existing_id}"
        resp = requests.patch(update_url, headers=HEADERS, json={
            "commentary_text": text,
        })
        if resp.ok:
            print(f"  Updated existing record (id={existing_id})")
            return True
        else:
            print(f"  UPDATE FAILED: {resp.status_code} {resp.text[:200]}")
            return False

    # Insert new
    payload = {
        "verse_id": verse_id,
        "author_id": conf["author_id"],
        "source_work_id": conf["source_work_id"],
        "commentary_text": text,
        "year_written": conf["year_written"],
        "language": "nl",
        "is_translated": True if author_key != "dachsel" else False,
        "scope": "book",
    }

    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/commentaries",
        headers=HEADERS,
        json=payload,
    )
    if resp.ok:
        return True
    else:
        print(f"  INSERT FAILED: {resp.status_code} {resp.text[:200]}")
        return False


def process_author(author_key: str):
    """Process all PDFs for one author."""
    pdf_dir = BASE_DIR / author_key
    if not pdf_dir.exists():
        print(f"Directory not found: {pdf_dir}")
        return

    pdfs = sorted([f for f in os.listdir(pdf_dir) if f.endswith(".pdf")])
    print(f"\n{'='*60}")
    print(f"Processing {author_key.upper()}: {len(pdfs)} PDFs")
    print(f"{'='*60}")

    success = 0
    failed = 0

    for pdf_name in pdfs:
        pdf_path = str(pdf_dir / pdf_name)
        book_ids = guess_book_id(pdf_name)

        if not book_ids:
            print(f"\n  SKIP: {pdf_name} (no book mapping)")
            failed += 1
            continue

        print(f"\n  Processing: {pdf_name} -> book_ids={book_ids}")

        # Extract text
        text = extract_text(pdf_path)
        if not text or len(text or "") < 100:
            print(f"  SKIP: Empty or too short ({len(text)} chars)")
            failed += 1
            continue

        text = clean_text(text)
        print(f"  Extracted: {len(text):,} chars")

        if len(book_ids) == 1:
            # Single book → upload directly
            if upload_commentary(author_key, book_ids[0], text):
                success += 1
            else:
                failed += 1
        else:
            # Multi-book PDF (Calvijn) → upload full text to first book
            # The Boeklezer will show it as one continuous text
            if upload_commentary(author_key, book_ids[0], text):
                success += 1
            else:
                failed += 1

    print(f"\n  DONE: {success} uploaded, {failed} failed out of {len(pdfs)} PDFs")


def main():
    authors = sys.argv[1:] if len(sys.argv) > 1 else ["calvijn", "henry", "dachsel"]

    for author in authors:
        if author not in AUTHORS:
            print(f"Unknown author: {author}")
            continue
        process_author(author)

    print("\n\nAll done!")


if __name__ == "__main__":
    main()
