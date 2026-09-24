#!/usr/bin/env bash
# Recovery when the Mac folder is stuck on Sort. Delegates to boot-lace.sh.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
export SHAPE_LAB_ROOT="${SHAPE_LAB_ROOT:-$HERE}"
if [ -f "$HERE/scripts/boot-lace.sh" ]; then
  exec bash "$HERE/scripts/boot-lace.sh"
fi
curl -fsSL https://raw.githubusercontent.com/roscoavery/shape-lab/shape-lab-v4/scripts/boot-lace.sh | bash
