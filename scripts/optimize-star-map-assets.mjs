// Downscale + webp the large star-map PNG masters into small runtime thumbnails.
// Masters stay in public/assets/star-map/<cat>/*.png (design record);
// the app loads public/assets/star-map/opt/<cat>/*.webp.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'public/assets/star-map';
const CATS = ['stars', 'constellations', 'rarities', 'mascots', 'effects'];
const MAX = 256, Q = 82;
let n = 0, before = 0, after = 0;

for (const cat of CATS) {
  const dir = path.join(ROOT, cat);
  if (!fs.existsSync(dir)) continue;
  const out = path.join(ROOT, 'opt', cat);
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.png'))) {
    const src = path.join(dir, f);
    const dst = path.join(out, f.replace(/\.png$/, '.webp'));
    before += fs.statSync(src).size;
    await sharp(src)
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: Q, alphaQuality: 90 })
      .toFile(dst);
    after += fs.statSync(dst).size;
    n++;
  }
}
console.log(`optimized ${n} assets: ${(before / 1e6).toFixed(1)}MB -> ${(after / 1e6).toFixed(2)}MB webp`);
