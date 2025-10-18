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
  // Stable cache version for images derived from manifest, improves caching across sessions
  let IMG_CACHE_VER = 'v=1';
  function withBust(url) {
    if (!url) return url;
    // Only append to same-origin images path
    if (url.startsWith('images/')) {
      return encodeURI(url) + (url.includes('?') ? '&' : '?') + IMG_CACHE_VER;
    }
    return url;
  }

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
          span: (item && typeof item.span === 'string') ? item.span.trim() : undefined
        }))
        .filter(item => !!item.src)
        .map(item => ({
          src: (item.src.startsWith('images/')) ? item.src : `${folderPath}/${item.src}`,
          alt: item.alt || `${projectNames[projectNum] || 'Project'} image`,
          _span: item.span || undefined
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
    // If this page uses HTML-sourced gallery, don't attach srcset/WebP derived variants.
    // This guarantees we show exactly the files authored in the HTML, avoiding 404s.
    if (isHtmlSource) {
      if (!imgEl.hasAttribute('decoding')) imgEl.setAttribute('decoding', 'async');
      if (!imgEl.hasAttribute('loading')) imgEl.setAttribute('loading', 'lazy');
      return;
    }
    const raw = imgEl.getAttribute('src') || '';
    const src = raw.split('?')[0]; // strip cache-busting for detection
    // Support either images/resized/{w}/<path>.<ext> or images/project X/<file>.<ext>
    let relPath = '';
    let ext = '';
    let m = src.match(/^images\/resized\/(?:400|800|1200)\/(.+)\.(jpg|jpeg|png|webp)$/i);
    if (m) {
      relPath = m[1];
      ext = (m[2] || '').toLowerCase();
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
    if (!projectFolderMatch || resizedExistsForProject) {
      legacyCandidates = widths.map(w => `images/resized/${w}/${relPath}.${ext}?${IMG_CACHE_VER} ${w}w`);
    }
    // Add original as the largest candidate to guarantee a working fallback if resized files are missing
    if (imgEl.src) {
      legacyCandidates.push(`${imgEl.src} 2000w`);
    }
    const legacySrcset = legacyCandidates.join(', ');
    const webpSrcset = (!projectFolderMatch || resizedExistsForProject)
      ? widths.map(w => `images/resized/${w}/${relPath}.webp?${IMG_CACHE_VER} ${w}w`).join(', ')
      : '';

  // Always add legacy srcset on the <img> (only for non-project paths)
    imgEl.setAttribute('srcset', legacySrcset);
    imgEl.setAttribute('sizes', sizes);
    if (!imgEl.hasAttribute('decoding')) imgEl.setAttribute('decoding', 'async');
    if (!imgEl.hasAttribute('loading')) imgEl.setAttribute('loading', 'lazy');

    // If wrapped in <picture>, prepend a WebP <source>
    const picture = imgEl.parentElement && imgEl.parentElement.tagName === 'PICTURE' ? imgEl.parentElement : null;
    if (picture) {
      // Remove any previous sources to avoid duplication on re-renders
      Array.from(picture.querySelectorAll('source')).forEach(s => s.remove());
      if (webpSrcset) {
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
    // Clear existing
    galleryContainer.innerHTML = '';

    // Estimate number of columns to eagerly load first ~2 rows on larger screens
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
  const eagerRows = 2;
  const approxCols = getApproxColumns();
  const chunkSize = isHtmlSource ? images.length : Math.max(8, approxCols * eagerRows);
    let rendered = 0;

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
      if (idxGlobal < chunkSize) { img.loading = 'eager'; img.setAttribute('fetchpriority', 'high'); }
      else { img.loading = 'lazy'; img.setAttribute('fetchpriority', 'auto'); }
      img.decoding = 'async';
      img.tabIndex = 0;
      img.classList.add('lazy');
      const fallbacks = buildFallbacks(item.src);
      if (fallbacks.length) img.dataset.fallbackIndex = '0';
      img.addEventListener('load', () => { img.classList.add('loaded'); }, { once: true });
      const handleError = () => {
        img.classList.add('loaded');
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
      galleryContainer.appendChild(figure);

      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); img.click(); }
      });
    }

    function renderChunk() {
      const end = Math.min(rendered + chunkSize, working.length);
      for (let i = rendered; i < end; i++) appendOne(working[i], i);
      rendered = end;
      initLightboxForCurrentGallery();
      if (rendered >= working.length) {
        // all done
        if (sentinel && observer) observer.unobserve(sentinel);
        if (sentinel && sentinel.parentElement) sentinel.parentElement.removeChild(sentinel);
      }
    }

    // Initial chunk
    renderChunk();

    // Progressive chunks on scroll
    let sentinel = document.createElement('div');
    sentinel.className = 'gallery-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    galleryContainer.appendChild(sentinel);
    let observer = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting && rendered < working.length) {
            renderChunk();
          }
        }
      }, { rootMargin: '100px 0px' });
      observer.observe(sentinel);
    }
  }

  function initLightboxForCurrentGallery() {
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
          try {
            const res = await fetch(encodeURI(manifestUrl), { cache: 'no-cache' });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data?.images)) {
                data.images.forEach(item => {
                  const src = (item && typeof item.src === 'string') ? item.src.trim() : '';
                  const span = (item && typeof item.span === 'string') ? item.span.trim() : '';
                  if (!src || !span) return;
                  const base = src.split(/[\\\/]/).pop().toLowerCase();
                  spanMap.set(base, span);
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
            } catch (_) { /* ignore */ }
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
          return; // do not rebuild or rearrange beyond this
        } catch (_) { /* fall through to default path if something goes wrong */ }
      }
      // Compute a stable per-page image version from manifest image list (for caching)
      try {
        const joined = images.map(i => i && i.src ? i.src : '').join('|');
        let h = 0; for (let i = 0; i < joined.length; i++) { h = (h * 31 + joined.charCodeAt(i)) >>> 0; }
        IMG_CACHE_VER = 'v=' + h.toString(36);
      } catch (e) { IMG_CACHE_VER = 'v=1'; }

      // Fast-first render: show slideshow and grid immediately without waiting for metrics
      slideshowImages = images.slice();
      showSlide(0);
      resetTimer();
      renderGallery(images);
      initLightboxForCurrentGallery();

      // If spans are already provided (projects 2–4), skip runtime measurement and arrangement
      const hasPrecomputedSpans = images.every(it => typeof it._span !== 'undefined');
      if (hasPrecomputedSpans) {
        // Keep original order and render immediately
        renderGallery(images);
        initLightboxForCurrentGallery();
        return; // skip dynamic metrics/arrangement
      }

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
    initLightboxForCurrentGallery();

      // Debounced resize reflow: recompute tile ARs and reassign boxes when layout changes
      let _reflowTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(_reflowTimer);
        _reflowTimer = setTimeout(() => {
          try {
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