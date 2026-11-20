/* THAOS public shell — one initialization point shared by every page. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initAmbient() {
    const canvas = $('#ambientCanvas');
    if (!canvas || reducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let particles = [];
    let frame = 0;
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = Array.from({length: Math.min(54, Math.floor(width / 27))}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + .25,
        v: Math.random() * .13 + .025,
        alpha: Math.random() * .24 + .05,
        hue: Math.random() > .72 ? 82 : 190
      }));
    };
    const draw = () => {
      frame = 0;
      if (document.hidden) return;
      const width = window.innerWidth, height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.v;
        if (p.y < -4) { p.y = height + 4; p.x = Math.random() * width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 67%, ${p.alpha})`;
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', resize, {passive: true});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frame) { cancelAnimationFrame(frame); frame = 0; }
      else if (!document.hidden && !frame) draw();
    });
    resize(); draw();
  }

  function initPageChrome() {
    const header = $('.site-header');
    if (header) {
      const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
      window.addEventListener('scroll', sync, {passive: true});
      sync();
    }
    const observer = 'IntersectionObserver' in window && !reducedMotion
      ? new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }, {threshold: .12})
      : null;
    for (const node of $$('.reveal')) {
      if (observer) observer.observe(node);
      else node.classList.add('is-visible');
    }
    const toast = $('#toast');
    let toastTimer;
    window.thaosToast = message => {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2400);
    };
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-toast]');
      if (trigger) window.thaosToast(trigger.dataset.toast);
    });
  }

  initAmbient();
  initPageChrome();
})();
