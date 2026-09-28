# Photography gallery contract

The approved editorial gallery keeps every photograph at its native aspect
ratio and in its existing source sequence. It changes presentation, not the
selection, source files, lightbox order or project copy.

## Acceptance

- Photography project pages show the complete series without captions or
  visible numbering. Series is the default editorial composition; Index gives
  a denser overview of the same frames. Controls are localized in EN/UA and
  appear only when the layout is initialized and there are more than three frames.
- Packing responds to the gallery width, preserves full frames, and avoids
  overlaps. The initial image sizes estimate half the page; the runtime sets
  each image's sizes to its rendered pixel width.
- Direct lightbox anchors retain source order and native image dimensions.
  Without JavaScript, every image and link remains available in a two-column
  flow grid (one column on small screens), with the mode controls hidden.
- Photography stages on the homepage show at most three frames with native
  proportions. A single frame retains the existing area-based solo scale;
  two frames share a height and sit side by side without cropping. Video and
  design stages retain their existing selection and composition.
- Existing entrances, keyboard navigation, lightbox behavior, first-stage
  eager loading and the phone loading guard remain intact. Gallery frames and
  photography stage frames do not zoom on hover.

## Author hints

`data/gallery-layout.json` is an optional object keyed by the exact project
slug. The default `{}` uses automatic composition and cover-first selection.
Only paths already belonging to that project are used; assets and sequence
files must not be changed to introduce layout hints.

```json
{
  "project-slug": {
    "hero": ["/assets/example.jpg"],
    "stage": ["/assets/example.jpg", "/assets/second.jpg", "/assets/third.jpg"]
  }
}
```

`hero` marks existing gallery frames as preferred composition accents; it does
not reorder the source. Non-array hints are ignored. `stage` is an ordered
selection of up to three existing project frames. Duplicates count once.
A valid one-frame or two-frame selection stays intentionally small. If some
paths are stale, valid selections lead and the remaining slots (up to the
requested unique count, capped at three) are filled from unselected frames
in stable cover-first order. If no valid paths remain, the cover leads followed
by the first other frames, up to three. An absent stage hint uses that same
fallback, so appending frames does not change a full three-frame selection.

The build calls the shared `composeStage(photos, 1000, 14)` with `{n, w, h}`
records and converts returned tile geometry to percentages. Runtime galleries
use the same module's `compose` geometry. Placement uses left/top/width/height;
transforms remain owned by the existing entrance effects.
