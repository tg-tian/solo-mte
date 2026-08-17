#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IDE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$IDE_ROOT/apps/platform/development-platform/ide/app-center"

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
SCENE_CODE="$(jq -r '.sceneData.code' "$SCENE_JSON")"

case "$SCENE_ID" in
    ''|null|*[!0-9]*)
        echo "Error: sceneData.sceneId must be a number"
        exit 1
        ;;
esac

case "$SCENE_CODE" in
    ''|null|*[!A-Za-z0-9._-]*)
        echo "Error: sceneData.code must be a safe file name"
        exit 1
        ;;
esac

mkdir -p "$CONFIG_DIR"
rm -f "$CONFIG_DIR"/*.config
cp "$SCENE_JSON" "$CONFIG_DIR/$SCENE_CODE.config"

echo "Config copied: $CONFIG_DIR/$SCENE_CODE.config"
echo "sceneId: $SCENE_ID"
echo "sceneCode: $SCENE_CODE"
