"""
SchriftInzicht — Upload scraped data naar Supabase
====================================================
Uploadt verrijkte preken en verhandelingen naar de sermons tabel,
met verse_id lookup en auteur-koppeling.

Gebruik:
  python upload_scraped_to_supabase.py
"""

import json
import re
import os
import hashlib
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
ENRICHED_DIR = Path(__file__).parent / "scraped" / "enriched"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Auteur mapping (bestandsnaam prefix -> author_id in Supabase)
AUTHOR_MAP = {
    "smytegelt": 7,     # Bernardus Smijtegelt
    "groe": 8,          # Theodorus van der Groe
}

# Verse lookup cache
_verse_cache: dict = {}
_book_id_cache: dict = {}


def load_book_ids():
    """Laad alle bijbelboek IDs."""
    global _book_id_cache
    resp = supabase.table("bible_books").select("id, name").execute()
    for book in resp.data:
        _book_id_cache[book["name"]] = book["id"]
        # Voeg genormaliseerde namen toe
        _book_id_cache[book["name"].lower()] = book["id"]


def get_verse_id(book_name: str, chapter: int, verse: int) -> int | None:
    """Zoek verse_id op in Supabase."""
    if not book_name or not chapter:
        return None

    cache_key = f"{book_name}:{chapter}:{verse}"
    if cache_key in _verse_cache:
        return _verse_cache[cache_key]

    # Zoek book_id
    book_id = _book_id_cache.get(book_name) or _book_id_cache.get(book_name.lower())
    if not book_id:
        # Probeer fuzzy match
        for name, bid in _book_id_cache.items():
            if name.lower().startswith(book_name.lower()[:4]):
                book_id = bid
                break

    if not book_id:
        return None

    # Zoek verse
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

    return None


def content_hash(text: str) -> str:
    """Genereer hash van tekst voor deduplicatie."""
    return hashlib.md5(text[:500].encode("utf-8")).hexdigest()


def upload_sermons(filepath: Path, author_id: int, source_prefix: str):
    """Upload preken naar Supabase sermons tabel."""
    with open(filepath, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not items:
        print(f"  [SKIP] {filepath.name}: leeg bestand")
        return 0, 0

    # Haal bestaande sermons op voor deze auteur om duplicaten te voorkomen
    existing = supabase.table("sermons").select("id, title").eq("author_id", author_id).execute()
    existing_titles = {s["title"].lower().strip() for s in existing.data}

    uploaded = 0
    skipped = 0

    batch = []
    for item in items:
        title = item.get("title", "").strip()
        text = item.get("text", "").strip()

        if not text or len(text) < 100:
            skipped += 1
            continue

        # Skip als titel al bestaat
        if title.lower().strip() in existing_titles:
            skipped += 1
            continue

        # Zoek verse_id
        verse_id = None
        if item.get("book") and item.get("chapter"):
            verse_id = get_verse_id(item["book"], item["chapter"], item.get("verse", 1))

        row = {
            "author_id": author_id,
            "title": title,
            "sermon_text": text,
            "source_collection": item.get("source_collection", source_prefix),
            "language": "nl",
            "word_count": len(text.split()),
        }

        if verse_id:
            row["start_verse_id"] = verse_id
            if item.get("verse_end"):
                end_vid = get_verse_id(item["book"], item["chapter"], item["verse_end"])
                if end_vid:
                    row["end_verse_id"] = end_vid

        batch.append(row)

        # Upload in batches van 50
        if len(batch) >= 50:
            resp = supabase.table("sermons").insert(batch).execute()
            uploaded += len(batch)
            batch = []

    # Rest uploaden
    if batch:
        resp = supabase.table("sermons").insert(batch).execute()
        uploaded += len(batch)

    return uploaded, skipped


def upload_toetssteen(filepath: Path, author_id: int, deel: int):
    """Upload Toetssteen secties als 'preken' (verhandelingen)."""
    with open(filepath, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not items:
        return 0, 0

    existing = supabase.table("sermons").select("id, title").eq("author_id", author_id).execute()
    existing_titles = {s["title"].lower().strip() for s in existing.data}

    uploaded = 0
    skipped = 0
    batch = []

    for item in items:
        title = item.get("title", "").strip()
        text = item.get("text", "").strip()

        if not text or len(text) < 100:
            skipped += 1
            continue

        if title.lower().strip() in existing_titles:
            skipped += 1
            continue

        row = {
            "author_id": author_id,
            "title": f"Toetssteen deel {deel} — {title}",
            "sermon_text": text,
            "source_collection": f"Toetssteen der ware en valse genade, deel {deel}",
            "language": "nl",
            "word_count": len(text.split()),
        }
        batch.append(row)

        if len(batch) >= 50:
            supabase.table("sermons").insert(batch).execute()
            uploaded += len(batch)
            batch = []

    if batch:
        supabase.table("sermons").insert(batch).execute()
        uploaded += len(batch)

    return uploaded, skipped


def main():
    print("[INIT] Bijbelboeken laden...")
    load_book_ids()
    print(f"[OK] {len(set(_book_id_cache.values()))} boeken geladen")

    total_uploaded = 0
    total_skipped = 0

    # Smijtegelt preken
    smytegelt_files = [
        ("smytegelt-16-predicaties.json", "Smijtegelt — 16 Uitmuntende Predicaties"),
        ("smytegelt-50-keurstoffen.json", "Smijtegelt — 50 Uitnemende Predikaties"),
        ("smytegelt-52-preken-catechismus.json", "Smijtegelt — Verklaring HC in 52 Preken"),
        ("smytegelt-deel-1.json", "Smijtegelt — Een Woord op Zijn Tijd, deel 1"),
        ("smytegelt-deel-2.json", "Smijtegelt — Een Woord op Zijn Tijd, deel 2"),
        ("smytegelt-deel-3.json", "Smijtegelt — Een Woord op Zijn Tijd, deel 3"),
        ("smytegelt-deel-4.json", "Smijtegelt — Een Woord op Zijn Tijd, deel 4"),
        ("smytegelt-zestal-leerredenen.json", "Smijtegelt — Zestal Leerredenen"),
    ]

    for filename, source in smytegelt_files:
        fp = ENRICHED_DIR / filename
        if fp.exists():
            up, sk = upload_sermons(fp, 7, source)
            print(f"[OK] {filename}: {up} geupload, {sk} overgeslagen")
            total_uploaded += up
            total_skipped += sk

    # Toetssteen
    for deel in [1, 2, 3]:
        fp = ENRICHED_DIR / f"groe-toetssteen-deel-{deel}.json"
        if fp.exists():
            up, sk = upload_toetssteen(fp, 8, deel)
            print(f"[OK] Toetssteen deel {deel}: {up} geupload, {sk} overgeslagen")
            total_uploaded += up
            total_skipped += sk

    print(f"\n[DONE] Totaal: {total_uploaded} geupload, {total_skipped} overgeslagen")


if __name__ == "__main__":
    main()
