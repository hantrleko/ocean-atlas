"""v6: vampire cloak peak close-up, gulper normal vs gape (camera move), phone first frames with bbox fit."""
import os, sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
BASE = "http://127.0.0.1:4401/ocean-atlas/"
os.makedirs("shots/v6", exist_ok=True)
F = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
font = ImageFont.truetype(F, 22); small = ImageFont.truetype(F, 15)
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
errs = []; report = {}; only = sys.argv[1:] or ["desk", "mobile"]
def watch(pg, tag):
    pg.on("pageerror", lambda e: errs.append(f"{tag}: pageerror {e}"))
    pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{tag}: console {m.text}"))
    pg.on("response", lambda r: r.status >= 400 and errs.append(f"{tag}: HTTP {r.status} {r.url}"))
def sheet(rows, title, out, w=300, wrap=4):
    rows = [r[i:i + wrap] for r in rows for i in range(0, len(r), wrap)]
    ims = [[(Image.open(f).convert("RGB"), l) for f, l in r] for r in rows]
    h = int(w * ims[0][0][0].height / ims[0][0][0].width); cols = max(len(r) for r in ims)
    S = Image.new("RGB", (w * cols, len(ims) * (h + 22) + 40), (12, 16, 26)); d = ImageDraw.Draw(S)
    d.text((8, 6), title, fill="white", font=font)
    for ri, r in enumerate(ims):
        for ci, (im, l) in enumerate(r):
            x, y = ci * w, 40 + ri * (h + 22); d.text((x + 4, y + 1), l, fill=(120, 220, 255), font=small); S.paste(im.resize((w, h)), (x, y + 21))
    S.save(out); print("saved", out, flush=True)
def loaded(pg):
    pg.wait_for_function("() => !document.getElementById('loader').classList.contains('on') && document.querySelector('#actions button')", timeout=60000)
def seq(pg, bid, n, gap, clip, tag):
    pg.click(f'#actions button[data-b="{bid}"]'); pg.wait_for_timeout(700); r = []
    for k in range(n):
        f = f"shots/v6/{tag}-{k}.png"; pg.screenshot(path=f, clip=clip); r.append((f, f"{bid} +{(700 + k * gap) / 1000:.1f}s")); pg.wait_for_timeout(gap)
    return r
with sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    if "desk" in only:
        pg = b.new_page(viewport={"width": 1280, "height": 800}); watch(pg, "desk")
        pg.goto(f"{BASE}?theme=dark&s=2&debug", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(1500)
        pg.click('#actions button[data-b="cloak"]'); pg.wait_for_timeout(300)
        CZ = {"x": 380, "y": 150, "width": 520, "height": 420}
        r = []
        for k in range(10):
            f = f"shots/v6/vampire-cloak-{k}.png"; pg.screenshot(path=f, clip=CZ); r.append((f, f"cloak frame {k}")); pg.wait_for_timeout(350)
        sheet([r], "吸血鬼乌贼 斗篷翻转 — arms + web chains evert together (close-up sequence)", "shots/v6-vampire-cloak-sequence.png", w=320)
        # peak close-up: wait for the held phase (clip 5 s, hold ~34-68 %)
        # peak close-up: sample the held phase and keep the most compact silhouette (= fully everted)
        best = None
        for k in range(14):
            f = f"shots/v6/vampire-peak-cand-{k}.png"; pg.screenshot(path=f, clip={"x": 330, "y": 110, "width": 620, "height": 520})
            im = Image.open(f).convert("L").point(lambda v: 255 if v > 70 else 0)
            # model pixels are much brighter/redder than the dark-blue bg: use red channel instead
            rc = Image.open(f).convert("RGB").split()[0].point(lambda v: 255 if v > 60 else 0)
            bb = rc.getbbox(); area = (bb[2] - bb[0]) * (bb[3] - bb[1]) if bb else 1e9
            if best is None or area < best[0]: best = (area, f)
            pg.wait_for_timeout(280)
        Image.open(best[1]).save("shots/v6-vampire-cloak-peak.png"); report["cloak-peak-frame"] = best[1]
        pg.close()
    if "mobile" in only:
        for dev, slug in (("iPhone 14", "iphone14"), ("Pixel 7", "pixel7")):
            ctx = b.new_context(**p.devices[dev]); rows = []; row = []; rep = {}
            for i in range(11):
                pg = ctx.new_page(); watch(pg, f"{slug}-s{i}")
                pg.goto(f"{BASE}?theme=dark&s={i}", wait_until="domcontentloaded"); loaded(pg); pg.wait_for_timeout(350)
                f = f"shots/v6/mobile-{slug}-s{i}.png"; pg.screenshot(path=f)
                nm = pg.evaluate("document.getElementById('title').textContent")
                row.append((f, f"{i} {nm} first frame"))
                if len(row) == 6: rows.append(row); row = []
                if i == 8:
                    pg.screenshot(path=f"shots/v6-mobile-{slug}-whale-first-frame.png")

                pg.close()
            rows.append(row)
            sheet(rows, f"{dev} — first frame, every species fitted to its measured motion envelope", f"shots/v6-mobile-{slug}-all-species.png", w=200, wrap=6)
            ctx.close()
    b.close()
if "mobile" in only:
    names = {1: "angler 鮟鱇鱼", 5: "nautilus 鹦鹉螺", 6: "jelly 海月水母"}
    rows = [[(f"shots/v6-before/mobile-iphone14-s{i}.png", f"BEFORE v5 · {n}"), (f"shots/v6/mobile-iphone14-s{i}.png", f"AFTER v6 · {n}")] for i, n in names.items()]
    rows = [sum(rows, [])]
    sheet(rows, "iPhone 14 — before (v5 conservative sphere) vs after (measured motion envelope)", "shots/v6-iphone14-before-after.png", w=250, wrap=6)
print(report)
print("\n".join(errs) or "NO PAGE ERRORS")
