document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  /* LANDING PAGE */
  if (body.classList.contains('landing')) {
    const headings = [...document.querySelectorAll('.landing-heading')];
    const delay = 1000;

    headings.forEach((h, i) => {
      setTimeout(() => {
        h.animate(
          [
            { transform: 'scale(1)' },
            { transform: `scale(${getComputedStyle(document.documentElement)
              .getPropertyValue('--heading-scale')})` },
            { transform: 'scale(1)' }
          ],
          { duration: delay, fill: 'forwards' }
        );
      }, i * delay);

      h.addEventListener('click', () => {
        const key = h.textContent.trim().toLowerCase();
        if (key === 'projects') location.href = 'projects.html';
        else if (key === 'about') location.href = 'about.html';
        else if (key === 'contact') location.href = 'contact.html';
        else location.href = 'index.html';
      });
    });
  }

  /* SITE-NAME → HOME */
  document.querySelectorAll('.site-name').forEach(el =>
    el.addEventListener('click', () => {
      location.href = 'index.html';
    })
  );

  /* PROJECTS PAGE */
  if (body.classList.contains('projects-page')) {
    const items = [...document.querySelectorAll('.project-item')];

    // Use matchMedia for reliable mobile detection.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      // On mobile, only attach a simple click event for navigation; no animations.
      items.forEach(item => {
        item.addEventListener('click', () => {
          location.href = item.dataset.link;
        });
      });
      return; // Do not initialize desktop interactions on mobile.
    }

    // Desktop-only interactions:
    const gravityDur = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--gravity-duration')
    ) * 1000;
    const tol = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--drag-tolerance'), 10
    );
    let gravityDropped = false;

    // Gravity effect: Triggered only on SHIFT + click.
    const triggerDrop = () => {
      gravityDropped = true;
      items.forEach((item, idx) => {
        const anim = item.animate(
          [
            { transform: 'translateY(0)' },
            { transform: 'translateY(200vh)' }
          ],
          {
            duration: gravityDur,
            easing: 'ease-in',
            fill: 'both',
            delay: idx * 50
          }
        );
        anim.onfinish = () => {
          item.style.transform = 'translateY(200vh)';
        };
      });
    };

    // Reset: When the user releases the SHIFT key.
    const triggerReset = () => {
      gravityDropped = false;
      items.forEach((item, idx) => {
        const anim = item.animate(
          [
            { transform: 'translateY(200vh)' },
            { transform: 'translateY(0)' }
          ],
          {
            duration: gravityDur,
            easing: 'ease-out',
            fill: 'both',
            delay: idx * 50
          }
        );
        anim.onfinish = () => {
          item.style.transform = '';
        };
      });
    };

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift' && gravityDropped) {
        triggerReset();
      }
    });

    items.forEach(item => {
      /* Hover preview/title (desktop only) */
      item.addEventListener('mouseenter', () => {
        const preview = item.querySelector('.preview');
        const title = item.querySelector('.title');
        if (preview && title) {
          preview.style.display = 'flex';
          title.style.display = 'flex';
        }
      });
      item.addEventListener('mouseleave', () => {
        const preview = item.querySelector('.preview');
        const title = item.querySelector('.title');
        if (preview && title) {
          preview.style.display = 'none';
          title.style.display = 'none';
        }
      });

      /* Click event on a project box: 
         - If the user holds SHIFT while clicking, trigger the gravity drop.
         - Otherwise, navigate to the project page.
      */
      item.addEventListener('click', (e) => {
        if (e.shiftKey) {
          triggerDrop();
        } else if (!item.isDragging) {
          location.href = item.dataset.link;
        }
      });

      /* Desktop drag logic */
      item.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return; // Do nothing for touch input

        e.preventDefault();
        const rect = item.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;

        item.setPointerCapture(e.pointerId);
        item.style.position = 'fixed';
        item.style.zIndex = 1000;
        item.style.width = `${rect.width}px`;
        item.style.height = `${rect.height}px`;
        item.style.left = `${rect.left}px`;
        item.style.top = `${rect.top}px`;

        let isDragging = false;
        item.isDragging = false;

        const onPointerMove = (ev) => {
          const dx = ev.clientX - (rect.left + offsetX);
          const dy = ev.clientY - (rect.top + offsetY);
          if (!isDragging && Math.hypot(dx, dy) > tol) {
            isDragging = true;
            item.isDragging = true;
          }
          if (isDragging) {
            item.style.left = `${ev.clientX - offsetX}px`;
            item.style.top = `${ev.clientY - offsetY}px`;
          }
        };

        const onPointerUp = (ev) => {
          item.releasePointerCapture(ev.pointerId);
          document.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('pointerup', onPointerUp);
          setTimeout(() => {
            item.isDragging = false;
          }, 0);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
      });
    });
  }

  function showSinglePage(idx) {
    document.getElementById('img-single').src = images[idx];
    document.getElementById('label-single').textContent = idx + 1;
  }
  let singlePageIdx = 0;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  if (isMobile) {
    showSinglePage(singlePageIdx);
    const singlePage = document.getElementById('mobile-single');
    let touchStartX = null;
    singlePage.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    });
    singlePage.addEventListener('touchend', e => {
      if (touchStartX === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      if (touchEndX < touchStartX - 30 && singlePageIdx < images.length - 1) {
        singlePageIdx++;
        showSinglePage(singlePageIdx);
      } else if (touchEndX > touchStartX + 30 && singlePageIdx > 0) {
        singlePageIdx--;
        showSinglePage(singlePageIdx);
      }
      touchStartX = null;
    });
  }
});
