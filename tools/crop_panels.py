"""Split each 3x2 six-panel composite (extracted from the PDF) into six scene images.

Gutter coordinates were measured on the 1920x1920 PDF originals by scanning for
white rows/columns. Each rect is (left, top, right, bottom) in pixels, already
excluding the white gutters. Run: python3 tools/crop_panels.py <src_dir> <out_dir>
"""
import sys, os
from PIL import Image

# rows: (top_row_top, top_row_bottom, bottom_row_top, bottom_row_bottom)
# cols_top / cols_bottom: three (left, right) pairs for each row
LAYOUT = {
    "nara-park-deer-bow": dict(rows=(0, 952, 966, 1920),
        top=[(0, 629), (646, 1274), (1291, 1920)], bot=[(0, 628), (645, 1272), (1290, 1920)]),
    "day13-osaka-castle": dict(rows=(0, 952, 965, 1920),
        top=[(0, 631), (644, 1274), (1287, 1920)], bot=[(0, 630), (644, 1269), (1283, 1920)]),
    "day20-kyoto-arashiyama": dict(rows=(119, 953, 968, 1920),
        top=[(0, 630), (646, 1273), (1289, 1920)], bot=[(0, 629), (645, 1271), (1286, 1920)]),
    "day25-shibuya-crossing": dict(rows=(92, 952, 966, 1920),
        top=[(0, 629), (644, 1270), (1285, 1920)], bot=[(0, 628), (643, 1268), (1283, 1920)]),
    "day29-tokyo-one-day-japan": dict(rows=(157, 1071, 1082, 1920),
        top=[(0, 629), (641, 1271), (1282, 1920)], bot=[(0, 628), (640, 1269), (1281, 1920)]),
    "day30-tokyo-skytree": dict(rows=(0, 948, 965, 1920),
        top=[(0, 629), (647, 1274), (1292, 1920)], bot=[(0, 628), (647, 1273), (1292, 1920)]),
    # 以下兩張不在 PDF 內，是使用者另外提供的出發篇照片（1280x1280 JPEG），依使用者指示放進序章。
    "prologue-departure-a": dict(rows=(0, 634, 644, 1280),
        top=[(0, 420), (430, 851), (860, 1280)], bot=[(0, 420), (429, 850), (858, 1280)]),
    "prologue-departure-b": dict(rows=(0, 634, 645, 1280),
        top=[(0, 419), (430, 849), (860, 1280)], bot=[(0, 419), (430, 849), (860, 1280)]),
    "extra-move-japan-home": dict(rows=(97, 991, 1001, 1920),
        top=[(0, 632), (642, 1274), (1284, 1920)], bot=[(0, 629), (640, 1271), (1282, 1920)]),
}

EXT = os.environ.get("SRC_EXT", ".png")

def trim_gutter(im, box, limit=8):
    """Shave off any leftover anti-aliased white gutter pixels (at most `limit` px per side)."""
    import numpy as np
    l, t, r, b = box
    a = np.asarray(im.convert("L")).astype(int)
    white = lambda strip: (strip > 225).mean() > 0.4
    for _ in range(limit):
        if l > 0 and white(a[t:b, l]): l += 1
        if r < im.width and white(a[t:b, r - 1]): r -= 1
        if t > 0 and white(a[t, l:r]): t += 1
        if b < im.height and white(a[b - 1, l:r]): b -= 1
    return (l, t, r, b)

def main(src, out):
    os.makedirs(out, exist_ok=True)
    for name, L in LAYOUT.items():
        path = os.path.join(src, name + EXT)
        if not os.path.exists(path):
            path = os.path.join(src, name + ".jpg")
        im = Image.open(path).convert("RGB")
        t0, t1, b0, b1 = L["rows"]
        rects = [(l, t0, r, t1) for l, r in L["top"]] + [(l, b0, r, b1) for l, r in L["bot"]]
        for i, box in enumerate(rects, 1):
            box = trim_gutter(im, box)
            p = os.path.join(out, f"{name}-{i}.jpg")
            im.crop(box).save(p, quality=90, optimize=True, progressive=True)
            print(p, box[2] - box[0], "x", box[3] - box[1])

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
