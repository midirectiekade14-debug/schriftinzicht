"""
SchriftInzicht — Scraper: Kanttekeningen Statenvertaling
=========================================================
Bron: https://www.statenvertaling.net
Licentie: Publiek domein

Gebruik:
  pip install requests beautifulsoup4
  python scrape_kanttekeningen.py

Output: kanttekeningen.json
"""

import json
import time
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path

# Bijbelboeken met hun URL-slugs op statenvertaling.net
BOOKS = [
    ("Genesis", "genesis", 50), ("Exodus", "exodus", 40),
    ("Leviticus", "leviticus", 27), ("Numeri", "numeri", 36),
    ("Deuteronomium", "deuteronomium", 34), ("Jozua", "jozua", 24),
    ("Richteren", "richteren", 21), ("Ruth", "ruth", 4),
    ("1 Samuël", "1-samuel", 31), ("2 Samuël", "2-samuel", 24),
    ("1 Koningen", "1-koningen", 22), ("2 Koningen", "2-koningen", 25),
    ("1 Kronieken", "1-kronieken", 29), ("2 Kronieken", "2-kronieken", 36),
    ("Ezra", "ezra", 10), ("Nehemia", "nehemia", 13),
    ("Esther", "esther", 10), ("Job", "job", 42),
    ("Psalmen", "psalmen", 150), ("Spreuken", "spreuken", 31),
    ("Prediker", "prediker", 12), ("Hooglied", "hooglied", 8),
    ("Jesaja", "jesaja", 66), ("Jeremia", "jeremia", 52),
    ("Klaagliederen", "klaagliederen", 5), ("Ezechiël", "ezechiel", 48),
    ("Daniël", "daniel", 12), ("Hosea", "hosea", 14),
    ("Joël", "joel", 3), ("Amos", "amos", 9),
    ("Obadja", "obadja", 1), ("Jona", "jona", 4),
    ("Micha", "micha", 7), ("Nahum", "nahum", 3),
    ("Habakuk", "habakuk", 3), ("Zefanja", "zefanja", 3),
    ("Haggaï", "haggai", 2), ("Zacharia", "zacharia", 14),
    ("Maleachi", "maleachi", 4),
    ("Mattheüs", "mattheus", 28), ("Markus", "markus", 16),
    ("Lukas", "lukas", 24), ("Johannes", "johannes", 21),
    ("Handelingen", "handelingen", 28), ("Romeinen", "romeinen", 16),
    ("1 Korinthe", "1-korinthe", 16), ("2 Korinthe", "2-korinthe", 13),
    ("Galaten", "galaten", 6), ("Efeze", "efeze", 6),
    ("Filippenzen", "filippenzen", 4), ("Kolossenzen", "kolossenzen", 4),
    ("1 Thessalonicenzen", "1-thessalonicenzen", 5),
    ("2 Thessalonicenzen", "2-thessalonicenzen", 3),
    ("1 Timotheüs", "1-timotheus", 6), ("2 Timotheüs", "2-timotheus", 4),
    ("Titus", "titus", 3), ("Filemon", "filemon", 1),
    ("Hebreeën", "hebreeen", 13), ("Jakobus", "jakobus", 5),
    ("1 Petrus", "1-petrus", 5), ("2 Petrus", "2-petrus", 3),
    ("1 Johannes", "1-johannes", 5), ("2 Johannes", "2-johannes", 1),
    ("3 Johannes", "3-johannes", 1), ("Judas", "judas", 1),
    ("Openbaring", "openbaring", 22),
]

BASE_URL = "https://www.statenvertaling.net/bijbel"
OUTPUT_FILE = "kanttekeningen.json"
DELAY = 1.5  # Wees netjes: 1.5 seconden tussen requests

def scrape_chapter(book_name, book_slug, chapter):
    """Scrape een hoofdstuk en retourneer verzen + kanttekeningen."""
    url = f"{BASE_URL}/{book_slug}/{chapter}"
    print(f"  Ophalen: {book_name} {chapter} — {url}")

    try:
        resp = requests.get(url, timeout=30, headers={
            "User-Agent": "SchriftInzicht-Scraper/1.0 (bijbelverklaringen-app)"
        })
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  FOUT: {e}")
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    results = []

    # De structuur varieert per site — pas deze selectors aan
    # na het inspecteren van de werkelijke HTML-structuur.
    # Dit is een generiek framework dat je kunt aanpassen.

    # Zoek vers-elementen
    verse_elements = soup.select("[data-verse], .verse, .vers")

    if not verse_elements:
        # Fallback: zoek op tekst-patronen
        text_content = soup.get_text()
        # Parse versnummers uit de tekst
        verse_pattern = re.compile(r'(\d+)\s+(.+?)(?=\d+\s+|\Z)', re.DOTALL)
        # Dit is een simplistisch patroon — verfijn na inspectie van de site

    for elem in verse_elements:
        verse_num = elem.get("data-verse", "")
        if not verse_num:
            # Probeer het versnummer uit de tekst te halen
            num_match = re.match(r'(\d+)', elem.get_text().strip())
            if num_match:
                verse_num = num_match.group(1)

        verse_text = elem.get_text(strip=True)

        # Zoek gekoppelde kanttekeningen
        notes = []
        note_elements = elem.select(".kanttekening, .note, .annotation")
        for note_elem in note_elements:
            marker = note_elem.get("data-marker", "")
            note_text = note_elem.get_text(strip=True)
            if note_text:
                notes.append({
                    "marker": marker,
                    "text": note_text
                })

        if verse_num:
            results.append({
                "book": book_name,
                "chapter": chapter,
                "verse": int(verse_num) if verse_num.isdigit() else verse_num,
                "text_sv": verse_text,
                "kanttekeningen": notes
            })

    return results


def main():
    print("=" * 60)
    print("SchriftInzicht — Kanttekeningen Scraper")
    print("=" * 60)
    print(f"Bron: {BASE_URL}")
    print(f"Output: {OUTPUT_FILE}")
    print()

    all_data = []
    total_books = len(BOOKS)

    for book_idx, (book_name, book_slug, chapters) in enumerate(BOOKS):
        print(f"\n[{book_idx + 1}/{total_books}] {book_name} ({chapters} hoofdstukken)")

        for chapter in range(1, chapters + 1):
            chapter_data = scrape_chapter(book_name, book_slug, chapter)
            all_data.extend(chapter_data)
            time.sleep(DELAY)

    # Opslaan
    output_path = Path(OUTPUT_FILE)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Klaar! {len(all_data)} verzen opgeslagen in {OUTPUT_FILE}")
    print(f"Bestandsgrootte: {output_path.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"{'=' * 60}")

    # Samenvatting
    books_found = set(v["book"] for v in all_data)
    notes_count = sum(len(v["kanttekeningen"]) for v in all_data)
    print(f"Boeken: {len(books_found)}")
    print(f"Kanttekeningen: {notes_count}")


if __name__ == "__main__":
    main()
