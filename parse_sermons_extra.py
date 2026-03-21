#!/usr/bin/env python3
"""
Parse extra sermon/work files from Theologienet downloads.
Handles PDFs and DOCX for kerkvaders + extra oudvader content.
"""
import re, json, sys, io, os
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path("C:/Users/midir/schriftinzicht")

# ─── Reuse book map from parse_sermons.py ────────────────────────────────────
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
    (["1 korinthe", "1 kor", "1 kor.", "1 cor", "1 korinthiërs", "i kor"], "1 Korinthe"),
    (["2 korinthe", "2 kor", "2 kor.", "2 cor", "2 korinthiërs", "ii kor"], "2 Korinthe"),
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

_keys_sorted = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_book_pat = "|".join(re.escape(k) for k in _keys_sorted)
VERSE_RE = re.compile(
    r'\b(' + _book_pat + r')\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?',
    re.IGNORECASE
)

def resolve_book(name):
    return BOOK_MAP.get(name.lower().strip().rstrip('.'))

def find_ref(text):
    m = VERSE_RE.search(text)
    if m:
        book = resolve_book(m.group(1))
        if book:
            end_v = int(m.group(4)) if m.group(4) else None
            return (book, int(m.group(2)), int(m.group(3)), end_v)
    return None

def find_all_refs(text):
    """Find ALL verse references in text."""
    refs = []
    for m in VERSE_RE.finditer(text):
        book = resolve_book(m.group(1))
        if book:
            end_v = int(m.group(4)) if m.group(4) else None
            refs.append((book, int(m.group(2)), int(m.group(3)), end_v, m.start()))
    return refs

def get_pdf_text(path):
    import pdfplumber
    pages = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text)
    return '\n'.join(pages)

def get_docx_paragraphs(path):
    import docx
    d = docx.Document(str(path))
    return [(p.style.name if p.style else 'Normal', p.text.strip()) for p in d.paragraphs if p.text.strip()]


def parse_pdf_multi_sermons(path, collection=None):
    """Parse a PDF containing multiple sermons, splitting by common patterns."""
    text = get_pdf_text(path)
    if not text or len(text) < 200:
        return []

    entries = []

    # Try sermon boundary patterns
    patterns = [
        re.compile(r'^((?:PREEK|PREDICATIE|LEERREDE|KEURSTOF|PREEKSTOF)\s+\w+.*?)$', re.IGNORECASE | re.MULTILINE),
        re.compile(r'^(\d{1,3})[.\)]\s+([A-Z].{10,})', re.MULTILINE),
        re.compile(r'^((?:EERSTE|TWEEDE|DERDE|VIERDE|VIJFDE|ZESDE|ZEVENDE|ACHTSTE|NEGENDE|TIENDE|ELFDE|TWAALFDE)\s+(?:PREEK|LEERREDE|PREDICATIE).*?)$', re.IGNORECASE | re.MULTILINE),
    ]

    markers = []
    for pat in patterns:
        markers = list(pat.finditer(text))
        if len(markers) >= 3:
            break

    if len(markers) < 2:
        # Treat as single work — find all verse refs and create one entry per section
        ref = find_ref(text[:5000])
        if ref:
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            title = lines[0][:200] if lines else Path(path).stem
            return [{
                "title": title,
                "book": ref[0], "chapter": ref[1], "verse": ref[2], "verse_end": ref[3],
                "text": text,
                "source_collection": collection,
            }]
        return []

    for i, m in enumerate(markers):
        start = m.start()
        end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        sermon_text = text[start:end].strip()

        if len(sermon_text) < 100:
            continue

        ref = find_ref(sermon_text[:3000])
        if not ref:
            continue

        title = m.group(0).strip()[:200]

        entries.append({
            "title": title,
            "book": ref[0], "chapter": ref[1], "verse": ref[2], "verse_end": ref[3],
            "text": sermon_text,
            "source_collection": collection,
        })

    return entries


def parse_docx_sermons(path, collection=None):
    """Parse DOCX with sermon boundaries."""
    try:
        paras = get_docx_paragraphs(path)
    except Exception as e:
        print(f"  ERROR reading {path}: {e}")
        return []

    if not paras:
        return []

    entries = []
    num_re = re.compile(r'^(\d{1,3})[.\)]\s+(.+)', re.UNICODE)
    leerrede_re = re.compile(r'^(?:LEERREDE|PREDICATIE|PREEK|PREECK|KEURSTOF)\s+(\w+)', re.IGNORECASE)

    sermons = []
    for i, (style, text) in enumerate(paras):
        is_heading = style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4')
        m_num = num_re.match(text)
        m_leer = leerrede_re.match(text)

        if (is_heading and len(text) < 300) or (m_num and len(text) < 300) or (m_leer and len(text) < 300):
            sermons.append((i, text))

    if len(sermons) < 2:
        # Fallback: heading-based
        for i, (style, text) in enumerate(paras):
            if style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4'):
                ref = find_ref(text)
                if not ref:
                    for j in range(i + 1, min(i + 8, len(paras))):
                        ref = find_ref(paras[j][1])
                        if ref:
                            break
                if ref:
                    sermons.append((i, text))

    n = len(paras)
    for si, (pos, title) in enumerate(sermons):
        end = sermons[si + 1][0] if si + 1 < len(sermons) else n

        ref = find_ref(title)
        if not ref:
            for j in range(pos + 1, min(pos + 10, end)):
                ref = find_ref(paras[j][1])
                if ref:
                    break
        if not ref:
            continue

        body = '\n'.join(paras[j][1] for j in range(pos, end))
        if len(body) < 100:
            continue

        clean_title = title.strip()
        m = num_re.match(clean_title)
        if m:
            clean_title = m.group(2).strip()
        if len(clean_title) > 200:
            clean_title = clean_title[:200]

        entries.append({
            "title": clean_title,
            "book": ref[0], "chapter": ref[1], "verse": ref[2], "verse_end": ref[3],
            "text": body,
            "source_collection": collection,
        })

    return entries


def parse_auto(path, collection=None):
    """Auto-detect PDF or DOCX and parse."""
    path = Path(path)
    if path.suffix.lower() == '.pdf':
        return parse_pdf_multi_sermons(path, collection)
    elif path.suffix.lower() == '.docx':
        return parse_docx_sermons(path, collection)
    return []


# ─── Process all extra files ─────────────────────────────────────────────────

def main():
    all_results = {}

    # ── KERKVADERS ──
    print("=" * 60)
    print("KERKVADERS")
    print("=" * 60)

    # Augustinus (id=17)
    augustinus = []
    for fname, coll in [
        ('kerkvaders/augustinus-belijdenissen.pdf', 'Belijdenissen'),
        ('kerkvaders/augustinus-preken-liturgisch-jaar.docx', 'Preken voor het Liturgisch Jaar'),
    ]:
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_auto(path, coll)
                print(f"  {fname}: {len(entries)} entries [{coll}]")
                augustinus.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")
    all_results['augustinus'] = augustinus
    print(f"  TOTAL Augustinus: {len(augustinus)}")

    # Ambrosius (id=18)
    ambrosius = []
    path = BASE / 'kerkvaders/ambrosius-zien-op-jezus-deel-1.pdf'
    if path.exists():
        try:
            entries = parse_auto(path, 'Het Zien op Jezus')
            print(f"  ambrosius-zien-op-jezus: {len(entries)} entries")
            ambrosius.extend(entries)
        except Exception as e:
            print(f"  ERROR ambrosius: {e}")
    all_results['ambrosius'] = ambrosius
    print(f"  TOTAL Ambrosius: {len(ambrosius)}")

    # Apostolische Vaders (id=20 Ignatius, 21 Polycarpus, 22 Clemens)
    # This PDF contains all three together - parse as one work per author
    apostolisch = []
    path = BASE / 'kerkvaders/apostolische-vaders-ignatius-polycarpus-clemens.pdf'
    if path.exists():
        try:
            entries = parse_auto(path, 'Apostolische Vaders')
            print(f"  apostolische-vaders: {len(entries)} entries")
            apostolisch.extend(entries)
        except Exception as e:
            print(f"  ERROR apostolisch: {e}")
    all_results['apostolisch'] = apostolisch
    print(f"  TOTAL Apostolische Vaders: {len(apostolisch)}")

    # ── KOHLBRÜGGE EXTRA (id=14) ──
    print("\n" + "=" * 60)
    print("KOHLBRÜGGE EXTRA (id=14)")
    print("=" * 60)
    kohlbrugge = []
    kohl_files = {
        'kohlbrugge_extra/kohlbrugge-2de-twaalftal.pdf': '2e Twaalftal',
        'kohlbrugge_extra/kohlbrugge-7de-12tal.pdf': '7e Twaalftal',
        'kohlbrugge_extra/kohlbrugge-8ste-12tal.pdf': '8e Twaalftal',
        'kohlbrugge_extra/kohlbrugge-9de-12tal.pdf': '9e Twaalftal',
        'kohlbrugge_extra/kohlbrugge-11de-12tal.pdf': '11e Twaalftal',
        'kohlbrugge_extra/kohlbrugge-28-preken-tabernakel.pdf': 'Tabernakelleerredenen',
        'kohlbrugge_extra/kohlbrugge-handelingen-preken.pdf': 'Handelingen Leerredenen',
        'kohlbrugge_extra/kohlbrugge-romeinen-7.pdf': 'Romeinen 7',
        'kohlbrugge_extra/kohlbrugge-catechismus.pdf': 'Catechismus',
    }
    for fname, coll in kohl_files.items():
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_auto(path, coll)
                print(f"  {Path(fname).name}: {len(entries)} entries [{coll}]")
                kohlbrugge.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")
    all_results['kohlbrugge_extra'] = kohlbrugge
    print(f"  TOTAL Kohlbrügge extra: {len(kohlbrugge)}")

    # ── SPURGEON EXTRA (id=13) ──
    print("\n" + "=" * 60)
    print("SPURGEON EXTRA (id=13)")
    print("=" * 60)
    spurgeon = []
    spur_files = {
        'spurgeon_extra/spurgeon-gelijkenissen-dl1.pdf': 'Gelijkenissen',
        'spurgeon_extra/spurgeon-lukas-preken.pdf': 'Lukas Preken',
        'spurgeon_extra/spurgeon-markus-preken.docx': 'Markus Preken',
        'spurgeon_extra/spurgeon-landbouw-preken.pdf': 'Landbouwpreken',
        'spurgeon_extra/spurgeon-raadgevingen-zoekenden.pdf': 'Raadgevingen aan Zoekenden',
        'spurgeon_extra/spurgeon-12-preken-jongelui.pdf': '12 Preken voor Jongelui',
    }
    for fname, coll in spur_files.items():
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_auto(path, coll)
                print(f"  {Path(fname).name}: {len(entries)} entries [{coll}]")
                spurgeon.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")
    all_results['spurgeon_extra'] = spurgeon
    print(f"  TOTAL Spurgeon extra: {len(spurgeon)}")

    # ── SMIJTEGELT EXTRA (id=7) ──
    print("\n" + "=" * 60)
    print("SMIJTEGELT EXTRA (id=7)")
    print("=" * 60)
    smijtegelt = []
    smijt_files = {
        'smijtegelt_extra/smytegelt-deel-2.pdf': 'Een Woord op Zijn Tijd deel 2',
        'smijtegelt_extra/smytegelt-deel-3.pdf': 'Een Woord op Zijn Tijd deel 3',
        'smijtegelt_extra/smytegelt-deel-4.pdf': 'Een Woord op Zijn Tijd deel 4',
        'smijtegelt_extra/smytegelt-50-keurstoffen.pdf': '50 Keurstoffen (PDF)',
    }
    for fname, coll in smijt_files.items():
        path = BASE / fname
        if path.exists():
            try:
                entries = parse_auto(path, coll)
                print(f"  {Path(fname).name}: {len(entries)} entries [{coll}]")
                smijtegelt.extend(entries)
            except Exception as e:
                print(f"  ERROR {fname}: {e}")
    all_results['smijtegelt_extra'] = smijtegelt
    print(f"  TOTAL Smijtegelt extra: {len(smijtegelt)}")

    # ── BRAKEL EXTRA (id=4) ──
    print("\n" + "=" * 60)
    print("BRAKEL EXTRA (id=4)")
    print("=" * 60)
    brakel = []
    path = BASE / 'brakel_extra/brakel-rgd-deel-1.pdf'
    if path.exists():
        try:
            entries = parse_auto(path, 'Redelijke Godsdienst (PDF)')
            print(f"  brakel-rgd-deel-1.pdf: {len(entries)} entries")
            brakel.extend(entries)
        except Exception as e:
            print(f"  ERROR brakel: {e}")
    all_results['brakel_extra'] = brakel
    print(f"  TOTAL Brakel extra: {len(brakel)}")

    # ── CALVIJN EXTRA (id=2) ──
    print("\n" + "=" * 60)
    print("CALVIJN EXTRA (id=2)")
    print("=" * 60)
    calvijn = []
    path = BASE / 'calvijn_extra/calvijn-geestelijk-leven.docx'
    if path.exists():
        try:
            entries = parse_auto(path, 'Het Geestelijk Leven')
            print(f"  calvijn-geestelijk-leven.docx: {len(entries)} entries")
            calvijn.extend(entries)
        except Exception as e:
            print(f"  ERROR calvijn: {e}")
    all_results['calvijn_extra'] = calvijn
    print(f"  TOTAL Calvijn extra: {len(calvijn)}")

    # ── HELLENBROEK EXTRA (id=9) ──
    print("\n" + "=" * 60)
    print("HELLENBROEK EXTRA (id=9)")
    print("=" * 60)
    hellenbroek = []
    path = BASE / 'calvijn_extra/hellenbroek-catechisatieboekje.pdf'
    if path.exists():
        try:
            entries = parse_auto(path, 'Catechisatieboekje')
            print(f"  hellenbroek-catechisatieboekje.pdf: {len(entries)} entries")
            hellenbroek.extend(entries)
        except Exception as e:
            print(f"  ERROR hellenbroek: {e}")
    all_results['hellenbroek_extra'] = hellenbroek
    print(f"  TOTAL Hellenbroek extra: {len(hellenbroek)}")

    # ─── Save results ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("SAVING RESULTS")
    print("=" * 60)

    author_ids = {
        'augustinus': 17, 'ambrosius': 18, 'apostolisch': 20,
        'kohlbrugge_extra': 14, 'spurgeon_extra': 13,
        'smijtegelt_extra': 7, 'brakel_extra': 4,
        'calvijn_extra': 2, 'hellenbroek_extra': 9,
    }

    for key, entries in all_results.items():
        if not entries:
            print(f"  {key}: 0 entries (skipped)")
            continue
        outpath = BASE / f"sermons_extra_{key}.json"
        with open(str(outpath), 'w', encoding='utf-8') as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        print(f"  {key} (id={author_ids.get(key, '?')}): {len(entries)} entries -> {outpath.name}")

    total = sum(len(e) for e in all_results.values())
    print(f"\nGRAND TOTAL EXTRA: {total} entries extracted")


if __name__ == "__main__":
    main()
