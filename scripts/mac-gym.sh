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
fi

npm install
echo
echo "Copying the live gym onto this Mac (Vercel stays up)…"
npm run gym:pull

echo
echo "Starting the gym. Keep this window open and the Mac plugged in."
echo "On iPad and phone (same Wi-Fi as this Mac), open the http://192.168… link."
echo "Ignore a trycloudflare https link if it 502s."
echo "Do not pause Vercel until faces show on the Wi-Fi link."
echo

if command -v caffeinate >/dev/null 2>&1; then
  exec caffeinate -dims npm run gym:up
else
  exec npm run gym:up
fi
