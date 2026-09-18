(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-ZGH5PBS8H6');

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a');
    if (!link) return;

    var href = link.getAttribute('href') || '';
    var methods = [
      ['mailto:', 'email'],
      ['wa.me/', 'whatsapp'],
      ['t.me/', 'telegram'],
      ['instagram.com/', 'instagram'],
      ['behance.net/', 'behance'],
      ['linkedin.com/', 'linkedin'],
      ['facebook.com/', 'facebook'],
    ];

    for (var i = 0; i < methods.length; i++) {
      if (href.indexOf(methods[i][0]) === -1) continue;
      window.gtag('event', 'contact_click', { contact_method: methods[i][1] });
      break;
    }
  });

  var loaded = false;

  function loadTag() {
    if (loaded) return;
    loaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-ZGH5PBS8H6';
    document.head.appendChild(script);
  }

  function loadAfterPaint() {
    requestAnimationFrame(function () {
      requestAnimationFrame(loadTag);
    });
  }

  function waitForCriticalImage() {
    var image = document.querySelector('img[fetchpriority="high"]');
    if (!image) {
      loadAfterPaint();
      return;
    }

    if (image.complete) {
      if (image.decode) image.decode().catch(function () {}).then(loadAfterPaint);
      else loadAfterPaint();
      return;
    }

    image.addEventListener('load', loadAfterPaint, { once: true });
    image.addEventListener('error', loadAfterPaint, { once: true });
  }

  window.addEventListener('load', waitForCriticalImage, { once: true });
  window.addEventListener('pointerdown', loadTag, { once: true, passive: true });
  window.addEventListener('keydown', loadTag, { once: true });
  window.setTimeout(loadTag, 6000);
}());
