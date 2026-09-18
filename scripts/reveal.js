(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('rev');

  function ready() {
    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var selector = [
      '[data-rev]',
      '.grid > *',
      'section.shots > *',
      '.tsec > h2',
      '.trow',
      '.contact-head .intro'
    ].join(',');
    var elements = Array.prototype.slice.call(document.querySelectorAll(selector));

    elements = elements.filter(function (element, index, all) {
      return all.indexOf(element) === index;
    });

    var readingOrder = new WeakMap();
    elements.forEach(function (element, index) {
      readingOrder.set(element, index);
      if (!element.hasAttribute('data-rev')) {
        element.setAttribute('data-rev', '');
      }
      element.style.setProperty('--d', '0ms');
    });

    function show(element) {
      element.classList.add('is-in');
    }

    /* Крок між сусідніми блоками і стеля, далі якої черга не тягнеться.
       Доти крок був 72мс, а queueUntil накопичувався без обмеження: на
       довгій сторінці (в умовах співпраці понад сто рядків) швидка
       прокрутка складала чергу на секунди, і рядки з'являлися помітно
       пізніше, ніж потрапляли на екран. Тепер крок 26мс, у межах одного
       заходу він рахується щонайбільше для шести блоків, а сама черга
       не буває далі ніж на 240мс уперед: скільки б не було рядків, увесь
       екран проявляється за чверть секунди. */
    var stagger = 26;
    var maxSteps = 6;
    var maxQueueAhead = 240;
    var queueUntil = 0;

    function byReadingOrder(a, b) {
      return readingOrder.get(a) - readingOrder.get(b);
    }

    function revealInOrder(batch) {
      if (!batch.length) return;

      var now = performance.now();
      var start = Math.min(Math.max(now, queueUntil), now + maxQueueAhead);
      var ordered = batch.slice().sort(byReadingOrder);

      ordered.forEach(function (element, index) {
        var step = Math.min(index, maxSteps) * stagger;
        window.setTimeout(function () { show(element); }, start - now + step);
      });
      queueUntil = start + Math.min(ordered.length, maxSteps + 1) * stagger;
    }

    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach(show);
      return;
    }

    var pending = [];
    var pendingFrame = 0;
    var initialBatch = true;
    var observer = new IntersectionObserver(function (entries) {
      var visible = [];
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        visible.push(entry.target);
        observer.unobserve(entry.target);
      });

      /* IntersectionObserver supplies the first viewport after layout without
         a synchronous geometry read. Keep its old two-frame composition: the
         hidden state paints first, then the whole initial viewport appears. */
      if (initialBatch) {
        initialBatch = false;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { visible.forEach(show); });
        });
        return;
      }

      Array.prototype.push.apply(pending, visible);
      if (!pending.length || pendingFrame) return;
      pendingFrame = requestAnimationFrame(function () {
        pendingFrame = 0;
        revealInOrder(pending.splice(0));
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });
    elements.forEach(function (element) { observer.observe(element); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else {
    ready();
  }
})();
