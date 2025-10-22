#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { num: null, title: null, hero: null, thumb: null, preview: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--num' || a === '-n') { out.num = String(args[++i] || '').trim(); continue; }
    if (a === '--title' || a === '-t') { out.title = String(args[++i] || '').trim(); continue; }
  if (a === '--hero' || a === '-h') { out.hero = String(args[++i] || '').trim(); continue; }
  if (a === '--thumb') { out.thumb = String(args[++i] || '').trim(); continue; }
  if (a === '--preview') { out.preview = String(args[++i] || '').trim(); continue; }
  }
  return out;
}

async function run(cmd, argv, cwd=root) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
    p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} ${argv.join(' ')} exited with ${code}`)));
    p.on('error', reject);
  });
}

function encodeRFC3986URIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

async function ensureManifests() {
  // Run the existing generator to (re)build manifests before reading
  try { await run('node', [path.join(root, 'scripts', 'generate-manifests.mjs')]); } catch {}
}

function pickHero(manifest, reqName) {
  const images = Array.isArray(manifest?.images) ? manifest.images : [];
  if (!images.length) return null;
  if (reqName) {
    const byName = images.find(it => String(it.src).toLowerCase() === String(reqName).toLowerCase());
    if (byName) return byName;
  }
  // Prefer a landscape image if available, else first
  const isLandscape = (it) => (it && it.w && it.h && it.w > it.h);
  return images.find(isLandscape) || images[0];
}

function splitBaseAndExt(filename) {
  const m = String(filename).match(/^(.+)\.([a-z0-9]+)$/i);
  return m ? { base: m[1], ext: m[2].toLowerCase() } : { base: filename, ext: 'jpg' };
}

function buildPreloads(num, heroBase) {
  const enc = (s) => s.split('/').map(encodeRFC3986URIComponent).join('/');
  const b = enc(heroBase);
  const lines = [];
  // Hero at 800w for avif/webp/legacy
  lines.push(`  <link rel="preload" as="image"\n    href="images/resized/800/project%20${num}/${b}.avif"\n    imagesrcset="images/resized/400/project%20${num}/${b}.avif 400w, images/resized/800/project%20${num}/${b}.avif 800w, images/resized/1200/project%20${num}/${b}.avif 1200w"\n    imagesizes="(max-width: 600px) 88vw, (max-width: 900px) 92vw, 1400px">`);
  lines.push(`  <link rel="preload" as="image"\n    href="images/resized/800/project%20${num}/${b}.webp"\n    imagesrcset="images/resized/400/project%20${num}/${b}.webp 400w, images/resized/800/project%20${num}/${b}.webp 800w, images/resized/1200/project%20${num}/${b}.webp 1200w"\n    imagesizes="(max-width: 600px) 88vw, (max-width: 900px) 92vw, 1400px">`);
  // A plain preload on the legacy path (browser will pick picture sources anyway)
  lines.push(`  <link rel="preload" as="image" href="images/resized/800/project%20${num}/${b}.jpg">`);
  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  if (!args.num || !/^\d+$/.test(args.num)) {
    console.error('Usage: node scripts/scaffold-project.mjs --num 6 --title "My Project" [--hero "IMG_0001.jpg"] [--thumb "images/thumb6.jpg"] [--preview "images/preview6.jpg"]');
    process.exit(1);
  }
  const num = String(args.num);
  const title = args.title || `Project ${num}`;

  const projDir = path.join(root, 'images', `project ${num}`);
  try { await fs.access(projDir); } catch { console.error(`Missing directory: ${projDir}`); process.exit(1); }

  await ensureManifests();
  const manifestPath = path.join(projDir, 'manifest.json');
  let manifest = null;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')); } catch { manifest = { title, images: [] }; }

  const heroIt = pickHero(manifest, args.hero);
  if (!heroIt) { console.error('No images found in manifest; add images then run images:all first.'); process.exit(1); }
  const { base: heroBase, ext: heroExt } = splitBaseAndExt(heroIt.src);

  const tmplPath = path.join(root, 'templates', 'project.template.html');
  const tmpl = await fs.readFile(tmplPath, 'utf-8');

  const inlineJson = JSON.stringify({ title, images: manifest.images }, null, 2);
  const page = tmpl
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{PROJECT_NUM}}', num)
    .replaceAll('{{HERO_BASE}}', heroBase)
    .replaceAll('{{HERO_EXT}}', heroExt)
    .replaceAll('{{CSS_VERSION}}', '20251021a')
    .replaceAll('{{SG_VERSION}}', '20251021l')
    .replace('{{PRELOADS}}', buildPreloads(num, heroBase))
    .replace('{{INLINE_MANIFEST_JSON}}', inlineJson.split('\n').map(l => '  ' + l).join('\n'));

  const outPath = path.join(root, `project${num}.html`);
  await fs.writeFile(outPath, page, 'utf-8');
  console.log(`Created ${path.basename(outPath)} using ${manifest.images.length} images.`);
  console.log('Tip: add navigation links as needed in the content-nav section.');

  // Update data/projects.json so the Projects page auto-renders a tile
  try {
    const dataDir = path.join(root, 'data');
    try { await fs.mkdir(dataDir, { recursive: true }); } catch {}
    const projJsonPath = path.join(dataDir, 'projects.json');
    let data = { projects: [] };
    try { data = JSON.parse(await fs.readFile(projJsonPath, 'utf-8')); } catch {}
    if (!data || typeof data !== 'object' || !Array.isArray(data.projects)) data = { projects: [] };
    const next = data.projects.filter(p => String(p?.num) !== String(num));
    next.push({
      num: Number(num),
      title,
      href: `project${num}.html`,
      heroBase: heroBase,
      heroExt: heroExt,
      alt: `${title} hero`,
      thumb: args.thumb || undefined,
      preview: args.preview || undefined
    });
    // Sort ascending by num, but pin project 5 to the end regardless of numeric order
    const isFive = (p) => Number(p?.num) === 5 || /project\s*5\.html/i.test(String(p?.href||''));
    const fives = next.filter(isFive);
    const others = next.filter(p => !isFive(p)).sort((a,b) => Number(a.num||0) - Number(b.num||0));
    const ordered = others.concat(fives);
    await fs.writeFile(projJsonPath, JSON.stringify({ projects: ordered }, null, 2), 'utf-8');
    console.log(`Updated data/projects.json (projects: ${ordered.length}).`);
  } catch (e) {
    console.warn('Warning: failed to update data/projects.json:', e?.message || e);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
