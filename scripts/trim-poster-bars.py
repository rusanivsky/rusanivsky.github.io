"""Crops the black bars off video posters.

A YouTube still is always sixteen by nine, whatever shape the film inside it
was, so a 4:3 concert clip arrives with black walls down both sides and a
2.39:1 edit with black bands above and below. The player on the page is also
sixteen by nine and fills itself with object-fit: cover, so once the bars are
gone from the file the picture simply fills the frame and nothing else has to
change.

What counts as a bar is deliberately strict: every pixel across the whole row
or column must be within a hair of black, because a dark stage or a black
backdrop is not a bar and must not be cut. Nothing is cropped past a third of
the side, and nothing that would leave less than half the picture.

Run from the repository root:  python3 scripts/trim-poster-bars.py [--write]
"""
import sys, glob, os
from PIL import Image

NEAR_BLACK = 18      # a bar is black, not merely dark
MIN_BAR = 6          # fewer pixels than this is JPEG noise, not a bar
MAX_SHARE = 0.34     # never eat more than a third of a side
MIN_AREA = 0.5       # never leave less than half the picture

def scan(path):
    im = Image.open(path).convert('L')
    w, h = im.size
    px = im.load()
    row_black = lambda y: max(px[x, y] for x in range(w)) <= NEAR_BLACK
    col_black = lambda x: max(px[x, y] for y in range(h)) <= NEAR_BLACK
    lim_v, lim_h = int(h * MAX_SHARE), int(w * MAX_SHARE)
    top = bot = left = right = 0
    while top < lim_v and row_black(top): top += 1
    while bot < lim_v and row_black(h - 1 - bot): bot += 1
    while left < lim_h and col_black(left): left += 1
    while right < lim_h and col_black(w - 1 - right): right += 1
    top = 0 if top < MIN_BAR else top
    bot = 0 if bot < MIN_BAR else bot
    left = 0 if left < MIN_BAR else left
    right = 0 if right < MIN_BAR else right
    return w, h, top, bot, left, right

def main(write):
    files = sorted(glob.glob('media/video/thumbs/*.jpg') + glob.glob('media/video/posters/*.jpg'))
    touched = 0
    for f in files:
        w, h, t, b, l, r = scan(f)
        if not (t or b or l or r):
            continue
        nw, nh = w - l - r, h - t - b
        if nw * nh < w * h * MIN_AREA:
            print(f'  skip {os.path.basename(f)} — crop would take too much')
            continue
        print(f'{os.path.basename(f):38} {w}x{h} -> {nw}x{nh}  (top {t}, bottom {b}, left {l}, right {r})')
        touched += 1
        if write:
            Image.open(f).convert('RGB').crop((l, t, w - r, h - b)).save(f, 'JPEG', quality=88, optimize=True)
    print(f'{touched} of {len(files)} posters carried bars' + ('' if write else '  (dry run — pass --write)'))

main('--write' in sys.argv)
