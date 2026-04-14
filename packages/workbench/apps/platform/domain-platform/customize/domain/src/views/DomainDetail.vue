<template>
  <div class="domain-setting-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">{{ isEditMode ? '编辑领域' : '创建领域' }}</h2>
        <p v-if="isEditMode" class="page-sub-title">{{ domainForm.name || '领域详情' }}</p>
      </div>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button
          v-if="isEditMode"
          :type="domainForm.status === '1' ? 'warning' : 'success'"
          plain
          @click="handlePublish"
        >
          {{ domainForm.status === '1' ? '取消发布' : '发布领域' }}
        </el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEditMode ? '保存更改' : '立即创建' }}
        </el-button>
      </div>
    </div>

    <div class="setting-content">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="domainForm" :rules="rules" ref="domainFormRef" label-position="top">
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="领域编码" prop="code">
                  <el-input v-model="domainForm.code" :disabled="isEditMode" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="领域名称" prop="name">
                  <el-input v-model="domainForm.name" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="DSL 标准" prop="dslStandard">
                  <el-select v-model="domainForm.dslStandard" style="width: 100%">
                    <el-option label="默认不限" value="default" />
                    <el-option label="UBML" value="UBML" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="领域详情描述" prop="description">
              <el-input v-model="domainForm.description" type="textarea" :rows="3" />
            </el-form-item>
            <el-row :gutter="24">
              <el-col :span="8">
                <el-form-item label="代码编辑器" prop="codeEditor">
                  <el-select v-model="domainForm.codeEditor" style="width: 100%">
                    <el-option label="Monaco Editor" value="Monaco Editor" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="模型编辑器" prop="modelEditor">
                  <el-select v-model="domainForm.modelEditor" style="width: 100%">
                    <el-option label="GoJS / G6" value="GoJS / G6" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="后端运行框架" prop="baseFramework">
                  <el-select v-model="domainForm.baseFramework" style="width: 100%">
                    <el-option label="Spring Boot" value="springboot" />
                    <el-option label="Node.js" value="nodejs" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="模型模板组" name="template" v-if="isEditMode || isFromTemplate">
          <DomainTemplate :domain-id="domainIdValue" :is-from-template="isFromTemplate" />
        </el-tab-pane>

        <el-tab-pane label="设备模型库" name="model" v-if="isEditMode || isFromTemplate">
          <DomainDeviceType :domain-id="domainIdValue" :is-from-template="isFromTemplate" />
        </el-tab-pane>

        <el-tab-pane label="领域组件" name="component" v-if="isEditMode || isFromTemplate">
          <DomainComponent :domain-id="domainIdValue" :is-from-template="isFromTemplate" />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Publish Dialog -->
    <el-dialog
      v-model="publishDialogVisible"
      :title="domainForm.status === '1' ? '取消发布领域' : '发布领域至平台'"
      width="500px"
      class="premium-dialog"
    >
      <p class="dialog-tip">{{ domainForm.status === '1' ? '确认要取消发布该领域吗？' : '确认要发布该领域并下载配置吗？' }}</p>
      <template #footer>
        <el-button @click="publishDialogVisible = false">暂不处理</el-button>
        <el-button type="primary" @click="confirmPublish">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import DomainTemplate from './domain-detail/DomainTemplate.vue';
import DomainDeviceType from './domain-detail/DomainDeviceType.vue';
import DomainComponent from './domain-detail/DomainComponent.vue';
import { useDomainStore } from '../store/domain';
import { useDomainComponentTemplateStore } from '../store/domainComponentTemplate';
import { useDomainTemplateStore } from '../store/domainTemplate';
import { useDeviceTypeStore } from '../store/deviceType';
import { useComponentStore } from '../store/component';
import { downloadDomain } from '../api/domain';
import type { DomainFormData } from '../types/models';

const props = defineProps<{
  mode: string;
  domainId?: string;
  domainName?: string;
  domainCode?: string;
}>();

const emit = defineEmits<{
  back: [];
}>();

const domainStore = useDomainStore();
const domainTemplateStore = useDomainTemplateStore();
const domainComponentTemplateStore = useDomainComponentTemplateStore();
const deviceTypeStore = useDeviceTypeStore();
const componentStore = useComponentStore();

const activeTab = ref('basic');
const submitting = ref(false);
const publishDialogVisible = ref(false);
const domainFormRef = ref<FormInstance>();
const domainForm = reactive<DomainFormData>({
  code: '',
  name: '',
  description: '',
  status: '0',
  codeEditor: 'Monaco Editor',
  modelEditor: 'GoJS / G6',
  baseFramework: 'springboot',
  dslStandard: 'default',
  url: '',
  domainTemplateId: null
});

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
};

const isEditMode = computed(() => props.mode === 'edit');
const isFromTemplate = computed(() => props.mode === 'template');
const domainIdValue = computed(() => {
  const id = Number(props.domainId || 0);
  return Number.isNaN(id) || id <= 0 ? null : id;
});

watch(
  () => [props.mode, props.domainId, props.domainCode, props.domainName],
  async () => {
    await initForm();
  },
  { immediate: true }
);

onMounted(async () => {
  await initForm();
});

function resetFormData() {
  Object.assign(domainForm, {
    code: props.domainCode || '',
    name: props.domainName || '',
    description: '',
    status: '0',
    codeEditor: 'Monaco Editor',
    modelEditor: 'GoJS / G6',
    baseFramework: 'springboot',
    dslStandard: 'default',
    url: '',
    domainTemplateId: null
  });
  domainComponentTemplateStore.setTemplates([]);
  deviceTypeStore.setDeviceTypes([]);
  componentStore.setComponents([]);
}

async function initForm() {
  if (!isEditMode.value || !domainIdValue.value) {
    resetFormData();
    return;
  }
  const data = await domainStore.fetchDomainById(domainIdValue.value);
  if (!data) {
    return;
  }
  Object.assign(domainForm, {
    code: data.domainCode || '',
    name: data.domainName || '',
    description: data.domainDescription || '',
    status: data.status || '0',
    codeEditor: data.codeEditor || 'Monaco Editor',
    modelEditor: data.modelEditor || 'GoJS / G6',
    baseFramework: data.framework || 'springboot',
    dslStandard: data.dsl || 'default',
    url: data.url || '',
    domainTemplateId: data.domainTemplateId || null
  });
}

function navigateBack() {
  if (window.top && window.top !== window) {
    window.top.postMessage({
      eventType: 'invoke',
      method: 'closeUrl',
      params: []
    });
  } else {
    emit('back');
  }
}

async function submitForm() {
  if (!domainFormRef.value) {
    return;
  }
  await domainFormRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }
    submitting.value = true;
    try {
      if (isEditMode.value && domainIdValue.value) {
        await domainStore.updateDomain(domainIdValue.value, domainForm);
        ElMessage.success('更新领域成功');
      } else if (isFromTemplate.value) {
        await domainStore.createDomainFromTemplate(
          domainForm,
          domainComponentTemplateStore.templates,
          deviceTypeStore.deviceTypes,
          componentStore.components
        );
        ElMessage.success('从模板创建成功');
      } else {
        await domainStore.createDomain(domainForm);
        ElMessage.success('新建领域成功');
      }
      emit('back');
    } catch (_error) {
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
}

function handlePublish() {
  if (!domainIdValue.value) {
    return;
  }
  publishDialogVisible.value = true;
}

async function confirmPublish() {
  if (!domainIdValue.value) {
    return;
  }
  submitting.value = true;
  domainStore.publishDomain(domainIdValue.value).then((res) => {
    // if res has domainData, it's the published DomainTemInfo object
    if (res && res.domainData) {
      domainForm.status = '1';
      const jsonStr = JSON.stringify(res, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${domainForm.code}.json`;
      link.click();
      window.URL.revokeObjectURL(url);
      ElMessage.success('领域发布成功并已下载配置');
    } else {
      // it was unpublished, just domain object
      domainForm.status = '0';
      ElMessage.success('领域已取消发布');
    }
    publishDialogVisible.value = false;
  }).catch(() => {
    ElMessage.error('操作失败');
  }).finally(() => {
    submitting.value = false;
  });
}

async function handleDownload() {
  if (!domainIdValue.value) {
    return;
  }
  const res = await downloadDomain(domainIdValue.value);
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${domainForm.code}.json`;
  link.click();
}

defineExpose({
  handleDownload
});
</script>

<style scoped>
.domain-setting-container {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-main-title {
  margin: 0;
  font-size: 20px;
}

.page-sub-title {
  margin: 6px 0 0;
  color: #909399;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.setting-content {
  background: #fff;
  border-radius: 12px;
  padding: 12px 16px;
}
</style>
