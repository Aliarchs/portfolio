document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;

  /* LANDING PAGE */
  if (body.classList.contains('landing')) {
    const headings = [...document.querySelectorAll('.landing-heading')];
    const delay = 1000;

    headings.forEach((h, i) => {
      setTimeout(() => {
        h.animate([
          { transform: 'scale(1)' },
          { transform: `scale(${getComputedStyle(document.documentElement)
            .getPropertyValue('--heading-scale')})` },
          { transform: 'scale(1)' }
        ], { duration: delay, fill: 'forwards' });
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
    el.addEventListener('click', () => location.href = 'index.html')
  );

  /* PROJECTS PAGE */
  if (body.classList.contains('projects-page')) {
    const items = [...document.querySelectorAll('.project-item')];
    const isMobile = window.innerWidth <= 768;

    if (isMobile) return; // Disable animations and drag on mobile

    const gravityDur = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--gravity-duration')) * 1000;
    const tol = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--drag-tolerance'), 10);
    let gravityDropped = false;

    const triggerDrop = () => {
      gravityDropped = true;
      items.forEach((item, idx) => {
        const anim = item.animate([
          { transform: 'translateY(0)' },
          { transform: 'translateY(200vh)' }
        ], {
          duration: gravityDur,
          easing: 'ease-in',
          fill: 'both',
          delay: idx * 50
        });
        anim.onfinish = () => item.style.transform = 'translateY(200vh)';
      });
    };

    const triggerReset = () => {
      gravityDropped = false;
      items.forEach((item, idx) => {
        const anim = item.animate([
          { transform: 'translateY(200vh)' },
          { transform: 'translateY(0)' }
        ], {
          duration: gravityDur,
          easing: 'ease-out',
          fill: 'both',
          delay: idx * 50
        });
        anim.onfinish = () => item.style.transform = '';
      });
    };

    window.addEventListener('keyup', e => {
      if (e.key === 'Shift' && gravityDropped) {
        triggerReset();
      }
    });

    items.forEach(item => {
      /* hover preview/title */
      item.addEventListener('mouseenter', () => {
        item.querySelector('.preview').style.display = 'flex';
        item.querySelector('.title').style.display = 'flex';
      });
      item.addEventListener('mouseleave', () => {
        item.querySelector('.preview').style.display = 'none';
        item.querySelector('.title').style.display = 'none';
      });

      /* click vs shift-click */
      item.addEventListener('click', e => {
        if (e.shiftKey) {
          triggerDrop();
        } else if (!item.isDragging) {
          location.href = item.dataset.link;
        }
      });

      /* drag logic for desktop only */
      item.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') return;

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

        const onPointerMove = ev => {
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

        const onPointerUp = ev => {
          item.releasePointerCapture(ev.pointerId);
          document.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('pointerup', onPointerUp);
          setTimeout(() => (item.isDragging = false), 0);
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
      });
    });
  }
});
