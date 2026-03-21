const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.env.USERPROFILE, 'schriftinzicht');

const files = fs.readdirSync(dir).filter(f =>
  f.endsWith('.json') &&
  f.indexOf('package') === -1 &&
  f.indexOf('bible_') === -1 &&
  f.indexOf('sermons_') !== 0
);

let totalLong = 0;
console.log('=== JSON BRONBESTANDEN MET TEKSTEN > 10000 CHARS ===\n');

for (const file of files.sort()) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (Array.isArray(data) === false) continue;

    const long = data.filter(e => (e.text || '').length > 10000);

    if (long.length > 0) {
      const maxLen = Math.max(...long.map(e => e.text.length));
      console.log(file + ': ' + data.length + ' entries, ' + long.length + ' >10K (max: ' + maxLen + ')');
      totalLong += long.length;
    }
  } catch (e) {
    // skip
  }
}
console.log('\nTOTAAL: ' + totalLong + ' teksten die bij import afgekapt werden');
