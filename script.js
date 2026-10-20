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

});

// Tech icons bounce around and collide with each other; hovering one freezes it
$(function () {
  const box = document.getElementById('tech-playground');
  if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  box.classList.add('bouncing');
  const panel = box.querySelector('.skills-panel');
  // leave room for the icons above and below the card, whatever height its columns wrap to
  const fitHeight = () => (box.style.height = panel.offsetHeight + 360 + 'px');
  fitHeight();
  window.addEventListener('resize', fitHeight);

  const wall = () => { // measured on screen because the card is centred with a CSS transform
    const p = panel.getBoundingClientRect(), o = box.getBoundingClientRect();
    return { l: p.left - o.left, t: p.top - o.top, r: p.right - o.left, b: p.bottom - o.top };
  };
  const insideWall = (x, y, r, w) => x > w.l - r && x < w.r + r && y > w.t - r && y < w.b + r;

  // drop an icon on a random free spot outside the card
  function place(b) {
    const w = wall();
    let tries = 0;
    do {
      b.x = b.r + Math.random() * (box.clientWidth - 2 * b.r);
      b.y = b.r + Math.random() * (box.clientHeight - 2 * b.r);
    } while (insideWall(b.x, b.y, b.r, w) && ++tries < 100);
  }

  const balls = [...box.querySelectorAll('.floating-img')].map((el) => {
    const r = el.offsetWidth / 2;
    const angle = Math.random() * Math.PI * 2;
    return {
      el, r, x: 0, y: 0,
      vx: Math.cos(angle) * 0.9, vy: Math.sin(angle) * 0.9,
      rot: 0, spin: (Math.random() - 0.5) * 0.6,
      hover: false,
    };
  });
  balls.forEach(place);
  // when the card reflows (e.g. columns stack on a narrower window), move the icons it now covers
  window.addEventListener('resize', () => {
    const w = wall();
    balls.forEach((b) => insideWall(b.x, b.y, b.r, w) && place(b));
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

  // circle vs rectangle: push the icon out of the card and reflect its velocity on the side it hit
  function bounceOffWall(b, R) {
    const cx = Math.min(Math.max(b.x, R.l), R.r), cy = Math.min(Math.max(b.y, R.t), R.b);
    let nx = b.x - cx, ny = b.y - cy;
    const d = Math.hypot(nx, ny);
    if (d >= b.r) return;
    if (d > 0) {
      nx /= d; ny /= d;
      b.x = cx + nx * b.r; b.y = cy + ny * b.r;
    } else { // centre is inside the card (e.g. dropped there): leave through the nearest edge
      const gaps = [b.x - R.l, R.r - b.x, b.y - R.t, R.b - b.y];
      [nx, ny] = [[-1, 0], [1, 0], [0, -1], [0, 1]][gaps.indexOf(Math.min(...gaps))];
      if (nx) b.x = (nx < 0 ? R.l : R.r) + nx * b.r;
      else b.y = (ny < 0 ? R.t : R.b) + ny * b.r;
    }
    const p = b.vx * nx + b.vy * ny;
    if (p < 0) { b.vx -= 2 * p * nx; b.vy -= 2 * p * ny; }
  }

  function step() {
    const w = box.clientWidth, h = box.clientHeight;
    const rect = wall();
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
      bounceOffWall(b, rect);
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

// Open source: show the 2 most recently contributed projects, live from the GitHub API
$(function () {
  const box = document.getElementById('oss-projects');
  if (!box) return;
  const QUERY = 'author:ieCecchetti type:pr is:public -user:ieCecchetti';
  const CACHE_KEY = 'oss-projects-v1';
  const CACHE_MS = 60 * 60 * 1000; // unauthenticated search allows 10 calls/min per IP, so cache for an hour
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

  // "fix(scope): do thing (#123)" -> "Do thing"
  function cleanTitle(title) {
    const t = title.replace(/^\w+(\([^)]*\))?!?:\s*/, '').replace(/\s*\(#\d+\)$/, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  async function load() {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.projects;

    const search = await getJSON(
      'https://api.github.com/search/issues?sort=created&order=desc&per_page=50&q=' + encodeURIComponent(QUERY)
    );
    const byRepo = new Map(); // results are newest first, so Map order = most recent project first
    for (const pr of search.items) {
      const repo = pr.repository_url.split('/repos/')[1];
      if (!byRepo.has(repo)) byRepo.set(repo, []);
      byRepo.get(repo).push({ number: pr.number, title: cleanTitle(pr.title), url: pr.html_url });
    }
    const projects = await Promise.all(
      [...byRepo].slice(0, 2).map(async ([repo, prs]) => {
        const info = await getJSON('https://api.github.com/repos/' + repo);
        return {
          repo,
          name: info.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          url: info.html_url,
          avatar: info.owner.avatar_url,
          description: (info.description || '').split(/\.\s/)[0].replace(/\.?$/, '.'),
          language: info.language,
          prs: prs.slice(0, 3),
        };
      })
    );
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), projects }));
    return projects;
  }

  function render(p) {
    const prs = p.prs
      .map(
        (pr) => `
          <li>
            <a href="${esc(pr.url)}" target="_blank" rel="noopener">
              <img class="oss-state" src="https://img.shields.io/github/pulls/detail/state/${esc(p.repo)}/${pr.number}?label=&amp;style=flat-square" alt="Status of pull request #${pr.number}">
              <span class="oss-pr-number">#${pr.number}</span>
              <span class="oss-pr-title">${esc(pr.title)}</span>
            </a>
          </li>`
      )
      .join('');
    return `
      <div class="col-lg-6 mb-4">
        <div class="oss-project">
          <div class="oss-project-head">
            <img class="oss-avatar" src="${esc(p.avatar)}" alt="${esc(p.repo.split('/')[0])} logo">
            <div>
              <h4><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></h4>
              <img src="https://img.shields.io/github/stars/${esc(p.repo)}?style=flat-square" alt="GitHub stars of ${esc(p.name)}">
            </div>
          </div>
          <p class="text-muted">${esc(p.description)}</p>
          ${p.language ? `<div class="oss-tags"><span class="oss-tag">${esc(p.language)}</span></div>` : ''}
          <ul class="oss-prs">${prs}</ul>
        </div>
      </div>`;
  }

  load()
    .then((projects) => {
      if (projects.length) box.innerHTML = projects.map(render).join('');
    })
    .catch(() => {}); // rate limited or offline: keep the static cards already in the page
});

