<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTrialRun } from './composables/use-trial-run';
import ParamList from './param-list.vue';
import RunResult from './run-result.vue';
import ChatDebug from './chat-debug.vue';

// 定义组件属性
interface Props {
  flowType?: string; // 流程类型：workflow, chatflow等
}

// 使用属性
const props = withDefaults(defineProps<Props>(), {
  flowType: 'workflow'
});

// 使用试运行逻辑
const {
  isRunning,
  activeTab,
  runResult,
  inputParams,
  startNodeData,
  updateParamValue,
  runWorkflow,
} = useTrialRun();

// 当前调试模式
const debugMode = ref<'param' | 'chat'>('param');

const isChatFlow = computed(() => {
  return props.flowType === 'chatflow';
});

// 在组件挂载时根据流程类型自动选择调试模式
onMounted(() => {
  if (isChatFlow.value) {
    debugMode.value = 'chat';
  } else {
    debugMode.value = 'param';
  }
});


// 定义组件事件
defineEmits<{
  close: []
}>();
</script>

<template>
  <div class="trial-run-container">
    <div class="panel-header">
      <div class="header-left">
        <h3 class="panel-title">
          {{ isChatFlow ? '对话流调试' : '试运行' }}
        </h3>
      </div>
      <button class="close-btn" @click="$emit('close')">
        <i class="f-icon f-icon-close"></i>
      </button>
    </div>

    <!-- 对话流调试模式 -->
    <div v-if="isChatFlow && debugMode === 'chat'" class="chat-debug-mode">
      <chat-debug :input-params="inputParams" :start-node-data="startNodeData" />
    </div>

    <!-- 参数调试模式（传统试运行） -->
    <div v-else class="param-debug-mode">
      <!-- 标签页导航 -->
      <div class="tab-navigation">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'input' }"
          @click="activeTab = 'input'"
        >
          输入
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'result' }"
          @click="activeTab = 'result'"
        >
          结果
        </div>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 输入标签页 -->
        <div v-if="activeTab === 'input'" class="input-tab">
          <!-- 参数列表组件 -->
          <param-list
            :input-params="inputParams"
            @update-param="updateParamValue"
          />
        </div>

        <!-- 结果标签页 -->
        <div v-if="activeTab === 'result'" class="result-tab">
          <div class="result-content">
            <run-result :result="runResult" />
          </div>
        </div>
      </div>

      <!-- 底部运行按钮 -->
      <div class="bottom-actions">
        <button
          class="run-workflow-btn"
          @click="runWorkflow"
          :disabled="isRunning"
        >
          <i v-if="!isRunning" class="f-icon f-icon-play btn-icon"></i>
          <i v-else class="f-icon f-icon-loading btn-icon loading-icon"></i>
          <span>{{ isRunning ? '运行中...' : '试运行' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.trial-run-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #fff;

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid #d8dce6;
    background: #fff;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      color: #333333;
      line-height: 34px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .debug-mode-switcher {
      display: flex;
      background: #f5f5f5;
      border-radius: 6px;
      padding: 2px;
      gap: 2px;

      .mode-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: none;
        background: transparent;
        border-radius: 4px;
        font-size: 12px;
        color: #666;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;

        &:hover {
          color: #333;
        }

        &.active {
          background: white;
          color: #5b89fe;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        i {
          font-size: 14px;
        }
      }
    }

  
    .log-link {
      color: #1890ff;
      cursor: pointer;
      font-size: 14px;
    }

    .close-btn {
      outline: none;
      box-shadow: none;
      border: none;
      background: none;
      color: #82849A;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 5px;
      user-select: none;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(87, 104, 161, 0.08);
        color: #82849A;
      }

      i {
        font-size: 14px;
      }
    }
  }

  .tab-navigation {
    display: flex;
    border-bottom: 1px solid #d8dce6;
    background-color: #fff;
    overflow: visible;

    .tab-item {
      padding: 4px 14px 3px 14px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      color: #83849b;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex: 1;
      text-align: center;

      &:hover {
        color: #5b89fe;
      }

      &.active {
        color: #5b89fe;
        border-bottom-color: #5b89fe;
        border-radius: 1.5px;
        font-weight: 500;
      }
    }
  }

  .tab-content {
    flex: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .input-tab,
  .result-tab {
    flex: 1;
    background: #fff;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .input-tab {
    padding: 16px;
  }

  .params-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .param-item {
    .param-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #666;

      .required-mark {
        color: #ff4d4f;
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

    .param-type {
      font-size: 12px;
      color: #999;
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 2px;
      margin-left: 8px;
    }

    .boolean-input-wrapper {
      .boolean-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .checkbox-label {
          font-size: 14px;
          color: #333;
        }
      }
    }

    .file-input-wrapper {
      .file-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;

        .upload-btn {
          padding: 6px 16px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background: #fff;
          color: #666;
          cursor: pointer;
          font-size: 14px;

          &:hover {
            border-color: #3370ff;
            color: #3370ff;
          }
        }
      }

      .file-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border: 1px solid #e8e8e8;
        border-radius: 4px;
        background: #fafafa;

        .file-icon {
          width: 24px;
          height: 24px;
          margin-right: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          border-radius: 4px;
          color: #666;
          font-size: 14px;
        }

        .file-name {
          font-size: 14px;
          color: #333;
          flex: 1;
        }

        .file-size {
          font-size: 12px;
          color: #999;
          margin-right: 8px;
        }

        .delete-file-btn {
          width: 16px;
          height: 16px;
          border: 1px solid #d9d9d9;
          background: #fff;
          color: #999;
          border-radius: 2px;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;

          &:hover {
            background: #f5f5f5;
            color: #ff4d4f;
            border-color: #ff4d4f;
          }
        }
      }
    }

    .object-input-wrapper,
    .array-input-wrapper {
      margin-bottom: 8px;
    }

    .json-actions {
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;

      .json-label {
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }

      .json-tools {
        display: flex;
        gap: 4px;

        .json-tool-btn {
          width: 24px;
          height: 24px;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background: #fff;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;

          &:hover {
            border-color: #3370ff;
            color: #3370ff;
          }
        }
      }
    }

    .json-editor {
      border: 1px solid #d9d9d9;
      border-radius: 4px;
      padding: 8px;
      background: #fff;

      &.error {
        border: 2px solid #ff4d4f;
        background: #fff2f0;
      }

      .json-textarea {
        width: 100%;
        height: 120px;
        border: none;
        resize: none;
        outline: none;
        font-family: monospace;
        font-size: 14px;
        background: transparent;
      }
    }

    .error-message {
      margin-top: 4px;
      font-size: 12px;
      color: #ff4d4f;
    }
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

  
  .empty-content {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 200px;
    color: #999;
    font-size: 14px;
  }

  .result-content {
    flex: 1;
    height: 100%;
    min-height: 200px;
    padding: 16px;
    overflow-y: auto;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 14px;
      color: #333;
      line-height: 1.6;
    }
  }

  .bottom-actions {
    padding: 16px;
    border-top: 1px solid #e8e8e8;
    background: #fff;
  }

  .run-workflow-btn {
    width: 100%;
    padding: 8px 16px;
    background: #00b42a;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
    white-space: nowrap;
    user-select: none;

    &:hover:not(:disabled) {
      background-color: #00a327;
      box-shadow: 0 2px 8px rgba(0, 180, 42, 0.3);
    }

    &:active:not(:disabled) {
      background-color: #009224;
      transform: translateY(0);
    }

    &:disabled {
      background-color: #f5f5f5;
      color: #999;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }

    .loading-icon {
      animation: spin 1s linear infinite;
    }
  }

  /* 对话流调试模式样式 */
  .chat-debug-mode {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100% - 54px); /* 减去header高度 (padding + border) */
    overflow: hidden;
  }

  .param-debug-mode {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100% - 54px); /* 减去header高度 (padding + border) */
  }
}


@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
