/* ==========================================================================
   CITY NAILS — main.js
   Vanilla ES6+. Libraries (loaded via CDN in index.html): Bootstrap, AOS, GLightbox.
   Sections:
   01. Helpers & feature flags
   02. Preloader
   03. Navbar (scrolled state, mobile menu, active link)
   04. Scroll progress, back-to-top, floating booking button
   05. Cursor glow
   05b. Hero (title letters, 3D tilt, particle constellation)
   06. Magnetic buttons
   07. 3D tilt cards
   08. Animated counters
   09. Sparkle on CTA buttons
   10. Libraries init (AOS, GLightbox)
   11. Boot
   ========================================================================== */

/* ===== 01. HELPERS & FEATURE FLAGS ===== */
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ===== 02. PRELOADER ===== */
function initPreloader() {
  const preloader = $('#preloader');
  const reveal = () => {
    preloader?.classList.add('is-done');
    document.body.classList.add('is-ready');   // triggers the hero entrance animation
  };
  // Wait for the page, but never longer than 2.5s
  const minimumTime = prefersReducedMotion ? 0 : 900;
  const start = performance.now();
  const finish = () => setTimeout(reveal, Math.max(0, minimumTime - (performance.now() - start)));

  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });
  setTimeout(reveal, 2500);
}

/* ===== 03. NAVBAR ===== */
function initNavbar() {
  const nav = $('#mainNav');
  const offcanvasEl = $('#offcanvasNav');
  if (!nav) return;

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Close the mobile menu after choosing a link
  if (offcanvasEl && window.bootstrap) {
    $$('a', offcanvasEl).forEach(link => {
      link.addEventListener('click', () => bootstrap.Offcanvas.getInstance(offcanvasEl)?.hide());
    });
  }
}

/* ===== 03b. ACTIVE LINK HIGHLIGHT (scrollspy) ===== */
function initScrollSpy() {
  const links = $$('.site-nav .nav-link');
  const sections = links
    .map(link => ({ link, section: $(link.getAttribute('href')) }))
    .filter(item => item.section);

  const update = () => {
    const line = window.scrollY + window.innerHeight * 0.35;   // reading line at 35% of the viewport
    let current = sections[0];
    sections.forEach(item => { if (item.section.offsetTop <= line) current = item; });
    links.forEach(link => link.classList.toggle('active', current && link === current.link));
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/* ===== 04. SCROLL PROGRESS, BACK-TO-TOP, FLOATING BUTTON ===== */
function initScrollUi() {
  const bar = $('#scrollProgress');
  const toTop = $('#toTop');
  const fab = $('#fabBook');

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    if (bar) bar.style.transform = `scaleX(${progress})`;
    toTop?.classList.toggle('is-visible', window.scrollY > 700);
    fab?.classList.toggle('is-visible', window.scrollY > 500);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));
}

/* ===== 05. CURSOR GLOW (desktop only) ===== */
function initCursorGlow() {
  const glow = $('#cursorGlow');
  if (!glow || !hasFinePointer || prefersReducedMotion) return;

  let x = 0, y = 0, raf = null;
  window.addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    glow.classList.add('is-on');
    if (!raf) raf = requestAnimationFrame(() => {
      glow.style.transform = `translate(${x}px, ${y}px)`;
      raf = null;
    });
  }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('is-on'));
}

/* ===== 05b. HERO (title letters, 3D tilt, particle constellation) ===== */

/* Wraps every character of [data-split] elements in a span so the title can animate letter by letter */
function initHeroTitle() {
  if (prefersReducedMotion) return;
  let index = 0;
  const wrap = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        [...child.textContent].forEach(ch => {
          if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
          const span = document.createElement('span');
          span.className = 'char';
          span.style.setProperty('--i', index++);
          span.setAttribute('aria-hidden', 'true');
          span.textContent = ch;
          frag.appendChild(span);
        });
        child.replaceWith(frag);
      } else wrap(child);
    });
  };
  $$('[data-split]').forEach(el => {
    el.setAttribute('aria-label', el.textContent.trim());
    wrap(el);
  });
}

/* The photo stage tilts in 3D towards the pointer */
function initHeroStage() {
  const hero = $('#home');
  const stage = $('#heroStage');
  if (!hero || !stage || !hasFinePointer || prefersReducedMotion) return;
  const maxTilt = 9; // degrees

  hero.addEventListener('pointermove', e => {
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    stage.style.setProperty('--ry', `${px * maxTilt * 2}deg`);
    stage.style.setProperty('--rx', `${-py * maxTilt * 2}deg`);
  });
  hero.addEventListener('pointerleave', () => {
    stage.style.setProperty('--ry', '0deg');
    stage.style.setProperty('--rx', '0deg');
  });
}

/* Floating particles that connect with lines and react to the cursor */
function initConstellation() {
  const canvas = $('#heroCanvas');
  if (!canvas || prefersReducedMotion) return;
  const hero = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const linkDistance = 120;
  const pointer = { x: -9999, y: -9999 };
  let width = 0, height = 0, points = [], visible = true, raf = null;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(70, Math.max(24, Math.round((width * height) / 20000)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.7
    }));
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    points.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(212, 194, 165, .85)';
      ctx.fill();

      // links to neighbours
      for (let k = i + 1; k < points.length; k++) {
        const q = points[k];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < linkDistance) {
          ctx.strokeStyle = `rgba(212, 194, 165, ${(1 - d / linkDistance) * 0.28})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      // links to the cursor
      const dp = Math.hypot(p.x - pointer.x, p.y - pointer.y);
      if (dp < 170) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - dp / 170) * 0.55})`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
      }
    });
    raf = visible ? requestAnimationFrame(draw) : null;
  };

  resize();
  window.addEventListener('resize', resize);
  hero.addEventListener('pointermove', e => {
    const rect = hero.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  });
  hero.addEventListener('pointerleave', () => { pointer.x = pointer.y = -9999; });

  // Only animate while the hero is on screen
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(draw);
  }).observe(hero);
  raf = requestAnimationFrame(draw);
}

/* ===== 06. MAGNETIC BUTTONS ===== */
function initMagnetic() {
  if (!hasFinePointer || prefersReducedMotion) return;
  const strength = 0.25;

  $$('.magnetic').forEach(el => {
    el.addEventListener('pointermove', e => {
      const rect = el.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) * strength;
      const dy = (e.clientY - (rect.top + rect.height / 2)) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}

/* ===== 07. 3D TILT CARDS ===== */
function initTilt() {
  if (!hasFinePointer || prefersReducedMotion) return;
  const maxTilt = 5; // degrees

  $$('.tilt').forEach(card => {
    card.addEventListener('pointermove', e => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-py * maxTilt}deg) rotateY(${px * maxTilt}deg) translateY(-6px)`;
    });
    card.addEventListener('pointerleave', () => (card.style.transform = ''));
    card.style.transition = 'transform .25s ease-out, box-shadow .4s, border-color .4s';
  });
}

/* ===== 08. ANIMATED COUNTERS ===== */
function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const animate = el => {
    const target = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    if (prefersReducedMotion) { el.textContent = target.toFixed(dec).replace('.', ','); return; }
    const duration = 1600;
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);          // ease-out cubic
      el.textContent = dec ? (target * eased).toFixed(dec).replace('.', ',') : Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  counters.forEach(el => observer.observe(el));
}

/* ===== 09. SPARKLE ON CTA BUTTONS ===== */
function initSparkles() {
  if (prefersReducedMotion) return;
  const colours = ['#d4c2a5', '#95aa87', '#4d5e41', '#ffffff'];

  $$('.sparkle-btn').forEach(btn => {
    btn.addEventListener('pointerenter', () => {
      const rect = btn.getBoundingClientRect();
      for (let i = 0; i < 10; i++) {
        const particle = document.createElement('span');
        particle.className = 'sparkle-particle';
        const angle = Math.random() * Math.PI * 2;
        const distance = 40 + Math.random() * 50;
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;
        particle.style.background = colours[i % colours.length];
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance * 1.6}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        document.body.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
      }
    });
  });
}

/* ===== 10. LIBRARIES INIT ===== */
function initLibraries() {
  if (window.AOS) {
    AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 60, disable: prefersReducedMotion });
  }
  if (window.GLightbox) {
    GLightbox({ selector: '.glightbox', touchNavigation: true, loop: true, zoomable: true });
  }
}

/* ===== 11. BOOT ===== */
document.addEventListener('DOMContentLoaded', () => {
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  initPreloader();
  initNavbar();
  initScrollSpy();
  initScrollUi();
  initCursorGlow();
  initHeroTitle();
  initHeroStage();
  initConstellation();
  initMagnetic();
  initTilt();
  initCounters();
  initSparkles();
  initLibraries();
});
