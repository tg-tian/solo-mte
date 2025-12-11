<template>
  <div class="json-input-wrapper">
    <div class="json-editor" :class="{ error: hasError }">
      <div class="json-header">
        <span class="json-label">
        {{ label }}
        <span v-if="required" class="required-mark">*</span>
      </span>
        <div class="json-tools">
          <button class="json-tool-btn" @click="formatJson" title="格式化">
            <i class="f-icon f-icon-code"></i>
          </button>
          <button class="json-tool-btn" @click="clearJson" title="清空">
            <i class="f-icon f-icon-delete"></i>
          </button>
        </div>
      </div>
      <textarea
        class="json-textarea"
        :value="value || ''"
        @input="handleInput"
        :placeholder="placeholder"
      ></textarea>
    </div>
    <div v-if="hasError" class="error-message">{{ errorMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  value: string | null | undefined;
  label: string;
  placeholder: string;
  required?: boolean;
}

interface Emits {
  (e: 'update', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const hasError = ref(false);
const errorMessage = ref('');

// 验证JSON格式
function validateJson(value: string | null | undefined): boolean {
  if (!value || !value.trim()) {
    hasError.value = false;
    errorMessage.value = '';
    return true;
  }

  try {
    JSON.parse(value);
    hasError.value = false;
    errorMessage.value = '';
    return true;
  } catch (error) {
    hasError.value = true;
    errorMessage.value = '请输入正确的JSON格式';
    return false;
  }
}

// 处理输入变化
function handleInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value;
  emit('update', value);
}

// 格式化JSON
function formatJson() {
  if (props.value && props.value.trim()) {
    try {
      const parsed = JSON.parse(props.value);
      emit('update', JSON.stringify(parsed, null, 2));
      hasError.value = false;
      errorMessage.value = '';
    } catch (error) {
      hasError.value = true;
      errorMessage.value = 'JSON格式错误，无法格式化';
    }
  }
}

// 清空JSON
function clearJson() {
  emit('update', '');
}

// 监听值变化，自动验证
watch(() => props.value, validateJson, { immediate: true });
</script>

<style lang="scss" scoped>
.json-input-wrapper {
  margin-bottom: 16px;

  .json-editor {
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    overflow: hidden;

    &:hover {
      border-color: #b8c8dc;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    &.error {
      border: 2px solid #ff4d4f;
      background: #fff2f0;
    }

    .json-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 8px 16px;
      background: #fafbfc;
      border-bottom: 1px solid #f0f0f0;

      .json-label {
        font-size: 14px;
        color: #333333;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;

        &::before {
          content: '';
          width: 4px;
          height: 4px;
          background: #5b89fe;
          border-radius: 2px;
        }

        .required-mark {
          color: #ff4d4f;
          margin-left: 2px;
        }
      }

      .json-tools {
        display: flex;
        gap: 6px;

        .json-tool-btn {
          width: 26px;
          height: 26px;
          border: 1px solid #e8e8e8;
          border-radius: 5px;
          background: #fff;
          color: #82849A;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          line-height: 1;
          user-select: none;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);

          &:hover {
            border-color: #5b89fe;
            color: #5b89fe;
            background-color: rgba(91, 137, 254, 0.06);
            box-shadow: 0 2px 4px rgba(91, 137, 254, 0.15);
            transform: translateY(-1px);
          }

          &:active {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          }

          i {
            font-size: 13px;
          }
        }
      }
    }

    .json-textarea {
      width: 100%;
      height: 120px;
      border: none;
      resize: none;
      outline: none;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      background: transparent;
      padding: 0 16px 12px 16px;
      line-height: 1.5;
      color: #333333;

      &::placeholder {
        color: #999999;
      }

      &:focus {
        outline: none;
      }
    }
  }

  .error-message {
    margin-top: 4px;
    font-size: 12px;
    color: #ff4d4f;
    padding: 0 16px;
  }
}
</style>