# word&music design case — system story

## Brief

Owner, 3 October 2026. The current case at `/work/wordmusic-design/` is six
posters in a row; it shows neither the typeface nor the system nor how it
works. Rebuild it as the story of the system: mark → Tembrava Display →
system → one event in every format → a second event → licence.

Decisions: structure "history of the system"; the typeface is shown as live
text in a **subset** of Tembrava Display Retail 1.0 (only the characters the
page needs, no logo glyphs); material from the concerts "На крилах кохання"
(15.10.2026) and "Vivre, Aimer, Rêver…" (03.10.2026). Archive posters
2023–2025 leave this page and wait for a separate archive page.

## Non-goals

No archive page now. No new CSS framework, no client-side rendering. No
change to other cases, the concert-video project `word-and-music`, or the
licence page. No font file other than the subset is published.

## Acceptance criteria

**AC1. Story order.** `/work/wordmusic-design/` (EN) and
`/ua/work/wordmusic-design/` (UA) render, after the existing project head,
chapters with `<h2>` headings in this order, each chapter a `<section>` with
`data-chapter` set to: `mark`, `typeface`, `system`, `in-use`,
`second-event`. Headings EN: "Mark", "Tembrava Display", "System",
"One concert, every format", "Vivre, Aimer, Rêver…"; UA: "Знак",
"Tembrava Display", "Система", "Один концерт — усі формати",
"Vivre, Aimer, Rêver…". The project head keeps title `word&music`, the
client and the role as today.

**AC2. Marks.** The `mark` chapter shows the three marks — word&music,
w&m, wm — as inline `<svg>` elements with `role="img"` and an
`aria-label` naming the mark, each drawn on a light and on a dark ground
(six SVG marks total). The paths come from the Full 1.0 font outlines
(`wordmusic.logo`, `wandm.logo`, `wm.logo`), stored in
`data/wordmusic-marks.json` with the source font SHA-256
`8ac4d914…` prefix recorded. No raster and no font is used for the marks.

**AC3. Live typeface, subset only.**
- The page loads exactly one Tembrava font file:
  `/fonts/tembrava-case-<8 hex>.woff2`, via an `@font-face` with
  `font-display: swap` that appears only on the two case pages (not in
  `styles/site.css`, not on any other page).
- Every element with class `tembrava` on either page is set in that face, and
  the union of characters in those elements is covered by the subset's cmap.
- The subset's cmap contains no character outside that union plus U+0020,
  no PUA (U+E000–U+F8FF), and at most 120 code points; it has no glyph named
  `*.logo` and no `dlig` feature.
- The subset is derived from Tembrava Display Retail 1.0 (name ID 5
  `Version 1.000`, family `Tembrava Display Retail`).
- The specimen contains live Cyrillic and Latin text and figures, the title
  of each concert, and a demonstration of `ss01` (the classic Л/Д) using
  `font-feature-settings` on live text.
- The full alphabet, if shown, is vector `<svg>`, not live text.

**AC4. dlig explained without the Full font.** The `typeface` chapter shows
that typing `word&music` in the Full build becomes the mark: the typed text
in the subset face next to the SVG word&music mark. Text says the
substitution exists in the internal Full build and that the Retail build
for sale has no marks.

**AC5. System.** The `system` chapter shows: colour palettes of both concerts
in light and night variants as swatches with visible hex values (at least
4 swatches per concert, values sampled from the published exports and
recorded in data with their source file); the type hierarchy (title,
subtitle, names, details) as live text; the form of each concert (heart and
ellipse) as images cropped from the exports.

**AC6. One concert, every format.** The `in-use` chapter shows all 16 current
exports for "На крилах кохання": two A2 posters (420×594 mm trim, without
the 3 mm print bleed), light/night pairs of 4:5 posts, 9:16 stories and
16:9 EventMate banners, four 4:5 carousel slides and their four 9:16 story
versions. Both languages name A2 and the four-slide carousel. The obsolete
broken `02-POST-NIGHT-4x5.png` is excluded; the fixed October JPEG is used.
Every updated asset, the heart crop and case cover has a new URL and a
responsive ladder. Previous WebP files remain available.

**AC7. Second event.** The `second-event` chapter shows 2–3 applications of
"Vivre, Aimer, Rêver…" from the final renders (`04_Фінальні_рендери`, re-exported 3 October 2026), at least
one light and one night.

**AC8. Images.** Every image is a local WebP under `/media/design/cases/`
with a srcset ladder entry and width/height; all are in `p.media` and drawn
inside a `.design-frame` (existing design-case contract: static, no
lightbox). The archive posters `word-and-music-06.webp` and
`word-and-music-07.webp` are not rendered on the case page; the files remain
in the repository. Alt text exists in both languages' pages.

**AC9. Links.** The page links to the licence page in its own language
(`/tembrava/license/` or `/ua/tembrava/license/`) and to
`https://wordandmusic.art/`.

**AC10. Quality gates.** Existing tests pass (`tests/design-cases.test.mjs`
included); `SITE_ENV=live node scripts/build.mjs` is idempotent; no
horizontal overflow at 375 px; no private paths; design bans: no cream page
background added, no italic in headings, no "01/02/03" labels, no monospace
labels, no pill buttons.

## Data model

`data/design-projects.json` keeps the case; `media` lists every image. A new
`story` array drives the chapters and refers to media by id. Marks:
`data/wordmusic-marks.json`. Palettes and specimen text: inside `story`.

## Review log

- 8 October 2026: owner rejected equal outer frames because the coloured
  artwork rectangles still had different proportions. Both images now render
  in the ellipse's native 40:21 landscape format with the same edge positions.
  Heart framing at 58% vertical position trims empty ground above and below
  while keeping the complete layered-heart motif and staves. Ellipse framing
  retains its full native image. The former square-frame treatment is removed.
  Independent review of desktop/mobile screenshots and original artwork PASS:
  complete motifs and staves remain visible, without distortion. Actual coloured
  images measure 553.60×290.63 px on desktop and 311.56×163.57 px at 375 px
  mobile, with matching edges. All 101 Node acceptance checks pass.

- 8 October 2026: the owner flagged unequal heart/ellipse panel heights.
  The system chapter now uses equal square frames with centered, contained
  artwork and matching caption positions. Other format groups retain their
  native proportions. Browser checks found equal 558.65 px square panels
  and matching caption tops on desktop; the UA mobile page at 375 px has
  equal 335.56 px square panels and no horizontal overflow. Independent
  visual review PASS; all 101 Node acceptance checks pass.

- 7 October 2026: refresh from `20261015_На_крилах_кохання/03_Експорт`:
  14 JPEGs in `01_Social`, plus the LIGHT/NIGHT A2 JPEGs in `02_Afisha`.
  Keep the five-chapter story, marks, Retail subset and Vivre applications.
  Render light/night pairs followed by the carousel and its story versions.
  Crop only print bleed from A2. The heart detail comes from
  `05-EVENTMATE-LIGHT-16x9.jpg`; update the existing case-cover composition
  with the new post pair and banner. The On the Wings of Love palette now
  samples the post JPEGs at (4200,120), (4200,5500), (2250,700); ink is the
  most frequent pixel in (200,700)–(2400,2500). These are export samples,
  not a replacement for the brand's colour specification. Originals stay
  in the source folder; old web exports remain in Git. Database/API and
  new interaction contracts: N/A (static media/data refresh).

- 3 October 2026: owner chose structure A1, live subset typeface, materials
  from 15.10 and Vivre, Aimer, Rêver. Discovery found the broken logo in
  `02-POST-NIGHT-4x5.png` (15.10); excluded from the page.
- 3 October 2026: concert renders re-exported by the owner; media rebuilt
  from `03_Експорт` (15.10) and `04_Фінальні_рендери` (Vivre). A3 PNGs are
  now 72 dpi, so A3 posters and form crops are rendered from the vector
  `All-Artboards.pdf` at 300 dpi. Owner removed the post with the soloists'
  photographs from the page. Published without the independent review
  (reviewer unavailable, session limit); owner approved publishing.
- 3 October 2026: independent review — ACCEPTED WITH REMARKS. Fixed before
  merge: deterministic subset build (source timestamps kept), `lang` on
  Ukrainian/French/English fragments, build fails without the subset,
  validated chapter/colour/path data, three-up formats row, alphabet lines
  scroll inside their band on phones, ground outlines, pinned fontTools in
  CI, unverified "23 languages" claim removed. Open for the owner: the
  alphabet is drawn as SVG outlines of every basic glyph (allowed by AC3).

- 7 October 2026: independent review PASS. All 16 hashed JPEG sources
  match the new WebPs; only A2 bleed is trimmed. Actual image headers and
  responsive-rung proportions pass. Existing marks, subset and Vivre data
  are unchanged. 101 Node checks, 10 font checks and 5 licence checks pass;
  live build is byte-idempotent. Browser checks at 1440 and 374 CSS px
  show complete A2 panels and no horizontal overflow. Inventory tests
  exclude ignored local worktrees from the published-font scan.
