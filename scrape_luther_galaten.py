#!/usr/bin/env python3
"""Scrape Luther Galaten commentary from onlinebijbelverklaring.nl"""
import requests, re, json, sys, io, time
from bs4 import BeautifulSoup
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path("C:/Users/midir/schriftinzicht")
BASE_URL = "https://onlinebijbelverklaring.nl/maartenluther/galaten/galaten{}/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

entries = []

for chapter in range(1, 7):
    url = BASE_URL.format(chapter)
    print(f"Scraping Galaten {chapter}...")

    try:
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            print(f"  Error: HTTP {r.status_code}")
            continue

        soup = BeautifulSoup(r.text, 'html.parser')

        # Find all headings that contain "Vers N" or "Vers N-M"
        verse_sections = []

        # Look for headings (h2, h3, h4) or bold/strong elements with "Vers N"
        for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            text = heading.get_text(strip=True)
            m = re.match(r'Vers\s+(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?', text)
            if m:
                verse_num = int(m.group(1))
                verse_end = int(m.group(2)) if m.group(2) else None
                verse_sections.append((heading, verse_num, verse_end))

        print(f"  Found {len(verse_sections)} verse sections")

        for i, (heading, verse_num, verse_end) in enumerate(verse_sections):
            # Collect text after this heading until next verse heading
            text_parts = []
            elem = heading.next_sibling

            while elem:
                if hasattr(elem, 'name'):
                    # Stop at next heading with "Vers" pattern
                    if elem.name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
                        t = elem.get_text(strip=True)
                        if re.match(r'Vers\s+\d', t):
                            break
                    # Get text from paragraphs, divs etc.
                    t = elem.get_text(separator=' ', strip=True)
                    if t and len(t) > 5:
                        text_parts.append(t)
                elif isinstance(elem, str) and elem.strip():
                    text_parts.append(elem.strip())
                elem = elem.next_sibling

            body = '\n'.join(text_parts).strip()

            if len(body) > 30:
                entries.append({
                    'book': 'Galaten',
                    'chapter': chapter,
                    'verse': verse_num,
                    'verse_end': verse_end,
                    'text': body[:8000]
                })

        time.sleep(0.5)

    except Exception as e:
        print(f"  ERROR: {e}")

# Deduplicate
seen = set()
unique = []
for e in entries:
    k = (e['book'], e['chapter'], e['verse'])
    if k not in seen:
        seen.add(k)
        unique.append(e)

print(f"\nTotal: {len(unique)} unique Luther Galaten entries")
for e in unique[:5]:
    print(f"  Gal {e['chapter']}:{e['verse']} ({len(e['text'])} chars)")

out = BASE / 'luther_galaten_online.json'
with open(str(out), 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)
print(f"Saved to {out}")
