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

if [ -d .git ] && [ -z "${GYM_MAC_BOOTED:-}" ]; then
  echo "Updating this Mac to GitHub v2-rebuild. Gym names and clips stay on this computer."
  git fetch origin v2-rebuild 2>/dev/null || git fetch origin v2-rebuild || true

  STASHED=0
  PARK="$ROOT/.gym-park"
  mkdir -p "$PARK/data"
  for item in ig-blobs coach-blobs ig-stills.json coach-stills.json; do
    if [ -e "$ROOT/data/$item" ]; then
      rm -rf "$PARK/data/$item"
      cp -a "$ROOT/data/$item" "$PARK/data/$item"
    fi
  done
  if [ -n "$(git status --porcelain -- data training 2>/dev/null || true)" ]; then
    echo "Parking gym data files so they cannot block the update…"
    if git stash push -u -m "gym-mac-data" -- data training; then
      STASHED=1
    fi
  fi

  git checkout v2-rebuild 2>/dev/null || true
  if git rev-parse --verify origin/v2-rebuild >/dev/null 2>&1; then
    BEFORE="$(git rev-parse --short HEAD)"
    git reset --hard origin/v2-rebuild
    AFTER="$(git rev-parse --short HEAD)"
    echo "This Mac now matches GitHub: $AFTER"
    if [ "$BEFORE" != "$AFTER" ]; then
      rm -f dist/index.html
      echo "Forcing a new phone bundle ($BEFORE → $AFTER) so Safari cannot keep yesterday's files."
    fi
  else
    echo "WARNING: could not see origin/v2-rebuild. Staying on $(git rev-parse --short HEAD)."
  fi

  if [ "$STASHED" = 1 ]; then
    if ! git stash pop; then
      echo "Your gym data is still in the latest git stash. Keep the copies in data/ if git reports a conflict."
    fi
  fi

  # git stash -u skips gitignored JPEGs. Put parked stills back if the update
  # left an empty ig-blobs / coach-blobs folder.
  mkdir -p "$ROOT/data/ig-blobs" "$ROOT/data/coach-blobs"
  if [ -d "$PARK/data/ig-blobs" ]; then
    cp -an "$PARK/data/ig-blobs/." "$ROOT/data/ig-blobs/" 2>/dev/null || true
  fi
  if [ -d "$PARK/data/coach-blobs" ]; then
    cp -an "$PARK/data/coach-blobs/." "$ROOT/data/coach-blobs/" 2>/dev/null || true
  fi
  for item in ig-stills.json coach-stills.json; do
    if [ -f "$PARK/data/$item" ] && [ ! -f "$ROOT/data/$item" ]; then
      cp -a "$PARK/data/$item" "$ROOT/data/$item"
    fi
  done

  echo
  echo "============================================================"
  echo "  PRINT BUILD   $(git rev-parse --short HEAD)   $(git log -1 --pretty=%s)"
  echo "  iPad must show a cyan chip that says Print build."
  echo "  Keep, Sweep, Path, Gleam, Sleet, Rime, Glaze, Frost, Ash, or Ember"
  echo "  means this window is still old — Ctrl+C, then run npm run gym:mac again."
  echo "============================================================"
  echo
  echo "Reloading this script from the files that just landed…"
  exec env GYM_MAC_BOOTED=1 bash "$ROOT/scripts/mac-gym.sh"
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
