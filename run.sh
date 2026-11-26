#!/usr/bin/env bash
# Start Pictorix as it is in the working tree.
#
#   ./run.sh [ARGS...]            with hot reload: frontend changes appear immediately,
#                                 Rust changes rebuild and restart the app
#   ./run.sh --release [ARGS...]  optimized build without packaging, then start it
#
# ARGS go to pictorix.

set -euo pipefail

repo="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

release=false
case "${1:-}" in
  -h | --help)
    sed -n '2,8s/^# \{0,1\}//p' "$0"
    exit 0
    ;;
  --release)
    release=true
    shift
    ;;
esac

cd "$repo"

for tool in npm cargo; do
  command -v "$tool" >/dev/null || { echo "run.sh: $tool not found" >&2; exit 1; }
done

# Install or refresh dependencies only when package-lock.json is newer than the last install
if [[ ! -d node_modules || package-lock.json -nt node_modules/.package-lock.json ]]; then
  npm install --no-audit --no-fund
fi

if $release; then
  npm run --silent tauri -- build --no-bundle
  # Where cargo builds to: src-tauri/target, unless configured otherwise (CARGO_TARGET_DIR, build.target-dir)
  target="$(cargo metadata --format-version 1 --no-deps --manifest-path src-tauri/Cargo.toml | sed -n 's/.*"target_directory":"\([^"]*\)".*/\1/p')"
  exec "${target:-$repo/src-tauri/target}/release/pictorix" "$@"
fi

# The dev server needs its fixed port; a second instance would fail with an unclear error
if (exec 3<>/dev/tcp/127.0.0.1/1420) 2>/dev/null; then
  echo "run.sh: port 1420 is in use - is another ./run.sh still running?" >&2
  exit 1
fi

# First `--` ends the tauri options, second `--` ends the cargo options; the rest goes to pictorix
exec npx tauri dev -- -- "$@"
