#!/usr/bin/env python3
"""
Fix garbled Hebrew text in Calvijn commentary records.
The PDFs contained Hebrew with RTL embeddings, but pdftotext produced mojibake.
Strategy: detect garbled Hebrew sequences and either fix encoding or strip them cleanly.
"""

import requests
import re
import time

SUPABASE_URL = "https://mkwqiqssuhunbhvwrsdt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def fetch_affected(author_id=2):
    """Fetch all records with garbled Hebrew (RTL embedding chars)."""
    all_rows = []
    offset = 0
    while True:
        # The RTL embedding char U+202B appears in garbled form
        url = (
            f"{SUPABASE_URL}/rest/v1/commentaries"
            f"?author_id=eq.{author_id}"
            f"&select=id,commentary_text"
            f"&order=id"
            f"&offset={offset}&limit=1000"
        )
        resp = requests.get(url, headers=HEADERS)
        data = resp.json()
        if not data:
            break
        for row in data:
            text = row.get("commentary_text", "") or ""
            # Check for garbled Hebrew patterns:
            # RTL marks show up as \u202b, \u202c, or garbled sequences with \xd7 (Hebrew letter prefix)
            if "\u202b" in text or "\u202c" in text:
                all_rows.append(row)
            elif re.search(r'[\u0590-\u05FF]', text):
                all_rows.append(row)
            # Also check for mojibake pattern: sequences of latin chars that look like mis-decoded Hebrew
            elif re.search(r'\xd7[\x90-\xbf]', text):
                all_rows.append(row)
        if len(data) < 1000:
            break
        offset += 1000
    return all_rows


def try_fix_hebrew(text):
    """
    Try to fix garbled Hebrew by re-encoding.
    The text contains UTF-8 bytes that were decoded as cp1252/latin-1.
    We try to reverse this: encode back to cp1252, then decode as UTF-8.
    """
    # Pattern: RTL embedding (U+202B) ... Hebrew chars ... POP (U+202C)
    # These appear garbled as various sequences

    # Strategy 1: Find RTL embedded sections and try to fix them
    # U+202B = RIGHT-TO-LEFT EMBEDDING, U+202C = POP DIRECTIONAL FORMATTING

    def fix_section(match):
        section = match.group(0)
        try:
            # Try encoding as latin-1 and decoding as UTF-8
            fixed = section.encode('cp1252').decode('utf-8')
            return fixed
        except (UnicodeDecodeError, UnicodeEncodeError):
            try:
                fixed = section.encode('latin-1').decode('utf-8')
                return fixed
            except (UnicodeDecodeError, UnicodeEncodeError):
                # Can't fix, strip it
                return ''

    # Try to find and fix garbled sections
    # Look for the RTL marks and surrounding content
    result = text

    # First try: sections between RTL marks
    if '\u202b' in result:
        parts = []
        i = 0
        while i < len(result):
            if result[i] == '\u202b':
                # Find end of RTL section
                end = result.find('\u202c', i)
                if end == -1:
                    end = min(i + 50, len(result))
                section = result[i:end+1]
                try:
                    fixed = section.encode('cp1252').decode('utf-8')
                    parts.append(fixed)
                except:
                    # Strip garbled section, leave empty or placeholder
                    parts.append('')
                i = end + 1
            else:
                parts.append(result[i])
                i += 1
        result = ''.join(parts)

    # Clean up remaining issues
    # Strip any remaining RTL/LTR control characters
    result = re.sub(r'[\u200e\u200f\u202a-\u202e\u2066-\u2069]', '', result)

    # Clean up any remaining isolated Hebrew niqqud/cantillation that are orphaned
    result = re.sub(r'[\u0591-\u05c7]+(?!\w)', '', result)

    # Clean up double spaces and space-comma issues from removed content
    result = re.sub(r'  +', ' ', result)
    result = re.sub(r' ,', ',', result)
    result = re.sub(r'\(\s*\)', '', result)  # empty parens

    return result


def clean_garbled_hebrew(text):
    """
    Clean approach: detect garbled Hebrew sequences and replace with
    properly formatted Hebrew or strip if unrecoverable.
    """
    result = text

    # Pattern 1: RTL embedded sections (U+202B ... U+202C)
    # Try to recover the Hebrew
    def recover_rtl_section(m):
        inner = m.group(1)
        try:
            # The inner text is Hebrew chars that may be valid
            # Check if they're actual Hebrew
            if re.search(r'[\u0590-\u05FF]', inner):
                # Hebrew chars are present, just strip the RTL marks
                cleaned = re.sub(r'[\u200e\u200f\u202a-\u202e]', '', inner).strip()
                if cleaned:
                    return cleaned
        except:
            pass
        return ''

    result = re.sub(r'\u202b(.*?)\u202c', recover_rtl_section, result, flags=re.DOTALL)

    # Pattern 2: Remaining garbled sequences with high-byte Latin chars that are mojibake
    # Detect sequences of Latin chars > 127 that don't form valid words
    def fix_mojibake_chunk(m):
        chunk = m.group(0)
        try:
            fixed = chunk.encode('cp1252').decode('utf-8')
            if re.search(r'[\u0590-\u05FF]', fixed):
                # Successfully recovered Hebrew
                return fixed.strip()
            return chunk  # Not Hebrew, keep as is
        except:
            return chunk

    # Match sequences with characteristic mojibake bytes
    result = re.sub(r'(?:[\xc0-\xff][\x80-\xbf]+[\xc0-\xff\x80-\xbf]*){2,}', fix_mojibake_chunk, result)

    # Final cleanup
    result = re.sub(r'[\u200e\u200f\u202a-\u202e\u2066-\u2069]', '', result)
    result = re.sub(r'  +', ' ', result)

    return result


def main():
    print("Scanning for records with garbled Hebrew...")
    rows = fetch_affected()
    print(f"Found {len(rows)} records to fix")

    if not rows:
        print("No records need fixing!")
        return

    fixed_count = 0
    for row in rows:
        text = row["commentary_text"] or ""

        # Try to fix
        fixed = clean_garbled_hebrew(text)

        if fixed != text:
            # Show diff for first few
            if fixed_count < 3:
                # Find the first difference
                for i in range(min(len(text), len(fixed))):
                    if i < len(text) and i < len(fixed) and text[i] != fixed[i]:
                        ctx_before = text[max(0,i-20):i+30]
                        ctx_after = fixed[max(0,i-20):i+30]
                        print(f"\n  Record {row['id']}:")
                        print(f"    Before: ...{ctx_before}...")
                        print(f"    After:  ...{ctx_after}...")
                        break

            # Update in database
            url = f"{SUPABASE_URL}/rest/v1/commentaries?id=eq.{row['id']}"
            resp = requests.patch(url, headers=HEADERS, json={"commentary_text": fixed})
            if resp.ok:
                fixed_count += 1
            else:
                print(f"  FAILED to update {row['id']}: {resp.status_code}")

        if fixed_count % 50 == 0 and fixed_count > 0:
            print(f"  ... fixed {fixed_count}")
            time.sleep(0.1)

    print(f"\nDone! Fixed {fixed_count} records out of {len(rows)} scanned")


if __name__ == "__main__":
    main()
