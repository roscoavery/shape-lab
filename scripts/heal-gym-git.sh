#!/usr/bin/env bash
# One-shot: clear merge/rebase state in data/ so npm run gym:mac can run.
# Safe to run anytime. Does not delete files in data/ — only fixes git's index.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# Re-use mac-gym helpers when present
if [ -f "$ROOT/scripts/mac-gym.sh" ]; then
  # shellcheck source=/dev/null
  source /dev/null
fi
exec bash -c '
  ROOT="'"$ROOT"'"
  cd "$ROOT"
  [ -d .git ] || { echo "Not a git repo."; exit 0; }
  git merge --abort 2>/dev/null || true
  git rebase --abort 2>/dev/null || true
  git cherry-pick --abort 2>/dev/null || true
  conflicts=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
  if [ -n "$conflicts" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] || continue
      case "$f" in data/*|training/*) git rm -f --cached "$f" 2>/dev/null || true ;; esac
    done <<< "$conflicts"
  fi
  git reset HEAD -- data training 2>/dev/null || true
  git checkout -- data training 2>/dev/null || true
  echo "Git index cleared for data/ and training/. Run: npm run gym:mac"
'
