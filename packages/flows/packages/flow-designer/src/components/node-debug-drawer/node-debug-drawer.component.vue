<template>
  <div class="node-debug-drawer" v-if="visible" @click.stop>
    <div class="debug-drawer-content">
      <div class="drawer-header">
        <h3 class="drawer-title">调试 - {{ nodeName }}</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="drawer-body">
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
            <div class="params-section" v-if="inputParams.length > 0">
              <div class="params-container">
                <div
                  v-for="(param, _index) in inputParams"
                  :key="param.name"
                  class="param-item"
                >
                  <label class="param-label">
                    {{ param.label }}
                    <span v-if="param.required" class="required-mark">*</span>
                    <span class="param-type">{{ param.raw?.type?.typeName || param.raw?.type?.typeCode || param.type || 'String' }}</span>
                  </label>

                  <!-- 字符串输入 -->
                  <input
                    v-if="param.type === 'string'"
                    v-model="param.value"
                    type="text"
                    class="string-input"
                    :placeholder="`请输入${param.label}`"
                  />

                  <!-- 数字输入 -->
                  <input
                    v-else-if="param.type === 'number'"
                    v-model.number="param.value"
                    type="number"
                    class="number-input"
                    :placeholder="`请输入${param.label}`"
                  />

                  <!-- 布尔值输入 -->
                  <div v-else-if="param.type === 'boolean'" class="boolean-input-wrapper">
                    <label class="boolean-checkbox">
                      <input v-model="param.value" type="checkbox" />
                      <span class="checkbox-label">{{ param.value ? '是' : '否' }}</span>
                    </label>
                  </div>

                  <!-- JSON对象输入 -->
                  <textarea
                    v-else-if="param.type === 'object'"
                    v-model="param.value"
                    class="json-input"
                    :placeholder="'请输入JSON对象，如：{&quot;key&quot;: &quot;value&quot;}'"
                    rows="3"
                  ></textarea>

                  <!-- 文件输入 -->
                  <file-upload
                    v-else-if="param.type === 'fileID'"
                    :value="param.value"
                    :multiple="param.type === 'fileID' && param.multiple"
                    @update="param.value = $event"
                  />

                  <!-- 数组输入 -->
                  <textarea
                    v-else-if="param.type === 'array'"
                    v-model="param.value"
                    class="json-input"
                    :placeholder="'请输入JSON数组，如：[{&quot;key&quot;: &quot;value&quot;}]'"
                    rows="3"
                  ></textarea>

                  <!-- 默认字符串输入 -->
                  <input
                    v-else
                    v-model="param.value"
                    type="text"
                    class="string-input"
                    :placeholder="`请输入${param.label}`"
                  />
                </div>
              </div>
            </div>

            <div class="no-params-section" v-else>
              <p>该节点没有配置输入参数</p>
            </div>
          </div>

          <!-- 结果标签页 -->
          <div v-if="activeTab === 'result'" class="result-tab">
            <div class="result-content" v-if="debugResult">
              <pre>{{ debugResult }}</pre>
            </div>
            <div class="empty-content" v-else-if="!isDebugRunning">
              <p>暂无调试结果</p>
            </div>
            <div class="loading-content" v-else>
              <p>{{ debugResult || '正在调试中...' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="drawer-footer">
        <button class="debug-btn" @click="handleDebug" :disabled="isDebugRunning">
          <i v-if="!isDebugRunning" class="f-icon f-icon-play btn-icon"></i>
          <i v-else class="f-icon f-icon-loading btn-icon loading-icon"></i>
          <span>{{ isDebugRunning ? '调试中...' : '开始调试' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useNotify, type DebugParam } from '@farris/flow-devkit';
import { useValidate } from '@flow-designer/hooks';
import FileUpload from '../toolbar/components/trial-run/file-upload.vue';

interface Props {
  visible: boolean;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  inputParams: DebugParam[];
  debugResult?: string;
  isDebugRunning?: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'debug', params: any[]): void;
}

const props = withDefaults(defineProps<Props>(), {
  debugResult: '',
  isDebugRunning: false
});
const emit = defineEmits<Emits>();

// 本地参数副本，避免直接修改props
const localParams = ref<any[]>([]);
const activeTab = ref('input'); // input, result

// 监听输入参数变化
watch(() => props.inputParams, (newParams) => {
  localParams.value = JSON.parse(JSON.stringify(newParams || []));
}, { immediate: true, deep: true });

// 监听调试结果变化，自动切换到结果标签页
watch(() => props.debugResult, (newResult) => {
  if (newResult && newResult !== '正在调试节点...') {
    activeTab.value = 'result';
  }
});

// 监听抽屉显示状态变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 当调试抽屉打开时，切换到输入标签页
    activeTab.value = 'input';
  }
});

const handleClose = () => {
  emit('close');
};

const { isNodeValid } = useValidate();
const notifyService = useNotify();

const handleDebug = () => {
  const nodeId = props.nodeId;
  if (isNodeValid(nodeId)) {
    activeTab.value = 'result';
    emit('debug', localParams.value);
  } else {
    notifyService.error('当前节点存在配置错误，请先解决错误');
  }
};

// 全局点击监听
const handleGlobalClick = (event: MouseEvent) => {
  if (!props.visible) return;

  const target = event.target as Element;

  // 检查点击是否在抽屉内部
  const debugDrawer = target.closest('.node-debug-drawer');
  if (debugDrawer) return;

  // 检查是否点击了调试按钮或相关元素
  if (target.closest('.f-icon-play') ||
      target.closest('.fvf-node-header__icon-btn') ||
      target.closest('[class*="debug"]')) {
    return;
  }

  // 点击其他地方，关闭抽屉
  emit('close');
};

onMounted(() => {
  // 延迟添加全局点击监听器，避免立即关闭
  setTimeout(() => {
    document.addEventListener('click', handleGlobalClick);
  }, 100);
});

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick);
});

</script>

<style scoped>
.node-debug-drawer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: auto;
  height: 80vh;
  z-index: 1000;
  pointer-events: all;
  overflow: hidden;
}

.debug-drawer-content {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;
  border-top: 1px solid #d8dbe2;
  border-left: 1px solid #d8dbe2;
  box-shadow: -2px -2px 20px 0px rgba(3, 18, 51, 0.05);
  display: flex;
  flex-direction: column;
  pointer-events: all;
  animation: slideInUp 0.3s ease;
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.drawer-header {
  position: relative;
  background: #fff;
  border-bottom: 1px solid #d8dce6;
  padding: 0;
  flex-shrink: 0;
}

.drawer-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #333333;
  line-height: 34px;
  padding: 0 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 40px;
}

.close-btn {
  position: absolute;
  right: 10px;
  top: 0px;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  outline: none;
}

.close-btn:hover {
  background-color: rgba(87, 104, 161, 0.08);
}

.drawer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-navigation {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #d8dce6;
  flex-shrink: 0;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 4px 14px 3px 14px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 400;
    color: #83849b;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    white-space: nowrap;

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
  background: #fff;
}

.input-tab {
  padding: 12px;
}

.params-section {
  margin: 0;
}

.params-container {
  margin: 0;
}

.param-item {
  margin-bottom: 12px;
}

.param-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #3f4764;
  line-height: 1.4;
}

.required-mark {
  color: #ff4d4f;
  margin-left: 4px;
}

.param-type {
  font-size: 10px;
  color: #999;
  margin-left: 8px;
  padding: 2px 4px;
  background: #f5f5f5;
  border-radius: 2px;
}

.string-input,
.number-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
}

.string-input:focus,
.number-input:focus {
  outline: none;
  border-color: #5b89fe;
  box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.2);
}

.boolean-input-wrapper {
  padding: 6px 0;
}

.boolean-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.boolean-checkbox input[type="checkbox"] {
  margin-right: 6px;
}

.checkbox-label {
  font-size: 12px;
  color: #262626;
}

.json-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  resize: vertical;
  box-sizing: border-box;
}

.json-input:focus {
  outline: none;
  border-color: #5b89fe;
  box-shadow: 0 0 0 2px rgba(91, 137, 254, 0.2);
}

.no-params-section {
  text-align: center;
  color: #999;
  padding: 40px 20px;
  font-size: 12px;
}

.result-tab {
  padding: 12px;
  background: #fff;
}

.result-content {
  height: 100%;
  min-height: 200px;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: 12px;
    color: #333;
    line-height: 1.4;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e8e8e8;
    overflow: auto;
    max-height: 300px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
}

.empty-content,
.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  font-size: 12px;

  p {
    margin: 0;
  }
}

.loading-content {
  color: #5b89fe;
}

.drawer-footer {
  display: flex;
  justify-content: center;
  padding: 16px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
  flex-shrink: 0;
}

.debug-btn {
  outline: none;
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
    background-color: #009424;
    box-shadow: 0 1px 4px rgba(0, 180, 42, 0.2);
  }

  &:disabled {
    background-color: #f5f5f5;
    color: #bfbfbf;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-icon {
    font-size: 12px;
  }

  .loading-icon {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
