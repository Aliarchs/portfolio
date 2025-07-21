document.addEventListener('DOMContentLoaded', function() {

  // Helper to detect mobile
  function isMobile() {
    return window.innerWidth <= 600;
  }

  // Mobile flipbook logic: single page in portrait, double spread in landscape
  function setupMobileFlipbook() {
    if (!isMobile() || (!document.getElementById('img-mobile-portrait') && !document.getElementById('img-mobile-left'))) return;
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
      if (isPortrait()) {
        // Portrait: show single image
        if (imgMobilePortrait) {
          imgMobilePortrait.style.display = 'block';
          if (window.mobilePage < 0) window.mobilePage = 0;
          if (window.mobilePage > 30) window.mobilePage = 30;
          imgMobilePortrait.src = images[window.mobilePage];
        }
        if (mobileLandscape) mobileLandscape.style.display = 'none';
      } else {
        // Landscape: show two images side by side
        if (imgMobilePortrait) imgMobilePortrait.style.display = 'none';
        if (mobileLandscape) {
          mobileLandscape.style.display = 'flex';
          let leftIdx = window.mobilePage;
          let rightIdx = window.mobilePage + 1;
          if (leftIdx < 0) leftIdx = 0;
          if (rightIdx > 31) rightIdx = 31;
          if (imgMobileLeft) imgMobileLeft.src = images[leftIdx];
          if (imgMobileRight) imgMobileRight.src = images[rightIdx];
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
    }
    function goNext() {
      if (isPortrait()) {
        window.mobilePage = Math.min(30, window.mobilePage + 1);
      } else {
        window.mobilePage = Math.min(30, window.mobilePage + 2);
      }
      updateMobilePage();
    }

    if (prevBtnMobile) prevBtnMobile.onclick = goPrev;
    if (nextBtnMobile) nextBtnMobile.onclick = goNext;

    // Swipe logic for mobile (both orientations)
    // ...existing code...

    function handleSwipe() {
      if (touchStartX === null || touchEndX === null) return;
      const dx = touchEndX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) {
          goNext(); // swipe left
        } else {
          goPrev(); // swipe right
        }
      }
      touchStartX = null;
      touchEndX = null;
    }

    document.addEventListener('touchstart', function(e) {
      if (!isMobile()) return;
      touchStartX = e.touches[0].clientX;
    });
    document.addEventListener('touchmove', function(e) {
      if (!isMobile()) return;
      touchEndX = e.touches[0].clientX;
    });
    document.addEventListener('touchend', function(e) {
      if (!isMobile()) return;
      handleSwipe();
    });

    // Navigation logic (arrow buttons below)
    function goPrev() {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      if (window.mobilePage === 0) {
        bookContainer.style.display = 'none';
        coverContainer.style.display = 'block';
      } else if (window.mobilePage > 0) {
        if (isPortrait) {
          window.mobilePage -= 1;
        } else {
          window.mobilePage -= 2;
          if (window.mobilePage < 0) window.mobilePage = 0;
        }
        updateMobilePage();
      }
      if (prevBtnMobile) prevBtnMobile.blur();
    }
    function goNext() {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      if (isPortrait) {
        if (window.mobilePage < images.length - 1) {
          window.mobilePage += 1;
          updateMobilePage();
        }
      } else {
        // Landscape: advance by 2 (pair)
        if (window.mobilePage < images.length - 2) {
          window.mobilePage += 2;
          updateMobilePage();
        }
      }
      if (nextBtnMobile) nextBtnMobile.blur();
    }

    if (prevBtnMobile) prevBtnMobile.addEventListener('click', goPrev);
    if (nextBtnMobile) nextBtnMobile.addEventListener('click', goNext);

    // Block page click navigation for mobile only
    if (isMobile()) {
      document.querySelectorAll('.page').forEach(function(page) {
        page.onclick = null;
        page.style.pointerEvents = 'none';
      });
    }

    // Swipe logic for mobile (both orientations)
    let touchStartX = null;
    let touchEndX = null;

    function handleSwipe() {
      if (touchStartX === null || touchEndX === null) return;
      const deltaX = touchEndX - touchStartX;
      if (Math.abs(deltaX) < 50) return; // Minimum swipe distance
      // Only advance one page/spread per swipe event
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      if (deltaX > 0) {
        goPrev();
      } else if (deltaX < 0) {
        goNext();
      }
    }

    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchEndX = null;
      }
    });

    document.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    });

    document.addEventListener('touchend', function(e) {
      handleSwipe();
      touchStartX = null;
      touchEndX = null;
    });

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
      setTimeout(updateMobilePage, 300);
    });
  }

  // Run mobile flipbook logic on load and on resize
  setupMobileFlipbook();
  window.addEventListener('resize', setupMobileFlipbook);
  const body = document.body;

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
      } else {
        document.querySelector('.book-mobile').style.display = 'none';
        document.querySelector('.book-page.first-page').style.display = 'block';
        if (typeof updatePages === "function") updatePages();
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
    }

    leftPage.addEventListener('click', function() {
      if (window.page > 0) {
        window.page -= 2;
        updatePages();
      }
    });

    rightPage.addEventListener('click', function() {
      if (window.page < images.length - 2) {
        window.page += 2;
        updatePages();
      }
    });

    prevBtn.addEventListener('click', function() {
      // If on first spread, go back to cover
      if (window.page === 0) {
        bookContainer.style.display = 'none';
        coverContainer.style.display = 'block';
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

  // FLIPBOOK LOGIC (mobile and mobile landscape)
  if (
    body.classList.contains('projects-page') &&
    window.innerWidth <= 600 &&
    (document.getElementById('img-mobile'))
  ) {
    const images = [
      "images/project1-1.jpg",   // cover
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
    window.mobilePage = window.mobilePage || 0;

    const imgMobile = document.getElementById('img-mobile');
    const prevBtnMobile = document.getElementById('prev-btn-mobile');
    const nextBtnMobile = document.getElementById('next-btn-mobile');
    const coverContainer = document.getElementById('cover-container');
    const bookContainer = document.querySelector('.book-container');
    const leftPage = document.getElementById('desktop-left');
    const rightPage = document.getElementById('desktop-right');
    const imgLeft = document.getElementById('img-left');
    const imgRight = document.getElementById('img-right');

    function updateMobilePage() {
      if (imgMobile) {
        imgMobile.src = images[window.mobilePage] || "";
      }
      // For landscape double spread, show two pages
      if (imgLeft && imgRight) {
        imgLeft.src = images[window.mobilePage] || "";
        imgRight.src = images[window.mobilePage + 1] || "";
      }
    }

    // Navigation logic (arrow buttons below)
    function goPrev() {
      if (window.mobilePage === 0) {
        bookContainer.style.display = 'none';
        coverContainer.style.display = 'block';
      } else if (window.mobilePage > 0) {
        window.mobilePage -= 1;
        updateMobilePage();
      }
      if (prevBtnMobile) prevBtnMobile.blur();
    }
    function goNext() {
      if (window.mobilePage < images.length - 1) {
        window.mobilePage += 1;
        updateMobilePage();
      }
      if (nextBtnMobile) nextBtnMobile.blur();
    }

    if (prevBtnMobile) prevBtnMobile.addEventListener('click', goPrev);
    if (nextBtnMobile) nextBtnMobile.addEventListener('click', goNext);

    // Block page click navigation for mobile only
    document.querySelectorAll('.page').forEach(function(page) {
      page.onclick = null;
      page.style.pointerEvents = 'none';
    });

    // Swipe logic for mobile and mobile landscape
    let touchStartX = null;
    let touchEndX = null;

    function handleSwipe() {
      if (touchStartX === null || touchEndX === null) return;
      const deltaX = touchEndX - touchStartX;
      if (Math.abs(deltaX) < 50) return; // Minimum swipe distance
      if (deltaX > 0) {
        goPrev();
      } else {
        goNext();
      }
    }

    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchEndX = null;
      }
    });

    document.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1) {
        touchEndX = e.touches[0].clientX;
      }
    });

    document.addEventListener('touchend', function(e) {
      handleSwipe();
      touchStartX = null;
      touchEndX = null;
    });

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
    function updateFlipbookLayout() {
      const isPortrait = window.matchMedia('(orientation: portrait)').matches;
      const bookMobile = document.querySelector('.book-mobile');
      const bookPage = document.querySelector('.book-page.first-page');
      if (isPortrait) {
        if (bookMobile) bookMobile.style.display = 'block';
        if (bookPage) bookPage.style.display = 'none';
      } else {
        if (bookMobile) bookMobile.style.display = 'none';
        if (bookPage) bookPage.style.display = 'block';
      }
      updateMobilePage();
    }

    window.addEventListener('orientationchange', function() {
      setTimeout(updateFlipbookLayout, 300);
    });

    // Initial layout update on load
    updateFlipbookLayout();
  }

  // Book navigation logic for project1.html
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const coverNextBtn = document.getElementById('cover-next-btn');

  // Desktop navigation functions
  function goToPrevPage() {
    const bookContainer = document.querySelector('.book-container');
    const coverContainer = document.getElementById('cover-container');
    if (window.page === 0) {
      bookContainer.style.display = 'none';
      coverContainer.style.display = 'block';
    } else if (window.page > 0) {
      window.page -= 2;
      if (typeof updatePages === "function") updatePages();
    }
  }

  function goToNextPage() {
    const images = [
      "images/blank.jpg", "images/project1-2.jpg", "images/project1-3.jpg", "images/project1-4.jpg", "images/project1-5.jpg", "images/project1-6.jpg", "images/project1-7.jpg", "images/project1-8.jpg", "images/project1-9.jpg", "images/project1-10.jpg", "images/project1-11.jpg", "images/project1-12.jpg", "images/project1-13.jpg", "images/project1-14.jpg", "images/project1-15.jpg", "images/project1-16.jpg", "images/project1-17.jpg", "images/project1-18.jpg", "images/project1-19.jpg", "images/project1-20.jpg", "images/project1-21.jpg", "images/project1-22.jpg", "images/project1-23.jpg", "images/project1-24.jpg", "images/project1-25.jpg", "images/project1-26.jpg", "images/project1-27.jpg", "images/project1-28.jpg", "images/project1-29.jpg", "images/project1-30.jpg", "images/project1-31.jpg", "images/project1-32.jpg"
    ];
    if (window.page < images.length - 2) {
      window.page += 2;
      if (typeof updatePages === "function") updatePages();
    }
  }

  // Accessibility: allow keyboard navigation and focus feedback
  [prevBtn, nextBtn, coverNextBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      btn.blur(); // Remove focus after click for mouse users
    });
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        btn.click();
      }
    });
    btn.setAttribute('tabindex', '0'); // Ensure focusable
    btn.setAttribute('aria-label', btn.textContent.trim() === '>' ? 'Next page' : 'Previous page');
  });

  if (prevBtn) prevBtn.addEventListener('click', goToPrevPage);
  if (nextBtn) nextBtn.addEventListener('click', goToNextPage);
  if (coverNextBtn) coverNextBtn.addEventListener('click', goToNextPage);

  // Make project grid items clickable
  document.querySelectorAll('.project-item[data-link]').forEach(function(item) {
    item.addEventListener('click', function() {
      const link = item.getAttribute('data-link');
      if (link) {
        window.location.href = link;
      }
    });
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
