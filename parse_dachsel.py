"""
Parse Dächsel DOCX files into verse-level commentaries.
Output: dachsel_extra.json

The DOCX files use patterns like:
- "HOOFDSTUK N." for chapters
- "Vs. N" or "Vs. N en N." or "Vs. N-N." for verse ranges
"""
import docx, json, os, re, sys

DACHSEL_DIR = os.path.join(os.path.expanduser("~"), "schriftinzicht", "dachsel_docx")
OUTPUT = os.path.join(os.path.expanduser("~"), "schriftinzicht", "dachsel_extra.json")

# Map DOCX filenames to the Bible books they contain
FILE_BOOKS = {
    "1-dachsel-bijbelverklaring-genesis-exodus.docx": ["Genesis", "Exodus"],
    "2-dachsel-bijbelverklaring-leviticus-t-m-deuteronomium.docx": ["Leviticus", "Numeri", "Deuteronomium"],
    "3-dachsel-bijbelverklaring-jozua-t-m-2-samuel.docx": ["Jozua", "Richteren", "Ruth", "1 Samuel", "2 Samuel"],
    "4-dachsel-bijbelverklaring-1-koningen-t-m-esther.docx": ["1 Koningen", "2 Koningen", "1 Kronieken", "2 Kronieken", "Ezra", "Nehemia", "Esther"],
    "5-dachsel-job-t-m-psalm-80.docx": ["Job", "Psalmen"],
    "6-dachsel-psalm-81-t-m-hooglied.docx": ["Psalmen", "Spreuken", "Prediker", "Hooglied"],
    "7-dachsel-jesaja-en-jeremia.docx": ["Jesaja", "Jeremia"],
    "8-dachsel-klaagliederen-t-m-micha.docx": ["Klaagliederen", "Ezechiël", "Daniël", "Hosea", "Joël", "Amos", "Obadja", "Jona", "Micha"],
    "9-dachsel-nahum-t-m-maleachi.docx": ["Nahum", "Habakuk", "Zefanja", "Haggaï", "Zacharia", "Maleachi"],
    "10-dachsel-mattheus.docx": ["Mattheüs"],
    "11-dachsel-markus-lukas.docx": ["Markus", "Lukas"],
    "12-dachsel-johannes.docx": ["Johannes"],
    "13-dachsel-handelingen-t-m-1-korinthe.docx": ["Handelingen", "Romeinen", "1 Korinthe"],
    "14-dachsel-2-korinthe-t-m-hebreeen.docx": ["2 Korinthe", "Galaten", "Efeze", "Filippenzen", "Kolossenzen", "1 Thessalonicenzen", "2 Thessalonicenzen", "1 Timotheüs", "2 Timotheüs", "Titus", "Filemon", "Hebreeën"],
    "15-dachsel-jacobus-t-m-openbaring.docx": ["Jakobus", "1 Petrus", "2 Petrus", "1 Johannes", "2 Johannes", "3 Johannes", "Judas", "Openbaring van Johannes"],
}

# Book name detection patterns (for finding book boundaries in text)
BOOK_PATTERNS = {
    "Genesis": r"(?:GENESIS|HET EERSTE BOEK VAN MOZES)",
    "Exodus": r"(?:EXODUS|HET TWEEDE BOEK VAN MOZES)",
    "Leviticus": r"(?:LEVITICUS|HET DERDE BOEK VAN MOZES)",
    "Numeri": r"(?:NUMERI|HET VIERDE BOEK VAN MOZES)",
    "Deuteronomium": r"(?:DEUTERONOMIUM|HET VIJFDE BOEK VAN MOZES)",
    "Jozua": r"(?:JOZUA|HET BOEK JOZUA)",
    "Richteren": r"(?:RICHTEREN|HET BOEK DER RICHTEREN)",
    "Ruth": r"(?:RUTH|HET BOEK RUTH)",
    "1 Samuel": r"(?:1\s*SAMUEL|HET EERSTE BOEK VAN SAMUEL|I\.\s*SAMUEL)",
    "2 Samuel": r"(?:2\s*SAMUEL|HET TWEEDE BOEK VAN SAMUEL|II\.\s*SAMUEL)",
    "1 Koningen": r"(?:1\s*KONINGEN|HET EERSTE BOEK DER KONINGEN|I\.\s*KONINGEN)",
    "2 Koningen": r"(?:2\s*KONINGEN|HET TWEEDE BOEK DER KONINGEN|II\.\s*KONINGEN)",
    "1 Kronieken": r"(?:1\s*KRONIEKEN|HET EERSTE BOEK DER KRONIEKEN|I\.\s*KRONIEKEN)",
    "2 Kronieken": r"(?:2\s*KRONIEKEN|HET TWEEDE BOEK DER KRONIEKEN|II\.\s*KRONIEKEN)",
    "Ezra": r"(?:EZRA|HET BOEK EZRA)",
    "Nehemia": r"(?:NEHEMIA|HET BOEK NEHEMIA)",
    "Esther": r"(?:ESTHER|HET BOEK ESTHER)",
    "Job": r"(?:JOB|HET BOEK JOB)",
    "Psalmen": r"(?:PSALMEN|HET BOEK DER PSALMEN|PSALM\s)",
    "Spreuken": r"(?:SPREUKEN|DE SPREUKEN VAN SALOMO)",
    "Prediker": r"(?:PREDIKER|HET BOEK PREDIKER)",
    "Hooglied": r"(?:HOOGLIED|HET HOOGLIED)",
    "Jesaja": r"(?:JESAJA|DE PROFEET JESAJA)",
    "Jeremia": r"(?:JEREMIA|DE PROFEET JEREMIA)",
    "Klaagliederen": r"(?:KLAAGLIEDEREN|DE KLAAGLIEDEREN)",
    "Ezechiël": r"(?:EZECHIEL|EZECHIËL|DE PROFEET EZECHIËL)",
    "Daniël": r"(?:DANIEL|DANIËL|DE PROFEET DANIËL)",
    "Hosea": r"(?:HOSEA|DE PROFEET HOSEA)",
    "Joël": r"(?:JOEL|JOËL|DE PROFEET JOËL)",
    "Amos": r"(?:AMOS|DE PROFEET AMOS)",
    "Obadja": r"(?:OBADJA|DE PROFEET OBADJA)",
    "Jona": r"(?:JONA|DE PROFEET JONA)",
    "Micha": r"(?:MICHA|DE PROFEET MICHA)",
    "Nahum": r"(?:NAHUM|DE PROFEET NAHUM)",
    "Habakuk": r"(?:HABAKUK|DE PROFEET HABAKUK)",
    "Zefanja": r"(?:ZEFANJA|DE PROFEET ZEFANJA)",
    "Haggaï": r"(?:HAGGAI|HAGGAÏ|DE PROFEET HAGGAÏ)",
    "Zacharia": r"(?:ZACHARIA|DE PROFEET ZACHARIA)",
    "Maleachi": r"(?:MALEACHI|DE PROFEET MALEACHI)",
    "Mattheüs": r"(?:MATTHEUS|MATTHEÜS|HET EVANGELIE NAAR MATTHEÜS)",
    "Markus": r"(?:MARKUS|HET EVANGELIE NAAR MARKUS)",
    "Lukas": r"(?:LUKAS|HET EVANGELIE NAAR LUKAS)",
    "Johannes": r"(?:JOHANNES|HET EVANGELIE NAAR JOHANNES)",
    "Handelingen": r"(?:HANDELINGEN|DE HANDELINGEN DER APOSTELEN)",
    "Romeinen": r"(?:ROMEINEN|DE BRIEF.*?AAN DE ROMEINEN)",
    "1 Korinthe": r"(?:1\s*KORINTHE|DE EERSTE BRIEF.*?KORINTHE|I\.\s*KORINTHE)",
    "2 Korinthe": r"(?:2\s*KORINTHE|DE TWEEDE BRIEF.*?KORINTHE|II\.\s*KORINTHE)",
    "Galaten": r"(?:GALATEN|DE BRIEF.*?GALATEN)",
    "Efeze": r"(?:EFEZE|DE BRIEF.*?EFEZE)",
    "Filippenzen": r"(?:FILIPPENZEN|DE BRIEF.*?FILIPPENZEN)",
    "Kolossenzen": r"(?:KOLOSSENZEN|DE BRIEF.*?KOLOSSENZEN)",
    "1 Thessalonicenzen": r"(?:1\s*THESSALONICENZEN|DE EERSTE BRIEF.*?THESSALONICENZEN)",
    "2 Thessalonicenzen": r"(?:2\s*THESSALONICENZEN|DE TWEEDE BRIEF.*?THESSALONICENZEN)",
    "1 Timotheüs": r"(?:1\s*TIMOTHEUS|1\s*TIMOTHEÜS|DE EERSTE BRIEF.*?TIMOTH)",
    "2 Timotheüs": r"(?:2\s*TIMOTHEUS|2\s*TIMOTHEÜS|DE TWEEDE BRIEF.*?TIMOTH)",
    "Titus": r"(?:TITUS|DE BRIEF.*?TITUS)",
    "Filemon": r"(?:FILEMON|DE BRIEF.*?FILEMON)",
    "Hebreeën": r"(?:HEBREEEN|HEBREEËN|DE BRIEF.*?HEBREEËN)",
    "Jakobus": r"(?:JAKOBUS|DE BRIEF VAN JAKOBUS)",
    "1 Petrus": r"(?:1\s*PETRUS|DE EERSTE BRIEF VAN PETRUS|I\.\s*PETRUS)",
    "2 Petrus": r"(?:2\s*PETRUS|DE TWEEDE BRIEF VAN PETRUS|II\.\s*PETRUS)",
    "1 Johannes": r"(?:1\s*JOHANNES|DE EERSTE BRIEF VAN JOHANNES|I\.\s*JOHANNES)",
    "2 Johannes": r"(?:2\s*JOHANNES|DE TWEEDE BRIEF VAN JOHANNES|II\.\s*JOHANNES)",
    "3 Johannes": r"(?:3\s*JOHANNES|DE DERDE BRIEF VAN JOHANNES|III\.\s*JOHANNES)",
    "Judas": r"(?:JUDAS|DE BRIEF VAN JUDAS)",
    "Openbaring van Johannes": r"(?:OPENBARING|DE OPENBARING VAN JOHANNES)",
}


def parse_docx(filepath, expected_books):
    """Parse a Dächsel DOCX file and extract verse-level commentaries."""
    doc = docx.Document(filepath)
    paragraphs = [p.text for p in doc.paragraphs]

    results = []
    current_book = None
    current_chapter = None
    current_verse_start = None
    current_verse_end = None
    current_text = []

    for para in paragraphs:
        text = para.strip()
        if not text:
            continue

        # Detect book changes
        for book_name in expected_books:
            pattern = BOOK_PATTERNS.get(book_name, book_name.upper())
            if re.match(pattern, text, re.IGNORECASE):
                # Save current entry
                flush_entry(results, current_book, current_chapter,
                           current_verse_start, current_verse_end, current_text)
                current_book = book_name
                current_chapter = None
                current_verse_start = None
                current_text = []
                break

        # Detect chapter markers: "HOOFDSTUK N." or "Hoofdstuk N"
        ch_match = re.match(r'\s*(?:HOOFDSTUK|Hoofdstuk)\s+(\d+)', text)
        if ch_match:
            flush_entry(results, current_book, current_chapter,
                       current_verse_start, current_verse_end, current_text)
            current_chapter = int(ch_match.group(1))
            current_verse_start = None
            current_text = []
            continue

        # Detect verse markers: "Vs. 1", "Vs. 1 en 2.", "Vs. 1-3.", "I. Vs. 1" etc.
        vs_match = re.match(r'(?:I+V?\.?\s+)?Vs\.\s+(\d+)(?:\s*(?:en|[-–])\s*(\d+))?', text)
        if vs_match:
            flush_entry(results, current_book, current_chapter,
                       current_verse_start, current_verse_end, current_text)
            current_verse_start = int(vs_match.group(1))
            current_verse_end = int(vs_match.group(2)) if vs_match.group(2) else None
            # Include the verse header text as context
            rest = text[vs_match.end():].strip()
            current_text = [rest] if rest else []
            continue

        # Accumulate text for current verse
        if current_book and current_chapter and current_verse_start is not None:
            current_text.append(text)

    # Final flush
    flush_entry(results, current_book, current_chapter,
               current_verse_start, current_verse_end, current_text)

    return results


def flush_entry(results, book, chapter, verse_start, verse_end, text_parts):
    """Save accumulated text as a commentary entry."""
    if not book or not chapter or verse_start is None:
        return
    joined = "\n".join(text_parts).strip()
    # Clean up
    joined = re.sub(r'\n{3,}', '\n\n', joined)
    joined = re.sub(r'[ \t]+', ' ', joined)

    if len(joined) < 20:
        return

    # No text length cap — app handles long texts with paragraph splitting

    entry = {
        "book": book,
        "chapter": chapter,
        "verse": verse_start,
        "verse_end": verse_end,
        "text": joined
    }
    results.append(entry)


def main():
    all_results = []

    for filename, books in sorted(FILE_BOOKS.items()):
        filepath = os.path.join(DACHSEL_DIR, filename)
        if not os.path.exists(filepath):
            print(f"SKIP: {filename} not found")
            continue

        print(f"Parsing {filename}...")
        entries = parse_docx(filepath, books)
        all_results.extend(entries)
        print(f"  -> {len(entries)} entries")

        # Show book breakdown
        book_counts = {}
        for e in entries:
            book_counts[e["book"]] = book_counts.get(e["book"], 0) + 1
        for bk, cnt in book_counts.items():
            print(f"     {bk}: {cnt}")

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=1)
    print(f"\nTotal: {len(all_results)} entries saved to {OUTPUT}")


if __name__ == "__main__":
    main()
