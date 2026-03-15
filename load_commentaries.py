"""
Universal commentary loader for SchriftInzicht.
Loads JSON files into Supabase commentaries table.

Usage: python load_commentaries.py <json_file> --author-id <id> [--source-work "Title"] [--year <year>] [--language <lang>] [--translated]
"""
import requests, json, os, sys, argparse
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.expanduser("~"), "schriftinzicht", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mkwqiqssuhunbhvwrsdt.supabase.co") + "/rest/v1"
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
if not SERVICE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY not set. Add it to .env or set as environment variable.")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def load_verse_lookup():
    base = os.path.join(os.path.expanduser("~"), "schriftinzicht")
    with open(os.path.join(base, "verse_lookup.json")) as f:
        return json.load(f)

def load_bible_books():
    base = os.path.join(os.path.expanduser("~"), "schriftinzicht")
    with open(os.path.join(base, "bible_books.json")) as f:
        books = json.load(f)
    # Build name -> id lookup (both Dutch and English)
    lookup = {}
    for b in books:
        lookup[b["name"]] = b["id"]
        lookup[b["abbreviation"]] = b["id"]
    # Add English names
    english_map = {
        "Genesis": "Genesis", "Exodus": "Exodus", "Leviticus": "Leviticus",
        "Numbers": "Numeri", "Deuteronomy": "Deuteronomium",
        "Joshua": "Jozua", "Judges": "Richteren", "Ruth": "Ruth",
        "1 Samuel": "1 Samuel", "2 Samuel": "2 Samuel",
        "1 Kings": "1 Koningen", "2 Kings": "2 Koningen",
        "1 Chronicles": "1 Kronieken", "2 Chronicles": "2 Kronieken",
        "Ezra": "Ezra", "Nehemiah": "Nehemia", "Esther": "Esther",
        "Job": "Job", "Psalms": "Psalmen", "Proverbs": "Spreuken",
        "Ecclesiastes": "Prediker", "Song of Solomon": "Hooglied",
        "Isaiah": "Jesaja", "Jeremiah": "Jeremia",
        "Lamentations": "Klaagliederen", "Ezekiel": "Ezechiël",
        "Daniel": "Daniël", "Hosea": "Hosea", "Joel": "Joël",
        "Amos": "Amos", "Obadiah": "Obadja", "Jonah": "Jona",
        "Micah": "Micha", "Nahum": "Nahum", "Habakkuk": "Habakuk",
        "Zephaniah": "Zefanja", "Haggai": "Haggaï",
        "Zechariah": "Zacharia", "Malachi": "Maleachi",
        "Matthew": "Mattheüs", "Mark": "Markus", "Luke": "Lukas",
        "John": "Johannes", "Acts": "Handelingen",
        "Romans": "Romeinen", "1 Corinthians": "1 Korinthe",
        "2 Corinthians": "2 Korinthe", "Galatians": "Galaten",
        "Ephesians": "Efeze", "Philippians": "Filippenzen",
        "Colossians": "Kolossenzen",
        "1 Thessalonians": "1 Thessalonicenzen",
        "2 Thessalonians": "2 Thessalonicenzen",
        "1 Timothy": "1 Timotheüs", "2 Timothy": "2 Timotheüs",
        "Titus": "Titus", "Philemon": "Filemon",
        "Hebrews": "Hebreeën", "James": "Jakobus",
        "1 Peter": "1 Petrus", "2 Peter": "2 Petrus",
        "1 John": "1 Johannes", "2 John": "2 Johannes",
        "3 John": "3 Johannes", "Jude": "Judas",
        "Revelation": "Openbaring van Johannes",
    }
    for eng, dutch in english_map.items():
        if dutch in lookup:
            lookup[eng] = lookup[dutch]
    return lookup

def get_or_create_source_work(author_id, title, year=None, language="nl"):
    """Get existing source_work or create new one."""
    r = requests.get(
        f"{SUPABASE_URL}/source_works?author_id=eq.{author_id}&title=eq.{requests.utils.quote(title)}",
        headers={**HEADERS, "Prefer": "return=representation"}
    )
    data = r.json()
    if isinstance(data, list) and len(data) > 0:
        return data[0]["id"]

    # Create new
    payload = {
        "author_id": author_id,
        "title": title,
        "year_published": year,
        "language_orig": language,
        "is_public_domain": True,
    }
    r = requests.post(
        f"{SUPABASE_URL}/source_works",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=payload
    )
    result = r.json()
    if isinstance(result, list) and len(result) > 0:
        return result[0]["id"]
    print(f"Error creating source_work: {r.status_code} {r.text}")
    return None

def load_commentaries(json_file, author_id, source_work_id=None, year_written=None,
                       language="en", is_translated=True):
    """Load commentaries from JSON file into Supabase."""
    verse_lookup = load_verse_lookup()
    book_lookup = load_bible_books()

    with open(json_file, encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} entries from {json_file}")

    # Get existing commentaries for this author+language to avoid duplicates
    existing = set()
    last_id = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/commentaries?author_id=eq.{author_id}&language=eq.{language}&select=verse_id&id=gt.{last_id}&limit=1000&order=id",
            headers=HEADERS
        )
        rows = r.json()
        if not isinstance(rows, list) or len(rows) == 0:
            break
        for row in rows:
            existing.add(row["verse_id"])
        last_id = rows[-1].get("id", last_id + 1000)
        if len(rows) < 1000:
            break
    print(f"Existing commentaries for author {author_id} (lang={language}): {len(existing)}")

    # Prepare batch
    batch = []
    skipped = 0
    not_found = 0

    for entry in data:
        book_name = entry["book"]
        chapter = entry["chapter"]
        verse = entry["verse"]

        # Resolve book_id
        book_id = book_lookup.get(book_name)
        if book_id is None:
            not_found += 1
            continue

        # Resolve verse_id
        key = f"{book_id}_{chapter}_{verse}"
        verse_id = verse_lookup.get(key)
        if verse_id is None:
            not_found += 1
            continue

        # Skip duplicates
        if verse_id in existing:
            skipped += 1
            continue

        text = entry["text"].strip()
        if len(text) < 10:
            skipped += 1
            continue

        # No text length cap — app handles long texts with paragraph splitting

        # Handle verse ranges
        passage_end_id = None
        scope = "verse"
        if entry.get("verse_end"):
            end_key = f"{book_id}_{chapter}_{entry['verse_end']}"
            passage_end_id = verse_lookup.get(end_key)
            if passage_end_id:
                scope = "passage"

        # All rows must have identical keys for Supabase batch insert
        row = {
            "verse_id": verse_id,
            "author_id": author_id,
            "source_work_id": source_work_id,
            "commentary_text": text,
            "year_written": year_written,
            "language": language,
            "is_translated": is_translated,
            "scope": scope,
            "passage_end_verse_id": passage_end_id,
        }

        batch.append(row)
        existing.add(verse_id)  # Mark as seen

    print(f"To insert: {len(batch)}, skipped: {skipped}, not_found: {not_found}")

    # Insert in batches of 500
    inserted = 0
    for i in range(0, len(batch), 500):
        chunk = batch[i:i+500]
        r = requests.post(
            f"{SUPABASE_URL}/commentaries",
            headers=HEADERS,
            json=chunk
        )
        if r.status_code in (200, 201):
            inserted += len(chunk)
            print(f"  Inserted {inserted}/{len(batch)}")
        else:
            print(f"  Error batch {i}: {r.status_code} {r.text[:200]}")

    print(f"Done! Inserted {inserted} commentaries for author {author_id}")
    return inserted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to JSON file with commentaries")
    parser.add_argument("--author-id", type=int, required=True)
    parser.add_argument("--source-work", type=str, default=None, help="Source work title")
    parser.add_argument("--year", type=int, default=None, help="Year written")
    parser.add_argument("--language", default="en", help="Language code (en/nl)")
    parser.add_argument("--translated", action="store_true", help="Is translated text")
    args = parser.parse_args()

    source_work_id = None
    if args.source_work:
        source_work_id = get_or_create_source_work(
            args.author_id, args.source_work, args.year, args.language
        )
        print(f"Source work ID: {source_work_id}")

    load_commentaries(
        args.json_file,
        author_id=args.author_id,
        source_work_id=source_work_id,
        year_written=args.year,
        language=args.language,
        is_translated=args.translated
    )


if __name__ == "__main__":
    main()
