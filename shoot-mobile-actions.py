from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for sp, i in (("whale", 8), ("hammer", 10)):
        pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg.goto(f"http://127.0.0.1:4400/?theme=dark&s={i}", wait_until="networkidle"); pg.wait_for_timeout(6000)
        pg.query_selector_all("#actions button")[2].click(); pg.wait_for_timeout(2000)
        pg.screenshot(path=f"shots/mobile-actions-{sp}.png"); pg.close(); print("mobile", sp)
    b.close()
