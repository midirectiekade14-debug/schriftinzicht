"""
Attribution accuracy baseline.

For 30 sampled commentaries, predict which author wrote them by word-trigram
overlap against per-author source corpora. Pass = predicted == claimed author.

Authors covered by .docx corpus: Luther (id=1), Calvijn (id=2), Spurgeon (id=13).
Henry (id=10) is PDF-only, skipped for first baseline.
"""

import json, os, re, sys
from collections import Counter, defaultdict
from glob import glob
from urllib.request import Request, urlopen

ROOT = os.path.expanduser('~/projects/schriftinzicht')

# author_id → list of (file glob patterns, relative to ROOT)
AUTHOR_CORPUS = {
    1:  ['luther_*.docx'],
    2:  ['calvijn_*.docx', 'calvijn_extra/*.docx', 'calvijn_nl/*.docx', 'calvijn_preken/*.docx'],
    13: ['spurgeon_*.docx', 'spurgeon_extra/*.docx'],
}
AUTHOR_NAME = {1: 'Luther', 2: 'Calvijn', 13: 'Spurgeon'}

WORD_RE = re.compile(r"[a-zàáâäçèéêëìíîïñòóôöùúûüý]+", re.I)

def tokenize(text):
    return [t for t in WORD_RE.findall(text.lower()) if len(t) >= 2]

def trigrams(tokens):
    return set(zip(tokens, tokens[1:], tokens[2:]))

def load_docx(path):
    from docx import Document
    try:
        d = Document(path)
        return ' '.join(p.text for p in d.paragraphs)
    except Exception as e:
        print(f'  ! {os.path.basename(path)}: {e}', file=sys.stderr)
        return ''

def build_corpus():
    print('Building corpus...')
    corpus = {}
    for aid, patterns in AUTHOR_CORPUS.items():
        files = []
        for pat in patterns:
            files.extend(glob(os.path.join(ROOT, pat)))
        files = sorted(set(files))
        text_parts = []
        for f in files:
            text_parts.append(load_docx(f))
        full = ' '.join(text_parts)
        toks = tokenize(full)
        tg = trigrams(toks)
        print(f'  [{AUTHOR_NAME[aid]:9s}] {len(files):2d} files, {len(toks):>9d} tokens, {len(tg):>8d} trigrams')
        corpus[aid] = tg
    return corpus

def load_env():
    env = {}
    with open(os.path.join(ROOT, 'web/.env')) as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                env[k] = v.strip().strip('"').strip("'")
    return env

def fetch_commentaries(env, author_ids, per_author=10, min_len=400):
    URL, KEY = env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']
    items = []
    for aid in author_ids:
        path = (f"commentaries?select=id,verse_id,author_id,commentary_text"
                f"&author_id=eq.{aid}&commentary_text=not.is.null&limit={per_author * 4}")
        req = Request(f'{URL}/rest/v1/{path}', headers={
            'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Accept': 'application/json'
        })
        rows = json.loads(urlopen(req, timeout=30).read())
        # Keep first per_author with text >= min_len
        kept = [r for r in rows if r.get('commentary_text') and len(r['commentary_text']) >= min_len][:per_author]
        items.extend(kept)
        print(f'  [{AUTHOR_NAME[aid]:9s}] fetched {len(kept)}/{per_author}')
    return items

def predict(text, corpus):
    sample_tg = trigrams(tokenize(text))
    if not sample_tg:
        return None, {}
    scores = {}
    for aid, ref_tg in corpus.items():
        # Overlap ratio: how much of the sample's trigrams appear in the reference corpus
        scores[aid] = len(sample_tg & ref_tg) / len(sample_tg)
    best = max(scores, key=scores.get)
    return best, scores

def main():
    print('Loading env...')
    env = load_env()
    corpus = build_corpus()

    print('\nFetching eval-set from Supabase...')
    items = fetch_commentaries(env, list(AUTHOR_CORPUS), per_author=10, min_len=400)
    print(f'\nTotal eval items: {len(items)}\n')

    pass_ct = 0
    by_author = defaultdict(lambda: {'pass': 0, 'total': 0})
    fails = []
    for it in items:
        claimed = it['author_id']
        text = it['commentary_text']
        pred, scores = predict(text, corpus)
        ok = pred == claimed
        by_author[claimed]['total'] += 1
        if ok:
            by_author[claimed]['pass'] += 1
            pass_ct += 1
        else:
            fails.append({
                'id': it['id'], 'verse_id': it.get('verse_id'),
                'claimed': claimed, 'predicted': pred,
                'scores': {AUTHOR_NAME[a]: round(s, 3) for a, s in scores.items()},
                'snippet': text[:120].replace('\n', ' '),
            })

    total = len(items)
    pct = (pass_ct / total * 100) if total else 0
    print(f'attribution baseline (trigram-overlap predictor)')
    print(f'Score: {pass_ct}/{total} ({pct:.1f}%)\n')
    print('By claimed author:')
    for aid, s in by_author.items():
        p = (s['pass'] / s['total'] * 100) if s['total'] else 0
        print(f'  [{AUTHOR_NAME[aid]:9s}] {s["pass"]}/{s["total"]} ({p:.0f}%)')

    if fails:
        print(f'\nFailures ({len(fails)}):')
        for f in fails:
            print(f'  commentary #{f["id"]} verse_id={f["verse_id"]}')
            print(f'    claimed:   {AUTHOR_NAME[f["claimed"]]}')
            print(f'    predicted: {AUTHOR_NAME[f["predicted"]] if f["predicted"] else "none"}')
            print(f'    scores:    {f["scores"]}')
            print(f'    snippet:   {f["snippet"]}...')

if __name__ == '__main__':
    main()
