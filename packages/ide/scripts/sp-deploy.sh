#!/bin/bash

set -e

# ====== 场景配置部署脚本 ======
# 职责：解压 → 提取 sceneId/sceneCode → 生成 .config → 部署到前端 → 重启服务

# ====== 必需参数 ======
if [ -z "$1" ]; then
    read -rp "请输入场景元信息压缩包路径 (例如 /root/LCTechPark.zip): " ZIP_FILE
else
    ZIP_FILE="$1"
fi

if [ -z "$2" ]; then
    read -rp "请输入场景配置文件部署目标目录 (例如 /root/solo-mte/packages/ide/apps/platform/development-platform/ide/app-center): " TARGET_DIR
else
    TARGET_DIR="$2"
fi

# 验证路径
if [ -z "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包路径不能为空"
    exit 1
fi
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包不存在: $ZIP_FILE"
    exit 1
fi
if [ -z "$TARGET_DIR" ]; then
    echo "❌ 错误: 目标目录不能为空"
    exit 1
fi
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ 错误: 目标目录不存在: $TARGET_DIR"
    exit 1
fi

EXTRACT_DIR="/root/Scene-config"
SOLO_IDE_PROCESS="solo-ide"

echo "========== 参数确认 =========="
echo "  ZIP_FILE:   $ZIP_FILE ($(du -h $ZIP_FILE | cut -f1))"
echo "  TARGET_DIR: $TARGET_DIR"
echo ""

echo "========== 步骤 1: 清理并创建解压目录 =========="
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

echo "========== 步骤 2: 解压缩压缩包 =========="
unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR"
echo "✓ 解压完成到目录: $EXTRACT_DIR"

echo "========== 步骤 3: 查找并解析场景 JSON 文件 =========="
JSON_FILES=($(find "$EXTRACT_DIR" -name "*.json" -type f | head -5))
echo "找到的 JSON 文件:"
for file in "${JSON_FILES[@]}"; do echo "   - $file"; done

if [ -f "$EXTRACT_DIR/scene.json" ]; then
    SCENE_JSON="$EXTRACT_DIR/scene.json"
elif [ ${#JSON_FILES[@]} -gt 0 ]; then
    SCENE_JSON="${JSON_FILES[0]}"
    echo "未找到 scene.json，使用第一个 JSON 文件: $SCENE_JSON"
else
    echo "❌ 错误: 解压目录中没有找到任何 JSON 文件"
    exit 1
fi

echo "✓ 使用场景配置文件: $SCENE_JSON"

if ! command -v jq >/dev/null 2>&1; then
    echo "❌ 错误: 需要 jq 来解析 JSON，请先安装: apt install jq"
    exit 1
fi

if ! jq . "$SCENE_JSON" >/dev/null 2>&1; then
    echo "❌ 错误: $SCENE_JSON 不是有效的 JSON 格式"
    exit 1
fi

# 读取 sceneId 和 sceneCode（保留原始值）
SCENE_ID=$(jq -r '.sceneData.sceneId' "$SCENE_JSON" 2>/dev/null)
if [ -z "$SCENE_ID" ] || [ "$SCENE_ID" = "null" ]; then
    echo "❌ 错误: $SCENE_JSON 缺少 sceneData.sceneId 字段"
    exit 1
fi

SCENE_CODE=$(jq -r '.sceneData.code' "$SCENE_JSON" 2>/dev/null)
echo "✓ JSON 解析成功，sceneId = $SCENE_ID, code = $SCENE_CODE"

# 生成 .config 文件名（使用场景编码）
CONFIG_FILENAME="${SCENE_CODE:-scene}.config"
CONFIG_FILE="$EXTRACT_DIR/$CONFIG_FILENAME"

cp "$SCENE_JSON" "$CONFIG_FILE"
echo "✓ 已生成配置文件: $CONFIG_FILE"

echo "========== 步骤 4: 部署配置文件到目标目录 =========="
echo "清理目标目录 $TARGET_DIR 下已有的 *.config 文件..."
rm -f "$TARGET_DIR"/*.config 2>/dev/null || true

echo "复制 $CONFIG_FILE → $TARGET_DIR/"
cp "$CONFIG_FILE" "$TARGET_DIR/"
echo "✓ 配置文件已部署: $TARGET_DIR/$CONFIG_FILENAME"

echo "========== 步骤 5: 重启 solo-ide =========="
if pm2 list | grep -q "$SOLO_IDE_PROCESS"; then
    pm2 restart "$SOLO_IDE_PROCESS"
    echo "✓ $SOLO_IDE_PROCESS 已重启"
else
    echo "⚠️  警告: 未找到 $SOLO_IDE_PROCESS 进程，跳过重启"
fi

echo "========== 完成! =========="
echo ""
echo "✅ 配置文件: $TARGET_DIR/$CONFIG_FILENAME"
echo "✅ sceneId:   $SCENE_ID"
echo "✅ sceneCode: $SCENE_CODE"
echo ""
