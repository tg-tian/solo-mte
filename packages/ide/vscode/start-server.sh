#!/usr/bin/env bash
# 启动 VSCode Remote Extension Host Server（供 app-builder 前端连接）
#
# 用法：
#   ./packages/development/vscode/start-server.sh                       # 默认 localhost:8000，无 token
#   VSCODE_PORT=9000 ./packages/development/vscode/start-server.sh       # 换端口
#   VSCODE_CONNECTION_TOKEN=abc ./packages/development/vscode/start-server.sh
#
# 前端通过 code-editor.component.tsx 中的 VITE_VSCODE_REMOTE_AUTHORITY
# 环境变量（或默认 localhost:8000）连接本 server。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

HOST="${VSCODE_HOST:-localhost}"
PORT="${VSCODE_PORT:-8000}"
TOKEN="${VSCODE_CONNECTION_TOKEN:-}"

DATA_DIR="$SCRIPT_DIR/.data"
mkdir -p "$DATA_DIR/server-data" "$DATA_DIR/user-data" "$DATA_DIR/extensions"

ARGS=(
  --host "$HOST"
  --port "$PORT"
  --accept-server-license-terms
  --server-data-dir "$DATA_DIR/server-data"
  --user-data-dir   "$DATA_DIR/user-data"
  --extensions-dir  "$DATA_DIR/extensions"
)

if [[ -n "$TOKEN" ]]; then
  ARGS+=(--connection-token "$TOKEN")
else
  ARGS+=(--without-connection-token)
fi

echo "[vscode-server] starting on $HOST:$PORT ..."
exec node "$SCRIPT_DIR/out/server-main.js" "${ARGS[@]}"
