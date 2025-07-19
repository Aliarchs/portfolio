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
    const coverNextBtn = document.getElementById('cover-next-btn');

    function showBook() {
      coverContainer.style.display = 'none';
      bookContainer.style.display = 'flex';
      // Reset to first spread
      if (window.page !== undefined) window.page = 0;
      if (typeof updatePages === "function") updatePages();
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

  // Make project grid items clickable
  document.querySelectorAll('.project-item[data-link]').forEach(function(item) {
    item.addEventListener('click', function() {
      const link = item.getAttribute('data-link');
      if (link) {
        window.location.href = link;
      }
    });
  });
});
