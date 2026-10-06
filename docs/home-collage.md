# Desktop home collage

Scope: replace the hover-switched right stage on both home languages with one
persistent collage. Keep the existing desktop breakpoint (61rem), fixed panel,
left list, navigation and mobile previews. Use existing featured-project media;
no new background, typography, labels, cropping or source-media changes.

Acceptance:
- C1: one composition, at least one linked tile per featured project; hover/focus
  on the list never replaces or rearranges it. Images retain native proportions.
- C2: existing lightweight local video previews play together, muted, inline,
  looping, automatically on desktop. Posters remain on autoplay failure.
- C3: no preview video requests on mobile, reduced-motion or Save-Data. Hidden
  documents pause; returning resumes unless the reader paused playback.
- C4: a localized keyboard-accessible pause/resume button controls animation.
- C5: EN/UA parity, unchanged mobile row previews and working project links.
- C6: desktop list titles are gray until hover/keyboard focus. A separate single
  project cover appears near the pointer (reference: ASOT Episodes), never
  replacing the collage or intercepting clicks. Hide on leave, scroll, Escape
  and blur. Mobile gets no floating preview.

Implementation: static build produces the collage from featured projects and
stage picks. Three balanced columns share one aspect-ratio canvas fitted inside
the panel, preserving each frame. Runtime owns only video lifecycle. Existing
short previews total about 1.1 MB; never request full films. No API/DB contract,
new dependencies or service endpoints (N/A).

Verification: independent acceptance tests and review, existing CI suite,
deterministic production build, desktop/mobile browser and live deployment.

Review and verification (2026-10-06):
- Independent contract and implementation review: no blocking findings.
- Independent RED → GREEN: 14 collage tests; gallery-build 10 and Street 7 pass.
- Browser: 1280×720 and 1600×1000 desktop; UA links and loaded images;
  both videos playing muted/looping; pause control; floating hover image.
- 390×844 mobile: original row strips, no horizontal page overflow, stage hidden,
  zero mounted preview videos after resizing.
- Local full suite encounters an unrelated nested `.claude/worktrees` scan;
  production CI runs from a clean checkout. System Python lacks fontTools;
  CI installs its pinned font dependencies for those unchanged font checks.
