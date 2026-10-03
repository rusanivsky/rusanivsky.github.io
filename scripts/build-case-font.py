"""Builds the one Tembrava Display file this site publishes.

The word&music case sets its specimen in the typeface itself, as live text.
Live text needs a font, and the font is a product for sale — so the page gets
a subset that holds only the characters these two pages set in it, and the
layout features the specimen shows (kern, liga, ss01). It is enough to read
the page and not enough to set anything else: no marks, no dlig. (The page
draws the alphabet as SVG outlines, which is a picture of the face, not a
font.)

The characters are read from the `story` of the case in
data/design-projects.json — every string the renderer puts inside a
`.tembrava` element — so a change of wording there needs a rebuild here.

The file name carries the first 8 hex of its SHA-1, the same short hash the
rest of the site uses for cache-busting, and older subsets are removed. The
head timestamps are kept from the source, so the same input always gives the
same bytes and the same name.

Source: Tembrava Display Retail 1.0 (OTF, CFF), which is not in this
repository. Requires fontTools and brotli.

Run from the repository root:
  python3 scripts/build-case-font.py /path/to/TembravaDisplayRetail-Regular.otf
"""
import hashlib, io, json, os, sys
from fontTools import subset
from fontTools.ttLib import TTFont

SLUG = 'wordmusic-design'
OUT_DIR = 'fonts'
PREFIX = 'tembrava-case-'
FEATURES = ['kern', 'liga', 'ss01']


def tembrava_text(story):
    """Every string the case renderer sets in a .tembrava element."""
    out = []
    for c in story:
        if c['chapter'] == 'typeface':
            out += c['specimen'] + [c['specimenLine'], c['ss01']['text'], c['dlig']['typed']]
        if c['chapter'] == 'system':
            out += [h['text'] for h in c['hierarchy'] if h.get('face') == 'tembrava']
    return out


def main(src):
    with open('data/design-projects.json', encoding='utf-8') as fh:
        projects = json.load(fh)
    story = next(p for p in projects if p['slug'] == SLUG)['story']
    chars = sorted({ch for s in tembrava_text(story) for ch in s if not ch.isspace()} | {' '})

    font = TTFont(src, recalcTimestamp=False)
    family = font['name'].getDebugName(1)
    version = font['name'].getDebugName(5) or ''
    if family != 'Tembrava Display Retail' or not version.startswith('Version 1.000'):
        sys.exit(f'{src}: {family!r} {version!r}, expected Tembrava Display Retail 1.000')

    opts = subset.Options()
    opts.layout_features = FEATURES
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.glyph_names = True
    opts.flavor = 'woff2'
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=[ord(c) for c in chars])
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    data = buf.getvalue()

    name = f'{PREFIX}{hashlib.sha1(data).hexdigest()[:8]}.woff2'
    for old in os.listdir(OUT_DIR):
        if old.startswith(PREFIX) and old != name:
            os.remove(os.path.join(OUT_DIR, old))
            print('removed', old)
    with open(os.path.join(OUT_DIR, name), 'wb') as fh:
        fh.write(data)
    print(f'{OUT_DIR}/{name}: {len(chars)} code points, {len(data)} bytes')
    print(''.join(chars))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
