#!/usr/bin/env bash
# One-shot: jump this Mac folder to the newest shape-lab-v4 (Lace + calendar).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CLOUD_URL="https://origin.cursor.com/git/ryan-williams/tmp-cedaa575ce67445f.git"
cp data/roster.json "$HOME/Desktop/shape-lab-roster-backup.json" 2>/dev/null || true
git remote add cloud "$CLOUD_URL" 2>/dev/null || git remote set-url cloud "$CLOUD_URL" 2>/dev/null || true
git fetch cloud shape-lab-v4
git stash push -u -m "gym-bootstrap" -- data training 2>/dev/null || true
git checkout -f -B shape-lab-v4 cloud/shape-lab-v4
npm install
exec npm run gym:mac
