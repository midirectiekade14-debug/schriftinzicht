require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

async function main() {
  // Get all authors with full info
  const authRes = await fetch(`${url}/rest/v1/authors?select=id,name,born_year,died_year,era&order=born_year`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const authors = await authRes.json();

  console.log('=== AUTEURS — CHRONOLOGISCH ===\n');
  for (const a of authors) {
    // Check year_written distribution
    const commRes = await fetch(`${url}/rest/v1/commentaries?select=year_written&author_id=eq.${a.id}&language=eq.nl&limit=10`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    const comms = await commRes.json();
    const years = [...new Set(comms.map(c => c.year_written).filter(Boolean))];

    console.log(`${a.name} (${a.born_year || '?'}–${a.died_year || '?'}) | era: ${a.era || 'GEEN'} | year_written: ${years.length ? years.join(', ') : 'GEEN'}`);
  }

  // Also check current sort order in the query
  console.log('\n=== HUIDIGE QUERY SORTERING ===');
  console.log('commentaries ORDER BY: year_written ASC (zie VerzenScreen regel 165)');
}
main().catch(console.error);
