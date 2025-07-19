document.addEventListener('DOMContentLoaded', function() {
  const body = document.body;

  // COVER LOGIC
  if (
    body.classList.contains('projects-page') &&
    document.getElementById('cover-img')
  ) {
    const coverImg = document.getElementById('cover-img');
    const coverContainer = document.getElementById('cover-container');
    const bookContainer = document.querySelector('.book-container');

    coverImg.addEventListener('click', function() {
      coverContainer.style.display = 'none';
      bookContainer.style.display = 'flex';
    });
  }

  // FLIPBOOK LOGIC (desktop)
  if (
    body.classList.contains('projects-page') &&
    document.getElementById('img-left') &&
    document.getElementById('img-right')
  ) {
    // Images for book mode: start with blank left page
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
    // If odd number of images, add a blank page to keep spreads
    if (images.length % 2 !== 0) {
      images.push("images/blank.jpg");
    }

    let page = 0; // Always even, left page index

    const leftPage = document.getElementById('desktop-left');
    const rightPage = document.getElementById('desktop-right');
    const imgLeft = document.getElementById('img-left');
    const imgRight = document.getElementById('img-right');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    function updatePages() {
      imgLeft.src = images[page] || "";
      imgRight.src = images[page + 1] || "";
    }

    leftPage.addEventListener('click', function() {
      if (page > 0) {
        page -= 2;
        updatePages();
      }
    });

    rightPage.addEventListener('click', function() {
      if (page < images.length - 2) {
        page += 2;
        updatePages();
      }
    });

    prevBtn.addEventListener('click', function() {
      if (page > 0) {
        page -= 2;
        updatePages();
      }
    });

    nextBtn.addEventListener('click', function() {
      if (page < images.length - 2) {
        page += 2;
        updatePages();
      }
    });

    // Only initialize book if bookContainer is visible
    const bookContainer = document.querySelector('.book-container');
    if (bookContainer && bookContainer.style.display !== 'none') {
      updatePages();
    }

    // Also update pages when entering book mode
    if (document.getElementById('cover-img')) {
      document.getElementById('cover-img').addEventListener('click', function() {
        updatePages();
      });
    }
  }
});
