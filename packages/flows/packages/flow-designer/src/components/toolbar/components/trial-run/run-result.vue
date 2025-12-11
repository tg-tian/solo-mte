<template>
  <div class="result-tab">
    <div class="result-content">
      <pre>{{ result || '暂无运行结果' }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  result: string;
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
.result-tab {
  .result-content {
    height: 100%;
    min-height: 200px;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      color: #333;
      line-height: 1.6;
      padding: 16px;
    }
  }
}
</style>