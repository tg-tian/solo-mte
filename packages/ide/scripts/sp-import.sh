#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "$#" -gt 2 ]; then
    echo "Usage: bash scripts/sp-import.sh <scene.zip> [userId]"
    exit 1
fi
ZIP_FILE="${1:-}"
if [ -z "$ZIP_FILE" ]; then
    read -rp "Scene zip path: " ZIP_FILE
fi
if [ ! -f "$ZIP_FILE" ]; then
    echo "Error: scene zip does not exist: $ZIP_FILE"
    exit 1
fi
for command in unzip jq curl docker; do
    command -v "$command" >/dev/null 2>&1 || { echo "Error: $command is required"; exit 1; }
done

DOCKER_MYSQL="mte-mysql"
DB_USER="root"
DB_PASS="3edc@WSX!QAZ"
DB_NAME="lowcodeDemo"
BACKEND_URL="http://127.0.0.1:8080/scenes/import"
EXTRACT_DIR="$(mktemp -d)"
trap 'rm -rf -- "$EXTRACT_DIR"' EXIT
unzip -q "$ZIP_FILE" -d "$EXTRACT_DIR"
SCENE_JSON="$EXTRACT_DIR/scene.json"
if [ ! -f "$SCENE_JSON" ]; then
    echo "Error: scene.json must exist at the root of the zip"
    exit 1
fi
jq empty "$SCENE_JSON"

TARGET_USER_ID="${2:-${SOLO_USER_ID:-}}"
if [ -z "$TARGET_USER_ID" ]; then
    TARGET_USER_ID="$(jq -r '.userId // empty' "$SCENE_JSON")"
fi
if [ -z "$TARGET_USER_ID" ] && [ -f "$EXTRACT_DIR/manifest.json" ]; then
    TARGET_USER_ID="$(jq -r '.userId // empty' "$EXTRACT_DIR/manifest.json")"
fi
TARGET_USER_ID="$(printf '%s' "$TARGET_USER_ID" | jq -Rrs 'gsub("^\\s+|\\s+$"; "")')"
if [ -z "$TARGET_USER_ID" ] || [ "${#TARGET_USER_ID}" -gt 128 ]; then
    echo "Error: provide userId as the second argument, SOLO_USER_ID, or in the package"
    exit 1
fi

echo "Import scene for user: $TARGET_USER_ID"
TABLE_COUNT=$(docker exec -i "$DOCKER_MYSQL" mysql -N -B -u "$DB_USER" -p"$DB_PASS" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")
if [ "$TABLE_COUNT" -eq 0 ]; then
    SQL_FILE="$(find "$EXTRACT_DIR" -type f -name '*.sql' -print -quit)"
    if [ -z "$SQL_FILE" ]; then
        echo "Error: a fresh database requires a schema SQL file in the package"
        exit 1
    fi
    docker exec -i "$DOCKER_MYSQL" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
else
    echo "Existing database detected; schema/data import skipped ($TABLE_COUNT tables)."
fi

docker exec -i "$DOCKER_MYSQL" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SCRIPT_DIR/sql/user-resource-rel.sql"
HTTP_RESPONSE=$(curl -sS --connect-timeout 10 --max-time 300 -w "\n%{http_code}" -X POST \
    -F "file=@$ZIP_FILE" --form-string "userId=$TARGET_USER_ID" "$BACKEND_URL")
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != 200 ]; then
    echo "Error: import failed (HTTP $HTTP_CODE): $HTTP_BODY"
    exit 1
fi
echo "Scene import and user associations completed: $TARGET_USER_ID"
echo "Refresh IDE to load this user's visible scenes."
