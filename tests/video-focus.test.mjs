// One film at a time (docs/video-player.md, refinement 2026-10-02, V1–V5).
// Several server players on one page, driven only through DOM events,
// observer entries, frame geometry and scroll — never private functions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../scripts/site.js', import.meta.url), 'utf8');
const start = source.indexOf('var serverPlayers =');
const end = source.indexOf('var ytWraps =', start);
assert.ok(start >= 0 && end > start, 'standalone server-player module exists');
const code = source.slice(start, end);
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };

class Element extends EventTarget {
  constructor() {
    super();
    this.attrs = new Map();
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {}, contains() { return false; } };
    this.textContent = '';
  }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  emit(name) { this.dispatchEvent(new Event(name)); }
}

const VIEW = 800;
function setup(tops) {
  const document = new Element();
  document.hidden = false;
  document.documentElement = { lang: 'en' };
  const win = new Element();
  win.innerHeight = VIEW;
  const films = tops.map((top, i) => {
    const video = new Element();
    Object.assign(video, { title: `Film ${i}`, currentTime: 0, paused: true, muted: true, ended: false, error: null, playCalls: 0, blockSound: false });
    video.dataset.src = `https://example.test/${i}.mp4`;
    Object.defineProperty(video, 'src', { set(v) { this.setAttribute('src', v); }, get() { return this.getAttribute('src'); } });
    video.play = function () {
      this.playCalls++;
      if (!this.muted && this.blockSound) {
        return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
      }
      this.paused = false;
      this.emit('play');
      this.emit('playing');
      return Promise.resolve();
    };
    video.pause = function () { const was = !this.paused; this.paused = true; if (was) this.emit('pause'); };
    video.load = function () { this.error = null; };
    const frame = new Element();
    frame.top = top;
    frame.getBoundingClientRect = function () { return { top: this.top, bottom: this.top + 400, left: 0, right: 400, width: 400, height: 400 }; };
    const toggle = new Element(), sound = new Element(), status = new Element(), shell = new Element();
    const children = { 'video.cf-video': video, '.player': frame, '.video-toggle': toggle, '.video-sound': sound, '.video-status': status };
    shell.querySelector = (sel) => children[sel];
    return { video, frame, toggle, sound, shell };
  });
  document.querySelectorAll = (sel) => (sel === '.server-player' ? films.map((f) => f.shell) : []);
  const observers = [];
  class Observer {
    constructor(callback, options) { this.callback = callback; this.options = options || {}; observers.push(this); }
    observe() {}
    unobserve() {}
  }
  const media = new Element(); media.matches = true; win.matchMedia = () => media;
  vm.runInNewContext(code, {
    document, matchMedia: () => media, window: Object.assign(win, { IntersectionObserver: Observer }), IntersectionObserver: Observer,
    requestAnimationFrame: (f) => { f(); return 1; }, cancelAnimationFrame() {}, getComputedStyle: () => ({ display: 'block' }),
    quietOthers() {}, setTimeout, clearTimeout,
  });
  const visibility = observers.find((o) => 'threshold' in o.options);
  const show = (i, ratio) => visibility.callback([{ target: films[i].frame, isIntersecting: ratio > 0, intersectionRatio: ratio }]);
  const scrollTo = (newTops) => { newTops.forEach((t, i) => { films[i].frame.top = t; }); win.emit('scroll'); };
  const playing = () => films.map((f) => (f.video.paused ? '-' : 'P')).join('');
  return { hover(i, value = true) { films[i].shell.emit(value ? 'pointerenter' : 'pointerleave'); }, films, show, scrollTo, playing, win, document };
}

test('H1/V1: visible films stay still until hovered; only hovered film plays', async () => {
  const p = setup([60, 420]);
  p.show(0, 1); p.show(1, 0.9); await flush(); assert.equal(p.playing(), '--');
  p.hover(0); await flush(); assert.equal(p.playing(), 'P-');
  p.scrollTo([-120, 240]); await flush(); assert.equal(p.playing(), 'P-', 'scroll cannot hand playback to unhovered neighbour');
  p.hover(0, false); p.hover(1); await flush(); assert.equal(p.playing(), '-P');
});

test('V1: a film manually paused at the centre does not hand playback to its neighbour', async () => {
  const p = setup([200, 640]);
  p.show(0, 1); p.show(1, 0.6); p.hover(0); await flush();
  assert.equal(p.playing(), 'P-');
  p.films[0].toggle.emit('click'); await flush();
  assert.equal(p.playing(), '--', 'nothing starts in its place');
});

test('V2: tapping play on another film makes it the one that plays', async () => {
  const p = setup([60, 420]);
  p.show(0, 1); p.show(1, 0.9); p.hover(0); await flush();
  assert.equal(p.playing(), 'P-');
  p.films[1].video.emit('click'); await flush();
  assert.equal(p.playing(), '-P', 'the tapped film plays and the other stops');
  p.scrollTo([50, 410]); await flush();
  assert.equal(p.playing(), '-P', 'a small scroll does not take it back');
  p.show(1, 0.3); await flush();
  assert.equal(p.films[1].video.paused, true, 'the chosen film still stops when half hidden');
});

test('V3: sound turned on carries to the next film that plays', async () => {
  const p = setup([200, 1200]);
  p.show(0, 1); p.hover(0); await flush();
  p.films[0].sound.emit('click');
  assert.equal(p.films[0].video.muted, false);
  p.show(0, 0); p.scrollTo([-800, 200]); p.show(1, 1); p.hover(1); await flush();
  assert.equal(p.films[1].video.paused, false);
  assert.equal(p.films[1].video.muted, false, 'next film starts with sound');
  assert.equal(p.films[0].video.paused, true, 'only one film is ever heard');
});

test('V3: a browser that refuses sound still plays the film muted', async () => {
  const p = setup([200, 1200]);
  p.films[1].video.blockSound = true;
  p.show(0, 1); p.hover(0); await flush();
  p.films[0].sound.emit('click');
  p.show(0, 0); p.scrollTo([-800, 200]); p.show(1, 1); p.hover(1); await flush();
  assert.equal(p.films[1].video.paused, false, 'film plays');
  assert.equal(p.films[1].video.muted, true, 'muted after the refusal');
});

test('V4: while a YouTube film plays, server films hold still', async () => {
  const p = setup([200, 1200]);
  p.show(0, 1); p.hover(0); await flush();
  assert.equal(p.playing(), 'P-');
  p.win.krVideoExternal(true); await flush();
  assert.equal(p.playing(), '--', 'the server film yields');
  p.show(0, 0.4); p.show(0, 1); p.scrollTo([210, 1210]); await flush();
  assert.equal(p.playing(), '--', 'scrolling does not restart it');
  p.win.krVideoExternal(false); await flush();
  assert.equal(p.playing(), '--', 'offscreen cleared hover intent');
  p.hover(0); await flush(); assert.equal(p.playing(), 'P-');
});

test('V5: a film resumes where it stopped', async () => {
  const p = setup([200, 1200]);
  p.show(0, 1); p.hover(0); await flush();
  p.films[0].video.currentTime = 12.5;
  p.show(0, 0); p.show(0, 1); p.hover(0); await flush();
  assert.equal(p.films[0].video.paused, false);
  assert.equal(p.films[0].video.currentTime, 12.5);
});
