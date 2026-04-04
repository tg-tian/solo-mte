<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <el-button text class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <h2 class="page-main-title">
          场景列表 
          <span v-if="currentDomain" class="page-sub-title" style="display:inline; margin-left: 8px;">- {{ currentDomain.domainName }}</span>
        </h2>
        <p class="page-sub-title">管理领域平台内的具体应用场景和部署节点</p>
      </div>
    </div>
    
    <el-card class="scene-search">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="场景名称">
          <el-input v-model="searchForm.name" placeholder="请输入场景名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="已发布" value='1'></el-option>
            <el-option label="开发中" value='0'></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <div class="scene-content">
      <div class="scene-list">
        <el-table
          v-loading="loading"
          :data="filteredScenes"
          border
        >
          <el-table-column prop="code" label="场景编码" width="100"></el-table-column>
          <el-table-column prop="name" label="场景名称" width="150"></el-table-column>
          <el-table-column prop="description" label="描述" min-width="220"></el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="160"></el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="160"></el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === '1' ? 'success' : 'info'">
                {{ scope.row.status === '1' ? '已发布' : '开发中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button type="primary" size="small" @click="navigateToSceneSetting(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useDomainStore } from '../store/domain';
import request from '../utils/request';
  
const props = defineProps<{
  domainId?: number | null;
}>();
  
const domainStore = useDomainStore();
const loading = ref(false);
const scenes = ref<any[]>([]);
const searchForm = reactive({
  name: '',
  status: ''
});
  
const currentDomain = computed(() => domainStore.currentDomain);
const appCenterPath = (import.meta as any).env?.VITE_APP_CENTER_PATH || 'http://139.196.239.110:5174';
  
const filteredScenes = computed(() => {
  return scenes.value
    .filter((scene) => {
      const nameMatch = !searchForm.name || (scene.name || '').toLowerCase().includes(searchForm.name.toLowerCase());
      const statusMatch = !searchForm.status || scene.status === searchForm.status;
      return nameMatch && statusMatch;
    })
    .map((scene) => {
      return {
        ...scene,
        createTime: (scene.createTime || '').toString().replace('T', ' ').split('.')[0],
        updateTime: (scene.updateTime || '').toString().replace('T', ' ').split('.')[0]
      };
    });
});
  
async function fetchScenes() {
  loading.value = true;
  try {
    const url = props.domainId ? '/scenes' : '/all-scenes';
    const res = await request.get(url, props.domainId ? { params: { domainId: props.domainId } } : undefined);
    const data = Array.isArray(res.data?.value) ? res.data.value : res.data;
    scenes.value = Array.isArray(data) ? normalizeScenes(data) : [];
  } finally {
    loading.value = false;
  }
}

function normalizeScenes(list: any[]) {
  return list.map((item) => ({
    id: `${item.sceneId ?? item.id ?? ''}`,
    code: item.sceneCode ?? item.code ?? '',
    name: item.sceneName ?? item.name ?? '',
    description: item.sceneDescription ?? item.description ?? '',
    status: `${item.status ?? '0'}`,
    url: item.url ?? '',
    domainId: `${item.domainId ?? ''}`,
    createTime: item.createTime,
    updateTime: item.updateTime,
    longitude: item.longitude ?? item.location?.lng ?? null,
    latitude: item.latitude ?? item.location?.lat ?? null,
    imageUrl: item.imageUrl ?? ''
  }));
}

function isPublished(status: string) {
  return `${status ?? ''}`.trim() === '1';
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

function navigateToSceneSetting(row?: any) {
  const domainId = props.domainId || (currentDomain.value as any)?.domainId || (currentDomain.value as any)?.id;
  if (!domainId) {
    ElMessage.warning('请先选择一个领域');
    return;
  }
  
  if (row) {
    if (window.top && window.top !== window) {
      window.top.postMessage({
        eventType: 'invoke',
        method: 'openUrl',
        params: [
          `scene-${row.id}`, 
          row.code, 
          row.name, 
          `/apps/platform/scenario-platform/customize/scenario/index.html?mode=edit&sceneId=${row.id}&domainId=${domainId}`
        ]
      });
    } else {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('mode', 'edit');
      url.searchParams.set('sceneId', row.id);
      url.searchParams.set('domainId', String(domainId));
      
      const deployPath = url.toString().replace(/apps\/platform\/domain-platform\/customize\/domain/g, 'apps/platform/scenario-platform/customize/scenario');
      window.open(deployPath, '_blank', 'noopener,noreferrer');
    }
  }
}

function handleSearch() {
  fetchScenes();
}

function resetSearch() {
  searchForm.name = '';
  searchForm.status = '';
}

function goBack() {
  if (window.top && window.top !== window) {
    window.top.postMessage({
      eventType: 'invoke',
      method: 'closeUrl',
      params: []
    });
  } else {
    const url = new URL(window.location.href);
    const hash = url.hash || '#/';
    const hashPath = hash.includes('?') ? hash.slice(0, hash.indexOf('?')) : hash;
    url.hash = hashPath;
    window.history.pushState({}, '', url.toString());
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

onMounted(() => {
  fetchScenes();
});
</script>

<style scoped>
.page-container {
  width: 100%;
}
.scene-search {
  margin-bottom: 20px;
}
.scene-content {
  display: block;
  gap: 10px;
  height: calc(100vh - 260px);
}
.scene-list {
  overflow: auto;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-title-group {
  display: flex;
  align-items: center;
}
.page-main-title {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
  color: #303133;
}
.page-sub-title {
  margin: 0;
  margin-top: 4px;
  font-size: 14px;
  color: #909399;
}
</style>
