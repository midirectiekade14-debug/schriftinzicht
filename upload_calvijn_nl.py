#!/usr/bin/env python3
"""
Upload Calvijn NL commentaren naar Supabase.
Leest calvijn_nl_all.json (output van ocr_calvijn_nl.py + parse_calvijn_nl.py)
en uploadt naar de commentaries tabel.

Dedupliceert op basis van bestaande entries (verse_id + author_id + language='nl').
"""
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
BASE = Path("C:/Users/midir/schriftinzicht")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Calvijn = author_id 2, source_work_id 19 (Bijbelverklaring Nederlands)
AUTHOR_ID = 2
SOURCE_WORK_ID = 19

# JSON name -> DB name mapping (where they differ)
NAME_MAP = {
    "Efeze": "Efeziërs",
    "1 Korinthe": "1 Korinthiërs",
    "2 Korinthe": "2 Korinthiërs",
    "Handelingen": "Handelingen der apostelen",
    "Openbaring": "Openbaring van Johannes",
    "Lukas": "Lucas",
    "Markus": "Marcus",
}

# Book ID cache
_book_ids = {}
_verse_cache = {}


def load_book_ids():
    resp = supabase.table("bible_books").select("id, name").execute()
    for row in resp.data:
        _book_ids[row["name"]] = row["id"]
        _book_ids[row["name"].lower()] = row["id"]
    # Add aliases from NAME_MAP
    for alias, db_name in NAME_MAP.items():
        if db_name in _book_ids:
            _book_ids[alias] = _book_ids[db_name]
            _book_ids[alias.lower()] = _book_ids[db_name]


def get_or_create_verse(book_name, chapter, verse):
    """Get verse_id, create if not exists."""
    cache_key = f"{book_name}:{chapter}:{verse}"
    if cache_key in _verse_cache:
        return _verse_cache[cache_key]

    book_id = _book_ids.get(book_name) or _book_ids.get(book_name.lower())
    if not book_id:
        return None

    # Check existing
    resp = (
        supabase.table("bible_verses")
        .select("id")
        .eq("book_id", book_id)
        .eq("chapter", chapter)
        .eq("verse", verse)
        .limit(1)
        .execute()
    )

    if resp.data:
        vid = resp.data[0]["id"]
        _verse_cache[cache_key] = vid
        return vid

    # Create
    resp = supabase.table("bible_verses").insert({
        "book_id": book_id,
        "chapter": chapter,
        "verse": verse,
        "text_sv": "",
    }).execute()

    vid = resp.data[0]["id"]
    _verse_cache[cache_key] = vid
    return vid


def get_existing_nl_verse_ids():
    """Get set of verse_ids that already have NL Calvijn commentaries."""
    resp = (
        supabase.table("commentaries")
        .select("verse_id")
        .eq("author_id", AUTHOR_ID)
        .eq("language", "nl")
        .execute()
    )
    return {row["verse_id"] for row in resp.data}


def main():
    # Try calvijn_nl_all.json first (combined), fallback to calvijn_nl_parsed.json
    input_file = BASE / "calvijn_nl_all.json"
    if not input_file.exists():
        input_file = BASE / "calvijn_nl_parsed.json"
    if not input_file.exists():
        print("FOUT: Geen input bestand gevonden")
        return

    with open(input_file, 'r', encoding='utf-8') as f:
        entries = json.load(f)

    print(f"Input: {input_file.name} ({len(entries)} entries)")

    load_book_ids()
    print(f"Boeken geladen: {len(set(_book_ids.values()))}")

    existing_vids = get_existing_nl_verse_ids()
    print(f"Bestaande NL commentaren: {len(existing_vids)}")

    uploaded = 0
    skipped = 0
    errors = 0
    batch = []

    for i, entry in enumerate(entries):
        book = entry["book"]
        chapter = entry["chapter"]
        verse = entry["verse"]
        text = entry["text"].strip()

        if len(text) < 30:
            skipped += 1
            continue

        verse_id = get_or_create_verse(book, chapter, verse)
        if not verse_id:
            print(f"  [WARN] Vers niet gevonden: {book} {chapter}:{verse}")
            errors += 1
            continue

        if verse_id in existing_vids:
            skipped += 1
            continue

        batch.append({
            "verse_id": verse_id,
            "author_id": AUTHOR_ID,
            "source_work_id": SOURCE_WORK_ID,
            "commentary_text": text,
            "year_written": 1555,
            "language": "nl",
            "is_translated": False,  # Dit IS de originele NL tekst
            "scope": "verse",
        })
        existing_vids.add(verse_id)  # Prevent intra-batch duplicates

        if len(batch) >= 50:
            try:
                supabase.table("commentaries").insert(batch).execute()
                uploaded += len(batch)
                print(f"  [{uploaded}/{len(entries)}] batch geupload", flush=True)
            except Exception as e:
                print(f"  [ERR] Batch upload mislukt: {e}")
                errors += len(batch)
            batch = []

    # Remaining batch
    if batch:
        try:
            supabase.table("commentaries").insert(batch).execute()
            uploaded += len(batch)
        except Exception as e:
            print(f"  [ERR] Laatste batch mislukt: {e}")
            errors += len(batch)

    print(f"\n{'=' * 60}")
    print(f"Klaar!")
    print(f"  Geupload: {uploaded}")
    print(f"  Overgeslagen: {skipped}")
    print(f"  Fouten: {errors}")
    print(f"  Totaal NL Calvijn in DB: {len(existing_vids)}")


if __name__ == "__main__":
    main()
