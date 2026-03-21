#!/usr/bin/env python3
"""
Scrape Dächsel Bijbelverklaring from StudyLight.org
Complete verse-by-verse Dutch Bible commentary for all 66 books.
URL pattern: studylight.org/commentaries/dut/dac/{book}-{chapter}.html
"""
import requests, re, json, time, sys, io
from bs4 import BeautifulSoup
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path("C:/Users/midir/schriftinzicht")

# StudyLight book slugs -> Dutch book names (matching bible_books.json)
BOOKS = [
    ("genesis", "Genesis", 50),
    ("exodus", "Exodus", 40),
    ("leviticus", "Leviticus", 27),
    ("numbers", "Numeri", 36),
    ("deuteronomy", "Deuteronomium", 34),
    ("joshua", "Jozua", 24),
    ("judges", "Richteren", 21),
    ("ruth", "Ruth", 4),
    ("1-samuel", "1 Samuel", 31),
    ("2-samuel", "2 Samuel", 24),
    ("1-kings", "1 Koningen", 22),
    ("2-kings", "2 Koningen", 25),
    ("1-chronicles", "1 Kronieken", 29),
    ("2-chronicles", "2 Kronieken", 36),
    ("ezra", "Ezra", 10),
    ("nehemiah", "Nehemia", 13),
    ("esther", "Esther", 10),
    ("job", "Job", 42),
    ("psalms", "Psalmen", 150),
    ("proverbs", "Spreuken", 31),
    ("ecclesiastes", "Prediker", 12),
    ("song-of-solomon", "Hooglied", 8),
    ("isaiah", "Jesaja", 66),
    ("jeremiah", "Jeremia", 52),
    ("lamentations", "Klaagliederen", 5),
    ("ezekiel", "Ezechiël", 48),
    ("daniel", "Daniël", 12),
    ("hosea", "Hosea", 14),
    ("joel", "Joël", 3),
    ("amos", "Amos", 9),
    ("obadiah", "Obadja", 1),
    ("jonah", "Jona", 4),
    ("micah", "Micha", 7),
    ("nahum", "Nahum", 3),
    ("habakkuk", "Habakuk", 3),
    ("zephaniah", "Zefanja", 3),
    ("haggai", "Haggaï", 2),
    ("zechariah", "Zacharia", 14),
    ("malachi", "Maleachi", 4),
    ("matthew", "Mattheüs", 28),
    ("mark", "Markus", 16),
    ("luke", "Lukas", 24),
    ("john", "Johannes", 21),
    ("acts", "Handelingen", 28),
    ("romans", "Romeinen", 16),
    ("1-corinthians", "1 Korinthe", 16),
    ("2-corinthians", "2 Korinthe", 13),
    ("galatians", "Galaten", 6),
    ("ephesians", "Efeze", 6),
    ("philippians", "Filippenzen", 4),
    ("colossians", "Kolossenzen", 4),
    ("1-thessalonians", "1 Thessalonicenzen", 5),
    ("2-thessalonians", "2 Thessalonicenzen", 3),
    ("1-timothy", "1 Timotheüs", 6),
    ("2-timothy", "2 Timotheüs", 4),
    ("titus", "Titus", 3),
    ("philemon", "Filemon", 1),
    ("hebrews", "Hebreeën", 13),
    ("james", "Jakobus", 5),
    ("1-peter", "1 Petrus", 5),
    ("2-peter", "2 Petrus", 3),
    ("1-john", "1 Johannes", 5),
    ("2-john", "2 Johannes", 1),
    ("3-john", "3 Johannes", 1),
    ("jude", "Judas", 1),
    ("revelation", "Openbaring van Johannes", 22),
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

def scrape_chapter(slug, dutch_name, chapter):
    """Scrape one chapter and return list of verse entries."""
    url = f"https://www.studylight.org/commentaries/dut/dac/{slug}-{chapter}.html"
    entries = []

    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            return entries

        soup = BeautifulSoup(r.text, 'html.parser')

        # Find all verse headers
        verse_headers = soup.find_all('h3', class_='commentaries-entry-number')

        for i, h3 in enumerate(verse_headers):
            a_tag = h3.find('a', class_='com-number')
            if not a_tag:
                continue

            name = a_tag.get('name', '')
            m = re.match(r'vers-(\d+)', name)
            if not m:
                continue

            verse_num = int(m.group(1))

            # Get text content after this h3 until next h3
            # Walk siblings
            text_parts = []
            elem = h3.next_sibling
            while elem:
                if hasattr(elem, 'name') and elem.name == 'h3':
                    break
                if hasattr(elem, 'get_text'):
                    t = elem.get_text(separator=' ', strip=True)
                    if t and len(t) > 5:
                        text_parts.append(t)
                elif isinstance(elem, str) and elem.strip():
                    text_parts.append(elem.strip())
                elem = elem.next_sibling

            text = '\n'.join(text_parts).strip()

            # Skip very short or empty
            if len(text) < 20:
                continue

            # Cap at 8000 chars
            if len(text) > 8000:
                text = text[:8000] + "..."

            entries.append({
                "book": dutch_name,
                "chapter": chapter,
                "verse": verse_num,
                "verse_end": None,
                "text": text
            })

    except Exception as e:
        print(f"  Error {slug}-{chapter}: {e}")

    return entries


def main():
    all_entries = []
    total_chapters = sum(ch for _, _, ch in BOOKS)
    done_chapters = 0

    # Load existing progress if any
    progress_file = BASE / "dachsel_studylight_progress.json"
    if progress_file.exists():
        with open(str(progress_file), encoding='utf-8') as f:
            all_entries = json.load(f)
        # Find what we already scraped
        scraped = set()
        for e in all_entries:
            scraped.add((e['book'], e['chapter']))
        print(f"Resuming from {len(all_entries)} existing entries")
    else:
        scraped = set()

    for slug, dutch_name, num_chapters in BOOKS:
        book_count = 0
        for ch in range(1, num_chapters + 1):
            done_chapters += 1

            if (dutch_name, ch) in scraped:
                continue

            entries = scrape_chapter(slug, dutch_name, ch)
            book_count += len(entries)
            all_entries.extend(entries)

            # Rate limit
            time.sleep(0.3)

            # Progress every 50 chapters
            if done_chapters % 50 == 0:
                print(f"  Progress: {done_chapters}/{total_chapters} chapters, {len(all_entries)} entries total")
                # Save progress
                with open(str(progress_file), 'w', encoding='utf-8') as f:
                    json.dump(all_entries, f, ensure_ascii=False)

        if book_count > 0:
            print(f"  {dutch_name}: {book_count} verses")

    # Final save
    out_path = BASE / "dachsel_studylight.json"
    with open(str(out_path), 'w', encoding='utf-8') as f:
        json.dump(all_entries, f, ensure_ascii=False, indent=2)
    print(f"\nTotal: {len(all_entries)} entries saved to {out_path}")

    # Cleanup progress file
    if progress_file.exists():
        progress_file.unlink()


if __name__ == "__main__":
    main()
