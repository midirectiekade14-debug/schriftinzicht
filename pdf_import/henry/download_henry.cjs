const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEST = 'C:/Users/midir/schriftinzicht/pdf_import/henry';
const BASE = 'https://reformata.nl/Theologie/Verklaringen/Henry,%20M.%20-%20Letterlijke%20en%20practicale%20verklaring%20van%20het%20Oude%20en%20Nieuwe%20Testament';

// All 66 PDF filenames (decoded for local names, encoded for URLs)
const files = [
  '01. Genesis [Henry].pdf',
  '02. Exodus [Henry].pdf',
  '03. Leviticus [Henry].pdf',
  '04. Numeri [Henry].pdf',
  '05. Deuteronomium [Henry].pdf',
  '06. Jozua [Henry].pdf',
  '07. Richteren [Henry].pdf',
  '08. Ruth [Henry].pdf',
  '09. 1 Samuel [Henry].pdf',
  '10. 2 Samuel [Henry].pdf',
  '11. 1 Koningen [Henry].pdf',
  '12. 2 Koningen [Henry].pdf',
  '13. 1 Kronieken [Henry].pdf',
  '14. 2 Kronieken [Henry].pdf',
  '15. Ezra [Henry].pdf',
  '16. Nehemia [Henry].pdf',
  '17. Esther [Henry].pdf',
  '18. Job [Henry].pdf',
  '19. Psalmen [Henry].pdf',
  '20. Spreuken [Henry].pdf',
  '21. Prediker [Henry].pdf',
  '22. Hooglied [Henry].pdf',
  '23. Jesaja [Henry].pdf',
  '24. Jeremia [Henry].pdf',
  '25. Klaagliederen [Henry].pdf',
  '26. Ezechiel [Henry].pdf',
  '27. Daniel [Henry].pdf',
  '28. Hosea [Henry].pdf',
  '29. Joel [Henry].pdf',
  '30. Amos [Henry].pdf',
  '31. Obadja [Henry].pdf',
  '32. Jona [Henry].pdf',
  '33. Micha [Henry].pdf',
  '34. Nahum [Henry].pdf',
  '35. Habakuk [Henry].pdf',
  '36. Zefanja [Henry].pdf',
  '37. Haggai [Henry].pdf',
  '38. Zacharia [Henry].pdf',
  '39. Maleachi [Henry].pdf',
  '40. Mattheüs [Henry].pdf',
  '41. Markus [Henry].pdf',
  '42. Lukas [Henry].pdf',
  '43. Johannes [Henry].pdf',
  '44. Handelingen [Henry].pdf',
  '45. Romeinen [Henry].pdf',
  '46. 1 Corinthiërs [Henry].pdf',
  '47. 2 Corinthiërs [Henry].pdf',
  '48. Galaten [Henry].pdf',
  '49. Efeziërs [Henry].pdf',
  '50. Filippenzen [Henry].pdf',
  '51. Colossenzen [Henry].pdf',
  '52. 1 Thessalonicenzen [Henry].pdf',
  '53. 2 Thessalonicenzen [Henry].pdf',
  '54. 1 Timotheüs [Henry].pdf',
  '55. 2 Timotheüs [Henry].pdf',
  '56. Titus [Henry].pdf',
  '57. Filemon [Henry].pdf',
  '58. Hebreeën [Henry].pdf',
  '59. Jakobus [Henry].pdf',
  '60. 1 Petrus [Henry].pdf',
  '61. 2 Petrus [Henry].pdf',
  '62. 1 Johannes [Henry].pdf',
  '63. 2 Johannes [Henry].pdf',
  '64. 3 Johannes [Henry].pdf',
  '65. Judas [Henry].pdf',
  '66. Openbaring [Henry].pdf',
];

// Encode filename for URL: encode spaces, brackets, special chars
function encodeFilename(name) {
  // Use encodeURIComponent but keep dots
  return name
    .replace(/ /g, '%20')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/ü/g, '%C3%BC')
    .replace(/ë/g, '%C3%AB')
    .replace(/ë/g, '%C3%AB')
    .replace(/é/g, '%C3%A9')
    .replace(/è/g, '%C3%A8')
    .replace(/ï/g, '%C3%AF');
}

let success = 0;
let failed = 0;
const failedFiles = [];

for (const filename of files) {
  const encoded = encodeFilename(filename);
  const url = `${BASE}/${encoded}`;
  const outfile = path.join(DEST, filename);

  process.stdout.write(`[${files.indexOf(filename) + 1}/66] ${filename} ... `);

  try {
    execSync(`curl -s -o "${outfile}" -w "%{http_code}" -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" -H "Referer: https://reformata.nl/" "${url}"`, { encoding: 'utf8' });

    // Check file exists and has size
    if (fs.existsSync(outfile)) {
      const size = fs.statSync(outfile).size;
      if (size > 1000) {
        console.log(`OK (${(size/1024).toFixed(0)} KB)`);
        success++;
      } else {
        console.log(`FAILED (too small: ${size} bytes)`);
        fs.unlinkSync(outfile);
        failed++;
        failedFiles.push(filename);
      }
    } else {
      console.log('FAILED (no file)');
      failed++;
      failedFiles.push(filename);
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    failed++;
    failedFiles.push(filename);
  }
}

console.log(`\n=== RESULTAAT: ${success} OK, ${failed} MISLUKT ===`);
if (failedFiles.length > 0) {
  console.log('Mislukt:');
  failedFiles.forEach(f => console.log(' -', f));
}

// Total size
try {
  const totalBytes = files
    .map(f => path.join(DEST, f))
    .filter(f => fs.existsSync(f))
    .reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`Totale grootte: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
} catch(e) {}
