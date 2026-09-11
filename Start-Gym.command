#!/bin/bash
# Double-click in Finder on the Mac. Terminal stays open.
cd "$(dirname "$0")"
exec bash scripts/mac-gym.sh
