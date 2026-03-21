/**
 * Seed script for confession_articles table
 * Parses NGB (Nederlandse Geloofsbelijdenis) and DL (Dordtse Leerregels) raw text
 * and inserts structured data into Supabase.
 *
 * Usage: node supabase/seed_confessions.mjs
 *
 * Raw text files expected at:
 *   - NGB: supabase/data/ngb_raw.txt
 *   - DL:  supabase/data/dl_raw.txt
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://mkwqiqssuhunbhvwrsdt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rd3FpcXNzdWh1bmJodndyc2R0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTUxMTE2OCwiZXhwIjoyMDg3MDg3MTY4fQ.GMHtOySld0GM9k93zbqcbMQAW_8hzad9ti-P8VqTjRo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clean encoding artifacts and normalize whitespace */
function cleanText(text) {
  return text
    .replace(/\uFFFD/g, '\u2014')  // replacement char -> em-dash
    .replace(/�/g, '\u2014')       // literal "�" -> em-dash
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * Strip footnote references from article text.
 * NGB footnotes look like: superscript number followed by Bible ref at end of paragraph
 * e.g. "...het goede7." or "...mond1, dat er..."
 * The footnote lines themselves (like "1Rom. 10:10.2Deu. 6:4...") are separate lines.
 *
 * For inline superscript numbers (like "mond1,") we strip the number before punctuation.
 */
function stripInlineFootnoteNumbers(text) {
  // Remove superscript-style footnote markers: digit(s) directly after a word char,
  // before punctuation or space. e.g. "mond1," -> "mond,"
  // But be careful not to strip numbers that are part of the text (like "1 Korintiërs")
  return text.replace(/([a-zA-Zàáâãäåèéêëìíîïòóôõöùúûüýÿ])(\d{1,2})([,;.:\s)!?])/g, '$1$3');
}

/**
 * Check if a line is a footnote line (starts with a number followed by a Bible book abbreviation)
 */
function isFootnoteLine(line) {
  const trimmed = line.trim();
  // Footnote lines start with a number followed by a Bible book abbreviation
  // e.g. "1Rom. 10:10." or "1 Rom. 10:10." or "* De Generale Synode..."
  if (/^\*/.test(trimmed)) return true;  // editorial footnote
  if (/^\d{1,2}[A-Z]/.test(trimmed)) return true;  // e.g. "1Rom." "2Deu."
  if (/^\d{1,2}\s+\d?[A-Z]/.test(trimmed)) return true;  // e.g. "1 1Kon." "8 1Kon."
  return false;
}

// ---------------------------------------------------------------------------
// Supabase REST helpers
// ---------------------------------------------------------------------------

async function supabaseRequest(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : undefined,
    },
  };
  // Remove undefined headers
  Object.keys(opts.headers).forEach(k => opts.headers[k] === undefined && delete opts.headers[k]);
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${SUPABASE_URL}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path} failed (${res.status}): ${text}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) return res.json();
  return null;
}

async function deleteAllConfessions() {
  // Delete all existing confession_articles (cascade will handle proof_texts)
  await supabaseRequest('/rest/v1/confession_articles?confession=in.(NGB,DL)', 'DELETE');
  console.log('Deleted existing confession articles.');
}

async function insertBatch(rows) {
  const BATCH_SIZE = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await supabaseRequest('/rest/v1/confession_articles', 'POST', batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${rows.length} rows...`);
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// NGB Parser
// ---------------------------------------------------------------------------

function parseNGB(rawText) {
  const lines = rawText.split('\n');
  const articles = [];

  // NGB structure:
  // Lines 1-39: table of contents + intro (skip)
  // Lines 40+: "Artikel N — Title" followed by text paragraphs, then footnote lines
  // After artikel 37: verzoekschrift etc. (skip)

  // Find start of actual articles (after TOC)
  // The TOC has lines like "Artikel 1 — De enige God" without text
  // The actual content starts with "Artikel 1 — De enige God" followed by text on next line

  // Strategy: find "De inhoud van de NGB" line, skip it, then parse articles
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim().toLowerCase();
    if (t === 'de inhoud van de ngb' || t === 'de inhoud van de ngb.') {
      startIdx = i + 1;
      break;
    }
  }
  // If not found, skip the TOC (first 37 article titles + 2 extra lines)
  if (startIdx === 0) {
    // Find first line that starts with "Artikel 1" AND has body text on next line
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^Artikel\s+1\s/i.test(t) && i + 1 < lines.length && lines[i + 1].trim().startsWith('Wij geloven')) {
        startIdx = i;
        break;
      }
    }
  }

  let currentArticle = null;
  let currentText = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Stop at the verzoekschrift
    if (trimmed.startsWith('Het verzoekschrift') || trimmed.startsWith('Het Verzoekschrift')) {
      // Save current article
      if (currentArticle && currentText.length > 0) {
        currentArticle.text = currentText.join('\n');
        articles.push(currentArticle);
      }
      break;
    }

    // Match "Artikel N — Title" (with various dash chars including replacement char)
    const artikelMatch = trimmed.match(/^Artikel\s+(\d+)\s*[\u2014\u2013\uFFFD\-—–�]\s*(.+)$/i);
    if (artikelMatch) {
      // Save previous article
      if (currentArticle && currentText.length > 0) {
        currentArticle.text = currentText.join('\n');
        articles.push(currentArticle);
      }

      currentArticle = {
        number: parseInt(artikelMatch[1]),
        title: cleanText(artikelMatch[2]),
      };
      currentText = [];
      continue;
    }

    // Skip empty lines
    if (!trimmed) continue;

    // Skip footnote lines
    if (currentArticle && isFootnoteLine(trimmed)) continue;

    // Accumulate text
    if (currentArticle) {
      currentText.push(cleanText(trimmed));
    }
  }

  // Convert to DB rows
  return articles.map(a => ({
    confession: 'NGB',
    section_number: a.number,
    section_title: a.title,
    article_number: 0,
    article_text: stripInlineFootnoteNumbers(a.text),
    is_rejection: false,
  }));
}

// ---------------------------------------------------------------------------
// DL Parser
// ---------------------------------------------------------------------------

function parseDL(rawText) {
  const lines = rawText.split('\n');
  const rows = [];

  // DL structure:
  // Lines 1-4: chapter TOC
  // Line 5: Slotwoord
  // Line 6: Inleiding
  // Lines 7-11: Introduction text (skip)
  // Line 12+: "HOOFDSTUK N" followed by chapter title, then articles, then rejections

  // Chapter titles map
  const chapterTitles = {};

  // First pass: collect chapter titles from the TOC (lines 1-4)
  for (let i = 0; i < 5; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const tocMatch = line.match(/^Hoofdstuk-(\d+(?:-\d+)?)\s*:\s*(.+)$/i);
    if (tocMatch) {
      const chNum = tocMatch[1].replace('-', '/');  // "3-4" -> "3/4"
      chapterTitles[chNum] = cleanText(tocMatch[2]);
    }
  }

  // State machine
  let currentChapter = 0;
  let currentChapterTitle = '';
  let currentArticleNum = 0;
  let inRejection = false;
  let rejectionCounter = 0;
  let currentText = [];
  let pendingArticle = false;

  function flushArticle() {
    if (currentChapter > 0 && currentText.length > 0 && pendingArticle) {
      const text = currentText.join('\n');
      rows.push({
        confession: 'DL',
        section_number: currentChapter,
        section_title: currentChapterTitle,
        article_number: inRejection ? rejectionCounter : currentArticleNum,
        article_text: stripInlineFootnoteNumbers(text),
        is_rejection: inRejection,
      });
    }
    currentText = [];
    pendingArticle = false;
  }

  // Skip TOC (lines 0-4), Slotwoord label (5), Inleiding label (6)
  // Find first "HOOFDSTUK" line to start parsing
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^HOOFDSTUK\s+\d/i.test(lines[i].trim())) {
      startIdx = i;
      break;
    }
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Stop at "Slotwoord" section at the end
    if (trimmed === 'Slotwoord' && i > 20) {
      flushArticle();
      break;
    }

    // Stop at website footer content
    if (trimmed === 'Agenda' || trimmed.startsWith('Er zijn geen aankomende')) {
      flushArticle();
      break;
    }

    // Match "HOOFDSTUK N" or "HOOFDSTUK N en N"
    const chapterMatch = trimmed.match(/^HOOFDSTUK\s+(\d+)(?:\s+en\s+(\d+))?$/i);
    if (chapterMatch) {
      flushArticle();

      if (chapterMatch[2]) {
        // "HOOFDSTUK 3 en 4" -> section_number = 3
        currentChapter = parseInt(chapterMatch[1]);
      } else {
        currentChapter = parseInt(chapterMatch[1]);
      }

      // Next line is the chapter title
      if (i + 1 < lines.length) {
        currentChapterTitle = cleanText(lines[i + 1]);
        i++; // skip title line
      }

      currentArticleNum = 0;
      inRejection = false;
      rejectionCounter = 0;
      continue;
    }

    // Match "Veroordeling van de dwalingen" (rejection section)
    if (/^Veroordeling\s+van\s+de\s+dwalingen/i.test(trimmed)) {
      flushArticle();
      inRejection = true;
      rejectionCounter = 0;
      continue;
    }

    // Match "Artikel N"
    const artMatch = trimmed.match(/^Artikel\s+(\d+)$/i);
    if (artMatch) {
      flushArticle();
      if (inRejection) {
        rejectionCounter++;
      } else {
        currentArticleNum = parseInt(artMatch[1]);
      }
      pendingArticle = true;
      continue;
    }

    // In rejection sections without "Artikel N" headers, each pair of paragraphs
    // (error statement + refutation) forms one rejection item.
    // The rejections start with "Na deze uiteenzetting..." intro, then alternate:
    //   - error statement (the false teaching)
    //   - refutation paragraph(s)
    // We need to detect the intro line and then group paragraphs.

    if (inRejection && !pendingArticle && currentText.length === 0) {
      // Check if this is the "Na deze uiteenzetting..." intro line
      if (/^Na deze uiteenzetting/i.test(trimmed)) {
        continue; // skip intro
      }
      // This is the start of a new rejection error paragraph
      if (trimmed && !isFootnoteLine(trimmed)) {
        rejectionCounter++;
        pendingArticle = true;
      }
    }

    // Skip empty lines
    if (!trimmed) {
      // In rejections, empty lines separate error+refutation pairs
      // For now, just continue accumulating
      continue;
    }

    // Skip footnote lines
    if (isFootnoteLine(trimmed)) continue;

    // Accumulate text
    if (currentChapter > 0 && pendingArticle) {
      currentText.push(cleanText(trimmed));
    }
  }

  // Handle the Slotwoord section separately - flush any remaining
  flushArticle();

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Confession Articles Seeder ===\n');

  // Read raw text files
  const ngbPath = join(__dirname, 'data', 'ngb_raw.txt');
  const dlPath = join(__dirname, 'data', 'dl_raw.txt');

  let ngbRaw, dlRaw;
  try {
    ngbRaw = readFileSync(ngbPath, 'utf-8');
    console.log(`Read NGB raw text: ${ngbRaw.length} chars`);
  } catch (e) {
    console.error(`Could not read NGB file at ${ngbPath}`);
    console.error('Place the raw NGB text in supabase/data/ngb_raw.txt');
    process.exit(1);
  }

  try {
    dlRaw = readFileSync(dlPath, 'utf-8');
    console.log(`Read DL raw text: ${dlRaw.length} chars`);
  } catch (e) {
    console.error(`Could not read DL file at ${dlPath}`);
    console.error('Place the raw DL text in supabase/data/dl_raw.txt');
    process.exit(1);
  }

  // Parse
  console.log('\nParsing NGB...');
  const ngbRows = parseNGB(ngbRaw);
  console.log(`  Parsed ${ngbRows.length} NGB articles`);

  console.log('\nParsing DL...');
  const dlRows = parseDL(dlRaw);
  console.log(`  Parsed ${dlRows.length} DL articles/rejections`);

  // Summary
  const dlArticles = dlRows.filter(r => !r.is_rejection);
  const dlRejections = dlRows.filter(r => r.is_rejection);
  console.log(`  - Regular articles: ${dlArticles.length}`);
  console.log(`  - Rejection articles: ${dlRejections.length}`);

  // Show chapter breakdown
  const chapters = new Set(dlRows.map(r => r.section_number));
  for (const ch of [...chapters].sort()) {
    const chRows = dlRows.filter(r => r.section_number === ch);
    const arts = chRows.filter(r => !r.is_rejection).length;
    const rejs = chRows.filter(r => r.is_rejection).length;
    console.log(`    Chapter ${ch}: ${arts} articles, ${rejs} rejections`);
  }

  // Dry-run mode: just show what would be inserted
  if (process.argv.includes('--dry-run')) {
    console.log('\n[DRY RUN] Would insert:');
    console.log(`  ${ngbRows.length} NGB rows`);
    console.log(`  ${dlRows.length} DL rows`);

    // Show first few of each
    console.log('\n--- NGB sample (first 3) ---');
    ngbRows.slice(0, 3).forEach(r => {
      console.log(`  Art ${r.section_number}: ${r.section_title}`);
      console.log(`    ${r.article_text.substring(0, 120)}...`);
    });
    console.log('\n--- DL sample (first 3) ---');
    dlRows.slice(0, 3).forEach(r => {
      console.log(`  Ch ${r.section_number} Art ${r.article_number} (rej=${r.is_rejection}): ${r.section_title}`);
      console.log(`    ${r.article_text.substring(0, 120)}...`);
    });
    return;
  }

  // Delete existing and insert
  console.log('\nDeleting existing confession articles...');
  await deleteAllConfessions();

  console.log('\nInserting NGB articles...');
  const ngbInserted = await insertBatch(ngbRows);
  console.log(`  Inserted ${ngbInserted} NGB articles.`);

  console.log('\nInserting DL articles...');
  const dlInserted = await insertBatch(dlRows);
  console.log(`  Inserted ${dlInserted} DL articles.`);

  console.log(`\nDone! Total: ${ngbInserted + dlInserted} confession articles inserted.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
