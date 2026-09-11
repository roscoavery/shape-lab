#!/bin/bash
# Double-click in Finder. Leave this window open.
# Then go back to the Cloud Agent chat and say: worker is on
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$HOME/.cursor/bin:/usr/local/bin:$PATH"

if ! command -v agent >/dev/null 2>&1; then
  echo "Installing the Cursor CLI…"
  curl https://cursor.com/install -fsS | bash
  export PATH="$HOME/.local/bin:$HOME/.cursor/bin:/usr/local/bin:$PATH"
fi

if ! command -v agent >/dev/null 2>&1; then
  echo "The Cursor CLI did not land on PATH. Open a new Terminal and run: agent --version"
  exit 1
fi

echo "If a browser window opens, sign in as the same Cursor account you use on this Mac."
agent login || true

echo
echo "This Mac is now a Cursor worker. Leave this window open."
echo "Go back to the Cloud Agent chat and type: worker is on"
echo

exec agent worker start --name "ryans-mac" --worker-dir "$PWD"
