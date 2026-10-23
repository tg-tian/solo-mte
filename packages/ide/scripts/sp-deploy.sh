#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 场景配置不再复制到共享 Web 目录，兼容旧命令时直接导入后端并建立用户关联。
echo "Scene configuration now comes from the backend; this command imports the package for its target user."
exec bash "$SCRIPT_DIR/sp-import.sh" "$@"
