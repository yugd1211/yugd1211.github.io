// Theme (F-DARK). The <head> script has already put data-theme on <html> before first paint:
// a saved choice if there is one, otherwise the device setting. Here: the header button, saving the choice
// (storage may throw; the choice then lasts for this page only), following device changes until the viewer
// has chosen, and keeping other open tabs in step.
(() => {
  const root = document.documentElement;
  const KEY = 'theme';
  const valid = t => t === 'dark' || t === 'light';
  const read = () => { try { const t = localStorage.getItem(KEY); return valid(t) ? t : null; } catch { return null; } };
  const device = window.matchMedia('(prefers-color-scheme: dark)');
  let chosen = read() !== null;
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = theme => {
    root.setAttribute('data-theme', theme);
    const dark = theme === 'dark';
    buttons.forEach(b => b.setAttribute('aria-pressed', String(dark)));
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--sheet').trim() || meta.content;
    // "원본 크게 보기" opens the diagram raster that matches the theme on screen.
    document.querySelectorAll('a[data-dark-href]').forEach(a => { a.href = dark ? a.dataset.darkHref : a.dataset.lightHref; });
  };
  apply(valid(root.getAttribute('data-theme')) ? root.getAttribute('data-theme') : device.matches ? 'dark' : 'light');
  buttons.forEach(b => b.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    chosen = true;
    try { localStorage.setItem(KEY, next); } catch { /* still switches for this page */ }
    apply(next);
  }));
  device.addEventListener?.('change', e => { if (!chosen) apply(e.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', e => { if (e.key === KEY && valid(e.newValue)) { chosen = true; apply(e.newValue); } });
  // A page restored from the back/forward cache missed any storage event while frozen.
  window.addEventListener('pageshow', e => { const t = e.persisted && read(); if (t) { chosen = true; apply(t); } });
})();

// Loop video blocks. Without JS the native controls stay. With JS: custom play/pause button,
// play only while at least 40% visible, never autoplay under prefers-reduced-motion
// (re-checked when the setting changes; a viewer's explicit play is still allowed).
(() => {
  // Native details stays compact on touch layouts and exposes the full rail on desktop.
  const desktop = window.matchMedia('(min-width: 1024px)');
  const syncToc = () => document.querySelectorAll('.toc details').forEach(d => { d.open = desktop.matches; });
  syncToc();
  desktop.addEventListener?.('change', syncToc);
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const blocks = [];
  document.querySelectorAll('[data-loop]').forEach(fig => {
    const video = fig.querySelector('video');
    const btn = fig.querySelector('.loop-btn');
    if (!video || !btn) return;
    video.controls = false;
    btn.hidden = false;
    const state = btn.querySelector('.loop-state');
    const item = { video, wanted: !mq.matches, visible: false };
    const sync = () => {
      const playing = !video.paused;
      btn.setAttribute('aria-pressed', String(playing));
      state.textContent = playing ? '일시정지' : '재생';
    };
    btn.addEventListener('click', () => {
      item.wanted = video.paused;
      if (item.wanted) video.play().catch(() => {}); else video.pause();
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    new IntersectionObserver(([e]) => {
      item.visible = e.isIntersecting && e.intersectionRatio >= 0.4;
      if (item.visible && item.wanted) video.play().catch(() => {});
      else if (!item.visible) video.pause();
    }, { threshold: [0, 0.4] }).observe(video);
    blocks.push(item);
    sync();
  });
  mq.addEventListener?.('change', () => {
    for (const item of blocks) {
      item.wanted = !mq.matches;
      if (mq.matches) item.video.pause();
      else if (item.visible) item.video.play().catch(() => {});
    }
  });
  window.addEventListener('beforeprint', () => blocks.forEach(b => b.video.pause()));
})();
