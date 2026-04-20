<template>
  <div class="scenario-root">
    <div v-if="standaloneEditMode" class="scenario-edit-standalone" v-loading="standaloneLoading">
      <ScenarioDetail
        v-if="activeScenario"
        :scenario="activeScenario"
        :domains="domains"
        :saving="editSubmitting"
        mode="edit"
        @submit="saveScenarioDetail"
        @cancel="handleScenarioDetailCancel"
      />
      <el-empty v-else description="未找到场景信息" />
    </div>

    <div v-else class="f-page f-page-is-managelist scenario-page">
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
              <el-button text class="icon-btn" @click="openScenarioEdit(item)" title="编辑">
                <i class="f-icon f-icon-edit-cardview"></i>
              </el-button>
              <el-button text class="icon-btn" @click="openScenarioPlatform(item)" title="进入场景">
                <el-icon><Link /></el-icon>
              </el-button>
              <el-button text class="icon-btn icon-btn-danger" @click="handleDeleteScenario(item)" title="删除场景">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <el-dialog
        v-model="createDialogVisible"
        fullscreen
        destroy-on-close
        :show-close="false"
        class="scenario-detail-dialog"
      >
        <ScenarioDetail
          :scenario="createScenarioModel"
          :domains="domains"
          :saving="createSubmitting"
          mode="create"
          @submit="submitCreate"
          @cancel="handleCreateCancel"
        />
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
          mode="edit"
          @submit="saveScenarioDetail"
          @cancel="handleScenarioDetailCancel"
        />
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Link } from '@element-plus/icons-vue';
import { createArea, createScenario, deleteScenario, getDomainOptions, getScenarioList, updateScenario } from '../api/scenario';
import { useScenarioStore } from '../store/scenario';
import type { AreaRecord, DomainOption, ScenarioRecord } from '../types/models';
import ScenarioDetail from './ScenarioDetail.vue';

interface ScenarioSubmitPayload {
  scenario: ScenarioRecord;
  areas: AreaRecord[];
}

const store = useScenarioStore();
const searchName = ref('');
const searchDomainId = ref('');
const searchStatus = ref('');
const domains = ref<DomainOption[]>([]);
const activeScenario = ref<ScenarioRecord | null>(null);
const detailDrawerVisible = ref(false);
const editSubmitting = ref(false);
const createDialogVisible = ref(false);
const createSubmitting = ref(false);
const standaloneEditMode = ref(false);
const standaloneSceneId = ref('');
const standaloneLoading = ref(false);
const createScenarioModel = ref<ScenarioRecord>({
  sceneId: '',
  sceneName: '',
  sceneCode: '',
  sceneDescription: '',
  status: '0',
  domainId: '',
  longitude: null,
  latitude: null,
  imageUrl: '',
  url: ''
});

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
  return isPublished(status) ? '已发布' : '开发中';
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

function openUrl(scenario: ScenarioRecord, path: string) {
  const deployPath = path.replace(/[`'"]/g, '');
  if (window.top && window.top !== window) {
    window.top.postMessage({
      eventType: 'invoke',
      method: 'openUrl',
      params: [scenario.sceneId, scenario.sceneCode, scenario.sceneName, deployPath]
    });
    return;
  }
  window.open(deployPath, '_blank', 'noopener,noreferrer');
}

function buildScenarioEditPath(sceneId: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mode', 'edit');
  url.searchParams.set('sceneId', sceneId);
  return url.toString();
}

function openScenarioEdit(scenario: ScenarioRecord) {
  const path = buildScenarioEditPath(scenario.sceneId);
  openUrl(scenario, path);
}

function openScenarioPlatform(scenario: ScenarioRecord) {
  if (isPublished(scenario.status) && scenario.url) {
    window.open(scenario.url, '_blank', 'noopener,noreferrer');
    return;
  }
  const deployPath = `${appCenterPath}/apps/platform/development-platform/ide/app-center/index.html`.replace(/[ `' "]/g, '');
  const url = new URL(deployPath, window.location.origin);
  url.searchParams.append('scenarioId', scenario.sceneId);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

async function handleDeleteScenario(scenario: ScenarioRecord) {
  try {
    await ElMessageBox.confirm(`确认删除场景「${scenario.sceneName}」吗？`, '删除场景', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteScenario(scenario.sceneId);
    ElMessage.success('删除成功');
    await refreshScenarios();
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    ElMessage.error(error?.response?.data || '删除失败');
  }
}

function handleCreate() {
  createScenarioModel.value = {
    sceneId: '',
    sceneName: '',
    sceneCode: '',
    sceneDescription: '',
    status: '0',
    domainId: searchDomainId.value || domains.value[0]?.domainId || '',
    longitude: null,
    latitude: null,
    imageUrl: '',
    url: ''
  };
  createDialogVisible.value = true;
}

function handleCreateCancel() {
  createDialogVisible.value = false;
}

async function submitCreate(payload: ScenarioSubmitPayload) {
  createSubmitting.value = true;
  try {
    const scenarioPayload = {
      code: payload.scenario.sceneCode,
      name: payload.scenario.sceneName,
      description: payload.scenario.sceneDescription || '',
      status: payload.scenario.status === '1' ? '1' : '0' as '0' | '1',
      url: payload.scenario.url || '',
      domainId: Number(payload.scenario.domainId),
      location:
        payload.scenario.longitude !== null && payload.scenario.longitude !== undefined && payload.scenario.latitude !== null && payload.scenario.latitude !== undefined
          ? { lng: Number(payload.scenario.longitude), lat: Number(payload.scenario.latitude) }
          : null,
      imageUrl: payload.scenario.imageUrl || ''
    };
    const result = await createScenario(scenarioPayload);
    const sceneId = `${result?.data?.sceneId ?? result?.data?.id ?? ''}`;

    if (sceneId && payload.areas.length) {
      const pendingAreas = payload.areas.map((area) => ({ ...area }));
      const localToRemoteAreaIdMap = new Map<string, number>();
      let remainingAreas = pendingAreas;

      while (remainingAreas.length) {
        let createdInCurrentRound = 0;
        const nextRoundAreas: AreaRecord[] = [];

        for (const area of remainingAreas) {
          const rawParentId = `${area.parentId ?? '-1'}`;
          const canCreate = rawParentId === '-1' || !rawParentId.startsWith('local-') || localToRemoteAreaIdMap.has(rawParentId);

          if (!canCreate) {
            nextRoundAreas.push(area);
            continue;
          }

          const parentId = rawParentId === '-1'
            ? -1
            : rawParentId.startsWith('local-')
              ? localToRemoteAreaIdMap.get(rawParentId) ?? -1
              : Number(rawParentId);

          const areaResult = await createArea({
            name: area.name,
            sceneId: Number(sceneId),
            description: area.description || '',
            position: area.position || '',
            image: area.image || '',
            parentId
          });

          const createdAreaId = Number(areaResult?.data?.id ?? areaResult?.data?.areaId ?? areaResult?.data?.data?.id ?? areaResult?.data?.data?.areaId ?? NaN);
          if (String(area.id).startsWith('local-') && Number.isFinite(createdAreaId)) {
            localToRemoteAreaIdMap.set(String(area.id), createdAreaId);
          }
          createdInCurrentRound += 1;
        }

        if (!createdInCurrentRound && nextRoundAreas.length) {
          throw new Error('区域父子关系保存失败：存在未能解析的父区域映射');
        }

        remainingAreas = nextRoundAreas;
      }
    }

    await refreshScenarios();
    const createdScenario = store.scenarios.find((item) => item.sceneId === sceneId) || {
      ...payload.scenario,
      sceneId
    };
    activeScenario.value = createdScenario;
    createDialogVisible.value = false;
    detailDrawerVisible.value = true;
    await nextTick();
    ElMessage.success('创建成功，已跳转到编辑页');
  } catch (error: any) {
    ElMessage.error(error?.response?.data || error?.message || '创建失败');
  } finally {
    createSubmitting.value = false;
  }
}

async function saveScenarioDetail(payload: ScenarioSubmitPayload) {
  editSubmitting.value = true;
  try {
    const targetStatus = payload.scenario.status === '1' ? '1' : '0';
    await updateScenario(payload.scenario.sceneId, {
      code: payload.scenario.sceneCode,
      name: payload.scenario.sceneName,
      description: payload.scenario.sceneDescription || '',
      status: targetStatus,
      url: payload.scenario.url || '',
      domainId: Number(payload.scenario.domainId),
      location:
        payload.scenario.longitude !== null && payload.scenario.longitude !== undefined && payload.scenario.latitude !== null && payload.scenario.latitude !== undefined
          ? { lng: Number(payload.scenario.longitude), lat: Number(payload.scenario.latitude) }
          : null,
      imageUrl: payload.scenario.imageUrl || ''
    });
    ElMessage.success('保存成功');
    await refreshScenarios();
    activeScenario.value = store.scenarios.find((item) => item.sceneId === payload.scenario.sceneId) || null;
    if (!standaloneEditMode.value) {
      detailDrawerVisible.value = false;
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data || '保存失败');
  } finally {
    editSubmitting.value = false;
  }
}

function handleScenarioDetailCancel() {
  if (standaloneEditMode.value) {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    window.location.href = url.toString();
    return;
  }
  detailDrawerVisible.value = false;
}

async function initializePage() {
  const search = new URLSearchParams(window.location.search);
  standaloneEditMode.value = search.get('mode') === 'edit';
  standaloneSceneId.value = search.get('sceneId') || '';
  await refreshDomains();
  if (standaloneEditMode.value) {
    standaloneLoading.value = true;
    try {
      await refreshScenarios();
      activeScenario.value = store.scenarios.find((item) => item.sceneId === standaloneSceneId.value) || null;
    } finally {
      standaloneLoading.value = false;
    }
    return;
  }
  await refreshScenarios();
}

function resetSearch() {
  searchName.value = '';
  searchDomainId.value = '';
  searchStatus.value = '';
  refreshScenarios();
}

onMounted(() => {
  initializePage();
});
</script>

<style scoped>
.scenario-root {
  min-height: 100%;
}
.scenario-edit-standalone {
  min-height: 100%;
}
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
.icon-btn-danger {
  color: #f56c6c;
}
</style>