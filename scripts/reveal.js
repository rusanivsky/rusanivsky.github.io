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

    elements.forEach(function (element, index) {
      if (!element.hasAttribute('data-rev')) {
        element.setAttribute('data-rev', '');
      }
      if (!element.style.getPropertyValue('--d')) {
        element.style.setProperty('--d', (index % 3) * 70 + 'ms');
      }
    });

    function show(element) {
      element.classList.add('is-in');
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(show);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });
    var firstView = [];

    elements.forEach(function (element) {
      var rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0 &&
          rect.left < window.innerWidth && rect.right > 0) {
        firstView.push(element);
      } else {
        observer.observe(element);
      }
    });

    /* Two frames guarantee that the hidden state is painted before the reveal. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        firstView.forEach(show);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
