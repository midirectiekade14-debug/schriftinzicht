require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

async function q(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return res.json();
}

// EXACT copy of app code
const splitOnSentences = (text) => {
  if (text.length <= 600) return [text];
  const result = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= 600) { result.push(remaining); break; }
    let splitIdx = -1;
    for (let i = 400; i < Math.min(remaining.length, 700); i++) {
      if (remaining[i] === '.' && i + 1 < remaining.length && remaining[i + 1] === ' ') { splitIdx = i + 1; break; }
    }
    if (splitIdx === -1) splitIdx = Math.min(600, remaining.length);
    result.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  return result;
};

const splitOnStructure = (text) => {
  const splits = [];
  let m;
  // Roman numerals
  const rxRoman = /\s+((?:X{0,3})(?:IX|IV|V?I{1,3}))\.\s/g;
  while ((m = rxRoman.exec(text)) !== null) { if (m[1].length > 0) splits.push(m.index); }
  // Escaped numbered (MH): 1\. 2\.
  const rxEscNum = /\d+\\\.\s/g;
  while ((m = rxEscNum.exec(text)) !== null) splits.push(m.index);
  // Capital letter sections: "  A. Hij"
  const rxCapLet = /\s{2,}([A-F])\.\s+[A-Z]/g;
  while ((m = rxCapLet.exec(text)) !== null) splits.push(m.index);
  // Lowercase letter sections: "  a. Zie"
  const rxLet = /\s{2,}([a-f])\.\s+[A-Z]/g;
  while ((m = rxLet.exec(text)) !== null) splits.push(m.index);
  // Parenthetical letters: " a) "
  const rxParen = /\s+([a-g])\)\s/g;
  while ((m = rxParen.exec(text)) !== null) splits.push(m.index);

  const unique = [...new Set(splits)].sort((a, b) => a - b);
  const filtered = [];
  for (const s of unique) {
    if (filtered.length === 0 || s - filtered[filtered.length - 1] >= 20) filtered.push(s);
  }
  if (filtered.length >= 2) {
    const result = [];
    if (filtered[0] > 50) {
      const intro = text.slice(0, filtered[0]).trim();
      if (intro.length > 1500) result.push(...splitOnSentences(intro));
      else result.push(intro);
    }
    for (let i = 0; i < filtered.length; i++) {
      const end = i + 1 < filtered.length ? filtered[i + 1] : text.length;
      const chunk = text.slice(filtered[i], end).trim();
      if (chunk.length > 0) {
        if (chunk.length > 1500) result.push(...splitOnSentences(chunk));
        else result.push(chunk);
      }
    }
    if (result.length > 1) return result;
  }
  return splitOnSentences(text);
};

const splitIntoParagraphs = (text) => {
  const parts = text.split(/\n\n+|\n/).filter(Boolean).map(p => p.trim());
  if (parts.length > 1) {
    const refined = [];
    for (const p of parts) {
      if (p.length <= 800) { refined.push(p); continue; }
      refined.push(...splitOnStructure(p));
    }
    return refined;
  }
  if (text.length < 500) return [text];
  return splitOnStructure(text);
};

async function main() {
  const authors = await q('authors?select=id,name&order=name');
  console.log('=== FINALE SPLIT-KWALITEITSCHECK ===\n');

  for (const a of authors) {
    const comms = await q(`commentaries?select=id,commentary_text&author_id=eq.${a.id}&language=eq.nl&limit=1000`);
    if (comms.length === 0) continue;

    let longParas = 0;
    let maxPara = 0;
    let worstId = 0;

    for (const c of comms) {
      const text = (c.commentary_text || '').replace(/\.?\s*return to\s*'\s*Top of Page\s*'/gi, '').trimEnd();
      const paras = splitIntoParagraphs(text);
      for (const p of paras) {
        if (p.length > 1500) longParas++;
        if (p.length > maxPara) { maxPara = p.length; worstId = c.id; }
      }
    }

    const status = longParas === 0 ? '✓' : `⚠️ ${longParas} alineas >1500ch`;
    console.log(`${a.name}: ${status} (langste: ${maxPara}ch, ID:${worstId})`);
  }
}
main().catch(console.error);
