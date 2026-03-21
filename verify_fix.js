require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

async function q(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return res.json();
}

async function main() {
  const authors = await q('authors?select=id,name&order=name');
  let totalTruncated = 0;
  let totalComms = 0;
  
  console.log('=== VERIFICATIE NA FIX ===\n');
  
  for (const a of authors) {
    const comms = await q(`commentaries?select=id,commentary_text&author_id=eq.${a.id}&language=eq.nl&limit=1000`);
    if (comms.length === 0) continue;
    totalComms += comms.length;
    
    const truncated = comms.filter(c => (c.commentary_text || '').length === 10003);
    totalTruncated += truncated.length;
    
    const lengths = comms.map(c => (c.commentary_text || '').length);
    const max = Math.max(...lengths);
    const avg = Math.round(lengths.reduce((a,b) => a+b, 0) / lengths.length);
    
    console.log(`${a.name}: ${comms.length} records, gem=${avg}ch, max=${max}ch${truncated.length > 0 ? ' ⚠️ ' + truncated.length + 'x afgekapt' : ' ✓'}`);
  }
  
  console.log(`\nTotaal: ${totalComms} commentaren, ${totalTruncated} nog afgekapt`);
}
main().catch(console.error);
