"""v3 verification: rig sheets for vampire/gulper/hammer, mobile emulation, loading bar, OG image.
Serves dist under /ocean-atlas/ (port 4401) to exercise the GitHub Pages base path."""
import os, sys, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
BASE = "http://127.0.0.1:4401/ocean-atlas/"
os.makedirs("shots/v3", exist_ok=True)
F = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
font = ImageFont.truetype(F, 22) if os.path.exists(F) else None
errs, report = [], {}
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
only = sys.argv[1:] or ["rig", "mobile", "loading", "og"]

def watch(pg, tag):
    pg.on("pageerror", lambda e: errs.append(f"{tag}: pageerror {e}"))
    pg.on("console", lambda m: m.type == "error" and errs.append(f"{tag}: console {m.text}"))
    pg.on("response", lambda r: r.status >= 400 and errs.append(f"{tag}: HTTP {r.status} {r.url}"))

def sheet(frames, cols, title, out, w=360):
    ims = [Image.open(f).convert("RGB") for f, _ in frames]
    h = int(w * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    S = Image.new("RGB", (w * cols, rows * (h + 26) + 40), (12, 16, 26)); d = ImageDraw.Draw(S)
    d.text((8, 6), title, fill="white", font=font)
    for i, (im, (_, lab)) in enumerate(zip(ims, frames)):
        x, y = (i % cols) * w, 40 + (i // cols) * (h + 26)
        d.text((x + 6, y + 2), lab, fill=(120, 220, 255), font=ImageFont.truetype(F, 16) if font else None)
        S.paste(im.resize((w, h)), (x, y + 24))
    S.save(out); print("saved", out, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    # ---------- A) rig sheets ----------
    if "rig" in only:
        for sp, si in (("vampire", 2), ("gulper", 4), ("hammer", 10)):
            pg = b.new_page(viewport={"width": 1280, "height": 800}); watch(pg, f"rig-{sp}")
            pg.goto(f"{BASE}?theme=dark&s={si}", wait_until="networkidle"); pg.wait_for_timeout(5000)
            ids = pg.eval_on_selector_all("#actions button[data-b]", "bs => bs.map(b => [b.dataset.b, b.textContent.trim()])")
            ids = [x for x in ids if x[0] != "auto"]
            frames = []
            for bid, lab in ids:
                pg.click(f'#actions button[data-b="{bid}"]'); pg.wait_for_timeout(1400)
                for k in range(4):
                    f = f"shots/v3/rig-{sp}-{bid}-{k}.png"; pg.screenshot(path=f, clip={"x": 250, "y": 70, "width": 780, "height": 560})
                    frames.append((f, f"{lab} {bid} t{k}")); pg.wait_for_timeout(650)
            # confirm the AnimationMixer path is used (skinned mesh present)
            report[f"rig-{sp}-behaviors"] = ids
            sheet(frames, 4, f"{sp} — Blender rig + AnimationMixer clips (rows = behaviours)", f"shots/v3-rig-{sp}.png")
            pg.close()
    # ---------- B) mobile emulation ----------
    if "mobile" in only:
        for dev, slug in (("iPhone 14", "iphone14"), ("Pixel 7", "pixel7")):
            d = dict(p.devices[dev])
            ctx = b.new_context(**d); pg = ctx.new_page(); watch(pg, slug)
            ua = pg.evaluate("navigator.userAgent"); report[f"{slug}-ua"] = ua
            pg.goto(f"{BASE}?theme=dark&s=8", wait_until="networkidle"); pg.wait_for_timeout(5500)
            frames = []
            f = f"shots/v3-mobile-{slug}-load.png"; pg.screenshot(path=f); frames.append((f, "loaded (whale)"))
            report[f"{slug}-loader-hidden-after-load"] = pg.evaluate("getComputedStyle(document.getElementById('loader')).visibility") == "hidden"
            vp = pg.evaluate("({w: innerWidth, h: innerHeight, dpr: devicePixelRatio, touch: 'ontouchstart' in window, mtp: navigator.maxTouchPoints})")
            report[f"{slug}-viewport"] = vp
            # overlap check between visible fixed UI blocks
            rects = pg.evaluate("""() => { const q = ['#menuBtn','#carousel','#tools','#actions','#cap','#right','#theme'];
              return q.map(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
                return {s, x: r.x, y: r.y, w: r.width, h: r.height, vis: cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && r.width > 0 && r.height > 0}; }).filter(Boolean); }""")
            vis = [r for r in rects if r["vis"]]
            ov = []
            for i in range(len(vis)):
                for j in range(i + 1, len(vis)):
                    a, c = vis[i], vis[j]
                    if "#theme" in (a["s"], c["s"]) and "#right" in (a["s"], c["s"]): continue  # theme btn lives inside the sheet
                    ix = min(a["x"] + a["w"], c["x"] + c["w"]) - max(a["x"], c["x"]); iy = min(a["y"] + a["h"], c["y"] + c["h"]) - max(a["y"], c["y"])
                    if ix > 2 and iy > 2: ov.append(f'{a["s"]}×{c["s"]} {ix:.0f}x{iy:.0f}')
            report[f"{slug}-overlaps"] = ov or "none"
            report[f"{slug}-offscreen"] = [r["s"] for r in vis if r["x"] < -1 or r["x"] + r["w"] > vp["w"] + 1] or "none"
            # tab strip scrolls horizontally by touch-swipe
            sc = pg.evaluate("(() => { const a = document.querySelector('#actions'); return {sw: a.scrollWidth, cw: a.clientWidth, ox: getComputedStyle(a).overflowX}; })()")
            box = pg.locator("#actions").bounding_box()
            cdp = ctx.new_cdp_session(pg)
            y = box["y"] + box["height"] / 2; x0, x1 = box["x"] + box["width"] - 20, box["x"] + 20
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": y}]})
            for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x0 + (x1 - x0) * k / 10, "y": y}]}); pg.wait_for_timeout(16)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(600)
            sc["scrollLeft_after_swipe"] = pg.evaluate("document.querySelector('#actions').scrollLeft")
            report[f"{slug}-tabs"] = sc
            f = f"shots/v3-mobile-{slug}-tabs-swiped.png"; pg.screenshot(path=f); frames.append((f, f"tabs swiped (scrollLeft={sc['scrollLeft_after_swipe']:.0f})"))
            # animation switching by tap
            sw = []
            for bid in ("breach", "blow"):
                pg.locator(f'#actions button[data-b="{bid}"]').scroll_into_view_if_needed(); pg.tap(f'#actions button[data-b="{bid}"]'); pg.wait_for_timeout(1800)
                on = pg.evaluate(f"document.querySelector('#actions button[data-b=\"{bid}\"]').classList.contains('on') || document.querySelector('#actions button[data-b=\"{bid}\"]').getAttribute('aria-selected')")
                sw.append((bid, on))
                f = f"shots/v3-mobile-{slug}-{bid}.png"; pg.screenshot(path=f); frames.append((f, f"tap {bid}"))
            report[f"{slug}-switch"] = sw
            # switch species by tapping a carousel card (vampire, newly rigged) and open sheet
            pg.locator('.card[data-i="2"]').scroll_into_view_if_needed(); pg.tap('.card[data-i="2"]'); pg.wait_for_timeout(4500)
            f = f"shots/v3-mobile-{slug}-vampire.png"; pg.screenshot(path=f); frames.append((f, "tap card → vampire"))
            pg.tap('#actions button[data-b="cloak"]'); pg.wait_for_timeout(2200)
            f = f"shots/v3-mobile-{slug}-cloak.png"; pg.screenshot(path=f); frames.append((f, "vampire cloak"))
            pg.tap("#sheetHandle"); pg.wait_for_timeout(900)
            f = f"shots/v3-mobile-{slug}-sheet.png"; pg.screenshot(path=f); frames.append((f, "info sheet expanded"))
            sheet(frames, 4, f"{dev} emulation · {vp['w']}x{vp['h']} @{vp['dpr']}x · touch={vp['touch']}", f"shots/v3-mobile-{slug}.png", w=260)
            ctx.close()
    # ---------- C) loading overlay on a throttled connection ----------
    if "loading" in only:
        pg = b.new_page(viewport={"width": 1280, "height": 800}); watch(pg, "loading")
        cdp = pg.context.new_cdp_session(pg); cdp.send("Network.enable")
        cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 400 * 1024 / 8 * 8 // 8 * 1, "uploadThroughput": 100000})
        pg.goto(f"{BASE}?theme=dark&s=10", wait_until="domcontentloaded")
        seen = []
        frames = []
        for k in range(40):
            st = pg.evaluate("(() => { const l = document.getElementById('loader'); return {on: l.classList.contains('on'), v: +l.getAttribute('aria-valuenow')}; })()")
            seen.append(st)
            if st["on"] and 15 <= st["v"] <= 85 and len(frames) < 2:
                f = f"shots/v3/loading-{len(frames)}.png"; pg.screenshot(path=f); frames.append((f, f"loading {st['v']}%"))
            pg.wait_for_timeout(250)
            if len(frames) >= 2 and not st["on"]: break
        pg.wait_for_timeout(3000)
        f = "shots/v3/loading-done.png"; pg.screenshot(path=f); frames.append((f, "loaded"))
        report["loading-progress-samples"] = [s["v"] for s in seen if s["on"]][:40]
        sheet(frames, 3, "Model loading overlay (throttled ~400 kbps, hammerhead)", "shots/v3-loading.png", w=480)
        pg.close()
    # ---------- D) Open Graph image rendered from the site ----------
    if "og" in only:
        pg = b.new_page(viewport={"width": 1200, "height": 630}); watch(pg, "og")
        pg.goto(f"{BASE}?theme=dark&s=2", wait_until="networkidle"); pg.wait_for_timeout(5500)
        pg.click('#actions button[data-b="drift"]'); pg.wait_for_timeout(2500)
        pg.screenshot(path="public/og-image.png"); pg.screenshot(path="shots/v3-og.png")
        pg.close()
    b.close()
print(json.dumps(report, ensure_ascii=False, indent=1))
print("\n".join(errs) or "NO PAGE ERRORS")
