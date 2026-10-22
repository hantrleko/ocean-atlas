import json, sys
from PIL import Image, ImageDraw
sp = sys.argv[1]; L = json.load(open(f"/tmp/ps_{sp}.json"))
clips = list(dict.fromkeys(c for c, *_ in L))
W, H = 360, 300
S = Image.new('RGB', (W*8, (H+20)*len(clips)+30), (20, 24, 34)); d = ImageDraw.Draw(S)
d.text((8, 8), f"{sp} rig - Blender clips (cols 1-4 front 3/4, 5-8 side) frames 0/25/50/75%", fill='white')
for c, vn, i, p in L:
    r = clips.index(c); col = i + (4 if vn == 'side' else 0)
    S.paste(Image.open(p).convert('RGB'), (col*W, 30+r*(H+20)+20)); d.text((col*W+6, 30+r*(H+20)+4), f"{c} {vn} {i}", fill=(120, 220, 255))
S.save(sys.argv[2])
