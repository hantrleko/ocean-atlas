"""Fix verification sheets: shots/fix-<name>.png"""
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import os
os.makedirs("shots/" + os.environ.get("PREFIX", "fix"), exist_ok=True)
F = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"; font = ImageFont.truetype(F, 26) if os.path.exists(F) else None
errs = []
import sys
JOBS = [  # name, species idx, behavior, frames, gap ms, viewport, clip
    ("angler-strike", 1, "strike", 8, 300, (1280, 800), (240, 60, 800, 600)),
    ("angler-lure", 1, "lure", 4, 400, (1280, 800), (240, 60, 800, 600)),
    ("angler-ambush", 1, "ambush", 3, 700, (1280, 800), (240, 60, 800, 600)),
    ("jelly-pulse", 6, "pulse", 6, 230, (1280, 800), (240, 60, 800, 600)),
    ("jelly-feed", 6, "feed", 3, 900, (1280, 800), (240, 60, 800, 600)),
    ("whale-breach-desktop", 8, "breach", 9, 480, (1280, 800), (0, 0, 1280, 800)),
    ("whale-breach-mobile", 8, "breach", 9, 480, (390, 844), (0, 0, 390, 844)),
    ("whale-blow", 8, "blow", 8, 350, (1280, 800), (240, 60, 800, 600)),
]
JOBS = [j for j in JOBS if not sys.argv[1:] or j[0] in sys.argv[1:]]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for name, si, bid, n, gap, vp, cl in JOBS:
        mob = vp[0] < 500
        pg = b.new_page(viewport={"width": vp[0], "height": vp[1]}, is_mobile=mob, has_touch=mob)
        pg.on("pageerror", lambda e, n_=name: errs.append(f"{n_}:{e}"))
        pg.on("console", lambda m, n_=name: m.type == "error" and errs.append(f"{n_}:console:{m.text}"))
        pg.goto(f"http://127.0.0.1:4400/?theme=dark&s={si}", wait_until="networkidle"); pg.wait_for_timeout(6000)
        pg.click(f'#actions button[data-b="{bid}"]'); pg.wait_for_timeout(2500)
        fr = []
        for k in range(n):
            f = f"shots/{os.environ.get('PREFIX','fix')}/{name}-{k}.png"
            pg.screenshot(path=f, clip=dict(zip(("x", "y", "width", "height"), cl))); fr.append(f); pg.wait_for_timeout(gap)
        pg.close()
        cols = min(n, 4 if not mob else 5); rows = (n + cols - 1) // cols
        W = 360 if not mob else 200; H = int(W * cl[3] / cl[2])
        sh = Image.new("RGB", (W * cols, H * rows + 40), "black"); d = ImageDraw.Draw(sh)
        d.text((8, 4), f"{name} ({bid})", fill="white", font=font)
        for i, f in enumerate(fr): sh.paste(Image.open(f).convert("RGB").resize((W, H)), ((i % cols) * W, 40 + (i // cols) * H))
        sh.save(f"shots/{os.environ.get('PREFIX','fix')}-{name}.png"); print("sheet", name, flush=True)
    b.close()
print("\n".join(errs) or "NO PAGE ERRORS")
