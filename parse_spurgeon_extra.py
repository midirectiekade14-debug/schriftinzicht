#!/usr/bin/env python3
"""Parse extra Spurgeon DOCX files."""
import docx, re, json, sys, io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = Path(__file__).parent

BOOK_MAP = {}
for keys, val in [
    (['genesis','gen'], 'Genesis'), (['exodus','ex'], 'Exodus'),
    (['psalmen','psalm','ps','ps.'], 'Psalmen'), (['spreuken','spr'], 'Spreuken'),
    (['jesaja','jes','jes.'], 'Jesaja'), (['jeremia','jer'], 'Jeremia'),
    (['ezechiël','ezechiel','ez','ez.','ezech','ezech.'], 'Ezechiël'),
    (['daniël','daniel','dan'], 'Daniël'),
    (['mattheüs','mattheus','matt','matt.','matth','matth.'], 'Mattheüs'),
    (['markus','marcus','mark'], 'Markus'), (['lukas','lucas','luk','luc'], 'Lukas'),
    (['johannes','joh','joh.'], 'Johannes'), (['handelingen','hand','hand.'], 'Handelingen'),
    (['romeinen','rom','rom.'], 'Romeinen'), (['1 korinthe','1 kor'], '1 Korinthe'),
    (['2 korinthe','2 kor'], '2 Korinthe'), (['galaten','gal'], 'Galaten'),
    (['efeze','ef'], 'Efeze'), (['filippenzen','fil'], 'Filippenzen'),
    (['kolossenzen','kol'], 'Kolossenzen'), (['hebreeën','hebreeen','hebr','heb'], 'Hebreeën'),
    (['jakobus','jak'], 'Jakobus'), (['1 petrus','1 petr'], '1 Petrus'),
    (['2 petrus','2 petr'], '2 Petrus'), (['1 johannes','1 joh'], '1 Johannes'),
    (['openbaring','openb','op'], 'Openbaring van Johannes'),
    (['1 thessalonicenzen','1 thess'], '1 Thessalonicenzen'),
    (['2 thessalonicenzen','2 thess'], '2 Thessalonicenzen'),
    (['1 timotheüs','1 tim'], '1 Timotheüs'), (['2 timotheüs','2 tim'], '2 Timotheüs'),
    (['titus','tit'], 'Titus'), (['filemon','filem'], 'Filemon'),
    (['judas','jud'], 'Judas'), (['job'], 'Job'), (['hooglied','hoogl'], 'Hooglied'),
    (['hosea','hos'], 'Hosea'), (['amos','am'], 'Amos'), (['jona','jon'], 'Jona'),
    (['micha','mi'], 'Micha'), (['zacharia','zach'], 'Zacharia'), (['maleachi','mal'], 'Maleachi'),
    (['numeri','num'], 'Numeri'), (['deuteronomium','deut'], 'Deuteronomium'),
    (['jozua','joz'], 'Jozua'), (['richteren','richt'], 'Richteren'), (['ruth'], 'Ruth'),
    (['1 samuel','1 sam'], '1 Samuel'), (['2 samuel','2 sam'], '2 Samuel'),
    (['1 koningen','1 kon'], '1 Koningen'), (['2 koningen','2 kon'], '2 Koningen'),
    (['prediker','pred'], 'Prediker'),
]:
    for k in keys:
        BOOK_MAP[k] = val

_keys = sorted(BOOK_MAP.keys(), key=len, reverse=True)
_pat = "|".join(re.escape(k) for k in _keys)
VERSE_RE = re.compile(r'\b(' + _pat + r')\s*\.?\s*(\d{1,3})\s*[:\s,]\s*(\d{1,3})', re.IGNORECASE)

def find_ref(text):
    m = VERSE_RE.search(text)
    if m:
        book = BOOK_MAP.get(m.group(1).lower().strip().rstrip('.'))
        if book:
            return (book, int(m.group(2)), int(m.group(3)))
    return None

entries = []
files = sorted(BASE.glob('spurgeon_*.docx'))

for fp in files:
    try:
        d = docx.Document(str(fp))
        paras = [(p.style.name if p.style else 'Normal', p.text.strip()) for p in d.paragraphs if p.text.strip()]
        file_entries = []

        # Sermon detection
        sermons = []
        for i, (style, text) in enumerate(paras):
            if i < 10:
                continue
            is_title = style in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4') or \
                       (re.match(r'^\d{1,3}\.\s+[A-Z]', text) and len(text) < 200)
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
                file_entries.append({
                    'book': ref[0], 'chapter': ref[1], 'verse': ref[2],
                    'verse_end': None, 'text': body
                })

        if len(file_entries) < 3:
            current_ref = None
            body_parts = []

            def flush():
                if current_ref and body_parts:
                    text = '\n'.join(body_parts).strip()
                    if len(text) > 30:
                        file_entries.append({
                            'book': current_ref[0], 'chapter': current_ref[1],
                            'verse': current_ref[2], 'verse_end': None,
                            'text': text
                        })

            for style, text in paras:
                ref = find_ref(text)
                if ref and (style.startswith('Heading') or len(text) < 300):
                    if ref != current_ref:
                        flush()
                        current_ref = ref
                        body_parts = [text]
                    else:
                        body_parts.append(text)
                elif current_ref:
                    body_parts.append(text)
            flush()

        print(f"{fp.name}: {len(file_entries)} entries")
        entries.extend(file_entries)
    except Exception as e:
        print(f"{fp.name}: ERROR {e}")

# Dedup
seen = set()
unique = []
for e in entries:
    k = (e['book'], e['chapter'], e['verse'])
    if k not in seen:
        seen.add(k)
        unique.append(e)

print(f"\nTotal unique Spurgeon NL entries: {len(unique)}")
with open(str(BASE / 'spurgeon_extra3.json'), 'w', encoding='utf-8') as f:
    json.dump(unique, f, ensure_ascii=False, indent=2)
print("Saved to spurgeon_extra3.json")
