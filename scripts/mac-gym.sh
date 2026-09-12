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
  if ! git pull --ff-only origin v2-rebuild; then
    echo
    echo "WARNING: git pull --ff-only failed. This Mac may still be on old code."
    echo "The iPad refresh will not pick up GitHub until this folder updates."
    echo "If this branch diverged:  git pull --rebase origin v2-rebuild"
    echo "If dirty gym files are blocking pull, stash them, then pull again."
    echo
  fi
  echo "Code: $(git rev-parse --short HEAD)  $(git log -1 --pretty=%s)"
  echo "Hold stamp on this start: Lime build — neon green bar on Class flows."
  echo "If the iPad has no neon green bar, this gym did not rebuild the new files."
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
echo "If the box-3 token is on the clipboard, this start saves it automatically."
echo "Do not paste 127.0.0.1 on the iPad. Do not pause Vercel yet."
echo
node --input-type=module -e "import { printLanUrls } from './scripts/lan-urls.mjs'; printLanUrls(process.env.SHAPE_LAB_PORT || 43127)"
echo

if command -v caffeinate >/dev/null 2>&1; then
  exec caffeinate -dims npm run gym:up
else
  exec npm run gym:up
fi
