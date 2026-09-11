#!/usr/bin/env bash
# Run Shape Lab on this Mac as the gym for every phone.
# Keep this window open. Pause Vercel only after phones use the new URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Install Node LTS from https://nodejs.org then run this again."
  echo "If you use Homebrew:  brew install node"
  exit 1
fi

echo "Shape Lab — Mac gym"
echo "Node $(node -v)   npm $(npm -v)"
echo "Folder: $ROOT"
echo

if [ -d .git ]; then
  git fetch origin v2-rebuild 2>/dev/null || true
  git checkout v2-rebuild 2>/dev/null || true
  git pull --ff-only origin v2-rebuild 2>/dev/null || git pull --ff-only 2>/dev/null || true
  echo "Code: $(git rev-parse --short HEAD)  $(git log -1 --pretty=%s)"
fi

npm install
echo

PHOTO_DIR="$ROOT/data/roster-photos"
PHOTO_COUNT=0
if [ -d "$PHOTO_DIR" ]; then
  PHOTO_COUNT="$(find "$PHOTO_DIR" -name '*.bin' 2>/dev/null | wc -l | tr -d ' ')"
fi
if [ ! -f "$ROOT/data/roster.json" ] || [ "${PHOTO_COUNT:-0}" -eq 0 ]; then
  echo "Copying the live gym onto this Mac (Vercel stays up)…"
  npm run gym:pull
else
  echo "Using the gym copy already on this Mac ($PHOTO_COUNT profile pictures)."
  echo "Run npm run gym:pull only if Production has newer names or faces you do not have here."
fi

echo
echo "Starting the gym. Keep this window open and the Mac plugged in."
echo "Paste this on iPad / phone / laptop (same Wi-Fi), including the port:"
echo "  http://192.168.0.115:43127/"
echo "Do not paste 127.0.0.1 on the iPad. Do not pause Vercel yet."
echo

if command -v caffeinate >/dev/null 2>&1; then
  exec caffeinate -dims npm run gym:up
else
  exec npm run gym:up
fi
