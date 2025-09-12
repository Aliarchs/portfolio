document.addEventListener('DOMContentLoaded', function() {
  // Get current page context to determine which images to use
  const isProject2 = window.location.pathname.includes('project2');
  const isProject3 = window.location.pathname.includes('project3');
  const isProject4 = window.location.pathname.includes('project4');
  const isProject5 = window.location.pathname.includes('project5');
  
  // Define image sets per project
  let slideshowImages = [];
  let projectName = '';
  
  if (isProject2) {
    slideshowImages = [
      "images/resized/1200/project2-1.png",
      "images/resized/1200/project2-2.png",
      "images/resized/1200/project2-3.png"
    ];
    projectName = 'Project 2';
  } else if (isProject3) {
    slideshowImages = [
      "images/resized/1200/blank.jpg"  // Placeholder until you add real images
    ];
    projectName = 'Project 3';
  } else if (isProject4) {
    slideshowImages = [
      "images/resized/1200/blank.jpg"  // Placeholder until you add real images
    ];
    projectName = 'Project 4';
  } else if (isProject5) {
    slideshowImages = [
      "images/resized/1200/blank.jpg"  // Placeholder until you add real images
    ];
    projectName = 'Project 5';
  }

  // Only initialize slideshow if we have images and slideshow container
  const slideshowImg = document.querySelector('.slideshow-image');
  if (slideshowImg && slideshowImages.length > 0) {
    // Add responsive sources for the slideshow image if it matches our resized pattern
    (function enhanceSlideshowImage(img) {
      const src = img.getAttribute('src') || '';
      const m = src.match(/^images\/resized\/1200\/(.+)\.(jpg|jpeg|png)$/i);
      if (!m) return;
      const base = m[1];
      const ext = m[2].toLowerCase();
      const widths = [400, 800, 1200];
      const srcset = widths.map(w => `images/resized/${w}/${base}.${ext} ${w}w`).join(', ');
      const sizes = '(max-width: 900px) 100vw, 1200px';
      img.setAttribute('srcset', srcset);
      img.setAttribute('sizes', sizes);
      if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
    })(slideshowImg);
    let slideIndex = 0;
    function showSlide(idx) {
      slideIndex = (idx + slideshowImages.length) % slideshowImages.length;
      slideshowImg.src = slideshowImages[slideIndex];
      slideshowImg.alt = projectName + " Slide " + (slideIndex + 1);
    }

    function nextSlide() {
      if (slideshowImages.length > 1) showSlide(slideIndex + 1);
    }

    function prevSlide() {
      if (slideshowImages.length > 1) showSlide(slideIndex - 1);
    }

    // Global functions for onclick handlers
    window.changeSlide = function(direction) {
      if (direction > 0) nextSlide();
      else prevSlide();
      if (resetTimer) resetTimer();
    };

    // Keyboard support on slideshow container
    const slideshowContainer = document.querySelector('.slideshow-container');
    if (slideshowContainer) {
      slideshowContainer.setAttribute('tabindex', '0');
      slideshowContainer.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'ArrowRight') nextSlide();
      });
    }

    // Auto-advance only if multiple images
    let slideshowTimer;
    if (slideshowImages.length > 1) {
      slideshowTimer = setInterval(nextSlide, 7000);
    }

    function resetTimer() {
      if (slideshowTimer) {
        clearInterval(slideshowTimer);
        if (slideshowImages.length > 1) {
          slideshowTimer = setInterval(nextSlide, 7000);
        }
      }
    }

    showSlide(0);
  }

  // Lightbox logic for gallery
  const galleryImgs = document.querySelectorAll('.gallery img');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.querySelector('.lightbox-close');

  if (lightbox && lightboxImg && lightboxClose) {
    // Add srcset/sizes for gallery thumbs and bind open handlers
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
        // Open lightbox
        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        // Save opener to restore focus when closed
        lightbox._opener = img;
        // Focus the close button for immediate keyboard access
        try { lightboxClose.focus(); } catch (e) { lightbox.focus(); }
      });
    });

    // Global function for lightbox navigation
    window.changeLightboxImage = function(direction) {
      const currentSrc = lightboxImg.src;
      const currentIndex = Array.from(galleryImgs).findIndex(img => img.src === currentSrc);
      if (currentIndex !== -1) {
        const newIndex = (currentIndex + direction + galleryImgs.length) % galleryImgs.length;
        const newImg = galleryImgs[newIndex];
        lightboxImg.src = newImg.src;
        lightboxImg.alt = newImg.alt;
      }
    };

    window.closeLightbox = function() {
      lightbox.style.display = 'none';
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.src = '';
      lightboxImg.alt = '';
      // Restore focus to opener if available
      try { if (lightbox._opener) lightbox._opener.focus(); } catch (e) {}
    };

    lightboxClose.addEventListener('click', window.closeLightbox);
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) window.closeLightbox();
    });
    document.addEventListener('keydown', function(e) {
      if (lightbox.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
        window.closeLightbox();
      }
    });
  }
});