#!/usr/bin/env bash
# Run Shape Lab on this Mac as the gym for every phone.
# Keep this window open. Pause Vercel only after phones use the new URL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Live gym JSON and blobs on this Mac always win over git during updates.
gym_snapshot_live_data() {
  local park="$ROOT/.gym-park"
  mkdir -p "$park"
  rm -rf "$park/live-data-snapshot" "$park/live-training-snapshot"
  if [ -d "$ROOT/data" ]; then
    cp -a "$ROOT/data" "$park/live-data-snapshot"
  fi
  if [ -d "$ROOT/training" ]; then
    cp -a "$ROOT/training" "$park/live-training-snapshot"
  fi
}

gym_restore_live_data() {
  local park="$ROOT/.gym-park"
  if [ -d "$park/live-data-snapshot" ]; then
    mkdir -p "$ROOT/data"
    cp -a "$park/live-data-snapshot/." "$ROOT/data/"
  fi
  if [ -d "$park/live-training-snapshot" ]; then
    mkdir -p "$ROOT/training"
    cp -a "$park/live-training-snapshot/." "$ROOT/training/"
  fi
}

gym_unstick_git_for_data() {
  [ -d .git ] || return 0
  if [ -f .git/MERGE_HEAD ]; then
    echo "Clearing an interrupted git merge so the gym can update…"
    git merge --abort 2>/dev/null || true
  fi
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
    git rebase --abort 2>/dev/null || true
  fi
  if [ -f .git/CHERRY_PICK_HEAD ]; then
    git cherry-pick --abort 2>/dev/null || true
  fi
  local conflicts
  conflicts="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
  if [ -n "$conflicts" ]; then
    echo "Resolving git conflicts in gym data (your Mac copies are kept)…"
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      case "$f" in
        data/*|training/*)
          git rm -f --cached "$f" 2>/dev/null || true
          git reset HEAD -- "$f" 2>/dev/null || true
          ;;
      esac
    done <<< "$conflicts"
  fi
  git reset HEAD -- data training 2>/dev/null || true
  git checkout -- data training 2>/dev/null || true
  git update-index --refresh 2>/dev/null || true
}

if [ -d .git ]; then
  gym_unstick_git_for_data
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Install Node LTS from https://nodejs.org then run this again."
  echo "If you use Homebrew:  brew install node"
  exit 1
fi

echo "Shape Lab — Mac gym"
echo "Node $(node -v)   npm $(npm -v)"
echo "Folder: $ROOT"
echo

# Never v2-rebuild (Sort). Gym line is shape-lab-v4 (Lace).
GYM_BRANCH="${GYM_BRANCH:-shape-lab-v4}"
if [ "$GYM_BRANCH" = "v2-rebuild" ] || [ "$GYM_BRANCH" = "sort" ]; then
  echo "Ignoring GYM_BRANCH=${GYM_BRANCH} (Sort). Using shape-lab-v4."
  GYM_BRANCH="shape-lab-v4"
fi
GITHUB_GIT_URL="${GYM_GITHUB_URL:-https://github.com/roscoavery/shape-lab.git}"
CLOUD_GIT_URL="${GYM_CLOUD_URL:-https://origin.cursor.com/git/ryan-williams/tmp-cedaa575ce67445f.git}"

git_fetch_branch_from_url() {
  local url="$1"
  export GIT_TERMINAL_PROMPT=0
  git -c credential.helper= fetch "$url" "$GYM_BRANCH" 2>/dev/null
}

git_verify_lace_build() {
  if [ ! -f "$ROOT/src/lib/holdBuild.ts" ]; then
    echo "ERROR: src/lib/holdBuild.ts missing — wrong checkout."
    return 1
  fi
  if grep -q "Sort build" "$ROOT/src/lib/holdBuild.ts"; then
    echo "ERROR: This folder is still on Sort (v2-rebuild). Gym phones will show the wrong app."
    echo "Run:  bash scripts/recover-gym-v4.sh"
    return 1
  fi
  if ! grep -q "Lace build" "$ROOT/src/lib/holdBuild.ts"; then
    echo "WARNING: holdBuild stamp is not Lace — check src/lib/holdBuild.ts"
  fi
  return 0
}

calendar_ui_present() {
  [ -f "$ROOT/src/components/calendar/CalendarConnections.tsx" ] &&
    [ -f "$ROOT/src/components/calendar/TodayCalendarSection.tsx" ] &&
    [ -f "$ROOT/server/calendar/apiRoutes.ts" ]
}

ensure_calendar_key() {
  local env="$ROOT/.env"
  if [ ! -f "$env" ] && [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$env"
  fi
  touch "$env"
  local key=""
  if command -v openssl >/dev/null 2>&1; then
    key="$(openssl rand -base64 32 | tr -d '\n')"
  else
    key="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  fi
  if ! grep -q '^CALENDAR_CREDENTIAL_KEY=' "$env"; then
    printf '\nCALENDAR_CREDENTIAL_KEY=%s\n' "$key" >> "$env"
    echo "Wrote CALENDAR_CREDENTIAL_KEY to .env (local gym only)."
  elif grep -q '^CALENDAR_CREDENTIAL_KEY=$' "$env"; then
    if command -v sed >/dev/null 2>&1; then
      sed -i.bak "s|^CALENDAR_CREDENTIAL_KEY=$|CALENDAR_CREDENTIAL_KEY=${key}|" "$env"
      rm -f "${env}.bak"
    else
      printf '\nCALENDAR_CREDENTIAL_KEY=%s\n' "$key" >> "$env"
    fi
    echo "Filled empty CALENDAR_CREDENTIAL_KEY in .env."
  fi
}

# Fetch unless this process already re-exec'd AND calendar is on disk.
# GYM_MAC_BOOTED=1 used to skip the update — that left Lace without calendar.
if [ -d .git ] && { [ -z "${GYM_MAC_BOOTED:-}" ] || ! calendar_ui_present; }; then
  if ! calendar_ui_present; then
    echo "Calendar files missing on this Mac. Pulling ${GYM_BRANCH} so Today / Profiles get iCloud."
  fi
  echo "Updating this Mac to ${GYM_BRANCH} (Lace V4 gym line). Local data/ stays here."

  gym_snapshot_live_data
  gym_unstick_git_for_data

  PARK="$ROOT/.gym-park"
  mkdir -p "$PARK/data"
  for item in ig-blobs coach-blobs ig-stills.json coach-stills.json roster.json roster-photos accounts.json sessions.json invites.json calendar.json coach-content.json lessons.json training-events.json; do
    if [ -e "$ROOT/data/$item" ]; then
      rm -rf "$PARK/data/$item"
      cp -a "$ROOT/data/$item" "$PARK/data/$item"
    fi
  done

  FETCHED=0
  if git_fetch_branch_from_url "$GITHUB_GIT_URL"; then
    git checkout -f -B "$GYM_BRANCH" FETCH_HEAD
    FETCHED=1
    echo "Updated from GitHub (${GYM_BRANCH} at $(git rev-parse --short HEAD))."
  elif git_fetch_branch_from_url "$CLOUD_GIT_URL"; then
    git checkout -f -B "$GYM_BRANCH" FETCH_HEAD
    FETCHED=1
    echo "Updated from cloud (${GYM_BRANCH} at $(git rev-parse --short HEAD))."
  else
    echo "GitHub/cloud fetch failed. Trying named remotes…"
    for remote in github origin; do
      if git remote get-url "$remote" >/dev/null 2>&1; then
        export GIT_TERMINAL_PROMPT=0
        if git -c credential.helper= fetch "$remote" "$GYM_BRANCH" 2>/dev/null; then
          if git rev-parse --verify "${remote}/${GYM_BRANCH}" >/dev/null 2>&1; then
            git checkout -f -B "$GYM_BRANCH" "${remote}/${GYM_BRANCH}"
            FETCHED=1
            echo "Updated from ${remote}/${GYM_BRANCH} at $(git rev-parse --short HEAD)."
            break
          fi
        fi
      fi
    done
  fi

  if [ "$FETCHED" = 0 ]; then
    echo "ERROR: Could not download ${GYM_BRANCH}. Run:  bash scripts/recover-gym-v4.sh"
    exit 1
  fi

  if ! git_verify_lace_build; then
    exit 1
  fi

  rm -f dist/index.html

  gym_restore_live_data

  mkdir -p "$ROOT/data/ig-blobs" "$ROOT/data/coach-blobs"
  if [ -d "$PARK/data/ig-blobs" ]; then
    cp -an "$PARK/data/ig-blobs/." "$ROOT/data/ig-blobs/" 2>/dev/null || true
  fi
  if [ -d "$PARK/data/coach-blobs" ]; then
    cp -an "$PARK/data/coach-blobs/." "$ROOT/data/coach-blobs/" 2>/dev/null || true
  fi
  if [ -d "$PARK/data/roster-photos" ]; then
    mkdir -p "$ROOT/data/roster-photos"
    cp -an "$PARK/data/roster-photos/." "$ROOT/data/roster-photos/" 2>/dev/null || true
  fi
  for item in ig-stills.json coach-stills.json roster.json accounts.json sessions.json invites.json calendar.json; do
    if [ -f "$PARK/data/$item" ] && [ ! -f "$ROOT/data/$item" ]; then
      cp -a "$PARK/data/$item" "$ROOT/data/$item"
    fi
  done

  if ! calendar_ui_present; then
    echo "ERROR: ${GYM_BRANCH} still has no calendar UI after the update."
    echo "GitHub shape-lab-v4 must include src/components/calendar/CalendarConnections.tsx."
    exit 1
  fi

  echo
  echo "============================================================"
  echo "  LACE GYM   $(git rev-parse --short HEAD)   $(git log -1 --pretty=%s)"
  echo "  https://gym.shapelab.win should show Lace build (not Sort)."
  echo "  Calendar: coach Today → Today from calendar"
  echo "            More → Profiles → Calendar connections"
  echo "============================================================"
  echo
  echo "Reloading this script from the files that just landed…"
  exec env GYM_MAC_BOOTED=1 bash "$ROOT/scripts/mac-gym.sh"
fi

gym_unstick_git_for_data
git_verify_lace_build || exit 1
if ! calendar_ui_present; then
  echo "ERROR: Calendar UI is still missing. Run this again without GYM_MAC_BOOTED."
  exit 1
fi

ensure_calendar_key
npm install
echo

mkdir -p "$ROOT/data/coach-blobs"
node --input-type=module -e "
import fs from 'node:fs'
import path from 'node:path'
const man = JSON.parse(fs.readFileSync('src/config/shippedCoachStills.json', 'utf8'))
for (const row of man.extras || []) {
  if (!row?.id || !row.file) continue
  const src = path.join('public/learn/coach-stills', row.file)
  const dest = path.join('data/coach-blobs', row.id + path.extname(row.file))
  if (fs.existsSync(src) && !fs.existsSync(dest)) fs.copyFileSync(src, dest)
}
console.log('Shipped coach stills are in data/coach-blobs.')
" || true

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
