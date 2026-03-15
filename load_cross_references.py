"""
Load cross-references from OpenBible.info TSK data into Supabase.
Source: https://www.openbible.info/labs/cross-references/ (CC-BY)

Gebruik:
  pip install supabase python-dotenv
  Maak .env met: SUPABASE_URL=... en SUPABASE_KEY=<service_role key>
  Voer eerst create_cross_references_table.sql uit in Supabase SQL Editor.
  python load_cross_references.py
"""

import os
import re
import sys

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mkwqiqssuhunbhvwrsdt.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTExNjgsImV4cCI6MjA4NzA4NzE2OH0.TyP5fbpkVMiZ8IBLxBMJDF7BbUCFiunBu-mJGugJSS8")

# English abbreviation -> Supabase book_id (1-66, matches book_order)
BOOK_MAP = {
    "Gen": 1, "Exod": 2, "Lev": 3, "Num": 4, "Deut": 5,
    "Josh": 6, "Judg": 7, "Ruth": 8, "1Sam": 9, "2Sam": 10,
    "1Kgs": 11, "2Kgs": 12, "1Chr": 13, "2Chr": 14, "Ezra": 15,
    "Neh": 16, "Esth": 17, "Job": 18, "Ps": 19, "Prov": 20,
    "Eccl": 21, "Song": 22, "Isa": 23, "Jer": 24, "Lam": 25,
    "Ezek": 26, "Dan": 27, "Hos": 28, "Joel": 29, "Amos": 30,
    "Obad": 31, "Jonah": 32, "Mic": 33, "Nah": 34, "Hab": 35,
    "Zeph": 36, "Hag": 37, "Zech": 38, "Mal": 39,
    "Matt": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
    "Rom": 45, "1Cor": 46, "2Cor": 47, "Gal": 48, "Eph": 49,
    "Phil": 50, "Col": 51, "1Thess": 52, "2Thess": 53,
    "1Tim": 54, "2Tim": 55, "Titus": 56, "Phlm": 57, "Heb": 58,
    "Jas": 59, "1Pet": 60, "2Pet": 61, "1John": 62, "2John": 63,
    "3John": 64, "Jude": 65, "Rev": 66,
}


def build_verse_lookup(sb):
    """Build a lookup dict: (book_id, chapter, verse) -> verse_id"""
    print("Building verse lookup table...")
    lookup = {}
    # Fetch all verses in batches (Supabase has 1000-row default limit)
    offset = 0
    batch_size = 1000
    total = 0
    while True:
        res = sb.table("bible_verses").select("id, book_id, chapter, verse").range(offset, offset + batch_size - 1).execute()
        if not res.data:
            break
        for v in res.data:
            lookup[(v["book_id"], v["chapter"], v["verse"])] = v["id"]
        total += len(res.data)
        offset += batch_size
        if len(res.data) < batch_size:
            break
    print(f"  Loaded {total} verses into lookup")
    return lookup


def parse_ref(ref_str):
    """Parse 'Gen.1.1' -> (book_abbr, chapter, verse) or None"""
    parts = ref_str.split(".")
    if len(parts) < 3:
        return None
    book = parts[0]
    try:
        chapter = int(parts[1])
        verse = int(parts[2])
    except ValueError:
        return None
    if book not in BOOK_MAP:
        return None
    return (BOOK_MAP[book], chapter, verse)


def parse_cross_references(filename):
    """Parse the TSK cross-references file into structured rows."""
    rows = []
    skipped = 0
    with open(filename, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("From"):
                continue
            parts = line.split("\t")
            if len(parts) < 3:
                continue

            from_str, to_str, votes_str = parts[0], parts[1], parts[2]

            from_parsed = parse_ref(from_str)
            if not from_parsed:
                skipped += 1
                continue

            # to_str can be "Prov.8.22-Prov.8.30" (range) or "Gen.1.1"
            to_parts = to_str.split("-")
            to_start = parse_ref(to_parts[0])
            if not to_start:
                skipped += 1
                continue

            to_end = None
            if len(to_parts) > 1:
                to_end = parse_ref(to_parts[1])

            try:
                votes = int(votes_str)
            except ValueError:
                votes = 0

            rows.append({
                "from": from_parsed,
                "to_start": to_start,
                "to_end": to_end,
                "votes": votes,
            })

    print(f"Parsed {len(rows)} cross-references ({skipped} skipped)")
    return rows


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    lookup = build_verse_lookup(sb)
    rows = parse_cross_references("cross_references.txt")

    # Resolve verse IDs
    insert_rows = []
    unresolved = 0
    for r in rows:
        from_id = lookup.get(r["from"])
        to_start_id = lookup.get(r["to_start"])
        if not from_id or not to_start_id:
            unresolved += 1
            continue

        to_end_id = None
        if r["to_end"]:
            to_end_id = lookup.get(r["to_end"])

        insert_rows.append({
            "from_verse_id": from_id,
            "to_verse_id": to_start_id,
            "to_verse_end_id": to_end_id,
            "votes": r["votes"],
        })

    print(f"Resolved {len(insert_rows)} cross-references ({unresolved} unresolved)")

    # Insert in batches
    batch_size = 500
    total_inserted = 0
    for i in range(0, len(insert_rows), batch_size):
        batch = insert_rows[i : i + batch_size]
        try:
            sb.table("cross_references").insert(batch).execute()
            total_inserted += len(batch)
            if total_inserted % 5000 == 0 or total_inserted == len(insert_rows):
                print(f"  Inserted {total_inserted}/{len(insert_rows)}")
        except Exception as e:
            print(f"  Error at batch {i}: {e}")
            # Try individual inserts for this batch
            for row in batch:
                try:
                    sb.table("cross_references").insert(row).execute()
                    total_inserted += 1
                except Exception as e2:
                    print(f"    Skip row: {e2}")

    print(f"\nDone! Inserted {total_inserted} cross-references.")


if __name__ == "__main__":
    main()
