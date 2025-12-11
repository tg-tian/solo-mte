<template>
  <div class="param-item">
    <label class="param-label">
      {{ param.label }}
      <span v-if="param.required" class="required-mark">*</span>
      <span class="param-type">{{ param.type.toUpperCase() }}</span>
    </label>

    <!-- 字符串输入 -->
    <input
      v-if="param.type === 'string'"
      :value="param.value"
      @input="updateValue(($event.target as HTMLInputElement).value)"
      type="text"
      class="string-input"
      :placeholder="`请输入${param.label}`"
    />

    <!-- 数字输入 -->
    <input
      v-else-if="param.type === 'number'"
      :value="param.value"
      @input="updateValue(Number(($event.target as HTMLInputElement).value))"
      type="number"
      class="number-input"
      :placeholder="`请输入${param.label}`"
    />

    <!-- 布尔值输入 -->
    <div v-else-if="param.type === 'boolean'" class="boolean-input-wrapper">
      <label class="boolean-checkbox">
        <input
          :checked="param.value"
          @change="updateValue(($event.target as HTMLInputElement).checked)"
          type="checkbox"
        />
        <span class="checkbox-label">{{ param.value ? '是' : '否' }}</span>
      </label>
    </div>

    <!-- 文件上传 -->
    <file-upload
      v-else-if="param.type === 'fileID'"
      :value="param.value"
      :multiple="param.type === 'fileID' && param.multiple"
      @update="updateValue"
    />

    <!-- JSON对象输入 -->
    <json-editor
      v-else-if="param.type === 'object'"
      :value="param.value"
      :label="'JSON'"
      :placeholder="'请输入JSON对象，如：{&quot;key&quot;: &quot;value&quot;}'"
      :required="param.required"
      @update="updateValue"
    />

    <!-- 数组输入 -->
    <json-editor
      v-else-if="param.type === 'array'"
      :value="param.value"
      :label="'JSON Array'"
      :placeholder="'请输入JSON数组，如：[{&quot;key&quot;: &quot;value&quot;}]'"
      :required="param.required"
      @update="updateValue"
    />
  </div>
</template>

<script setup lang="ts">
import type { InputParam } from './types';
import FileUpload from './file-upload.vue';
import JsonEditor from './json-editor.vue';
import { computed } from 'vue';

interface Props {
  param: InputParam;
  index: number;
}

interface Emits {
  (e: 'update', index: number, value: any): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
console.log('param', props.param);
// const isFileID = computed(() => props.param.type === 'fileID' || (props.param.type === 'array' && props.param.type === 'fileID'));

function updateValue(value: any) {
  emit('update', props.index, value);
}
</script>

<style lang="scss" scoped>
.param-item {
  .param-label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #333333;
    font-weight: 500;

    .required-mark {
      color: #ff4d4f;
      margin-left: 2px;
    }

    .param-type {
      font-size: 12px;
      color: #82849A;
      background: #f0f2f5;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
      font-weight: 400;
    }
  }

  .string-input,
  .number-input {
    width: 100%;
    padding: 6px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 14px;
    background-color: #fff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
      outline: none;
      border-color: #5b89fe;
      background-color: #fff;
      box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.1);
    }

    &:hover {
      border-color: #b8c8dc;
    }
  }

  .boolean-input-wrapper {
    .boolean-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 6px 12px;
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      background-color: #fff;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;

      &:hover {
        border-color: #b8c8dc;
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: #5b89fe;
      }

      .checkbox-label {
        font-size: 14px;
        color: #333333;
        font-weight: 400;
      }
    }
  }
}
</style>