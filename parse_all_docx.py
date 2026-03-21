#!/usr/bin/env python3
"""
Universal DOCX parser for SchriftInzicht.
Extracts Bible verse references and associated commentary text from DOCX files.
"""
import docx, re, json, sys, io, os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path(__file__).parent

# ─── Book name mapping ──────────────────────────────────────────────────────
BOOK_MAP = {}
_entries = [
    (["genesis", "gen", "gen."], "Genesis"),
    (["exodus", "ex", "ex.", "exod"], "Exodus"),
    (["leviticus", "lev", "lev."], "Leviticus"),
    (["numeri", "num", "num."], "Numeri"),
    (["deuteronomium", "deut", "deut."], "Deuteronomium"),
    (["jozua", "joz", "joz."], "Jozua"),
    (["richteren", "richt", "richt.", "ri"], "Richteren"),
    (["ruth"], "Ruth"),
    (["1 samuel", "1 sam", "1 sam.", "1samuel", "i sam"], "1 Samuel"),
    (["2 samuel", "2 sam", "2 sam.", "2samuel", "ii sam"], "2 Samuel"),
    (["1 koningen", "1 kon", "1 kon.", "1koningen", "i kon"], "1 Koningen"),
    (["2 koningen", "2 kon", "2 kon.", "2koningen", "ii kon"], "2 Koningen"),
    (["1 kronieken", "1 kron", "1 kron.", "i kron"], "1 Kronieken"),
    (["2 kronieken", "2 kron", "2 kron.", "ii kron"], "2 Kronieken"),
    (["ezra", "ezr"], "Ezra"),
    (["nehemia", "neh", "neh."], "Nehemia"),
    (["esther", "est", "est."], "Esther"),
    (["job"], "Job"),
    (["psalmen", "psalm", "ps", "ps.", "psa"], "Psalmen"),
    (["spreuken", "spr", "spr."], "Spreuken"),
    (["prediker", "pred", "pred."], "Prediker"),
    (["hooglied", "hoogl", "hoogl."], "Hooglied"),
    (["jesaja", "jes", "jes."], "Jesaja"),
    (["jeremia", "jer", "jer."], "Jeremia"),
    (["klaagliederen", "klaagl", "klaagl."], "Klaagliederen"),
    (["ezechiël", "ezechiel", "ez", "ez.", "ezech"], "Ezechiël"),
    (["daniël", "daniel", "dan", "dan."], "Daniël"),
    (["hosea", "hos", "hos."], "Hosea"),
    (["joël", "joel"], "Joël"),
    (["amos", "am", "am."], "Amos"),
    (["obadja", "ob", "ob."], "Obadja"),
    (["jona", "jon", "jon."], "Jona"),
    (["micha", "mi", "mi.", "mich"], "Micha"),
    (["nahum", "nah", "nah."], "Nahum"),
    (["habakuk", "hab", "hab."], "Habakuk"),
    (["zefanja", "zef", "zef."], "Zefanja"),
    (["haggaï", "haggai", "hag", "hag."], "Haggaï"),
    (["zacharia", "zach", "zach."], "Zacharia"),
    (["maleachi", "mal", "mal."], "Maleachi"),
    (["mattheüs", "mattheus", "matt", "matt.", "matth", "matth."], "Mattheüs"),
    (["markus", "marcus", "mark", "mark.", "marc"], "Markus"),
    (["lukas", "lucas", "luk", "luk.", "luc"], "Lukas"),
    (["johannes", "joh", "joh."], "Johannes"),
    (["handelingen", "hand", "hand."], "Handelingen"),
    (["romeinen", "rom", "rom."], "Romeinen"),
    (["1 korinthe", "1 kor", "1 kor.", "1 cor", "1 korinthiërs", "1korinthiers", "i kor"], "1 Korinthe"),
    (["2 korinthe", "2 kor", "2 kor.", "2 cor", "2 korinthiërs", "2korinthiers", "ii kor"], "2 Korinthe"),
    (["galaten", "gal", "gal."], "Galaten"),
    (["efeze", "eféze", "ef", "ef."], "Efeze"),
    (["filippenzen", "fil", "fil.", "filipp"], "Filippenzen"),
    (["kolossenzen", "kol", "kol."], "Kolossenzen"),
    (["1 thessalonicenzen", "1 thess", "1 thess.", "i thess"], "1 Thessalonicenzen"),
    (["2 thessalonicenzen", "2 thess", "2 thess.", "ii thess"], "2 Thessalonicenzen"),
    (["1 timotheüs", "1 timotheus", "1 tim", "1 tim.", "i tim"], "1 Timotheüs"),
    (["2 timotheüs", "2 timotheus", "2 tim", "2 tim.", "ii tim"], "2 Timotheüs"),
    (["titus", "tit", "tit."], "Titus"),
    (["filemon", "filem", "filem."], "Filemon"),
    (["hebreeën", "hebreeen", "hebr", "heb", "heb."], "Hebreeën"),
    (["jakobus", "jak", "jak."], "Jakobus"),
    (["1 petrus", "1 petr", "1 petr.", "1 pet", "i petr"], "1 Petrus"),
    (["2 petrus", "2 petr", "2 petr.", "2 pet", "ii petr"], "2 Petrus"),
    (["1 johannes", "1 joh", "1 joh.", "i joh"], "1 Johannes"),
    (["2 johannes", "2 joh", "2 joh.", "ii joh"], "2 Johannes"),
    (["3 johannes", "3 joh", "3 joh.", "iii joh"], "3 Johannes"),
    (["judas", "jud", "jud."], "Judas"),
    (["openbaring van johannes", "openbaring", "openb", "openb.", "op", "op."], "Openbaring van Johannes"),
]
for keys, val in _entries:
    for k in keys:
        BOOK_MAP[k] = val

# Build regex pattern
_keys_sorted = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pat = "|".join(re.escape(k) for k in _keys_sorted)

VERSE_RE = re.compile(
    r'\b(' + _book_pat + r')\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})',
    re.IGNORECASE
)

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
    """Parse sermons/preken with Bible text references."""
    paras = get_paragraphs(path)
    entries = []
    n = len(paras)

    # Find sermon boundaries: heading styles or numbered titles
    title_re = re.compile(r'^(\d{1,3})\.\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÊÂÎÔÛÆŒ]', re.UNICODE)

    # Detect content start (skip TOC/preface)
    content_start = 0
    for i, (style, text) in enumerate(paras):
        if i > 20 and style in ('Heading 1', 'Heading 2', 'Heading 3'):
            content_start = i
            break
        if title_re.match(text) and i > 30:
            content_start = i
            break

    # Find sermon positions with verse refs
    sermons = []
    i = content_start
    while i < n:
        style, text = paras[i]
        is_title = (
            style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4') or
            (title_re.match(text) and len(text) < 200)
        )
        if is_title:
            ref = find_ref(text)
            if not ref:
                for j in range(i+1, min(i+8, n)):
                    ref = find_ref(paras[j][1])
                    if ref:
                        break
            if ref:
                sermons.append((i, ref))
        i += 1

    # Extract sermon content
    for si, (pos, ref) in enumerate(sermons):
        end = sermons[si+1][0] if si+1 < len(sermons) else n
        body = '\n'.join(paras[j][1] for j in range(pos, min(end, n)))
        if len(body) > 100:
            entries.append({
                "book": ref[0], "chapter": ref[1], "verse": ref[2],
                "verse_end": None, "text": body
            })

    return entries


def parse_verse_commentary(path):
    """Parse verse-by-verse commentary (like Kohlbrügge Schriftverklaring)."""
    paras = get_paragraphs(path)
    entries = []

    current_ref = None
    body = []

    def flush():
        if current_ref and body:
            text = '\n'.join(body).strip()
            if len(text) > 30:
                entries.append({
                    "book": current_ref[0], "chapter": current_ref[1],
                    "verse": current_ref[2], "verse_end": None,
                    "text": text
                })

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
    """Keep first occurrence of each (book, chapter, verse)."""
    seen = set()
    result = []
    for e in entries:
        key = (e['book'], e['chapter'], e['verse'])
        if key not in seen:
            seen.add(key)
            result.append(e)
    return result


# ─── Process all authors ─────────────────────────────────────────────────────

results = {}

# 1. KOHLBRÜGGE Schriftverklaringen (14 delen)
print("=" * 60)
print("KOHLBRÜGGE Schriftverklaringen (14 delen)")
print("=" * 60)
kohlbrugge = []
for i in range(1, 15):
    path = BASE / f"kohlbrugge_sv/deel_{i}.docx"
    if path.exists():
        try:
            e = parse_verse_commentary(path)
            print(f"  Deel {i}: {len(e)} entries")
            kohlbrugge.extend(e)
        except Exception as ex:
            print(f"  ERROR deel {i}: {ex}")
kohlbrugge = deduplicate(kohlbrugge)
print(f"  TOTAL Kohlbrügge: {len(kohlbrugge)} unique entries")
results['kohlbrugge'] = kohlbrugge

# 2. SMIJTEGELT
print("\n" + "=" * 60)
print("SMIJTEGELT")
print("=" * 60)
smijtegelt = []
for fname in ['16_predicaties.docx', '50_keurstoffen.docx', '52_catechismus.docx',
              'deel1.docx', 'deel2.docx', 'deel3.docx', 'deel4.docx', 'zestal.docx']:
    path = BASE / f"smijtegelt/{fname}"
    if path.exists():
        try:
            e = parse_sermon_docx(path)
            if len(e) < 3:
                e = parse_verse_commentary(path)
            print(f"  {fname}: {len(e)} entries")
            smijtegelt.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
smijtegelt = deduplicate(smijtegelt)
print(f"  TOTAL Smijtegelt: {len(smijtegelt)} unique entries")
results['smijtegelt'] = smijtegelt

# 3. VAN DER GROE
print("\n" + "=" * 60)
print("VAN DER GROE")
print("=" * 60)
vandergroe = []
for fname in os.listdir(str(BASE / "vandergroe")):
    if not fname.endswith('.docx'):
        continue
    path = BASE / f"vandergroe/{fname}"
    try:
        e = parse_sermon_docx(path)
        if len(e) < 3:
            e = parse_verse_commentary(path)
        print(f"  {fname}: {len(e)} entries")
        vandergroe.extend(e)
    except Exception as ex:
        print(f"  ERROR {fname}: {ex}")
vandergroe = deduplicate(vandergroe)
print(f"  TOTAL Van der Groe: {len(vandergroe)} unique entries")
results['vandergroe'] = vandergroe

# 4. CALVIJN preken (from Theologienet DOCX)
print("\n" + "=" * 60)
print("CALVIJN preken")
print("=" * 60)
calvijn = []
# Download Calvijn preken DOCX
calvijn_docx = {
    'calvijn_27preken_jeremia.docx': 'https://theologienet.nl/bestanden/calvijn-27-preken-over-jeremia.docx',
    'calvijn_11preken_1samuel.docx': 'https://theologienet.nl/bestanden/calvijn-11-preken-over-1-samuel.docx',
    'calvijn_kerstpreken.docx': 'https://theologienet.nl/bestanden/calvijn-kerstpreken-en-lijden-opstanding-over-voorverordinering.docx',
}
for fname, url in calvijn_docx.items():
    path = BASE / fname
    if not path.exists():
        import requests
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            path.write_bytes(r.content)
            print(f"  Downloaded {fname}")

for fname in ['calvijn_genesis.docx', 'calvijn_27preken_jeremia.docx',
              'calvijn_11preken_1samuel.docx', 'calvijn_kerstpreken.docx']:
    path = BASE / fname
    if path.exists():
        try:
            e = parse_sermon_docx(path)
            if len(e) < 3:
                e = parse_verse_commentary(path)
            print(f"  {fname}: {len(e)} entries")
            calvijn.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")

# Also add parsed PDF entries
pdf_path = BASE / "calvijn_nl_parsed.json"
if pdf_path.exists():
    with open(str(pdf_path), encoding='utf-8') as f:
        pdf_entries = json.load(f)
    print(f"  calvijn_nl_parsed.json: {len(pdf_entries)} entries")
    calvijn.extend(pdf_entries)

calvijn = deduplicate(calvijn)
print(f"  TOTAL Calvijn NL: {len(calvijn)} unique entries")
results['calvijn'] = calvijn

# 5. SPURGEON extra preken
print("\n" + "=" * 60)
print("SPURGEON extra preken")
print("=" * 60)
spurgeon = []
# Download new Spurgeon DOCX
spurgeon_docx = {
    'spurgeon_32preken_nt.docx': 'https://theologienet.nl/bestanden/spurgeon-32-preken-nieuwe-testament.docx',
    'spurgeon_20preken_ot.docx': 'https://theologienet.nl/bestanden/spurgeon-20-preken-oude-testament.docx',
    'spurgeon_12jongelui.docx': 'https://theologienet.nl/bestanden/spurgeon-12-preken-voor-jongelui.docx',
    'spurgeon_7satan.docx': 'https://theologienet.nl/bestanden/spurgeon-strijd-tegen-satan-7-preken.docx',
}
for fname, url in spurgeon_docx.items():
    path = BASE / fname
    if not path.exists():
        import requests
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            path.write_bytes(r.content)
            print(f"  Downloaded {fname}")

for fname in ['spurgeon_johannes.docx', 'spurgeon_lukas.docx', 'spurgeon_markus.docx',
              'spurgeon_mattheus.docx', 'spurgeon_ot.docx', 'spurgeon_nt.docx',
              'spurgeon_32preken_nt.docx', 'spurgeon_20preken_ot.docx',
              'spurgeon_12jongelui.docx', 'spurgeon_7satan.docx']:
    path = BASE / fname
    if path.exists():
        try:
            e = parse_sermon_docx(path)
            if len(e) < 3:
                e = parse_verse_commentary(path)
            print(f"  {fname}: {len(e)} entries")
            spurgeon.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
spurgeon = deduplicate(spurgeon)
print(f"  TOTAL Spurgeon NL: {len(spurgeon)} unique entries")
results['spurgeon'] = spurgeon

# 6. LUTHER extra
print("\n" + "=" * 60)
print("LUTHER extra preken")
print("=" * 60)
luther = []
luther_docx = {
    'luther_galaten.docx': 'https://theologienet.nl/bestanden/luther-galaten-voorr-hfdst-1-tot-en-met-6.docx',
    'luther_romeinen.docx': 'https://theologienet.nl/bestanden/luther-romeinen.docx',
    'luther_psalmen.docx': 'https://theologienet.nl/bestanden/luther-15-psalmen-7-boetepsalm.docx',
}
for fname, url in luther_docx.items():
    path = BASE / fname
    if not path.exists():
        import requests
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            path.write_bytes(r.content)
            print(f"  Downloaded {fname}")
    if path.exists():
        try:
            e = parse_verse_commentary(path)
            if len(e) < 3:
                e = parse_sermon_docx(path)
            print(f"  {fname}: {len(e)} entries")
            luther.extend(e)
        except Exception as ex:
            print(f"  ERROR {fname}: {ex}")
luther = deduplicate(luther)
print(f"  TOTAL Luther extra: {len(luther)} unique entries")
results['luther'] = luther

# ─── Save all results ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("SAVING RESULTS")
print("=" * 60)
for author, entries in results.items():
    path = BASE / f"{author}_new.json"
    with open(str(path), 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"  {author}: {len(entries)} entries -> {path.name}")

# Grand total
total = sum(len(e) for e in results.values())
print(f"\nGRAND TOTAL: {total} new entries to load")
