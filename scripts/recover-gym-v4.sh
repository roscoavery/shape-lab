#!/usr/bin/env bash
# Recovery when the Mac folder is stuck on Sort (v2-rebuild). No Cursor login.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
GITHUB_URL="${GYM_GITHUB_URL:-https://github.com/roscoavery/shape-lab.git}"
BRANCH="shape-lab-v4"

echo "Shape Lab — recover V4 (Lace) on this Mac (via GitHub, no Cursor login)"
cp data/roster.json "$HOME/Desktop/shape-lab-roster-backup.json" 2>/dev/null || true

export GIT_TERMINAL_PROMPT=0
git -c credential.helper= fetch "$GITHUB_URL" "$BRANCH"
git checkout -B "$BRANCH" FETCH_HEAD

if grep -q "Sort build" src/lib/holdBuild.ts; then
  echo "FAILED: still on Sort. Tell Ryan the cloud branch did not update."
  exit 1
fi

if [ ! -f src/components/calendar/CalendarConnections.tsx ]; then
  echo "FAILED: this checkout has no calendar UI. GitHub shape-lab-v4 is stale."
  exit 1
fi

echo "OK: $(git rev-parse --short HEAD) — $(grep HOLD_BUILD_LABEL src/lib/holdBuild.ts | head -1)"
echo "Calendar: coach Today + More → Profiles → Calendar connections"
npm install
echo "Starting gym…"
exec env GYM_MAC_BOOTED=1 npm run gym:mac
