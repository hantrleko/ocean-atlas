"""Per-species: click each behavior tab, grab 2 frames per tab, build contact sheets."""
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
import os, sys
BASE = "http://127.0.0.1:4400/"
IDX = dict(dumbo=0, angler=1, vampire=2, barreleye=3, gulper=4, nautilus=5, jelly=6, physalia=7, whale=8, turtle=9, hammer=10)
only = sys.argv[1:] or list(IDX)
os.makedirs("shots/actions", exist_ok=True)
font = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 28) if os.path.exists("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc") else None
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for sp in only:
        pg = b.new_page(viewport={"width": 1280, "height": 800})
        pg.on("pageerror", lambda e: errs.append(f"{sp}:{e}"))
        pg.goto(f"{BASE}?theme=dark&s={IDX[sp]}", wait_until="networkidle")
        pg.wait_for_timeout(6000)
        tabs = pg.query_selector_all("#actions button")
        rows = []
        for tb in tabs[1:]:
            label = tb.inner_text(); bid = tb.get_attribute("data-b")
            tb.click(); pg.wait_for_timeout(1800)
            fr = []
            for k in range(3):
                f = f"shots/actions/{sp}-{bid}-{k}.png"
                pg.screenshot(path=f, clip={"x": 240, "y": 80, "width": 800, "height": 560})
                fr.append(f); pg.wait_for_timeout(700)
            rows.append((label, bid, fr))
        pg.close()
        W, H = 400, 280
        sheet = Image.new("RGB", (W*3, (H+40)*len(rows)), "black"); d = ImageDraw.Draw(sheet)
        for r, (label, bid, fr) in enumerate(rows):
            d.text((10, r*(H+40)+4), f"{sp} · {label} ({bid})", fill="white", font=font)
            for c, f in enumerate(fr):
                sheet.paste(Image.open(f).resize((W, H)), (c*W, r*(H+40)+40))
        sheet.save(f"shots/sheet-{sp}.png"); print("sheet", sp, [r[0] for r in rows])
    b.close()
print("\n".join(errs) or "NO PAGE ERRORS")
