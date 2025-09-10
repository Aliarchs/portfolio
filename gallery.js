document.addEventListener('DOMContentLoaded', function() {
  // Slideshow logic
  const slideshowImages = [
    "images/project2-1.png",
    "images/project2-2.png",
    "images/project2-3.png"
    // Add more images as needed
  ];
  let slideIndex = 0;
  const slideshowImg = document.querySelector('.slideshow-image');
  const prevBtn = document.querySelector('.slideshow-arrow.prev');
  const nextBtn = document.querySelector('.slideshow-arrow.next');

  function showSlide(idx) {
    slideIndex = (idx + slideshowImages.length) % slideshowImages.length;
    slideshowImg.src = slideshowImages[slideIndex];
    slideshowImg.alt = "Project 2 Slide " + (slideIndex + 1);
  }

  function nextSlide() {
    showSlide(slideIndex + 1);
  }

  function prevSlide() {
    showSlide(slideIndex - 1);
  }

  prevBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    prevSlide();
    resetTimer();
    prevBtn.blur(); // Remove focus after click
  });
  nextBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    nextSlide();
    resetTimer();
    nextBtn.blur(); // Remove focus after click
  });

  // Auto-advance every 7 seconds
  let slideshowTimer = setInterval(nextSlide, 7000);

  function resetTimer() {
    clearInterval(slideshowTimer);
    slideshowTimer = setInterval(nextSlide, 7000);
  }

  showSlide(0);

  // Lightbox logic for gallery
  const galleryImgs = document.querySelectorAll('.gallery img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.querySelector('.lightbox-img');
  const lightboxClose = document.querySelector('.lightbox-close');

  galleryImgs.forEach(img => {
    img.addEventListener('click', () => {
  // open lightbox: use classes to avoid inline styles and manage aria
  lightbox.classList.remove('js-hidden');
  lightbox.setAttribute('aria-hidden', 'false');
  lightboxClose.classList.remove('js-hidden');
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  document.querySelector('.gallery').classList.add('lightbox-active');
  // save opener to restore focus when closed
  lightbox._opener = img;
      // focus the close button for immediate keyboard access
      try { lightboxClose.focus(); } catch (e) { lightbox.focus(); }
      // install focus trap
      function trapFocus(e) {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(lightbox.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      lightbox._trap = trapFocus;
      lightbox.addEventListener('keydown', trapFocus);
    });
  });

  function closeLightbox() {
  lightbox.classList.add('js-hidden');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxClose.classList.add('js-hidden');
  lightboxImg.src = '';
  lightboxImg.alt = '';
  document.querySelector('.gallery').classList.remove('lightbox-active');
  // restore focus to opener if available
  try { if (lightbox._opener) lightbox._opener.focus(); } catch (e) {}
    // remove focus trap
    try {
      if (lightbox._trap) lightbox.removeEventListener('keydown', lightbox._trap);
      delete lightbox._trap;
    } catch (e) {}
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (!lightbox.classList.contains('js-hidden') && (e.key === 'Escape' || e.key === 'Esc')) {
      closeLightbox();
    }
  });
});