"""Builds the size ladder every photograph is served in.

One file per photograph cannot serve a phone and a 4K display at once: the
phone downloads pixels it cannot show, and the big screen stretches what it
gets. So each picture is written out at a ladder of widths and the browser
picks the step that fits its own screen, through `srcset`.

Where the pixels come from
--------------------------
The ladder is built from the best source available for each picture:

  _originals/<same path as in media/, any extension>   <- preferred
  media/<path>                                          <- fallback

`_originals/` is not published and not committed (see .gitignore). Drop the
full-resolution exports there, mirroring the structure of `media/`, and the
base name decides the match — `_originals/photo/portraits/06-photo-sessions-
017.jpg` feeds `media/photo/portraits/06-photo-sessions-017.webp`. Anything
without an original is simply rebuilt from what is already in `media/`, which
still helps small screens even though it cannot add detail to large ones.

What is written
---------------
Steps below the source width only: a picture is never enlarged, because an
enlarged file is a bigger download of the same softness. The file already in
`media/` is left untouched and stays a step of the ladder — the top step when
there is no original, a middle one when there is.

Run from the repository root:  python3 scripts/build-image-ladder.py [--write]
Without --write it only reports what it would do.
"""
import json, os, sys
from PIL import Image

STEPS = [480, 960, 1440, 2400]
QUALITY = 80
CLOSE = 0.12          # a step within 12% of the source width is the source
ORIGINALS = '_originals'
SRC_EXT = ('.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp')


def media_files():
    for root, _dirs, files in os.walk('media'):
        for f in sorted(files):
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                stem, _ext = os.path.splitext(f)
                head, _, tail = stem.rpartition('-')
                # A step written by an earlier run, not a picture of its own.
                # The width alone does not prove it — 06-photo-sessions-480
                # could be a photograph — so the picture it was cut from must
                # be there too, under any of the extensions media/ holds.
                if tail.isdigit() and int(tail) in STEPS and any(
                        os.path.exists(os.path.join(root, head + e))
                        for e in ('.webp', '.jpg', '.jpeg', '.png')):
                    continue
                yield os.path.join(root, f)


def original_for(path):
    stem = os.path.splitext(path)[0]
    rel = os.path.relpath(stem, 'media')
    for ext in SRC_EXT:
        cand = os.path.join(ORIGINALS, rel + ext)
        if os.path.exists(cand):
            return cand
    return None


def main(write):
    ladder = {}
    made = kept = 0
    for path in media_files():
        base = Image.open(path)
        bw = base.size[0]
        src_path = original_for(path) or path
        src = Image.open(src_path)
        sw = src.size[0]
        url = '/' + path
        steps = {bw: url}
        for w in STEPS:
            if w >= sw * (1 - CLOSE):
                continue
            if abs(w - bw) <= bw * CLOSE:
                continue          # the file in media/ already covers this step
            out = f'{os.path.splitext(path)[0]}-{w}.webp'
            steps[w] = '/' + out
            if write and not os.path.exists(out):
                im = Image.open(src_path).convert('RGB')
                h = round(im.size[1] * w / im.size[0])
                im.resize((w, h), Image.LANCZOS).save(out, 'WEBP', quality=QUALITY, method=6)
                made += 1
            else:
                kept += 1
        if sw > bw:
            # the original carries more than media/ holds: write the top step too
            top = min(sw, STEPS[-1])
            out = f'{os.path.splitext(path)[0]}-{top}.webp'
            steps[top] = '/' + out
            if write and not os.path.exists(out):
                im = Image.open(src_path).convert('RGB')
                h = round(im.size[1] * top / im.size[0])
                im.resize((top, h), Image.LANCZOS).save(out, 'WEBP', quality=QUALITY, method=6)
                made += 1
        ladder[url] = [[w, steps[w]] for w in sorted(steps)]
    if write:
        with open('data/media-ladder.json', 'w') as fh:
            json.dump(ladder, fh, indent=1, sort_keys=True)
            fh.write('\n')
    widths = sorted({w for v in ladder.values() for w, _ in v})
    print(f'{len(ladder)} pictures, steps {widths}, {made} written, {kept} already there')
    if not write:
        print('dry run — pass --write to produce the files')


if __name__ == '__main__':
    main('--write' in sys.argv)
