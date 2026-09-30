// AC1/AC2/AC4 behavior through DOM events and media promises. Only the standalone
// server-player block is evaluated; tests never call its private functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../scripts/site.js', import.meta.url), 'utf8');
const start = source.indexOf('var serverPlayers =');
const end = source.indexOf('var ytWraps =', start);
assert.ok(start >= 0 && end > start, 'standalone server-player module exists');
const code = source.slice(start, end);
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

class Element extends EventTarget {
  constructor() {
    super();
    this.attrs = new Map();
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = { add() {} };
    this.textContent = '';
    this.value = '0';
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}
function setup(lang = 'en') {
  const video = new Element();
  Object.assign(video, { title: 'Film', duration: 120, currentTime: 0, paused: true, muted: true, ended: false, error: null, playCalls: 0, deferNext: false });
  video.dataset.src = 'https://example.test/original.mp4';
  Object.defineProperty(video, 'src', { set(value) { this.setAttribute('src', value); }, get() { return this.getAttribute('src'); } });
  video.play = function () {
    this.playCalls++;
    this.paused = false;
    this.emit('play');
    if (this.deferNext) {
      this.deferNext = false;
      return new Promise((resolve, reject) => { this.resolvePlay = resolve; this.rejectPlay = reject; });
    }
    this.emit('playing');
    return Promise.resolve();
  };
  video.pause = function () {
    const wasPlaying = !this.paused;
    this.paused = true;
    if (wasPlaying) this.emit('pause');
  };
  video.load = function () { this.error = null; };
  const frame = new Element();
  const toggle = new Element(), sound = new Element(), seek = new Element(), clock = new Element(), status = new Element();
  const shell = new Element();
  const children = { 'video.cf-video': video, '.player': frame, '.video-toggle': toggle, '.video-sound': sound, '.video-seek': null, '.video-clock': null, '.video-status': status };
  shell.querySelector = selector => children[selector];
  const document = new Element();
  document.hidden = false;
  document.documentElement = { lang };
  document.querySelectorAll = selector => selector === '.server-player' ? [shell] : [];
  const observers = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe() {}
    unobserve() {}
    emit(visible) { const ratio = typeof visible === 'number' ? visible : visible ? 1 : 0; this.callback([{ target: frame, isIntersecting: ratio > 0, intersectionRatio: ratio }]); }
  }
  let raf = 0;
  const otherVideo = { paused: false, pauseCalls: 0, pause() { this.paused = true; this.pauseCalls++; } };
  vm.runInNewContext(code, { document, window: { IntersectionObserver: Observer }, IntersectionObserver: Observer, requestAnimationFrame: () => ++raf, cancelAnimationFrame() {}, quietOthers(except) { assert.equal(except, frame, 'current player excluded from mutual pause'); otherVideo.pause(); } });
  const visibility = observers.find(o => 'threshold' in o.options);
  return { video, shell, toggle, sound, seek, clock, status, otherVideo, visible: value => visibility.emit(value), hidden(value) { document.hidden = value; document.emit('visibilitychange'); } };
}

test('AC1/AC2: silent visible autoplay reports real state; explicit pause survives scrolling and tab changes', async () => {
  const p = setup();
  assert.equal(p.video.playCalls, 0, 'offscreen films do not start');
  assert.equal(p.video.src, null, 'source initially deferred');
  p.visible(true);
  await flush();
  assert.equal(p.video.src, p.video.dataset.src);
  assert.equal(p.video.muted, true);
  assert.equal(p.video.paused, false);
  assert.match(p.toggle.getAttribute('aria-label'), /^Pause/);
  p.toggle.emit('click');
  assert.equal(p.video.paused, true);
  assert.match(p.toggle.getAttribute('aria-label'), /^Play/);
  p.visible(false); p.visible(true); p.hidden(true); p.hidden(false);
  await flush();
  assert.equal(p.video.playCalls, 1, 'manual pause cannot restart automatically');
  p.toggle.emit('click');
  await flush();
  assert.equal(p.video.playCalls, 2, 'visitor explicitly resumes');
  assert.equal(p.video.paused, false);
  p.sound.emit('click');
  assert.equal(p.video.muted, false);
  assert.match(p.sound.getAttribute('aria-label'), /^Mute/);
});

test('All server films: tapping video toggles playback and pause persists across scrolling', async () => {
  const p = setup('en');
  p.visible(1); await flush();
  assert.equal(p.video.paused, false);
  p.video.emit('click');
  assert.equal(p.video.paused, true);
  p.visible(0); p.visible(1); await flush();
  assert.equal(p.video.paused, true, 'explicit frame tap pause persists');
  p.video.emit('click'); await flush();
  assert.equal(p.video.paused, false);
});

test('All server films: half-visible playback pauses and more than half visible playback resumes', async () => {
  const film = setup('uk');
  film.visible(0.51); await flush();
  assert.equal(film.video.paused, false);
  film.visible(0.50);
  assert.equal(film.video.paused, true, 'half-visible film must pause');
  for (const ratio of [0.49, 0.35, 0.1]) {
    film.visible(ratio); await flush();
    assert.equal(film.video.paused, true, 'film does not play at or below half visibility');
  }
  film.visible(0.51); await flush();
  assert.equal(film.video.paused, false, 'more than half visible film resumes');
});

test('AC1: automatic playback pauses offscreen and hidden, and resumes on return', async () => {
  const p = setup('uk');
  p.visible(true); await flush();
  assert.match(p.toggle.getAttribute('aria-label'), /^Пауза/);
  p.visible(false);
  assert.equal(p.video.paused, true);
  p.visible(true); await flush();
  assert.equal(p.video.paused, false);
  p.hidden(true);
  assert.equal(p.video.paused, true);
  p.hidden(false); await flush();
  assert.equal(p.video.paused, false);
  assert.equal(p.video.playCalls, 3);
});

test('AC4: exit and reenter during a pending play retry after AbortError', async () => {
  const p = setup();
  p.video.deferNext = true;
  p.visible(true);
  assert.equal(p.video.playCalls, 1);
  p.visible(false); p.visible(true);
  p.video.rejectPlay(Object.assign(new Error('interrupted by pause'), { name: 'AbortError' }));
  await flush();
  assert.equal(p.video.playCalls, 2, 'return during pending play must not strand the film');
  assert.equal(p.video.paused, false);
  assert.match(p.toggle.getAttribute('aria-label'), /^Pause/);
  assert.equal(p.status.textContent, '');
});

test('AC4: manual pause during pending play prevents the AbortError retry', async () => {
  const p = setup();
  p.video.deferNext = true;
  p.visible(true);
  p.toggle.emit('click');
  p.visible(false); p.visible(true);
  p.video.rejectPlay(Object.assign(new Error('interrupted'), { name: 'AbortError' }));
  await flush();
  assert.equal(p.video.playCalls, 1);
  assert.equal(p.video.paused, true);
  assert.match(p.toggle.getAttribute('aria-label'), /^Play/);
});

test('AC1/AC4: a tab returning during pending play retries after hidden-tab AbortError', async () => {
  const p = setup();
  p.video.deferNext = true;
  p.visible(true);
  p.hidden(true); p.hidden(false);
  p.video.rejectPlay(Object.assign(new Error('hidden tab interrupted play'), { name: 'AbortError' }));
  await flush();
  assert.equal(p.video.playCalls, 2, 'visible active tab must recover pending playback');
  assert.equal(p.video.paused, false);
});

test('AC2/ADR: explicit sound and unmuted playback resume quiet other films', async () => {
  const p = setup();
  p.visible(true); await flush();
  assert.equal(p.otherVideo.pauseCalls, 0, 'silent autoplay does not interrupt other films');
  p.sound.emit('click');
  assert.equal(p.video.muted, false);
  assert.equal(p.otherVideo.paused, true, 'visitor sound choice pauses other films');
  const before = p.otherVideo.pauseCalls;
  p.otherVideo.paused = false;
  p.visible(false); p.visible(true); await flush();
  assert.equal(p.video.muted, false, 'sound choice retained on return');
  assert.equal(p.video.paused, false);
  assert.equal(p.otherVideo.paused, true, 'resumed audible playback pauses other films');
  assert.ok(p.otherVideo.pauseCalls > before);
});
