<template>
  <div class="markdown-renderer" v-html="renderedContent"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';

interface Props {
  content: string;
  showCursor?: boolean;
}

interface Emits {
  (e: 'copy', content: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  showCursor: false
});

const emit = defineEmits<Emits>();

const renderedContent = ref('');

// 简化的 Markdown 渲染函数 - 直接实现
function simpleMarkdown(text: string): string {
  let html = text;

  // 1. 基础清理
  html = html.replace(/\[object Object\]/g, '');
  html = html.replace(/\\n/g, '\n');

  // 2. 处理标题
  html = html.replace(/^(#{1,6})(\s*)(.+)$/gm, (match, hashes, space, content) => {
    const level = hashes.length;
    return `<h${level}>${content}</h${level}>`;
  });

  // 3. 处理加粗
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 4. 处理斜体
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 5. 处理行内代码
  html = html.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

  // 6. 处理链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 7. 处理列表 - 先处理粘连的列表项，但不影响正常的连字符
  // 修复：只处理真正的列表项粘连，如 "- 项目- 描述" 而不是 "3-5月"
  html = html.replace(/^(-\s*)([^-\n]*?)(-\s[^-\n]+)/gm, '$1$2\n$1$3');

  // 8. 先处理表格（在段落处理之前）
  html = html.replace(/(?:^|\n)(\|[^\n]+\|)\n(\|[-\s\|]+\|)\n((?:\|[^\n]+\|\n?)*)/gm, (match, headerRow: string, separatorRow, bodyRows: string) => {
    // 处理表头
    const headerCells = headerRow.split('|').filter(cell => cell.trim() !== '');
    let tableHtml = '<table>\n<thead>\n<tr>';
    headerCells.forEach(cell => {
      tableHtml += `<th>${cell.trim()}</th>`;
    });
    tableHtml += '</tr>\n</thead>\n<tbody>\n';

    // 处理表体
    const bodyLines = bodyRows.trim().split('\n');
    bodyLines.forEach(line => {
      if (line.includes('|')) {
        const bodyCells = line.split('|').filter(cell => cell.trim() !== '');
        tableHtml += '<tr>';
        bodyCells.forEach(cell => {
          tableHtml += `<td>${cell.trim()}</td>`;
        });
        tableHtml += '</tr>\n';
      }
    });

    tableHtml += '</tbody>\n</table>';
    return '\n' + tableHtml + '\n';
  });

  // 9. 简单的列表和段落处理
  const lines = html.split('\n');
  let inList = false;
  let result = '';

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // 跳过空行和已经处理的表格
    if (!line || line.includes('<table>') || line.includes('</table>')) {
      if (line.includes('<table>')) {
        result += line + '\n';
      }
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) {
        result += '<ul>\n';
        inList = true;
      }
      result += '<li>' + line.substring(2) + '</li>\n';
    } else if (line.match(/^\d+\. /)) {
      if (!inList) {
        result += '<ol>\n';
        inList = true;
      }
      result += '<li>' + line.replace(/^\d+\.\s/, '') + '</li>\n';
    } else {
      if (inList && line) {
        result += '</ul>\n';
        inList = false;
      }
      if (line) {
        result += '<p>' + line + '</p>\n';
      }
    }
  }

  if (inList) {
    result += '</ul>\n';
  }

  // 10. 处理引用
  result = result.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // 11. 处理分隔线
  result = result.replace(/^---+$/gm, '<hr>');

  return result;
}

// 监听内容变化
watch(() => props.content, () => {
  updateContent();
}, { immediate: true });

// 监听showCursor变化
watch(() => props.showCursor, () => {
  updateContent();
}, { immediate: true });

// 更新内容
function updateContent() {
  try {
    let content = props.content || '';

    // 确保content是字符串
    content = String(content);

    // 添加光标
    if (props.showCursor) {
      content += ' <span class="typing-cursor"></span>';
    }

    // 使用简化的markdown渲染
    renderedContent.value = simpleMarkdown(content);

    // 等待 DOM 更新后处理特殊元素
    nextTick(() => {
      processSpecialElements();
    });
  } catch (error: any) {
    console.error('Markdown rendering error:', error);
    renderedContent.value = `<div class="error">Markdown 渲染失败: ${error.message}</div>`;
  }
}

// 处理特殊元素
function processSpecialElements() {
  // 处理代码复制功能
  setupCodeCopy();
}

// 设置代码复制功能
function setupCodeCopy() {
  const codeBlocks = document.querySelectorAll('.markdown-renderer pre');
  codeBlocks.forEach((block) => {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-code-btn';
    copyBtn.textContent = '复制';
    copyBtn.onclick = async () => {
      const code = block.querySelector('code');
      if (code) {
        try {
          let success = false;
          const text = code.textContent || '';

          // 优先使用现代 Clipboard API
          if (navigator.clipboard && window.isSecureContext) {
            try {
              await navigator.clipboard.writeText(text);
              success = true;
            } catch (error) {
              console.warn('Clipboard API failed, falling back to legacy method:', error);
            }
          }

          // 降级到传统方法
          if (!success) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            success = document.execCommand('copy');
            document.body.removeChild(textArea);
          }

          if (success) {
            copyBtn.textContent = '已复制';
            setTimeout(() => {
              copyBtn.textContent = '复制';
            }, 2000);
          }
        } catch (error) {
          console.error('复制失败:', error);
        }
      }
    };
    block.appendChild(copyBtn);
  });
}

onMounted(() => {
  updateContent();
});
</script>

<style scoped>
.markdown-renderer {
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
}

/* 基础样式 */
.markdown-renderer :deep(h1),
.markdown-renderer :deep(h2),
.markdown-renderer :deep(h3),
.markdown-renderer :deep(h4),
.markdown-renderer :deep(h5),
.markdown-renderer :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-renderer :deep(h1) { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
.markdown-renderer :deep(h2) { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
.markdown-renderer :deep(h3) { font-size: 1.25em; }
.markdown-renderer :deep(h4) { font-size: 1em; }
.markdown-renderer :deep(h5) { font-size: 0.875em; }
.markdown-renderer :deep(h6) { font-size: 0.85em; color: #666; }

/* 段落 */
.markdown-renderer :deep(p) {
  margin-bottom: 16px;
}

/* 列表 */
.markdown-renderer :deep(ul),
.markdown-renderer :deep(ol) {
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-renderer :deep(li) {
  margin-bottom: 0.25em;
}

/* 链接 */
.markdown-renderer :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-renderer :deep(a:hover) {
  text-decoration: underline;
}

/* 引用 */
.markdown-renderer :deep(blockquote) {
  padding: 0 1em;
  color: #666;
  border-left: 0.25em solid #dfe2e5;
  margin: 0 0 16px 0;
}

.markdown-renderer :deep(blockquote p) {
  margin-bottom: 0;
}

/* 代码 */
.markdown-renderer :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.markdown-renderer :deep(pre) {
  position: relative;
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin: 0 0 16px 0;
}

.markdown-renderer :deep(pre code) {
  display: inline;
  max-width: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}

/* 表格 */
.markdown-renderer :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  margin: 0 0 16px 0;
  width: 100%;
}

.markdown-renderer :deep(table th),
.markdown-renderer :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-renderer :deep(table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

/* 分隔线 */
.markdown-renderer :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}

/* 图片 */
.markdown-renderer :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 8px 0;
}

/* 代码语言标签 */
.markdown-renderer :deep(.code-language) {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 12px;
  color: #666;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 3px;
}

/* 复制代码按钮 */
.markdown-renderer :deep(.copy-code-btn) {
  position: absolute;
  top: 4px;
  right: 8px;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #d1d5da;
  border-radius: 3px;
  background: #fff;
  color: #24292e;
  cursor: pointer;
  transition: background-color 0.2s;
}

.markdown-renderer :deep(.copy-code-btn:hover) {
  background: #f6f8fa;
}

/* 内联代码 */
.markdown-renderer :deep(.inline-code) {
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-size: 85%;
  padding: 0.2em 0.4em;
}

/* 打字机光标 */
.markdown-renderer :deep(.typing-cursor) {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: #333;
  margin-left: 2px;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 错误消息 */
.markdown-renderer :deep(.error) {
  color: #f44336;
  background: #ffebee;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #ffcdd2;
}

/* 任务列表 */
.markdown-renderer :deep(li:has(input[type="checkbox"])) {
  list-style-type: none;
  padding-left: 0;
}

.markdown-renderer :deep(li input[type="checkbox"]) {
  margin-right: 8px;
  margin-left: -20px;
}
</style>