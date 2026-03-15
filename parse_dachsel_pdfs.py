"""
SchriftInzicht — PDF Parser: Dächsel Bijbelverklaring
=======================================================
Verwerkt de 16 PDF's van theologienet.nl tot gestructureerde JSON.

Gebruik:
  pip install pymupdf  # of: pip install PyMuPDF
  python parse_dachsel_pdfs.py --input ./pdfs/ --output dachsel.json

Stappen:
  1. Download de 16 PDF's van https://theologienet.nl/auteurs/dachsel-karl-august/
  2. Plaats ze in een map (bijv. ./pdfs/)
  3. Draai dit script

De PDF-bestanden op theologienet.nl heten:
  1-dachsel-bijbelverklaring-genesis-exodus.pdf
  2-dachsel-bijbelverklaring-leviticus-t-m-deuteronomium.pdf
  3-dachsel-bijbelverklaring-jozua-t-m-2-samuel.pdf
  4-dachsel-bijbelverklaring-1-koningen-t-m-esther.pdf
  5-dachsel-bijbelverklaring-job-t-m-psalm-80.pdf
  6-dachsel-bijbelverklaring-psalm-81-t-m-hooglied.pdf
  7-dachsel-bijbelverklaring-jesaja-en-jeremia.pdf
  8-dachsel-bijbelverklaring-klaagliederen-t-m-micha.pdf
  9-dachsel-bijbelverklaring-nahum-t-m-maleachi.pdf
  10-dachsel-mattheus.pdf
  11-dachsel-bijbelverklaring-markus-en-lukas.pdf
  12-dachsel-bijbelverklaring-johannes.pdf
  13-dachsel-bijbelverklaring-handelingen-t-m-1-korinthe.pdf
  14-dachsel-bijbelverklaring-2-korinthe-t-m-hebreeen.pdf
  15-dachsel-bijbelverklaring-jacobus-t-m-openbaring.pdf
  (sommige sites bundelen alles in één groot PDF)
"""

import json
import re
import sys
import os
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("FOUT: PyMuPDF niet gevonden.")
    print("Installeer met: pip install pymupdf")
    sys.exit(1)


# Bijbelboeken met hun verwachte namen in Dächsel
# De spelling in Dächsel kan afwijken — voeg varianten toe
BOOK_PATTERNS = [
    (r"GENESIS|Het eerste boek van Mozes", "Genesis"),
    (r"EXODUS|Het tweede boek van Mozes", "Exodus"),
    (r"LEVITICUS|Het derde boek van Mozes", "Leviticus"),
    (r"NUMERI|Het vierde boek van Mozes", "Numeri"),
    (r"DEUTERONOMIUM|Het vijfde boek van Mozes", "Deuteronomium"),
    (r"JOZUA|Het boek Jozua", "Jozua"),
    (r"RICHTEREN|Het boek der Richteren", "Richteren"),
    (r"RUTH|Het boek Ruth", "Ruth"),
    (r"(?:1|I|EERSTE)\s*SAMU[EË]L", "1 Samuël"),
    (r"(?:2|II|TWEEDE)\s*SAMU[EË]L", "2 Samuël"),
    (r"(?:1|I|EERSTE)\s*KONINGEN", "1 Koningen"),
    (r"(?:2|II|TWEEDE)\s*KONINGEN", "2 Koningen"),
    (r"(?:1|I|EERSTE)\s*KRONIEKEN", "1 Kronieken"),
    (r"(?:2|II|TWEEDE)\s*KRONIEKEN", "2 Kronieken"),
    (r"EZRA", "Ezra"),
    (r"NEHEMIA", "Nehemia"),
    (r"ESTHER", "Esther"),
    (r"JOB", "Job"),
    (r"PSALM(?:EN)?", "Psalmen"),
    (r"SPREUKEN", "Spreuken"),
    (r"PREDIKER", "Prediker"),
    (r"HOOGLIED|HOOGL(?:IED)?\s*VAN\s*SALOMO", "Hooglied"),
    (r"JESAJA|JEZAJA", "Jesaja"),
    (r"JEREMIA", "Jeremia"),
    (r"KLAAGLIEDEREN", "Klaagliederen"),
    (r"EZECHI[EË]L", "Ezechiël"),
    (r"DANI[EË]L", "Daniël"),
    (r"HOSEA", "Hosea"),
    (r"JO[EË]L", "Joël"),
    (r"AMOS", "Amos"),
    (r"OBADJA", "Obadja"),
    (r"JONA", "Jona"),
    (r"MICHA", "Micha"),
    (r"NAHUM", "Nahum"),
    (r"HABAKUK", "Habakuk"),
    (r"ZEFANJA", "Zefanja"),
    (r"HAGGA[IÏ]", "Haggaï"),
    (r"ZACHARIA", "Zacharia"),
    (r"MALEACHI", "Maleachi"),
    (r"MATTHE[UÜ]S|HET EVANGELIE VAN MATTHE", "Mattheüs"),
    (r"MARKUS|HET EVANGELIE VAN MARKUS", "Markus"),
    (r"LUKAS|HET EVANGELIE VAN LUKAS", "Lukas"),
    (r"JOHANNES|HET EVANGELIE VAN JOHANNES", "Johannes"),
    (r"HANDELINGEN", "Handelingen"),
    (r"ROMEINEN", "Romeinen"),
    (r"(?:1|I|EERSTE)\s*KORINTHE", "1 Korinthe"),
    (r"(?:2|II|TWEEDE)\s*KORINTHE", "2 Korinthe"),
    (r"GALATEN", "Galaten"),
    (r"EFEZE|EFEZI[EË]RS", "Efeze"),
    (r"FILIPPENZEN", "Filippenzen"),
    (r"KOLOSSENZEN", "Kolossenzen"),
    (r"(?:1|I|EERSTE)\s*THESSALONICENZEN", "1 Thessalonicenzen"),
    (r"(?:2|II|TWEEDE)\s*THESSALONICENZEN", "2 Thessalonicenzen"),
    (r"(?:1|I|EERSTE)\s*TIMOTHE[UÜ]S", "1 Timotheüs"),
    (r"(?:2|II|TWEEDE)\s*TIMOTHE[UÜ]S", "2 Timotheüs"),
    (r"TITUS", "Titus"),
    (r"FILEMON", "Filemon"),
    (r"HEBRE[EË][EË]N", "Hebreeën"),
    (r"JAKOBUS|JACOBUS", "Jakobus"),
    (r"(?:1|I|EERSTE)\s*PETRUS", "1 Petrus"),
    (r"(?:2|II|TWEEDE)\s*PETRUS", "2 Petrus"),
    (r"(?:1|I|EERSTE)\s*JOHANNES", "1 Johannes"),
    (r"(?:2|II|TWEEDE)\s*JOHANNES", "2 Johannes"),
    (r"(?:3|III|DERDE)\s*JOHANNES", "3 Johannes"),
    (r"JUDAS", "Judas"),
    (r"OPENBARING", "Openbaring"),
]

# Regex voor hoofdstukherkenning
CHAPTER_PATTERN = re.compile(
    r'^(?:HOOFDSTUK|Hoofdstuk|Hfdst\.?|CHAPTER)\s+(\d+)',
    re.MULTILINE
)

# Regex voor versherkenning
# Dächsel gebruikt vaak "V. 1." of "Vs. 1." of gewoon nummers aan het begin
VERSE_PATTERNS = [
    re.compile(r'^[Vv](?:s|ers)?\.?\s*(\d+)\.?\s', re.MULTILINE),
    re.compile(r'^(\d{1,3})[\.\)]\s', re.MULTILINE),
]


def detect_book(text):
    """Detecteer welk bijbelboek in een stuk tekst wordt geïntroduceerd."""
    for pattern, book_name in BOOK_PATTERNS:
        if re.search(pattern, text[:500], re.IGNORECASE):
            return book_name
    return None


def extract_text_from_pdf(pdf_path):
    """Extract alle tekst uit een PDF met PyMuPDF."""
    print(f"  Openen: {pdf_path}")
    doc = fitz.open(pdf_path)
    pages = []
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            pages.append({
                "page": page_num + 1,
                "text": text,
            })
    doc.close()
    print(f"  {len(pages)} pagina's met tekst gevonden")
    return pages


def parse_chapters_and_verses(full_text, book_name):
    """Parse tekst in hoofdstukken en verzen."""
    results = []
    
    # Split op hoofdstukken
    chapter_splits = CHAPTER_PATTERN.split(full_text)
    
    if len(chapter_splits) <= 1:
        # Geen expliciete hoofdstuk-headers gevonden
        # Probeer op basis van versnummering te splitsen
        # (als versnummers teruggaan naar 1, is dat een nieuw hoofdstuk)
        results.append({
            "book": book_name,
            "chapter": 1,
            "text": full_text.strip(),
            "verses": parse_verses(full_text),
        })
        return results
    
    # chapter_splits = [tekst_voor_hfd1, "1", tekst_hfd1, "2", tekst_hfd2, ...]
    for i in range(1, len(chapter_splits), 2):
        chapter_num = int(chapter_splits[i])
        chapter_text = chapter_splits[i + 1] if i + 1 < len(chapter_splits) else ""
        
        verses = parse_verses(chapter_text)
        
        results.append({
            "book": book_name,
            "chapter": chapter_num,
            "text": chapter_text.strip()[:200] + "..." if len(chapter_text) > 200 else chapter_text.strip(),
            "verses": verses,
        })
    
    return results


def parse_verses(text):
    """Parse verzen uit een stuk tekst."""
    verses = []
    
    # Probeer elk vers-patroon
    for pattern in VERSE_PATTERNS:
        splits = pattern.split(text)
        if len(splits) > 2:
            # Gevonden! splits = [tekst_voor_v1, "1", tekst_v1, "2", tekst_v2, ...]
            for i in range(1, len(splits), 2):
                verse_num = int(splits[i])
                verse_text = splits[i + 1].strip() if i + 1 < len(splits) else ""
                
                # Beperk tekst tot een redelijke lengte per vers
                # Dächsel schrijft soms pagina's per vers
                if verse_text:
                    verses.append({
                        "verse": verse_num,
                        "commentary": verse_text,
                    })
            
            if verses:
                break  # Eerste werkend patroon is voldoende
    
    return verses


def process_pdf(pdf_path):
    """Verwerk een enkele PDF tot gestructureerde data."""
    pages = extract_text_from_pdf(pdf_path)
    
    if not pages:
        print(f"  WAARSCHUWING: Geen tekst gevonden in {pdf_path}")
        print(f"  Dit kan een gescande PDF zijn — OCR is dan nodig.")
        return []
    
    # Voeg alle pagina-teksten samen
    full_text = "\n\n".join(p["text"] for p in pages)
    
    # Detecteer welke boeken in deze PDF zitten
    # (sommige PDF's bevatten meerdere bijbelboeken)
    results = []
    current_book = None
    current_text = []
    
    # Split de tekst in blokken per pagina en zoek boek-overgangen
    for page in pages:
        detected_book = detect_book(page["text"])
        
        if detected_book and detected_book != current_book:
            # Nieuw boek gevonden — verwerk het vorige
            if current_book and current_text:
                combined = "\n\n".join(current_text)
                chapters = parse_chapters_and_verses(combined, current_book)
                results.extend(chapters)
                print(f"    Boek: {current_book} → {len(chapters)} hoofdstukken")
            
            current_book = detected_book
            current_text = [page["text"]]
        else:
            current_text.append(page["text"])
    
    # Verwerk het laatste boek
    if current_book and current_text:
        combined = "\n\n".join(current_text)
        chapters = parse_chapters_and_verses(combined, current_book)
        results.extend(chapters)
        print(f"    Boek: {current_book} → {len(chapters)} hoofdstukken")
    
    # Als geen boek gedetecteerd, probeer bestandsnaam
    if not results:
        filename = Path(pdf_path).stem.lower()
        for pattern, book_name in BOOK_PATTERNS:
            if re.search(pattern.lower().replace("|", "|").split("|")[0][:8], filename):
                chapters = parse_chapters_and_verses(full_text, book_name)
                results.extend(chapters)
                break
    
    return results


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Parse Dächsel PDF's naar JSON")
    parser.add_argument("--input", "-i", default="./pdfs/", help="Map met PDF-bestanden")
    parser.add_argument("--output", "-o", default="dachsel.json", help="Output JSON-bestand")
    parser.add_argument("--single", "-s", help="Verwerk slechts één PDF (voor testen)")
    args = parser.parse_args()
    
    print("=" * 60)
    print("SchriftInzicht — Dächsel PDF Parser")
    print("=" * 60)
    
    if args.single:
        pdf_files = [Path(args.single)]
    else:
        input_dir = Path(args.input)
        if not input_dir.exists():
            print(f"FOUT: Map '{input_dir}' bestaat niet.")
            print(f"Download de PDF's eerst van theologienet.nl")
            sys.exit(1)
        
        pdf_files = sorted(input_dir.glob("*.pdf"))
        if not pdf_files:
            print(f"FOUT: Geen PDF-bestanden gevonden in '{input_dir}'")
            sys.exit(1)
    
    print(f"Gevonden: {len(pdf_files)} PDF-bestanden")
    print()
    
    all_results = []
    
    for pdf_path in pdf_files:
        print(f"\nVerwerken: {pdf_path.name}")
        chapters = process_pdf(str(pdf_path))
        all_results.extend(chapters)
    
    # Opslaan
    output_path = Path(args.output)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    
    # Samenvatting
    books = set(ch["book"] for ch in all_results)
    total_verses = sum(len(ch.get("verses", [])) for ch in all_results)
    
    print(f"\n{'=' * 60}")
    print(f"Klaar!")
    print(f"  Boeken:      {len(books)}")
    print(f"  Hoofdstukken: {len(all_results)}")
    print(f"  Verzen:       {total_verses}")
    print(f"  Output:       {output_path}")
    print(f"  Grootte:      {output_path.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"{'=' * 60}")
    
    # Toon welke boeken gevonden zijn
    print(f"\nGevonden boeken:")
    for book in sorted(books):
        count = sum(1 for ch in all_results if ch["book"] == book)
        verses = sum(len(ch.get("verses", [])) for ch in all_results if ch["book"] == book)
        print(f"  {book}: {count} hoofdstukken, {verses} verzen")
    
    # Waarschuwingen
    print(f"\n⚠️  BELANGRIJK:")
    print(f"  - Controleer de output handmatig op parsing-fouten")
    print(f"  - Dächsel gebruikt soms onregelmatige vers-nummering")
    print(f"  - Als er 0 verzen zijn gevonden, moet het vers-patroon aangepast worden")
    print(f"  - Test eerst met --single op één PDF voordat je alles verwerkt")


if __name__ == "__main__":
    main()
