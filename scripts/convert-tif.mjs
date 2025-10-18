#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Recursively walk a directory and return files matching extensions
function walk(dir, exts) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, exts));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) out.push(full);
    }
  }
  return out;
}

async function main() {
  const root = path.resolve('images');
  const tifs = walk(root, ['.tif', '.tiff']);
  if (!tifs.length) {
    console.log('No .tif/.tiff files found under images/.');
    return;
  }
  for (const src of tifs) {
    const dir = path.dirname(src);
    const base = path.basename(src, path.extname(src));
    const outWebp = path.join(dir, `${base}.webp`);
    if (fs.existsSync(outWebp)) {
      console.log(`Skip existing: ${outWebp}`);
      continue;
    }
    try {
      console.log(`Converting to WebP: ${src} -> ${outWebp}`);
      await sharp(src)
        .webp({ quality: 82 })
        .toFile(outWebp);
    } catch (e) {
      console.warn(`Failed to convert ${src}:`, e.message);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
