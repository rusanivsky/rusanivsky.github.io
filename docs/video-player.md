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
