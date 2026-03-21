/**
 * Fix double-encoded UTF-8 in confession_articles
 * Updates NGB articles with clean text from the raw source file
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = 'https://mkwqiqssuhunbhvwrsdt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo';

function cleanText(text) {
  return text
    .replace(/\uFFFD/g, '\u2014')
    .replace(/�/g, '\u2014')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function isFootnoteLine(line) {
  const trimmed = line.trim();
  if (/^\*/.test(trimmed)) return true;
  if (/^\d{1,2}[A-Z]/.test(trimmed)) return true;
  if (/^\d{1,2}\s+\d?[A-Z]/.test(trimmed)) return true;
  return false;
}

function stripInlineFootnoteNumbers(text) {
  // Strip footnote markers: letter + digits + letter/punctuation/space
  // e.g. "rechtvaardig11en" -> "rechtvaardig en", "goed7." -> "goed."
  return text
    .replace(/([a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüýÿ])(\d{1,2})([a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüýÿ])/g, '$1 $3')
    .replace(/([a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüýÿ])(\d{1,2})([,;.:\s)!?])/g, '$1$3')
    .replace(/([a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüýÿ])(\d{1,2})$/gm, '$1')
    .replace(/ {2,}/g, ' ');
}

function parseNGB(rawText) {
  const lines = rawText.split('\n');
  const articles = [];

  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^Artikel\s+1\s/i.test(t) && i + 1 < lines.length && lines[i + 1].trim().startsWith('Wij geloven')) {
      startIdx = i;
      break;
    }
  }

  let currentArticle = null;
  let currentText = [];

  for (let i = startIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('Het verzoekschrift') || trimmed.startsWith('Het Verzoekschrift')) {
      if (currentArticle && currentText.length > 0) {
        currentArticle.text = currentText.join('\n');
        articles.push(currentArticle);
      }
      break;
    }

    const artikelMatch = trimmed.match(/^Artikel\s+(\d+)\s*[\u2014\u2013\uFFFD\-—–�]\s*(.+)$/i);
    if (artikelMatch) {
      if (currentArticle && currentText.length > 0) {
        currentArticle.text = currentText.join('\n');
        articles.push(currentArticle);
      }
      currentArticle = { number: parseInt(artikelMatch[1]), title: cleanText(artikelMatch[2]) };
      currentText = [];
      continue;
    }

    if (!trimmed) continue;
    if (currentArticle && isFootnoteLine(trimmed)) continue;
    if (currentArticle) currentText.push(cleanText(trimmed));
  }

  return articles;
}

async function main() {
  const ngbRaw = readFileSync(join(__dirname, 'data', 'ngb_raw.txt'), 'utf-8');
  const articles = parseNGB(ngbRaw);
  console.log(`Parsed ${articles.length} NGB articles from raw source`);

  // Fetch existing articles
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/confession_articles?confession_id=eq.2&select=id,article_number,title,article_text&order=article_number`,
    { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
  );
  const existing = await res.json();
  console.log(`Found ${existing.length} existing NGB articles in DB`);

  let updated = 0;
  for (const dbArt of existing) {
    const srcArt = articles.find(a => a.number === dbArt.article_number);
    if (!srcArt) { console.log(`  No source for art ${dbArt.article_number}`); continue; }

    const cleanTitle = srcArt.title;
    const cleanArticleText = stripInlineFootnoteNumbers(srcArt.text);

    // Check if update needed
    const needsUpdate = dbArt.article_text !== cleanArticleText || dbArt.title !== cleanTitle;
    if (!needsUpdate) continue;

    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/confession_articles?id=eq.${dbArt.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: cleanTitle, article_text: cleanArticleText }),
      }
    );

    if (!patchRes.ok) {
      console.error(`  Failed to update art ${dbArt.article_number}: ${await patchRes.text()}`);
    } else {
      updated++;
      console.log(`  Updated art ${dbArt.article_number}: ${cleanTitle}`);
    }
  }

  console.log(`\nDone! Updated ${updated} articles.`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
