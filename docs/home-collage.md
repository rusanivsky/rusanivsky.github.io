# Desktop home collage — responsive revision

Scope: keep one fixed art collage on EN/UA home, replacing the former
hover-switched stage. Current revision removes the floating hover image,
replaces YouTube artwork with real photographs, adds a third landscape video with full-length loops,
and adapts the composition to the available viewport. Gray titles still become
active on hover/focus. Mobile row previews are unchanged.

Acceptance:
- C1: one shared media canvas, no slideshow or floating hover image. Images keep
  their original proportions. Links go to the project that owns the media.
- C2: 61–79.99rem: 2 columns/8 frames (6 photos, 2 videos); 80–111.99rem: 3 columns/14 frames;
  112rem and above: 4 columns/18 frames (15 photos, 3 videos). Below 61rem the stage stays hidden.
  Breakpoints use CSS width: a Retina 4K monitor at 1920 logical pixels therefore
  receives 4 columns. In the 2-column composition the last speaker photo finishes
  the left column.
- C3: 15 genuine photographs and 3 local video posters overall; no YouTube
  thumbnail in the collage. Hidden extra photos use a blank picture source.
- C4: two muted inline full-length looping videos appear in the compact layout;
  three appear in the 3- and 4-column layouts. The third is replaced by a photo
  and its source is unloaded below 80rem.
  Video positions are separated by photos.
- C5: no video loads on mobile, reduced-motion, or Save-Data; pause/resume control,
  hidden-tab pause, poster fallback on playback rejection/error remain.
- C6: hide the poster pixels when video is playing so fractional-size rounding
  cannot expose a thin strip of the poster at the edge. The fallback node stays.
- C7: EN/UA parity, all project-list links and mobile previews remain intact.

Design: unequal columns with staggered starts; no cropping, new background,
font, decorative frame, numbering or pill controls. Static build emits three
geometries on the same nodes; CSS selects one. No API/DB/dependency changes.

Full-length loops: derived from the existing owned Cloudflare project sources;
no scenes trimmed. H.264 at 24fps, no audio/data streams, faststart. Original
films and original six-second preview files remain unchanged. Collage uses
new `-loop.mp4` files only; no full-resolution source is requested by the page.

| Video | Source duration | Loop duration | Output | Bytes |
| --- | ---: | ---: | --- | ---: |
| DAS graduation episode 3 | 160.958s | 160.916667s | 640×360 | 4888316 |
| Dyvoshyv | 32.062s | 32.041667s | 360×640 | 1236989 |
| SSA Start 2025 | 97.193s | 97.166667s | 640×360 | 3240613 |

Durations and video-only streams verified by ffprobe; small duration differences
come from source audio/container lengths and 24fps frame quantization.

Verification: independent RED/GREEN tests and final review; responsive browser
checks at tablet-like desktop, ordinary desktop and 3840×2160, mobile unchanged;
production CI, deployment and live browser verification.
