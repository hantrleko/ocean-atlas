import json, sys
from PIL import Image, ImageDraw
sp = sys.argv[1]; L = json.load(open(f"/tmp/ps8_{sp}.json"))
clips = list(dict.fromkeys(c for c, *_ in L))
W, H = 360, 300
rows = [(c, vn) for c in clips for vn in ('front', 'side')]
S = Image.new('RGB', (W*8, (H+20)*len(rows)+30), (20, 24, 34)); d = ImageDraw.Draw(S)
d.text((8, 8), f"{sp} rig - Blender clips 8 frames per row, front-3/4 and side rows", fill='white')
for c, vn, i, p in L:
    r = rows.index((c, vn)); col = i
    S.paste(Image.open(p).convert('RGB'), (col*W, 30+r*(H+20)+20)); d.text((col*W+6, 30+r*(H+20)+4), f"{c} {vn} {i}", fill=(120, 220, 255))
S.save(sys.argv[2])
