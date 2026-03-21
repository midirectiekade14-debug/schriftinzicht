#!/usr/bin/env python3
"""
Remove duplicate commentaries: same author_id + verse_id + scope.
Keeps the record with the longest commentary_text, deletes the rest.
"""

import requests
import time
from collections import defaultdict

SUPABASE_URL = "https://mkwqiqssuhunbhvwrsdt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

# (author_id, scope) combos with known duplicates
TARGETS = [
    (2, "verse"),       # Calvijn: 1013 excess
    (10, "verse"),      # Henry: 477 excess
    (10, "passage"),    # Henry: 2220 excess
    (15, "verse"),      # Dachsel: 49043 excess
]


def fetch_all(author_id, scope):
    """Fetch all commentaries for author+scope, paginated."""
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/commentaries"
            f"?author_id=eq.{author_id}&scope=eq.{scope}"
            f"&select=id,verse_id,commentary_text"
            f"&order=verse_id.asc,id.asc"
            f"&offset={offset}&limit={limit}"
        )
        resp = requests.get(url, headers=HEADERS)
        data = resp.json()
        if not data:
            break
        all_rows.extend(data)
        if len(data) < limit:
            break
        offset += limit
    return all_rows


def delete_ids(ids):
    """Delete records by ID in batches of 100."""
    deleted = 0
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch = ids[i:i + batch_size]
        # Use IN filter
        id_list = ",".join(str(x) for x in batch)
        url = f"{SUPABASE_URL}/rest/v1/commentaries?id=in.({id_list})"
        resp = requests.delete(url, headers=HEADERS)
        if resp.ok:
            deleted += len(batch)
        else:
            print(f"    DELETE FAILED batch {i}: {resp.status_code} {resp.text[:200]}")
        if i % 1000 == 0 and i > 0:
            print(f"    ... deleted {deleted}/{len(ids)}")
            time.sleep(0.1)
    return deleted


def cleanup(author_id, scope):
    print(f"\n{'='*60}")
    print(f"Cleaning author_id={author_id} scope={scope}")
    print(f"{'='*60}")

    rows = fetch_all(author_id, scope)
    print(f"  Fetched {len(rows)} records")

    # Group by verse_id
    by_verse = defaultdict(list)
    for r in rows:
        by_verse[r["verse_id"]].append(r)

    ids_to_delete = []
    for vid, recs in by_verse.items():
        if len(recs) <= 1:
            continue
        # Keep the one with the longest text
        recs.sort(key=lambda r: len(r["commentary_text"] or ""), reverse=True)
        keeper = recs[0]
        for r in recs[1:]:
            ids_to_delete.append(r["id"])

    print(f"  Found {len(ids_to_delete)} records to delete (keeping longest per verse)")

    if ids_to_delete:
        deleted = delete_ids(ids_to_delete)
        print(f"  Deleted: {deleted}")
    else:
        print(f"  Nothing to clean!")


if __name__ == "__main__":
    total = 0
    for author_id, scope in TARGETS:
        cleanup(author_id, scope)

    print("\n\nDone! Run audit_duplicates.py again to verify.")
