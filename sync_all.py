"""
SchriftInzicht — Master Sync Script
=====================================
Laadt ALLE JSON-bestanden naar Supabase (commentaries + sermons).
Bestaande records worden overgeslagen (deduplicatie ingebouwd).

Gebruik:
  python sync_all.py [--dry-run] [--only-commentaries] [--only-sermons]
"""

import requests, json, os, sys, argparse
from pathlib import Path
from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://mkwqiqssuhunbhvwrsdt.supabase.co") + "/rest/v1"
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SERVICE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY not set.")
    sys.exit(1)

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# ============================================================
# Helpers
# ============================================================

def load_json(path):
    with open(BASE / path, encoding="utf-8") as f:
        return json.load(f)

def load_verse_lookup():
    return load_json("verse_lookup.json")

def load_bible_books():
    books = load_json("bible_books.json")
    lookup = {}
    for b in books:
        lookup[b["name"]] = b["id"]
        lookup[b["abbreviation"]] = b["id"]
    # English names
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
    # Fix common encoding issues in data
    fix_map = {
        "MattheÃ¼s": lookup.get("Mattheüs"),
        "EzechiÃ«l": lookup.get("Ezechiël"),
        "DaniÃ«l": lookup.get("Daniël"),
        "JoÃ«l": lookup.get("Joël"),
        "HaggaÃ¯": lookup.get("Haggaï"),
        "Openbaring van Johannes": lookup.get("Openbaring van Johannes") or lookup.get("Openb"),
    }
    for bad, good in fix_map.items():
        if good:
            lookup[bad] = good
    return lookup

def get_or_create_author(name, century=None, nationality=None):
    r = requests.get(
        f"{SUPABASE_URL}/authors?name=eq.{requests.utils.quote(name)}&select=id",
        headers=HEADERS
    )
    data = r.json()
    if isinstance(data, list) and data:
        return data[0]["id"]
    payload = {"name": name}
    if century:
        payload["century"] = century
    if nationality:
        payload["nationality"] = nationality
    r = requests.post(
        f"{SUPABASE_URL}/authors",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=payload
    )
    result = r.json()
    if isinstance(result, list) and result:
        print(f"  Auteur aangemaakt: {name} (ID {result[0]['id']})")
        return result[0]["id"]
    print(f"  FOUT bij aanmaken auteur {name}: {r.status_code} {r.text[:200]}")
    return None

def get_or_create_source_work(author_id, title, year=None, language="nl"):
    r = requests.get(
        f"{SUPABASE_URL}/source_works?author_id=eq.{author_id}&title=eq.{requests.utils.quote(title)}&select=id",
        headers=HEADERS
    )
    data = r.json()
    if isinstance(data, list) and data:
        return data[0]["id"]
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
    if isinstance(result, list) and result:
        return result[0]["id"]
    print(f"  FOUT bij aanmaken source_work: {r.status_code} {r.text[:200]}")
    return None

# ============================================================
# Commentary Loader
# ============================================================

def load_commentaries(json_file, author_id, language="nl", is_translated=True,
                      year_written=None, source_work_id=None, dry_run=False):
    verse_lookup = load_verse_lookup()
    book_lookup = load_bible_books()

    path = BASE / json_file
    if not path.exists():
        print(f"  SKIP: {json_file} niet gevonden")
        return 0

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        print(f"  SKIP: {json_file} leeg")
        return 0

    print(f"\n[COMMENTARY] {json_file} ({len(data)} records, auteur {author_id})")

    # Get existing verse_ids for this author to avoid duplicates
    existing = set()
    last_id = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/commentaries?author_id=eq.{author_id}&language=eq.{language}"
            f"&select=verse_id&id=gt.{last_id}&limit=1000&order=id",
            headers=HEADERS
        )
        rows = r.json()
        if not isinstance(rows, list) or not rows:
            break
        for row in rows:
            existing.add(row["verse_id"])
        last_id = rows[-1].get("id", last_id + 1000)
        if len(rows) < 1000:
            break

    batch = []
    skipped = 0
    not_found = 0

    for entry in data:
        book_name = entry.get("book", "")
        chapter = entry.get("chapter")
        verse = entry.get("verse")

        book_id = book_lookup.get(book_name)
        if book_id is None:
            not_found += 1
            continue

        key = f"{book_id}_{chapter}_{verse}"
        verse_id = verse_lookup.get(key)
        if verse_id is None:
            not_found += 1
            continue

        if verse_id in existing:
            skipped += 1
            continue

        text = str(entry.get("text", "")).strip()
        if len(text) < 10:
            skipped += 1
            continue

        # No text length cap — app handles long texts with paragraph splitting

        passage_end_id = None
        scope = "verse"
        if entry.get("verse_end"):
            end_key = f"{book_id}_{chapter}_{entry['verse_end']}"
            passage_end_id = verse_lookup.get(end_key)
            if passage_end_id:
                scope = "passage"

        batch.append({
            "verse_id": verse_id,
            "author_id": author_id,
            "source_work_id": source_work_id,
            "commentary_text": text,
            "year_written": year_written,
            "language": language,
            "is_translated": is_translated,
            "scope": scope,
            "passage_end_verse_id": passage_end_id,
        })
        existing.add(verse_id)

    print(f"  Te laden: {len(batch)}, overgeslagen: {skipped}, niet gevonden: {not_found}")

    if dry_run or not batch:
        return len(batch)

    inserted = 0
    for i in range(0, len(batch), 500):
        chunk = batch[i:i+500]
        r = requests.post(f"{SUPABASE_URL}/commentaries", headers=HEADERS, json=chunk)
        if r.status_code in (200, 201):
            inserted += len(chunk)
        else:
            print(f"  Fout batch {i}: {r.status_code} {r.text[:200]}")

    print(f"  Ingevoegd: {inserted}")
    return inserted

# ============================================================
# Sermon Loader
# ============================================================

def load_sermons(json_file, author_id, collection=None, year_preached=None,
                 language="nl", dry_run=False):
    verse_lookup = load_verse_lookup()
    book_lookup = load_bible_books()

    path = BASE / json_file
    if not path.exists():
        print(f"  SKIP: {json_file} niet gevonden")
        return 0

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not data:
        print(f"  SKIP: {json_file} leeg")
        return 0

    print(f"\n[SERMON] {json_file} ({len(data)} records, auteur {author_id})")

    # Dedup on (author_id, start_verse_id, title)
    existing = set()
    last_id = 0
    while True:
        r = requests.get(
            f"{SUPABASE_URL}/sermons?author_id=eq.{author_id}"
            f"&select=start_verse_id,title&id=gt.{last_id}&limit=1000&order=id",
            headers=HEADERS
        )
        rows = r.json()
        if not isinstance(rows, list) or not rows:
            break
        for row in rows:
            existing.add((row["start_verse_id"], row["title"]))
        last_id = rows[-1].get("id", last_id + 1000)
        if len(rows) < 1000:
            break

    batch = []
    skipped = 0
    not_found = 0

    for entry in data:
        book_name = entry.get("book", "")
        chapter = entry.get("chapter")
        verse = entry.get("verse")

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
        text = str(entry.get("text", "")).strip()

        if len(text) < 50:
            skipped += 1
            continue

        if (verse_id, title) in existing:
            skipped += 1
            continue

        end_verse_id = None
        if entry.get("verse_end"):
            end_key = f"{book_id}_{chapter}_{entry['verse_end']}"
            end_verse_id = verse_lookup.get(end_key)

        src_collection = entry.get("source_collection", collection)
        yr = entry.get("year", year_preached)

        batch.append({
            "author_id": author_id,
            "title": title,
            "start_verse_id": verse_id,
            "end_verse_id": end_verse_id,
            "sermon_text": text,
            "source_collection": src_collection,
            "year_preached": yr,
            "language": language,
            "word_count": len(text.split()),
        })
        existing.add((verse_id, title))

    print(f"  Te laden: {len(batch)}, overgeslagen: {skipped}, niet gevonden: {not_found}")

    if dry_run or not batch:
        return len(batch)

    inserted = 0
    for i in range(0, len(batch), 500):
        chunk = batch[i:i+500]
        r = requests.post(f"{SUPABASE_URL}/sermons", headers=HEADERS, json=chunk)
        if r.status_code in (200, 201):
            inserted += len(chunk)
        else:
            print(f"  Fout batch {i}: {r.status_code} {r.text[:300]}")

    print(f"  Ingevoegd: {inserted}")
    return inserted


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Toon wat geladen zou worden, maar voer niets uit")
    parser.add_argument("--only-commentaries", action="store_true")
    parser.add_argument("--only-sermons", action="store_true")
    args = parser.parse_args()

    dry = args.dry_run
    do_comm = not args.only_sermons
    do_serm = not args.only_commentaries

    print("=" * 60)
    print("SchriftInzicht — Master Sync")
    print(f"Mode: {'DRY RUN' if dry else 'LIVE'}")
    print("=" * 60)

    # ---- Zorg voor ontbrekende auteurs ----
    print("\n[AUTEURS]")
    beza_id = get_or_create_author("Theodorus Beza", century=16, nationality="Zwitsers")
    apostolisch_id = get_or_create_author("Apostolische Vaders", century=1)
    athanasius_id = get_or_create_author("Athanasius van Alexandrië", century=4, nationality="Egyptisch")

    # Bestaande IDs
    A = {
        "luther": 1, "calvijn": 2, "brakel": 4, "voetius": 5,
        "comrie": 6, "smijtegelt": 7, "vandergroe": 8, "hellenbroek": 9,
        "henry": 10, "bunyan": 11, "boston": 12, "spurgeon": 13,
        "kohlbrugge": 14, "dachsel": 15, "dacosta": 16,
        "augustinus": 17, "ambrosius": 18,
        "beza": beza_id,
        "apostolisch": apostolisch_id,
        "athanasius": athanasius_id,
    }

    total_new = 0

    # ============================================================
    # COMMENTARIES
    # ============================================================
    if do_comm:
        print("\n" + "=" * 60)
        print("COMMENTARIES")
        print("=" * 60)

        commentary_files = [
            # (bestand, author_key, taal, vertaald, jaar)
            ("calvijn.json",              "calvijn",    "nl", True,  1560),
            ("calvijn_extra.json",        "calvijn",    "nl", True,  1560),
            ("calvijn_extra2.json",       "calvijn",    "nl", True,  1560),
            ("calvijn_new.json",          "calvijn",    "nl", True,  1560),
            ("calvijn_nl_parsed.json",    "calvijn",    "nl", True,  1560),
            ("calvijn_preken.json",       "calvijn",    "nl", True,  1560),
            ("calvijn_psalmen.json",      "calvijn",    "nl", True,  1560),
            ("calvijn_remaining.json",    "calvijn",    "nl", True,  1560),
            ("brakel.json",               "brakel",     "nl", False, 1700),
            ("brakel_extra.json",         "brakel",     "nl", False, 1700),
            ("brakel_extra2.json",        "brakel",     "nl", False, 1700),
            ("brakel_remaining.json",     "brakel",     "nl", False, 1700),
            ("voetius.json",              "voetius",    "nl", False, 1650),
            ("voetius_extra2.json",       "voetius",    "nl", False, 1650),
            ("comrie.json",               "comrie",     "nl", False, 1750),
            ("comrie_extra.json",         "comrie",     "nl", False, 1750),
            ("comrie_extra2.json",        "comrie",     "nl", False, 1750),
            ("smijtegelt.json",           "smijtegelt", "nl", False, 1720),
            ("smijtegelt_new.json",       "smijtegelt", "nl", False, 1720),
            ("vandergroe.json",           "vandergroe", "nl", False, 1750),
            ("vandergroe_extra.json",     "vandergroe", "nl", False, 1750),
            ("vandergroe_new.json",       "vandergroe", "nl", False, 1750),
            ("hellenbroek.json",          "hellenbroek","nl", False, 1710),
            ("hellenbroek_extra.json",    "hellenbroek","nl", False, 1710),
            ("hellenbroek_extra2.json",   "hellenbroek","nl", False, 1710),
            ("bunyan.json",               "bunyan",     "en", False, 1680),
            ("bunyan_extra.json",         "bunyan",     "en", False, 1680),
            ("bunyan_extra2.json",        "bunyan",     "en", False, 1680),
            ("bunyan_remaining.json",     "bunyan",     "en", False, 1680),
            ("boston.json",               "boston",     "en", False, 1720),
            ("boston_extra.json",         "boston",     "en", False, 1720),
            ("boston_remaining.json",     "boston",     "en", False, 1720),
            ("spurgeon.json",             "spurgeon",   "en", False, 1880),
            ("spurgeon_extra3.json",      "spurgeon",   "en", False, 1880),
            ("spurgeon_new.json",         "spurgeon",   "en", False, 1880),
            ("spurgeon_nl.json",          "spurgeon",   "nl", True,  1880),
            ("kohlbrugge.json",           "kohlbrugge", "nl", False, 1850),
            ("kohlbrugge_extra.json",     "kohlbrugge", "nl", False, 1850),
            ("kohlbrugge_new.json",       "kohlbrugge", "nl", False, 1850),
            ("kohlbrugge_remaining.json", "kohlbrugge", "nl", False, 1850),
            ("dachsel_studylight.json",   "dachsel",    "nl", True,  1880),
            ("dachsel_extra.json",        "dachsel",    "nl", True,  1880),
            ("dacosta.json",              "dacosta",    "nl", False, 1850),
            ("dacosta_bijbellezingen.json","dacosta",   "nl", False, 1850),
            ("dacosta_extra.json",        "dacosta",    "nl", False, 1850),
            ("dacosta_remaining.json",    "dacosta",    "nl", False, 1850),
            ("luther_full.json",          "luther",     "nl", True,  1520),
            ("luther_extra2.json",        "luther",     "nl", True,  1520),
            ("luther_galaten_online.json","luther",     "nl", True,  1520),
            ("luther_remaining.json",     "luther",     "nl", True,  1520),
            ("beza.json",                 "beza",       "nl", True,  1580),
        ]

        for fname, akey, lang, translated, year in commentary_files:
            aid = A.get(akey)
            if not aid:
                print(f"  SKIP {fname}: geen author_id voor '{akey}'")
                continue
            n = load_commentaries(fname, aid, language=lang, is_translated=translated,
                                  year_written=year, dry_run=dry)
            total_new += n

    # ============================================================
    # SERMONS
    # ============================================================
    if do_serm:
        print("\n" + "=" * 60)
        print("SERMONS")
        print("=" * 60)

        sermon_files = [
            # (bestand, author_key, collection, jaar, taal)
            ("sermons_boston.json",                    "boston",       "Preken",              None, "nl"),
            ("sermons_brakel.json",                    "brakel",       "Preken",              None, "nl"),
            ("sermons_bunyan.json",                    "bunyan",       "Preken",              None, "en"),
            ("sermons_calvijn.json",                   "calvijn",      "Preken",              None, "nl"),
            ("sermons_comrie.json",                    "comrie",       "Preken",              None, "nl"),
            ("sermons_hellenbroek.json",               "hellenbroek",  "Preken",              None, "nl"),
            ("sermons_kohlbrugge.json",                "kohlbrugge",   "Preken",              None, "nl"),
            ("sermons_luther.json",                    "luther",       "Preken",              None, "nl"),
            ("sermons_smijtegelt.json",                "smijtegelt",   "Preken",              None, "nl"),
            ("sermons_spurgeon.json",                  "spurgeon",     "Preken",              None, "en"),
            ("sermons_vandergroe.json",                "vandergroe",   "Preken",              None, "nl"),
            ("sermons_voetius.json",                   "voetius",      "Preken",              None, "nl"),
            ("sermons_extra_augustinus.json",          "augustinus",   "Preken",              None, "nl"),
            ("sermons_extra_ambrosius.json",           "ambrosius",    "Preken",              None, "nl"),
            ("sermons_extra_apostolisch.json",         "apostolisch",  "Apostolische Vaders", None, "nl"),
            ("sermons_extra_brakel_extra.json",        "brakel",       "Preken Extra",        None, "nl"),
            ("sermons_extra_calvijn_extra.json",       "calvijn",      "Preken Extra",        None, "nl"),
            ("sermons_extra_hellenbroek_extra.json",   "hellenbroek",  "Preken Extra",        None, "nl"),
            ("sermons_extra_kohlbrugge_extra.json",    "kohlbrugge",   "Preken Extra",        None, "nl"),
            ("sermons_extra_smijtegelt_extra.json",    "smijtegelt",   "Preken Extra",        None, "nl"),
            ("sermons_extra_spurgeon_extra.json",      "spurgeon",     "Preken Extra",        None, "en"),
            ("sermons_extra_athanasius.json",          "athanasius",   "Preken",              None, "nl"),
        ]

        for fname, akey, collection, year, lang in sermon_files:
            aid = A.get(akey)
            if not aid:
                print(f"  SKIP {fname}: geen author_id voor '{akey}'")
                continue
            n = load_sermons(fname, aid, collection=collection, year_preached=year,
                             language=lang, dry_run=dry)
            total_new += n

    print("\n" + "=" * 60)
    print(f"Sync klaar. Totaal nieuw geladen: {total_new}")
    print("=" * 60)


if __name__ == "__main__":
    main()
