#!/usr/bin/env python3
"""
Sync Dachsel commentaries from local JSON files to Supabase.
- Reads dachsel_studylight.json (51,516 items, exact 2x duplicates → 25,758 unique)
- Reads dachsel_extra.json (1,216 items, 1,182 unique, 1,034 not in studylight)
- Merges and deduplicates → ~26,792 unique local items
- Compares with existing Supabase data (author_id=15, source_work_id=2)
- Uploads missing records in batches of 500
"""

import json
import hashlib
import sys
import time
import os
import urllib.request
import urllib.error

# Force UTF-8 output on Windows
os.environ["PYTHONIOENCODING"] = "utf-8"
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

SUPABASE_URL = "https://mkwqiqssuhunbhvwrsdt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo"
AUTHOR_ID = 15
SOURCE_WORK_ID = 2

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

# Mapping from JSON book names to Supabase bible_books names
BOOK_NAME_MAP = {
    "Genesis": "Genesis",
    "Exodus": "Exodus",
    "Leviticus": "Leviticus",
    "Numeri": "Numeri",
    "Deuteronomium": "Deuteronomium",
    "Jozua": "Jozua",
    "Richteren": "Richteren",
    "Ruth": "Ruth",
    "1 Samuel": "1 Samu\u00ebl",
    "2 Samuel": "2 Samu\u00ebl",
    "1 Koningen": "1 Koningen",
    "2 Koningen": "2 Koningen",
    "1 Kronieken": "1 Kronieken",
    "2 Kronieken": "2 Kronieken",
    "Ezra": "Ezra",
    "Nehemia": "Nehemia",
    "Esther": "Esther",
    "Job": "Job",
    "Psalmen": "Psalmen",
    "Spreuken": "Spreuken",
    "Prediker": "Prediker",
    "Hooglied": "Hooglied",
    "Jesaja": "Jesaja",
    "Jeremia": "Jeremia",
    "Klaagliederen": "Klaagliederen",
    "Ezechi\u00ebl": "Ezechi\u00ebl",
    "Dani\u00ebl": "Dani\u00ebl",
    "Hosea": "Hosea",
    "Jo\u00ebl": "Jo\u00ebl",
    "Amos": "Amos",
    "Obadja": "Obadja",
    "Jona": "Jona",
    "Micha": "Micha",
    "Nahum": "Nahum",
    "Habakuk": "Habakuk",
    "Zefanja": "Zefanja",
    "Hagga\u00ef": "Hagga\u00ef",
    "Zacharia": "Zacharia",
    "Maleachi": "Maleachi",
    "Matthe\u00fcs": "Matthe\u00fcs",
    "Markus": "Marcus",
    "Lukas": "Lucas",
    "Johannes": "Johannes",
    "Handelingen": "Handelingen der apostelen",
    "Romeinen": "Romeinen",
    "1 Korinthe": "1 Korinthi\u00ebrs",
    "2 Korinthe": "2 Korinthi\u00ebrs",
    "Galaten": "Galaten",
    "Efeze": "Efezi\u00ebrs",
    "Filippenzen": "Filippenzen",
    "Kolossenzen": "Kolossenzen",
    "1 Thessalonicenzen": "1 Thessalonicenzen",
    "2 Thessalonicenzen": "2 Thessalonicenzen",
    "1 Timothe\u00fcs": "1 Timothe\u00fcs",
    "2 Timothe\u00fcs": "2 Timothe\u00fcs",
    "Titus": "Titus",
    "Filemon": "Filemon",
    "Hebree\u00ebn": "Hebree\u00ebn",
    "Jakobus": "Jakobus",
    "1 Petrus": "1 Petrus",
    "2 Petrus": "2 Petrus",
    "1 Johannes": "1 Johannes",
    "2 Johannes": "2 Johannes",
    "3 Johannes": "3 Johannes",
    "Judas": "Judas",
    "Openbaring van Johannes": "Openbaring van Johannes",
}


def supabase_get(path, params=""):
    """GET request to Supabase REST API. Uses Range header for proper pagination."""
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}" if params else f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def supabase_get_all(path, params="", batch_size=1000):
    """GET all records using Range header pagination (Supabase max rows = 1000)."""
    results = []
    offset = 0
    while True:
        range_end = offset + batch_size - 1
        url = f"{SUPABASE_URL}/rest/v1/{path}?{params}&order=id" if params else f"{SUPABASE_URL}/rest/v1/{path}?order=id"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Range": f"{offset}-{range_end}",
        })
        try:
            with urllib.request.urlopen(req) as resp:
                batch = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 416:  # Range not satisfiable = no more data
                break
            raise
        if not batch:
            break
        results.extend(batch)
        print(f"    ... fetched {len(results)} records", end="\r")
        offset += len(batch)
        if len(batch) < batch_size:
            break
    print(f"    ... fetched {len(results)} records")
    return results


def supabase_get_count(path, params=""):
    """GET request with exact count header."""
    url = f"{SUPABASE_URL}/rest/v1/{path}?{params}" if params else f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Prefer": "count=exact",
        "Range": "0-0",
    })
    with urllib.request.urlopen(req) as resp:
        content_range = resp.headers.get("Content-Range", "")
        # Format: "0-0/21909"
        if "/" in content_range:
            return int(content_range.split("/")[1])
        return 0


def supabase_post(path, data):
    """POST request to Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, ""
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        return e.code, error_body


def load_bible_books():
    """Load bible_books from Supabase → {name: id}"""
    books = supabase_get("bible_books", "select=id,name")
    return {b["name"]: b["id"] for b in books}


def load_bible_verses():
    """Load ALL bible_verses from Supabase -> {(book_id, chapter, verse): verse_id}"""
    print("Loading bible_verses from Supabase (this may take a moment)...")
    verses = supabase_get_all("bible_verses", "select=id,book_id,chapter,verse")
    verse_map = {}
    for v in verses:
        verse_map[(v["book_id"], v["chapter"], v["verse"])] = v["id"]
    print(f"  Total verses loaded: {len(verse_map)}")
    return verse_map


def load_existing_commentaries():
    """Load existing Dachsel commentary verse_ids from Supabase."""
    print("Loading existing Dachsel commentaries from Supabase...")
    rows = supabase_get_all("commentaries", f"select=verse_id&author_id=eq.{AUTHOR_ID}")
    existing = set(r["verse_id"] for r in rows)
    print(f"  Total existing: {len(existing)}")
    return existing


def load_local_data():
    """Load and merge+dedup both JSON files. Prefer extra over studylight for overlaps."""
    print("Loading local JSON files...")

    with open("C:/Users/midir/schriftinzicht/dachsel_studylight.json", encoding="utf-8") as f:
        studylight = json.load(f)
    print(f"  studylight: {len(studylight)} items")

    with open("C:/Users/midir/schriftinzicht/dachsel_extra.json", encoding="utf-8") as f:
        extra = json.load(f)
    print(f"  extra: {len(extra)} items")

    # Merge: dedup by (book, chapter, verse, verse_end), prefer extra
    merged = {}

    # First add studylight (will be overwritten by extra if overlap)
    for item in studylight:
        key = (item["book"], item["chapter"], item["verse"], item.get("verse_end"))
        if key not in merged:
            merged[key] = item

    # Then add extra (overwrites studylight on overlap)
    for item in extra:
        key = (item["book"], item["chapter"], item["verse"], item.get("verse_end"))
        merged[key] = item

    print(f"  Merged unique: {len(merged)}")
    return merged


def main():
    print("=== Dachsel Sync to Supabase ===\n")

    # Step 1: Load reference data
    book_name_to_id = load_bible_books()
    verse_map = load_bible_verses()
    existing_verse_ids = load_existing_commentaries()

    # Step 2: Load local data
    local_data = load_local_data()

    # Step 3: Resolve verse_ids and find missing
    to_upload = []
    skipped_existing = 0
    skipped_no_verse = 0
    skipped_no_book = 0
    errors_book = set()
    errors_verse = []

    for (book, chapter, verse, verse_end), item in local_data.items():
        # Map book name
        db_book_name = BOOK_NAME_MAP.get(book)
        if not db_book_name:
            if book not in errors_book:
                errors_book.add(book)
            skipped_no_book += 1
            continue

        book_id = book_name_to_id.get(db_book_name)
        if not book_id:
            if book not in errors_book:
                errors_book.add(book)
            skipped_no_book += 1
            continue

        # Find verse_id
        verse_id = verse_map.get((book_id, chapter, verse))
        if not verse_id:
            skipped_no_verse += 1
            if len(errors_verse) < 20:
                errors_verse.append(f"{book} {chapter}:{verse}")
            continue

        # Check if already in Supabase
        if verse_id in existing_verse_ids:
            skipped_existing += 1
            continue

        to_upload.append({
            "verse_id": verse_id,
            "author_id": AUTHOR_ID,
            "source_work_id": SOURCE_WORK_ID,
            "commentary_text": item["text"],
        })

    print(f"\n=== Sync Summary ===")
    print(f"Total local unique items: {len(local_data)}")
    print(f"Already in Supabase: {skipped_existing}")
    print(f"Skipped (no book mapping): {skipped_no_book} → {errors_book}")
    print(f"Skipped (no verse_id found): {skipped_no_verse}")
    if errors_verse:
        print(f"  Sample missing verses: {errors_verse[:10]}")
    print(f"To upload: {len(to_upload)}")

    if not to_upload:
        print("\nNothing to upload. Done!")
        return

    # Step 4: Upload in batches
    print(f"\nUploading {len(to_upload)} items in batches of 500...")
    batch_size = 500
    uploaded = 0
    errors = 0

    for i in range(0, len(to_upload), batch_size):
        batch = to_upload[i:i + batch_size]
        status, error_msg = supabase_post("commentaries", batch)

        if status in (200, 201):
            uploaded += len(batch)
            print(f"  Batch {i // batch_size + 1}: {len(batch)} items uploaded (total: {uploaded})")
        else:
            errors += len(batch)
            print(f"  Batch {i // batch_size + 1}: ERROR {status} - {error_msg[:200]}")
            # Try individual items in failed batch
            if status == 409:  # Conflict - likely duplicates
                print(f"    Retrying individually...")
                for item in batch:
                    s, e = supabase_post("commentaries", [item])
                    if s in (200, 201):
                        uploaded += 1
                    else:
                        errors += 1

        # Small delay between batches to avoid rate limiting
        if i + batch_size < len(to_upload):
            time.sleep(0.2)

    print(f"\n=== Final Results ===")
    print(f"Successfully uploaded: {uploaded}")
    print(f"Errors: {errors}")
    print(f"Already existed: {skipped_existing}")
    print(f"Total in Supabase now: ~{len(existing_verse_ids) + uploaded}")


if __name__ == "__main__":
    main()
