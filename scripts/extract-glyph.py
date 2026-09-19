"""
Pulls real glyph outlines out of the very woff2 the site serves.

The mark has to be real letters, not a drawing that resembles them — so the
contours come out of a woff2 the site itself serves, instantiated at the
weight the mark is set in, and are composed using the font's own advance
widths and kerning rather than by eye.

    python3 scripts/extract-glyph.py KR 400 fonts/prata-latin.woff2
    python3 scripts/extract-glyph.py KR 600 fonts/fixel-latin.woff2

The third argument is optional and defaults to Fixel. A font with no weight
axis ignores the weight: Prata ships one cut, and asking a static font to
instantiate would fail rather than give a heavier one.

Writes brand/glyph-KR.json, which is committed, so rebuilding the icons
afterwards needs nothing but Node.
"""
import json
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.misc.transform import Transform

text = sys.argv[1] if len(sys.argv) > 1 else "KR"
weight = float(sys.argv[2]) if len(sys.argv) > 2 else 600.0
source = sys.argv[3] if len(sys.argv) > 3 else "fonts/fixel-latin.woff2"

root = Path(__file__).resolve().parent.parent
font = TTFont(root / source)

# A variable font has no single outline: pin the weight axis first, or what
# you export is whatever the default instance happens to be.
if "fvar" in font:
    font = instancer.instantiateVariableFont(font, {"wght": weight}, inplace=False)

cmap = font.getBestCmap()
glyph_set = font.getGlyphSet()
names = [cmap[ord(c)] for c in text]


def kerning(left, right):
    """Pair adjustment from GPOS, in font units. Modern fonts keep kerning
    there rather than in the old `kern` table, and guessing it by eye is how
    a monogram ends up subtly wrong."""
    if "GPOS" not in font:
        return 0
    total = 0
    gpos = font["GPOS"].table
    for feature in gpos.FeatureList.FeatureRecord:
        if feature.FeatureTag != "kern":
            continue
        for index in feature.Feature.LookupListIndex:
            lookup = gpos.LookupList.Lookup[index]
            for sub in lookup.SubTable:
                if getattr(sub, "LookupType", lookup.LookupType) != 2 and lookup.LookupType != 2:
                    continue
                if sub.Format == 1:
                    coverage = sub.Coverage.glyphs
                    if left not in coverage:
                        continue
                    pair_set = sub.PairSet[coverage.index(left)]
                    for record in pair_set.PairValueRecord:
                        if record.SecondGlyph == right and record.Value1 is not None:
                            total += getattr(record.Value1, "XAdvance", 0) or 0
                elif sub.Format == 2:
                    if left not in sub.Coverage.glyphs:
                        continue
                    c1 = sub.ClassDef1.classDefs.get(left, 0)
                    c2 = sub.ClassDef2.classDefs.get(right, 0)
                    record = sub.Class1Record[c1].Class2Record[c2]
                    if record.Value1 is not None:
                        total += getattr(record.Value1, "XAdvance", 0) or 0
    return total


pen = SVGPathPen(glyph_set)
x = 0
pairs = []
for i, name in enumerate(names):
    if i:
        k = kerning(names[i - 1], name)
        pairs.append({"pair": text[i - 1] + text[i], "kern": k})
        x += k
    glyph_set[name].draw(TransformPen(pen, Transform().translate(x, 0)))
    x += font["hmtx"][name][0]

path = pen.getCommands()

# Bounds of the composed word, not of one letter.
recorder = RecordingPen()
x = 0
for i, name in enumerate(names):
    if i:
        x += kerning(names[i - 1], name)
    glyph_set[name].draw(TransformPen(recorder, Transform().translate(x, 0)))
    x += font["hmtx"][name][0]
bounds = BoundsPen(glyph_set)
recorder.replay(bounds)
x_min, y_min, x_max, y_max = bounds.bounds

out = {
    "text": text,
    "weight": weight,
    "source": source,
    "family": str(next(r for r in font["name"].names if r.nameID == 1 and r.platformID == 3)),
    "unitsPerEm": font["head"].unitsPerEm,
    "capHeight": getattr(font["OS/2"], "sCapHeight", None),
    "kerning": pairs,
    "bounds": {"xMin": x_min, "yMin": y_min, "xMax": x_max, "yMax": y_max},
    "path": path,
}
dest = root / "brand" / f"glyph-{text}.json"
dest.parent.mkdir(exist_ok=True)
dest.write_text(json.dumps(out, indent=1) + "\n")
print(f"{out['family']} · {text} @ wght {weight:g}")
print(f"  cap {out['capHeight']}  kerning {pairs}")
print(f"  bounds {out['bounds']}")
print(f"  -> {dest.relative_to(root)}")
