#!/bin/bash
# Double-click in Finder. This is the only Mac start you need.
# If the Cloudflare box-3 line is on the clipboard, it is saved automatically.
cd "$(dirname "$0")"
exec bash scripts/mac-gym.sh
