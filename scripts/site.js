/*
  One script for the whole site. No dependencies, no framework.

  Everything here degrades: with JavaScript off you still get a readable
  index, working links to every project, real posters, and a page that
  follows the system theme through CSS alone.
*/
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Grid overlay ----------
     Append ?grid to any URL, or press G, to draw the twelve columns over the
     page. A checking tool for layout work — it ships nothing to a visitor who
     never asks for it. */
  if (location.search.indexOf('grid') > -1) root.setAttribute('data-grid', '');
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
    root.toggleAttribute('data-grid');
  });

  /* ---------- Theme: auto | light | dark ----------
     Auto is the default and is plain prefers-color-scheme in CSS. A manual
     choice is stored and wins until the visitor picks Auto again. The clock
     is never consulted — the brief rules that out explicitly. */
  var THEME_KEY = 'kr-theme';
  var LIGHT = '#f4f1e9';
  var DARK = '#141412';

  function stored() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  function effective(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function paint(mode) {
    root.setAttribute('data-theme', mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', effective(mode) === 'dark' ? DARK : LIGHT);
    document.querySelectorAll('.theme button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === mode));
    });
  }

  paint(stored() || 'auto');

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (root.getAttribute('data-theme') === 'auto') paint('auto');
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.theme button');
    if (!btn) return;
    var mode = btn.dataset.theme;
    try {
      if (mode === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (err) { /* private mode — the choice just will not persist */ }
    paint(mode);
  });

  /* ---------- Typeface: serif | sans ----------
     The name and the headlines are set in Prata by default; the switch puts
     them back in Fixel so the two can be compared on the real pages rather
     than in a specimen. Stored like the theme, and read before first paint by
     a small inline script so nothing jumps. */
  /* ---------- Mobile drawer ---------- */
  var drawer = document.getElementById('drawer');
  if (drawer) {
    var opener = document.getElementById('menu-open');
    var closer = document.getElementById('menu-close');
    function openDrawer() {
      drawer.hidden = false;
      lockScroll();
      var first = drawer.querySelector('a, button');
      if (first) first.focus();
    }
    function closeDrawer() {
      drawer.hidden = true;
      unlockScroll();
      if (opener) opener.focus();
    }
    if (opener) opener.addEventListener('click', openDrawer);
    if (closer) closer.addEventListener('click', closeDrawer);
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  /* ---------- Home: index + stage ----------
     Hover and keyboard focus both drive the stage. Nothing here touches
     history or the URL — only a real click navigates. */
  var stage = document.getElementById('stage');
  if (stage) {
    var slides = stage.querySelectorAll('.slide');
    var capTitle = document.getElementById('stage-title');
    var capMeta = document.getElementById('stage-meta');
    var current = null;

    function show(idx) {
      if (idx === current) return;
      current = idx;
      slides.forEach(function (s, i) {
        s.classList.toggle('on', i === idx);
        // Anything off-stage is hidden from assistive tech too; the index
        // beside it already carries the same titles.
        s.setAttribute('aria-hidden', String(i !== idx));
      });
      var slide = slides[idx];
      if (slide && capTitle) capTitle.textContent = slide.dataset.title || '';
      if (slide && capMeta) capMeta.textContent = slide.dataset.meta || '';
    }

    document.querySelectorAll('.row').forEach(function (row, i) {
      // pointerenter rather than mouseenter so a pen behaves like a mouse,
      // while a touch tap goes straight to the link instead of previewing.
      row.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        show(i);
      });
      row.addEventListener('focus', function () { show(i); });
    });

    show(0);
  }

  /* ---------- Video facade ----------
     The poster is a real image and the iframe only exists after a click, so
     a page with twenty videos loads no third-party player at all. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.player-btn');
    if (!btn) return;
    var wrap = btn.closest('.player');
    var platform = btn.dataset.platform;
    var id = btn.dataset.videoId;
    // playsinline so a phone plays the film in the page instead of demanding
    // a second tap to go fullscreen; enablejsapi so the player can be told to
    // play once more after it loads, in case the first attempt was refused.
    var src = platform === 'vm'
      ? 'https://player.vimeo.com/video/' + id + '?autoplay=1&playsinline=1'
      : 'https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=1&rel=0&playsinline=1&enablejsapi=1';
    var frame = document.createElement('iframe');
    frame.src = src;
    frame.title = btn.getAttribute('aria-label') || 'Video';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen';
    frame.setAttribute('allowfullscreen', '');
    // One player at a time: any frame already running is torn back down to
    // its poster before this one starts.
    document.querySelectorAll('.player iframe').forEach(function (f) {
      var p = f.closest('.player');
      f.remove();
      if (p) { var b = p.querySelector('.player-btn'); if (b) b.hidden = false; }
    });
    // The click itself is what permits the sound, and the permission is
    // granted for a moment only — so the frame is built and attached inside
    // the handler, with nothing deferred and no lazy loading in between.
    wrap.appendChild(frame);
    btn.hidden = true;
    frame.addEventListener('load', function () {
      var target = platform === 'vm' ? '*' : 'https://www.youtube-nocookie.com';
      var msg = platform === 'vm'
        ? '{"method":"play"}'
        : '{"event":"command","func":"playVideo","args":[]}';
      try { frame.contentWindow.postMessage(msg, target); } catch (err) { /* blocked */ }
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = document.getElementById('lb');
  if (lb) {
    var lbImg = lb.querySelector('img');
    var lbCount = document.getElementById('lb-count');
    var lbCap = document.getElementById('lb-cap');
    var group = [];
    var at = 0;
    var opener2 = null;

    function render() {
      var item = group[at];
      lbImg.src = item.src;
      lbImg.alt = item.alt;
      lbImg.width = item.w;
      lbImg.height = item.h;
      if (lbCount) lbCount.textContent = (at + 1) + ' / ' + group.length;
      if (lbCap) lbCap.textContent = item.alt || '';
    }

    function open(items, index, source) {
      group = items;
      at = index;
      opener2 = source;
      lb.hidden = false;
      lockScroll();
      render();
      lb.querySelector('.lb-close').focus();
    }

    function close() {
      lb.hidden = true;
      unlockScroll();
      if (opener2) opener2.focus();
    }

    function step(d) {
      at = (at + d + group.length) % group.length;
      render();
    }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-lb]');
      if (trigger) {
        e.preventDefault();
        var scope = trigger.closest('[data-lb-group]') || document;
        // Only the frames this container owns. The hidden remainder of a
        // series is its own group nested inside, and must not silently pad
        // the count of the opening edit.
        var all = Array.prototype.slice.call(scope.querySelectorAll('[data-lb]'))
          .filter(function (el) { return el.closest('[data-lb-group]') === scope; });
        var items = all.map(function (el) {
          var im = el.querySelector('img');
          return { src: im.currentSrc || im.src, alt: im.alt, w: im.width, h: im.height };
        });
        open(items, all.indexOf(trigger), trigger);
        return;
      }
      if (e.target.closest('.lb-close')) close();
      if (e.target.closest('[data-lb-prev]')) step(-1);
      if (e.target.closest('[data-lb-next]')) step(1);
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') {
        // Two controls' worth of focus trap, which is all this dialog has.
        var f = lb.querySelectorAll('button');
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  /* ---------- Reveal the rest of a long photographic series ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.rest-toggle');
    if (!t) return;
    var rest = document.getElementById(t.getAttribute('aria-controls'));
    if (!rest) return;
    rest.hidden = false;
    t.hidden = true;
  });
})();
