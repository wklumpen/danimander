"""Render public/og.png (1200x630) from the app's ?og route.

    npm run build && npx vite preview --port 4173 &   then   python scripts/og.py
Needs Python Playwright (pip install playwright && playwright install chromium).
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/?og"
out = Path(__file__).resolve().parent.parent / "public" / "og.png"
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1200, "height": 630})
    page.goto(url)
    page.wait_for_selector(".og svg")
    page.screenshot(path=str(out))
    b.close()
print(f"wrote {out}")
