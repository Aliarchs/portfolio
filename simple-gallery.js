// 1) Hover-follow behavior from the example (with dynamic node refresh)
let __hoverNodes = [];
document.addEventListener('mousemove', function(e) {
  const nodes = (__hoverNodes && __hoverNodes.length) ? __hoverNodes : document.querySelectorAll('.img-content-hover');
  for (var i = 0; i < nodes.length; i++) {
    const x = e.pageX; const y = e.pageY;
    nodes[i].style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
});

// 2) Auto-render ONLY your images (projects 2–5) using a repeating 3-2-1 pattern
(async function enhanceWithProjectImages() {
  const grid = document.querySelector('.gallery .grid, .read-gallery .grid');
  if (!grid) return;
  const onlyProject = (grid.getAttribute('data-project') || '').trim();
  const isReadGallery = !!grid.closest('.read-gallery');
  // Optional: mark specific 3-across rows (md-4 group) as compact/shorter.
  // Use data-compact-thirds="1,3" to shorten the 1st and 3rd such rows.
  const compactList = (grid.getAttribute('data-compact-thirds') || '')
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0);

  // Optional: mark specific 2-across square rows (md-6 tile-square) as shorter.
  // Accept comma-separated indices (1-based) and/or keyword 'last'.
  const __compactSquaresRaw = (grid.getAttribute('data-compact-squares') || '').trim();
  const __compactSquaresWantLast = /(^|,|\s)last(,|\s|$)/i.test(__compactSquaresRaw);
  const __compactSquaresIdx = __compactSquaresRaw
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n) && n > 0);

  // Derive a version token from the simple-gallery.js script query (?v=YYYYMMDDx)
  function getGalleryVersion() {
    try {
      const sc = Array.from(document.scripts).find(s => (s.src || '').includes('simple-gallery.js'));
      if (!sc) return '';
      const u = new URL(sc.src, location.href);
      return u.searchParams.get('v') || '';
    } catch { return ''; }
  }
  const __verToken = getGalleryVersion();
  function withVersion(url) {
    if (!__verToken) return url;
    if (/([?&])v=/.test(url)) return url; // avoid double-appending
    return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(__verToken);
  }

  // Load manifests from project 2..5 if present
  async function loadManifest(n) {
    const base = `images/project ${n}`;
    try {
      const res = await fetch(withVersion(encodeURI(`${base}/manifest.json`)), { cache: 'no-cache' });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data?.images)) return [];
      return data.images.map(it => ({
        src: withVersion(it.src?.startsWith('images/') ? it.src : `${base}/${it.src}`),
        title: it.title || it.alt || `Project ${n}`,
        alt: it.alt || `Project ${n} image`,
        w: typeof it.w === 'number' ? it.w : undefined,
        h: typeof it.h === 'number' ? it.h : undefined
      }));
    } catch { return []; }
  }

  let all = [];
  if (onlyProject && /^(2|3|4|5)$/.test(onlyProject)) {
    all = await loadManifest(onlyProject);
  } else {
    all = (await Promise.all([2,3,4,5].map(loadManifest))).flat();
  }
  if (!all.length) return;

  // Measure missing dimensions to get aspect ratios
  function arOf(item) {
    if (item && item.w && item.h && item.w > 0 && item.h > 0) return item.w / item.h;
    return undefined;
  }
  async function measure(item) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.naturalWidth || 0, h: im.naturalHeight || 0 });
      im.onerror = () => resolve({ w: 0, h: 0 });
      im.src = withVersion(item.src);
    });
  }
  const toMeasure = all.filter(it => !arOf(it)).slice(0, 60); // cap probing
  const measured = await Promise.all(toMeasure.map(measure));
  let mIdx = 0;
  all = all.map(it => {
    if (!arOf(it) && mIdx < measured.length) {
      const m = measured[mIdx++];
      return { ...it, w: m.w || it.w, h: m.h || it.h };
    }
    return it;
  });

  // Buckets by orientation (with thresholds) for best fit
  const L = [], S = [], P = [];
  all.forEach(it => {
    const ar = arOf(it) || 1;
    if (ar > 1.15) L.push(it);        // landscape
    else if (ar < 0.85) P.push(it);   // portrait
    else S.push(it);                   // near-square
  });

  function popBest(bucket, targetAR) {
    if (!bucket.length) return null;
    // Choose closest AR to target; if no target, FIFO
    if (!targetAR) return bucket.shift();
    let bestIdx = 0; let bestCost = Infinity;
    for (let i = 0; i < bucket.length; i++) {
      const it = bucket[i];
      const ar = arOf(it) || 1;
      const c = Math.abs(Math.log(ar / targetAR));
      if (c < bestCost) { bestCost = c; bestIdx = i; }
    }
    return bucket.splice(bestIdx, 1)[0] || null;
  }
  function fallbackPick(targetAR) {
    // pick from the richest pool first based on closeness
    const pools = [L, S, P];
    let best = null, bestPool = -1, bestCost = Infinity, bestIndex = -1;
    for (let p = 0; p < pools.length; p++) {
      const bucket = pools[p];
      for (let i = 0; i < bucket.length; i++) {
        const it = bucket[i];
        const ar = arOf(it) || 1;
        const c = Math.abs(Math.log(ar / (targetAR || 1)));
        if (c < bestCost) { best = it; bestCost = c; bestPool = p; bestIndex = i; }
      }
    }
    if (bestPool >= 0 && bestIndex >= 0) { pools[bestPool].splice(bestIndex, 1); }
    return best;
  }
  function pushBack(it) {
    if (!it) return;
    const ar = arOf(it) || 1;
    if (ar > 1.15) L.unshift(it);
    else if (ar < 0.85) P.unshift(it);
    else S.unshift(it);
  }

  // We’ll build groups in a repeating cycle:
  // Group A (3): three thirds (md-4)
  // Group B (2): two squares (md-6) – already square via CSS
  // Group C (special two-row block, consumes 3 items):
  //   - Left: one tall tile spanning two rows (md-6 + tile-tall2) using first image
  //   - Right: two stacked squares (each md-6 + tile-square) using next two images

  // Build responsive candidates (AVIF/WebP/legacy) for gallery tiles when files exist
  function candidatesFor(url) {
    if (!url) return null;
    const clean = url.split('#')[0].split('?')[0];
    const widths = [400, 800, 1200];
    const sizes = '(max-width: 600px) 88vw, (max-width: 760px) 48vw, (max-width: 1100px) 30vw, (max-width: 1400px) 22vw, 18vw';
    // images/project N/<file>.<ext>
    let m = clean.match(/^images\/(project\s+\d+)\/([^\.]+)\.([a-z0-9]+)$/i);
    if (m) {
      const rel = `${m[1]}/${m[2]}`;
      const ext = (m[3] || '').toLowerCase();
      return {
        sizes,
        avifSrcset: widths.map(w => `images/resized/${w}/${rel}.avif ${w}w`).join(', '),
        webpSrcset: widths.map(w => `images/resized/${w}/${rel}.webp ${w}w`).join(', '),
        legacySrcset: widths.map(w => `images/resized/${w}/${rel}.${ext} ${w}w`).join(', '),
        legacyType: (ext === 'png') ? 'image/png' : 'image/jpeg'
      };
    }
    // images/resized/{w}/<rel>.<ext>
    m = clean.match(/^images\/resized\/(400|800|1200)\/(.+)\.([a-z0-9]+)$/i);
    if (m) {
      const rel = m[2];
      const ext = (m[3] || '').toLowerCase();
      return {
        sizes,
        avifSrcset: widths.map(w => `images/resized/${w}/${rel}.avif ${w}w`).join(', '),
        webpSrcset: widths.map(w => `images/resized/${w}/${rel}.webp ${w}w`).join(', '),
        legacySrcset: widths.map(w => `images/resized/${w}/${rel}.${ext} ${w}w`).join(', '),
        legacyType: (ext === 'png') ? 'image/png' : 'image/jpeg'
      };
    }
    return null;
  }

  function makeTile(it, classes, extra = '') {
    const col = document.createElement('div');
    col.className = classes;
    const fig = document.createElement('figure');
    fig.className = 'img-container';
    const pic = document.createElement('picture');
    const img = document.createElement('img');
    img.alt = it.alt || '';
    // Default src remains the authored original as a robust fallback
    img.src = withVersion(it.src);
    // Reserve layout space to avoid shifts and half-rendered rows
    try {
      const w = (typeof it.w === 'number' && it.w > 0) ? it.w : undefined;
      const h = (typeof it.h === 'number' && it.h > 0) ? it.h : undefined;
      if (w && h) {
        img.setAttribute('width', String(w));
        img.setAttribute('height', String(h));
        // On narrow mobile portrait, reserve aspect-ratio space for smooth stacking
        try {
          if (window.matchMedia && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches) {
            fig.style.aspectRatio = `${w} / ${h}`;
          }
        } catch {}
      }
    } catch {}
    // Fast decode hint
    try { img.decoding = 'async'; } catch {}
    // Apply responsive candidates if our resized pipeline has produced them
    try {
      const c = candidatesFor(it.src);
      if (c) {
        // Prefer AVIF, then WebP, then legacy
        const sAvif = document.createElement('source');
        sAvif.type = 'image/avif';
        sAvif.setAttribute('srcset', c.avifSrcset);
        sAvif.setAttribute('sizes', c.sizes);
        const sWebp = document.createElement('source');
        sWebp.type = 'image/webp';
        sWebp.setAttribute('srcset', c.webpSrcset);
        sWebp.setAttribute('sizes', c.sizes);
        const sLegacy = document.createElement('source');
        sLegacy.type = c.legacyType;
        sLegacy.setAttribute('srcset', c.legacySrcset);
        sLegacy.setAttribute('sizes', c.sizes);
        img.setAttribute('sizes', c.sizes);
        img.setAttribute('srcset', c.legacySrcset);
        pic.appendChild(sAvif);
        pic.appendChild(sWebp);
        pic.appendChild(sLegacy);
      }
    } catch {}
    pic.appendChild(img);

    fig.appendChild(pic);
    // Do not render captions/hover overlays on read-gallery pages
    if (!isReadGallery) {
      const fc = document.createElement('figcaption');
      fc.className = 'img-content';
      fc.innerHTML = `<h2 class="title">${(it.title || '').toString()}</h2><h3 class="category">Showcase</h3>`;
      const hover = document.createElement('span');
      hover.className = 'img-content-hover';
      hover.innerHTML = `<h2 class=\"title\">${(it.title || '').toString()}</h2><h3 class=\"category\">Showcase</h3>`;
      fig.appendChild(fc);
      fig.appendChild(hover);
    }
    col.appendChild(fig);
    if (extra) col.classList.add(...extra.split(' ').filter(Boolean));
    // Lightbox open on click
    img.addEventListener('click', () => openLightbox(it.src, it.alt || '', it));
    return col;
  }

  grid.innerHTML = '';
  let idx = 0;
  let useTallBlock = true; // alternate each time we reach Group C
  let thirdRowIndex = 0; // counts how many 3-across groups (md-4 rows) we've output
  let squaresRowIndex = 0; // counts how many 2-across (md-6 tile-square) rows we've output
  while ((L.length + S.length + P.length) > 0) {
    // Group A: 3 thirds
    thirdRowIndex++;
    const makeShort = compactList.includes(thirdRowIndex);
    for (let k = 0; k < 3 && (L.length + S.length + P.length) > 0; k++) {
      // Prefer landscape for wide-ish thirds; fallback any
      const pick = popBest(L) || popBest(S) || popBest(P);
      if (!pick) break;
      const extraCls = makeShort ? ' md4-short' : '';
      grid.appendChild(makeTile(pick, 'column-xs-12 column-md-4' + extraCls));
    }
    // Group B: 2 squares
    squaresRowIndex++;
    const __makeSquaresShort = __compactSquaresIdx.includes(squaresRowIndex);
    for (let k = 0; k < 2 && (L.length + S.length + P.length) > 0; k++) {
      // Prefer near-square; fallback closest to 1.0
      let pick = popBest(S, 1.0);
      if (!pick) pick = fallbackPick(1.0);
      if (!pick) break;
      const extraSquaresCls = __makeSquaresShort ? ' md6-short' : '';
  grid.appendChild(makeTile(pick, 'column-xs-12 column-md-6 tile-square' + extraSquaresCls));
    }
    // Group C: alternate between a full-width wide tile and the special two-row block
    if ((L.length + S.length + P.length) > 0) {
      if (!useTallBlock) {
        // Full-width row (one wide tile)
        // Prefer landscape; fallback any
        const pick = popBest(L) || popBest(S) || popBest(P);
  if (pick) grid.appendChild(makeTile(pick, 'column-xs-12'));
      } else {
        // Special two-row block is atomic: require left tall + two right squares.
        // 1) Try to pick the left tall.
        let left = popBest(P) || fallbackPick(0.6);
        if (!left) {
          const alt = popBest(L) || fallbackPick(1.0) || popBest(P);
          if (alt) grid.appendChild(makeTile(alt, 'column-xs-12'));
        } else {
          // 2) Tentatively pick two squares
          let r1 = popBest(S, 1.0) || fallbackPick(1.0);
          let r2 = popBest(S, 1.0) || fallbackPick(1.0);
          if (!r1 || !r2) {
            // Not enough squares to complete the block; push back and fall back to a wide tile
            pushBack(left); if (r1) pushBack(r1); if (r2) pushBack(r2);
            const alt = popBest(L) || fallbackPick(1.0) || popBest(P);
            if (alt) grid.appendChild(makeTile(alt, 'column-xs-12'));
          } else {
            // We have all three—render the tall block as a nested atomic grid to prevent holes
            const wrap = document.createElement('div');
            wrap.className = 'column-xs-12 rt-block';
            const leftEl = makeTile(left, 'column-md-6 tile-tall2');
            const r1El = makeTile(r1, 'column-md-6 tile-square');
            const r2El = makeTile(r2, 'column-md-6 tile-square');
            wrap.appendChild(leftEl);
            wrap.appendChild(r1El);
            wrap.appendChild(r2El);
            grid.appendChild(wrap);
          }
        }
      }
      useTallBlock = !useTallBlock;
    }
  }

  // After initial render, mark the first few tiles as eager/high priority so mobile fills instantly
  try {
    const tiles = Array.from(document.querySelectorAll('.read-gallery .grid img, .gallery .grid img'));
    // Approximate first screenful: 8 images is a safe small budget
    const eagerCount = Math.min(8, tiles.length);
    for (let i = 0; i < eagerCount; i++) {
      const im = tiles[i];
      try { im.loading = 'eager'; } catch {}
      try { im.setAttribute('fetchpriority', 'high'); } catch {}
    }
  } catch {}

  // If 'last' was requested for compact squares, tag the last 2-across row now
  try {
    if (__compactSquaresWantLast) {
      const items = Array.from(grid.children);
      // Identify consecutive pairs of column-md-6 tile-square that are not inside .rt-block
      const squarePairs = [];
      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i];
        const b = items[i + 1];
        if (!a || !b) continue;
        if (!(a.classList && b.classList)) continue;
        if (a.closest('.rt-block') || b.closest('.rt-block')) continue;
        const isA = a.classList.contains('column-md-6') && a.classList.contains('tile-square');
        const isB = b.classList.contains('column-md-6') && b.classList.contains('tile-square');
        if (isA && isB) { squarePairs.push([a, b]); i++; }
      }
      const last = squarePairs[squarePairs.length - 1];
      if (last) { last[0].classList.add('md6-short'); last[1].classList.add('md6-short'); }
    }
  } catch {}

  // Refresh hover nodes for the new elements
  __hoverNodes = document.querySelectorAll('.img-content-hover');

  // Initialize/update lightbox navigation list (support both .read-gallery and .gallery)
  __lbList = Array.from(document.querySelectorAll('.read-gallery .grid img, .gallery .grid img')).map(img => ({ src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '' }));

  // Ask Service Worker to pre-cache currently rendered images (if SW is active)
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const urls = __lbList.map(x => x.src).filter(Boolean);
      if (urls.length) navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_URLS', urls });
    }
  } catch (_) { /* ignore */ }
})();

// 3) Lightbox logic
let __lbList = [];
let __lbIndex = -1;
function __getLB() {
  // Prefer site's lightbox if present
  let box = document.getElementById('lightbox');
  let img = document.getElementById('lightbox-img');
  if (box && img) return { box, img, type: 'site' };
  // Fallback to inline lightbox from simple-gallery.html
  box = document.getElementById('lb');
  img = document.getElementById('lb-img');
  if (box && img) return { box, img, type: 'inline' };
  return { box: null, img: null, type: 'none' };
}
function openLightbox(src, alt) {
  const { box, img } = __getLB();
  if (!box || !img) return;
  __lbIndex = Math.max(0, __lbList.findIndex(x => x.src === src));
  img.src = src; img.alt = alt || '';
  box.style.display = 'flex';
  box.setAttribute('aria-hidden', 'false');
}
function closeLightbox() {
  const { box, img } = __getLB();
  if (!box || !img) return;
  box.setAttribute('aria-hidden', 'true');
  box.style.display = 'none';
  img.src = ''; img.alt = '';
}
function stepLightbox(dir) {
  if (!__lbList.length) return;
  __lbIndex = (__lbIndex + dir + __lbList.length) % __lbList.length;
  const { img } = __getLB();
  const it = __lbList[__lbIndex];
  if (img && it) { img.src = it.src; img.alt = it.alt || ''; }
}

// Event bindings: handle both site and inline lightboxes if present
(function initLightboxControls(){
  const lbSite = document.getElementById('lightbox');
  const lbInline = document.getElementById('lb');
  const bind = (root, closeSel, prevSel, nextSel) => {
    if (!root) return;
    const closeBtn = closeSel ? root.querySelector(closeSel) : root.querySelector('.lb-close, .lightbox-close');
    const prevBtn = prevSel ? root.querySelector(prevSel) : root.querySelector('.lb-prev');
    const nextBtn = nextSel ? root.querySelector(nextSel) : root.querySelector('.lb-next');
    closeBtn && closeBtn.addEventListener('click', closeLightbox);
    prevBtn && prevBtn.addEventListener('click', () => stepLightbox(-1));
    nextBtn && nextBtn.addEventListener('click', () => stepLightbox(1));
    root.addEventListener('click', (e) => { if (e.target === root) closeLightbox(); });
  };
  bind(lbSite, '.lightbox-close', null, null);
  bind(lbInline, '.lb-close', '.lb-prev', '.lb-next');
  document.addEventListener('keydown', (e) => {
    const { box } = __getLB();
    if (box && box.getAttribute('aria-hidden') === 'false') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    }
  });
})();

// 4) Slideshow logic for project hero
// Works on pages that include a hero element with class .slideshow-image and optional .slideshow-container
// Sources are taken from the gallery images (__lbList) with the current hero first.
(function initSlideshow(){
  const heroImg = document.querySelector('.slideshow-image');
  const heroWrap = heroImg ? heroImg.closest('.slideshow-container') : null;
  if (!heroImg || !heroWrap) return;

  // Helper: strip query/hash for comparison/dedup
  const keyOf = (u) => {
    try { return (u || '').split('#')[0].split('?')[0].toLowerCase(); } catch { return (u || '').toLowerCase(); }
  };

  // Derive a version token from this script's query (?v=...)
  function getScriptVersion() {
    try {
      const sc = Array.from(document.scripts).find(s => (s.src || '').includes('simple-gallery.js'));
      if (!sc) return '';
      const u = new URL(sc.src, location.href);
      return u.searchParams.get('v') || '';
    } catch { return ''; }
  }
  const __sgVer = getScriptVersion();
  function withVer(url) {
    if (!url) return url;
    if (!__sgVer) return url;
    try {
      const u = new URL(url, location.href);
      if (!u.searchParams.get('v')) u.searchParams.set('v', __sgVer);
      return u.href;
    } catch {
      // Fallback for relative strings
      if (/(\?|&)v=/.test(url)) return url;
      return url + (url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(__sgVer);
    }
  }

  function inferResizedCandidates(src) {
    // Return { legacySrcset, webpSrcset, avifSrcset, sizes } when we can infer responsive sources
    if (!src) return null;
    const clean = src.split('#')[0].split('?')[0];
    const sizes = '(max-width: 600px) 88vw, (max-width: 900px) 92vw, 1400px';
    const widths = [400, 800, 1200];
    // Case 1: images/resized/{w}/<rel>.<ext>
    let m = clean.match(/^images\/resized\/(400|800|1200)\/(.+)\.([a-z0-9]+)$/i);
    if (m) {
      const rel = m[2];
      const ext = (m[3] || '').toLowerCase();
      const legacySrcset = widths.map(w => `images/resized/${w}/${rel}.${ext} ${w}w`).join(', ');
      const webpSrcset = widths.map(w => `images/resized/${w}/${rel}.webp ${w}w`).join(', ');
      const avifSrcset = widths.map(w => `images/resized/${w}/${rel}.avif ${w}w`).join(', ');
      return { legacySrcset, webpSrcset, avifSrcset, sizes };
    }
    // Case 2: images/project N/<file>.<ext> where resized pipeline likely exists (2,3,4)
    m = clean.match(/^images\/(project\s+(\d+))\/([^\.]+)\.([a-z0-9]+)$/i);
    if (m) {
      const proj = (m[2] || '').trim();
      const rel = `${m[1]}/${m[3]}`; // project N/<file>
      const ext = (m[4] || '').toLowerCase();
      if (['2','3','4'].includes(proj)) {
        const legacySrcset = widths.map(w => `images/resized/${w}/${rel}.${ext} ${w}w`).join(', ');
        const webpSrcset = widths.map(w => `images/resized/${w}/${rel}.webp ${w}w`).join(', ');
        const avifSrcset = widths.map(w => `images/resized/${w}/${rel}.avif ${w}w`).join(', ');
        return { legacySrcset, webpSrcset, avifSrcset, sizes };
      }
    }
    return null;
  }

  function applySlideToHero(src, alt) {
    if (!src) return;
    const pic = heroImg.closest('picture');
    const info = inferResizedCandidates(src);
    if (pic) {
      // Ensure there is a webp <source> before the <img>, followed by a legacy <source> matching the img type
      // Remove any existing sources to avoid stale candidates from previous slide
      Array.from(pic.querySelectorAll('source')).forEach(s => s.remove());
      if (info) {
        if (info.avifSrcset) {
          const sAvif = document.createElement('source');
          sAvif.type = 'image/avif';
          sAvif.setAttribute('srcset', info.avifSrcset);
          sAvif.setAttribute('sizes', info.sizes);
          pic.insertBefore(sAvif, heroImg);
        }
        const sWebp = document.createElement('source');
        sWebp.type = 'image/webp';
        sWebp.setAttribute('srcset', info.webpSrcset);
        sWebp.setAttribute('sizes', info.sizes);
        pic.insertBefore(sWebp, heroImg);
        const sLegacy = document.createElement('source');
        // Best-effort type inference from src extension
        const ext = (src.split('.').pop() || '').toLowerCase();
        sLegacy.type = (ext === 'png') ? 'image/png' : 'image/jpeg';
        sLegacy.setAttribute('srcset', info.legacySrcset);
        sLegacy.setAttribute('sizes', info.sizes);
        pic.insertBefore(sLegacy, heroImg);
        heroImg.setAttribute('sizes', info.sizes);
        heroImg.setAttribute('srcset', info.legacySrcset);
      } else {
        // No responsive candidates known: keep <picture> but remove sources so <img> is used
        heroImg.removeAttribute('srcset');
        heroImg.removeAttribute('sizes');
      }
    } else if (info) {
      // Not in <picture>, still apply responsive hints when we know them
      heroImg.setAttribute('sizes', info.sizes);
      heroImg.setAttribute('srcset', info.legacySrcset);
    } else {
      heroImg.removeAttribute('srcset');
      heroImg.removeAttribute('sizes');
    }
    // Swap the image src and alt; keep shimmer during load
    try { heroImg.classList.remove('loaded'); heroImg.classList.add('lazy'); } catch {}
  heroImg.alt = alt || heroImg.alt || '';
  heroImg.src = withVer(src);
    heroImg.addEventListener('load', () => { try { heroImg.classList.add('loaded'); heroImg.classList.remove('lazy'); } catch {} }, { once: true });
    try { heroImg.setAttribute('fetchpriority', 'high'); } catch {}
  }

  // Build the slideshow list: hero first, then gallery images (__lbList), unique by base path
  function buildList() {
    const list = [];
    const seen = new Set();
    const pushIf = (u, alt) => {
      if (!u) return;
      const k = keyOf(u);
      if (seen.has(k)) return;
      seen.add(k);
      list.push({ src: u, alt: alt || '' });
    };
    pushIf(heroImg.getAttribute('src') || heroImg.currentSrc || '', heroImg.getAttribute('alt') || '');
    try {
      if (Array.isArray(__lbList)) {
        __lbList.forEach(it => pushIf(it && it.src, it && it.alt));
      } else {
        const imgs = Array.from(document.querySelectorAll('.read-gallery .grid img, .gallery .grid img'));
        imgs.forEach(im => pushIf(im.getAttribute('src') || im.currentSrc || '', im.getAttribute('alt') || ''));
      }
    } catch {}
    return list;
  }

  let slides = buildList();
  let index = 0;
  // Always provide a global changeSlide so inline onclick handlers work immediately
  // It will advance once more slides are available after the gallery renders.

  function show(i) {
    if (!slides.length) return;
    index = (i + slides.length) % slides.length;
    const cur = slides[index];
    applySlideToHero(cur.src, cur.alt);
  }
  function next() { show(index + 1); }
  function prev() { show(index - 1); }
  function resetTimer() {
    if (timer) { clearInterval(timer); }
    // Allow per-page override via data-interval (ms) on the slideshow container; default 3000ms
    let intervalMs = 3000;
    try {
      const v = parseInt(heroWrap.getAttribute('data-interval') || '3000', 10);
      if (!Number.isNaN(v) && v >= 1000 && v <= 60000) intervalMs = v;
    } catch {}
    if (slides.length > 1) { timer = setInterval(next, intervalMs); }
  }
  // Expose for onclick handlers (always defined)
  window.changeSlide = function(dir){ if (dir > 0) next(); else prev(); resetTimer(); };

  // Keyboard support on the hero container
  try {
    heroWrap.setAttribute('tabindex', '0');
    heroWrap.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); });
  } catch {}

  // Auto-advance
  let timer = null;
  show(0);
  // Only start timer if we have more than one slide now; otherwise it will start after rebuild
  resetTimer();

  // If the gallery later changes (e.g., re-render), rebuild the list once after a short delay
  let rebuildTimer = null;
  const scheduleRebuild = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      const curKey = keyOf((slides[index] && slides[index].src) || '');
      slides = buildList();
      // Keep the same current slide if it still exists
      const newIdx = slides.findIndex(s => keyOf(s.src) === curKey);
      index = newIdx >= 0 ? newIdx : 0;
      // If we now have multiple slides, make sure timer is running
      resetTimer();
    }, 250);
  };
  try {
    const grid = document.querySelector('.read-gallery .grid, .gallery .grid');
    if (grid && 'MutationObserver' in window) {
      const mo = new MutationObserver(scheduleRebuild);
      mo.observe(grid, { childList: true, subtree: true });
    }
  } catch {}

  // Also rebuild once on DOMContentLoaded to catch late hero/generator timing
  try { if (document.readyState !== 'complete') { window.addEventListener('load', scheduleRebuild, { once: true }); } } catch {}

  // Optional: ensure mobile inline arrow buttons actually hook to changeSlide if they were rendered before script
  try {
    const prevBtn = heroWrap.querySelector('.slideshow-arrow[aria-label="Previous image"]');
    const nextBtn = heroWrap.querySelector('.slideshow-arrow[aria-label="Next image"]');
    if (prevBtn && !prevBtn.__sgBound) { prevBtn.addEventListener('click', () => window.changeSlide(-1)); prevBtn.__sgBound = true; }
    if (nextBtn && !nextBtn.__sgBound) { nextBtn.addEventListener('click', () => window.changeSlide(1)); nextBtn.__sgBound = true; }
  } catch {}
})();
