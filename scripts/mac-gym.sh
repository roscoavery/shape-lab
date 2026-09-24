#!/usr/bin/env bash
# Sort (v2-rebuild) gym:mac is retired. The gym line is Lace V4 + calendar.
# This file only jumps the folder to GitHub shape-lab-v4. It does not merge trees.
set -euo pipefail
echo "This folder is Sort. Switching to Lace V4 + calendar from GitHub."
echo "Athlete files in data/ stay on this Mac."
curl -fsSL https://raw.githubusercontent.com/roscoavery/shape-lab/shape-lab-v4/scripts/boot-lace.sh | bash
