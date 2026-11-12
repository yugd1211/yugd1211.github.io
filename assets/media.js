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
