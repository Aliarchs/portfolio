#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const root = path.resolve(process.cwd());
const imagesDir = path.join(root, 'images');
export const projectDirs = ['project 2', 'project 3', 'project 4', 'project 5'];

/**
 * Generate a human-friendly alt text from a filename.
 */
function altFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '');
  return base
    .replace(/[._-]+/g, ' ')
    .replace(/\b(\d{8,})\b/g, '$1')
    .trim();
}

export async function readJsonSafe(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export async function writeJsonPretty(file, data) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function listImages(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile())
      .map(e => e.name)
      // Include tiff so we can detect and convert them; browsers don't display tiff directly
      .filter(name => name.match(/\.(jpe?g|png|webp|tiff?)$/i))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  } catch (e) {
    return [];
  }
}

// Lazy-load sharp to avoid hard dependency at runtime and make script resilient if not installed
let _sharpPromise;
async function getSharp() {
  if (_sharpPromise !== undefined) return _sharpPromise;
  try {
    _sharpPromise = import('sharp').then(m => m.default || m).catch(() => null);
  } catch {
    _sharpPromise = Promise.resolve(null);
  }
  return _sharpPromise;
}

async function fileExists(p) {
  try { await fs.stat(p); return true; } catch { return false; }
}

async function needsRebuild(srcPath, destPath) {
  try {
    const [s, d] = await Promise.all([fs.stat(srcPath), fs.stat(destPath)]);
    return s.mtimeMs > d.mtimeMs; // rebuild if source is newer
  } catch {
    return true; // dest missing
  }
}

async function convertTiffToWebpIfNeeded(dir, filename) {
  const sharp = await getSharp();
  if (!sharp) {
    // Sharp not available; skip including TIFFs as they are not browser-friendly
    console.warn(`[manifest] TIFF found but 'sharp' not available, skipping: ${filename}`);
    return null;
  }
  const input = path.join(dir, filename);
  const outputName = filename.replace(/\.(tiff?)$/i, '.webp');
  const output = path.join(dir, outputName);
  const doBuild = await needsRebuild(input, output);
  if (!doBuild) return outputName;
  try {
    await sharp(input).webp({ quality: 82 }).toFile(output);
    return outputName;
  } catch (e) {
    console.error(`[manifest] Failed converting TIFF to WebP for ${filename}:`, e.message);
    return null;
  }
}

export async function updateManifestForProject(projectDirName) {
  const folder = path.join(imagesDir, projectDirName);
  const manifestPath = path.join(folder, 'manifest.json');

  const existing = await readJsonSafe(manifestPath);
  const existingMap = new Map();
  const existingOrder = [];
  if (existing && Array.isArray(existing.images)) {
    for (const item of existing.images) {
      if (!item || typeof item.src !== 'string') continue;
      const src = item.src.trim();
      existingMap.set(src, item.alt || '');
      existingOrder.push(src);
    }
  }

  const files = await listImages(folder);

  // Convert TIFFs to WebP and build a processed list of web-friendly filenames
  const processed = [];
  for (const name of files) {
    if (/\.(tiff?)$/i.test(name)) {
      const out = await convertTiffToWebpIfNeeded(folder, name);
      if (out) processed.push(out);
      // If conversion failed or sharp missing, we exclude the tiff so browser doesn't try to render it
    } else {
      processed.push(name);
    }
  }

  // Build new list preserving manual order for files that still exist
  const fileSet = new Set(processed);
  const ordered = [];
  // 1) Keep existing order entries that still exist
  for (const src of existingOrder) {
    if (fileSet.has(src)) {
      ordered.push({ src, alt: existingMap.get(src) || altFromFilename(src) });
      fileSet.delete(src);
    }
  }
  // 2) Append any new files not present in existing order (sorted)
  const remaining = Array.from(fileSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  for (const name of remaining) {
    ordered.push({ src: name, alt: existingMap.get(name) || altFromFilename(name) });
  }

  const images = ordered;

  const title = existing?.title || projectDirName.replace(/^project\s+/i, 'Project ');
  const manifest = { title, images };
  await writeJsonPretty(manifestPath, manifest);
  return { project: projectDirName, count: images.length };
}

export async function updateAllManifests() {
  const results = [];
  for (const dir of projectDirs) {
    const r = await updateManifestForProject(dir);
    results.push(r);
  }
  const summary = results.map(r => `${r.project}: ${r.count} images`).join('\n');
  console.log('Manifests updated:\n' + summary);
}

// Run only when executed directly (not when imported)
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  updateAllManifests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
