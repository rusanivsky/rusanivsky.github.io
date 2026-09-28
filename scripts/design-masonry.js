/* Native artwork proportions, packed into the shortest column. */
(function (root) {
  'use strict';
  function columns(width) { return width < 600 ? 1 : width < 1100 ? 2 : 3; }
  function layout(items, containerWidth, gap = 20) {
    const count = columns(containerWidth);
    const width = Math.max(0, (containerWidth - gap * (count - 1)) / count);
    const bottoms = Array(count).fill(0);
    const placed = items.map(item => {
      const column = bottoms.indexOf(Math.min(...bottoms));
      const height = width * item.height / item.width;
      const rect = { x: column * (width + gap), y: bottoms[column], width, height };
      bottoms[column] += height + gap;
      return rect;
    });
    return { height: items.length ? Math.max(...bottoms) - gap : 0, items: placed };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { layout };
  if (!root.document) return;
  root.document.querySelectorAll('.design-masonry').forEach(gallery => {
    const cards = Array.from(gallery.children);
    let queued = false;
    function arrange() {
      queued = false;
      const available = gallery.clientWidth;
      if (!available) return;
      const gap = parseFloat(getComputedStyle(gallery).columnGap) || 20;
      const width = (available - gap * (columns(available) - 1)) / columns(available);
      cards.forEach(card => { card.style.width = width + 'px'; });
      const result = layout(cards.map(card => ({ width, height: card.offsetHeight })), available, gap);
      gallery.classList.add('is-packed');
      cards.forEach((card, i) => {
        card.style.left = result.items[i].x + 'px';
        card.style.top = result.items[i].y + 'px';
      });
      gallery.style.height = result.height + 'px';
    }
    function schedule() {
      if (!queued) { queued = true; requestAnimationFrame(arrange); }
    }
    let previousWidth = -1;
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width !== previousWidth) { previousWidth = width; schedule(); }
    }).observe(gallery);
    gallery.querySelectorAll('img').forEach(img => img.addEventListener('load', schedule));
    if (document.fonts) document.fonts.ready.then(schedule);
    schedule();
  });
})(typeof window !== 'undefined' ? window : globalThis);
