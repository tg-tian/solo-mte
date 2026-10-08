#!/bin/bash

set -e

# ====== 场景数据导入脚本 ======
# 职责：解压压缩包 → 导入 SQL 表结构 → 调用后端 API 导入场景数据

# ====== 必需参数 ======
if [ -z "$1" ]; then
    read -rp "请输入场景元信息压缩包路径 (例如 /root/LCTechPark.zip): " ZIP_FILE
else
    ZIP_FILE="$1"
fi

if [ -z "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包路径不能为空"
    exit 1
fi
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包不存在: $ZIP_FILE"
    exit 1
fi

# ====== 环境配置 ======
DOCKER_MYSQL="mte-mysql"
DB_USER="root"
DB_PASS="3edc@WSX!QAZ"
DB_NAME="lowcodeDemo"
BACKEND_URL="http://127.0.0.1:8080/scenes/import"
EXTRACT_DIR="/root/Scene-config"

echo "========== 参数确认 =========="
echo "  ZIP_FILE:   $ZIP_FILE ($(du -h $ZIP_FILE | cut -f1))"
echo "  DB:         $DB_NAME@$DOCKER_MYSQL"
echo "  BACKEND:    $BACKEND_URL"
echo ""

echo "========== 步骤 1: 清理并创建解压目录 =========="
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

echo "========== 步骤 2: 解压缩压缩包 =========="
unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR"
echo "✓ 解压完成到目录: $EXTRACT_DIR"

echo "========== 步骤 3: 导入 SQL 文件到数据库 =========="
TABLE_COUNT=$(docker exec -i "$DOCKER_MYSQL" mysql -N -B -u "$DB_USER" -p"$DB_PASS" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")
SQL_RESULT="已导入数据库基础表结构"

if [ "$TABLE_COUNT" -gt 0 ]; then
    SQL_RESULT="已跳过，数据库中已有 $TABLE_COUNT 张表"
    echo "检测到数据库中已有 $TABLE_COUNT 张表，跳过 SQL 导入"
else
    SQL_FILES=($(find "$EXTRACT_DIR" -path "*/sql/*.sql" -o -name "*.sql" -type f | head -5))

    if [ ${#SQL_FILES[@]} -eq 0 ]; then
        echo "❌ 错误: 未找到 SQL 文件"
        exit 1
    fi

    echo "找到的 SQL 文件:"
    for file in "${SQL_FILES[@]}"; do echo "   - $file"; done

    SQL_FILE="${SQL_FILES[0]}"
    echo "正在导入 SQL 文件: $SQL_FILE"
    docker exec -i "$DOCKER_MYSQL" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_FILE"
    echo "✓ 数据库 SQL 导入完成"
fi

echo "========== 步骤 4: 调用后端接口导入数据 =========="
echo "上传压缩包到后端接口: $BACKEND_URL"
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST -F "file=@$ZIP_FILE" "$BACKEND_URL")
HTTP_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)

echo "响应状态码: $HTTP_CODE"
echo "响应内容: $HTTP_BODY"

if [ "$HTTP_CODE" -ne 200 ]; then
    echo "❌ 错误: 后端接口调用失败，状态码: $HTTP_CODE"
    exit 1
fi
echo "✓ 后端数据导入成功"

echo "========== 完成! =========="
echo ""
echo "✅ SQL 导入: $SQL_RESULT"
echo "✅ 数据导入: 已通过后端接口完成场景数据导入"
echo ""
