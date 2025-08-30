// resize-images.js
// Simple Node script to batch-resize images in the repo's images/ folder
// Produces resized images into images/resized/{width}/ with same filenames.
// Requirements: Node.js, npm install sharp

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INPUT_DIR = path.join(__dirname, '..', 'images');
const OUTPUT_DIR = path.join(INPUT_DIR, 'resized');
const SIZES = [400, 800, 1200];

if (!fs.existsSync(INPUT_DIR)) {
  console.error('Input images directory not found:', INPUT_DIR);
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
SIZES.forEach(sz => {
  const d = path.join(OUTPUT_DIR, String(sz));
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f));

async function processFile(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  for (const size of SIZES) {
    const outDir = path.join(OUTPUT_DIR, String(size));
    const outPath = path.join(outDir, filename);
    try {
      await sharp(inputPath)
        .resize({ width: size })
        .toFile(outPath);
      console.log('Wrote', outPath);
    } catch (err) {
      console.error('Failed to process', filename, '->', err.message);
    }
  }
}

(async function main() {
  for (const f of files) {
    // skip already-resized folder
    if (f === 'resized') continue;
    await processFile(f);
  }
  console.log('Done.');
})();
