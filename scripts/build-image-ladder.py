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

What the top step carries
-------------------------
Only the widest step keeps the photograph's authorship, because that is the
file someone saves when they save the picture; the smaller steps stay bare,
where a tag block would weigh more than half the image. The block is built
from scratch rather than copied: an untouched original carries the camera's
serial number, the lens's serial number, the internal file name and, in a
third of this archive, GPS to the metre with the hour of the shoot. None of
that belongs on a public page, so KEEP_ROOT and KEEP_EXIF below name the tags
that do — everything not named is dropped.

Run from the repository root:  python3 scripts/build-image-ladder.py [--write]
Without --write it only reports what it would do.
"""
import json, os, sys
from PIL import Image

STEPS = [480, 960, 1440, 2400]
# Author, camera, and how the frame was taken. Named by their EXIF tag ids so
# nothing else can arrive by accident: no GPS, no serial numbers, no software
# or raw file name.
KEEP_ROOT = {
    0x010F: 'Make', 0x0110: 'Model', 0x0112: 'Orientation',
    0x013B: 'Artist', 0x8298: 'Copyright',
}
KEEP_EXIF = {
    0x829A: 'ExposureTime', 0x829D: 'FNumber', 0x8827: 'ISOSpeedRatings',
    0x9003: 'DateTimeOriginal', 0x920A: 'FocalLength', 0xA434: 'LensModel',
}
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
                # be there too, under any of the extensions media/ holds, and
                # the width must be one this script would have written for it:
                # a STEP, or that picture's top step. The top is min(source
                # width, 2400), so an original narrower than 2400 leaves a
                # file like -2048 or -1620 that is a step all the same.
                # Matching STEPS alone mistook those for photographs and gave
                # each a nested ladder; skipping every -<digits> file instead
                # swallowed real pictures such as the portrait's photo-768.
                if tail.isdigit() and any(
                        int(tail) in (STEPS + [top_width(base)])
                        for base in (os.path.join(root, head + e)
                                     for e in ('.webp', '.jpg', '.jpeg', '.png'))
                        if os.path.exists(base)):
                    continue
                yield os.path.join(root, f)


def authorship(path):
    """The tags KEEP_ROOT and KEEP_EXIF name, as an EXIF block — about 300
    bytes against the 12 kB an untouched original carries. Empty when the
    source has no EXIF at all, which is every picture rebuilt from media/."""
    try:
        full = Image.open(path).getexif()
    except Exception:
        return None
    if not full:
        return None
    out = Image.Exif()
    for tag in KEEP_ROOT:
        if tag in full:
            out[tag] = full[tag]
    sub = full.get_ifd(0x8769)
    kept = {tag: sub[tag] for tag in KEEP_EXIF if tag in sub}
    if kept:
        out[0x8769] = kept
    return out.tobytes() if len(out) else None


def top_width(path):
    """The widest step this script writes for a picture: its source, capped."""
    src = original_for(path) or path
    with Image.open(src) as im:
        return min(im.size[0], STEPS[-1])


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
        # The widest step this picture gets, wherever it ends up being written:
        # a source wider than about 2730px reaches 2400 through the loop below,
        # a narrower one only through the branch after it. Authorship rides on
        # that step alone, so both writers have to know which one it is.
        top = min(sw, STEPS[-1]) if sw > bw else bw

        def cut(width, out):
            im = Image.open(src_path).convert('RGB')
            h = round(im.size[1] * width / im.size[0])
            tags = authorship(src_path) if width == top else None
            kw = {'exif': tags} if tags else {}
            im.resize((width, h), Image.LANCZOS).save(
                out, 'WEBP', quality=QUALITY, method=6, **kw)

        for w in STEPS:
            if w >= sw * (1 - CLOSE):
                continue
            if abs(w - bw) <= bw * CLOSE:
                continue          # the file in media/ already covers this step
            out = f'{os.path.splitext(path)[0]}-{w}.webp'
            steps[w] = '/' + out
            if write and not os.path.exists(out):
                cut(w, out)
                made += 1
            else:
                kept += 1
        if sw > bw:
            # the original carries more than media/ holds: write the top step too
            out = f'{os.path.splitext(path)[0]}-{top}.webp'
            steps[top] = '/' + out
            if write and not os.path.exists(out):
                cut(top, out)
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
