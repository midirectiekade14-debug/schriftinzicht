"""Fix verse_id koppeling voor recent geüploade sermons."""

import os
import re
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapping van extractie-namen naar DB-namen
BOOK_ALIASES = {
    "Markus": "Marcus",
    "1 Korinthe": "1 Korinthiërs",
    "2 Korinthe": "2 Korinthiërs",
    "Efeze": "Efeziërs",
    "Handelingen": "Handelingen der apostelen",
    "Openbaring": "Openbaring van Johannes",
    "Hebreeën": "Hebreeën",
    "Lukas": "Lucas",
    # Identieke namen hoeven niet gemapped
}

# Alle bijbelboek patronen voor extractie uit titels
BOOK_PATTERNS = [
    (r"Genesis|Gen\.", "Genesis"),
    (r"Exodus|Ex\.", "Exodus"),
    (r"Leviticus|Lev\.", "Leviticus"),
    (r"Numeri|Num\.", "Numeri"),
    (r"Deuteronomium|Deut\.", "Deuteronomium"),
    (r"Jozua|Joz\.", "Jozua"),
    (r"Richteren|Richt\.", "Richteren"),
    (r"Ruth", "Ruth"),
    (r"1\s*Samu[eë]l|1\s*Sam\.", "1 Samuël"),
    (r"2\s*Samu[eë]l|2\s*Sam\.", "2 Samuël"),
    (r"1\s*Koningen|1\s*Kon\.", "1 Koningen"),
    (r"2\s*Koningen|2\s*Kon\.", "2 Koningen"),
    (r"1\s*Kronieken|1\s*Kron\.", "1 Kronieken"),
    (r"2\s*Kronieken|2\s*Kron\.", "2 Kronieken"),
    (r"Ezra", "Ezra"),
    (r"Nehemia|Neh\.", "Nehemia"),
    (r"Esther|Esth\.", "Esther"),
    (r"Job", "Job"),
    (r"Psalm(?:en)?|Ps\.", "Psalmen"),
    (r"Spreuken|Spr(?:euken)?\.", "Spreuken"),
    (r"Prediker|Pred\.", "Prediker"),
    (r"Hooglied|Hoogl\.", "Hooglied"),
    (r"Jesaja|Jes\.", "Jesaja"),
    (r"Jeremia|Jer\.", "Jeremia"),
    (r"Klaagliederen|Klaagl\.", "Klaagliederen"),
    (r"Ezech?i[eë]l|Ez\.", "Ezechiël"),
    (r"Dani[eë]l|Dan\.", "Daniël"),
    (r"Hosea|Hos\.", "Hosea"),
    (r"Jo[eë]l", "Joël"),
    (r"Amos", "Amos"),
    (r"Obadja|Ob\.", "Obadja"),
    (r"Jona", "Jona"),
    (r"Micha|Mich\.", "Micha"),
    (r"Nahum|Nah\.", "Nahum"),
    (r"Habakuk|Hab\.", "Habakuk"),
    (r"Zefanja|Zef\.", "Zefanja"),
    (r"Haggai|Hagg?\.", "Haggaï"),
    (r"Zacharia|Zach\.", "Zacharia"),
    (r"Maleachi|Mal\.", "Maleachi"),
    (r"Matthe[uü]s|Matth?\.", "Mattheüs"),
    (r"Marc?[ku]s|Mar[ck]\.", "Marcus"),
    (r"Lu[ck]as|Luk\.", "Lucas"),
    (r"Johannes|Joh\.", "Johannes"),
    (r"Handelingen|Hand\.", "Handelingen der apostelen"),
    (r"Romeinen|Rom\.", "Romeinen"),
    (r"1\s*Kor(?:inthe|inthi[eë]rs)?|1\s*Kor\.", "1 Korinthiërs"),
    (r"2\s*Kor(?:inthe|inthi[eë]rs)?|2\s*Kor\.", "2 Korinthiërs"),
    (r"Galaten|Gal\.", "Galaten"),
    (r"Ef(?:eze|ezi[eë]rs)?|Ef\.", "Efeziërs"),
    (r"Filippenzen|Fil\.", "Filippenzen"),
    (r"Kolossenzen|Kol\.", "Kolossenzen"),
    (r"1\s*Thess(?:alonicenzen)?\.", "1 Thessalonicenzen"),
    (r"2\s*Thess(?:alonicenzen)?\.", "2 Thessalonicenzen"),
    (r"1\s*Tim(?:oth[eë]us)?\.", "1 Timotheüs"),
    (r"2\s*Tim(?:oth[eë]us)?\.", "2 Timotheüs"),
    (r"Titus|Tit\.", "Titus"),
    (r"Filemon|Filem\.", "Filemon"),
    (r"Hebree[eë]n|Hebr\.", "Hebreeën"),
    (r"Jakobus|Jak\.", "Jakobus"),
    (r"1\s*Petr(?:us)?\.", "1 Petrus"),
    (r"2\s*Petr(?:us)?\.", "2 Petrus"),
    (r"1\s*Joh(?:annes)?\.", "1 Johannes"),
    (r"2\s*Joh(?:annes)?\.", "2 Johannes"),
    (r"3\s*Joh(?:annes)?\.", "3 Johannes"),
    (r"Judas|Jud\.", "Judas"),
    (r"Openb(?:aring(?:en)?)?|Openb?\.", "Openbaring van Johannes"),
]


def extract_ref(title):
    """Extract boek, hoofdstuk, vers uit preektitel."""
    for pattern, db_name in BOOK_PATTERNS:
        full = rf"(?:{pattern})\s*(\d+)\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?"
        m = re.search(full, title, re.IGNORECASE)
        if m:
            return db_name, int(m.group(1)), int(m.group(2)), int(m.group(3)) if m.group(3) else None
        chap = rf"(?:{pattern})\s+(\d+)"
        m = re.search(chap, title, re.IGNORECASE)
        if m:
            return db_name, int(m.group(1)), 1, None
    return None, None, None, None


def main():
    # Laad boek IDs
    books = supabase.table("bible_books").select("id, name").execute()
    book_ids = {b["name"]: b["id"] for b in books.data}

    # Cache alle verse IDs per boek+hoofdstuk (paginated, 31K+ rows)
    print("[INIT] Verse lookup bouwen...")
    verse_cache = {}
    offset = 0
    page_size = 1000
    while True:
        resp = supabase.table("bible_verses").select("id, book_id, chapter, verse").range(offset, offset + page_size - 1).execute()
        if not resp.data:
            break
        for v in resp.data:
            key = f"{v['book_id']}:{v['chapter']}:{v['verse']}"
            verse_cache[key] = v["id"]
        if len(resp.data) < page_size:
            break
        offset += page_size
    print(f"[OK] {len(verse_cache)} verzen gecached")

    # Haal alle sermons zonder start_verse_id
    sermons = supabase.table("sermons").select("id, title").is_("start_verse_id", "null").execute()
    print(f"[INFO] {len(sermons.data)} sermons zonder verse_id")

    fixed = 0
    not_found = 0

    for sermon in sermons.data:
        db_name, chapter, verse, verse_end = extract_ref(sermon["title"])
        if not db_name:
            continue

        book_id = book_ids.get(db_name)
        if not book_id:
            continue

        vid = verse_cache.get(f"{book_id}:{chapter}:{verse}")
        if vid:
            update = {"start_verse_id": vid}
            if verse_end:
                evid = verse_cache.get(f"{book_id}:{chapter}:{verse_end}")
                if evid:
                    update["end_verse_id"] = evid

            supabase.table("sermons").update(update).eq("id", sermon["id"]).execute()
            fixed += 1
        else:
            not_found += 1

    print(f"\n[DONE] {fixed} sermons gekoppeld aan verse_id, {not_found} niet gevonden")


if __name__ == "__main__":
    main()
