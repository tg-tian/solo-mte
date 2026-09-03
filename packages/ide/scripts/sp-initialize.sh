#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ZIP_FILE="${1:-}"
if [ -z "$ZIP_FILE" ]; then
    read -rp "Scene zip path: " ZIP_FILE
fi

if [ "$#" -gt 1 ]; then
    echo "Usage: bash scripts/sp-initialize.sh <scene.zip>"
    exit 1
fi

if [ ! -f "$ZIP_FILE" ]; then
    echo "Error: scene zip does not exist: $ZIP_FILE"
    exit 1
fi

echo "Scene init:"
echo "  ZIP_FILE:        $ZIP_FILE"

bash "$SCRIPT_DIR/sp-import.sh" "$ZIP_FILE"
bash "$SCRIPT_DIR/sp-templates.sh" "$ZIP_FILE"
bash "$SCRIPT_DIR/sp-deploy.sh" "$ZIP_FILE"

echo "Scene init complete."
