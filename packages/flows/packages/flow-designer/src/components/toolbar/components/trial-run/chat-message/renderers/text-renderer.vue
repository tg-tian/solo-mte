<template>
  <div class="text-renderer">
    <span
      class="text-content"
      :class="{ 'typing': showCursor }"
      v-html="displayContent"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

interface Props {
  content: string;
  showCursor?: boolean;
  typingSpeed?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showCursor: false,
  typingSpeed: 50
});

const displayContent = ref('');
const currentIndex = ref(0);

// 监听内容变化
watch(() => props.content, () => {
  if (props.showCursor) {
    startTypingEffect();
  } else {
    displayContent.value = escapeHtml(props.content);
  }
}, { immediate: true });

// 打字机效果
function startTypingEffect() {
  currentIndex.value = 0;
  displayContent.value = '';
  typeNextChar();
}

function typeNextChar() {
  if (currentIndex.value < props.content.length) {
    const char = props.content[currentIndex.value];
    displayContent.value += escapeHtml(char);
    currentIndex.value++;

    setTimeout(typeNextChar, props.typingSpeed);
  } else {
    // 打字完成，添加光标
    if (props.showCursor) {
      displayContent.value += '<span class="typing-cursor"></span>';
    }
  }
}

// HTML 转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
</script>

<style scoped>
.text-renderer {
  display: inline;
}

.text-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.text-content.typing {
  border-right: 2px solid #333;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { border-color: #333; }
  51%, 100% { border-color: transparent; }
}

.text-content :deep(.typing-cursor) {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: #333;
  margin-left: 2px;
  animation: blink 1s infinite;
}
</style>