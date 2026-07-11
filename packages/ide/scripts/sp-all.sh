#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ====== 参数收集 ======
if [ -z "$1" ]; then
    read -rp "请输入场景元信息压缩包路径 (例如 /root/LCTechPark.zip): " ZIP_FILE
else
    ZIP_FILE="$1"
fi

if [ -z "$2" ]; then
    read -rp "请输入场景配置文件部署目标目录: " TARGET_DIR
else
    TARGET_DIR="$2"
fi

if [ -z "$3" ]; then
    read -rp "请输入公共 Web 目标目录 (例如 /root/web/platform/common/web): " TARGET_WEB_ROOT
else
    TARGET_WEB_ROOT="$3"
fi

# 验证
if [ -z "$ZIP_FILE" ] || [ ! -f "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包不存在: $ZIP_FILE"
    exit 1
fi
if [ -z "$TARGET_DIR" ] || [ ! -d "$TARGET_DIR" ]; then
    echo "❌ 错误: 目标目录不存在: $TARGET_DIR"
    exit 1
fi
if [ -z "$TARGET_WEB_ROOT" ]; then
    echo "❌ 错误: 公共 Web 目标目录不能为空"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         场景平台一键部署                          ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  压缩包:       $ZIP_FILE"
echo "║  配置目标目录: $TARGET_DIR"
echo "║  公共 Web 目录: $TARGET_WEB_ROOT"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ====== 阶段 1: 环境初始化 ======
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  阶段 1/4 — 环境初始化 (sp-install.sh)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/sp-install.sh" ]; then
    bash "$SCRIPT_DIR/sp-install.sh"
else
    echo "❌ 错误: 找不到 sp-install.sh"
    exit 1
fi

# ====== 阶段 2: 数据导入 ======
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  阶段 2/4 — 数据导入 (sp-import.sh)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/sp-import.sh" ]; then
    bash "$SCRIPT_DIR/sp-import.sh" "$ZIP_FILE"
else
    echo "❌ 错误: 找不到 sp-import.sh"
    exit 1
fi

# ====== 阶段 3: 自定义模板部署 ======
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  阶段 3/4 — 自定义模板部署 (sp-templates.sh)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/sp-templates.sh" ]; then
    bash "$SCRIPT_DIR/sp-templates.sh" "$ZIP_FILE" "$TARGET_WEB_ROOT"
else
    echo "❌ 错误: 找不到 sp-templates.sh"
    exit 1
fi

# ====== 阶段 4: 配置部署 ======
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  阶段 4/4 — 配置部署 (sp-deploy.sh)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -f "$SCRIPT_DIR/sp-deploy.sh" ]; then
    bash "$SCRIPT_DIR/sp-deploy.sh" "$ZIP_FILE" "$TARGET_DIR"
else
    echo "❌ 错误: 找不到 sp-deploy.sh"
    exit 1
fi

# ====== 完成 ======
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              🎉 全部完成！                        ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  ✅ 环境已初始化                                  ║"
echo "║  ✅ 数据已导入                                    ║"
echo "║  ✅ 自定义模板已部署                              ║"
echo "║  ✅ 配置已部署                                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
