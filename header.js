/* Keep the mobile glass header above the document without hiding its content. */
(function () {
  var root = document.documentElement;
  var topbar = document.querySelector('.topbar');
  var compact = window.matchMedia('(max-width: 760px)');

  if (!topbar || document.querySelector('.contact-head')) return;

  function update() {
    if (!compact.matches) {
      root.classList.remove('fixed-topbar');
      root.style.removeProperty('--topbar-height');
      return;
    }

    root.classList.add('fixed-topbar');
    root.style.setProperty('--topbar-height', topbar.getBoundingClientRect().height + 'px');
  }

  if ('ResizeObserver' in window) new ResizeObserver(update).observe(topbar);
  compact.addEventListener('change', update);
  window.addEventListener('orientationchange', update);
  update();
  requestAnimationFrame(update);
})();
