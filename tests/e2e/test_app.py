"""Browser tests for The Menu. Run with `npm run test:e2e` (starts the app and a stand-in for Claude)."""
import datetime, json, os, re, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
URL = "http://127.0.0.1:8787/"
BRUSSELS = datetime.timezone(datetime.timedelta(hours=1))
results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))

def stub_mode(m):
    path = os.path.join(HERE, "STUB_MODE")
    if m: open(path, "w").write(m)
    elif os.path.exists(path): os.remove(path)

def stub_log():
    try: return open(os.path.join(HERE, "stub.log")).read().splitlines()
    except FileNotFoundError: return []

def page_at(browser, when):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, timezone_id="Europe/Brussels",
                              permissions=["clipboard-read", "clipboard-write"])
    pg = ctx.new_page()
    pg.errors = []
    pg.on("pageerror", lambda e: pg.errors.append(str(e)))
    pg.on("dialog", lambda d: (pg.errors.append("dialog: " + d.message), d.dismiss()))
    pg.clock.install(time=when)
    pg.goto(URL); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    return pg

def setup_and_print(pg, stores=("Lidl",)):
    pg.click("#tab-settings")
    while pg.locator("#storeChips .chip.on").count(): pg.locator("#storeChips .chip.on").first.click()
    for s in stores: pg.click(f"#storeChips >> text={s}")
    pg.click("#saveBtn"); pg.wait_for_timeout(1300)
    pg.click("#makeBtn1")
    pg.wait_for_function("document.querySelector('#progress').classList.contains('hidden')", timeout=30000)
    pg.wait_for_timeout(300)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-proxy-server"])

    # ---- first visit, a full print on a Saturday ----
    pg = page_at(b, datetime.datetime(2026, 11, 14, 11, 0, tzinfo=BRUSSELS))
    check("first visit opens on settings", pg.locator("#view-settings").is_visible())
    check("tabs are My menu, Shopping list, My settings",
          [t.strip().lower() for t in pg.locator(".tabs button").all_inner_texts()] == ["my menu", "shopping list", "my settings"])
    stub_mode(None); before = len(stub_log())
    setup_and_print(pg)
    check("menu prints", pg.locator("#menuOut").is_visible())
    check("on a Saturday it plans the coming week", pg.locator(".week .date").first.inner_text().strip().lower() == "16 nov",
          pg.locator(".week .date").first.inner_text())
    check("seven day receipts", pg.locator(".week .card").count() == 7)
    check("asks Claude for structured output", any("structured=true" in l for l in stub_log()[before:]))
    check("Change something sits under the chef's picks", pg.locator("#menuOut .card").first.locator("[data-open=all]").count() == 1)

    pg.click("#tab-list"); pg.wait_for_timeout(200)
    items = pg.locator(".shop .item")
    texts = items.all_inner_texts()
    invented = [t for t in texts if "Invented promo".upper() in t.upper()]
    check("invented promo loses its Promo stamp", invented and "PROMO" not in invented[0].upper().replace("INVENTED PROMO", ""), invented)
    plan = pg.evaluate("JSON.parse(localStorage['themenu:menu']).plan")
    real = [i for s in plan["shopping"] for i in s["items"] if i.get("promo")]
    check("real deals keep Promo with the database's end date", all(i.get("until") != "2099-01-01" for i in real), real)
    check("shopping list has its banner", pg.locator(".shop .week-banner").count() == 1)
    check("this week's deals sit under the list", pg.locator("#view-list #dealsCard").is_visible())

    items.first.locator("input").check(); pg.reload(); pg.wait_for_timeout(600); pg.click("#tab-list")
    check("ticks survive a reload", pg.locator(".shop .item input").first.is_checked())

    pg.click("#tab-menu"); before = len(stub_log())
    pg.click("[data-open=all]"); pg.fill("[data-box=all] textarea", "no lentils"); pg.click("[data-apply=all]")
    pg.wait_for_function("document.querySelector('#progress').classList.contains('hidden')", timeout=30000)
    check("Change something reprints the week", len(stub_log()) > before and pg.locator("#menuOut").is_visible())

    pg.click("#exportNotion"); pg.wait_for_timeout(300)
    md = pg.evaluate("navigator.clipboard.readText()")
    check("Notion export copies Markdown with to-dos", md.startswith("# The Menu") and "- [ ]" in md)
    check("no page errors (Saturday run)", not pg.errors, pg.errors)
    pg.context.close()

    # ---- a loyalty card number becomes a barcode a scanner can read ----
    pg = page_at(b, datetime.datetime(2026, 11, 14, 11, 0, tzinfo=BRUSSELS))
    pg.click("#tab-settings")
    while pg.locator("#storeChips .chip.on").count(): pg.locator("#storeChips .chip.on").first.click()
    pg.click("#storeChips >> text=Lidl")
    pg.click("#cardChips >> text=Lidl Plus")
    pg.fill("#cardNumbers input[data-card='Lidl Plus']", "2601234567892")
    pg.click("#storeChips >> text=Delhaize"); pg.click("#cardChips >> text=Delhaize SuperPlus")
    check("a typed card number survives tapping another shop or card",
          pg.input_value("#cardNumbers input[data-card='Lidl Plus']") == "2601234567892")
    pg.click("#storeChips >> text=Delhaize")   # back to Lidl only
    pg.click("#saveBtn"); pg.wait_for_timeout(1300)
    pg.click("#makeBtn1")
    pg.wait_for_function("document.querySelector('#progress').classList.contains('hidden')", timeout=30000)
    pg.click("#tab-list"); pg.wait_for_timeout(800)
    svg = pg.locator(".loyalty svg").first
    check("the barcode is drawn under the shop", svg.count() == 1 and svg.locator("rect").count() > 20)
    try:
        import io, zxingcpp
        from PIL import Image
        img = Image.open(io.BytesIO(svg.screenshot(scale="device")))
        read = [r.text for r in zxingcpp.read_barcodes(img)]
        check("a scanner reads the right number", "2601234567892" in read, read)
    except ImportError:
        check("a scanner reads the right number (skipped: pip install zxing-cpp pillow)", True)
    pg.context.close()

    # ---- the API rejects the schema: the app still gets a menu ----
    pg = page_at(b, datetime.datetime(2026, 11, 10, 11, 0, tzinfo=BRUSSELS))
    stub_mode("reject-schema"); before = len(stub_log())
    setup_and_print(pg)
    log = stub_log()[before:]
    check("falls back without the schema if the API rejects it",
          pg.locator("#menuOut").is_visible() and any("structured=false" in l for l in log), log)
    check("on a Tuesday it plans this week", pg.locator(".week .date").first.inner_text().strip().lower() == "9 nov")
    pg.context.close()

    # ---- an empty reply is an error, not a blank menu ----
    pg = page_at(b, datetime.datetime(2026, 11, 10, 11, 0, tzinfo=BRUSSELS))
    stub_mode("empty")
    setup_and_print(pg)
    check("an empty reply shows an error", not pg.locator("#menuOut").is_visible()
          and "went wrong" in pg.inner_text("#emptyText").lower(), pg.inner_text("#emptyText"))
    pg.context.close()
    stub_mode(None)
    b.close()

for name, ok, detail in results:
    print(("✓ " if ok else "✗ ") + name + ("" if ok or not detail else f"\n    {detail}"))
failed = sum(1 for _, ok, _ in results if not ok)
print(f"{len(results) - failed} passed, {failed} failed")
sys.exit(1 if failed else 0)
