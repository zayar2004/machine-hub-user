"""Render Flask templates → static HTML for Capacitor www/."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import create_app

app = create_app()

ROUTES = [
    ("/", "index.html"),
    ("/search", "search.html"),
    ("/settings", "settings.html"),
    ("/help", "help.html"),
    ("/help/format", "help-format.html"),
]

WWW = ROOT / "www"

with app.test_client() as client:
    for route, out_name in ROUTES:
        try:
            resp = client.get(route)
            html = resp.data.decode("utf-8")

            # Static path rewrites
            html = html.replace('href="/search"', 'href="/search.html"')
            html = html.replace('href="/settings"', 'href="/settings.html"')
            html = html.replace('href="/help/format"', 'href="/help-format.html"')
            html = html.replace('href="/help"', 'href="/help.html"')
            # Home / — only exact
            html = html.replace('href="/"', 'href="/index.html"')
            # Route rewrites in JS strings
            html = html.replace("'/machine/'", "'/machine.html?code='")
            html = html.replace('"/machine/"', '"/machine.html?code="')

            out = WWW / out_name
            out.write_text(html, encoding="utf-8")
            print(f"OK {route} -> {out_name} ({len(html)} bytes)")
        except Exception as e:
            print(f"FAIL {route}: {e}")

print("Static render complete")
