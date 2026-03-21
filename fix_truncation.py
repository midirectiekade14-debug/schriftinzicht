#!/usr/bin/env python3
"""
Fix Truncatie — Verwijder [:8000] en [:5000] limieten uit parse/scrape scripts.

Maakt backups van elk bestand VOOR wijziging.
Rollback: python fix_truncation.py --rollback
Dry-run:  python fix_truncation.py --dry-run
"""

import re
import sys
import shutil
from pathlib import Path

BASE = Path(__file__).parent

# Bestanden en hun truncatie-patronen
# Format: (relatief pad, [(regex_pattern, replacement), ...])
FIXES = [
    # --- [:8000] bestanden ---
    ("parse_remaining.py", [
        (r'\btext\[:8000\]', 'text'),
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("parse_extra.py", [
        (r'\btext\[:8000\]', 'text'),
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("parse_all_docx.py", [
        (r'\btext\[:8000\]', 'text'),
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("parse_calvijn_nl.py", [
        (r'\bt\[:8000\]', 't'),
    ]),
    ("parse_dacosta.py", [
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("parse_smijtegelt.py", [
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("parse_spurgeon_extra.py", [
        (r'\btext\[:8000\]', 'text'),
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("ocr_calvijn_nl.py", [
        (r'\bt\[:8000\]', 't'),
    ]),
    ("reparse_ocr.py", [
        (r'\bt\[:8000\]', 't'),
    ]),
    ("scrape_calvijn_psalmen.py", [
        (r'\bbody\[:8000\]', 'body'),
    ]),
    ("scrape_luther_galaten.py", [
        (r'\bbody\[:8000\]', 'body'),
    ]),
    # --- [:5000] bestanden ---
    ("scrape_spurgeon.py", [
        (r'\bjoined\[:5000\]', 'joined'),
        (r'\bfull_text\[:5000\]', 'full_text'),
    ]),
    ("scrape_tier34.py", [
        (r'\bverse_text\[:5000\]', 'verse_text'),
    ]),
    # --- scrape_dachsel_studylight.py: speciale truncatie met ellipsis ---
    ("scrape_dachsel_studylight.py", []),  # handled separately
]

# Bestanden die NIET gewijzigd worden (find_ref lookups):
# - parse_sermons.py (find_ref calls)
# - parse_sermons_extra.py (find_ref calls)


def fix_dachsel(content):
    """Verwijder het 8000-char cap blok in scrape_dachsel_studylight.py."""
    # Remove the 3-line block: comment + if + truncation
    pattern = r'\n\s*# Cap at 8000 chars\n\s*if len\(text\) > 8000:\n\s*text = text\[:8000\] \+ "\.\.\."'
    new = re.sub(pattern, '', content)
    return new


def get_backup_path(path):
    return path.with_suffix('.py.backup')


def do_fix(dry_run=False):
    total_changes = 0

    for rel_path, patterns in FIXES:
        fpath = BASE / rel_path
        if not fpath.exists():
            print(f"  SKIP (niet gevonden): {rel_path}")
            continue

        content = fpath.read_text(encoding='utf-8')
        original = content

        if rel_path == "scrape_dachsel_studylight.py":
            content = fix_dachsel(content)

        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)

        if content != original:
            changes = []
            orig_lines = original.splitlines()
            new_lines = content.splitlines()

            # Find changed lines
            for i, (ol, nl) in enumerate(zip(orig_lines, new_lines)):
                if ol != nl:
                    changes.append((i + 1, ol.strip(), nl.strip()))

            # Lines removed (dachsel block)
            if len(orig_lines) != len(new_lines):
                changes.append((0, f"({len(orig_lines) - len(new_lines)} regels verwijderd)", ""))

            if dry_run:
                print(f"\n  {rel_path}:")
                for lnum, old, new in changes:
                    if lnum > 0:
                        print(f"    r{lnum}: {old}")
                        print(f"        → {new}")
                    else:
                        print(f"    {old}")
            else:
                backup = get_backup_path(fpath)
                shutil.copy2(fpath, backup)
                fpath.write_text(content, encoding='utf-8')
                print(f"  ✓ {rel_path} ({len(changes)} wijziging(en), backup: {backup.name})")

            total_changes += len(changes)
        else:
            print(f"  - {rel_path}: geen wijzigingen nodig")

    return total_changes


def do_rollback():
    restored = 0
    for rel_path, _ in FIXES:
        fpath = BASE / rel_path
        backup = get_backup_path(fpath)
        if backup.exists():
            shutil.copy2(backup, fpath)
            backup.unlink()
            print(f"  ✓ Hersteld: {rel_path}")
            restored += 1
    return restored


def main():
    args = sys.argv[1:]

    if '--rollback' in args:
        print("🔄 Rollback truncatie-fixes...")
        n = do_rollback()
        print(f"\n{n} bestanden hersteld.")
        return

    dry_run = '--dry-run' in args
    label = "DRY-RUN" if dry_run else "FIX"

    print(f"🔧 {label}: Truncatie-limieten verwijderen uit parse/scrape scripts\n")
    n = do_fix(dry_run=dry_run)

    if dry_run:
        print(f"\n📊 {n} wijzigingen gevonden (niet toegepast)")
    else:
        print(f"\n✅ {n} wijzigingen toegepast")
        print("💾 Rollback: python fix_truncation.py --rollback")


if __name__ == '__main__':
    main()
