"""
Fix Ambrose attribution: sermons_extra_ambrosius.json contains Isaac Ambrose content,
not Ambrosius (church father). Rename to sermons_extra_isaac_ambrose.json.
"""
import json
from pathlib import Path

BASE = Path(__file__).parent

src = BASE / "sermons_extra_ambrosius.json"
dst = BASE / "sermons_extra_isaac_ambrose.json"

with open(src, "r", encoding="utf-8") as f:
    data = json.load(f)

print(f"Read {len(data)} items from sermons_extra_ambrosius.json")

# Write to new file
with open(dst, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Created sermons_extra_isaac_ambrose.json with {len(data)} items")

# Empty original
with open(src, "w", encoding="utf-8") as f:
    json.dump([], f)

print("Emptied sermons_extra_ambrosius.json to []")
print("\nDone! Isaac Ambrose content now correctly attributed.")
