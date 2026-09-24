#!/usr/bin/env bash
# Clear merge/rebase state in data/ so npm run gym:mac can run. Does not delete data/ files.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ ! -d .git ]; then
  echo "Not a git repo — nothing to heal."
  exit 0
fi
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true
git cherry-pick --abort 2>/dev/null || true
conflicts="$(git diff --name-only --diff-filter=U 2>/dev/null || true)"
if [ -n "$conflicts" ]; then
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in
      data/*|training/*) git rm -f --cached "$f" 2>/dev/null || true ;;
    esac
  done <<< "$conflicts"
fi
git reset HEAD -- data training 2>/dev/null || true
git checkout -- data training 2>/dev/null || true
git update-index --refresh 2>/dev/null || true
echo "Git is ready. Run: npm run gym:mac"
