"""
Luther dedup: merge luther_full.json and luther_galaten_online.json.
For overlapping verses (same book+chapter+verse), keep the galaten_online version (cleaner formatting).
"""
import json
import shutil
from pathlib import Path

BASE = Path(__file__).parent

full_path = BASE / "luther_full.json"
online_path = BASE / "luther_galaten_online.json"

# Backups
shutil.copy2(full_path, BASE / "luther_full_backup.json")
shutil.copy2(online_path, BASE / "luther_galaten_online_backup.json")
print("Backups created.")

with open(full_path, "r", encoding="utf-8") as f:
    full_data = json.load(f)
with open(online_path, "r", encoding="utf-8") as f:
    online_data = json.load(f)

print(f"luther_full.json: {len(full_data)} items")
print(f"luther_galaten_online.json: {len(online_data)} items")

def make_key(item):
    return (item["book"], item["chapter"], item["verse"])

# Index online items by key (preferred source for overlaps)
online_by_key = {}
for item in online_data:
    online_by_key[make_key(item)] = item

# Build merged: start with all online items, then add non-overlapping full items
merged = {}
from_online = 0
from_full = 0
overlaps = 0

# Add all online items first (preferred)
for item in online_data:
    key = make_key(item)
    merged[key] = item
    from_online += 1

# Add full items only if not already present
for item in full_data:
    key = make_key(item)
    if key in merged:
        overlaps += 1
    else:
        merged[key] = item
        from_full += 1

# Sort by book, chapter, verse
result = sorted(merged.values(), key=lambda x: (x["book"], x["chapter"], x["verse"]))

print(f"\nOverlaps resolved (kept online version): {overlaps}")
print(f"Unique from luther_galaten_online: {from_online}")
print(f"Unique from luther_full: {from_full}")
print(f"Total merged: {len(result)}")

# Save merged as luther_full.json
with open(full_path, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

# Empty luther_galaten_online.json
with open(online_path, "w", encoding="utf-8") as f:
    json.dump([], f)

print("\nluther_full.json overwritten with merged data.")
print("luther_galaten_online.json emptied to [].")
