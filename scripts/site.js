/*
  One script for the whole site. No dependencies, no framework.

  Everything here degrades: with JavaScript off you still get a readable
  index, working links to every project, real posters, and a page that
  follows the system theme by default, with a saved manual choice.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var mobile = matchMedia('(max-width: 60.99rem)').matches;

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
     Auto follows the operating system through CSS. A manual choice is saved
     and remains active until Auto is selected again. */
  var THEME_KEY = 'kr-theme';
  var LIGHT = '#f8f8f8';
  var DARK = '#141412';
  var colorPreference = matchMedia('(prefers-color-scheme: dark)');
  var lastEffectiveTheme;
  var refreshGlow = function () {};

  function storedTheme() {
    try {
      var value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : 'auto';
    } catch (e) { return 'auto'; }
  }

  function effectiveTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return colorPreference.matches ? 'dark' : 'light';
  }

  function updateThemeColor(mode) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', effectiveTheme(mode) === 'dark' ? DARK : LIGHT);
  }

  function paintTheme(mode) {
    var nextEffectiveTheme = effectiveTheme(mode);
    root.setAttribute('data-theme', mode);
    updateThemeColor(mode);
    if (lastEffectiveTheme && lastEffectiveTheme !== nextEffectiveTheme) refreshGlow();
    lastEffectiveTheme = nextEffectiveTheme;
    document.querySelectorAll('.theme-modes [data-theme-mode]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.themeMode === mode));
    });
  }

  paintTheme(storedTheme());

  colorPreference.addEventListener('change', function () {
    if (root.getAttribute('data-theme') === 'auto') paintTheme('auto');
  });

  document.addEventListener('click', function (event) {
    var button = event.target.closest('.theme-modes [data-theme-mode]');
    if (!button) return;
    var mode = button.dataset.themeMode;
    try {
      if (mode === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* private mode: this choice lasts for this page */ }
    if (document.startViewTransition &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches &&
        effectiveTheme(mode) !== lastEffectiveTheme) {
      document.startViewTransition(function () { paintTheme(mode); });
    } else {
      paintTheme(mode);
    }
  });

  /* ---------- The green glow, dithered ----------
     The glow on a subpage is a CSS radial gradient, and Safari barely
     dithers radial gradients: eight bits a channel across a dark fall-off
     came out in hard concentric steps, where Chromium dithers and shows
     none. Grain on top cannot fix it — it arrives after the rounding. So the
     same curve is drawn here once, at the screen's own pixel density, with
     each pixel rounded at random rather than to the nearest level. Geometry
     and colours are read from the stylesheet (--glow-r, --glow-off,
     --glow-core, --head-tint, --paper); the fall-off is the same eased curve
     the gradient's thirteen stops sample. */
  var glowHosts = [];
  if (root.classList.contains('sub') && document.querySelector('main')) glowHosts.push(document.querySelector('main'));
  if (mobile && document.querySelector('main.home')) glowHosts.push(document.querySelector('main.home'));
  if (!mobile && document.getElementById('stage')) glowHosts.push(document.getElementById('stage'));
  if (glowHosts.length && window.HTMLCanvasElement) {
    var glowRefreshers = [];
    refreshGlow = function () { glowRefreshers.forEach(function (refresh) { refresh(); }); };
    var hex = function (v) {
      v = v.trim().replace('#', '');
      if (v.length === 3) v = v.replace(/./g, '$&$&');
      return [0, 2, 4].map(function (i) { return parseInt(v.substr(i, 2), 16); });
    };

    // The same glow lies on a subpage's main and on the home page's stage;
    // each host carries its own geometry and the colour it fades into
    // (--glow-base: the paper under main, the stage's own grey under the
    // stage).
    var bakeGlow = function (host) {
      var glowCanvas = document.createElement('canvas');
      glowCanvas.className = 'glow';
      glowCanvas.setAttribute('aria-hidden', 'true');
      var footCanvas = null;
      if (host.tagName === 'MAIN' && mobile) {
        footCanvas = document.createElement('canvas');
        footCanvas.className = 'glow glow-foot';
        footCanvas.setAttribute('aria-hidden', 'true');
      }
      var glowKey = '';
      var glowJob = 0;

      var bakedClass = host.classList.contains('stage') ? 'stage-glow-baked' :
        host.classList.contains('home') ? 'home-glow-baked' : 'glow-baked';
      var refresh = function () {
        root.classList.remove(bakedClass);
        if (footCanvas) root.classList.remove('glow-foot-baked');
        if (window.cancelIdleCallback) window.cancelIdleCallback(glowJob);
        else clearTimeout(glowJob);
        // The CSS gradient updates immediately; bake its dithered replacement
        // when the browser has finished painting the theme change.
        glowJob = window.requestIdleCallback ?
          requestIdleCallback(drawGlow) : setTimeout(drawGlow, 200);
      };
      glowRefreshers.push(refresh);

      var drawGlow = function () {
        var box = glowCanvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, host.tagName === 'MAIN' && mobile ? 2 : 3);
        var side = Math.round(box.width * dpr);
        var cs = getComputedStyle(host);
        var off = parseFloat(cs.getPropertyValue('--glow-off')) || 0;
        var offPx = /vw/.test(cs.getPropertyValue('--glow-off')) ? off * document.documentElement.clientWidth / 100 : off;
        var rise = parseFloat(cs.getPropertyValue('--glow-rise')) || 0;
        var risePx = /vw/.test(cs.getPropertyValue('--glow-rise')) ? rise * document.documentElement.clientWidth / 100 : rise;
        var core = (parseFloat(cs.getPropertyValue('--glow-core')) || 0) / 100;
        var tint = hex(getComputedStyle(root).getPropertyValue('--head-tint'));
        var paper = hex(cs.getPropertyValue('--glow-base'));
        var key = [side, offPx, risePx, core, tint, paper].join();
        if (!side || (key === glowKey && root.classList.contains(bakedClass))) return;
        glowKey = key;

        glowCanvas.width = glowCanvas.height = side;
        var ctx = glowCanvas.getContext('2d');
        var img = ctx.createImageData(side, side);
        var px = img.data;
        var cx = side + offPx * dpr;
        var R = side;
        var dr = tint[0] - paper[0], dg = tint[1] - paper[1], db = tint[2] - paper[2];
        // xorshift: Math.random for five million pixels is the slow part.
        var seed = 2463534242;
        for (var y = 0, i = 0; y < side; y++) {
          var dy = y + 0.5 + risePx * dpr;
          for (var x = 0; x < side; x++, i += 4) {
            var dx = cx - x - 0.5;
            var t = (Math.sqrt(dx * dx + dy * dy) / R - core) / (1 - core);
            var w = t <= 0 ? 1 : t >= 1 ? 0 : (1 + Math.cos(Math.PI * t)) / 2;
            seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
            var n1 = (seed >>> 0) / 4294967296;
            seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
            // Triangular noise of ±1 level: breaks the steps without moving
            // the average tone.
            var n = n1 + (seed >>> 0) / 4294967296 - 1;
            px[i] = paper[0] + dr * w + n;
            px[i + 1] = paper[1] + dg * w + n;
            px[i + 2] = paper[2] + db * w + n;
            px[i + 3] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        if (footCanvas) {
          // The two mobile glows overlap on shorter pages. Make the lower
          // canvas clear where its glow fades so it cannot cut off the top.
          for (var j = 0; j < px.length; j += 4) {
            px[j + 3] = Math.max(0, Math.min(255,
              Math.round((px[j] - paper[0]) / dr * 255)));
            px[j] = tint[0];
            px[j + 1] = tint[1];
            px[j + 2] = tint[2];
          }
          footCanvas.width = footCanvas.height = side;
          footCanvas.getContext('2d').putImageData(img, 0, 0);
          root.classList.add('glow-foot-baked');
        }
        root.classList.add(bakedClass);
      };

      host.insertBefore(glowCanvas, host.firstChild);
      if (footCanvas) host.appendChild(footCanvas);
      var glowLater = window.requestIdleCallback || function (f) { return setTimeout(f, 200); };
      glowLater(drawGlow);
      var glowResize = 0;
      window.addEventListener('resize', function () {
        clearTimeout(glowResize);
        glowResize = setTimeout(drawGlow, 250);
      });
    };
    glowHosts.forEach(bakeGlow);
  }

  /* ---------- Holding the page still ----------
     Two things cover the page — the drawer and the viewer — and neither is
     any use if the page keeps scrolling behind it. Both called these two
     names; neither name existed, so opening either one threw before it got
     as far as showing anything, and the viewer came up empty until the next
     arrow key rebuilt it. They are counted rather than toggled: if the two
     ever overlap, the page is only released when the last of them closes. */
  var locks = 0;
  function lockScroll() { if (++locks === 1) root.classList.add('no-scroll'); }
  function unlockScroll() { if (locks > 0 && --locks === 0) root.classList.remove('no-scroll'); }

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

  /* ---------- Editorial photo galleries ----------
     Only geometry changes. Links, focus, image nodes and lightbox order stay
     intact; without JS the same anchors remain in the normal CSS grid. */
  if (window.KRGallery) {
    document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
      var cells = Array.prototype.slice.call(gallery.children).filter(function (el) {
        return el.matches('a.cell[data-lb]');
      });
      if (!cells.length) return;
      var lastWidth = 0, frame = 0;

      function dimensions() {
        return cells.map(function (cell, index) {
          var im = cell.querySelector('img');
          return { n: index,
            w: Number(im.getAttribute('width')) || im.naturalWidth || 3,
            h: Number(im.getAttribute('height')) || im.naturalHeight || 2 };
        });
      }
      function layout(force) {
        var width = gallery.clientWidth;
        if (!width || (!force && Math.abs(width - lastWidth) < 0.5)) return;
        var gap = parseFloat(getComputedStyle(gallery).getPropertyValue('--gallery-gap')) || 10;
        var heroes = [];
        cells.forEach(function (cell, i) { if (cell.hasAttribute('data-gallery-hero')) heroes.push(i); });
        var result = window.KRGallery.compose(dimensions(), width, gap, { mode: 'series', heroIds: heroes });
        result.tiles.forEach(function (tile) {
          var cell = cells[tile.n];
          cell.style.left = tile.x + 'px'; cell.style.top = tile.y + 'px';
          cell.style.width = tile.w + 'px'; cell.style.height = tile.h + 'px';
          var im = cell.querySelector('img');
          if (im.hasAttribute('srcset')) im.sizes = Math.ceil(tile.w) + 'px';
        });
        gallery.style.height = result.height + 'px';
        gallery.classList.add('is-packed');
        lastWidth = width;
      }
      layout(true);
      function resized() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function () { layout(false); });
      }
      if ('ResizeObserver' in window) new ResizeObserver(resized).observe(gallery);
      else window.addEventListener('resize', resized);
      // New assets may temporarily lack metadata; use intrinsic dimensions
      // once that image loads, without waiting on the rest of the series.
      cells.forEach(function (cell) {
        var im = cell.querySelector('img');
        if (!Number(im.getAttribute('width')) || !Number(im.getAttribute('height'))) {
          im.addEventListener('load', function () { layout(true); });
        }
      });
    });
  }

  /* ---------- Video ----------
     One tap on the poster has to start the film, with sound, on a phone as
     much as on a desk. A phone only allows sound when the tap lands on the
     player itself; a frame built after the tap stops on YouTube's own poster
     and asks for a second one. So a YouTube film arms itself before anyone
     taps: once the page has loaded and the film comes near the screen, its
     player is made silently underneath our poster, and the poster stops
     catching taps — the tap goes straight through to YouTube and plays. The
     moment the film starts, our poster fades and YouTube's frame is seen.
     Nothing third-party loads before the page itself has; a poster tapped
     before its player is ready asks it to play as soon as it is. Vimeo still
     builds its frame on the tap, which desktop and phone both accept. */
  var YT_HOST = 'https://www.youtube-nocookie.com';
  var ytApi = null;
  function loadYtApi() {
    if (ytApi) return ytApi;
    ytApi = new Promise(function (resolve, reject) {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }
      var prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (prev) try { prev(); } catch (e) { /* not ours */ }
        resolve(window.YT);
      };
      var s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = function () { ytApi = null; reject(); };
      document.head.appendChild(s);
    });
    return ytApi;
  }

  var armed = [];   // { wrap, player } for every YouTube film made so far

  // One film at a time: the others pause, and a Vimeo frame is taken down to
  // its poster.
  function quietOthers(except) {
    armed.forEach(function (a) {
      if (a.wrap !== except && a.player && a.player.pauseVideo) {
        try { a.player.pauseVideo(); } catch (e) { /* not ready */ }
      }
    });
    document.querySelectorAll('.player video.cf-video').forEach(function (v) {
      if (v.closest('.player') !== except) v.pause();
    });
    document.querySelectorAll('.player iframe.vm-frame').forEach(function (f) {
      var p = f.closest('.player');
      if (p === except) return;
      f.remove();
      if (p) { var b = p.querySelector('.player-btn'); if (b) b.hidden = false; }
    });
  }

  function arm(wrap, playNow) {
    if (wrap.dataset.armed) {
      if (playNow) wrap.dataset.want = '1';
      return;
    }
    wrap.dataset.armed = '1';
    if (playNow) wrap.dataset.want = '1';
    var btn = wrap.querySelector('.player-btn');
    loadYtApi().then(function (YT) {
      var slot = document.createElement('div');
      slot.className = 'yt-slot';
      wrap.insertBefore(slot, wrap.firstChild);
      var entry = { wrap: wrap, player: null };
      armed.push(entry);
      entry.player = new YT.Player(slot, {
        host: YT_HOST,
        videoId: btn.dataset.videoId,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: function (ev) {
            var f = ev.target.getIframe && ev.target.getIframe();
            if (f) f.title = btn.getAttribute('aria-label') || 'Video';
            // From here the tap belongs to YouTube.
            wrap.classList.add('armed');
            btn.hidden = true;
            if (wrap.dataset.want) { quietOthers(wrap); ev.target.playVideo(); }
          },
          onStateChange: function (ev) {
            if (ev.data === 1 || ev.data === 3) {
              wrap.classList.add('playing');
              quietOthers(wrap);
            }
          },
        },
      });
    }).catch(function () {
      // No API (blocked, offline): the plain embed, built on the tap.
      delete wrap.dataset.armed;
      if (wrap.dataset.want) plainFrame(wrap, btn, 'yt', btn.dataset.videoId);
    });
  }

  function plainFrame(wrap, btn, platform, id) {
    // playsinline so a phone plays the film in the page instead of demanding
    // a second tap to go fullscreen.
    var src = platform === 'vm'
      ? 'https://player.vimeo.com/video/' + id + '?autoplay=1&playsinline=1'
      : YT_HOST + '/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    var frame = document.createElement('iframe');
    frame.className = 'vm-frame';
    frame.src = src;
    frame.title = btn.getAttribute('aria-label') || 'Video';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen';
    frame.setAttribute('allowfullscreen', '');
    // The click itself is what permits the sound, and the permission is
    // granted for a moment only — so the frame is built and attached inside
    // the handler, with nothing deferred in between.
    quietOthers(wrap);
    wrap.appendChild(frame);
    btn.hidden = true;
  }

  /* A film of our own (Cloudflare R2, platform cf): a plain <video>, made
     and started inside the tap, so the phone lets it play with sound. The
     poster stays as the video's own poster until the first frame arrives. */
  function ownVideo(wrap, btn) {
    var v = wrap.querySelector('video.cf-video');
    if (!v) {
      v = document.createElement('video');
      v.className = 'cf-video';
      v.src = btn.dataset.src;
      v.controls = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.setAttribute('playsinline', '');
      v.setAttribute('controlslist', 'nodownload');
      var img = wrap.querySelector('img');
      if (img) v.poster = img.currentSrc || img.src;
      v.title = btn.getAttribute('aria-label') || 'Video';
      v.addEventListener('playing', function () {
        wrap.classList.add('playing');
        quietOthers(wrap);
      });
      wrap.appendChild(v);
    }
    quietOthers(wrap);
    btn.hidden = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* the controls are there */ });
  }

  var ytWraps = Array.prototype.map.call(
    document.querySelectorAll('button.player-btn[data-platform="yt"]'),
    function (b) { return b.closest('.player'); });
  if (ytWraps.length) {
    var startArming = function () {
      if (!('IntersectionObserver' in window)) { ytWraps.forEach(function (w) { arm(w); }); return; }
      var near = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          near.unobserve(e.target);
          arm(e.target);
        });
      }, { rootMargin: '600px 0px' });
      ytWraps.forEach(function (w) { near.observe(w); });
    };
    if (document.readyState === 'complete') startArming();
    else window.addEventListener('load', startArming, { once: true });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('button.player-btn');
    if (!btn) return;
    var wrap = btn.closest('.player');
    if (btn.dataset.platform === 'yt') { quietOthers(wrap); arm(wrap, true); }
    else if (btn.dataset.platform === 'cf') ownVideo(wrap, btn);
    else plainFrame(wrap, btn, btn.dataset.platform, btn.dataset.videoId);
  });

  /* ---------- Brief ----------
     The form composes an email; it does not post anywhere. It used to say so
     with action="mailto:", and browsers read that as a form submitting over
     something that is not HTTPS: Chrome turned autofill off on the fields and
     put a full-page «not secure» warning between the visitor and the send
     button. Nothing was ever insecure — there is no server and no request —
     but the warning was real and it stopped people. So the address lives in a
     data attribute, the submit is handled here, and the mail client is opened
     with the answers already in it. The labels on the page supply the field
     names, so the letter arrives in the language the form was filled in.
     Without JavaScript the form cannot compose anything, and a line inside
     <noscript> says to write to the address printed just above it. */
  /* Бриф.
     Сайт статичний — сама сторінка нічого відправити не може. Якщо в
     data/brief.json лежить адреса приймача (Google Apps Script у власному
     акаунті), форма шле бриф туди і клієнт нікуди не виходить. Якщо адреси
     немає або приймач мовчить — лишається старий шлях: скласти лист і
     віддати його поштовій програмі. Друге ніколи не прибирається: краще
     зайвий клік, ніж мовчазно загублена заявка.

     Content-Type навмисно text/plain: так запит лишається «простим» за
     правилами CORS і браузер не робить preflight, якого Apps Script не
     переживає. Тіло при цьому — звичайний JSON. */
  var brief = document.getElementById('brief');
  if (brief && brief.dataset.mailto) {
    var state = document.getElementById('brief-state');

    function briefData() {
      var data = {};
      var fields = brief.querySelectorAll('input[name], select[name], textarea[name]');
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        var value = (f.value || '').trim();
        if (value) data[f.name] = value;
      }
      return data;
    }

    function briefSubject(data) {
      return brief.dataset.subject + (data.Discipline ? ' — ' + data.Discipline : '');
    }

    function toMail(data) {
      var lines = [];
      var fields = brief.querySelectorAll('input[name], select[name], textarea[name]');
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        var value = (f.value || '').trim();
        if (!value || f.name === 'company') continue;
        var label = brief.querySelector('label[for="' + f.id + '"]');
        lines.push((label ? label.textContent.trim() : f.name) + ': ' + value);
      }
      window.location.href = 'mailto:' + brief.dataset.mailto
        + '?subject=' + encodeURIComponent(briefSubject(data))
        + '&body=' + encodeURIComponent(lines.join('\n'));
    }

    function say(text) { if (state) state.textContent = text || ''; }

    brief.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = briefData();
      var endpoint = brief.dataset.endpoint;
      if (!endpoint) { toMail(data); return; }

      data.page = location.href;
      var button = brief.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      say(brief.dataset.sending);

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
      }).then(function (r) {
        return r.ok ? r.text() : Promise.reject(new Error(r.status));
      }).then(function (text) {
        /* Розбираємо відповідь, а не шукаємо в ній підрядок: зайвий пробіл
           у JSON не має скидати заявку в запасний шлях. */
        var answer;
        try { answer = JSON.parse(text); } catch (err) { throw new Error(text); }
        if (!answer || answer.ok !== true) throw new Error(text);
        brief.reset();
        say(brief.dataset.sent);
      }).catch(function () {
        say(brief.dataset.fallback);
        toMail(data);
      }).then(function () {
        if (button) button.disabled = false;
      });
    });
  }

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
      /* srcset and sizes go on before src: set the other way round the
         browser starts fetching the plain src and then throws it away.
         The viewer asks for the widest step there is, not the one that fits
         the screen. Saving a picture from a phone hands over the file the
         browser already holds, and a step chosen for a 390px screen is what
         the person would keep. So sizes is set past every candidate, which
         leaves the browser nothing to pick but the largest. It costs a phone
         about 70kB more than the fitting step — paid once, in the view a
         person opened on purpose, and not at all in the grid. */
      var widestUrl = '';
      if (item.srcset) {
        var widest = 0;
        item.srcset.split(',').forEach(function (c) {
          var bits = c.trim().split(/\s+/);
          var w = parseInt((bits[1] || ''), 10);
          if (w > widest) { widest = w; widestUrl = bits[0]; }
        });
        lbImg.srcset = item.srcset;
        lbImg.sizes = widest ? widest + 'px' : '100vw';
      }
      else { lbImg.removeAttribute('srcset'); lbImg.removeAttribute('sizes'); }
      /* The fallback points at the widest step too, so a browser that saves
         src rather than the step it actually loaded still hands over the
         large file. Nothing is fetched twice: srcset is already set, so src
         is only read where srcset is not understood. */
      lbImg.src = widestUrl || item.src;
      lbImg.alt = item.alt;
      if (item.w && item.h) { lbImg.width = item.w; lbImg.height = item.h; }
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
          /* im.width is the RENDERED width, and a frame that has not been
             scrolled to yet has not rendered: it answers 0. Writing that 0
             onto the viewer's own image gave it an intrinsic size of nothing
             and the first picture opened blank. The markup carries the real
             dimensions as attributes, so they are read from there, with the
             decoded size as the fallback and never a zero. */
          var aw = parseInt(im.getAttribute('width'), 10) || im.naturalWidth || 0;
          var ah = parseInt(im.getAttribute('height'), 10) || im.naturalHeight || 0;
          /* Not currentSrc: that is the step the browser picked for a
             thumbnail, and the viewer is not a thumbnail. The whole ladder
             is handed over and the viewer chooses again at its own size. */
          return {
            src: im.getAttribute('src') || im.src,
            srcset: im.getAttribute('srcset') || '',
            alt: im.alt, w: aw, h: ah,
          };
        });
        open(items, all.indexOf(trigger), trigger);
        return;
      }
      if (e.target.closest('.lb-close')) close();
      if (e.target.closest('[data-lb-prev]')) step(-1);
      if (e.target.closest('[data-lb-next]')) step(1);
      /* The cursor over the picture is a pair of arrows, so the picture has
         to answer to a click the way the arrows promise: the half you are
         standing in is the way you go. */
      var stage = e.target.closest('.lb-stage');
      if (stage && !lb.hidden && !magnified()) {
        var b = stage.getBoundingClientRect();
        var back = e.clientX < b.left + b.width / 2;
        lb.setAttribute('data-side', back ? 'prev' : 'next');
        step(back ? -1 : 1);
      }
    });

    /* Which of the two arrows is lit follows the pointer, not the picture:
       the side of the stage the cursor is in is the side it would turn. */
    lb.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var stage = lb.querySelector('.lb-stage');
      var b = stage.getBoundingClientRect();
      lb.setAttribute('data-side', e.clientX < b.left + b.width / 2 ? 'prev' : 'next');
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

    /* Turning the page is a swipe with ONE finger. A pinch puts a second
       finger down and lifts the two of them one at a time, and each lift is
       a touchend carrying a wide dx — which turned the page out from under
       somebody who was only trying to look closer. So a gesture that ever
       held more than one finger turns nothing, and the lock is not released
       until the last finger is up. A picture left magnified is still being
       read, so it does not turn either. */
    var x0 = null, pinched = false;
    function magnified() {
      var v = window.visualViewport;
      return !!v && v.scale > 1.01;
    }
    lb.addEventListener('touchstart', function (e) {
      if (e.touches.length > 1) { pinched = true; x0 = null; return; }
      if (pinched) return;
      x0 = e.changedTouches[0].clientX;
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (pinched) {
        if (e.touches.length === 0) { pinched = false; x0 = null; }
        return;
      }
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45 && !magnified()) step(dx < 0 ? 1 : -1);
      x0 = null;
    }, { passive: true });
  }

  /* ---------- How a page arrives ----------
     The boot script in <head> raises .fx before the first paint whenever the
     visitor has not asked for less motion; nothing below runs without it.
     Three kinds of entrance, all on one ease:
     - the headings of the page come in line by line, each line swept in word
       by word from the left;
     - the rail and the bar come in link by link;
     - every other block rises 28px as it scrolls into view, and blocks that
       arrive together are staggered, so a row of pictures lands left to right.
     Everything marked here is unmarked again once it has arrived, so the
     hover transitions the rest of this file relies on come back untouched. */
  // The boot script shows the page by itself after three seconds; a script
  // that arrives later than that finds the page already on screen and must
  // not hide it again for an entrance.
  if (root.classList.contains('fx') && !root.classList.contains('fx-ready')) {
    /* One tempo for every entrance. The timings below were drawn at 1 and are
       all divided by PACE, so the whole sequence can be quickened or slowed
       in one place; styles/site.css reads the same number as --pace. */
    var PACE = 1.6;
    function sec(x) { return x / PACE; }
    function ms(x) { return Math.round(x / PACE); }
    var DONE = ms(1300);

    function mark(el, cls, delay) {
      el.classList.add(cls);
      el.style.setProperty('--d', delay + 's');
    }
    function settle(el, delay) {
      setTimeout(function () {
        el.classList.remove('rv', 'rv-fade', 'rv-rule', 'rv-in');
        el.style.removeProperty('--d');
      }, delay * 1000 + DONE);
    }
    function arrive(el) {
      el.classList.add('rv-in');
      settle(el, parseFloat(el.style.getPropertyValue('--d')) || 0);
    }

    // Each word of a text in a span of its own.
    function split(el, cls) {
      var tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (tw.nextNode()) {
        var n = tw.currentNode;
        if (n.textContent.trim() && !n.parentNode.closest('.sr')) nodes.push(n);
      }
      nodes.forEach(function (n) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          var w = document.createElement('span');
          w.className = cls;
          w.textContent = tok;
          frag.appendChild(w);
        });
        n.parentNode.replaceChild(frag, n);
      });
      return el.querySelectorAll('.' + cls);
    }

    // Headings: the words are hidden from the start so nothing shows before
    // its turn. The lines are counted only when the entrance begins, by which
    // time the display face has arrived and the breaks are final.
    function wrap(h) {
      split(h, 'w');
      h.classList.add('lf');
    }
    // All positions are read first and all delays written after, so the
    // browser lays the page out once rather than once per word.
    function lines(h, base) {
      var ws = h.querySelectorAll('.w');
      var tops = Array.prototype.map.call(ws, function (w) { return w.getBoundingClientRect().top; });
      var line = -1, top = null, k = 0, delays = [];
      tops.forEach(function (t) {
        if (top === null || t - top > 3) { line++; top = t; k = 0; }
        delays.push(base + sec(line * 0.14 + k++ * 0.022));
      });
      ws.forEach(function (w, i) { w.style.transitionDelay = delays[i] + 's'; });
      return base + sec((line + 1) * 0.14);
    }

    var heads = document.querySelectorAll(
      'main .eyebrow, main .t-title, main .t-display, main .standfirst, main .page-intro, main .project-dek'
    );
    var splashEl = document.querySelector('.splash');
    var waiting = root.classList.contains('splash-on') && !root.classList.contains('splash-off');
    // Without the card the name fades in with the rest of the header; with
    // it, the name is brought in by the card itself (below).
    var chrome = Array.prototype.slice.call(document.querySelectorAll(
      (waiting ? '' : '.rail .wordmark, .bar .wordmark, ') + '.rail-nav a, .rail-foot > *, .bar > :not(.wordmark)'
    ));
    var tiles = document.querySelectorAll('.slide.on .tile');
    // Rules are part of the entrance too: a divider that is already drawn
    // while the words around it are still to come reads as a leftover. Each
    // one comes in with the first item after it.
    var rules = Array.prototype.slice.call(document.querySelectorAll('.rail-nav + .rail-nav, .index'));

    // Blocks: walk down from <main> and stop at the first element that fits
    // on a screen, so a whole section is not moved as one slab and a single
    // picture is not split into pieces.
    var blocks = [];
    var skip = 'script, style, canvas.glow, .stage, .splash, [hidden]';
    var headSel = '.eyebrow, .t-title, .t-display, .standfirst, .page-intro, .project-dek';
    function collect(el) {
      Array.prototype.forEach.call(el.children, function (c) {
        if (c.matches(skip) || c.matches(headSel)) return;
        if (c.querySelector(headSel) ||
            (c.children.length && c.getBoundingClientRect().height > innerHeight * 0.8)) {
          collect(c);
          return;
        }
        blocks.push(c);
      });
    }
    var main = document.getElementById('main');
    if (main) collect(main);

    // The marks hide things that the browser may already have painted. Were
    // the transitions live at that moment, each element would start fading
    // *out* and the entrance would fade it back in from wherever that got to
    // — which looks like no entrance at all. So the marks go on with
    // transitions switched off, the styles are flushed, and only then are the
    // transitions given back.
    root.classList.add('fx-mark');
    blocks.forEach(function (b) { mark(b, 'rv', 0); });
    chrome.forEach(function (el, i) { mark(el, 'rv', sec(0.1 + i * 0.045)); });
    tiles.forEach(function (el) { mark(el, 'rv-fade', 0); });
    rules.forEach(function (el) {
      // A block that rises as a whole brings its own border with it.
      if (el.classList.contains('rv')) return;
      var next = el.querySelector('.rv');
      var d = next ? parseFloat(next.style.getPropertyValue('--d')) || 0 : sec(0.3);
      mark(el, 'rv-rule', d);
    });
    // On a narrow screen every heading is one block in the reading order.
    // Splitting every word on every page delayed off-screen headings and
    // made them finish independently of the blocks beside them.
    if (mobile) heads.forEach(function (h) { mark(h, 'rv', 0); });
    else heads.forEach(wrap);
    void root.offsetHeight;
    root.classList.remove('fx-mark');
    root.classList.add('fx-ready');

    function start() {
      var t = sec(0.05);
      if (!mobile) heads.forEach(function (h) { t = lines(h, t) - sec(0.05); });
      requestAnimationFrame(function () {
        if (!mobile) heads.forEach(function (h) { h.classList.add('lf-in'); });
        chrome.forEach(arrive);
        rules.forEach(function (el) { if (!el.classList.contains('rv')) arrive(el); });
      });

      // The first wall on the stage waits for its pictures, then comes in
      // frame by frame from the left — a slow picture never pops in out of
      // turn.
      var imgs = Array.prototype.map.call(tiles, function (x) { return x.querySelector('img'); });
      var ready = Promise.all(imgs.map(function (im) {
        return !im || im.complete ? null : new Promise(function (r) {
          im.addEventListener('load', r, { once: true });
          im.addEventListener('error', r, { once: true });
        });
      }));
      Promise.race([ready, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
        tiles.forEach(function (el, i) {
          el.style.setProperty('--d', sec(0.15 + i * 0.14) + 's');
          arrive(el);
        });
      });

      var batch = 0, batchAt = 0;
      var io = new IntersectionObserver(function (entries) {
        var now = Date.now();
        if (now - batchAt > 120) batch = 0;
        batchAt = now;
        // IntersectionObserver may deliver entries in a different order from
        // the visual stack. Read positions once, then stagger top to bottom.
        var visible = entries.filter(function (e) { return e.isIntersecting; });
        if (mobile) visible.sort(function (a, b) {
          return a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left;
        });
        visible.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          e.target.style.setProperty('--d', sec(Math.min(batch++ * 0.09, 0.72)) + 's');
          arrive(e.target);
        });
      }, mobile
        ? { threshold: 0.01, rootMargin: '0px 0px 4% 0px' }
        : { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
      var flow = mobile ? blocks.concat(Array.prototype.slice.call(heads)) : blocks;
      // Let the small header arrive first; nothing starts under the splash.
      setTimeout(function () { flow.forEach(function (el) { io.observe(el); }); }, mobile ? ms(160) : 0);
    }

    /* ---------- From the title card to the page ----------
       The name on the card does not fade with it. Each of its words travels
       to the place the same word holds in the header — the rail on a wide
       screen, where the name stands on two lines, the bar on a narrow one —
       and takes that word's size on the way, while the card's paper dissolves
       and the page comes up beneath it. The words land exactly on the real
       ones, so the hand-over at the end cannot be seen. */
    var EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

    function clearSplash() {
      root.className = root.className.replace(/ ?splash-(on|off|clear)/g, '');
      if (splashEl) splashEl.classList.remove('splash-clear');
    }
    function center(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

    window.krSplashExit = function () {
      window.krSplashExit = null;
      var nm = splashEl && splashEl.querySelector('.splash-name');
      var role = splashEl && splashEl.querySelector('.splash-role');
      var target = Array.prototype.find.call(
        document.querySelectorAll('.rail .wordmark, .bar .wordmark'),
        function (el) { return el.getClientRects().length > 0; }
      );
      var from = nm && nm.animate ? split(nm, 'fw') : [];
      var label = target && target.textContent;
      var to = target ? split(target, 'tw') : [];
      if (!from.length || from.length !== to.length) {
        if (target) target.textContent = label;
        root.className += ' splash-off';
        setTimeout(clearSplash, 260);
        start();
        return;
      }
      var FLY = ms(1150);

      target.style.opacity = '0';
      Array.prototype.forEach.call(from, function (w, i) {
        var a = w.getBoundingClientRect(), b = to[i].getBoundingClientRect();
        var ca = center(a), cb = center(b);
        w.animate(
          [{ transform: 'none' },
           { transform: 'translate(' + (cb.x - ca.x) + 'px,' + (cb.y - ca.y) + 'px) scale(' + (b.width / a.width) + ')' }],
          { duration: FLY, easing: EXPO, fill: 'forwards' }
        );
      });
      if (role) {
        role.animate(
          [{ opacity: getComputedStyle(role).opacity, transform: 'none' }, { opacity: 0, transform: 'translateY(-0.6em)' }],
          { duration: ms(380), easing: 'ease-out', fill: 'forwards' }
        );
      }
      splashEl.classList.add('splash-clear');
      if (!mobile) setTimeout(start, ms(260));

      // The travelling words are already where the real ones stand. The real
      // name comes on at full strength underneath them and only the copy on
      // top dissolves: two half-faded layers would read as a flicker of grey.
      setTimeout(function () {
        target.textContent = label;
        target.style.opacity = '';
        nm.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(160), easing: 'linear', fill: 'forwards' });
        setTimeout(function () {
          clearSplash();
          if (mobile) start();
        }, ms(180));
      }, FLY);
    };

    if (!waiting) {
      window.krSplashExit = null;
      // Lines are counted in the face they will be read in, but a slow font
      // never holds the page back by more than a moment.
      var fonts = document.fonts ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise(function (r) { setTimeout(r, 600); })]).then(function () {
        requestAnimationFrame(start);
      });
    }
  }
})();
