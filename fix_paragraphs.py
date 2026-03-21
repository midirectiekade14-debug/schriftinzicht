#!/usr/bin/env python3
"""
Fix Alinea-breaks — Voeg \\n\\n toe aan entries met extreem lange tekstblokken.

Alleen entries waar text >2000 chars EN <3 paragraph breaks.
Maakt backups van elk JSON-bestand VOOR wijziging.

Rollback: python fix_paragraphs.py --rollback
Dry-run:  python fix_paragraphs.py --dry-run
"""

import json
import sys
import shutil
from pathlib import Path

BASE = Path(__file__).parent

TARGET_FILES = [
    "boston.json",
    "boston_extra.json",
    "brakel.json",
    "brakel_extra.json",
    "brakel_extra2.json",
    "brakel_remaining.json",
    "bunyan.json",
    "bunyan_extra.json",
    "bunyan_extra2.json",
    "bunyan_remaining.json",
]

MAX_GROUP_CHARS = 800
MIN_TEXT_LENGTH = 2000
MIN_PARAGRAPH_BREAKS = 3


def needs_fix(text):
    """Check of een tekst alinea-breaks nodig heeft."""
    if len(text) < MIN_TEXT_LENGTH:
        return False
    paragraph_breaks = text.count('\n\n')
    return paragraph_breaks < MIN_PARAGRAPH_BREAKS


def add_paragraph_breaks(text):
    """Voeg alinea-breaks toe aan een lange tekst zonder voldoende breaks."""
    if not needs_fix(text):
        return text

    # Behoud bestaande \n\n secties
    sections = text.split('\n\n')
    result_sections = []

    for section in sections:
        if len(section) < MIN_TEXT_LENGTH:
            result_sections.append(section)
            continue

        # Split op enkele newlines
        lines = section.split('\n')
        if len(lines) < 3:
            result_sections.append(section)
            continue

        # Groepeer opeenvolgende regels tot alinea's van ~800 chars
        groups = []
        current_group = []
        current_len = 0

        for line in lines:
            line_len = len(line)
            if current_group and (current_len + line_len > MAX_GROUP_CHARS):
                groups.append('\n'.join(current_group))
                current_group = [line]
                current_len = line_len
            else:
                current_group.append(line)
                current_len += line_len

        if current_group:
            groups.append('\n'.join(current_group))

        # Alleen splitsen als we meerdere groepen hebben
        if len(groups) > 1:
            result_sections.append('\n\n'.join(groups))
        else:
            result_sections.append(section)

    return '\n\n'.join(result_sections)


def get_backup_path(path):
    return path.with_suffix('.json.backup')


def process_file(fpath, dry_run=False):
    """Verwerk een JSON-bestand en fix alinea-breaks."""
    if not fpath.exists():
        print(f"  SKIP (niet gevonden): {fpath.name}")
        return 0

    with open(fpath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"  SKIP (geen array): {fpath.name}")
        return 0

    fixed_count = 0
    for entry in data:
        text = entry.get('text', '')
        if needs_fix(text):
            new_text = add_paragraph_breaks(text)
            if new_text != text:
                if not dry_run:
                    entry['text'] = new_text
                fixed_count += 1

    if fixed_count > 0 and not dry_run:
        backup = get_backup_path(fpath)
        # Backup origineel
        shutil.copy2(fpath, backup)
        # Schrijf gefixt bestand
        with open(fpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return fixed_count


def do_fix(dry_run=False):
    total = 0
    for fname in TARGET_FILES:
        fpath = BASE / fname
        n = process_file(fpath, dry_run=dry_run)
        label = "zou fixen" if dry_run else "gefixed"
        if n > 0:
            print(f"  {'📋' if dry_run else '✓'} {fname}: {n} entries {label}")
        else:
            print(f"  - {fname}: geen entries om te fixen")
        total += n
    return total


def do_rollback():
    restored = 0
    for fname in TARGET_FILES:
        fpath = BASE / fname
        backup = get_backup_path(fpath)
        if backup.exists():
            shutil.copy2(backup, fpath)
            backup.unlink()
            print(f"  ✓ Hersteld: {fname}")
            restored += 1
    return restored


def show_stats(dry_run=False):
    """Toon statistieken over entries die alinea-breaks nodig hebben."""
    print("\n📊 Statistieken lange teksten zonder alinea-breaks:\n")
    for fname in TARGET_FILES:
        fpath = BASE / fname
        if not fpath.exists():
            continue
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, list):
            continue

        needs = [e for e in data if needs_fix(e.get('text', ''))]
        if needs:
            lengths = [len(e['text']) for e in needs]
            print(f"  {fname}: {len(needs)} entries, "
                  f"gem. {sum(lengths)//len(lengths)} chars, "
                  f"max {max(lengths)} chars")


def main():
    args = sys.argv[1:]

    if '--rollback' in args:
        print("🔄 Rollback alinea-fixes...")
        n = do_rollback()
        print(f"\n{n} bestanden hersteld.")
        return

    dry_run = '--dry-run' in args
    label = "DRY-RUN" if dry_run else "FIX"

    print(f"🔧 {label}: Alinea-breaks toevoegen aan lange tekstblokken\n")
    n = do_fix(dry_run=dry_run)

    if dry_run:
        show_stats()
        print(f"\n📊 {n} entries zouden gefixed worden (niet toegepast)")
    else:
        print(f"\n✅ {n} entries gefixed")
        print("💾 Rollback: python fix_paragraphs.py --rollback")


if __name__ == '__main__':
    main()
