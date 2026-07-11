#!/bin/bash

set -e

# ====== 自定义模板部署脚本 ======
# 职责：解压压缩包 → 读取 templates.json → 部署页面级模板和控件级模板

# ====== 必需参数 ======
if [ -z "$1" ]; then
    read -rp "请输入场景元信息压缩包路径 (例如 /root/LCTechPark.zip): " ZIP_FILE
else
    ZIP_FILE="$1"
fi

if [ -z "$2" ]; then
    read -rp "请输入公共 Web 目标目录 (例如 /root/web/platform/common/web): " TARGET_WEB_ROOT
else
    TARGET_WEB_ROOT="$2"
fi

# ====== 参数校验 ======
if [ -z "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包路径不能为空"
    exit 1
fi
if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ 错误: 压缩包不存在: $ZIP_FILE"
    exit 1
fi
if [ -z "$TARGET_WEB_ROOT" ]; then
    echo "❌ 错误: 公共 Web 目标目录不能为空"
    exit 1
fi

if ! command -v unzip >/dev/null 2>&1; then
    echo "❌ 错误: 需要 unzip 来解压压缩包，请先安装: apt install unzip"
    exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
    echo "❌ 错误: 需要 jq 来解析 JSON，请先安装: apt install jq"
    exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
    echo "❌ 错误: 需要 curl 来下载模板文件，请先安装: apt install curl"
    exit 1
fi

# ====== 环境配置 ======
EXTRACT_DIR="/root/Scene-templates"
PAGE_TEMPLATE_DIR="$TARGET_WEB_ROOT/farris-vue-form-templates"
WIDGET_ASSETS_DIR="$TARGET_WEB_ROOT/farris-designer/assets"
WIDGET_TEMPLATE_FILE="$WIDGET_ASSETS_DIR/widget-templates.json"

echo "========== 参数确认 =========="
echo "  ZIP_FILE:        $ZIP_FILE ($(du -h "$ZIP_FILE" | cut -f1))"
echo "  TARGET_WEB_ROOT: $TARGET_WEB_ROOT"
echo "  PAGE_DIR:        $PAGE_TEMPLATE_DIR"
echo "  WIDGET_FILE:     $WIDGET_TEMPLATE_FILE"
echo ""

echo "========== 步骤 1: 清理并创建解压目录 =========="
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"

echo "========== 步骤 2: 解压缩压缩包 =========="
unzip -o "$ZIP_FILE" -d "$EXTRACT_DIR"
echo "✓ 解压完成到目录: $EXTRACT_DIR"

TEMPLATES_JSON="$EXTRACT_DIR/templates.json"
if [ ! -f "$TEMPLATES_JSON" ]; then
    echo "❌ 错误: 压缩包中未找到 templates.json"
    exit 1
fi
if ! jq . "$TEMPLATES_JSON" >/dev/null 2>&1; then
    echo "❌ 错误: $TEMPLATES_JSON 不是有效的 JSON 格式"
    exit 1
fi

mkdir -p "$PAGE_TEMPLATE_DIR" "$WIDGET_ASSETS_DIR"

parse_tags='
def tags_obj:
  if (.tags | type) == "string" then (.tags | fromjson)
  elif (.tags | type) == "object" then .tags
  else {} end;
'

page_filter='
  tags_obj as $tags
  | (($tags.schema // []) | index("inBuilder")) != null
  and (($tags.template_type // []) | index("原生模板")) != null
  and (($tags.domain // []) | index("通用（页面）")) != null
'

widget_filter='
  tags_obj as $tags
  | (($tags.language_framework // []) | index("HTML")) != null
'

echo "========== 步骤 3: 处理页面级模板 =========="
PAGE_ITEMS_FILE="$EXTRACT_DIR/page-template-list.json"
jq "$parse_tags [ .[] | select($page_filter) | {
    templateID: .template_index,
    templateName: (.name // .template_index),
    templateDescription: (.template_description // \"\")
}]" "$TEMPLATES_JSON" > "$PAGE_ITEMS_FILE"

PAGE_COUNT=$(jq 'length' "$PAGE_ITEMS_FILE")
echo "找到页面级模板: $PAGE_COUNT 个"

if [ "$PAGE_COUNT" -gt 0 ]; then
    jq -c "$parse_tags .[] | select($page_filter)" "$TEMPLATES_JSON" | while IFS= read -r item; do
        TEMPLATE_ID=$(echo "$item" | jq -r '.template_index')
        TEMPLATE_NAME=$(echo "$item" | jq -r '.name // .template_index')
        CODE_URL=$(echo "$item" | jq -r '.code_url // empty')
        IMAGE_REF=$(echo "$item" | jq -r '.imageRef // empty')
        IMAGE_URL=$(echo "$item" | jq -r '.example_image_url // empty')
        TEMPLATE_DIR="$PAGE_TEMPLATE_DIR/$TEMPLATE_ID"

        if [ -z "$TEMPLATE_ID" ] || [ "$TEMPLATE_ID" = "null" ]; then
            echo "❌ 错误: 页面级模板缺少 template_index: $TEMPLATE_NAME"
            exit 1
        fi

        mkdir -p "$TEMPLATE_DIR"

        if echo "$item" | jq -e '.code_file != null and .code_file != ""' >/dev/null; then
            echo "$item" | jq -r '.code_file' > "$TEMPLATE_DIR/template.json"
        elif [ -n "$CODE_URL" ]; then
            curl -fsSL "$CODE_URL" -o "$TEMPLATE_DIR/template.json"
        else
            echo "❌ 错误: 页面级模板 $TEMPLATE_ID 缺少 code_file/code_url"
            exit 1
        fi

        if ! jq . "$TEMPLATE_DIR/template.json" >/dev/null 2>&1; then
            echo "❌ 错误: 页面级模板 $TEMPLATE_ID 的 template.json 不是有效 JSON"
            exit 1
        fi

        if [ -n "$IMAGE_REF" ] && [ -f "$EXTRACT_DIR/$IMAGE_REF" ]; then
            cp "$EXTRACT_DIR/$IMAGE_REF" "$TEMPLATE_DIR/preview.png"
        elif [ -n "$IMAGE_URL" ]; then
            curl -fsSL "$IMAGE_URL" -o "$TEMPLATE_DIR/preview.png" || echo "⚠️  警告: 预览图下载失败，已跳过: $IMAGE_URL"
        fi

        echo "✓ 页面级模板已部署: $TEMPLATE_ID ($TEMPLATE_NAME)"
    done
fi

TEMPLATE_LIST_FILE="$PAGE_TEMPLATE_DIR/templateListData.json"
if [ ! -f "$TEMPLATE_LIST_FILE" ]; then
    echo "[]" > "$TEMPLATE_LIST_FILE"
fi

TMP_TEMPLATE_LIST="$EXTRACT_DIR/templateListData.json"
jq -s '
  (.[0] + .[1])
  | reduce .[] as $item ({order: [], map: {}}; 
      if $item.templateID == null then .
      elif .map[$item.templateID] == null then
        .order += [$item.templateID] | .map[$item.templateID] = $item
      else
        .map[$item.templateID] = $item
      end
    )
  | [.order[] as $id | .map[$id]]
' "$TEMPLATE_LIST_FILE" "$PAGE_ITEMS_FILE" > "$TMP_TEMPLATE_LIST"
cp "$TMP_TEMPLATE_LIST" "$TEMPLATE_LIST_FILE"
echo "✓ 页面级模板索引已更新: $TEMPLATE_LIST_FILE"

echo "========== 步骤 4: 处理控件级模板 =========="
WIDGET_ITEMS_FILE="$EXTRACT_DIR/widget-template-list.json"
jq "$parse_tags [ .[] | select($widget_filter) | {
    id: .template_index,
    name: (.name // .template_index),
    description: (.template_description // \"\"),
    component: {
      type: \"html-template\",
      html: (.code_file // \"\")
    }
}]" "$TEMPLATES_JSON" > "$WIDGET_ITEMS_FILE"

WIDGET_COUNT=$(jq 'length' "$WIDGET_ITEMS_FILE")
echo "找到控件级模板: $WIDGET_COUNT 个"

if [ "$WIDGET_COUNT" -gt 0 ]; then
    if jq -e '.[] | select(.id == null or .id == "" or .component.html == "")' "$WIDGET_ITEMS_FILE" >/dev/null; then
        echo "❌ 错误: 存在缺少 template_index 或 code_file 的控件级模板"
        exit 1
    fi
fi

if [ ! -f "$WIDGET_TEMPLATE_FILE" ]; then
    echo "[]" > "$WIDGET_TEMPLATE_FILE"
fi

TMP_WIDGET_TEMPLATE_FILE="$EXTRACT_DIR/widget-templates.json"
jq -s '
  (.[0] + .[1])
  | reduce .[] as $item ({order: [], map: {}}; 
      if $item.id == null then .
      elif .map[$item.id] == null then
        .order += [$item.id] | .map[$item.id] = $item
      else
        .map[$item.id] = $item
      end
    )
  | [.order[] as $id | .map[$id]]
' "$WIDGET_TEMPLATE_FILE" "$WIDGET_ITEMS_FILE" > "$TMP_WIDGET_TEMPLATE_FILE"
cp "$TMP_WIDGET_TEMPLATE_FILE" "$WIDGET_TEMPLATE_FILE"
echo "✓ 控件级模板文件已更新: $WIDGET_TEMPLATE_FILE"

echo "========== 完成! =========="
echo ""
echo "✅ 页面级模板: $PAGE_COUNT 个，目录 $PAGE_TEMPLATE_DIR"
echo "✅ 控件级模板: $WIDGET_COUNT 个，文件 $WIDGET_TEMPLATE_FILE"
echo ""
