"""
Scrape Spurgeon's Treasury of David from archive.spurgeon.org
Output: spurgeon.json - array of {book, chapter, verse, text} objects
"""
import requests, json, os, re, time
from bs4 import BeautifulSoup

BASE_URL = "https://archive.spurgeon.org/treasury"

def parse_psalm(html, psalm_num):
    """Extract verse-by-verse commentary from a Treasury of David psalm page."""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # Get plain text, line by line
    text = soup.get_text("\n")
    lines = text.split("\n")

    # Find EXPOSITION section boundaries (uppercase only to skip table of contents)
    expo_start = None
    expo_end = len(lines)
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "EXPOSITION" and expo_start is None:
            expo_start = i + 1
        elif expo_start is not None and stripped in ("EXPLANATORY NOTES AND QUAINT SAYINGS",
                                                      "EXPLANATORY NOTES",
                                                      "HINTS TO THE VILLAGE PREACHER",
                                                      "HINTS TO PREACHERS"):
            expo_end = i
            break

    if expo_start is None:
        # Fallback: look for first "Verse 1" as start
        for i, line in enumerate(lines):
            if re.match(r'^Verse\s+1[.\s]', line.strip()):
                expo_start = i
                break
        if expo_start is None:
            expo_start = 0

    # Extract verse blocks from exposition
    current_verse = None
    current_text = []

    for i in range(expo_start, expo_end):
        line = lines[i].strip()
        # Match "Verse 1.", "Verse 2.", "Verses 1, 2." etc.
        m = re.match(r'^Verse[s]?\s+(\d+)', line)
        if m:
            # Save previous verse
            if current_verse is not None:
                joined = clean_text("\n".join(current_text))
                if len(joined) > 20:
                    results.append({
                        "book": "Psalmen",
                        "chapter": psalm_num,
                        "verse": current_verse,
                        "verse_end": None,
                        "text": joined
                    })
            current_verse = int(m.group(1))
            # Rest of the line after verse marker
            rest = re.sub(r'^Verse[s]?\s+\d+[\.\s,\-–\d]*\s*', '', line).strip()
            current_text = [rest] if rest else []
        elif current_verse is not None:
            if line:
                current_text.append(line)

    # Save last verse
    if current_verse is not None:
        joined = clean_text("\n".join(current_text))
        if len(joined) > 20:
            results.append({
                "book": "Psalmen",
                "chapter": psalm_num,
                "verse": current_verse,
                "verse_end": None,
                "text": joined
            })

    # If no verses found, try whole psalm
    if not results:
        full_text = clean_text("\n".join(lines[expo_start:expo_end]))
        if len(full_text) > 50:
            results.append({
                "book": "Psalmen",
                "chapter": psalm_num,
                "verse": 1,
                "verse_end": None,
                "text": full_text
            })

    return results


def clean_text(text):
    """Clean up scraped text."""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'—\s*C\.?\s*H\.?\s*S\.?', '', text)
    return text.strip()


def scrape_all():
    base = os.path.join(os.path.expanduser("~"), "schriftinzicht")
    all_commentaries = []
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (SchriftInzicht/1.0; educational theological research)"
    })

    for psalm in range(1, 151):
        url = f"{BASE_URL}/ps{psalm:03d}.php"
        try:
            r = session.get(url, timeout=30)
            if r.status_code != 200:
                print(f"Psalm {psalm}: HTTP {r.status_code}")
                continue

            entries = parse_psalm(r.text, psalm)
            all_commentaries.extend(entries)
            print(f"Psalm {psalm}: {len(entries)} verses")

            time.sleep(0.3)
        except Exception as e:
            print(f"Psalm {psalm}: Error {e}")
            continue

    out_path = os.path.join(base, "spurgeon.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_commentaries, f, ensure_ascii=False, indent=1)
    print(f"\nTotal: {len(all_commentaries)} commentaries saved to {out_path}")
    return all_commentaries


if __name__ == "__main__":
    scrape_all()
