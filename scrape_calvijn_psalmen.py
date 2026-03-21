#!/usr/bin/env python3
"""Scrape Calvijn Psalmen commentary from psalmboek.nl"""
import requests, re, json, sys, io
from bs4 import BeautifulSoup
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path("C:/Users/midir/schriftinzicht")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

url = "https://psalmboek.nl/calvijn-over-psalmen-1-40.php"
print(f"Scraping {url}...")

r = requests.get(url, headers=HEADERS, timeout=30)
soup = BeautifulSoup(r.text, 'html.parser')

entries = []

# Find all content - look for psalm-specific sections
# Each psalm entry is typically marked with bold "Psalm N" or similar
text = soup.get_text()
lines = text.split('\n')

current_psalm = None
body_parts = []

for line in lines:
    stripped = line.strip()
    if not stripped:
        continue

    # Check for "Psalm N" header
    m = re.match(r'^Psalm\s+(\d{1,3})\b', stripped, re.I)
    if m:
        # Flush previous
        if current_psalm and body_parts:
            body = '\n'.join(body_parts).strip()
            if len(body) > 20:
                entries.append({
                    'book': 'Psalmen',
                    'chapter': current_psalm,
                    'verse': 1,
                    'verse_end': None,
                    'text': body[:8000]
                })
        current_psalm = int(m.group(1))
        body_parts = [stripped]
    elif current_psalm:
        body_parts.append(stripped)

# Flush last
if current_psalm and body_parts:
    body = '\n'.join(body_parts).strip()
    if len(body) > 20:
        entries.append({
            'book': 'Psalmen',
            'chapter': current_psalm,
            'verse': 1,
            'verse_end': None,
            'text': body[:8000]
        })

print(f"Found {len(entries)} Calvijn Psalm entries")
for e in entries[:5]:
    print(f"  Psalm {e['chapter']} ({len(e['text'])} chars): {e['text'][:80]}...")

out = BASE / 'calvijn_psalmen.json'
with open(str(out), 'w', encoding='utf-8') as f:
    json.dump(entries, f, ensure_ascii=False, indent=2)
print(f"Saved to {out}")
