<template>
  <div class="f-page f-page-is-managelist scenario-page">
    <div class="page-header">
      <h2 class="page-title">场景列表</h2>
      <el-button type="primary" class="btn-primary" @click="handleCreate">创建场景</el-button>
    </div>

    <el-card shadow="never" class="search-card">
      <el-form :inline="true" class="search-form">
        <el-form-item label="平台名称" class="search-item">
          <el-input v-model="searchName" placeholder="请输入平台名称" clearable style="width: 240px" />
        </el-form-item>
        <el-form-item label="状态" class="search-item">
          <el-select v-model="searchStatus" placeholder="全部" clearable style="width: 160px">
            <el-option label="定制中" value="2" />
            <el-option label="测试中" value="0" />
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
            <el-button text class="icon-btn" @click="editScenarioPlatform(item)">
              <i class="f-icon f-icon-edit-cardview"></i>
            </el-button>
            <el-button text class="icon-btn" @click="openScenarioPlatform(item)">
              <i class="f-icon f-icon-share"></i>
            </el-button>
            <el-button text class="icon-btn icon-btn-disabled">
              <i class="f-icon f-icon-yxs_delete"></i>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useScenarioStore } from '../store/scenario';
import type { ScenarioRecord } from '../types/models';

const store = useScenarioStore();
const searchName = ref('');
const searchStatus = ref('');
const metaFront = import.meta.env.VITE_META_FRONT || 'http://localhost:2400';
const appCenterPath = import.meta.env.VITE_APP_CENTER_PATH || 'http://139.196.239.110:5174';

const filteredScenarios = computed(() => {
  return store.scenarios.filter((item) => {
    const nameMatched = !searchName.value || item.sceneName.includes(searchName.value);
    const statusMatched = !searchStatus.value || item.status === searchStatus.value;
    return nameMatched && statusMatched;
  });
});

function statusText(status: string) {
  if (status === '0') {
    return '测试中';
  }
  if (status === '1') {
    return '已发布';
  }
  return '定制中';
}

function getBadgeClass(status: string) {
  return {
    bage: true,
    'bage-testing': status === '0',
    'bage-published': status === '1',
    'bage-editing': status === '2'
  };
}

function editScenarioPlatform(scenario: ScenarioRecord) {
  const deployPath = `${metaFront}/#/domain/scene/setting?mode=edit&sceneId=${scenario.sceneId}`.replace(/[`'"]/g, '');
  window.top?.postMessage({
    eventType: 'invoke',
    method: 'openUrl',
    params: [scenario.sceneId, scenario.sceneCode, scenario.sceneName, deployPath]
  });
}

function openScenarioPlatform(scenario: ScenarioRecord) {
  const deployPath = `${appCenterPath}/apps/platform/development-platform/ide/app-center/index.html`.replace(/[`'"]/g, '');
  const url = new URL(deployPath, window.location.origin);
  url.searchParams.append('scenarioId', scenario.sceneId);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

function handleCreate() {
  ElMessage.info('创建场景功能待实现');
}

function resetSearch() {
  searchName.value = '';
  searchStatus.value = '';
}

onMounted(() => {
  store.fetchScenarios();
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

.f-scenario-card-header .bage-editing {
  background: #f0f9f2;
  border: 1px solid rgba(51, 186, 143, 1);
  color: #33ba8f;
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

.icon-btn-disabled {
  color: #b6c2d5;
}
</style>
