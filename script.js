$(document).ready(function () {
  // Smooth scrolling for page links
  $('a.page-scroll').bind('click', function (event) {
    let $anchor = $(this);
    $('html, body')
      .stop()
      .animate(
        {
          scrollTop: $($anchor.attr('href')).offset().top,
        },
        1500,
        'easeInOutExpo'
      );
    event.preventDefault();
  });

  // Highlight the top nav as scrolling occurs
  $('body').scrollspy({
    target: '.navbar',
  });

  // Close the responsive menu when a menu item is clicked
  $('.navbar-collapse ul li a').click(function () {
    $('.navbar-toggler:visible').click();
  });

  $(document).ready(function () {
    // Function to activate the correct panel and tab based on the hash
    function activatePanelFromHash() {
      let hash = window.location.hash; // Get the hash from the URL

      // Reset both panels and tabs
      $('.tab-pane').removeClass('active'); // Deactivate all panels
      $('.tab-link').removeClass('active-tab'); // Deactivate all tab links

      // Check the hash and activate the corresponding tab and panel
      if (hash === '#privacy') {
        $('#privacy-panel').addClass('active'); // Activate privacy panel
        $('#privacy-link').addClass('active-tab'); // Highlight privacy tab
      } else if (hash === '#docs' || hash === '') {
        $('#docs-panel').addClass('active'); // Activate docs panel
        $('#docs-link').addClass('active-tab'); // Highlight docs tab
      }
    }

    // Run the function on page load
    activatePanelFromHash();

    // Update the panel dynamically when the hash changes
    $(window).on('hashchange', activatePanelFromHash);

    // Add click listeners to tab links for switching without hash change
    $('.tab-link').click(function () {
      let targetHash =
        $(this).attr('id') === 'privacy-link' ? '#privacy' : '#docs';
      window.location.hash = targetHash; // Update the URL hash
    });
  });
});

// Tech icons bounce around and collide with each other; hovering one freezes it
$(function () {
  const box = document.getElementById('tech-playground');
  if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  box.classList.add('bouncing');

  const balls = [...box.querySelectorAll('.floating-img')].map((el) => {
    const r = el.offsetWidth / 2;
    const angle = Math.random() * Math.PI * 2;
    return {
      el, r,
      x: r + Math.random() * (box.clientWidth - 2 * r),
      y: r + Math.random() * (box.clientHeight - 2 * r),
      vx: Math.cos(angle) * 0.9, vy: Math.sin(angle) * 0.9,
      rot: 0, spin: (Math.random() - 0.5) * 0.6,
      hover: false,
    };
  });
  balls.forEach((b) => {
    b.el.addEventListener('mouseenter', () => (b.hover = true));
    b.el.addEventListener('mouseleave', () => (b.hover = false));
    b.el.addEventListener('dragstart', (e) => e.preventDefault());

    // grab an icon, drag it and release to launch it with the drag velocity
    let drag = null;
    b.el.addEventListener('pointerdown', (e) => {
      b.el.setPointerCapture(e.pointerId);
      drag = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      b.hover = true;
      b.vx = b.vy = 0;
    });
    b.el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const now = performance.now(), dt = Math.max(now - drag.t, 1);
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5;
      b.x = Math.min(Math.max(b.x + dx, b.r), box.clientWidth - b.r);
      b.y = Math.min(Math.max(b.y + dy, b.r), box.clientHeight - b.r);
      // velocity in px per frame (~16ms), smoothed so a jittery last move doesn't decide the throw
      b.vx = b.vx * 0.5 + (dx / dt) * 16 * 0.5;
      b.vy = b.vy * 0.5 + (dy / dt) * 16 * 0.5;
      Object.assign(drag, { x: e.clientX, y: e.clientY, t: now });
    });
    const release = () => {
      if (!drag) return;
      const speed = Math.hypot(b.vx, b.vy), max = 25;
      if (speed > max) { b.vx *= max / speed; b.vy *= max / speed; }
      b.wasDragged = drag.moved;
      drag = null;
      b.hover = false;
    };
    b.el.addEventListener('pointerup', release);
    b.el.addEventListener('pointercancel', release);
    b.el.addEventListener('click', (e) => {
      if (b.wasDragged) e.preventDefault(); // a throw is not a click on the link
      b.wasDragged = false;
    });
  });

  function step() {
    const w = box.clientWidth, h = box.clientHeight;
    for (const b of balls) {
      if (b.hover) continue; // hovered icon stays still so it can be clicked
      const speed = Math.hypot(b.vx, b.vy);
      const target = 0.9; // drift back to cruising speed after a push or collision
      b.vx *= 1 + (target - speed) * 0.02 / Math.max(speed, 0.01);
      b.vy *= 1 + (target - speed) * 0.02 / Math.max(speed, 0.01);
      b.x += b.vx; b.y += b.vy; b.rot += b.spin;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
      if (b.y > h - b.r) { b.y = h - b.r; b.vy = -Math.abs(b.vy); }
    }
    // equal-mass elastic collisions: swap velocity along the contact normal
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d >= min || d === 0) continue;
        const nx = dx / d, ny = dy / d, overlap = (min - d) / 2;
        if (!a.hover) { a.x -= nx * overlap; a.y -= ny * overlap; }
        if (!b.hover) { b.x += nx * overlap; b.y += ny * overlap; }
        const p = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (p <= 0) continue;
        a.vx -= p * nx; a.vy -= p * ny; b.vx += p * nx; b.vy += p * ny;
        a.spin = -a.spin; b.spin = -b.spin;
      }
    }
    for (const b of balls) {
      const scale = b.hover ? 1.25 : 1;
      b.el.style.transform = `translate(${b.x - b.r}px, ${b.y - b.r}px) rotate(${b.hover ? 0 : b.rot}deg) scale(${scale})`;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
});
