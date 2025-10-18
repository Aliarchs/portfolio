# Scripts README

This folder contains utilities for managing images and gallery manifests for the site.

Contents
- resize-images.js: Batch-generate responsive images (JPG/PNG ➜ 400/800/1200px widths + WebP).
- generate-manifests.mjs: Build per-project manifest.json files from images.
- watch-manifests.mjs: Watch project folders and keep manifests in sync.
- convert-tif.mjs: Convert .tif/.tiff to .webp (used on demand by generator).
- check-manifest.js: Sanity-check a manifest file.

Requirements
- Node.js 18+ (verified with Node 22).
- Sharp library is declared as a dependency in package.json.

Quick start (Windows PowerShell)
Because PowerShell’s execution policy can block npm script shims, you can run these directly with node:

- One-time resize (creates images/resized/{400,800,1200}/...):
  node ./scripts/resize-images.js

- Generate manifests for all projects:
  node ./scripts/generate-manifests.mjs

- Watch projects and auto-update manifests (leave running):
  node ./scripts/watch-manifests.mjs

Optional: If npm scripts work in your environment, package.json has equivalents like images:all, manifests:gen, manifests:watch.

Outputs
- images/resized/{400,800,1200}/... with WebP variants alongside originals.
- images/project X/manifest.json generated/updated per project.

Tips
- Place source images under images/project N/ (not inside images/resized/).
- Large TIFFs are converted to WebP automatically; you’ll see warnings for unsupported files.
- Project 5 currently has no images; add files to images/project 5/ to populate its manifest.
