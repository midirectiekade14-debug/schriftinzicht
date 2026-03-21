#!/usr/bin/env python3
"""Audit commentaries table for duplicates: same author_id + verse_id with multiple records."""

import requests
import json
from collections import defaultdict

SUPABASE_URL = "https://mkwqiqssuhunbhvwrsdt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

AUTHORS = {
    2: "Calvijn",
    10: "Henry",
    15: "Dachsel",
}

def fetch_all(author_id, scope):
    """Fetch all commentaries for an author+scope, paginated."""
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/commentaries"
            f"?author_id=eq.{author_id}&scope=eq.{scope}"
            f"&select=id,verse_id,scope,commentary_text"
            f"&order=verse_id.asc"
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

def analyze_duplicates(author_id, name):
    print(f"\n{'='*60}")
    print(f"AUDIT: {name} (author_id={author_id})")
    print(f"{'='*60}")

    for scope in ["verse", "passage", "book"]:
        rows = fetch_all(author_id, scope)
        if not rows:
            continue

        # Group by verse_id
        by_verse = defaultdict(list)
        for r in rows:
            by_verse[r["verse_id"]].append(r)

        dups = {vid: recs for vid, recs in by_verse.items() if len(recs) > 1}

        print(f"\n  scope={scope}: {len(rows)} records, {len(by_verse)} unique verses, {len(dups)} verses with duplicates")

        if dups:
            # Show first 5 examples
            dup_total = sum(len(recs) - 1 for recs in dups.values())
            print(f"  -> {dup_total} excess records to remove")

            for vid, recs in list(dups.items())[:5]:
                print(f"\n    verse_id={vid}: {len(recs)} records")
                for r in recs:
                    txt = (r["commentary_text"] or "")[:80].replace("\n", " ")
                    print(f"      id={r['id']} [{len(r['commentary_text'] or '')} chars] {txt}...")

def check_all_authors_all_scopes():
    """Check ALL authors for duplicates, not just the big 3."""
    print(f"\n{'='*60}")
    print(f"FULL AUDIT: All authors, all scopes")
    print(f"{'='*60}")

    # Get all distinct author_ids
    url = f"{SUPABASE_URL}/rest/v1/authors?select=id,name&order=id"
    resp = requests.get(url, headers=HEADERS)
    authors = resp.json()

    total_excess = 0
    for author in authors:
        aid = author["id"]
        aname = author["name"]
        for scope in ["verse", "passage", "book"]:
            rows = fetch_all(aid, scope)
            if not rows:
                continue
            by_verse = defaultdict(list)
            for r in rows:
                by_verse[r["verse_id"]].append(r)
            dups = {vid: recs for vid, recs in by_verse.items() if len(recs) > 1}
            if dups:
                excess = sum(len(recs) - 1 for recs in dups.values())
                total_excess += excess
                print(f"  {aname} (id={aid}) scope={scope}: {len(dups)} verses with dups, {excess} excess records")

    print(f"\n  TOTAAL: {total_excess} overtollige records over alle auteurs")

if __name__ == "__main__":
    # Detailed audit for the 3 main authors
    for aid, name in AUTHORS.items():
        analyze_duplicates(aid, name)

    # Quick check all authors
    check_all_authors_all_scopes()
