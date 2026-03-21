"""
Universal sermon loader for SchriftInzicht.
Loads JSON files into Supabase sermons table.

Usage: python load_sermons.py <json_file> --author-id <id> [--collection "Name"] [--year <year>] [--language <lang>]
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
    lookup = {}
    for b in books:
        lookup[b["name"]] = b["id"]
        lookup[b["abbreviation"]] = b["id"]
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


def load_sermons(json_file, author_id, collection=None, year_preached=None, language="nl"):
    """Load sermons from JSON file into Supabase."""
    verse_lookup = load_verse_lookup()
    book_lookup = load_bible_books()

    with open(json_file, encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} sermons from {json_file}")

    # Get existing sermons for deduplication on (author_id, start_verse_id, title)
    existing = set()
    last_id = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/sermons?author_id=eq.{author_id}&select=start_verse_id,title&id=gt.{last_id}&limit=1000&order=id",
            headers=HEADERS
        )
        rows = r.json()
        if not isinstance(rows, list) or len(rows) == 0:
            break
        for row in rows:
            existing.add((row["start_verse_id"], row["title"]))
        last_id = rows[-1].get("id", last_id + 1000)
        if len(rows) < 1000:
            break
    print(f"Existing sermons for author {author_id}: {len(existing)}")

    batch = []
    skipped = 0
    not_found = 0

    for entry in data:
        book_name = entry["book"]
        chapter = entry["chapter"]
        verse = entry["verse"]

        book_id = book_lookup.get(book_name)
        if book_id is None:
            not_found += 1
            continue

        key = f"{book_id}_{chapter}_{verse}"
        verse_id = verse_lookup.get(key)
        if verse_id is None:
            not_found += 1
            continue

        title = entry.get("title", f"{book_name} {chapter}:{verse}")
        text = entry["text"].strip()

        if len(text) < 50:
            skipped += 1
            continue

        # Deduplication
        if (verse_id, title) in existing:
            skipped += 1
            continue

        # End verse
        end_verse_id = None
        if entry.get("verse_end"):
            end_key = f"{book_id}_{chapter}_{entry['verse_end']}"
            end_verse_id = verse_lookup.get(end_key)

        # Source collection: entry-level overrides CLI arg
        src_collection = entry.get("source_collection", collection)
        yr = entry.get("year", year_preached)

        row = {
            "author_id": author_id,
            "title": title,
            "start_verse_id": verse_id,
            "end_verse_id": end_verse_id,
            "sermon_text": text,
            "source_collection": src_collection,
            "year_preached": yr,
            "language": language,
            "word_count": len(text.split()),
        }

        batch.append(row)
        existing.add((verse_id, title))

    print(f"To insert: {len(batch)}, skipped: {skipped}, not_found: {not_found}")

    # Insert in batches of 500
    inserted = 0
    for i in range(0, len(batch), 500):
        chunk = batch[i:i+500]
        r = requests.post(
            f"{SUPABASE_URL}/sermons",
            headers=HEADERS,
            json=chunk
        )
        if r.status_code in (200, 201):
            inserted += len(chunk)
            print(f"  Inserted {inserted}/{len(batch)}")
        else:
            print(f"  Error batch {i}: {r.status_code} {r.text[:300]}")

    print(f"Done! Inserted {inserted} sermons for author {author_id}")
    return inserted


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", help="Path to JSON file with sermons")
    parser.add_argument("--author-id", type=int, required=True)
    parser.add_argument("--collection", type=str, default=None, help="Source collection name")
    parser.add_argument("--year", type=int, default=None, help="Year preached")
    parser.add_argument("--language", default="nl", help="Language code")
    args = parser.parse_args()

    load_sermons(
        args.json_file,
        author_id=args.author_id,
        collection=args.collection,
        year_preached=args.year,
        language=args.language
    )


if __name__ == "__main__":
    main()
