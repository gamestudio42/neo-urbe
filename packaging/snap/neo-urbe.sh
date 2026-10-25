#!/bin/sh
# Launch the bundled Electron shell. The snap sandbox replaces Chromium's setuid sandbox.
set -eu
export ELECTRON_DISABLE_SANDBOX=1
exec "$SNAP/electron/electron" "$SNAP/share/neo-urbe/dist/main.js" --no-sandbox "$@"
