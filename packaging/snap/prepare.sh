#!/bin/sh
# Build the desktop shell on the host and stage it for snapcraft.
# The LXD build then only copies these files. It does not run pnpm.
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root"

pnpm desktop:build

electron_dist=$(node --input-type=module <<'EOF'
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pkg = pathToFileURL(path.resolve('apps/desktop/package.json')).href;
const require = createRequire(pkg);
console.log(path.dirname(require('electron')));
EOF
)

stage="$root/packaging/snap/stage"
rm -rf "$stage"
mkdir -p "$stage/electron" "$stage/share/neo-urbe/assets" "$stage/bin" "$stage/meta/gui"

cp -a "$electron_dist"/. "$stage/electron/"
rm -f "$stage/electron/chrome-sandbox"
cp -a apps/desktop/dist "$stage/share/neo-urbe/dist"
cp -a apps/desktop/www "$stage/share/neo-urbe/www"
cp -a apps/desktop/assets/icon.png "$stage/share/neo-urbe/assets/icon.png"
cp -a apps/desktop/assets/icon.png "$stage/meta/gui/icon.png"
install -m755 packaging/snap/neo-urbe.sh "$stage/bin/neo-urbe"

echo "Staged snap payload in packaging/snap/stage"
