#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { updateManifestForProject, projectDirs } from './generate-manifests.mjs';

const root = path.resolve(process.cwd());
const imagesDir = path.join(root, 'images');

// Debounce updates per project to avoid rapid duplicate writes
const timers = new Map();
const lastCounts = new Map();
function scheduleUpdate(projectDirName) {
  clearTimeout(timers.get(projectDirName));
  timers.set(projectDirName, setTimeout(async () => {
    try {
      const res = await updateManifestForProject(projectDirName);
      const prev = lastCounts.get(projectDirName);
      if (prev !== res.count) {
        console.log(`[watch] ${res.project}: ${res.count} images`);
        lastCounts.set(projectDirName, res.count);
      }
    } catch (e) {
      console.error(`[watch] Failed updating ${projectDirName}:`, e.message);
    }
  }, 150));
}

function watchProject(projectDirName) {
  const dir = path.join(imagesDir, projectDirName);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {}
  console.log(`[watch] Watching ${projectDirName}...`);
  // Initial update
  scheduleUpdate(projectDirName);
  // Use fs.watch; Live Server + Windows works fine with it; debounce to coalesce bursts
  const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
    if (!filename) return;
    // Only react to image changes; ignore manifest.json to avoid self-trigger loops
    if (!filename.match(/\.(jpe?g|png|webp|tiff?)$/i)) return;
    scheduleUpdate(projectDirName);
  });
  process.on('SIGINT', () => { watcher.close(); process.exit(0); });
}

for (const p of projectDirs) watchProject(p);
