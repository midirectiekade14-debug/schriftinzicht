const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DEST = 'C:/Users/midir/schriftinzicht/pdf_import/calvijn';

// Exact hrefs from the browser
const links = [
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/01.%20Genesis%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/02.%20Exodus,%20Leviticus,%20Numeri%20&%20Deuteronomium%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/03.%20Jozua%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/04.%20Psalmen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/05.%20Jesaja%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/06.%20Jeremia%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/07.%20Klaagliederen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/08.%20Ezechiel%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/09.%20Daniel%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/10.%20Hosea%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/11.%20Joel%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/12.%20Amos%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/13.%20Obadja%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/14.%20Jona%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/15.%20Micha%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/16.%20Nahum%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/17.%20Habakuk%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/18.%20Zefanja%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/19.%20Haggai%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/20.%20Zacharia%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/21.%20Maleachi%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/22.%20Evangeli%C3%ABn%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/23.%20Johannes%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/24.%20Handelingen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/25.%20Romeinen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/26.%201%20Korinthe%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/27.%202%20Korinthe%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/28.%20Galaten%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/29.%20Efeze%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/30.%20Filippenzen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/31.%20Kolossenzen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/32.%201%20Thessalonicenzen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/33.%202%20Thessalonicenzen%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/34.%201%20Timothe%C3%BCs%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/35.%202%20Timothe%C3%BCs%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/36.%20Titus%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/37.%20Filemon%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/38.%20Hebree%C3%ABn%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/39.%20Jakobus%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/40.%201%20Petrus%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/41.%202%20Petrus%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/42.%201%20Johannes%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/43.%20Judas%20[Calvijn].pdf",
  "https://reformata.nl/Theologie/Verklaringen/Calvijn/44.%20Pastorale%20brieven%20[Calvijn].pdf"
];

let success = 0;
let failed = 0;

for (let i = 0; i < links.length; i++) {
  const url = links[i];
  // Decode the URL path to get the filename
  const encodedFilename = url.split('/').pop();
  const filename = decodeURIComponent(encodedFilename);
  const destPath = path.join(DEST, filename);

  process.stdout.write(`[${i+1}/44] ${filename} ... `);

  try {
    // Use --globoff to prevent curl from interpreting [] as glob patterns
    execSync(`curl -L -s --globoff -o "${destPath}" "${url}"`, { timeout: 120000 });
    const stat = fs.statSync(destPath);
    const sizeKB = Math.round(stat.size / 1024);
    console.log(`OK (${sizeKB} KB)`);
    success++;
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    failed++;
  }
}

// Total size
try {
  const totalBytes = links.reduce((acc, url) => {
    const filename = decodeURIComponent(url.split('/').pop());
    const p = path.join(DEST, filename);
    try { return acc + fs.statSync(p).size; } catch { return acc; }
  }, 0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(1);
  console.log(`\n=== DONE: ${success}/44 OK, ${failed} failed ===`);
  console.log(`Total size: ${totalMB} MB`);
} catch(e) {
  console.log(`\n=== DONE: ${success}/44 OK, ${failed} failed ===`);
}
