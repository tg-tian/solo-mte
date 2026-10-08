#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$IDE_ROOT/dist"
WEB_ROOTS=(
    /home/BaseEnvironment/igix2508/web
    /home/BaseEnvironment/igix2508B/web
)

if [ ! -f "$DIST_DIR/apps/platform/development-platform/ide/app-center/index.html" ]; then
    echo "Error: dist is missing app-center output. Run npm run build first."
    exit 1
fi

for web_root in "${WEB_ROOTS[@]}"; do
    mkdir -p "$web_root"
    cp -a "$DIST_DIR/." "$web_root/"
    echo "Copied dist to: $web_root"
done
