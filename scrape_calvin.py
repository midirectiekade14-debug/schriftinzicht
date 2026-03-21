"""
Scrape Calvin's commentaries from StudyLight.org
Output: calvijn.json - array of {book, chapter, verse, text} objects
"""
import requests, json, os, re, time
from bs4 import BeautifulSoup

BASE_URL = "https://www.studylight.org/commentaries/eng/cal"

# StudyLight book slugs -> our bible_books mapping
# Calvin commented on most OT and NT books
BOOKS = {
    # OT
    "genesis": "Genesis", "exodus": "Exodus", "leviticus": "Leviticus",
    "numbers": "Numbers", "deuteronomy": "Deuteronomium",
    "joshua": "Jozua", "judges": "Richteren",
    "1-samuel": "1 Samuel", "2-samuel": "2 Samuel",
    "1-kings": "1 Koningen", "2-kings": "2 Koningen",
    "job": "Job", "psalms": "Psalmen",
    "proverbs": "Spreuken", "ecclesiastes": "Prediker",
    "song-of-solomon": "Hooglied",
    "isaiah": "Jesaja", "jeremiah": "Jeremia",
    "lamentations": "Klaagliederen",
    "ezekiel": "Ezechiël", "daniel": "Daniël",
    "hosea": "Hosea", "joel": "Joël", "amos": "Amos",
    "obadiah": "Obadja", "jonah": "Jona", "micah": "Micha",
    "nahum": "Nahum", "habakkuk": "Habakuk", "zephaniah": "Zefanja",
    "haggai": "Haggaï", "zechariah": "Zacharia", "malachi": "Maleachi",
    # NT
    "matthew": "Mattheüs", "mark": "Markus", "luke": "Lukas",
    "john": "Johannes", "acts": "Handelingen",
    "romans": "Romeinen", "1-corinthians": "1 Korinthe",
    "2-corinthians": "2 Korinthe", "galatians": "Galaten",
    "ephesians": "Efeze", "philippians": "Filippenzen",
    "colossians": "Kolossenzen", "1-thessalonians": "1 Thessalonicenzen",
    "2-thessalonians": "2 Thessalonicenzen",
    "1-timothy": "1 Timotheüs", "2-timothy": "2 Timotheüs",
    "titus": "Titus", "philemon": "Filemon",
    "hebrews": "Hebreeën", "james": "Jakobus",
    "1-peter": "1 Petrus", "2-peter": "2 Petrus",
    "1-john": "1 Johannes", "2-john": "2 Johannes",
    "3-john": "3 Johannes", "jude": "Judas",
}

# Chapter counts per book (approximate, we'll try and skip 404s)
CHAPTER_COUNTS = {
    "genesis": 50, "exodus": 40, "leviticus": 27, "numbers": 36,
    "deuteronomy": 34, "joshua": 24, "judges": 21,
    "1-samuel": 31, "2-samuel": 24, "1-kings": 22, "2-kings": 25,
    "job": 42, "psalms": 150, "proverbs": 31, "ecclesiastes": 12,
    "song-of-solomon": 8, "isaiah": 66, "jeremiah": 52,
    "lamentations": 5, "ezekiel": 48, "daniel": 12,
    "hosea": 14, "joel": 3, "amos": 9, "obadiah": 1, "jonah": 4,
    "micah": 7, "nahum": 3, "habakkuk": 3, "zephaniah": 3,
    "haggai": 2, "zechariah": 14, "malachi": 4,
    "matthew": 28, "mark": 16, "luke": 24, "john": 21,
    "acts": 28, "romans": 16, "1-corinthians": 16, "2-corinthians": 13,
    "galatians": 6, "ephesians": 6, "philippians": 4, "colossians": 4,
    "1-thessalonians": 5, "2-thessalonians": 3,
    "1-timothy": 6, "2-timothy": 4, "titus": 3, "philemon": 1,
    "hebrews": 13, "james": 5, "1-peter": 5, "2-peter": 3,
    "1-john": 5, "2-john": 1, "3-john": 1, "jude": 1,
}

def parse_chapter(html, book_name, chapter):
    """Extract verse-by-verse commentaries from a StudyLight chapter page."""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # Find the main content
    content = soup.find("div", class_="commentary-text") or soup.find("div", class_="entry-content") or soup
    text = content.get_text("\n", strip=False)

    # Split by verse markers: "Verse 1.", "Verse 2." etc.
    # Also handle "1." at line start, and "Verse 1-3" ranges
    parts = re.split(r'\n\s*(?:Verse\s+)?(\d+)[\.\s]', text)

    if len(parts) < 3:
        # Try alternative patterns
        parts = re.split(r'\n\s*(\d+)\.\s', text)

    if len(parts) < 3:
        # No verse markers found - treat whole chapter as one entry
        cleaned = clean_text(text)
        if len(cleaned) > 50:
            results.append({
                "book": book_name,
                "chapter": chapter,
                "verse": 1,
                "verse_end": None,
                "text": cleaned
            })
        return results

    # parts[0] is preamble, then alternating verse_num, text
    for i in range(1, len(parts) - 1, 2):
        try:
            verse_num = int(parts[i])
        except ValueError:
            continue
        verse_text = clean_text(parts[i + 1])
        if len(verse_text) > 20:
            results.append({
                "book": book_name,
                "chapter": chapter,
                "verse": verse_num,
                "verse_end": None,
                "text": verse_text
            })

    return results


def clean_text(text):
    """Clean up scraped text."""
    # Remove footnote numbers
    text = re.sub(r'\(\d+\)', '', text)
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    # Remove navigation artifacts
    text = re.sub(r'Return to Top', '', text)
    text = re.sub(r'Calvin\'s Commentaries.*?$', '', text, flags=re.MULTILINE)
    return text.strip()


def scrape_all():
    base = os.path.join(os.path.expanduser("~"), "schriftinzicht")
    all_commentaries = []
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (SchriftInzicht/1.0; educational theological research)"
    })

    total_books = len(BOOKS)
    for idx, (slug, dutch_name) in enumerate(BOOKS.items()):
        chapters = CHAPTER_COUNTS.get(slug, 1)
        print(f"[{idx+1}/{total_books}] {dutch_name} ({chapters} chapters)...")
        book_count = 0

        for ch in range(1, chapters + 1):
            url = f"{BASE_URL}/{slug}-{ch}.html"
            try:
                r = session.get(url, timeout=30)
                if r.status_code == 404:
                    continue
                if r.status_code != 200:
                    print(f"  Ch {ch}: HTTP {r.status_code}")
                    continue

                entries = parse_chapter(r.text, dutch_name, ch)
                all_commentaries.extend(entries)
                book_count += len(entries)

                # Be polite
                time.sleep(0.3)

            except Exception as e:
                print(f"  Ch {ch}: Error {e}")
                continue

        print(f"  -> {book_count} verse commentaries")

    # Save
    out_path = os.path.join(base, "calvijn.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_commentaries, f, ensure_ascii=False, indent=1)
    print(f"\nTotal: {len(all_commentaries)} commentaries saved to {out_path}")
    return all_commentaries


if __name__ == "__main__":
    scrape_all()
