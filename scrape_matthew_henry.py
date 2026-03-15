"""
SchriftInzicht — Scraper: Matthew Henry Bijbelverklaring
=========================================================
Bron: https://onlinebijbelverklaring.nl/matthewhenry/
Licentie: Publiek domein, code beschikbaar op GitHub

Gebruik:
  pip install requests beautifulsoup4
  python scrape_matthew_henry.py

Output: matthew_henry.json

Let op: De site onlinebijbelverklaring.nl heeft de code op GitHub staan.
Het kan efficiënter zijn om de brondata rechtstreeks van GitHub te halen:
https://github.com/onlinebijbelverklaring
Check daar eerst of de ruwe teksten beschikbaar zijn als JSON/XML.
"""

import json
import time
import re
import requests
from bs4 import BeautifulSoup
from pathlib import Path

BASE_URL = "https://onlinebijbelverklaring.nl/matthewhenry"
DELAY = 2.0  # Respecteer de server

# Bijbelboeken — pas de slugs aan na inspectie van de site
BOOKS = [
    ("Genesis", "genesis", 50), ("Exodus", "exodus", 40),
    ("Leviticus", "leviticus", 27), ("Numeri", "numeri", 36),
    ("Deuteronomium", "deuteronomium", 34), ("Jozua", "jozua", 24),
    ("Richteren", "richteren", 21), ("Ruth", "ruth", 4),
    ("1 Samuël", "1samuel", 31), ("2 Samuël", "2samuel", 24),
    ("1 Koningen", "1koningen", 22), ("2 Koningen", "2koningen", 25),
    ("1 Kronieken", "1kronieken", 29), ("2 Kronieken", "2kronieken", 36),
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
    ("1 Korinthe", "1korinthe", 16), ("2 Korinthe", "2korinthe", 13),
    ("Galaten", "galaten", 6), ("Efeze", "efeze", 6),
    ("Filippenzen", "filippenzen", 4), ("Kolossenzen", "kolossenzen", 4),
    ("1 Thessalonicenzen", "1thessalonicenzen", 5),
    ("2 Thessalonicenzen", "2thessalonicenzen", 3),
    ("1 Timotheüs", "1timotheus", 6), ("2 Timotheüs", "2timotheus", 4),
    ("Titus", "titus", 3), ("Filemon", "filemon", 1),
    ("Hebreeën", "hebreeen", 13), ("Jakobus", "jakobus", 5),
    ("1 Petrus", "1petrus", 5), ("2 Petrus", "2petrus", 3),
    ("1 Johannes", "1johannes", 5), ("2 Johannes", "2johannes", 1),
    ("3 Johannes", "3johannes", 1), ("Judas", "judas", 1),
    ("Openbaring", "openbaring", 22),
]

OUTPUT_FILE = "matthew_henry.json"


def scrape_chapter(book_name, book_slug, chapter):
    """Scrape Matthew Henry verklaring voor een hoofdstuk."""
    url = f"{BASE_URL}/{book_slug}/{chapter}"
    print(f"  Ophalen: {book_name} {chapter}")

    try:
        resp = requests.get(url, timeout=30, headers={
            "User-Agent": "SchriftInzicht-Scraper/1.0 (bijbelverklaringen-app)"
        })
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  FOUT: {e}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # Zoek de verklaring-content
    # Pas deze selectors aan na inspectie van de werkelijke pagina
    content_elem = soup.select_one(
        ".commentary-content, .verklaring, article, .content, main"
    )

    if not content_elem:
        # Fallback: pak de body tekst
        content_elem = soup.body

    if not content_elem:
        print(f"  WAARSCHUWING: Geen content gevonden")
        return None

    # Verwijder navigatie-elementen
    for nav in content_elem.select("nav, .navigation, .breadcrumb, header, footer, script, style"):
        nav.decompose()

    commentary_text = content_elem.get_text(separator="\n", strip=True)

    # Probeer de verklaring op te splitsen per vers of perikoop
    # Matthew Henry schrijft vaak per groep verzen (bijv. "vers 1-5")
    sections = []
    current_section = {"verses": "", "text": ""}

    for line in commentary_text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Check of dit een vers-header is (bijv. "Vers 1-5" of "vs. 12-15")
        verse_match = re.match(
            r'^(?:vers|vs\.?|verzen)\s*(\d+(?:\s*[-–]\s*\d+)?)',
            line, re.IGNORECASE
        )

        if verse_match:
            # Sla vorige sectie op
            if current_section["text"]:
                sections.append(current_section.copy())
            current_section = {
                "verses": verse_match.group(1).strip(),
                "text": ""
            }
        else:
            current_section["text"] += line + " "

    # Laatste sectie opslaan
    if current_section["text"]:
        sections.append(current_section)

    return {
        "book": book_name,
        "chapter": chapter,
        "full_text": commentary_text,
        "sections": sections
    }


def main():
    print("=" * 60)
    print("SchriftInzicht — Matthew Henry Scraper")
    print("=" * 60)
    print(f"Bron: {BASE_URL}")
    print(f"Output: {OUTPUT_FILE}")
    print()

    # Stap 1: Check eerst of de GitHub-repo bruikbare data heeft
    print("TIP: Check eerst https://github.com/onlinebijbelverklaring")
    print("     voor ruwe bronbestanden — dat is efficiënter dan scrapen.")
    print()

    all_data = []
    total_books = len(BOOKS)

    for book_idx, (book_name, book_slug, chapters) in enumerate(BOOKS):
        print(f"\n[{book_idx + 1}/{total_books}] {book_name} ({chapters} hoofdstukken)")

        for chapter in range(1, chapters + 1):
            chapter_data = scrape_chapter(book_name, book_slug, chapter)
            if chapter_data:
                all_data.append(chapter_data)
            time.sleep(DELAY)

    # Opslaan
    output_path = Path(OUTPUT_FILE)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    total_sections = sum(len(ch.get("sections", [])) for ch in all_data)
    print(f"\n{'=' * 60}")
    print(f"Klaar! {len(all_data)} hoofdstukken opgeslagen in {OUTPUT_FILE}")
    print(f"Totaal {total_sections} secties (vers-groepen)")
    print(f"Bestandsgrootte: {output_path.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
