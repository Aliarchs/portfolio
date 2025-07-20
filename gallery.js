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
      lightbox.style.display = 'flex';
      lightboxClose.style.display = 'block';
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      document.querySelector('.gallery').classList.add('lightbox-active');
      lightbox.focus();
    });
  });

  function closeLightbox() {
    lightbox.style.display = 'none';
    lightboxClose.style.display = 'none';
    lightboxImg.src = '';
    lightboxImg.alt = '';
    document.querySelector('.gallery').classList.remove('lightbox-active');
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (lightbox.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
      closeLightbox();
    }
  });
});