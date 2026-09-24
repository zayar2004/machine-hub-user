#!/bin/bash
# Build www/ from app/ — static assets for Capacitor
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
WWW="$ROOT/www"

echo "Building www/ at $WWW"

# Clean www/ (except index.html)
find "$WWW" -mindepth 1 -maxdepth 1 ! -name 'index.html' -exec rm -rf {} + 2>/dev/null || true

# Create structure
mkdir -p "$WWW/static/css"
mkdir -p "$WWW/static/js"
mkdir -p "$WWW/static/icons"
mkdir -p "$WWW/static/vendor"

# Copy static assets
cp -r "$ROOT/app/static/css/"* "$WWW/static/css/" 2>/dev/null || true
cp -r "$ROOT/app/static/js/"* "$WWW/static/js/" 2>/dev/null || true
cp -r "$ROOT/app/static/icons/"* "$WWW/static/icons/" 2>/dev/null || true
cp -r "$ROOT/app/static/vendor/"* "$WWW/static/vendor/" 2>/dev/null || true
cp "$ROOT/app/static/manifest.json" "$WWW/static/manifest.json" 2>/dev/null || true

# Render HTML
python "$SCRIPT_DIR/render_static.py"

echo "www/ build complete"
