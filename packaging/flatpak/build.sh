#!/bin/sh
# Stage the host desktop build and install a local Flatpak. Does not publish anywhere.
set -eu
cd "$(dirname "$0")/../.."

if ! command -v flatpak >/dev/null 2>&1; then
  echo "flatpak is not installed. On Debian/Ubuntu: sudo apt install flatpak" >&2
  exit 1
fi

game=apps/desktop
if [ ! -f "$game/www/index.html" ] || [ ! -f "$game/dist/main.js" ] || [ ! -f "$game/assets/icon.png" ]; then
  echo "Missing desktop build. Run pnpm desktop:build first." >&2
  exit 1
fi

electron_dist=$(node --input-type=module <<'EOF'
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const pkg = pathToFileURL(path.resolve('apps/desktop/package.json')).href;
const require = createRequire(pkg);
console.log(path.dirname(require('electron')));
EOF
)

stage=packaging/flatpak/stage
rm -rf "$stage"
mkdir -p "$stage/electron" "$stage/game/dist" "$stage/game/www" "$stage/game/assets"
cp -a "$electron_dist"/. "$stage/electron/"
rm -f "$stage/electron/chrome-sandbox"
cp -a "$game/dist"/. "$stage/game/dist/"
cp -a "$game/www"/. "$stage/game/www/"
cp -a "$game/assets/icon.png" "$stage/game/assets/icon.png"

manifest=packaging/flatpak/io.github.gamestudio42.neo-urbe.yml
build_dir=packaging/flatpak/build
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
if command -v flatpak-builder >/dev/null 2>&1; then
  flatpak-builder --user --install --install-deps-from=flathub --force-clean --disable-rofiles-fuse \
    "$build_dir" "$manifest"
else
  flatpak install --user -y flathub org.flatpak.Builder
  flatpak run --filesystem="$(pwd)" org.flatpak.Builder \
    --user --install --install-deps-from=flathub --force-clean \
    "$build_dir" "$manifest"
fi

echo "Installed. Run: flatpak run io.github.gamestudio42.neo-urbe"
