#!/usr/bin/env python3
"""
OCR cleanup script for calvijn_preken.json
Fixes systematic OCR artifacts from digitized Calvijn sermons.
"""

import json
import re
import shutil
from pathlib import Path

INPUT_FILE = Path(__file__).parent / "calvijn_preken.json"
BACKUP_FILE = Path(__file__).parent / "calvijn_preken_backup.json"


def fix_i_accent(text: str) -> tuple[str, int]:
    """Replace Í with f — Dutch doesn't use Í, it's a systematic OCR error for 'f'."""
    count = text.count("Í")
    return text.replace("Í", "f"), count


def fix_hyphenation(text: str) -> tuple[str, int]:
    """Remove end-of-line hyphenation: 'woord-\\nvervolg' → 'woordvervolg'."""
    pattern = r"(\w)-\n(\w)"
    matches = re.findall(pattern, text)
    count = len(matches)
    text = re.sub(pattern, r"\1\2", text)
    return text, count


def fix_curly_braces(text: str) -> tuple[str, int]:
    """
    Fix curly braces used as OCR misreads of Dutch letters.
    Context-based replacements:
    - z{jn → zijn, z{j → zij, z{ (end/space) → zij
    - w{ (end/space) → wij
    - h{j → hij, h{l → hij (l misread)
    - \\{oord → Woord, \\{ant → Want, \\{ij → Wij, \\{et → Het (start of sentence after \\)
    - }Ieere → Heere (} = H)
    - Zic}r → Zichz (} = h, context)
    - t{den → tijden
    - pr{s → prijs
    - bekommer{ng → bekommering
    - verkr{gen → verkrijgen
    General fallback: { → ij, } → h (most common misreads)
    """
    count = 0

    # Specific patterns first (most reliable)
    specific = [
        # { as ij
        (r"z\{jn", "zijn"),
        (r"z\{j", "zij"),
        (r"z\{(?=[\s,.\n;:!?]|$)", "zij"),
        (r"w\{(?=[\s,.\n;:!?]|$)", "wij"),
        (r"h\{j", "hij"),
        (r"h\{l(?=[\s,.\n;:!?]|$)", "hij"),
        (r"h\{(?=[\s,.\n;:!?]|$)", "hij"),
        (r"t\{den", "tijden"),
        (r"t\{d(?=[\s,.\n;:!?]|$)", "tijd"),
        (r"pr\{s", "prijs"),
        (r"pr\{zen", "prijzen"),
        (r"verkr\{gen", "verkrijgen"),
        (r"bekommer\{ng", "bekommering"),
        (r"bl\{ven", "blijven"),
        (r"bl\{ft", "blijft"),
        (r"bl\{ken", "blijken"),
        (r"bl\{kt", "blijkt"),
        (r"r\{k", "rijk"),
        (r"kr\{gen", "krijgen"),
        (r"schr\{ven", "schrijven"),
        (r"dr\{ven", "drijven"),
        (r"w\{l", "wil"),  # wil, not wij+l
        (r"w\{ze", "wijze"),
        (r"w\{zen", "wijzen"),
        # } as h
        (r"\}Ieere", "Heere"),
        (r"Zic\}r", "Zichz"),  # Zichzelf context
        (r"zic\}r", "zichz"),
        (r"zic\}", "zich"),
        (r"Zic\}", "Zich"),
    ]

    for pattern, replacement in specific:
        matches_found = len(re.findall(pattern, text))
        if matches_found:
            count += matches_found
            text = re.sub(pattern, replacement, text)

    # Backslash + { at start = capital letter (W, H)
    # \{oord → Woord, \{ant → Want, \{ij → Wij, \{et → Het
    def replace_backslash_brace(m):
        nonlocal count
        count += 1
        after = m.group(1)
        # Most common: W
        return "W" + after

    text = re.sub(r"\\{(\w)", replace_backslash_brace, text)

    # Remaining { → ij (most common Dutch misread)
    remaining_open = len(re.findall(r"\{", text))
    if remaining_open:
        count += remaining_open
        text = text.replace("{", "ij")

    # Remaining } → h
    remaining_close = len(re.findall(r"\}", text))
    if remaining_close:
        count += remaining_close
        text = text.replace("}", "h")

    return text, count


def fix_garbage(text: str) -> tuple[str, int]:
    """
    Remove stray garbage characters that aren't part of normal text.
    Conservative: only remove characters clearly not belonging in Dutch prose.
    """
    count = 0

    # Remove isolated single special chars surrounded by spaces (not part of words)
    # Keep: normal punctuation, Dutch chars, digits
    garbage_pattern = r"(?<=\s)[§¬¢£¤¥¦¨©®°±²³µ¶·¸¹º¼½¾¿×÷](?=\s)"
    matches = re.findall(garbage_pattern, text)
    count += len(matches)
    text = re.sub(garbage_pattern, "", text)

    # Clean up multiple spaces left behind
    before_len = len(text)
    text = re.sub(r"  +", " ", text)

    return text, count


def main():
    # Read input
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} sermons from {INPUT_FILE.name}")

    # Create backup
    shutil.copy2(INPUT_FILE, BACKUP_FILE)
    print(f"Backup created: {BACKUP_FILE.name}")

    # Track totals
    totals = {
        "I-accent -> f": 0,
        "hyphenation": 0,
        "curly braces": 0,
        "garbage chars": 0,
    }

    for i, item in enumerate(data):
        if "text" not in item:
            continue

        text = item["text"]

        text, n = fix_i_accent(text)
        totals["I-accent -> f"] += n

        text, n = fix_hyphenation(text)
        totals["hyphenation"] += n

        text, n = fix_curly_braces(text)
        totals["curly braces"] += n

        text, n = fix_garbage(text)
        totals["garbage chars"] += n

        item["text"] = text

    # Write result
    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Summary
    print("\n=== OCR Cleanup Summary ===")
    total_fixes = 0
    for fix_type, count in totals.items():
        print(f"  {fix_type}: {count} replacements")
        total_fixes += count
    print(f"  ---------------------")
    print(f"  Total: {total_fixes} fixes applied")
    print(f"\nCleaned file written to: {INPUT_FILE.name}")


if __name__ == "__main__":
    main()
