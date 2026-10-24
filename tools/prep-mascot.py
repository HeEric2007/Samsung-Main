#!/usr/bin/env python3
"""
Turn any picture into a dock mascot: removes a white or fake-checkerboard background
(flood fill from the edges, so white areas inside the outline are kept), trims the empty
border, and resizes to 300px tall. Animated GIFs are handled frame by frame and saved as
an animated GIF.

    python3 tools/prep-mascot.py ~/Downloads/picture.png launcher/img/mascots/1.png
    python3 tools/prep-mascot.py "~/Desktop/my gif.gif"  launcher/img/mascots/2.gif

Add --keep-bg to skip background removal (for GIFs that are already transparent, or
whose background you want to keep).

Needs Pillow:  pip install pillow
"""
import os
import sys
from collections import deque

try:
    from PIL import Image, ImageSequence
except ImportError:
    sys.exit("Missing Pillow. Run: pip install pillow")

HEIGHT = 300


def is_background(p):
    r, g, b, a = p
    # transparent, or very light and nearly grey (white / checkerboard squares)
    return a < 20 or (min(r, g, b) > 185 and max(r, g, b) - min(r, g, b) < 18)


def strip_background(im):
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
    return im


def union_box(boxes):
    boxes = [b for b in boxes if b]
    if not boxes:
        sys.exit("The whole image looked like background; nothing left to keep.")
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def scaled(im):
    return im.resize((max(1, round(im.width * HEIGHT / im.height)), HEIGHT), Image.LANCZOS)


def prep_still(src, dst, keep_bg):
    im = Image.open(src).convert("RGBA")
    if not keep_bg:
        strip_background(im)
    im = scaled(im.crop(union_box([im.getbbox()])))
    if dst.lower().endswith(".gif"):
        save_gif([im], [100], dst)
    else:
        im.save(dst)
    print("Saved %s (%dx%d)" % (dst, im.width, im.height))


def save_gif(frames, durations, dst):
    # GIF has 1-bit transparency: pixels under ~50% alpha become fully transparent.
    out = []
    for f in frames:
        alpha = f.getchannel("A").point(lambda a: 255 if a >= 128 else 0)
        rgb = f.convert("RGB").quantize(colors=255, method=Image.Quantize.MEDIANCUT)
        p = rgb.copy()
        p.putpalette(rgb.getpalette()[:765] + [0, 0, 0])   # index 255 = transparent
        p.paste(255, mask=alpha.point(lambda a: 255 - a))
        p.info["transparency"] = 255
        out.append(p)
    out[0].save(dst, save_all=True, append_images=out[1:], duration=durations,
                loop=0, disposal=2, transparency=255, optimize=False)


def prep_gif(src, dst, keep_bg):
    im = Image.open(src)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(im):
        f = frame.convert("RGBA")
        if not keep_bg:
            strip_background(f)
        frames.append(f)
        durations.append(frame.info.get("duration", im.info.get("duration", 80)) or 80)
    box = union_box([f.getbbox() for f in frames])       # same crop for every frame
    frames = [scaled(f.crop(box)) for f in frames]
    if not dst.lower().endswith(".gif"):
        dst = os.path.splitext(dst)[0] + ".gif"
    save_gif(frames, durations, dst)
    size_kb = os.path.getsize(dst) // 1024
    print("Saved %s (%dx%d, %d frames, %d KB)" % (dst, frames[0].width, frames[0].height, len(frames), size_kb))
    if size_kb > 3000:
        print("Heads up: that's big for a TV. A shorter GIF loads faster and saves space.")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--keep-bg"]
    keep = "--keep-bg" in sys.argv[1:]
    if len(args) != 2:
        sys.exit(__doc__)
    src, dst = os.path.expanduser(args[0]), args[1]
    animated = getattr(Image.open(src), "is_animated", False)
    (prep_gif if animated else prep_still)(src, dst, keep)
