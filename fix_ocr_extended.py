#!/usr/bin/env python3
"""
Fix OCR Extended — Repareer aanvullende OCR-patronen in Calvijn-teksten.

Breidt bestaande OCR-fixes uit (fix_ocr_calvijn_preken.py) met context-aware patronen.
Maakt backups van elk bestand VOOR wijziging.

Rollback: python fix_ocr_extended.py --rollback
Dry-run:  python fix_ocr_extended.py --dry-run
"""

import re
import sys
import shutil
from pathlib import Path

BASE = Path(__file__).parent

TARGET_FILES = [
    "ocr_raw_bergrede_matt5.txt",
    "ocr_raw_ezechiel16.txt",
]


# --- OCR Fix Patronen ---

def apply_ocr_fixes(text):
    """Pas alle OCR-fixpatronen toe op tekst. Retourneert (fixed_text, count_dict)."""
    counts = {}

    def counted_sub(pattern, repl, txt, name, flags=0):
        new_txt, n = re.subn(pattern, repl, txt, flags=flags)
        if n > 0:
            counts[name] = counts.get(name, 0) + n
        return new_txt

    # Specifieke woord-fixes (eerst, voor de generieke patronen)
    text = counted_sub(r'Gin esus', 'Jezus', text, 'Gin esus→Jezus')
    text = counted_sub(r'Seruaalem', 'Jeruzalem', text, 'Seruaalem→Jeruzalem')
    text = counted_sub(r'\bICEERE\b', 'HEERE', text, 'ICEERE→HEERE')
    text = counted_sub(r'ÓSjbelrerklaring', 'Bijbelverklaring', text, 'ÓSjbelrerklaring→Bijbelverklaring')
    text = counted_sub(r'ÖSijbererklaring', 'Bijbelverklaring', text, 'ÖSijbererklaring→Bijbelverklaring')
    text = counted_sub(r'ÓSjbelverklaring', 'Bijbelverklaring', text, 'ÓSjbelverklaring→Bijbelverklaring')
    text = counted_sub(r'\bSohannes\b', 'Johannes', text, 'Sohannes→Johannes')
    text = counted_sub(r'\bSchannes\b', 'Johannes', text, 'Schannes→Johannes')
    text = counted_sub(r'\bCCatrijn\b', 'Calvijn', text, 'CCatrijn→Calvijn')
    text = counted_sub(r'\bSKanaanieten\b', 'Kanaanieten', text, 'SKanaanieten→Kanaanieten')
    text = counted_sub(r'\bCethietische\b', 'Hethietische', text, 'Cethietische→Hethietische')

    # Ó/Ö aan begin woord → B (OCR leest B als Ó/Ö)
    # Maar alleen voor bekende patronen om false positives te voorkomen
    text = counted_sub(r'\bÓ([a-z])', r'B\1', text, 'Ó→B (begin woord)')
    text = counted_sub(r'\bÖ([a-z])', r'B\1', text, 'Ö→B (begin woord)')

    # "Veere" → "Heere" in bijbelse context (na de/den/des/het of aan begin zin)
    text = counted_sub(r'\b(de|den|des|het)\s+Veere\b', r'\1 Heere', text,
                       'Veere→Heere (na lidwoord)', flags=re.IGNORECASE)
    text = counted_sub(r'(?<=\.\s)Veere\b', 'Heere', text, 'Veere→Heere (begin zin)')
    text = counted_sub(r'^Veere\b', 'Heere', text, 'Veere→Heere (begin tekst)', flags=re.MULTILINE)

    # "Cn " → "En " aan begin zin
    text = counted_sub(r'(?<=\.\s)Cn\s', 'En ', text, 'Cn→En (begin zin)')
    text = counted_sub(r'^Cn\s', 'En ', text, 'Cn→En (begin tekst)', flags=re.MULTILINE)

    # "Sk " → niet blind vervangen, te veel false positives
    # Alleen "Sk " aan begin zin waar het "Hij" zou moeten zijn
    # Dit is riskant, dus alleen in heel specifieke gevallen
    text = counted_sub(r'(?<=\.\s)Sk\s+(?=[a-z])', 'Hij ', text, 'Sk→Hij (begin zin)')

    # Vermiste Z voor "alig" → "Zalig"
    text = counted_sub(r'\balig\b', 'Zalig', text, 'alig→Zalig')

    # SDe → De (S-prefix garbage)
    text = counted_sub(r'\bSDe\b', 'De', text, 'SDe→De')

    # Gj → Hij
    text = counted_sub(r'\bGj\b', 'Hij', text, 'Gj→Hij')

    # OMatheis → Mattheüs
    text = counted_sub(r'\bOMatheis\b', 'Mattheüs', text, 'OMatheis→Mattheüs')

    # Mao → Alzo (frequent OCR error in Calvijn)
    text = counted_sub(r'\bMao\b', 'Alzo', text, 'Mao→Alzo')

    return text, counts


def get_backup_path(path):
    ext = path.suffix
    return path.with_suffix(ext + '.backup')


def process_file(fpath, dry_run=False):
    """Verwerk een bestand en pas OCR-fixes toe."""
    if not fpath.exists():
        print(f"  SKIP (niet gevonden): {fpath.name}")
        return {}

    content = fpath.read_text(encoding='utf-8')
    fixed, counts = apply_ocr_fixes(content)

    if fixed != content:
        if not dry_run:
            backup = get_backup_path(fpath)
            shutil.copy2(fpath, backup)
            fpath.write_text(fixed, encoding='utf-8')

    return counts


def do_fix(dry_run=False):
    total_counts = {}

    for fname in TARGET_FILES:
        fpath = BASE / fname
        counts = process_file(fpath, dry_run=dry_run)

        if counts:
            label = "zou fixen" if dry_run else "gefixed"
            total = sum(counts.values())
            print(f"\n  {'📋' if dry_run else '✓'} {fname}: {total} fixes {label}")
            for pattern, n in sorted(counts.items()):
                print(f"      {pattern}: {n}x")
                total_counts[pattern] = total_counts.get(pattern, 0) + n
        else:
            print(f"  - {fname}: geen OCR-patronen gevonden")

    return total_counts


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


def main():
    args = sys.argv[1:]

    if '--rollback' in args:
        print("🔄 Rollback OCR-fixes...")
        n = do_rollback()
        print(f"\n{n} bestanden hersteld.")
        return

    dry_run = '--dry-run' in args
    label = "DRY-RUN" if dry_run else "FIX"

    print(f"🔧 {label}: Extended OCR-patronen fixen in Calvijn-teksten\n")
    counts = do_fix(dry_run=dry_run)

    total = sum(counts.values()) if counts else 0
    if dry_run:
        print(f"\n📊 {total} fixes gevonden (niet toegepast)")
    else:
        print(f"\n✅ {total} fixes toegepast")
        print("💾 Rollback: python fix_ocr_extended.py --rollback")


if __name__ == '__main__':
    main()
