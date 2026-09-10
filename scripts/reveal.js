(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('rev');

  function ready() {
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var selector = [
      '[data-rev]',
      '.cats .cat',
      '.grid > *',
      'section.shots > *',
      '.tsec > h2',
      '.trow',
      '.contact-head .intro',
      '.photo-pixover'
    ].join(',');
    var elements = Array.prototype.slice.call(document.querySelectorAll(selector));

    elements = elements.filter(function (element, index, all) {
      return all.indexOf(element) === index;
    });

    elements.forEach(function (element) {
      if (!element.hasAttribute('data-rev')) {
        element.setAttribute('data-rev', '');
      }
      element.style.setProperty('--d', '0ms');
    });

    function show(element) {
      element.classList.add('is-in');
    }

    var stagger = 72;
    var queueUntil = 0;

    function byReadingOrder(a, b) {
      var aRect = a.getBoundingClientRect();
      var bRect = b.getBoundingClientRect();
      var rowDifference = aRect.top - bRect.top;

      /* Cards in the same visual row flow left-to-right; a single column
         naturally follows top-to-bottom. The tolerance absorbs sub-pixel
         grid differences without turning a row into a vertical sequence. */
      if (Math.abs(rowDifference) > 12) return rowDifference;
      return aRect.left - bRect.left;
    }

    function revealInOrder(batch) {
      if (!batch.length) return;

      var now = performance.now();
      var start = Math.max(now, queueUntil);
      var ordered = batch.slice().sort(byReadingOrder);

      ordered.forEach(function (element, index) {
        window.setTimeout(function () { show(element); }, start - now + index * stagger);
      });
      queueUntil = start + ordered.length * stagger;
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(show);
      return;
    }

    var pending = [];
    var pendingFrame = 0;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        pending.push(entry.target);
        observer.unobserve(entry.target);
      });
      if (!pending.length || pendingFrame) return;
      pendingFrame = requestAnimationFrame(function () {
        pendingFrame = 0;
        revealInOrder(pending.splice(0));
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });
    var firstView = [];
    var later = [];

    elements.forEach(function (element) {
      var rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0 &&
          rect.left < window.innerWidth && rect.right > 0) {
        firstView.push(element);
      } else {
        later.push(element);
      }
    });

    /* Two frames guarantee that the hidden state is painted before the reveal. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        revealInOrder(firstView);
        later.forEach(function (element) { observer.observe(element); });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
