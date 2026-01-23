<template>
  <div class="param-item">
    <label :class="['param-label', paramDescription && 'param-label--desc']">
      <span v-if="param.required" class="required-mark">*</span>
      <span class="param-name" :title="paramName">{{ paramName }}</span>
      <span class="param-type" :title="paramTypeName">{{ paramTypeCode }}</span>
    </label>

    <div class="param-desc" v-if="paramDescription" :title="paramDescription">{{ paramDescription }}</div>

    <!-- 字符串输入/文本框 -->
    <input
      v-if="param.type === 'string' && selectOptions.length === 0"
      :value="param.value"
      @input="updateValue(($event.target as HTMLInputElement).value)"
      type="text"
      class="string-input"
      :placeholder="`请输入${paramName}`"
    />

    <!-- 字符串输入/下拉列表 -->
    <TSelect
      v-else-if="param.type === 'string' && selectOptions.length > 0"
      class="fvf-trial-param-select"
      :value="param.value"
      :options="selectOptions"
      :clearable="true"
      size="medium"
      @change="updateValue"
    />

    <!-- 数字输入 -->
    <input
      v-else-if="param.type === 'number'"
      :value="param.value"
      @input="updateValue(Number(($event.target as HTMLInputElement).value))"
      type="number"
      class="number-input"
      :placeholder="`请输入${paramName}`"
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
import {
  useTypeDetails,
  TSelect,
  ParameterUtils,
  BasicTypeRefer,
  InputHelpKind,
  type EnumInputHelp,
  type TdOptionProps,
  type TypeRefer,
} from '@farris/flow-devkit';
import { computed } from 'vue';

interface Props {
  param: InputParam;
  index: number;
}

interface Emits {
  (e: 'update', index: number, value: any): void;
}

const {
  getTypeCode,
  getTypeName,
} = useTypeDetails();

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const paramTypeRefer = computed<TypeRefer | undefined>(() => props.param?.raw?.type);
const defaultTypeCode = computed<string>(() => props.param.type.toUpperCase());

const paramTypeCode = computed<string>(() => {
  if (paramTypeRefer.value) {
    return getTypeCode(paramTypeRefer.value);
  }
  return defaultTypeCode.value;
});

const paramTypeName = computed<string>(() => {
  if (paramTypeRefer.value) {
    return getTypeName(paramTypeRefer.value);
  }
  return defaultTypeCode.value;
});

const paramName = computed<string>(() => {
  const param = props.param;
  const rawParam = param.raw;
  const displayName = (rawParam?.name || '').trim();
  if (displayName) {
    return displayName;
  }
  return rawParam?.code || param.label;
});

const paramDescription = computed<string>(() => {
  return (props.param?.raw?.description || '').trim();
});

const selectOptions = computed<TdOptionProps[]>(() => {
  const param = props.param.raw;
  const type = param?.type;
  if (!ParameterUtils.isSame(type, BasicTypeRefer.StringType) || !param) {
    return [];
  }
  const inputHelp = param.inputHelp as (EnumInputHelp | undefined);
  if (inputHelp?.kind !== InputHelpKind.enum) {
    return [];
  }
  const enumItems = inputHelp.items || [];
  return enumItems.map((item) => {
    if (!item) {
      return;
    }
    return { label: item.key, value: item.value };
  }).filter(item => !!item);
});

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
      margin-right: 2px;
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

    .param-name {
      font-weight: 600;
      color: rgb(53, 64, 82);
    }

    &--desc {
      margin-bottom: 4px;
    }
  }

  .param-desc {
    color: rgba(32, 41, 69, 0.62);
    font-weight: 400;
    font-size: 12px;
    line-height: 16px;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: default;
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

.fvf-trial-param-select {
  :deep(.t-input) {
    border-color: #d9d9d9;
    height: 34px;

    &.t-input--focused {
      border-color: #5b89fe;
      box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.1);
    }
  }
}
</style>
