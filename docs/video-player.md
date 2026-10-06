# Seamless server video player

## Brief and terms
Server video means an existing `cf` item with a direct MP4 URL. Highlight means the project cover; player means the inline film on a project or catalogue page.
Goal: films feel part of the page and start silently without a poster click. Playback and sound remain under visitor control.

## Specification
- AC1: direct server films play inline, muted by default, when at least 35% of their frame is visible; pause outside the viewport and while the tab is hidden. A visitor's explicit pause persists while scrolling.
- AC2: no native control bar. Two accessible icon buttons sit above the frame at its right edge: play/pause and sound on/off. Labels reflect actual state in EN/UA; each hit target is at least 44px.
- AC3: a slender timeline overlays the bottom of the frame. Progress updates per animation frame during playback; pointer dragging, touch and keyboard seeking work. Seeking clamps to duration and never produces invalid times.
- AC4: blocked autoplay or failed media leaves working manual controls; loading and errors are communicated without claiming playback succeeded.
- AC5: preserve original dimensions, posters, URLs and project ordering. Load a source only near the viewport; use existing MP4 range support. No runtime dependencies.
- Non-goals: migrate YouTube/Vimeo sources, alter video files, add new hosting or introduce a framework.
- Success: real browser time advances silently; pause stops time; unmute changes actual media state; seeking changes actual currentTime; offscreen/hidden videos stop.

## Architecture / ADR
Extend the existing static generator and player module. Render semantic video, buttons and range input for `cf` items. Native controls are removed during JS initialization. A noscript direct-file link provides playback without JavaScript. IntersectionObserver governs visibility; video events govern UI state; requestAnimationFrame paints the timeline. Keep existing third-party embeds and their mutual pause behavior.
Data/API contract: existing `platform: cf`, `src`, `poster`, `title`; no schema or server changes. Range input is 0..1000, mapped to finite media duration.

## Tasks
1. Acceptance tests from AC1–AC5; demonstrate RED.
2. Static markup and styling for AC2–AC3, then runtime state and visibility for AC1/AC4.
3. GREEN, existing CI gates, independent review, browser proof, commit and live publication.

## Review log
- Contract review: confirmed all existing direct server videos; user confirmed visible-only playback. Reviewer accepted the contract; native controls are only a pre-initialization fallback.

## Browser gate
Observe `currentTime` twice to confirm silent autoplay, click pause and compare stable time, enable sound and read `muted`, seek by pointer and by ArrowRight, scroll to a later film and confirm the first paused. Repeat at a mobile viewport, check no horizontal overflow and 44px controls. Verify pause survives leaving and returning to the viewport. Published proof repeats actual playback on the live site; CI alone is insufficient.

- Runtime review: fixed audible resume mutual pause, viewport pending-play cancellation and hidden-tab pending-play cancellation. Separate regression tests confirm retry and manual pause precedence.
- Local browser: real MP4 time advances muted; pause remains stable across scrolling; sound toggle changes muted; keyboard seek and pointer drag change currentTime; 390px mobile and vertical Reels have no horizontal overflow, controls are 44px.
- Final gate: independent reviewer PASS after fixes; 45 tests pass including 8 runtime regressions. Source syntax and diff whitespace checks pass. No video assets or hosting changes.

## Refinement (2026-10-01)
User clarification: omit visible film captions only on EN/UA `/work/reels/`. For ALL server videos: omit timeline and clock, loop natively, tapping the video toggles playback through the same manual-pause state as the toolbar button. Pause when 50% or less of the frame is visible; resume automatically above 50% unless manually paused. This supersedes AC3 and the 35% threshold in AC1. Other project captions remain. Preserve posters, source URLs, accessible toolbar labels and original files.
- Refinement gate: 46 tests pass, independent review PASS. Mobile browser verified tap pause/resume, no captions/timeline/clock on Reels, actual native loop after full 32-second playback, pause at 47% visible and resume above 50%. Ordinary captions remain covered by bilingual acceptance tests.

## Refinement (2026-10-02) — one film at a time
User report: video start-up felt chaotic — several server films played at once, YouTube and server films ignored each other, and on the phone a film half hidden under the sticky bar kept playing. User chose «one film at a time», resuming where a film stopped.
- V1: of the server films more than half in view, only the one nearest the middle of the visible area (below the sticky bar) plays on its own; the others hold still. A centred film paused by hand does not hand playback to a neighbour. In a two-column row a tie goes to reading order.
- V2: tapping play on any film makes it the one that plays; it keeps the turn while it stays more than half in view; everything else, YouTube included, gives way.
- V3: sound turned on carries to the next film that plays; only one film is ever heard. A browser that refuses sound plays the film muted instead (remembered for that film until the visitor turns sound on again).
- V4: YouTube and Vimeo start only from a tap; while one plays, server films hold still; once half of it is out of view it pauses (Vimeo is taken back to its poster) and the server film in view resumes.
- V5: a film resumes where it stopped (no reset on return).
- Visibility excludes the sticky bar at the top of a phone screen (fix 2026-10-02: a film half under the bar kept playing).
- Home stage previews (desktop hover, six-second clips in `media/video/previews/`) are separate from page films and unaffected.
- Gate: `tests/video-focus.test.mjs` (V1–V5, written first, RED on 5 of 7 before the change) plus the existing 8 runtime regressions; real Chrome on the kmbs page (one film at a time, sound carried, mobile and desktop) and on `/video/` (YouTube pauses the server film, scrolling YouTube away resumes it).

## Desktop hover playback (2026-10-06)
- H1: on desktop layouts (at least 61rem) with a fine pointer and hover support,
  a visible server film starts automatically only while its player or toolbar
  is hovered. Enter starts/resumes; leave pauses without resetting its time.
- H2: scrolling or returning to a tab alone cannot start a desktop film. The
  existing visibility, explicit-pause and one-film-at-a-time rules still apply.
  Leaving during a pending play request must not strand playback on reentry.
- H3: touch/tablet/mobile films stay on their poster until the visitor taps
  play or the film. Visibility, scrolling and returning to a tab never start
  them automatically. Switching input/layout mode pauses automatic playback.
  Explicit play/pause controls remain usable with mouse, touch and keyboard.
- Scope: project and video catalogue server players in both languages. YouTube
  and Vimeo keep their click-to-play behavior; homepage collage playback is unchanged.
- H4: defer direct video sources until hover/manual play. Keep a separate photo
  poster visible until the first real playing event, including during loading or
  a rejected play request; restore it after a media error. Pausing retains the
  last decoded frame. This protects the loading state from a blank native video.
- Navigation: main/secondary rail links and Rates & Terms show a dash on hover;
  Rates & Terms also uses the same active-page dash as the main rail.
  No video assets, source URLs, player geometry or new dependencies change.
- Gate: independent RED/GREEN and final review; 101 Node tests pass in a clean
  export. Local browser confirms an untouched neighbour has no MP4 source,
  hover advances real time, leave holds that time, and a coarse-pointer tablet
  remains on posters until explicit play. After scrolling away and returning,
  touch playback remains paused. Poster changes only after actual playback.
