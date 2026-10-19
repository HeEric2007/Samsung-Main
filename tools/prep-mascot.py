#!/usr/bin/env python3
"""
Turn any picture into a dock mascot: removes a white or fake-checkerboard background
(flood fill from the edges, so white areas inside the outline are kept), trims the empty
border, and resizes to 300px tall.

    python3 tools/prep-mascot.py ~/Downloads/picture.png launcher/img/mascots/1.png

Needs Pillow:  pip install pillow
"""
import sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("Missing Pillow. Run: pip install pillow")


def is_background(p):
    r, g, b, a = p
    # transparent, or very light and nearly grey (white / checkerboard squares)
    return a < 20 or (min(r, g, b) > 185 and max(r, g, b) - min(r, g, b) < 18)


def prep(src, dst, height=300):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i] or not is_background(px[x, y]):
            continue
        seen[i] = 1
        px[x, y] = (0, 0, 0, 0)
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    box = im.getbbox()
    if not box:
        sys.exit("The whole image looked like background; nothing left to keep.")
    im = im.crop(box)
    im = im.resize((max(1, round(im.width * height / im.height)), height), Image.LANCZOS)
    im.save(dst)
    print("Saved %s (%dx%d)" % (dst, im.width, im.height))


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    prep(sys.argv[1], sys.argv[2])
