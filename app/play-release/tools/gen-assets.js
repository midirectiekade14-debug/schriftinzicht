const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SVG_PATH = path.join(ROOT, 'web/public/icon.svg');
const APP_ASSETS = path.join(ROOT, 'app/assets');
const WEB_PUBLIC = path.join(ROOT, 'web/public');
const OUT_GRAPHICS = path.join(__dirname, '../graphics');

const svg = fs.readFileSync(SVG_PATH);

const ADAPTIVE_FG_SVG = Buffer.from(
  svg
    .toString()
    .replace(/<rect width="1024" height="1024" rx="224" fill="url\(#bg\)"\/>/, '')
    .replace(/<rect width="1024" height="1024" rx="224" fill="url\(#glow\)"\/>/, '')
);

const BG_DARK = { r: 12, g: 10, b: 9, alpha: 1 };

async function render(svgBuf, size) {
  return sharp(svgBuf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function renderOnBg(svgBuf, size, bg) {
  const fg = await render(svgBuf, size);
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg }
  })
    .composite([{ input: fg }])
    .png()
    .toBuffer();
}

async function main() {
  console.log('icon.png (1024, app)');
  const icon1024 = await render(svg, 1024);
  fs.writeFileSync(path.join(APP_ASSETS, 'icon.png'), icon1024);
  fs.writeFileSync(path.join(OUT_GRAPHICS, 'icon-1024.png'), icon1024);

  console.log('adaptive-icon.png (1024, foreground with safe padding)');
  const fgOnly = await render(ADAPTIVE_FG_SVG, 672);
  const adaptive = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: fgOnly, top: 176, left: 176 }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(APP_ASSETS, 'adaptive-icon.png'), adaptive);
  fs.writeFileSync(path.join(OUT_GRAPHICS, 'adaptive-icon-1024.png'), adaptive);

  console.log('splash.png (1284x2778, dark bg + centered logo)');
  const splashLogo = await render(ADAPTIVE_FG_SVG, 768);
  const splash = await sharp({
    create: { width: 1284, height: 2778, channels: 4, background: BG_DARK }
  })
    .composite([{ input: splashLogo, top: Math.round((2778 - 768) / 2), left: Math.round((1284 - 768) / 2) }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(APP_ASSETS, 'splash.png'), splash);
  fs.writeFileSync(path.join(OUT_GRAPHICS, 'splash-1284x2778.png'), splash);

  console.log('Play Store hi-res icon (512, no alpha)');
  const playstore = await sharp(svg, { density: 384 })
    .resize(512, 512, { fit: 'contain', background: BG_DARK })
    .flatten({ background: BG_DARK })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT_GRAPHICS, 'playstore-icon-512.png'), playstore);

  console.log('web icon-192, icon-512');
  const web192 = await render(svg, 192);
  const web512 = await render(svg, 512);
  fs.writeFileSync(path.join(WEB_PUBLIC, 'icon-192.png'), web192);
  fs.writeFileSync(path.join(WEB_PUBLIC, 'icon-512.png'), web512);

  console.log('feature graphic placeholder (1024x500)');
  const fgLogo = await render(svg, 420);
  const feature = await sharp({
    create: { width: 1024, height: 500, channels: 4, background: BG_DARK }
  })
    .composite([{ input: fgLogo, top: 40, left: 302 }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT_GRAPHICS, 'feature-graphic-1024x500.png'), feature);

  console.log('og-image (1200x630) for web');
  const ogLogo = await render(svg, 480);
  const og = await sharp({
    create: { width: 1200, height: 630, channels: 4, background: BG_DARK }
  })
    .composite([{ input: ogLogo, top: 75, left: 360 }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(WEB_PUBLIC, 'og-image.png'), og);

  console.log('done');
}

main().catch((err) => { console.error(err); process.exit(1); });
