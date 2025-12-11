<template>
  <div class="params-container">
    <!-- 动态生成的输入参数 -->
    <param-input
      v-for="(param, index) in inputParams"
      :key="param.name"
      :param="param"
      :index="index"
      @update="updateParamValue"
    />

    <!-- 无参数提示 -->
    <div v-if="inputParams.length === 0" class="no-params-tip">
      <p>开始节点未配置输入参数</p>
      <p>请在开始节点的属性面板中添加输入参数</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InputParam } from './types';
import ParamInput from './param-input.vue';

interface Props {
  inputParams: InputParam[];
}

interface Emits {
  (e: 'update-param', index: number, value: any): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

function updateParamValue(index: number, value: any) {
  emit('update-param', index, value);
}
</script>

<style lang="scss" scoped>
.params-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.no-params-tip {
  text-align: center;
  padding: 40px 20px;
  color: #999;

  p {
    margin: 8px 0;
    font-size: 14px;
  }
}
</style>