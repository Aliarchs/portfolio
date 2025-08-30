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

  // Mobile flipbook logic: single page in portrait, double spread in landscape
  function setupMobileFlipbook() {
    // Run mobile flipbook logic whenever the mobile flipbook markup exists.
    // Don't rely only on viewport width because some phones in landscape can be wider than 600px.
    if (!document.getElementById('img-mobile-portrait') && !document.getElementById('img-mobile-left')) return;
    // Images array: project1-1.jpg to project1-32.jpg
    const images = [];
    for (let i = 1; i <= 32; i++) {
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
          imgMobilePortrait.src = images[window.mobilePage];
        }
        if (mobileLandscape) mobileLandscape.style.display = 'none';
        // remove double-spread styling when in portrait
        if (bc) bc.classList.remove('double-spread');
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
          if (imgMobileLeft) imgMobileLeft.src = images[leftIdx];
          if (imgMobileRight) imgMobileRight.src = images[rightIdx];
          // add double-spread styling when showing two pages
          if (bc) bc.classList.add('double-spread');
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

    if (prevBtnMobile) prevBtnMobile.onclick = goPrev;
    if (nextBtnMobile) nextBtnMobile.onclick = goNext;
    // Also listen for touchend to ensure taps trigger navigation on devices that don't emit click reliably
    if (prevBtnMobile && prevBtnMobile.addEventListener) {
      prevBtnMobile.addEventListener('touchend', function(e) {
        e.preventDefault && e.preventDefault();
        goPrev();
      }, { passive: false });
    }
    if (nextBtnMobile && nextBtnMobile.addEventListener) {
      nextBtnMobile.addEventListener('touchend', function(e) {
        e.preventDefault && e.preventDefault();
        goNext();
      }, { passive: false });
    }

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
  
  // Ensure arrow buttons use the always-visible class so CSS will keep them on-screen
  function addAlwaysVisibleClass() {
    ['prev-btn', 'next-btn', 'prev-btn-mobile', 'next-btn-mobile'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('always-visible')) el.classList.add('always-visible');
    });
    // Also mark any .book-arrow elements if needed
    document.querySelectorAll('.book-arrow').forEach(function(b) {
      if (!b.classList.contains('always-visible')) b.classList.add('always-visible');
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
      coverContainer.style.display = 'none';
      bookContainer.style.display = 'block';
      if (window.innerWidth <= 600) {
        document.querySelector('.book-mobile').style.display = 'block';
        document.querySelector('.book-page.first-page').style.display = 'none';
  if (typeof updateMobilePage === "function") updateMobilePage();
  // ensure arrows are visible
  addAlwaysVisibleClass();
      } else {
        document.querySelector('.book-mobile').style.display = 'none';
        document.querySelector('.book-page.first-page').style.display = 'block';
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
    const images = [
      "images/blank.jpg",        // blank left page at start
      "images/project1-2.jpg",   // first real page
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
      "images/project1-32.jpg"   // last page!
    ];
    if (images.length % 2 !== 0) {
      images.push("images/blank.jpg");
    }

    // Make page variable global for cover logic
    window.page = 0;

    const leftPage = document.getElementById('desktop-left');
    const rightPage = document.getElementById('desktop-right');
    const imgLeft = document.getElementById('img-left');
    const imgRight = document.getElementById('img-right');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const coverContainer = document.getElementById('cover-container');
    const bookContainer = document.querySelector('.book-container');

    function updatePages() {
  imgLeft.src = images[window.page] || "";
  imgRight.src = images[window.page + 1] || "";
  // mark double-spread on container for styling (arrows contrast)
  const bc = document.querySelector('.book-container');
  if (bc) bc.classList.add('double-spread');
    }

    // Remove page click navigation for desktop

    prevBtn.addEventListener('click', function() {
      // If on first spread, go back to cover
      if (window.page === 0) {
  bookContainer.style.display = 'none';
  coverContainer.style.display = 'block';
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
        updatePages();
      }
      nextBtn.blur();
    });

    // Only initialize book if bookContainer is visible
    if (bookContainer && bookContainer.style.display !== 'none') {
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
    window.addEventListener(evt, function(e) {
      // normalize target: if a text node was tapped, use its parentElement
      let node = e.target;
      if (node && node.nodeType === 3) node = node.parentElement;
      let btn = null;
      try {
        if (node && typeof node.closest === 'function') btn = node.closest('.book-arrow');
      } catch (err) {
        btn = null;
      }
      if (btn) {
        try {
          btn.blur();
        } catch (err) {}
        // Force resting visual styles inline to override any platform tap flash
        try {
          btn.style.background = 'rgba(0,0,0,0.42)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'rgba(255,255,255,0.18)';
          btn.style.outline = 'none';
        } catch (err) {}
      }
    }, { passive: true });
  });

  // Make site-name clickable and link to index.html on all pages
  var siteName = document.querySelector('.site-name');
  if (siteName && siteName.tagName.toLowerCase() !== 'a') {
    var link = document.createElement('a');
    link.href = 'index.html';
    link.className = siteName.className;
    link.textContent = siteName.textContent;
    siteName.replaceWith(link);
  }


    window.addEventListener('DOMContentLoaded', () => {
      if (isMobile()) {
          ['cover-page', 'blank-page'].forEach(cls => {
              document.querySelector(`.${cls}`)?.classList.add('hidden');
          });
          document.querySelector('.first-page')?.classList.remove('hidden');
      } else {
        // Desktop logic (unchanged)
      }
    });
  });