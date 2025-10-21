#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import sharpModule from 'sharp';

const sharp = sharpModule;
// Conserve memory for large inputs
sharp.cache(false);
sharp.concurrency(1);

const root = path.resolve(process.cwd());
const imagesDir = path.join(root, 'images');
const responsiveRoot = path.join(imagesDir, 'resized');
const SIZES = [400, 800, 1200];

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true }).catch(() => {});
}

async function resizeOne(projectDirName, filename) {
  const srcAbs = path.join(imagesDir, projectDirName, filename);
  if (!fs.existsSync(srcAbs)) {
    console.error('Source not found:', srcAbs);
    process.exit(1);
  }
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext);

  for (const size of SIZES) {
    const outDir = path.join(responsiveRoot, String(size), projectDirName);
    await ensureDir(outDir);
    // Original format resize
    const outOrig = path.join(outDir, filename);
    try {
      await sharp(srcAbs, { sequentialRead: true })
        .resize({ width: size })
        .toFile(outOrig);
      console.log('Wrote', outOrig);
    } catch (e) {
      console.warn('Original resize failed @', size, e.message);
    }
    // WebP
    const outWebp = path.join(outDir, base + '.webp');
    try {
      await sharp(srcAbs, { sequentialRead: true })
        .resize({ width: size })
        .webp({ quality: 80 })
        .toFile(outWebp);
      console.log('Wrote', outWebp);
    } catch (e) {
      console.warn('WebP resize failed @', size, e.message);
    }
    // AVIF
    const outAvif = path.join(outDir, base + '.avif');
    try {
      await sharp(srcAbs, { sequentialRead: true })
        .resize({ width: size })
        .avif({ quality: 50 })
        .toFile(outAvif);
      console.log('Wrote', outAvif);
    } catch (e) {
      console.warn('AVIF resize failed @', size, e.message);
    }
  }
}

async function main() {
  const [projectDirName, filename] = process.argv.slice(2);
  if (!projectDirName || !filename) {
    console.error('Usage: node scripts/resize-one.mjs "project 5" "20210818_200211.jpg"');
    process.exit(1);
  }
  await resizeOne(projectDirName, filename);
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
