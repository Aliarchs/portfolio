# Project page blueprint and scaffold

This repo now includes a simple blueprint and a scaffold script to spin up a new project page (projectN.html) with:

- A hero slideshow wired to your images
- An inline gallery manifest for instant render (no initial fetch)
- Responsive AVIF/WebP/legacy candidates with preloads

## Files

- `templates/project.template.html` — HTML blueprint with placeholders.
- `scripts/scaffold-project.mjs` — CLI to generate a concrete page from the template.

## Requirements

- Put your images in `images/project N/` (replace N with the project number you want).
- Run the image pipeline once to create resized variants and manifests:

```powershell
npm run images:all
```

This produces `images/resized/{400,800,1200}/project N/...` and `images/project N/manifest.json` with widths/heights.

## Create a new project page

```powershell
# Minimal (picks a reasonable hero automatically)
npm run scaffold -- --num 6 --title "My New Project"

# Or specify a hero explicitly (filename from images/project 6)
npm run scaffold -- --num 6 --title "My New Project" --hero "IMG_0001.jpg"
```

The script will:

1. Rebuild manifests (best effort).
2. Read `images/project N/manifest.json`.
3. Generate `projectN.html` near the repo root with:
   - Preloads for hero (AVIF/WebP/legacy at 800w)
   - `<picture>` hero with AVIF/WebP/legacy sources (1200/800/400)
   - Gallery container wired to `simple-gallery.js`
   - Inline manifest block (for instant gallery)

Open `projectN.html` to verify. You can edit the navigation at the bottom to link previous/next.

## Notes

- Projects page ordering: project 5 is always shown last.
  - The Projects page sorts all tiles by their numeric `num`, but then moves project 5 to the very end, regardless of order.
  - The scaffold also writes `data/projects.json` with project 5 placed last so the registry reflects this rule.
  - This lets you keep “Personal Works” as the final tile while inserting new projects before it.

- Adding projects before 2 while keeping 1 in place:
  - If you number a project as 0, -1, etc., the page will place those tiles between project 1 and project 2.
  - If a `project1.html` tile exists in the grid, pre-2 tiles are inserted immediately after it; otherwise they appear after the first static tile.
  - No need to renumber 1; just pick a `num < 2` for “before 2”.

- The gallery script version is cache-busted in the template. If you ever bump the script’s `?v=...`, update the template (or re-run scaffold later).
- If you add more images later, just run:
  - `npm run images:all` to generate variants and manifest
  - The page already uses inline JSON, so you can re-run scaffold (it will overwrite `projectN.html`) or copy/paste from the new manifest into the page’s inline block.
- Filenames with spaces, brackets, and dots are supported by the gallery.
- If any hero slide fails to load, the page falls back to a resized path and then auto-skips to keep the slideshow running.
