"""
SchriftInzicht — Data Loader: JSON → Supabase
===============================================
Laadt de gescrapete verklaringen in de Supabase database.

Gebruik:
  pip install supabase python-dotenv
  
  Maak een .env bestand:
    SUPABASE_URL=https://jouw-project.supabase.co
    SUPABASE_KEY=jouw-service-role-key

  python load_to_supabase.py

Volgorde:
  1. Voer eerst schriftinzicht-schema.sql uit in Supabase SQL Editor
  2. Draai scrape_kanttekeningen.py en/of scrape_matthew_henry.py
  3. Draai dit script om de data te laden
"""

import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # Gebruik service_role key, niet anon

if not SUPABASE_URL or not SUPABASE_KEY:
    print("FOUT: Stel SUPABASE_URL en SUPABASE_KEY in via .env bestand")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================
# STAP 1: Bijbelboeken laden (eenmalig)
# ============================================================

BIBLE_BOOKS = [
    # (naam, afkorting, testament, volgorde, hoofdstukken)
    ("Genesis", "Gen", "OT", 1, 50), ("Exodus", "Ex", "OT", 2, 40),
    ("Leviticus", "Lev", "OT", 3, 27), ("Numeri", "Num", "OT", 4, 36),
    ("Deuteronomium", "Deut", "OT", 5, 34), ("Jozua", "Joz", "OT", 6, 24),
    ("Richteren", "Richt", "OT", 7, 21), ("Ruth", "Ruth", "OT", 8, 4),
    ("1 Samuël", "1Sam", "OT", 9, 31), ("2 Samuël", "2Sam", "OT", 10, 24),
    ("1 Koningen", "1Kon", "OT", 11, 22), ("2 Koningen", "2Kon", "OT", 12, 25),
    ("1 Kronieken", "1Kron", "OT", 13, 29), ("2 Kronieken", "2Kron", "OT", 14, 36),
    ("Ezra", "Ezra", "OT", 15, 10), ("Nehemia", "Neh", "OT", 16, 13),
    ("Esther", "Est", "OT", 17, 10), ("Job", "Job", "OT", 18, 42),
    ("Psalmen", "Ps", "OT", 19, 150), ("Spreuken", "Spr", "OT", 20, 31),
    ("Prediker", "Pred", "OT", 21, 12), ("Hooglied", "Hoogl", "OT", 22, 8),
    ("Jesaja", "Jes", "OT", 23, 66), ("Jeremia", "Jer", "OT", 24, 52),
    ("Klaagliederen", "Klaagl", "OT", 25, 5), ("Ezechiël", "Ez", "OT", 26, 48),
    ("Daniël", "Dan", "OT", 27, 12), ("Hosea", "Hos", "OT", 28, 14),
    ("Joël", "Joël", "OT", 29, 3), ("Amos", "Am", "OT", 30, 9),
    ("Obadja", "Ob", "OT", 31, 1), ("Jona", "Jona", "OT", 32, 4),
    ("Micha", "Mi", "OT", 33, 7), ("Nahum", "Nah", "OT", 34, 3),
    ("Habakuk", "Hab", "OT", 35, 3), ("Zefanja", "Zef", "OT", 36, 3),
    ("Haggaï", "Hag", "OT", 37, 2), ("Zacharia", "Zach", "OT", 38, 14),
    ("Maleachi", "Mal", "OT", 39, 4),
    ("Mattheüs", "Matt", "NT", 40, 28), ("Markus", "Mark", "NT", 41, 16),
    ("Lukas", "Luk", "NT", 42, 24), ("Johannes", "Joh", "NT", 43, 21),
    ("Handelingen", "Hand", "NT", 44, 28), ("Romeinen", "Rom", "NT", 45, 16),
    ("1 Korinthe", "1Kor", "NT", 46, 16), ("2 Korinthe", "2Kor", "NT", 47, 13),
    ("Galaten", "Gal", "NT", 48, 6), ("Efeze", "Ef", "NT", 49, 6),
    ("Filippenzen", "Fil", "NT", 50, 4), ("Kolossenzen", "Kol", "NT", 51, 4),
    ("1 Thessalonicenzen", "1Thess", "NT", 52, 5),
    ("2 Thessalonicenzen", "2Thess", "NT", 53, 3),
    ("1 Timotheüs", "1Tim", "NT", 54, 6), ("2 Timotheüs", "2Tim", "NT", 55, 4),
    ("Titus", "Tit", "NT", 56, 3), ("Filemon", "Filem", "NT", 57, 1),
    ("Hebreeën", "Hebr", "NT", 58, 13), ("Jakobus", "Jak", "NT", 59, 5),
    ("1 Petrus", "1Petr", "NT", 60, 5), ("2 Petrus", "2Petr", "NT", 61, 3),
    ("1 Johannes", "1Joh", "NT", 62, 5), ("2 Johannes", "2Joh", "NT", 63, 1),
    ("3 Johannes", "3Joh", "NT", 64, 1), ("Judas", "Jud", "NT", 65, 1),
    ("Openbaring", "Openb", "NT", 66, 22),
]


def load_bible_books():
    """Laad de 66 bijbelboeken in de database."""
    print("Bijbelboeken laden...")

    # Check of er al boeken zijn
    existing = supabase.table("bible_books").select("id").limit(1).execute()
    if existing.data:
        print("  Bijbelboeken bestaan al, overslaan.")
        return

    books_data = [{
        "name": name,
        "abbreviation": abbrev,
        "testament": testament,
        "book_order": order,
        "chapter_count": chapters,
    } for name, abbrev, testament, order, chapters in BIBLE_BOOKS]

    # Batch insert
    for i in range(0, len(books_data), 20):
        batch = books_data[i:i+20]
        supabase.table("bible_books").insert(batch).execute()

    print(f"  {len(books_data)} boeken geladen.")


def get_book_id_map():
    """Haal een mapping op van boeknaam → id."""
    result = supabase.table("bible_books").select("id, name").execute()
    return {row["name"]: row["id"] for row in result.data}


def get_or_create_verse(book_id, chapter, verse, text_sv=""):
    """Haal een vers op of maak het aan. Retourneert verse_id."""
    # Check of het vers bestaat
    result = supabase.table("bible_verses").select("id").eq(
        "book_id", book_id
    ).eq("chapter", chapter).eq("verse", verse).limit(1).execute()

    if result.data:
        return result.data[0]["id"]

    # Maak het vers aan
    new_verse = supabase.table("bible_verses").insert({
        "book_id": book_id,
        "chapter": chapter,
        "verse": verse,
        "text_sv": text_sv,
    }).execute()

    return new_verse.data[0]["id"]


# ============================================================
# STAP 2: Kanttekeningen laden
# ============================================================

def load_kanttekeningen(json_file="kanttekeningen.json"):
    """Laad kanttekeningen uit het JSON-bestand."""
    path = Path(json_file)
    if not path.exists():
        print(f"  {json_file} niet gevonden — sla over.")
        return

    print(f"Kanttekeningen laden uit {json_file}...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    book_map = get_book_id_map()
    loaded = 0
    errors = 0

    for entry in data:
        book_name = entry["book"]
        book_id = book_map.get(book_name)

        if not book_id:
            print(f"  WAARSCHUWING: Boek '{book_name}' niet gevonden in database")
            errors += 1
            continue

        chapter = entry["chapter"]
        verse_num = entry["verse"]
        text_sv = entry.get("text_sv", "")

        # Maak/haal het vers
        verse_id = get_or_create_verse(book_id, chapter, verse_num, text_sv)

        # Laad kanttekeningen
        for i, note in enumerate(entry.get("kanttekeningen", [])):
            try:
                supabase.table("kanttekeningen").insert({
                    "verse_id": verse_id,
                    "marker": note.get("marker", ""),
                    "note_text": note["text"],
                    "note_order": i + 1,
                }).execute()
                loaded += 1
            except Exception as e:
                print(f"  FOUT bij {book_name} {chapter}:{verse_num}: {e}")
                errors += 1

    print(f"  {loaded} kanttekeningen geladen, {errors} fouten.")


# ============================================================
# STAP 3: Matthew Henry laden
# ============================================================

def load_matthew_henry(json_file="matthew_henry.json"):
    """Laad Matthew Henry verklaringen uit het JSON-bestand."""
    path = Path(json_file)
    if not path.exists():
        print(f"  {json_file} niet gevonden — sla over.")
        return

    print(f"Matthew Henry laden uit {json_file}...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    book_map = get_book_id_map()

    # Haal Matthew Henry author_id op
    author_result = supabase.table("authors").select("id").eq(
        "name", "Matthew Henry"
    ).limit(1).execute()

    if not author_result.data:
        print("  FOUT: Matthew Henry niet gevonden in authors tabel.")
        print("  Zorg dat je eerst het schema met seed data hebt geladen.")
        return

    author_id = author_result.data[0]["id"]

    # Haal/maak source_work
    source_result = supabase.table("source_works").select("id").eq(
        "author_id", author_id
    ).limit(1).execute()

    if source_result.data:
        source_id = source_result.data[0]["id"]
    else:
        new_source = supabase.table("source_works").insert({
            "author_id": author_id,
            "title": "Bijbelverklaring",
            "year_published": 1706,
            "language_orig": "en",
            "is_public_domain": True,
            "description": "Zevendelige verklaring van de gehele Bijbel",
        }).execute()
        source_id = new_source.data[0]["id"]

    loaded = 0
    errors = 0

    for chapter_data in data:
        book_name = chapter_data["book"]
        book_id = book_map.get(book_name)

        if not book_id:
            continue

        chapter = chapter_data["chapter"]

        # Als er secties zijn (per vers-groep), laad die
        sections = chapter_data.get("sections", [])

        if sections:
            for section in sections:
                verses_str = section.get("verses", "")
                text = section.get("text", "").strip()

                if not text:
                    continue

                # Parse vers-bereik (bijv. "1-5" of "12")
                verse_match = re.match(r'(\d+)(?:\s*[-–]\s*(\d+))?', verses_str)
                if verse_match:
                    start_verse = int(verse_match.group(1))
                    end_verse = int(verse_match.group(2)) if verse_match.group(2) else start_verse
                else:
                    start_verse = 1
                    end_verse = start_verse

                verse_id = get_or_create_verse(book_id, chapter, start_verse)

                scope = "passage" if end_verse > start_verse else "verse"
                end_verse_id = None
                if scope == "passage":
                    end_verse_id = get_or_create_verse(book_id, chapter, end_verse)

                try:
                    supabase.table("commentaries").insert({
                        "verse_id": verse_id,
                        "author_id": author_id,
                        "source_work_id": source_id,
                        "commentary_text": text,
                        "year_written": 1706,
                        "language": "nl",
                        "is_translated": True,
                        "scope": scope,
                        "passage_end_verse_id": end_verse_id,
                    }).execute()
                    loaded += 1
                except Exception as e:
                    print(f"  FOUT bij {book_name} {chapter}:{verses_str}: {e}")
                    errors += 1
        else:
            # Geen secties — laad als hoofdstuk-verklaring
            full_text = chapter_data.get("full_text", "").strip()
            if full_text:
                verse_id = get_or_create_verse(book_id, chapter, 1)
                try:
                    supabase.table("commentaries").insert({
                        "verse_id": verse_id,
                        "author_id": author_id,
                        "source_work_id": source_id,
                        "commentary_text": full_text,
                        "year_written": 1706,
                        "language": "nl",
                        "is_translated": True,
                        "scope": "chapter",
                    }).execute()
                    loaded += 1
                except Exception as e:
                    errors += 1

    print(f"  {loaded} verklaringen geladen, {errors} fouten.")


# ============================================================
# HOOFDPROGRAMMA
# ============================================================

def main():
    print("=" * 60)
    print("SchriftInzicht — Data Loader")
    print("=" * 60)
    print(f"Database: {SUPABASE_URL}")
    print()

    # Stap 1: Bijbelboeken
    load_bible_books()

    # Stap 2: Kanttekeningen (indien beschikbaar)
    load_kanttekeningen()

    # Stap 3: Matthew Henry (indien beschikbaar)
    load_matthew_henry()

    print(f"\n{'=' * 60}")
    print("Klaar! Controleer de data in je Supabase dashboard.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
