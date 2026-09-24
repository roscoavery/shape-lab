#!/usr/bin/env bash
# Put this Mac on Lace V4 + iCloud calendar. Never Sort (v2-rebuild).
# Safe to run from curl (does not use $0). Safe if the folder is already Sort.
#
#   curl -fsSL https://raw.githubusercontent.com/roscoavery/shape-lab/shape-lab-v4/scripts/boot-lace.sh | bash
#
set -euo pipefail

ROOT="${SHAPE_LAB_ROOT:-$HOME/shape-lab}"
GITHUB_URL="${GYM_GITHUB_URL:-https://github.com/roscoavery/shape-lab.git}"
BRANCH="shape-lab-v4"

echo "Shape Lab — boot Lace V4 + calendar"
echo "Folder: $ROOT"
echo

if ! command -v git >/dev/null 2>&1; then
  echo "Install git first (xcode-select --install or brew install git)."
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Install Node LTS from https://nodejs.org then run this again."
  echo "If you use Homebrew:  brew install node"
  exit 1
fi

mkdir -p "$ROOT"
cd "$ROOT"
export GIT_TERMINAL_PROMPT=0

if [ ! -d .git ]; then
  echo "Cloning ${GITHUB_URL} (${BRANCH})…"
  git -c credential.helper= clone --branch "$BRANCH" "$GITHUB_URL" "$ROOT"
  cd "$ROOT"
fi

PARK="$HOME/.shape-lab-gym-park"
mkdir -p "$PARK/data"
# Keep the live gym file, including the admin login. Missing accounts.json
# is what shows "create the first gym admin".
for item in ig-blobs coach-blobs ig-stills.json coach-stills.json roster.json roster-photos accounts.json sessions.json invites.json audit.json calendar.json lessons.json; do
  if [ -e "$ROOT/data/$item" ]; then
    rm -rf "$PARK/data/$item"
    cp -a "$ROOT/data/$item" "$PARK/data/$item"
  fi
done

STASHED=0
if [ -n "$(git status --porcelain -- data training 2>/dev/null || true)" ]; then
  echo "Parking gym data so roster.json cannot block the update…"
  if git stash push -u -m "boot-lace-data" -- data training; then
    STASHED=1
  fi
fi

echo "Fetching ${BRANCH} from GitHub (this cannot land on Sort)…"
if ! git -c credential.helper= fetch "$GITHUB_URL" "$BRANCH"; then
  echo "ERROR: could not download ${BRANCH} from GitHub."
  exit 1
fi

if ! git checkout -B "$BRANCH" FETCH_HEAD; then
  echo "Checkout blocked. Stashing leftover files and retrying…"
  git stash push -u -m "boot-lace-blockers" || true
  git checkout -B "$BRANCH" FETCH_HEAD
fi

if [ "$STASHED" = 1 ]; then
  git stash pop || echo "Gym data is still in git stash / $PARK — keep the copies in data/ if git reports a conflict."
fi

mkdir -p "$ROOT/data"
for item in ig-blobs coach-blobs ig-stills.json coach-stills.json roster.json roster-photos accounts.json sessions.json invites.json audit.json calendar.json lessons.json; do
  if [ -d "$PARK/data/$item" ]; then
    mkdir -p "$ROOT/data/$item"
    cp -an "$PARK/data/$item/." "$ROOT/data/$item/" 2>/dev/null || true
  elif [ -f "$PARK/data/$item" ] && [ ! -f "$ROOT/data/$item" ]; then
    cp -a "$PARK/data/$item" "$ROOT/data/$item"
  fi
done

if [ ! -f src/lib/holdBuild.ts ] || grep -q "Sort build" src/lib/holdBuild.ts; then
  echo "ERROR: still on Sort after fetch. Stop."
  exit 1
fi
if [ ! -f src/components/calendar/CalendarConnections.tsx ]; then
  echo "ERROR: V4 landed without calendar. GitHub ${BRANCH} is stale."
  exit 1
fi

echo
echo "============================================================"
echo "  LACE GYM   $(git rev-parse --short HEAD)   $(git log -1 --pretty=%s)"
echo "  Calendar: coach Today → Today from calendar"
echo "            More → Profiles → Calendar connections"
echo "============================================================"
echo

exec env GYM_MAC_BOOTED=1 GYM_BRANCH=shape-lab-v4 bash "$ROOT/scripts/mac-gym.sh"
