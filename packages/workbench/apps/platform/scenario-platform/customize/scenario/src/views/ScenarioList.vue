<template>
  <div class="f-page f-page-is-managelist scenario-page">
    <div class="page-header">
      <h2 class="page-title">场景列表</h2>
      <el-button type="primary" class="btn-primary" @click="handleCreate">创建场景</el-button>
    </div>

    <el-card shadow="never" class="search-card">
      <el-form :inline="true" class="search-form">
        <el-form-item label="场景名称" class="search-item">
          <el-input v-model="searchName" placeholder="请输入场景名称" clearable style="width: 240px" />
        </el-form-item>
        <el-form-item label="领域" class="search-item">
          <el-select v-model="searchDomainId" placeholder="全部" clearable style="width: 220px">
            <el-option v-for="domain in domains" :key="domain.domainId" :label="domain.domainName" :value="domain.domainId" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" class="search-item">
          <el-select v-model="searchStatus" placeholder="全部" clearable style="width: 160px">
            <el-option label="开发中" value="0" />
            <el-option label="已发布" value="1" />
          </el-select>
        </el-form-item>
        <el-form-item class="search-item-right">
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="scenario-list" v-loading="store.loading">
      <div v-for="item in filteredScenarios" :key="item.sceneId" class="f-scenario-card f-template-card-row">
        <div class="f-scenario-card-header listview-item-content">
          <div class="listview-item-icon">
            <i class="f-icon f-icon-engineering"></i>
          </div>
          <div class="listview-item-main">
            <h4 class="listview-item-title">{{ item.sceneName }}</h4>
            <h5 class="listview-item-subtitle">{{ item.sceneCode }}</h5>
            <span :class="getBadgeClass(item.status)">{{ statusText(item.status) }}</span>
          </div>
        </div>
        <div class="f-scenario-card-content">
          <p>{{ item.sceneDescription }}</p>
        </div>
        <div class="f-scenario-card-footer">
          <div class="btn-group f-btn-group-links">
            <el-button text class="icon-btn" @click="openScenarioDetail(item)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button text class="icon-btn" :loading="publishingSceneId === item.sceneId" @click="togglePublish(item)">
              <el-icon v-if="isPublished(item.status)"><RefreshLeft /></el-icon>
              <el-icon v-else><Promotion /></el-icon>
            </el-button>
            <el-button text class="icon-btn" @click="openScenarioPlatform(item)">
              <el-icon><Link /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="createDialogVisible" title="创建场景" width="620px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="88px">
        <el-form-item label="场景名称" prop="name">
          <el-input v-model="createForm.name" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="场景编码" prop="code">
          <el-input v-model="createForm.code" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="所属领域" prop="domainId">
          <el-select v-model="createForm.domainId" style="width: 100%" placeholder="请选择领域">
            <el-option v-for="item in domains" :key="item.domainId" :label="item.domainName" :value="item.domainId" />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="经度" prop="longitude">
              <el-input-number v-model="createForm.longitude" :precision="6" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="纬度" prop="latitude">
              <el-input-number v-model="createForm.latitude" :precision="6" :step="0.0001" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="图片地址" prop="imageUrl">
          <el-input v-model="createForm.imageUrl" maxlength="255" />
        </el-form-item>
        <el-form-item label="访问地址" prop="url">
          <el-input v-model="createForm.url" maxlength="255" />
        </el-form-item>
        <el-form-item label="场景描述" prop="description">
          <el-input v-model="createForm.description" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDrawerVisible"
      fullscreen
      destroy-on-close
      :show-close="false"
      class="scenario-detail-dialog"
    >
      <ScenarioDetail
        v-if="activeScenario"
        :scenario="activeScenario"
        :domains="domains"
        :saving="editSubmitting"
        @save="saveScenarioDetail"
        @cancel="detailDrawerVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Edit, Link, Promotion, RefreshLeft } from '@element-plus/icons-vue';
import { createScenario, getDomainOptions, getScenarioList, publishScenario, updateScenario } from '../api/scenario';
import { useScenarioStore } from '../store/scenario';
import type { DomainOption, ScenarioRecord } from '../types/models';
import ScenarioDetail from './ScenarioDetail.vue';

const store = useScenarioStore();
const searchName = ref('');
const searchDomainId = ref('');
const searchStatus = ref('');
const domains = ref<DomainOption[]>([]);
const activeScenario = ref<ScenarioRecord | null>(null);
const detailDrawerVisible = ref(false);
const publishingSceneId = ref('');
const editSubmitting = ref(false);
const createDialogVisible = ref(false);
const createSubmitting = ref(false);
const createFormRef = ref<FormInstance>();
const createForm = ref({
  code: '',
  name: '',
  description: '',
  status: '0' as '0' | '1',
  url: '',
  domainId: '',
  longitude: null as number | null,
  latitude: null as number | null,
  imageUrl: ''
});
const createRules: FormRules = {
  name: [{ required: true, message: '请输入场景名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入场景编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '场景编码需字母开头，仅支持字母数字下划线', trigger: 'blur' }
  ],
  domainId: [{ required: true, message: '请选择领域', trigger: 'change' }]
};

const appCenterPath = import.meta.env.VITE_APP_CENTER_PATH || 'http://139.196.239.110:5174';

const filteredScenarios = computed(() => {
  return store.scenarios.filter((item) => {
    const nameMatched = !searchName.value || item.sceneName.includes(searchName.value);
    const domainMatched = !searchDomainId.value || item.domainId === searchDomainId.value;
    const statusMatched = !searchStatus.value || item.status === searchStatus.value;
    return nameMatched && domainMatched && statusMatched;
  });
});

async function refreshScenarios() {
  store.loading = true;
  try {
    store.scenarios = await getScenarioList(searchDomainId.value || undefined);
  } finally {
    store.loading = false;
  }
}

async function refreshDomains() {
  domains.value = await getDomainOptions();
}

function statusText(status: string) {
  if (isPublished(status)) {
    return '已发布';
  }
  return '开发中';
}

function getBadgeClass(status: string) {
  return {
    bage: true,
    'bage-testing': !isPublished(status),
    'bage-published': isPublished(status)
  };
}

function isPublished(status: string) {
  return `${status ?? ''}`.trim() === '1';
}

function openScenarioDetail(scenario: ScenarioRecord) {
  activeScenario.value = scenario;
  detailDrawerVisible.value = true;
}

function openScenarioPlatform(scenario: ScenarioRecord) {
  if (isPublished(scenario.status) && scenario.url) {
    window.open(scenario.url, '_blank', 'noopener,noreferrer');
    return;
  }
  const deployPath = `${appCenterPath}/apps/platform/development-platform/ide/app-center/index.html`.replace(/[ `'"]/g, '');
  const url = new URL(deployPath, window.location.origin);
  url.searchParams.append('scenarioId', scenario.sceneId);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

function handleCreate() {
  createForm.value = {
    code: '',
    name: '',
    description: '',
    status: '0',
    url: '',
    domainId: searchDomainId.value || domains.value[0]?.domainId || '',
    longitude: null,
    latitude: null,
    imageUrl: ''
  };
  createDialogVisible.value = true;
}

async function submitCreate() {
  if (!createFormRef.value) {
    return;
  }
  const valid = await createFormRef.value.validate().catch(() => false);
  if (!valid) {
    return;
  }
  createSubmitting.value = true;
  try {
    await createScenario({
      code: createForm.value.code.trim(),
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
      status: createForm.value.status,
      url: createForm.value.url.trim(),
      domainId: Number(createForm.value.domainId),
      location:
        createForm.value.longitude !== null && createForm.value.latitude !== null
          ? { lng: createForm.value.longitude, lat: createForm.value.latitude }
          : null,
      imageUrl: createForm.value.imageUrl.trim()
    });
    createDialogVisible.value = false;
    ElMessage.success('创建成功');
    await refreshScenarios();
  } catch (error: any) {
    ElMessage.error(error?.response?.data || '创建失败');
  } finally {
    createSubmitting.value = false;
  }
}

async function togglePublish(scene: ScenarioRecord) {
  const nextStatus = isPublished(scene.status) ? '0' : '1';
  publishingSceneId.value = scene.sceneId;
  try {
    await publishScenario({
      sceneId: Number(scene.sceneId),
      status: nextStatus,
      url: scene.url || ''
    });
    ElMessage.success(nextStatus === '1' ? '发布成功' : '已取消发布');
    await refreshScenarios();
    if (activeScenario.value?.sceneId === scene.sceneId) {
      activeScenario.value = store.scenarios.find((item) => item.sceneId === scene.sceneId) || null;
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data || '操作失败');
  } finally {
    publishingSceneId.value = '';
  }
}

async function saveScenarioDetail(payload: ScenarioRecord) {
  editSubmitting.value = true;
  try {
    const currentStatus = activeScenario.value ? (isPublished(activeScenario.value.status) ? '1' : '0') : '0';
    await updateScenario(payload.sceneId, {
      code: payload.sceneCode,
      name: payload.sceneName,
      description: payload.sceneDescription || '',
      status: currentStatus,
      url: payload.url || '',
      domainId: Number(payload.domainId),
      location:
        payload.longitude !== null && payload.longitude !== undefined && payload.latitude !== null && payload.latitude !== undefined
          ? { lng: Number(payload.longitude), lat: Number(payload.latitude) }
          : null,
      imageUrl: payload.imageUrl || ''
    });
    if (currentStatus === '1') {
      await publishScenario({
        sceneId: Number(payload.sceneId),
        status: '1',
        url: payload.url || ''
      });
    }
    ElMessage.success('保存成功');
    await refreshScenarios();
    activeScenario.value = store.scenarios.find((item) => item.sceneId === payload.sceneId) || null;
    detailDrawerVisible.value = false;
  } catch (error: any) {
    ElMessage.error(error?.response?.data || '保存失败');
  } finally {
    editSubmitting.value = false;
  }
}

function resetSearch() {
  searchName.value = '';
  searchDomainId.value = '';
  searchStatus.value = '';
  refreshScenarios();
}

onMounted(() => {
  refreshDomains();
  refreshScenarios();
});
</script>

<style scoped>
.scenario-page {
  min-height: 100%;
  padding: 16px 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  color: rgba(0, 0, 0, 0.85);
  font-size: 20px;
  font-weight: 500;
}

.search-card {
  margin-bottom: 16px;
  border: 1px solid #ebeff5;
}

.search-form {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-item {
  margin-bottom: 0;
}

.search-item-right {
  margin: 0 0 0 auto;
}

.scenario-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.f-scenario-card {
  background-image: url('/assets/images/card-background.png');
  background-size: cover;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(20, 35, 90, 0.08);
  margin: 6px;
  padding: 20px 20px 14px 20px;
  position: relative;
  transition: box-shadow 0.2s ease;
  width: 280px;
}

.f-scenario-card:hover {
  box-shadow: 0 4px 14px rgba(20, 35, 90, 0.16);
}

.f-scenario-card-header.listview-item-content {
  display: flex;
}

.f-scenario-card-header .listview-item-icon {
  border-radius: 21px;
  display: flex;
  height: 42px;
  margin-right: 20px;
  width: 42px;
  background-image: linear-gradient(-51deg, #78b5ff 0%, #4d98ff 50%);
}

.f-scenario-card-header .listview-item-icon > i {
  margin: auto;
  color: #fff;
  font-size: 22px;
}

.f-scenario-card-header .listview-item-title {
  margin-bottom: 0;
  color: rgba(0, 0, 0, 0.85);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.11px;
  line-height: 1.4rem;
}

.f-scenario-card-header .listview-item-subtitle {
  margin-bottom: 0;
  color: #7a8dae;
  font-size: 13px;
  font-weight: 400;
}

.f-scenario-card-header .bage {
  position: absolute;
  top: 20px;
  right: 20px;
  height: 20px;
  width: 50px;
  border-radius: 10px;
  font-size: 12px;
  text-align: center;
  font-weight: 500;
  line-height: 18px;
}

.f-scenario-card-header .bage-testing {
  background: #eef5ff;
  border: 1px solid rgba(56, 143, 255, 0.8);
  color: #388fff;
}

.f-scenario-card-header .bage-published {
  background: #fff4e5;
  border: 1px solid rgba(255, 152, 0, 0.8);
  color: #ff9800;
}

.f-scenario-card-content p {
  margin: 0;
  color: #7a8dae;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.f-scenario-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.f-scenario-card-footer .btn-group {
  visibility: hidden;
}

.f-scenario-card:hover .btn-group {
  visibility: visible;
}

.icon-btn {
  font-size: 16px;
  color: #4d98ff;
}
</style>
