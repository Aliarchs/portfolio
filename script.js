document.addEventListener('DOMContentLoaded', function() {

  // Helper to detect mobile
  function isMobile() {
    return window.innerWidth <= 600;
  }

  // Helper to detect touch-capable devices (phones, tablets, many laptops)
  function isTouchDevice() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
  }

  // Treat very large touch screens (e.g. touch-enabled laptops) as "large touch devices"
  // where auto-hide is acceptable. Adjust this threshold if you want a different cutoff.
  const TOUCH_LAPTOP_MIN_WIDTH = 900; // px
  function isLargeTouchDevice() {
    return isTouchDevice() && window.innerWidth >= TOUCH_LAPTOP_MIN_WIDTH;
  }

  // Simple image preloader cache. Keeps Image objects for recently-seen sources so
  // navigation to adjacent pages is immediate if the image is already cached.
  const _imgCache = Object.create(null);
  function preloadImage(src) {
    if (!src) return Promise.resolve();
    if (_imgCache[src]) {
      // if cached Image object exists, return a resolved promise when it's complete
      const cached = _imgCache[src];
      if (cached.complete) return Promise.resolve(cached);
      return new Promise((res, rej) => {
        cached.addEventListener('load', () => res(cached));
        cached.addEventListener('error', () => rej(new Error('failed to load')));
      });
    }
    const im = new Image();
  // Only set crossOrigin for same-asset policy alignment if element sources used crossorigin in markup
  // (preloads now declare crossorigin="anonymous")
  // No crossOrigin needed for same-origin images; remove to avoid credential mode mismatch with preloads.
    _imgCache[src] = im;
    im.src = src;
    return new Promise((resolve, reject) => {
      im.addEventListener('load', () => {
        // try to decode for smoother display if supported
        if (typeof im.decode === 'function') {
          im.decode().then(() => resolve(im)).catch(() => resolve(im));
        } else {
          resolve(im);
        }
      });
      im.addEventListener('error', () => reject(new Error('failed to load ' + src)));
    });
  }
  function preloadRange(images, fromIdx, toIdx) {
    for (let i = Math.max(0, fromIdx); i <= Math.min(images.length - 1, toIdx); i++) {
      // Prefer preloading the resized 800px variant when available
      const src = images[i];
      if (src) {
        const m = src.match(/\/([^\/]+)$/);
        const fname = m ? m[1] : src;
        const resized800 = `images/resized/800/${fname}`;
        preloadImage(resized800);
      }
    }
  }

  // Build resized srcsets and fallback jpg for a given original path like
  // "images/project1-2.jpg" -> { jpg800, jpgSrcset, webpSrcset }
  function buildResizedSrcs(orig) {
    if (!orig) return { jpg800: '', jpgSrcset: '', webpSrcset: '' };
    const m = orig.match(/\/([^\/]+)$/);
    const fname = m ? m[1] : orig;
    // derive resized paths; handle jpg/jpeg/png
    const jpg1200 = `images/resized/1200/${fname}`;
    const jpg800 = `images/resized/800/${fname}`;
    const jpg400 = `images/resized/400/${fname}`;
    const webp1200 = jpg1200.replace(/\.(jpe?g|png)$/i, '.webp');
    const webp800 = jpg800.replace(/\.(jpe?g|png)$/i, '.webp');
    const webp400 = jpg400.replace(/\.(jpe?g|png)$/i, '.webp');
    const jpgSrcset = `${jpg1200} 1200w, ${jpg800} 800w, ${jpg400} 400w`;
    const webpSrcset = `${webp1200} 1200w, ${webp800} 800w, ${webp400} 400w`;
    return { jpg800, jpgSrcset, webpSrcset };
  }

  // Mobile flipbook logic: single page in portrait, double spread in landscape
  function setupMobileFlipbook() {
    // Run mobile flipbook logic whenever the mobile flipbook markup exists.
    // Don't rely only on viewport width because some phones in landscape can be wider than 600px.
    if (!document.getElementById('img-mobile-portrait') && !document.getElementById('img-mobile-left')) return;
    // Images array: exclude cover (project1-1.jpg) since cover is handled separately
    // Start at project1-2.jpg through project1-32.jpg
    const images = [];
    for (let i = 2; i <= 32; i++) {
      images.push(`images/project1-${i}.jpg`);
    }
    window.mobilePage = window.mobilePage || 0;
    const imgMobilePortrait = document.getElementById('img-mobile-portrait');
    const imgMobileLeft = document.getElementById('img-mobile-left');
    const imgMobileRight = document.getElementById('img-mobile-right');
    const mobileLandscape = document.getElementById('mobile-landscape');
    const prevBtnMobile = document.getElementById('prev-btn-mobile');
    const nextBtnMobile = document.getElementById('next-btn-mobile');
    const coverContainer = document.getElementById('cover-container');
    const bookContainer = document.querySelector('.book-container');

    function isPortrait() {
      return window.matchMedia('(orientation: portrait)').matches;
    }

    function updateMobilePage() {
      const portrait = isPortrait();
      const bc = document.querySelector('.book-container');
      if (portrait) {
        // Portrait: show single image
        if (imgMobilePortrait) {
          imgMobilePortrait.style.display = 'block';
          if (window.mobilePage < 0) window.mobilePage = 0;
          if (window.mobilePage > images.length - 1) window.mobilePage = images.length - 1;
          const src = images[window.mobilePage];
          preloadImage(src).then(() => {
            imgMobilePortrait.src = src;
          }).catch(() => { imgMobilePortrait.src = src; });
          // preload nearby images for snappier navigation (fire-and-forget)
          preloadRange(images, window.mobilePage - 2, window.mobilePage + 2);
        }
        if (mobileLandscape) mobileLandscape.style.display = 'none';
        // remove double-spread styling when in portrait
        if (bc) bc.classList.remove('double-spread');
        // Update next button state in portrait (was missing before)
        var nextBtnMobileElP = document.getElementById('next-btn-mobile');
        if (nextBtnMobileElP) {
          var isMobileLastP = (window.mobilePage >= images.length - 1);
          nextBtnMobileElP.innerHTML = isMobileLastP ? 'continue to first page &gt;' : '&gt;';
          nextBtnMobileElP.setAttribute('aria-label', isMobileLastP ? 'Continue to first page' : 'Next page');
          if (isMobileLastP) nextBtnMobileElP.classList.add('end-loop'); else nextBtnMobileElP.classList.remove('end-loop');
        }
      } else {
        // Landscape: always show even-left spreads (1+2, 3+4, ...)
        if (imgMobilePortrait) imgMobilePortrait.style.display = 'none';
        if (mobileLandscape) {
          mobileLandscape.style.display = 'flex';
          // Normalize to even left index so spreads are (0,1), (2,3), (4,5), ...
          let leftIdx = Math.floor(window.mobilePage / 2) * 2;
          let rightIdx = leftIdx + 1;
          if (leftIdx < 0) leftIdx = 0;
          if (rightIdx > images.length - 1) rightIdx = images.length - 1;
          // Keep window.mobilePage aligned to leftIdx for consistency
          window.mobilePage = leftIdx;
          if (imgMobileLeft) preloadImage(images[leftIdx]).then(() => { imgMobileLeft.src = images[leftIdx]; }).catch(() => { imgMobileLeft.src = images[leftIdx]; });
          if (imgMobileRight) preloadImage(images[rightIdx]).then(() => { imgMobileRight.src = images[rightIdx]; }).catch(() => { imgMobileRight.src = images[rightIdx]; });
          // preload adjacent spreads
          preloadRange(images, leftIdx - 2, leftIdx + 3);
          // add double-spread styling when showing two pages
          if (bc) bc.classList.add('double-spread');
              // Update mobile next button label when on final spread
              var nextBtnMobileEl = document.getElementById('next-btn-mobile');
              var isMobileLast = false;
              // In portrait we check single-page end; in landscape check left index
              if (isPortrait()) {
                isMobileLast = (window.mobilePage >= images.length - 1);
              } else {
                isMobileLast = (leftIdx >= images.length - 2);
              }
              if (nextBtnMobileEl) {
                nextBtnMobileEl.innerHTML = isMobileLast ? 'continue to first page &gt;' : '&gt;';
                nextBtnMobileEl.setAttribute('aria-label', isMobileLast ? 'Continue to first page' : 'Next page');
                if (isMobileLast) nextBtnMobileEl.classList.add('end-loop'); else nextBtnMobileEl.classList.remove('end-loop');
              }
        }
      }
    }

    // Navigation logic (arrow buttons below)
    function goPrev() {
      if (isPortrait()) {
        window.mobilePage = Math.max(0, window.mobilePage - 1);
      } else {
        window.mobilePage = Math.max(0, window.mobilePage - 2);
      }
      updateMobilePage();
      if (prevBtnMobile) prevBtnMobile.blur();
    }
    function goNext() {
      if (isPortrait()) {
        window.mobilePage = Math.min(31, window.mobilePage + 1);
      } else {
        window.mobilePage = Math.min(30, window.mobilePage + 2);
      }
      updateMobilePage();
      if (nextBtnMobile) nextBtnMobile.blur();
    }

    if (prevBtnMobile) prevBtnMobile.onclick = function(e) {
      if (Date.now() - (window.lastMobileTouch || 0) < 700) return;
      goPrev();
    };
    if (nextBtnMobile) nextBtnMobile.onclick = function(e) {
      if (Date.now() - (window.lastMobileTouch || 0) < 700) return;
      goNext();
    };
    // Also listen for touchend to ensure taps trigger navigation on devices that don't emit click reliably
  // touchend handlers were removed here to avoid duplicate navigation events.
  // We rely on the primary `onclick` handlers above and a single, dedicated
  // touchend handler added later to normalize behavior across devices.

    // Swipe logic removed: navigation only via arrow buttons

    // Block page click navigation for mobile only (optional, but pointer events can remain off)
    if (isMobile()) {
      document.querySelectorAll('.page').forEach(function(page) {
        page.onclick = null;
        page.style.pointerEvents = 'none';
      });
    }

    // Also update page when entering book mode
    if (document.getElementById('cover-img')) {
      document.getElementById('cover-img').addEventListener('click', function() {
        window.mobilePage = 0;
        updateMobilePage();
      });
    }
    if (document.getElementById('cover-next-btn')) {
      document.getElementById('cover-next-btn').addEventListener('click', function() {
        window.mobilePage = 0;
        updateMobilePage();
      });
    }

    // Initial update
    updateMobilePage();

    // Listen for orientation change to update layout and force correct display
    window.addEventListener('orientationchange', function() {
      // When switching to landscape, align the page to an even left index
      setTimeout(function() {
        if (!isPortrait()) {
          window.mobilePage = Math.floor(window.mobilePage / 2) * 2;
        }
        updateMobilePage();
      }, 300);
    });
  }

  // Run mobile flipbook logic on load and on resize
  setupMobileFlipbook();
  window.addEventListener('resize', setupMobileFlipbook);

  // Record last mobile touch time (used to prevent double navigation from touchend->click)
  window.lastMobileTouch = window.lastMobileTouch || 0;

  // Ensure arrow buttons use the always-visible class so CSS will keep them on-screen
  function addAlwaysVisibleClass() {
    ['prev-btn', 'next-btn', 'prev-btn-mobile', 'next-btn-mobile'].forEach(function(id) {
      const el = document.getElementById(id);
      // skip arrows inside the cover container so the cover arrow isn't fixed mid-screen
  if (el && (!el.closest('#cover-container') || el.id === 'cover-next-btn') && !el.classList.contains('always-visible')) el.classList.add('always-visible');
    });
    // Also mark any .book-arrow elements if needed
    document.querySelectorAll('.book-arrow').forEach(function(b) {
  if ((!b.closest('#cover-container') || b.id === 'cover-next-btn') && !b.classList.contains('always-visible')) b.classList.add('always-visible');
    });
  }

  // Auto-hide arrows after short inactivity to reduce distraction
  let arrowHideTimer = null;
  function showArrows() {
    clearTimeout(arrowHideTimer);
    const arrows = Array.from(document.querySelectorAll('.book-arrow.always-visible'));
    arrows.forEach(function(el) { el.classList.remove('arrow-hidden'); });

  // On touch-capable phones/tablets we keep arrows visible (no auto-hide).
  // Allow auto-hide on non-touch devices OR on large touch laptops (big screens with touch)
  if (!isTouchDevice() || isLargeTouchDevice()) {
      arrowHideTimer = setTimeout(function() {
        arrows.forEach(function(el) { el.classList.add('arrow-hidden'); });
      }, 1500);
    } else {
      // ensure there's no pending timer on mobile
      arrowHideTimer = null;
    }
  }

  // show arrows on any user interaction
  ['mousemove', 'touchstart', 'keydown', 'click'].forEach(function(evt) {
    window.addEventListener(evt, showArrows, { passive: true });
  });

  // Ensure arrows are visible when the book is opened
  showArrows();
  const body = document.body;

  // Lazy-loading helper: use IntersectionObserver to defer loading large images
  function initLazyLoading() {
    const lazyImgs = Array.from(document.querySelectorAll('img.lazy'));
    const lazyPictures = Array.from(document.querySelectorAll('picture[data-lazy]'));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          const node = entry.target;
          // handle <img class="lazy">
          if (node.tagName && node.tagName.toLowerCase() === 'img') {
            const img = node;
            const src = img.getAttribute('data-src');
            if (src) img.src = src;
            img.addEventListener('load', function onload() {
              img.classList.add('loaded');
              img.removeEventListener('load', onload);
            });
            io.unobserve(img);
            return;
          }
          // handle <picture data-lazy> where <source> children have data-srcset
          if (node.tagName && node.tagName.toLowerCase() === 'picture') {
            const pic = node;
            const sources = pic.querySelectorAll('source[data-srcset]');
            sources.forEach(s => {
              const ss = s.getAttribute('data-srcset');
              if (ss) s.srcset = ss;
            });
            const img = pic.querySelector('img.lazy');
            if (img) {
              const src = img.getAttribute('data-src');
              if (src) img.src = src;
              img.addEventListener('load', function onload() {
                img.classList.add('loaded');
                img.removeEventListener('load', onload);
              });
            }
            io.unobserve(pic);
            return;
          }
        });
      }, { root: null, rootMargin: '200px 0px', threshold: 0.01 });

      lazyImgs.forEach(function(img) { io.observe(img); });
      lazyPictures.forEach(function(pic) { io.observe(pic); });
    } else {
      // Fallback: load immediately
      lazyImgs.forEach(function(img) {
        const src = img.getAttribute('data-src');
        if (src) img.src = src;
        img.classList.add('loaded');
      });
      lazyPictures.forEach(function(pic) {
        const sources = pic.querySelectorAll('source[data-srcset]');
        sources.forEach(s => { const ss = s.getAttribute('data-srcset'); if (ss) s.srcset = ss; });
        const img = pic.querySelector('img.lazy');
        if (img) { const src = img.getAttribute('data-src'); if (src) img.src = src; img.classList.add('loaded'); }
      });
    }
  }

  // initialize lazy loading after a short delay so initial layout isn't blocked
  setTimeout(initLazyLoading, 120);

  // Force-reveal pictures inside a container by copying data-srcset/data-src into real attributes
  // Useful when dynamic UI (like opening a book) should immediately display images without
  // waiting for IntersectionObserver.
  function revealPicturesIn(container) {
    if (!container) return;
    const pics = Array.from(container.querySelectorAll('picture[data-lazy]'));
    pics.forEach(pic => {
      try {
        const sources = pic.querySelectorAll('source[data-srcset]');
        sources.forEach(s => {
          const ss = s.getAttribute('data-srcset');
          if (ss) s.srcset = ss;
        });
        const img = pic.querySelector('img.lazy');
        if (img) {
          const src = img.getAttribute('data-src');
          if (src) img.src = src;
          img.classList.add('loaded');
        }
      } catch (e) { /* ignore per-image errors */ }
    });
  }

  // Position fixed arrows vertically centered on the .book element
  function positionFixedArrows() {
    // prefer .book-container (wraps book and controls) so arrows center on the whole flipbook area
    let container = document.querySelector('.book-container');
    if (!container) container = document.querySelector('.book');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    // only position if container is visible/has size
    if (!(rect && rect.height > 8)) return;
    // horizontal offsets: place arrows just inside the container edges
    const inset = 12; // px from container edge
    const leftPos = Math.max(8, rect.left + inset);
    const rightPos = Math.max(8, window.innerWidth - rect.right + inset);

    const map = [
      { id: 'prev-btn', side: 'left', value: leftPos },
      { id: 'prev-btn-mobile', side: 'left', value: leftPos },
      { id: 'next-btn', side: 'right', value: rightPos },
      { id: 'next-btn-mobile', side: 'right', value: rightPos }
    ];

    // Only set left/right (horizontal placement) here. Do not set top so arrows keep a fixed vertical position
    // and do not jump when pages change. Keep them position:fixed so they remain on-screen.
    map.forEach(entry => {
      const el = document.getElementById(entry.id);
      if (!el) return;
      if (entry.side === 'left') {
        el.style.left = entry.value + 'px';
        el.style.right = '';
      } else {
        el.style.right = entry.value + 'px';
        el.style.left = '';
      }
  if (!el.classList.contains('always-visible')) el.classList.add('always-visible');
  el.style.position = 'fixed';
  el.style.zIndex = '10010';
    });
  }
  // No MutationObserver: arrows will not be repositioned on page turns. They will keep their fixed vertical position.

  // call on load and when layout changes
  window.addEventListener('resize', positionFixedArrows);
  window.addEventListener('orientationchange', positionFixedArrows);
  // also call after a short delay on DOMContentLoaded to ensure layout is settled
  setTimeout(positionFixedArrows, 250);

  // COVER LOGIC
  if (
    body.classList.contains('projects-page') &&
    document.getElementById('cover-img')
  ) {
    const coverImg = document.getElementById('cover-img');
    const coverContainer = document.getElementById('cover-container');
    const bookContainer = document.querySelector('.book-container');
    const coverNextBtn = document.getElementById('cover-next-btn');

    function showBook() {
      // Reset to first spread
      if (window.page !== undefined) window.page = 0;
      if (window.mobilePage !== undefined) window.mobilePage = 0;
      // hide cover and show book using class toggles so !important CSS rules work
      coverContainer.classList.add('js-hidden');
      if (bookContainer) bookContainer.classList.remove('js-hidden');
      if (window.innerWidth <= 600) {
        document.querySelector('.book-mobile')?.classList.remove('js-hidden');
        document.querySelector('.book-page.first-page')?.classList.add('js-hidden');
        if (typeof updateMobilePage === "function") updateMobilePage();
        addAlwaysVisibleClass();
      } else {
        document.querySelector('.book-mobile')?.classList.add('js-hidden');
        document.querySelector('.book-page.first-page')?.classList.remove('js-hidden');
  // reveal responsive picture sources immediately so the book shows without waiting for IO
  revealPicturesIn(bookContainer);
  if (typeof updatePages === "function") updatePages();
        addAlwaysVisibleClass();
      }
    }

    coverImg.addEventListener('click', showBook);
    coverNextBtn.addEventListener('click', showBook);
  }

  // FLIPBOOK LOGIC (desktop)
  if (
    body.classList.contains('projects-page') &&
    document.getElementById('img-left') &&
    document.getElementById('img-right')
  ) {
    // Desktop images for the flipbook: exclude the cover (cover is separate), start at project1-2
    const images = [
      "images/project1-2.jpg",
      "images/project1-3.jpg",
      "images/project1-4.jpg",
      "images/project1-5.jpg",
      "images/project1-6.jpg",
      "images/project1-7.jpg",
      "images/project1-8.jpg",
      "images/project1-9.jpg",
      "images/project1-10.jpg",
      "images/project1-11.jpg",
      "images/project1-12.jpg",
      "images/project1-13.jpg",
      "images/project1-14.jpg",
      "images/project1-15.jpg",
      "images/project1-16.jpg",
      "images/project1-17.jpg",
      "images/project1-18.jpg",
      "images/project1-19.jpg",
      "images/project1-20.jpg",
      "images/project1-21.jpg",
      "images/project1-22.jpg",
      "images/project1-23.jpg",
      "images/project1-24.jpg",
      "images/project1-25.jpg",
      "images/project1-26.jpg",
      "images/project1-27.jpg",
      "images/project1-28.jpg",
      "images/project1-29.jpg",
      "images/project1-30.jpg",
      "images/project1-31.jpg",
      "images/project1-32.jpg"
    ];
    if (images.length % 2 !== 0) {
      // If there's an odd number of pages, append a blank placeholder instead
      // of duplicating the last image so the final spread doesn't show the
      // same photo on both sides. Use the project's blank.jpg which has
      // resized variants available.
      images.push('images/blank.jpg');
    }

  // Make page variable global for cover logic
  window.page = 0;
  // expose images for delegated handlers
  window.__images__ = images;

    const leftPage = document.getElementById('desktop-left');
    const rightPage = document.getElementById('desktop-right');
    const imgLeft = document.getElementById('img-left');
    const imgRight = document.getElementById('img-right');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const coverContainer = document.getElementById('cover-container');
    const bookContainer = document.querySelector('.book-container');

    function updatePages() {
      // Determine original paths for the current spread
      const leftOrig = images[window.page] || "";
      const rightOrig = images[window.page + 1] || "";
      // Use resized 800px jpg as the primary preload target for speed
      const leftRes = buildResizedSrcs(leftOrig);
      const rightRes = buildResizedSrcs(rightOrig);
      Promise.all([
        preloadImage(leftRes.jpg800 || leftOrig).catch(() => null),
        preloadImage(rightRes.jpg800 || rightOrig).catch(() => null)
      ]).then(() => {
        // If the current img elements are wrapped in <picture>, populate their <source> srcset
        try {
          const leftPic = imgLeft && imgLeft.closest && imgLeft.closest('picture');
          if (leftPic) {
            Array.from(leftPic.querySelectorAll('source')).forEach(s => {
              const t = (s.getAttribute('type') || '').toLowerCase();
              if (t.indexOf('webp') !== -1) s.srcset = leftRes.webpSrcset || '';
              else s.srcset = leftRes.jpgSrcset || '';
            });
          }
        } catch (e) { /* ignore */ }
        try {
          const rightPic = imgRight && imgRight.closest && imgRight.closest('picture');
          if (rightPic) {
            Array.from(rightPic.querySelectorAll('source')).forEach(s => {
              const t = (s.getAttribute('type') || '').toLowerCase();
              if (t.indexOf('webp') !== -1) s.srcset = rightRes.webpSrcset || '';
              else s.srcset = rightRes.jpgSrcset || '';
            });
          }
        } catch (e) { /* ignore */ }

        // Assign the 800px fallback to the <img> so browser chooses best source from srcset
        if (imgLeft) imgLeft.src = leftRes.jpg800 || leftOrig;
        if (imgRight) imgRight.src = rightRes.jpg800 || rightOrig;

        // mark double-spread on container for styling (arrows contrast)
        const bc = document.querySelector('.book-container');
        if (bc) bc.classList.add('double-spread');

        // Update desktop next button label when on final spread
        try {
          var nextBtnEl = document.getElementById('next-btn');
          var isLastSpread = (window.page >= images.length - 2);
          if (nextBtnEl) {
            nextBtnEl.innerHTML = isLastSpread ? 'continue to first page &gt;' : '&gt;';
            nextBtnEl.setAttribute('aria-label', isLastSpread ? 'Continue to first page' : 'Next page');
            if (isLastSpread) nextBtnEl.classList.add('end-loop'); else nextBtnEl.classList.remove('end-loop');
          }
        } catch (e) { /* ignore */ }

        // preload previous and next spreads for snappier page turns (fire-and-forget)
        preloadRange(images, window.page - 2, window.page + 3);
      }).catch(() => {
        // fallback: assign original paths directly
        imgLeft.src = leftOrig;
        imgRight.src = rightOrig;
      });
    }

    // Remove page click navigation for desktop

    prevBtn.addEventListener('click', function() {
      // If on first spread, go back to cover
      if (window.page === 0) {
  if (bookContainer) bookContainer.classList.add('js-hidden');
  if (coverContainer) coverContainer.classList.remove('js-hidden');
  // remove double-spread styling when returning to cover
  const bc = document.querySelector('.book-container');
  if (bc) bc.classList.remove('double-spread');
      } else if (window.page > 0) {
        window.page -= 2;
        updatePages();
      }
      prevBtn.blur();
    });

    nextBtn.addEventListener('click', function() {
      if (window.page < images.length - 2) {
        window.page += 2;
      } else {
        // Loop to the first spread when at the end
        window.page = 0;
      }
      updatePages();
      nextBtn.blur();
    });

    // Only initialize book if bookContainer is visible (we use .js-hidden to toggle)
    if (bookContainer && !bookContainer.classList.contains('js-hidden')) {
      updatePages();
    }

    // Also update pages when entering book mode
    if (document.getElementById('cover-img')) {
      document.getElementById('cover-img').addEventListener('click', function() {
        window.page = 0;
        updatePages();
      });
    }
    if (document.getElementById('cover-next-btn')) {
      document.getElementById('cover-next-btn').addEventListener('click', function() {
        window.page = 0;
        updatePages();
      });
    }
  }

  // Mobile flipbook is handled by setupMobileFlipbook() above.
  // Removed duplicated mobile flipbook block to avoid duplicate bindings and inconsistent logic.

  // ...book navigation handled in flipbook blocks above (avoid duplicate bindings)

  // Make project grid items clickable
  document.querySelectorAll('.project-item[data-link]').forEach(function(item) {
    item.addEventListener('click', function() {
      const link = item.getAttribute('data-link');
      if (link) {
        window.location.href = link;
      }
    });
  });

  // Blur any arrow buttons after touchend/click to avoid persistent focus state on mobile
  ['touchend', 'pointerup', 'click'].forEach(function(evt) {
    document.addEventListener(evt, function(e) {
      // If an arrow was interacted with, blur it to remove focus ring but do NOT set inline styles.
      var closest = typeof e.target.closest === 'function' && e.target.closest('.book-arrow');
      if (closest) {
        try { closest.blur(); } catch (err) { /* ignore */ }
        // Ensure arrows are visible briefly after interaction so users see feedback
        if (typeof showArrows === 'function') showArrows();
      }
    }, { passive: true });
  });

  // Ensure mobile-specific arrow touch handlers trigger navigation reliably
  (function() {
    var prevBtnMobile = document.getElementById('prev-btn-mobile');
    var nextBtnMobile = document.getElementById('next-btn-mobile');
    if (prevBtnMobile) {
      prevBtnMobile.addEventListener('touchend', function(e) {
        // prevent double events on some browsers; trigger the button's click handler
        e.preventDefault();
        prevBtnMobile.click();
        try { prevBtnMobile.blur(); } catch (err) {}
        if (typeof showArrows === 'function') showArrows();
      }, { passive: false });
    }
    if (nextBtnMobile) {
      nextBtnMobile.addEventListener('touchend', function(e) {
        e.preventDefault();
        nextBtnMobile.click();
        try { nextBtnMobile.blur(); } catch (err) {}
        if (typeof showArrows === 'function') showArrows();
      }, { passive: false });
    }
  })();

  // Make site-name clickable and link to index.html on all pages
  var siteName = document.querySelector('.site-name');
  if (siteName && siteName.tagName.toLowerCase() !== 'a') {
    var link = document.createElement('a');
    link.href = 'index.html';
    link.className = siteName.className;
    link.textContent = siteName.textContent;
    siteName.replaceWith(link);
  }

  // Delegated click handler for all book-arrow buttons to ensure navigation works
  document.addEventListener('click', function(e) {
    var btn = e.target.closest && e.target.closest('.book-arrow');
    if (!btn) return;
    // prevent duplicate handling
    e.stopPropagation();
    e.preventDefault();
    // mobile handlers
    if (btn.id === 'prev-btn-mobile' || btn.id === 'next-btn-mobile') {
      if (typeof goPrev === 'function' && typeof goNext === 'function') {
        if (btn.id === 'prev-btn-mobile') goPrev(); else goNext();
        try { btn.blur(); } catch (err) {}
        return;
      }
    }
    // desktop handlers
    if (btn.id === 'prev-btn' || btn.id === 'next-btn' || btn.id === 'cover-next-btn' || btn.id === 'cover-next-btn') {
      // cover-next behaves like next: open book
      if (btn.id === 'cover-next-btn') {
        if (typeof showBook === 'function') { showBook(); try { btn.blur(); } catch (err) {} return; }
      }
      // if desktop page handlers exist, use them
      if (typeof updatePages === 'function') {
        if (btn.id === 'prev-btn') {
          if (window.page === 0) {
            // go back to cover
            var bc = document.querySelector('.book-container');
            if (bc) bc.classList.add('js-hidden');
            var cc = document.getElementById('cover-container');
            if (cc) cc.classList.remove('js-hidden');
            var bcc = document.querySelector('.book-container'); if (bcc) bcc.classList.remove('double-spread');
          } else {
            window.page = Math.max(0, window.page - 2);
            updatePages();
          }
          try { btn.blur(); } catch (err) {}
          return;
        }
        if (btn.id === 'next-btn') {
          if (window.page < (Array.isArray(window.__images__) ? window.__images__.length - 2 : 9999)) {
            window.page = Math.min((Array.isArray(window.__images__) ? window.__images__.length - 2 : 9999), window.page + 2);
          } else {
            // At the end: loop back to the first spread
            window.page = 0;
          }
          updatePages();
          try { btn.blur(); } catch (err) {}
          return;
        }
      }
    }
  }, true);


    window.addEventListener('DOMContentLoaded', () => {
      if (isMobile()) {
          // hide the cover on mobile; blank page no longer exists
          document.querySelector('.cover-page')?.classList.add('hidden');
          document.querySelector('.first-page')?.classList.remove('hidden');
      }
    });
  });