"""
SchriftInzicht — Enrich scraped data
=====================================
Voegt book/chapter/verse toe aan gescrapete preken,
en schoont Toetssteen data op.
"""

import json
import re
import os
from pathlib import Path

SCRAPED_DIR = Path(__file__).parent / "scraped"
OUTPUT_DIR = Path(__file__).parent / "scraped" / "enriched"

# Nederlandse bijbelboek-namen en varianten
BOOK_PATTERNS = [
    (r"Genesis|Gen\.", "Genesis"),
    (r"Exodus|Ex\.", "Exodus"),
    (r"Leviticus|Lev\.", "Leviticus"),
    (r"Numeri|Num\.", "Numeri"),
    (r"Deuteronomium|Deut\.", "Deuteronomium"),
    (r"Jozua|Joz\.", "Jozua"),
    (r"Richteren|Richt\.", "Richteren"),
    (r"Ruth", "Ruth"),
    (r"1\s*Samu[eë]l|1\s*Sam\.", "1 Samuël"),
    (r"2\s*Samu[eë]l|2\s*Sam\.", "2 Samuël"),
    (r"1\s*Koningen|1\s*Kon\.", "1 Koningen"),
    (r"2\s*Koningen|2\s*Kon\.", "2 Koningen"),
    (r"1\s*Kronieken|1\s*Kron\.", "1 Kronieken"),
    (r"2\s*Kronieken|2\s*Kron\.", "2 Kronieken"),
    (r"Ezra", "Ezra"),
    (r"Nehemia|Neh\.", "Nehemia"),
    (r"Esther|Esth\.", "Esther"),
    (r"Job", "Job"),
    (r"Psalm(?:en)?|Ps\.", "Psalmen"),
    (r"Spreuken|Spr(?:euken)?\.", "Spreuken"),
    (r"Prediker|Pred\.", "Prediker"),
    (r"Hooglied|Hoogl\.", "Hooglied"),
    (r"Jesaja|Jes\.", "Jesaja"),
    (r"Jeremia|Jer\.", "Jeremia"),
    (r"Klaagliederen|Klaagl\.", "Klaagliederen"),
    (r"Ezech?i[eë]l|Ez\.", "Ezechiël"),
    (r"Dani[eë]l|Dan\.", "Daniël"),
    (r"Hosea|Hos\.", "Hosea"),
    (r"Jo[eë]l", "Joël"),
    (r"Amos", "Amos"),
    (r"Obadja|Ob\.", "Obadja"),
    (r"Jona", "Jona"),
    (r"Micha|Mich\.", "Micha"),
    (r"Nahum|Nah\.", "Nahum"),
    (r"Habakuk|Hab\.", "Habakuk"),
    (r"Zefanja|Zef\.", "Zefanja"),
    (r"Haggai|Hagg?\.", "Haggaï"),
    (r"Zacharia|Zach\.", "Zacharia"),
    (r"Maleachi|Mal\.", "Maleachi"),
    (r"Matthe[uü]s|Matth?\.", "Mattheüs"),
    (r"Markus|Mark?\.", "Markus"),
    (r"Lukas|Luk\.", "Lukas"),
    (r"Johannes|Joh\.", "Johannes"),
    (r"Handelingen|Hand\.", "Handelingen"),
    (r"Romeinen|Rom\.", "Romeinen"),
    (r"1\s*Korinthe|1\s*Kor\.", "1 Korinthe"),
    (r"2\s*Korinthe|2\s*Kor\.", "2 Korinthe"),
    (r"Galaten|Gal\.", "Galaten"),
    (r"Efeze|Ef\.", "Efeze"),
    (r"Filippenzen|Fil\.", "Filippenzen"),
    (r"Kolossenzen|Kol\.", "Kolossenzen"),
    (r"1\s*Thessalonicenzen|1\s*Thess?\.", "1 Thessalonicenzen"),
    (r"2\s*Thessalonicenzen|2\s*Thess?\.", "2 Thessalonicenzen"),
    (r"1\s*Timoth[eë]us|1\s*Tim\.", "1 Timotheüs"),
    (r"2\s*Timoth[eë]us|2\s*Tim\.", "2 Timotheüs"),
    (r"Titus|Tit\.", "Titus"),
    (r"Filemon|Filem\.", "Filemon"),
    (r"Hebree[eë]n|Hebr\.", "Hebreeën"),
    (r"Jakobus|Jak\.", "Jakobus"),
    (r"1\s*Petrus|1\s*Petr?\.", "1 Petrus"),
    (r"2\s*Petrus|2\s*Petr?\.", "2 Petrus"),
    (r"1\s*Johannes|1\s*Joh\.", "1 Johannes"),
    (r"2\s*Johannes|2\s*Joh\.", "2 Johannes"),
    (r"3\s*Johannes|3\s*Joh\.", "3 Johannes"),
    (r"Judas|Jud\.", "Judas"),
    (r"Openbaring(?:en)?|Openb?\.", "Openbaring"),
]


def extract_reference(title: str) -> dict:
    """Extract bijbelreferentie uit een preektitel."""
    result = {"book": None, "chapter": None, "verse": None, "verse_end": None}

    for pattern, book_name in BOOK_PATTERNS:
        # Zoek book + chapter:verse pattern
        full_pattern = rf"(?:{pattern})\s*(\d+)\s*[:.]\s*(\d+)(?:\s*[-–]\s*(\d+))?"
        match = re.search(full_pattern, title, re.IGNORECASE)
        if match:
            result["book"] = book_name
            result["chapter"] = int(match.group(1))
            result["verse"] = int(match.group(2))
            if match.group(3):
                result["verse_end"] = int(match.group(3))
            return result

        # Alleen book + chapter (zonder vers)
        chap_pattern = rf"(?:{pattern})\s+(\d+)"
        match = re.search(chap_pattern, title, re.IGNORECASE)
        if match:
            result["book"] = book_name
            result["chapter"] = int(match.group(1))
            result["verse"] = 1
            return result

    return result


def clean_toetssteen(filepath: Path) -> list:
    """Clean Toetssteen data: verwijder inhoudsopgave items, splits grote items."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    cleaned = []
    for item in data:
        text = item.get("text", "")
        # Skip items korter dan 1000 chars (inhoudsopgave/fragmenten)
        if len(text) < 1000:
            continue

        # Items groter dan 100K chars opsplitsen op dubbele newlines bij kopjes
        if len(text) > 100000:
            # Probeer te splitsen op hoofdstuk-achtige grenzen
            parts = re.split(r"\n\n(?=[A-Z][A-Z\s]{10,}\n)", text)
            if len(parts) > 1:
                for j, part in enumerate(parts):
                    if len(part.strip()) > 500:
                        cleaned.append({
                            "title": f"{item['title']} (deel {j+1})",
                            "text": part.strip(),
                            "source_collection": item.get("source_collection", ""),
                        })
            else:
                cleaned.append(item)
        else:
            cleaned.append(item)

    return cleaned


def enrich_sermons(filepath: Path, author: str) -> list:
    """Voeg bijbelreferenties toe aan preken."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    enriched = []
    matched = 0
    for item in data:
        title = item.get("title", "")
        ref = extract_reference(title)

        enriched.append({
            "title": title,
            "book": ref["book"],
            "chapter": ref["chapter"],
            "verse": ref["verse"],
            "verse_end": ref["verse_end"],
            "text": item.get("text", ""),
            "source_collection": item.get("source_collection", author),
        })

        if ref["book"]:
            matched += 1

    return enriched, matched


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_items = 0
    total_matched = 0

    # Process Toetssteen files
    for deel in [1, 2, 3]:
        fp = SCRAPED_DIR / f"groe-toetssteen-deel-{deel}.json"
        if fp.exists():
            cleaned = clean_toetssteen(fp)
            # Toetssteen is geen preken maar een verhandeling — geen bijbelrefs nodig
            for item in cleaned:
                item["source_collection"] = f"Toetssteen der ware en valse genade, deel {deel}"
            outpath = OUTPUT_DIR / f"groe-toetssteen-deel-{deel}.json"
            with open(outpath, "w", encoding="utf-8") as f:
                json.dump(cleaned, f, ensure_ascii=False, indent=2)
            print(f"[OK] Toetssteen deel {deel}: {len(cleaned)} secties (was {deel})")
            total_items += len(cleaned)

    # Process Smijtegelt files
    smytegelt_files = [
        ("smytegelt-16-predicaties.json", "16 Uitmuntende Predicaties"),
        ("smytegelt-50-keurstoffen.json", "50 Uitnemende Predikaties"),
        ("smytegelt-52-preken-catechismus.json", "Verklaring HC in 52 Preken"),
        ("smytegelt-deel-1.json", "Een Woord op Zijn Tijd, deel 1"),
        ("smytegelt-deel-2.json", "Een Woord op Zijn Tijd, deel 2"),
        ("smytegelt-deel-3.json", "Een Woord op Zijn Tijd, deel 3"),
        ("smytegelt-deel-4.json", "Een Woord op Zijn Tijd, deel 4"),
        ("smytegelt-zestal-leerredenen.json", "Zestal Leerredenen"),
    ]

    for filename, collection in smytegelt_files:
        fp = SCRAPED_DIR / filename
        if fp.exists():
            enriched, matched = enrich_sermons(fp, collection)
            outpath = OUTPUT_DIR / filename
            with open(outpath, "w", encoding="utf-8") as f:
                json.dump(enriched, f, ensure_ascii=False, indent=2)
            print(f"[OK] {filename}: {len(enriched)} preken, {matched}/{len(enriched)} bijbelrefs gevonden")
            total_items += len(enriched)
            total_matched += matched

    print(f"\n[DONE] Totaal: {total_items} items, {total_matched} met bijbelreferenties")
    print(f"[DIR] Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
