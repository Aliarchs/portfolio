#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const root = path.resolve(process.cwd());
const imagesDir = path.join(root, 'images');
export const projectDirs = ['project 2', 'project 3', 'project 4', 'project 5'];
const responsiveRoot = path.join(imagesDir, 'resized');
const RESPONSIVE_SIZES = [400, 800, 1200];

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

/**
 * Ensure resized and WebP variants exist for an image inside a project directory.
 * Writes to images/resized/{size}/{projectDir}/{filename|.webp}.
 * No-op if sharp isn't installed; returns false in that case.
 */
async function ensureResponsiveVariants(projectDirName, filename) {
  const sharp = await getSharp();
  if (!sharp) {
    // Keep working without hard failure; the site will just use originals
    return false;
  }
  const srcAbs = path.join(imagesDir, projectDirName, filename);
  const ext = path.extname(filename).toLowerCase();
  const base = path.basename(filename, ext);

  // Skip if source doesn't exist (e.g., a stale entry)
  if (!(await fileExists(srcAbs))) return false;

  let wroteAny = false;
  for (const size of RESPONSIVE_SIZES) {
    const outDir = path.join(responsiveRoot, String(size), projectDirName);
    await fs.mkdir(outDir, { recursive: true }).catch(() => {});

    const destAbs = path.join(outDir, filename);
    const needRaster = await needsRebuild(srcAbs, destAbs);
    if (needRaster) {
      try {
        await sharp(srcAbs).resize({ width: size }).toFile(destAbs);
        wroteAny = true;
      } catch (e) {
        // continue to try webp, but don't throw
        // console.error(`[responsive] raster fail ${projectDirName}/${filename}@${size}:`, e.message);
      }
    }

    // Write WebP variant as well
    const webpAbs = path.join(outDir, base + '.webp');
    const needWebp = await needsRebuild(srcAbs, webpAbs);
    if (needWebp) {
      try {
        await sharp(srcAbs).resize({ width: size }).webp({ quality: 80 }).toFile(webpAbs);
        wroteAny = true;
      } catch (e) {
        // console.error(`[responsive] webp fail ${projectDirName}/${filename}@${size}:`, e.message);
      }
    }
  }
  return wroteAny;
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

  // Build responsive assets in parallel (best-effort)
  await Promise.all(
    processed.map(name => ensureResponsiveVariants(projectDirName, name).catch(() => false))
  );

  // Enrich with dimensions and a precomputed span for certain projects so the client-side
  // can avoid computing layout every time and reserve space to prevent layout shift.
  // We include dimensions for ALL projects; we only precompute span for specific ones.
  const shouldPrecomputeLayout = /^(project\s+(2|3|4))$/i.test(projectDirName);
  let dimsMap = new Map();
  {
    const sharp = await getSharp();
    async function getDims(filename) {
      // Try detecting from resized variant first (fast), fallback to original
      const tryPaths = [
        path.join(responsiveRoot, '1200', projectDirName, filename),
        path.join(folder, filename)
      ];
      for (const p of tryPaths) {
        try {
          const st = await fs.stat(p);
          if (!st) continue;
          if (sharp) {
            const m = await sharp(p).metadata();
            const w = m.width || 0, h = m.height || 0;
            if (w && h) return { w, h, ar: w / h };
          }
        } catch {}
      }
      return { w: 0, h: 0, ar: 1 };
    }
    const dims = await Promise.all(processed.map(async (name) => {
      const d = await getDims(name);
      return [name, d];
    }));
    dimsMap = new Map(dims);

    // Precompute spans only for select projects, but always include dimensions
    let imagesWithDims;
    if (shouldPrecomputeLayout) {
      // Classify spans deterministically based on aspect ratio and a conservative big fraction
      const BIG_FRACTION = 0.12;
      const orderedNames = processed.slice(); // preserve order from existing/remaining
      const itemsForCost = orderedNames.map(name => ({
        name,
        ...dimsMap.get(name),
        // closeness to square (for big), log metric
        costBig: Math.abs(Math.log(((dimsMap.get(name)?.ar || 1) / 1.0)))
      }));
      const bigTarget = Math.max(0, Math.round(itemsForCost.length * BIG_FRACTION));
      // Sort by closeness to square first, then by larger pixel area, then by name
      itemsForCost.sort((a,b) => (a.costBig - b.costBig)
        || (((b.w || 0)*(b.h || 0)) - ((a.w || 0)*(a.h || 0)))
        || a.name.localeCompare(b.name));
      const bigChosen = new Set(itemsForCost.slice(0, bigTarget).map(x => x.name));

      function classifySpan(d) {
        const ar = d?.ar || 1;
        if (bigChosen.has(d.name)) return 'big';
        if (ar >= 1.65) return 'wide';
        if (ar <= 0.66) return 'tall';
        return null; // normal
      }
      imagesWithDims = processed.map(name => {
        const d = dimsMap.get(name) || { w: 0, h: 0, ar: 1 };
        const span = classifySpan({ ...d, name }) || undefined;
        const alt = existingMap.get(name) || altFromFilename(name);
        return { src: name, alt, span, w: d.w || undefined, h: d.h || undefined };
      });
    } else {
      // No span precompute; still include dims
      imagesWithDims = processed.map(name => {
        const d = dimsMap.get(name) || { w: 0, h: 0, ar: 1 };
        const alt = existingMap.get(name) || altFromFilename(name);
        return { src: name, alt, w: d.w || undefined, h: d.h || undefined };
      });
    }
    // Replace images with enriched list
    var images = imagesWithDims;
  }

  // Build new list preserving manual order for files that still exist
  const fileSet = new Set(processed);
  const ordered = [];
  // 1) Keep existing order entries that still exist
  for (const src of existingOrder) {
    if (fileSet.has(src)) {
      // Preserve any dimension info we may have gathered above
      const d = dimsMap.get(src) || { w: undefined, h: undefined };
      ordered.push({ src, alt: existingMap.get(src) || altFromFilename(src), w: d.w || undefined, h: d.h || undefined });
      fileSet.delete(src);
    }
  }
  // 2) Append any new files not present in existing order (sorted)
  const remaining = Array.from(fileSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  for (const name of remaining) {
    const d = dimsMap.get(name) || { w: undefined, h: undefined };
    ordered.push({ src: name, alt: existingMap.get(name) || altFromFilename(name), w: d.w || undefined, h: d.h || undefined });
  }

  if (typeof images === 'undefined') {
    const images = ordered;
    const title = existing?.title || projectDirName.replace(/^project\s+/i, 'Project ');
    const manifest = { title, images };
    await writeJsonPretty(manifestPath, manifest);
    return { project: projectDirName, count: images.length };
  } else {
    const title = existing?.title || projectDirName.replace(/^project\s+/i, 'Project ');
    const manifest = { title, images };
    await writeJsonPretty(manifestPath, manifest);
    return { project: projectDirName, count: images.length };
  }
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
