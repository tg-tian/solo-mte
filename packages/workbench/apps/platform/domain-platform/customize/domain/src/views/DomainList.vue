<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="page-title">领域列表</h2>
        <p class="page-subtitle">管理领域基础信息，并进入领域建模与场景设计</p>
      </div>
      <el-button type="primary" @click="handleCreate">创建领域</el-button>
    </div>

    <el-card shadow="never" class="search-card">
      <el-form :inline="true">
        <el-form-item label="平台名称">
          <el-input v-model="searchName" placeholder="请输入平台名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchStatus" placeholder="全部" clearable style="width: 160px">
            <el-option label="定制中" value="2" />
            <el-option label="测试中" value="0" />
            <el-option label="已发布" value="1" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="card-grid" v-loading="store.loading">
      <el-col v-for="item in filteredDomains" :key="item.domainId" :xs="24" :sm="12" :md="8" :lg="6">
        <el-card shadow="hover" class="domain-card">
          <div class="domain-card-header">
            <h3 class="domain-name">{{ item.domainName }}</h3>
            <el-tag :type="getStatusType(item.status)" size="small">{{ statusText(item.status) }}</el-tag>
          </div>
          <div class="domain-code">{{ item.domainCode }}</div>
          <p class="domain-desc">{{ item.domainDescription }}</p>
          <div class="domain-actions">
            <el-button link type="primary" @click="openDomainPlatform(item)">领域建模</el-button>
            <el-button link type="success" @click="openDomainScen(item)">场景设计</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useDomainStore } from '../store/domain';
import type { DomainRecord } from '../types/models';

const store = useDomainStore();
const searchName = ref('');
const searchStatus = ref('');
const metaFront = import.meta.env.VITE_META_FRONT || 'http://localhost:2400';

const filteredDomains = computed(() => {
  return store.domains.filter((item) => {
    const nameMatched = !searchName.value || item.domainName.includes(searchName.value);
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

function getStatusType(status: string) {
  if (status === '0') {
    return 'warning';
  }
  if (status === '1') {
    return 'success';
  }
  return 'info';
}

function openUrl(domain: DomainRecord, path: string) {
  const deployPath = path.replace(/[`'"]/g, '');
  window.top?.postMessage({
    eventType: 'invoke',
    method: 'openUrl',
    params: [domain.domainId, domain.domainCode, domain.domainName, deployPath]
  });
}

function openDomainPlatform(domain: DomainRecord) {
  const path = `${metaFront}/#/meta/domain/setting?mode=edit&domainId=${domain.domainId}`;
  openUrl(domain, path);
}

function openDomainScen(domain: DomainRecord) {
  const path = `${metaFront}/#/domain/scene/list?domainId=${domain.domainId}`;
  openUrl(domain, path);
}

function handleCreate() {
  ElMessage.info('创建领域功能待实现');
}

onMounted(() => {
  store.fetchDomains();
});
</script>

<style scoped>
.page-container {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.page-subtitle {
  margin: 8px 0 0;
  color: #909399;
}

.search-card {
  margin-bottom: 16px;
}

.card-grid {
  row-gap: 16px;
}

.domain-card {
  min-height: 210px;
}

.domain-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.domain-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.domain-code {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.domain-desc {
  height: 72px;
  margin: 0 0 10px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
}

.domain-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
