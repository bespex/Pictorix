#!/usr/bin/env bash
# Generates all app icons from the two sources in assets/:
#   icon.svg        the icon, used from 32 px up
#   icon-small.svg  the small version for 16 and 24 px (one photo, bigger crown; brand rules §8)
# Needs the Tauri CLI (npm ci) and ImageMagick. Run from the repository root: tools/icons.sh
set -euo pipefail
cd "$(dirname "$0")/.."
out=src-tauri/icons
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

npx tauri icon assets/icon.svg -o "$out" >/dev/null
npx tauri icon assets/icon-small.svg -o "$tmp" >/dev/null
rm -rf "$out/android" "$out/ios"

# frames of the .ico files: 16, 24, 32, 48, 64, 256
frame() { identify -format '%s %w\n' "$1" | awk -v w="$2" '$2 == w { print $1; exit }'; }
for size in 16 24; do convert "$tmp/icon.ico[$(frame "$tmp/icon.ico" $size)]" "$out/${size}x${size}.png"; done
big="$out/icon.ico"
convert "$out/16x16.png" "$out/24x24.png" \
  "$big[$(frame "$big" 32)]" "$big[$(frame "$big" 48)]" "$big[$(frame "$big" 64)]" "$big[$(frame "$big" 256)]" \
  "$tmp/icon-combined.ico"
mv "$tmp/icon-combined.ico" "$big"

convert "$out/icon.png" -resize 192x192 src/assets/logo.png
identify -format '%f: %w px\n' "$big" | sort -u
