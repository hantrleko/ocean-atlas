"""env-audio: every species environment (desktop) + mobile shots + sound toggle checks."""
import os, sys, json
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:4401/ocean-atlas/"
IDS = ["dumbo","angler","vampire","barreleye","gulper","nautilus","jelly","physalia","whale","turtle","hammer"]
GL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=user-gesture-required"]
errs = []; rep = {}; only = sys.argv[1:] or ["desk", "mobile", "sound"]
os.makedirs("shots", exist_ok=True)
def watch(pg, tag):
    pg.on("pageerror", lambda e: errs.append(f"{tag}: pageerror {e}"))
    pg.on("console", lambda m: m.type in ("error", "warning") and errs.append(f"{tag}: console {m.text}"))
    pg.on("response", lambda r: r.status >= 400 and errs.append(f"{tag}: HTTP {r.status} {r.url}"))
def loaded(pg):
    pg.wait_for_function("() => !document.getElementById('loader').classList.contains('on') && document.querySelector('#actions button')", timeout=90000)
with sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    if "desk" in only:
        pg = b.new_page(viewport={"width": 1280, "height": 800}); watch(pg, "desk")
        for i, sid in enumerate(IDS):
            pg.goto(f"{BASE}?s={i}&debug", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(2500)
            pg.screenshot(path=f"shots/env-{sid}.png"); print("env", sid, pg.evaluate("__oa.env"), pg.evaluate("__oa.beh"), flush=True)
        # transition (live switch abyss → reef) + dark theme sample
        pg.goto(f"{BASE}?s=1&debug", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(1500)
        pg.click(".card >> nth=9"); pg.wait_for_timeout(700); pg.screenshot(path="shots/env-transition-mid.png"); pg.wait_for_timeout(2500); pg.screenshot(path="shots/env-transition-end.png")
        pg.goto(f"{BASE}?s=8&theme=dark&debug", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(2000); pg.screenshot(path="shots/env-whale-dark.png")
        # whale breach reaction
        pg.goto(f"{BASE}?s=8&debug", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(1200)
        pg.click('#actions button[data-b="breach"]'); ys = []
        for k in range(16):
            pg.wait_for_timeout(300); ys.append(round(pg.evaluate("__oa.cur?0:0") or 0, 2))
            if k in (5, 8, 11): pg.screenshot(path=f"shots/env-whale-breach-{k}.png")
        pg.close()
    if "sound" in only:
        pg = b.new_page(viewport={"width": 1280, "height": 800}); watch(pg, "sound")
        pg.goto(f"{BASE}?s=8&debug", wait_until="networkidle"); loaded(pg)
        rep["before"] = pg.evaluate("[__oa.audio.on, __oa.audio.state, document.querySelector('#bSound').textContent]")
        pg.click("#bSound"); pg.wait_for_timeout(2500)
        rep["after"] = pg.evaluate("[__oa.audio.on, __oa.audio._debug(), localStorage.oaSound, document.querySelector('#bSound').textContent]")
        pg.screenshot(path="shots/env-sound-on.png")
        pg.fill("#volR", "35"); pg.dispatch_event("#volR", "input"); rep["vol"] = pg.evaluate("[__oa.audio.vol, localStorage.oaVol]")
        pg.click('#actions button[data-b="song"]'); pg.wait_for_timeout(1500)
        pg.click(".card >> nth=1"); pg.wait_for_timeout(3500)
        pg.click('#actions button[data-b="strike"]'); pg.wait_for_timeout(1000); pg.click('#actions button[data-b="lure"]'); pg.wait_for_timeout(800)
        rep["angler"] = pg.evaluate("__oa.audio._debug()")
        pg.reload(wait_until="networkidle"); loaded(pg); rep["reload"] = pg.evaluate("[__oa.audio.on, __oa.audio.state, __oa.audio.vol]")
        pg.mouse.click(640, 400); pg.wait_for_timeout(1500); rep["reload-after-tap"] = pg.evaluate("__oa.audio._debug()")
        pg.click("#bSound"); rep["off"] = pg.evaluate("[__oa.audio.on, localStorage.oaSound]")
        pg.close()
    if "mobile" in only:
        for dev, slug in (("iPhone 14", "iphone14"), ("Pixel 7", "pixel7")):
            ctx = b.new_context(**p.devices[dev])
            for i in (1, 7, 8, 9, 10, 5):
                pg = ctx.new_page(); watch(pg, f"{slug}-s{i}")
                pg.goto(f"{BASE}?s={i}&debug", wait_until="networkidle"); loaded(pg); pg.wait_for_timeout(2200)
                if i in (1, 8, 9, 7): pg.screenshot(path=f"shots/env-m-{slug}-{IDS[i]}.png")
                if i == 9:
                    pg.tap("#bSound"); pg.wait_for_timeout(1500); rep[f"{slug}-snd"] = pg.evaluate("__oa.audio._debug()"); pg.screenshot(path=f"shots/env-m-{slug}-sound.png")
                pg.close()
            ctx.close()
    b.close()
print(json.dumps(rep, ensure_ascii=False, indent=1)); print("ERRORS", len(errs)); [print(" ", e) for e in errs[:40]]
