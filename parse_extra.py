#!/usr/bin/env python3
"""Parse additional DOCX files for various authors."""
import docx, re, json, sys, io, os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path("C:/Users/midir/schriftinzicht")

# ─── Book mapping (compact) ─────────────────────────────────────────────────
BOOK_MAP = {}
_entries = [
    (["genesis", "gen", "gen."], "Genesis"), (["exodus", "ex", "ex."], "Exodus"),
    (["leviticus", "lev"], "Leviticus"), (["numeri", "num"], "Numeri"),
    (["deuteronomium", "deut", "deut."], "Deuteronomium"),
    (["jozua", "joz"], "Jozua"), (["richteren", "richt"], "Richteren"),
    (["ruth"], "Ruth"), (["1 samuel", "1 sam", "1 sam."], "1 Samuel"),
    (["2 samuel", "2 sam", "2 sam."], "2 Samuel"),
    (["1 koningen", "1 kon"], "1 Koningen"), (["2 koningen", "2 kon"], "2 Koningen"),
    (["1 kronieken", "1 kron"], "1 Kronieken"), (["2 kronieken", "2 kron"], "2 Kronieken"),
    (["ezra", "ezr"], "Ezra"), (["nehemia", "neh"], "Nehemia"),
    (["esther", "est"], "Esther"), (["job"], "Job"),
    (["psalmen", "psalm", "ps", "ps."], "Psalmen"),
    (["spreuken", "spr"], "Spreuken"), (["prediker", "pred"], "Prediker"),
    (["hooglied", "hoogl"], "Hooglied"),
    (["jesaja", "jes", "jes."], "Jesaja"), (["jeremia", "jer", "jer."], "Jeremia"),
    (["klaagliederen", "klaagl"], "Klaagliederen"),
    (["ezechiël", "ezechiel", "ez", "ez."], "Ezechiël"),
    (["daniël", "daniel", "dan", "dan."], "Daniël"),
    (["hosea", "hos"], "Hosea"), (["joël", "joel"], "Joël"),
    (["amos", "am"], "Amos"), (["obadja", "ob"], "Obadja"),
    (["jona", "jon"], "Jona"), (["micha", "mi"], "Micha"),
    (["nahum", "nah"], "Nahum"), (["habakuk", "hab"], "Habakuk"),
    (["zefanja", "zef"], "Zefanja"), (["haggaï", "haggai", "hag"], "Haggaï"),
    (["zacharia", "zach"], "Zacharia"), (["maleachi", "mal"], "Maleachi"),
    (["mattheüs", "mattheus", "matt", "matt.", "matth", "matth."], "Mattheüs"),
    (["markus", "marcus", "mark", "mark."], "Markus"),
    (["lukas", "lucas", "luk", "luk.", "luc"], "Lukas"),
    (["johannes", "joh", "joh."], "Johannes"),
    (["handelingen", "hand", "hand."], "Handelingen"),
    (["romeinen", "rom", "rom."], "Romeinen"),
    (["1 korinthe", "1 kor", "1 kor.", "1 cor"], "1 Korinthe"),
    (["2 korinthe", "2 kor", "2 kor.", "2 cor"], "2 Korinthe"),
    (["galaten", "gal", "gal."], "Galaten"),
    (["efeze", "eféze", "ef", "ef."], "Efeze"),
    (["filippenzen", "fil", "fil."], "Filippenzen"),
    (["kolossenzen", "kol", "kol."], "Kolossenzen"),
    (["1 thessalonicenzen", "1 thess"], "1 Thessalonicenzen"),
    (["2 thessalonicenzen", "2 thess"], "2 Thessalonicenzen"),
    (["1 timotheüs", "1 timotheus", "1 tim", "1 tim."], "1 Timotheüs"),
    (["2 timotheüs", "2 timotheus", "2 tim", "2 tim."], "2 Timotheüs"),
    (["titus", "tit"], "Titus"), (["filemon", "filem"], "Filemon"),
    (["hebreeën", "hebreeen", "hebr", "heb"], "Hebreeën"),
    (["jakobus", "jak", "jak."], "Jakobus"),
    (["1 petrus", "1 petr", "1 petr."], "1 Petrus"),
    (["2 petrus", "2 petr", "2 petr."], "2 Petrus"),
    (["1 johannes", "1 joh", "1 joh."], "1 Johannes"),
    (["2 johannes", "2 joh"], "2 Johannes"), (["3 johannes", "3 joh"], "3 Johannes"),
    (["judas", "jud"], "Judas"),
    (["openbaring van johannes", "openbaring", "openb", "openb.", "op"], "Openbaring van Johannes"),
]
for keys, val in _entries:
    for k in keys:
        BOOK_MAP[k] = val

_keys_sorted = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pat = "|".join(re.escape(k) for k in _keys_sorted)
VERSE_RE = re.compile(r'\b(' + _book_pat + r')\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})', re.IGNORECASE)

def resolve_book(name):
    return BOOK_MAP.get(name.lower().strip().rstrip('.'))

def find_ref(text):
    m = VERSE_RE.search(text)
    if m:
        book = resolve_book(m.group(1))
        if book:
            return (book, int(m.group(2)), int(m.group(3)))
    return None

def get_paragraphs(path):
    d = docx.Document(str(path))
    return [(p.style.name if p.style else 'Normal', p.text.strip()) for p in d.paragraphs if p.text.strip()]

def parse_sermon_docx(path):
    paras = get_paragraphs(path)
    entries = []
    title_re = re.compile(r'^(\d{1,3})\.\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÊÂÎÔÛÆŒ]', re.UNICODE)
    sermons = []
    for i, (style, text) in enumerate(paras):
        if i < 20:
            continue
        is_title = style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4') or \
                   (title_re.match(text) and len(text) < 200)
        if is_title:
            ref = find_ref(text)
            if not ref:
                for j in range(i+1, min(i+8, len(paras))):
                    ref = find_ref(paras[j][1])
                    if ref:
                        break
            if ref:
                sermons.append((i, ref))

    for si, (pos, ref) in enumerate(sermons):
        end = sermons[si+1][0] if si+1 < len(sermons) else len(paras)
        body = '\n'.join(paras[j][1] for j in range(pos, min(end, len(paras))))
        if len(body) > 100:
            entries.append({"book": ref[0], "chapter": ref[1], "verse": ref[2], "verse_end": None, "text": body[:8000]})
    return entries

def parse_verse_commentary(path):
    paras = get_paragraphs(path)
    entries = []
    current_ref = None
    body = []
    def flush():
        if current_ref and body:
            text = '\n'.join(body).strip()
            if len(text) > 30:
                entries.append({"book": current_ref[0], "chapter": current_ref[1], "verse": current_ref[2], "verse_end": None, "text": text[:8000]})
    for style, text in paras:
        ref = find_ref(text)
        is_heading = style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4')
        if ref and (is_heading or len(text) < 300):
            if ref != current_ref:
                flush()
                current_ref = ref
                body = [text]
            else:
                body.append(text)
        elif current_ref:
            body.append(text)
    flush()
    return entries

def deduplicate(entries):
    seen = set()
    result = []
    for e in entries:
        key = (e['book'], e['chapter'], e['verse'])
        if key not in seen:
            seen.add(key)
            result.append(e)
    return result

def parse_file(path):
    e = parse_sermon_docx(path)
    if len(e) < 3:
        e = parse_verse_commentary(path)
    return e

# ─── Process files ───────────────────────────────────────────────────────────

files_per_author = {
    'calvijn': (2, ['calvijn_27preken_jeremia.docx', 'calvijn_11preken_1samuel.docx', 'calvijn_kerstpreken.docx']),
    'luther': (1, ['luther_galaten.docx', 'luther_romeinen.docx', 'luther_psalmen.docx']),
    'comrie': (6, ['comrie_11leerredenen.docx', 'comrie_14preken.docx']),
    'hellenbroek': (9, ['hellenbroek_13adventspreken.docx', 'hellenbroek_4keurstoffen.docx']),
    'bunyan': (11, ['bunyan_werken_1.docx', 'bunyan_werken_2.docx']),
    'voetius': (5, ['voetius_preek.docx', 'voetius_troost.docx']),
    'brakel': (4, ['brakel_rgd2.docx']),
}

for author, (aid, files) in files_per_author.items():
    print(f"\n=== {author.upper()} (author_id={aid}) ===")
    entries = []
    for fname in files:
        path = BASE / fname
        if path.exists():
            e = parse_file(path)
            print(f"  {fname}: {len(e)} entries")
            entries.extend(e)
        else:
            print(f"  {fname}: NOT FOUND")
    entries = deduplicate(entries)
    if entries:
        out = BASE / f"{author}_extra2.json"
        with open(str(out), 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"  TOTAL: {len(entries)} -> {out.name}")
    else:
        print(f"  TOTAL: 0 entries")
