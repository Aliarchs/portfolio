document.addEventListener('DOMContentLoaded', function() {
  // Helpers to detect project number from URL and build folder path
  const m = (window.location.pathname.match(/project(\d+)/i) || []);
  const projectNum = m[1] || '';
  const isTargetProject = ['2','3','4','5'].includes(projectNum);
  // Elements
  const slideshowImg = document.querySelector('.slideshow-image');
  const slideshowContainer = document.querySelector('.slideshow-container');
  const galleryContainer = document.querySelector('.gallery');

  // If not a project page (2–5) or no slideshow/gallery, do nothing
  if (!isTargetProject || !slideshowImg || !slideshowContainer || !galleryContainer) {
    initLightboxIfPresent();
    return;
  }

  // Ensure slideshow image is inside a <picture> so we can add WebP source
  if (slideshowImg && slideshowImg.parentElement && slideshowImg.parentElement.tagName !== 'PICTURE') {
    const parent = slideshowImg.parentElement;
    const picture = document.createElement('picture');
    parent.insertBefore(picture, slideshowImg);
    picture.appendChild(slideshowImg);
  }

  const folderPath = `images/project ${projectNum}`; // note the space per your folder names
  const manifestUrl = `${folderPath}/manifest.json`;
  // Allow per-page override: if the gallery declares data-source="html", we use the images from the markup
  const gallerySource = (galleryContainer.getAttribute('data-source') || '').toLowerCase();
  const isHtmlSource = gallerySource === 'html';

  // Default/fallback images (current ones in repo)
  const defaultSets = {
    '2': [
      { src: 'images/project2-1.png', alt: 'RSPB visual 1' },
      { src: 'images/project2-2.png', alt: 'RSPB visual 2' },
      { src: 'images/project2-3.png', alt: 'RSPB visual 3' },
    ],
    '3': [
      { src: 'images/resized/1200/preview3.jpg', alt: 'Facade Retrofit diagram' },
    ],
    '4': [
      { src: 'images/resized/1200/preview4.jpg', alt: 'Architectural model photograph' },
    ],
    '5': [
      { src: 'images/resized/1200/preview5.jpg', alt: 'Personal works visual' },
    ]
  };

  const projectNames = { '2': 'RSPB', '3': 'Facade Retrofit', '4': 'St. Andrews Bakery', '5': 'Personal Works' };
  // Per-project 2x2 big tile fraction (tunable per page)
  const BIG_FRACTION_BY_PROJECT = { '2': 0.12, '3': 0.12, '4': 0.12, '5': 0.12 };
  // Avoid changing image URLs once rendered to let the browser cache be effective.
  // No cache-buster param; rely on filename changes or HTTP caching instead.
  function withBust(url) { return url ? encodeURI(url) : url; }

  // Sort helper: natural, case-insensitive, by base filename only
  function sortImagesByName(list) {
    return (list || []).slice().sort((a, b) => {
      const aName = (a && a.src ? a.src : '').split(/[\\\/]/).pop();
      const bName = (b && b.src ? b.src : '').split(/[\\\/]/).pop();
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  // Fetch manifest if present; otherwise use defaults
  async function loadProjectImages() {
    // If this page opts out of manifest loading, read images from the HTML in the current order
    if (gallerySource === 'html') {
      try {
        const imgs = Array.from(galleryContainer.querySelectorAll('img'));
        const mapped = imgs.map(img => ({
          src: img.getAttribute('src') || '',
          alt: img.getAttribute('alt') || `${projectNames[projectNum] || 'Project'} image`
        })).filter(it => !!it.src);
        if (mapped.length) return mapped;
      } catch (_) { /* fall through to manifest/defaults */ }
    }
    try {
      // Encode URL (handles spaces in folder names). Allow HTTP cache revalidation for speed.
      const res = await fetch(encodeURI(manifestUrl), { cache: 'no-cache' });
      if (!res.ok) throw new Error('manifest not found');
      const data = await res.json();
      const list = Array.isArray(data?.images) ? data.images : [];
      // Normalize src: if it's a bare filename, prefix with folderPath
      // Deduplicate and normalize
      const seen = new Set();
      const normalized = list
        .map(item => ({
          src: (item && typeof item.src === 'string') ? item.src.trim() : '',
          alt: (item && typeof item.alt === 'string') ? item.alt.trim() : '',
          span: (item && typeof item.span === 'string') ? item.span.trim() : undefined,
          w: (item && typeof item.w === 'number') ? item.w : undefined,
          h: (item && typeof item.h === 'number') ? item.h : undefined,
        }))
        .filter(item => !!item.src)
        .map(item => ({
          src: (item.src.startsWith('images/')) ? item.src : `${folderPath}/${item.src}`,
          alt: item.alt || `${projectNames[projectNum] || 'Project'} image`,
          _span: item.span || undefined,
          w: item.w,
          h: item.h,
        }))
        .filter(item => {
          const key = item.src.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      // Filter out entries that point to obviously wrong extensions we don't have (e.g., .webp without file present)
      // Since we can't stat files here, we rely on the later onerror handler to prune any broken ones.
  if (normalized.length > 0) return normalized;
      return sortImagesByName(defaultSets[projectNum] || []);
    } catch (_) {
      return sortImagesByName(defaultSets[projectNum] || []);
    }
  }

  function enhanceResponsive(imgEl) {
    // Always set lightweight hints first
    if (!imgEl.hasAttribute('decoding')) imgEl.setAttribute('decoding', 'async');
    if (!imgEl.hasAttribute('loading')) imgEl.setAttribute('loading', 'lazy');
    // For HTML-sourced galleries we still add responsive candidates when we know
    // resized variants exist (projects 2,3,4). Otherwise, we keep the original only.
    const raw = imgEl.getAttribute('src') || '';
    const src = raw.split('?')[0]; // strip cache-busting for detection
    // Support either images/resized/{w}/<path>.<ext> or images/project X/<file>.<ext>
    let relPath = '';
    let ext = '';
    let m = src.match(/^images\/resized\/(400|800|1200)\/(.+)\.(jpg|jpeg|png|webp)$/i);
    const resizedWidthDetected = m ? parseInt(m[1], 10) : null;
    if (m) {
      relPath = m[2];
      ext = (m[3] || '').toLowerCase();
    } else {
      m = src.match(/^images\/(project\s+\d+)\/([^\.?]+)\.(jpg|jpeg|png|webp)$/i);
      if (m) {
        relPath = `${m[1]}/${m[2]}`;
        ext = (m[3] || '').toLowerCase();
      } else {
        // Last chance: images/<name>.<ext> in root
        m = src.match(/^images\/([^\/]+)\.(jpg|jpeg|png|webp)$/i);
        if (!m) return;
        relPath = m[1];
        ext = (m[2] || '').toLowerCase();
      }
    }

    // Determine if resized variants exist for project folders we ship (2,3,4).
    const projectFolderMatch = relPath.match(/^project\s+(\d+)\//i);
    const resizedExistsForProject = projectFolderMatch ? ['2','3','4'].includes(projectFolderMatch[1]) : false;

  const widths = [400, 800, 1200];
    const sizes = '(max-width: 900px) 100vw, 1200px';

    let legacyCandidates = [];
    let webpCandidates = [];
    if (projectFolderMatch && resizedExistsForProject) {
      // Safe to advertise all three sizes for known project folders with resized pipelines
      legacyCandidates = widths.map(w => `images/resized/${w}/${relPath}.${ext} ${w}w`);
      webpCandidates = widths.map(w => `images/resized/${w}/${relPath}.webp ${w}w`);
    } else if (resizedWidthDetected) {
      // Only advertise the width we actually detected to avoid 404s for missing sizes
      legacyCandidates = [`images/resized/${resizedWidthDetected}/${relPath}.${ext} ${resizedWidthDetected}w`];
      webpCandidates = [`images/resized/${resizedWidthDetected}/${relPath}.webp ${resizedWidthDetected}w`];
    } else {
      // Unknown path: don't add resized candidates; keep original only
      legacyCandidates = [];
      webpCandidates = [];
    }
    const legacySrcset = legacyCandidates.join(', ');
    const webpSrcset = webpCandidates.join(', ');

    // Only set srcset/sizes if we actually have candidates beyond the original
    if (legacyCandidates.length > 0) {
      imgEl.setAttribute('srcset', legacySrcset);
      imgEl.setAttribute('sizes', sizes);
    }
  // decoding/loading already set above

    // If wrapped in <picture>, prepend a WebP <source>
    const picture = imgEl.parentElement && imgEl.parentElement.tagName === 'PICTURE' ? imgEl.parentElement : null;
    if (picture) {
      // Remove any previous sources to avoid duplication on re-renders
      Array.from(picture.querySelectorAll('source')).forEach(s => s.remove());
      if (webpSrcset && webpCandidates.length > 0) {
        const sWebp = document.createElement('source');
        sWebp.type = 'image/webp';
        sWebp.setAttribute('srcset', webpSrcset);
        sWebp.setAttribute('sizes', sizes);
        picture.insertBefore(sWebp, imgEl);
      }
    }
  }

  function buildFallbacks(src) {
    if (!src) return [];
    const clean = src.split('?')[0];
    const m = clean.match(/^(.*)\.([a-z0-9]+)$/i);
    if (!m) return [];
    const base = m[1];
    const ext = (m[2] || '').toLowerCase();
    const order = ['webp', 'png', 'jpg', 'jpeg'];
    const idx = order.indexOf(ext);
    const seq = idx >= 0 ? [...order.slice(idx + 1), ...order.slice(0, idx)] : order;
    return seq.map(e => `${base}.${e}`).filter(candidate => candidate.toLowerCase() !== clean.toLowerCase());
  }

  let currentGalleryItems = [];
  let galleryRefreshTimer = null;
  // Remember which original item srcs have already finished loading so we can
  // keep them "loaded" across re-renders and avoid flicker/shimmer.
  const loadedSrcSet = new Set();
  function srcKey(s) { try { return (s || '').split('?')[0].toLowerCase(); } catch { return (s || '').toLowerCase(); } }
  function isMobilePortrait() {
    try { return window.matchMedia && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches; } catch { return false; }
  }
  function scheduleGalleryRefresh() {
    clearTimeout(galleryRefreshTimer);
    galleryRefreshTimer = setTimeout(() => {
      if (!currentGalleryItems.length) {
        galleryContainer.innerHTML = '';
        return;
      }
      renderGallery(currentGalleryItems);
      initLightboxForCurrentGallery();
    }, 60);
  }

  function renderGallery(images) {
    currentGalleryItems = images.slice();
    const working = currentGalleryItems;
    // Preserve scroll position relative to the gallery container to avoid jumps on re-render
    let prevAbsTop = 0;
    try {
      const prevTop = galleryContainer.getBoundingClientRect().top || 0;
      prevAbsTop = (window.scrollY || window.pageYOffset || 0) + prevTop;
    } catch (_) { prevAbsTop = 0; }
    // Clear existing content
    galleryContainer.innerHTML = '';

    // Estimate number of columns to eagerly load only the first row on larger screens
    function getApproxColumns() {
      try {
        const probe = document.createElement('figure');
        probe.className = 'gallery-item';
        probe.style.visibility = 'hidden';
        probe.style.margin = '0';
        galleryContainer.appendChild(probe);
        const colPx = probe.clientWidth || 0;
        const contW = galleryContainer.clientWidth || 0;
        galleryContainer.removeChild(probe);
        if (colPx > 0 && contW > 0) return Math.max(1, Math.round(contW / colPx));
      } catch {}
      return 4; // sensible default
    }
  const eagerRows = 1;
  const approxCols = getApproxColumns();
  // Only keep roughly the first row eager; everything else should be lazy
  const initialChunk = isHtmlSource
    ? Math.min(images.length, Math.max(approxCols, 4))
    : Math.min(images.length, Math.max(approxCols, 6));

    function appendOne(item, idxGlobal) {
      const figure = document.createElement('figure');
      figure.className = 'gallery-item';
      if (item._span === 'tall') figure.classList.add('tile-tall');
      if (item._span === 'wide') figure.classList.add('tile-wide');
      if (item._span === 'big') figure.classList.add('tile-big');

      const picture = document.createElement('picture');
      const img = document.createElement('img');
      img.src = withBust(item.src);
      img.alt = item.alt || '';
      // Reserve space to prevent layout shift using known dimensions.
      // Prefer manifest-provided w/h; fallback to runtime metrics (_w/_h) if available.
      const dimW = (typeof item.w === 'number' && item.w > 0) ? item.w : (typeof item._w === 'number' ? item._w : 0);
      const dimH = (typeof item.h === 'number' && item.h > 0) ? item.h : (typeof item._h === 'number' ? item._h : 0);
      if (dimW > 0 && dimH > 0) {
        try { img.setAttribute('width', String(dimW)); img.setAttribute('height', String(dimH)); } catch {}
        if (isMobilePortrait()) {
          try { figure.style.aspectRatio = `${dimW} / ${dimH}`; } catch {}
        }
      }
  // Use native lazy-loading for most images; keep a small initial set as eager/high-priority
  img.loading = (idxGlobal < initialChunk) ? 'eager' : 'lazy';
  if (idxGlobal < initialChunk) { img.setAttribute('fetchpriority', 'high'); }
  else { img.setAttribute('fetchpriority', 'low'); }
      img.decoding = 'async';
  img.tabIndex = 0;
      const fallbacks = buildFallbacks(item.src);
      if (fallbacks.length) img.dataset.fallbackIndex = '0';
  img.addEventListener('load', () => { loadedSrcSet.add(srcKey(item.src)); }, { once: true });
      const handleError = () => {
        const idx = parseInt(img.dataset.fallbackIndex || '0', 10);
        if (!Number.isNaN(idx) && idx < fallbacks.length) {
          img.dataset.fallbackIndex = String(idx + 1);
          img.src = withBust(fallbacks[idx]);
          return;
        }
        img.removeEventListener('error', handleError);
        const fig = img.closest('figure');
        if (fig && fig.parentElement) fig.parentElement.removeChild(fig);
        const originalSrc = item.src;
        const before = currentGalleryItems.length;
        currentGalleryItems = currentGalleryItems.filter(it => it.src !== originalSrc);
        slideshowImages = slideshowImages.filter(it => it.src !== originalSrc);
        if (currentGalleryItems.length !== before) scheduleGalleryRefresh();
      };
      img.addEventListener('error', handleError);

      figure.appendChild(picture);
      picture.appendChild(img);
      enhanceResponsive(img);
      // If we've already loaded this image earlier in the session, mark it loaded immediately
      if (loadedSrcSet.has(srcKey(item.src)) || (img.complete && img.naturalWidth > 0)) {
        loadedSrcSet.add(srcKey(item.src));
      }
      galleryContainer.appendChild(figure);

      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); img.click(); }
      });
    }

    // Render all items up-front so everything is in the DOM and loading starts immediately
    for (let i = 0; i < working.length; i++) {
      appendOne(working[i], i);
    }
    initLightboxForCurrentGallery();

    // After re-render, restore the previous viewport offset relative to the gallery
    try {
      const newTop = galleryContainer.getBoundingClientRect().top || 0;
      const newAbsTop = (window.scrollY || window.pageYOffset || 0) + newTop;
      const delta = newAbsTop - prevAbsTop;
      if (Math.abs(delta) > 1) {
        window.scrollTo({ top: (window.scrollY || window.pageYOffset || 0) - delta });
      }
    } catch (_) { /* no-op if metrics unavailable */ }

    // No scroll-reveal here to avoid any visibility pop-in. Images are all loading eagerly.
  }

  // Preload helpers: add <link rel="preload" as="image"> for gallery images
  function addImagePreload(href, priority) {
    try {
      if (!href) return;
      const head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;
      const existing = head.querySelector(`link[rel="preload"][as="image"][href="${CSS.escape(href)}"]`);
      if (existing) return;
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      if (priority) link.setAttribute('fetchpriority', priority);
      head.appendChild(link);
    } catch (_) { /* ignore */ }
  }
  function preloadGalleryImages(items) {
    try {
      const widths = [800]; // good balance of quality vs. size when preloading
      const seen = new Set();
  // Determine approxCols to prioritize only the first row
      function getApproxColumns() {
        try {
          const probe = document.createElement('figure');
          probe.className = 'gallery-item';
          probe.style.visibility = 'hidden';
          probe.style.margin = '0';
          galleryContainer.appendChild(probe);
          const colPx = probe.clientWidth || 0;
          const contW = galleryContainer.clientWidth || 0;
          galleryContainer.removeChild(probe);
          if (colPx > 0 && contW > 0) return Math.max(1, Math.round(contW / colPx));
        } catch {}
        return 4;
      }
  const approxCols = getApproxColumns();
  const eagerRows = 1;
  // Only preload roughly the first row
  const highPriorityCount = Math.max(approxCols, 4);

      const urlsForSW = [];
  // Only consider the first N items for preloading
  items.slice(0, highPriorityCount).forEach((it, idx) => {
        const src = (it && it.src) ? it.src.split('?')[0] : '';
        if (!src) return;
  const priority = 'high';
        // Project folder detection
        const mProj = src.match(/^images\/(project\s+(\d+))\/([^\.?]+)\.(jpg|jpeg|png|webp)$/i);
        if (mProj) {
          const projNum = mProj[2];
          const baseRel = `${mProj[1]}/${mProj[3]}`;
          const ext = (mProj[4] || '').toLowerCase();
          if (['2','3','4'].includes(projNum)) {
            widths.forEach(w => {
              const jpg = `images/resized/${w}/${baseRel}.${ext}`;
              const webp = `images/resized/${w}/${baseRel}.webp`;
              if (!seen.has(jpg)) { addImagePreload(jpg, priority); seen.add(jpg); }
              if (!seen.has(webp)) { addImagePreload(webp, priority); seen.add(webp); }
              urlsForSW.push(jpg, webp);
            });
            // Also preload the authored/original as a fallback
            if (!seen.has(src)) { addImagePreload(src, priority); seen.add(src); urlsForSW.push(src); }
            return;
          }
        }
        // images/resized path: just preload the detected src
        const mRes = src.match(/^images\/resized\/(400|800|1200)\/(.+)\.(jpg|jpeg|png|webp)$/i);
        if (mRes) {
          if (!seen.has(src)) { addImagePreload(src, priority); seen.add(src); urlsForSW.push(src); }
          return;
        }
        // default: preload original only
        if (!seen.has(src)) { addImagePreload(src, priority); seen.add(src); urlsForSW.push(src); }
      });
      // Ask the service worker to cache these URLs once
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller && urlsForSW.length) {
          const uniq = Array.from(new Set(urlsForSW));
          navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_URLS', urls: uniq });
        }
      } catch (_) { /* ignore */ }
    } catch (_) { /* ignore */ }
  }

  // Decode images in the background so when the user scrolls, they are already decoded and paint instantly
  async function warmDecodeGallery(items, rows) {
    try {
      const seen = new Set();
  // Prioritize only the first row using same column estimate
      function getApproxColumns() {
        try {
          const probe = document.createElement('figure');
          probe.className = 'gallery-item';
          probe.style.visibility = 'hidden';
          probe.style.margin = '0';
          galleryContainer.appendChild(probe);
          const colPx = probe.clientWidth || 0;
          const contW = galleryContainer.clientWidth || 0;
          galleryContainer.removeChild(probe);
          if (colPx > 0 && contW > 0) return Math.max(1, Math.round(contW / colPx));
        } catch {}
        return 4;
      }
  const approxCols = getApproxColumns();
  const eagerRows = 1;
  // Only warm-decode roughly the first row
  const highPriorityCount = Math.max(approxCols, 4);

      const ordered = items.slice();
      // Decode high-priority items first
      const high = ordered.slice(0, highPriorityCount);
      const rest = ordered.slice(highPriorityCount);

      async function decodeList(list) {
        await Promise.all(list.map(async (it) => {
          const src = (it && it.src) ? it.src.split('?')[0] : '';
          if (!src || seen.has(src)) return;
          seen.add(src);
          try {
            const im = new Image();
            im.src = src;
            // Use decode where supported to complete before paint
            if (typeof im.decode === 'function') {
              await im.decode();
            } else {
              await new Promise((res, rej) => { im.onload = res; im.onerror = res; });
            }
          } catch (_) { /* ignore individual failures */ }
        }));
      }

      await decodeList(high);
      // Skip decoding the rest to save resources; browser will decode on demand
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {}, { timeout: 300 });
      }
    } catch (_) { /* ignore */ }
  }

  function initLightboxForCurrentGallery() {
    // Avoid attaching duplicate global handlers on re-renders
    if (!window.__lightboxHandlersAttached__) {
      try { Object.defineProperty(window, '__lightboxHandlersAttached__', { value: false, writable: true, configurable: true }); } catch (_) {}
    }
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    if (!(lightbox && lightboxImg && lightboxClose)) return;

    const images = Array.from(galleryContainer.querySelectorAll('img'));
    images.forEach(img => {
      img.addEventListener('click', () => {
        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxImg.src = img.currentSrc || img.src;
        lightboxImg.alt = img.alt;
        lightbox._opener = img;
        // Dim gallery behind the lightbox
        try { galleryContainer.classList.add('lightbox-active'); } catch (e) {}
        try { lightboxClose.focus(); } catch (e) { lightbox.focus(); }
      });
    });

    // Define helpers once and bind global listeners once
    if (!window.__lightboxHandlersAttached__) {
      window.changeLightboxImage = function(direction) {
        const cur = lightboxImg.src;
        const list = Array.from(galleryContainer.querySelectorAll('img'));
        const idx = list.findIndex(i => i.src === cur);
        if (idx !== -1) {
          const nextIdx = (idx + direction + list.length) % list.length;
          lightboxImg.src = list[nextIdx].src;
          lightboxImg.alt = list[nextIdx].alt;
        }
      };
      window.closeLightbox = function() {
        lightbox.style.display = 'none';
        lightbox.setAttribute('aria-hidden', 'true');
        lightboxImg.src = '';
        lightboxImg.alt = '';
        try { if (lightbox._opener) lightbox._opener.focus(); } catch (e) {}
        try { galleryContainer.classList.remove('lightbox-active'); } catch (e) {}
      };
      lightboxClose.addEventListener('click', window.closeLightbox);
      lightbox.addEventListener('click', (e) => { if (e.target === lightbox) window.closeLightbox(); });
      document.addEventListener('keydown', (e) => {
        if (lightbox.style.display === 'flex') {
          if (e.key === 'Escape' || e.key === 'Esc') window.closeLightbox();
          if (e.key === 'ArrowLeft') window.changeLightboxImage(-1);
          if (e.key === 'ArrowRight') window.changeLightboxImage(1);
        }
      });

      // Minimal focus trap: keep focus inside the lightbox when open
      function trapFocus(e) {
        if (lightbox.style.display !== 'flex') return;
        const focusable = [lightboxClose, lightboxImg].filter(Boolean);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      document.addEventListener('keydown', trapFocus);
      window.__lightboxHandlersAttached__ = true;
    }

    // Basic swipe support on lightbox (mobile)
    let touchStartX = null;
    lightbox.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      if (touchStartX == null) return;
      const dx = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX - touchStartX : 0;
      const threshold = 40; // minimal swipe distance
      if (Math.abs(dx) > threshold) {
        window.changeLightboxImage(dx > 0 ? -1 : 1);
      }
      touchStartX = null;
    });
  }

  function initLightboxIfPresent() {
    // Keeps previous behavior for pages we didn't touch
    const galleryImgs = document.querySelectorAll('.gallery img');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.querySelector('.lightbox-close');
    if (!(lightbox && lightboxImg && lightboxClose)) return;
    galleryImgs.forEach(img => {
      const src = img.getAttribute('src') || '';
      const m = src.match(/^images\/resized\/(400|800|1200)\/(.+)\.(jpg|jpeg|png)$/i);
      if (m) {
        const base = m[2];
        const ext = m[3] ? m[3].toLowerCase() : (src.endsWith('.png') ? 'png' : 'jpg');
        const widths = [400, 800, 1200];
        const srcset = widths.map(w => `images/resized/${w}/${base}.${ext} ${w}w`).join(', ');
        img.setAttribute('srcset', srcset);
        img.setAttribute('sizes', '(max-width: 900px) 48vw, 400px');
        if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
        if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
      }
      img.addEventListener('click', () => {
        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox._opener = img;
        try { lightboxClose.focus(); } catch (e) { lightbox.focus(); }
      });
    });
    window.closeLightbox = function() {
      lightbox.style.display = 'none';
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.src = '';
      lightboxImg.alt = '';
      try { if (lightbox._opener) lightbox._opener.focus(); } catch (e) {}
    };
  }

  // Slideshow state
  let slideshowImages = [];
  let slideIndex = 0;

  function showSlide(idx) {
    if (!slideshowImages.length) return;
    slideIndex = (idx + slideshowImages.length) % slideshowImages.length;
    let item = slideshowImages[slideIndex];
  // Encode spaces and append cache-busting param for slideshow image as well
  const setSlideSrc = (src) => { slideshowImg.src = withBust(src); };
  setSlideSrc(item.src);
    slideshowImg.alt = `${projectNames[projectNum]} Slide ${slideIndex + 1}`;
    enhanceResponsive(slideshowImg);
    try { slideshowImg.setAttribute('fetchpriority', 'high'); } catch (e) {}
    // If slideshow image fails, skip to the next available one
    const onErr = () => {
      const maxHops = slideshowImages.length;
      let hops = 0;
      while (hops < maxHops) {
        slideIndex = (slideIndex + 1) % slideshowImages.length;
        const cand = slideshowImages[slideIndex];
        if (cand && cand.src) { setSlideSrc(cand.src); break; }
        hops++;
      }
    };
    // Attach one-time error listener for the current set
    slideshowImg.addEventListener('error', onErr, { once: true });
  }
  function nextSlide() { if (slideshowImages.length > 1) showSlide(slideIndex + 1); }
  function prevSlide() { if (slideshowImages.length > 1) showSlide(slideIndex - 1); }
  window.changeSlide = function(direction) { if (direction > 0) nextSlide(); else prevSlide(); resetTimer(); };
  if (slideshowContainer) {
    slideshowContainer.setAttribute('tabindex', '0');
    slideshowContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'ArrowRight') nextSlide();
    });
  }
  let slideshowTimer; function resetTimer() { if (slideshowTimer) { clearInterval(slideshowTimer); } if (slideshowImages.length > 1) { slideshowTimer = setInterval(nextSlide, 7000); } }

  // Initialize
  loadProjectImages()
    .then(async (images) => {
      // If page opts out of manifest (uses HTML-defined images), render gallery only and keep hero as authored
      if (isHtmlSource) {
        try {
          // Leave authored gallery DOM intact. Just add lazy/decoding hints and wire up lightbox.
          const authoredImgs = Array.from(galleryContainer.querySelectorAll('img'));
          authoredImgs.forEach(img => {
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
            if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
          });
          initLightboxForCurrentGallery();

          // Normalize DOM structure to match JS-rendered galleries: wrap images in <figure class="gallery-item">
          // and apply tile spans (wide/tall/big) using the manifest, while preserving authored order/content.
          const toProcess = Array.from(galleryContainer.querySelectorAll('img'));
          // Try to fetch manifest to get span hints
          let spanMap = new Map();
          let dimsMap = new Map();
          try {
            const res = await fetch(encodeURI(manifestUrl), { cache: 'no-cache' });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data?.images)) {
                data.images.forEach(item => {
                  const src = (item && typeof item.src === 'string') ? item.src.trim() : '';
                  const span = (item && typeof item.span === 'string') ? item.span.trim() : '';
                  const w = (item && typeof item.w === 'number') ? item.w : undefined;
                  const h = (item && typeof item.h === 'number') ? item.h : undefined;
                  if (!src) return;
                  const base = src.split(/[\\\/]/).pop().toLowerCase();
                  if (span) spanMap.set(base, span);
                  if (w && h) dimsMap.set(base, { w, h });
                });
              }
            }
          } catch (_) { /* no-op; spans remain empty */ }

          toProcess.forEach(img => {
            const parent = img.parentElement;
            const isFigure = parent && parent.tagName === 'FIGURE';
            let figure = isFigure ? parent : null;
            if (!isFigure) {
              figure = document.createElement('figure');
              figure.className = 'gallery-item';
              // Insert the figure at the image's position and move the image inside
              parent.insertBefore(figure, img);
              figure.appendChild(img);
            } else {
              if (!figure.classList.contains('gallery-item')) figure.classList.add('gallery-item');
              // Remove any previous span classes to avoid duplicates
              figure.classList.remove('tile-tall', 'tile-wide', 'tile-big');
            }
            // Apply span class from manifest if available
            try {
              const raw = img.getAttribute('src') || '';
              const clean = raw.split('?')[0];
              const base = clean.split(/[\\\/]/).pop().toLowerCase();
              const span = spanMap.get(base);
              if (span === 'tall') figure.classList.add('tile-tall');
              else if (span === 'wide') figure.classList.add('tile-wide');
              else if (span === 'big') figure.classList.add('tile-big');
              const d = dimsMap.get(base);
              if (d && d.w && d.h) {
                try { img.setAttribute('width', String(d.w)); img.setAttribute('height', String(d.h)); } catch {}
                try { if (window.matchMedia && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches) { figure.style.aspectRatio = `${d.w} / ${d.h}`; } } catch {}
              }
            } catch (_) { /* ignore */ }

            // Track loaded images in session cache only; no fade class toggling
            if (img.complete && img.naturalWidth > 0) {
              loadedSrcSet.add(srcKey(img.getAttribute('src') || ''));
            } else {
              img.addEventListener('load', () => { loadedSrcSet.add(srcKey(img.getAttribute('src') || '')); }, { once: true });
            }
          });

          // Initialize slideshow from authored hero + gallery so arrows work, preserving current hero as first slide
          const heroSrc = (slideshowImg && slideshowImg.getAttribute('src')) || '';
          const heroAlt = (slideshowImg && slideshowImg.getAttribute('alt')) || `${projectNames[projectNum] || 'Project'} Slide 1`;
          const authoredList = authoredImgs
            .map(img => ({
              src: img.getAttribute('src') || '',
              alt: img.getAttribute('alt') || `${projectNames[projectNum] || 'Project'} image`
            }))
            .filter(it => !!it.src);
          // Deduplicate while keeping hero first
          const seen = new Set();
          const combined = [];
          if (heroSrc) { combined.push({ src: heroSrc, alt: heroAlt }); seen.add(heroSrc.toLowerCase()); }
          for (const it of authoredList) {
            const key = it.src.toLowerCase();
            if (!seen.has(key)) { combined.push(it); seen.add(key); }
          }
          if (combined.length) {
            slideshowImages = combined.slice();
            showSlide(0); // keeps the authored hero as the initial slide
            resetTimer();
          }
          // Start preloading gallery images so they are ready before scroll
          try { preloadGalleryImages(authoredList); } catch (_) {}
          try { warmDecodeGallery(authoredList, 8); } catch (_) {}
          return; // do not rebuild or rearrange beyond this
        } catch (_) { /* fall through to default path if something goes wrong */ }
      }
      // No-op: we don't mutate URLs for caching anymore.

      // If spans are already provided (projects 2–4), do a single render only (skip early render)
      const hasPrecomputedSpans = images.every(it => typeof it._span !== 'undefined');
      slideshowImages = images.slice();
      showSlide(0);
      resetTimer();
      if (hasPrecomputedSpans) {
        renderGallery(images);
  // Preload + warm-decode determined images
  try { preloadGalleryImages(images); } catch (_) {}
  try { warmDecodeGallery(images, 8); } catch (_) {}
        initLightboxForCurrentGallery();
        return; // single pass render; skip dynamic metrics/arrangement
      }

      // No early render: proceed to compute metrics, arrange, and then render once

      // Image metrics cache to avoid remeasuring images (aspect + dimensions)
      const metricsCache = new Map();
      async function getImageMetrics(url) {
        const key = url;
        if (metricsCache.has(key)) return metricsCache.get(key);
        const value = await new Promise((resolve) => {
          const im = new Image();
          im.onload = () => {
            const w = im.naturalWidth || 0;
            const h = im.naturalHeight || 0;
            const ar = (w && h) ? (w / h) : 1;
            resolve({ ar: ar || 1, w, h });
          };
          im.onerror = () => resolve({ ar: 1, w: 0, h: 0 });
          im.src = url && url.startsWith('images/') ? withBust(url) : url;
          if (im.decode) { im.decode().catch(() => {}); }
        });
        metricsCache.set(key, value);
        return value;
      }

      // Classify each image into one of 4 tile shapes:
      // tall (1 x 2), wide (2 x 1), big (2 x 2), normal (1 x 1)
      const nearSquareDelta = 0.12; // kept for reference, but big is chosen by measured tile AR
      // Compute metrics in the background, then reflow with best-fit layout
      const withMetrics = await Promise.all(images.map(async (it) => {
        const m = await getImageMetrics(it.src);
        return { ...it, _ar: m.ar, _w: m.w, _h: m.h, _area: (m.w || 0) * (m.h || 0) };
      }));

      // Compute effective tile aspect ratios from the grid (uses a hidden probe)
      function computeTileARs() {
        try {
          const cs = getComputedStyle(galleryContainer);
          const rowPx = parseFloat(cs.gridAutoRows) || 200;
          const colGap = parseFloat(cs.columnGap) || 0;
          const rowGap = parseFloat(cs.rowGap) || 0;
          const probe = document.createElement('figure');
          probe.style.visibility = 'hidden';
          probe.style.margin = '0';
          probe.className = 'gallery-item';
          galleryContainer.appendChild(probe);
          const colPx = probe.clientWidth || galleryContainer.clientWidth || 200;
          galleryContainer.removeChild(probe);
          if (!rowPx || !colPx) throw new Error('bad grid metrics');
          return {
            normal: colPx / rowPx,
            wide: (colPx * 2 + colGap) / rowPx,
            tall: colPx / (rowPx * 2 + rowGap),
            big: (colPx * 2 + colGap) / (rowPx * 2 + rowGap)
          };
        } catch (_) {
          // Fallback to theoretical ratios
          return { normal: 1.0, wide: 2.0, tall: 0.5, big: 1.0 };
        }
      }
      // (Removed duplicate arrangeFromMetrics; enhanced version below)
      function arrangeFromMetrics(metrics) {
        const tileAR = computeTileARs();
        const totalCount = metrics.length;
        const bigFraction = BIG_FRACTION_BY_PROJECT[projectNum] ?? 0.12;
        const bigTarget = Math.max(0, Math.round(totalCount * bigFraction));

        // Prefer images closest to the measured big tile AR; break ties by larger area
        // Use a strict threshold first, then a fallback to guarantee presence if desired
        const maxBigCost = 0.28; // primary cap: reasonable matches for 2x2
        const fallbackMaxBigCost = 0.42; // fallback cap if we still need to reach target
        const costList = metrics
          .map(it => ({ it, c: Math.abs(Math.log((it._ar || 1) / (tileAR.big || 1))) }))
          .sort((a,b) => (a.c - b.c) || (b.it._area - a.it._area) || a.it.src.localeCompare(b.it.src));
  let bigCandidates = costList.filter(x => x.c <= maxBigCost).slice(0, bigTarget).map(x => x.it);
        if (bigCandidates.length === 0 && bigTarget > 0 && costList.length) {
          // Ensure at least one big if configured
          bigCandidates = [costList[0].it];
        } else if (bigCandidates.length < bigTarget) {
          for (const x of costList) {
            if (bigCandidates.length >= bigTarget) break;
            if (bigCandidates.some(it => it.src === x.it.src)) continue;
            if (x.c <= fallbackMaxBigCost) bigCandidates.push(x.it);
          }
        }
  bigCandidates = bigCandidates.sort((a,b) => a.src.localeCompare(b.src));
  // Ensure inserted items carry the big span flag
  const bigItems = bigCandidates.map(it => ({ ...it, _span: 'big' }));
  const bigChosenSet = new Set(bigCandidates.map(it => it.src));

        function cost(imgAR, boxAR) { return Math.abs(Math.log((imgAR || 1) / (boxAR || 1))); }
        const classified = metrics.map(it => {
          if (bigChosenSet.has(it.src)) return { ...it, _span: 'big' };
          const cTall = cost(it._ar, tileAR.tall);
          const cWide = cost(it._ar, tileAR.wide);
          const cNorm = cost(it._ar, tileAR.normal);
          const min = Math.min(cTall, cWide, cNorm);
          let _span = null;
          if (min === cNorm) _span = null; else if (min === cWide) _span = 'wide'; else _span = 'tall';
          return { ...it, _span };
        });

        // Build base arrangement without bigs (apply cooldown for tall/wide)
        const nonBigGroups = {
          tall: classified.filter(it => it._span === 'tall').sort((a,b) => a.src.localeCompare(b.src)),
          wide: classified.filter(it => it._span === 'wide').sort((a,b) => a.src.localeCompare(b.src)),
          normal: classified.filter(it => !it._span).sort((a,b) => a.src.localeCompare(b.src)),
        };
        const baseArranged = [];
        let lastKey = '', secondLastKey = '';
        function nonBigRemaining() { return nonBigGroups.tall.length + nonBigGroups.wide.length + nonBigGroups.normal.length; }
        while (nonBigRemaining() > 0) {
          const rem = nonBigRemaining();
          const shares = [
            { k: 'tall', n: nonBigGroups.tall.length, share: nonBigGroups.tall.length / rem },
            { k: 'wide', n: nonBigGroups.wide.length, share: nonBigGroups.wide.length / rem },
            { k: 'normal', n: nonBigGroups.normal.length, share: nonBigGroups.normal.length / rem },
          ].filter(x => x.n > 0)
           .sort((a,b) => b.share - a.share || a.k.localeCompare(b.k));
          const violatesCooldown = (k) => (k === 'tall' || k === 'wide') && (k === lastKey || k === secondLastKey);
          let pickKey = (shares.find(s => s.k !== lastKey && !violatesCooldown(s.k))?.k)
                      || (shares.find(s => s.k !== lastKey)?.k)
                      || shares[0].k;
          let item;
          if (pickKey === 'tall') item = nonBigGroups.tall.shift();
          else if (pickKey === 'wide') item = nonBigGroups.wide.shift();
          else item = nonBigGroups.normal.shift();
          baseArranged.push(item);
          secondLastKey = lastKey; lastKey = pickKey;
        }

        // Evenly distribute bigs into the base sequence with a minimum gap
        // and try to place them in different column buckets to avoid vertical stacking
        const finalArr = baseArranged.slice();
  const nBig = bigItems.length;
        if (nBig > 0) {
          const baseLen = baseArranged.length;
          const finalLen = baseLen + nBig;
          const minGap = Math.max(4, Math.floor(finalLen / (nBig + 1)) - 1); // ensure noticeable spacing
          // Estimate number of columns based on probe width and container width
          let approxCols = 1;
          try {
            const probe = document.createElement('figure');
            probe.style.visibility = 'hidden';
            probe.style.margin = '0';
            probe.className = 'gallery-item';
            galleryContainer.appendChild(probe);
            const colPx = probe.clientWidth || 0;
            const contW = galleryContainer.clientWidth || 0;
            galleryContainer.removeChild(probe);
            if (colPx > 0 && contW > 0) approxCols = Math.max(1, Math.round(contW / colPx));
          } catch (_) { approxCols = 1; }

          let lastPlaced = -Infinity;
          let lastMod = -1;
          for (let i = 1; i <= nBig; i++) {
            const target = Math.max(0, Math.round((i * finalLen) / (nBig + 1)) - 1);
            // Start near target considering already inserted items
            let pos = Math.min(target, finalArr.length);
            // Ensure minimum gap from previous big
            if (pos - lastPlaced < minGap) pos = Math.min(finalArr.length, lastPlaced + minGap);
            // Try to avoid same column bucket modulo approxCols
            if (approxCols > 1) {
              let attempts = 0;
              const maxAttempts = Math.min(approxCols, 6);
              // Prefer forward shift
              while (attempts < maxAttempts && (pos % approxCols) === lastMod) { pos = Math.min(finalArr.length, pos + 1); attempts++; }
              // If still same, try backward
              attempts = 0;
              while ((pos % approxCols) === lastMod && attempts < maxAttempts) { pos = Math.max(0, pos - 1); attempts++; }
            }
            // Clamp to bounds
            pos = Math.max(0, Math.min(pos, finalArr.length));
            const bigItem = bigItems[i - 1];
            finalArr.splice(pos, 0, bigItem);
            lastMod = approxCols > 1 ? (pos % approxCols) : -1;
            lastPlaced = pos;
          }
        }
        return finalArr;
      }
      

    // Arrange and re-render once metrics are available
  let arranged = arrangeFromMetrics(withMetrics);
  slideshowImages = arranged.slice();
    showSlide(slideIndex);
    renderGallery(arranged);
  try { preloadGalleryImages(arranged); } catch (_) {}
  try { warmDecodeGallery(arranged, 8); } catch (_) {}
    initLightboxForCurrentGallery();

      // Debounced resize reflow: only when container width changes significantly
      let _reflowTimer = null;
      let _lastWidth = galleryContainer.clientWidth || 0;
      window.addEventListener('resize', () => {
        clearTimeout(_reflowTimer);
        _reflowTimer = setTimeout(() => {
          try {
            const w = galleryContainer.clientWidth || 0;
            if (Math.abs(w - _lastWidth) < 24) return; // ignore tiny changes
            _lastWidth = w;
            arranged = arrangeFromMetrics(withMetrics);
            renderGallery(arranged);
            initLightboxForCurrentGallery();
          } catch (e) { /* no-op */ }
        }, 180);
      });
    })
    .catch(() => {
    // Fallback to defaults if something unexpected happened
    const images = defaultSets[projectNum] || [];
    slideshowImages = images.slice();
    showSlide(0);
    renderGallery(images);
    initLightboxForCurrentGallery();
    });
});