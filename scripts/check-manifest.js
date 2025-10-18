#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: node check-manifest.js <manifest.json>');
  process.exit(1);
}
const abs = path.resolve(manifestPath);
const baseDir = path.dirname(abs);
const projectDir = baseDir;
const data = JSON.parse(fs.readFileSync(abs, 'utf8'));
const images = Array.isArray(data.images) ? data.images : [];
let missing = 0;
for (const item of images) {
  const raw = typeof item.src === 'string' ? item.src.trim() : '';
  if (!raw) continue;
  const full = raw.startsWith('images/') ? path.resolve(raw) : path.join(projectDir, raw);
  if (!fs.existsSync(full)) {
    console.log('Missing:', full);
    missing++;
  }
}
if (!missing) {
  console.log('All files present for', manifestPath);
}
