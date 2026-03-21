/**
 * Fix truncated commentaries (10003 chars) by re-importing from JSON source files.
 * Only updates records where commentary_text is exactly 10003 chars.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // Need service role for updates

// Author name → author_id mapping
const AUTHOR_MAP = {
  'Calvijn': 2,
  'Calvin': 2,
  'Brakel': 4,
  'à Brakel': 4,
  'Voetius': 5,
  'Comrie': 6,
  'Smijtegelt': 7,
  'Van der Groe': 8,
  'Hellenbroek': 9,
  'Matthew Henry': 10,
  'Bunyan': 11,
  'Boston': 12,
  'Spurgeon': 13,
  'Kohlbrügge': 14,
  'Dächsel': 15,
  'Da Costa': 16,
};

// JSON source files per author_id
const SOURCE_FILES = {
  2: ['calvijn.json', 'calvijn_extra.json'],
  4: ['brakel.json', 'brakel_extra.json', 'brakel_extra2.json', 'brakel_remaining.json'],
  6: ['comrie.json', 'comrie_extra.json', 'comrie_extra2.json'],
  8: ['vandergroe.json', 'vandergroe_extra.json'],
  11: ['bunyan.json', 'bunyan_extra.json', 'bunyan_extra2.json', 'bunyan_remaining.json'],
  12: ['boston.json', 'boston_extra.json', 'boston_remaining.json'],
  13: ['spurgeon_nl.json'],
  14: ['kohlbrugge.json', 'kohlbrugge_extra.json', 'kohlbrugge_new.json', 'kohlbrugge_remaining.json'],
  16: ['dacosta.json', 'dacosta_extra.json', 'dacosta_remaining.json', 'dacosta_bijbellezingen.json'],
};

async function query(endpoint, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...rest,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
  if (rest.method === 'PATCH') return res;
  return res.json();
}

async function main() {
  console.log('=== FIX TRUNCATED COMMENTARIES ===\n');

  // Step 1: Get all truncated records from DB
  // We need to query per author since there may be >1000 total
  const authorIds = [2, 4, 6, 8, 11, 12, 13, 14, 16];
  const truncated = [];

  for (const authorId of authorIds) {
    const records = await query(
      `commentaries?select=id,verse_id,author_id,commentary_text&author_id=eq.${authorId}&language=eq.nl&limit=1000`
    );
    const cut = records.filter(r => (r.commentary_text || '').length === 10003);
    truncated.push(...cut);
    if (cut.length > 0) {
      console.log(`Author ${authorId}: ${cut.length} afgekapte records gevonden`);
    }
  }
  console.log(`\nTotaal: ${truncated.length} afgekapte records\n`);

  // Step 2: Build verse_id → book/chapter/verse lookup
  const verseIds = [...new Set(truncated.map(r => r.verse_id))];
  console.log(`Ophalen verse info voor ${verseIds.length} verzen...`);

  const verseLookup = {};
  // Fetch in batches of 100
  for (let i = 0; i < verseIds.length; i += 100) {
    const batch = verseIds.slice(i, i + 100);
    const verses = await query(
      `bible_verses?select=id,book_id,chapter,verse,bible_books(name)&id=in.(${batch.join(',')})`
    );
    for (const v of verses) {
      verseLookup[v.id] = {
        bookName: v.bible_books?.name,
        bookId: v.book_id,
        chapter: v.chapter,
        verse: v.verse,
      };
    }
  }

  // Step 3: Load source JSONs and build lookup
  console.log('Laden bronbestanden...\n');
  const sourceLookup = {}; // "authorId_bookName_chapter_verse" → full text

  // Also need book name mapping for JSON entries
  const booksRes = await query('bible_books?select=id,name&order=id');
  const bookNameToId = {};
  for (const b of booksRes) {
    bookNameToId[b.name.toLowerCase()] = b.id;
    // Also store without accents/variations
    const simplified = b.name.toLowerCase()
      .replace(/ë/g, 'e').replace(/ü/g, 'u').replace(/ö/g, 'o')
      .replace(/\s+der\s+apostelen/g, '');
    bookNameToId[simplified] = b.id;
  }

  for (const [authorIdStr, files] of Object.entries(SOURCE_FILES)) {
    const authorId = parseInt(authorIdStr);
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath) === false) continue;

      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(data) === false) continue;

        for (const entry of data) {
          if ((entry.text || '').length <= 10000) continue; // Only care about long texts
          const book = (entry.book || '').trim();
          const chapter = entry.chapter;
          const verse = entry.verse;
          if (book && chapter && verse) {
            const key = `${authorId}_${book.toLowerCase()}_${chapter}_${verse}`;
            // Keep the longest version
            if (sourceLookup[key] === undefined || entry.text.length > sourceLookup[key].length) {
              sourceLookup[key] = entry.text;
            }
          }
        }
      } catch (e) {
        console.log(`  Fout bij laden ${file}: ${e.message}`);
      }
    }
  }
  console.log(`${Object.keys(sourceLookup).length} lange bronentries geladen\n`);

  // Step 4: Match and update
  let updated = 0;
  let notFound = 0;

  for (const record of truncated) {
    const verseInfo = verseLookup[record.verse_id];
    if (verseInfo === undefined) {
      notFound++;
      continue;
    }

    const key = `${record.author_id}_${verseInfo.bookName.toLowerCase()}_${verseInfo.chapter}_${verseInfo.verse}`;
    const fullText = sourceLookup[key];

    if (fullText === undefined) {
      // Try alternative book name formats
      let found = false;
      for (const [bookKey, text] of Object.entries(sourceLookup)) {
        if (bookKey.startsWith(`${record.author_id}_`) && bookKey.endsWith(`_${verseInfo.chapter}_${verseInfo.verse}`)) {
          // Check if book name is similar
          const parts = bookKey.split('_');
          const jsonBook = parts.slice(1, -2).join('_');
          const dbBook = verseInfo.bookName.toLowerCase();
          if (dbBook.includes(jsonBook) || jsonBook.includes(dbBook) ||
              dbBook.replace(/[ëüö]/g, c => ({ë:'e',ü:'u',ö:'o'})[c]).includes(jsonBook)) {
            // Match found
            const res = await query(`commentaries?id=eq.${record.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ commentary_text: text }),
              headers: { Prefer: 'return=minimal' },
            });
            if (res.ok) {
              updated++;
              console.log(`  ✓ ID ${record.id} (${verseInfo.bookName} ${verseInfo.chapter}:${verseInfo.verse}) → ${text.length} chars`);
            }
            found = true;
            break;
          }
        }
      }
      if (found === false) {
        notFound++;
        console.log(`  ✗ ID ${record.id} niet gevonden in brondata (${verseInfo.bookName} ${verseInfo.chapter}:${verseInfo.verse})`);
      }
      continue;
    }

    // Update the record
    const res = await query(`commentaries?id=eq.${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ commentary_text: fullText }),
      headers: { Prefer: 'return=minimal' },
    });
    if (res.ok) {
      updated++;
      console.log(`  ✓ ID ${record.id} (${verseInfo.bookName} ${verseInfo.chapter}:${verseInfo.verse}) → ${fullText.length} chars`);
    } else {
      console.log(`  ✗ ID ${record.id} update failed: ${res.status}`);
    }
  }

  console.log(`\n=== RESULTAAT ===`);
  console.log(`Bijgewerkt: ${updated}`);
  console.log(`Niet gevonden in brondata: ${notFound}`);
  console.log(`Totaal verwerkt: ${truncated.length}`);
}

main().catch(console.error);
