#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_RELATIVE_DIR="apps/platform/development-platform/ide/app-center"
CONFIG_FILE_NAME="scene.config"
WEB_ROOTS=(
    /home/BaseEnvironment/igix2508/web
    /home/BaseEnvironment/igix2508B/web
)

if [ "$#" -ne 1 ]; then
    echo "Usage: bash scripts/sp-deploy.sh <scene.zip>"
    exit 1
fi

ZIP_FILE="$1"

if [ ! -f "$ZIP_FILE" ]; then
    echo "Error: scene zip does not exist: $ZIP_FILE"
    exit 1
fi

command -v unzip >/dev/null 2>&1 || { echo "Error: unzip is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "Error: jq is required"; exit 1; }

EXTRACT_DIR="$(mktemp -d)"
cleanup() {
    rm -rf "$EXTRACT_DIR"
}
trap cleanup EXIT

unzip -q "$ZIP_FILE" -d "$EXTRACT_DIR"

SCENE_JSON="$EXTRACT_DIR/scene.json"
if [ ! -f "$SCENE_JSON" ]; then
    echo "Error: scene.json must exist at the root of the scene zip"
    exit 1
fi

jq empty "$SCENE_JSON"

SCENE_ID="$(jq -r '.sceneData.sceneId' "$SCENE_JSON")"
SCENE_CODE="$(jq -r '.sceneData.code // ""' "$SCENE_JSON")"

case "$SCENE_ID" in
    ''|null|*[!0-9]*)
        echo "Error: sceneData.sceneId must be a number"
        exit 1
        ;;
esac

for web_root in "${WEB_ROOTS[@]}"; do
    CONFIG_DIR="$web_root/$CONFIG_RELATIVE_DIR"
    mkdir -p "$CONFIG_DIR"
    cp "$SCENE_JSON" "$CONFIG_DIR/$CONFIG_FILE_NAME"
    echo "Config copied: $CONFIG_DIR/$CONFIG_FILE_NAME"
done

echo "sceneId: $SCENE_ID"
echo "sceneCode: $SCENE_CODE"
