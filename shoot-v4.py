"""v4: vampire cloak sequence, hammer scan vs pin, gulper gape, mobile first-frame framing (all species)."""
import os, sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
BASE = "http://127.0.0.1:4401/ocean-atlas/"
os.makedirs("shots/v4", exist_ok=True)
F = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
font = ImageFont.truetype(F, 22); small = ImageFont.truetype(F, 15)
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
errs = []; only = sys.argv[1:] or ["desk", "mobile"]
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
        f = f"shots/v4/{tag}-{k}.png"; pg.screenshot(path=f, clip=clip); r.append((f, f"{bid} +{(700 + k * gap) / 1000:.1f}s")); pg.wait_for_timeout(gap)
    return r
with sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    if "desk" in only:
        C = {"x": 280, "y": 110, "width": 700, "height": 500}
        pg = b.new_page(viewport={"width": 1280, "height": 800}); watch(pg, "desk")
        pg.goto(f"{BASE}?theme=dark&s=2", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(1500)
        sheet([seq(pg, "cloak", 8, 600, C, "vampire-cloak")], "吸血鬼乌贼 斗篷翻转 cloak — arms sweep up & back over the mantle (pineapple), hold, unfurl", "shots/v4-vampire-cloak.png")
        pg.goto(f"{BASE}?theme=dark&s=10", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(1500)
        r1 = seq(pg, "scan", 7, 700, C, "hammer-scan"); r2 = seq(pg, "pin", 7, 450, C, "hammer-pin")
        sheet([r1, r2], "双髻鲨 top: 扫描海底 scan (slow, low, wide head sweeps)  ·  bottom: 锤头压魟 pin (dive → slam → hold → recover)", "shots/v4-hammer-scan-vs-pin.png")
        pg.goto(f"{BASE}?theme=dark&s=4", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(1500)
        sheet([seq(pg, "swim", 4, 500, C, "gulper-swim"), seq(pg, "gape", 8, 400, C, "gulper-gape")], "宽咽鱼 top: swim (jaw now closed at rest)  ·  bottom: 张口吞网 gape (snap shut → huge gape + pouch inflate + surge)", "shots/v4-gulper-gape.png")
        pg.close()
    if "mobile" in only:
        for dev, slug in (("iPhone 14", "iphone14"), ("Pixel 7", "pixel7")):
            ctx = b.new_context(**p.devices[dev]); rows = []; row = []; rep = {}
            for i in range(11):
                pg = ctx.new_page(); watch(pg, f"{slug}-s{i}")
                pg.goto(f"{BASE}?theme=dark&s={i}", wait_until="domcontentloaded"); loaded(pg); pg.wait_for_timeout(350)
                f = f"shots/v4/mobile-{slug}-s{i}.png"; pg.screenshot(path=f)
                nm = pg.evaluate("document.getElementById('title').textContent")
                row.append((f, f"{i} {nm} first frame"))
                if len(row) == 6: rows.append(row); row = []
                if i == 8:
                    pg.screenshot(path=f"shots/v4-mobile-{slug}-whale-first-frame.png")
                pg.close()
            rows.append(row)
            sheet(rows, f"{dev} — first frame after load, every species (stage = between carousel and tabs)", f"shots/v4-mobile-{slug}-all-species.png", w=200, wrap=6)
            ctx.close()
    b.close()
print("\n".join(errs) or "NO PAGE ERRORS")
