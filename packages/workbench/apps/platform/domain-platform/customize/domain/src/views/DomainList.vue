<template>
  <div v-if="isDetailMode" class="f-page f-page-is-managelist domain-page">
    <DomainDetail
      :mode="routeQuery.mode"
      :domain-id="routeQuery.domainId"
      :domain-name="routeQuery.domainName"
      :domain-code="routeQuery.domainCode"
      @back="goList"
    />
  </div>

  <div v-else-if="isSceneMode" class="f-page f-page-is-managelist domain-page">
    <SceneIndex :domain-id="sceneDomainId" />
  </div>

  <div v-else class="f-page f-page-is-managelist domain-page">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">领域列表</h2>
      </div>
      <el-button type="primary" class="btn-primary" @click="handleCreate">创建领域</el-button>
    </div>

    <el-card shadow="never" class="search-card">
      <el-form :inline="true" class="search-form">
        <el-form-item label="平台名称" class="search-item">
          <el-input v-model="searchName" placeholder="请输入平台名称" clearable style="width: 240px" />
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

    <div class="domain-list" v-loading="store.loading">
      <div v-for="item in filteredDomains" :key="item.domainId" class="f-domain-card f-template-card-row">
        <div class="f-domain-card-header listview-item-content">
          <div class="listview-item-icon">
            <i class="f-icon f-icon-engineering"></i>
          </div>
          <div class="listview-item-main">
            <h4 class="listview-item-title">{{ item.domainName }}</h4>
            <h5 class="listview-item-subtitle">{{ item.domainCode }}</h5>
            <span :class="getBadgeClass(item.status)">{{ statusText(item.status) }}</span>
          </div>
        </div>
        <div class="f-domain-card-content">
          <p>{{ item.domainDescription }}</p>
        </div>
        <div class="f-domain-card-footer">
          <div class="btn-group f-btn-group-links">
            <el-button text class="icon-btn" @click="openDomainPlatform(item)">
              <i class="f-icon f-icon-edit-cardview"></i>
            </el-button>
            <el-button text class="icon-btn" @click="openDomainScen(item)">
              <i class="f-icon f-icon-share"></i>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDomainStore } from '../store/domain';
import type { DomainRecord } from '../types/models';
import DomainDetail from './DomainDetail.vue';
import SceneIndex from './SceneIndex.vue';

const store = useDomainStore();
const searchName = ref('');
const searchStatus = ref('');
const routeQuery = ref({
  mode: '',
  domainId: '',
  domainName: '',
  domainCode: ''
});

const filteredDomains = computed(() => {
  return store.domains.filter((item) => {
    const nameMatched = !searchName.value || item.domainName.includes(searchName.value);
    const statusMatched = !searchStatus.value || item.status === searchStatus.value;
    return nameMatched && statusMatched;
  });
});

const isDetailMode = computed(() => routeQuery.value.mode === 'create' || routeQuery.value.mode === 'edit' || routeQuery.value.mode === 'template');
const isSceneMode = computed(() => routeQuery.value.mode === 'scene');
const sceneDomainId = computed(() => {
  const id = Number(routeQuery.value.domainId || 0);
  return Number.isNaN(id) || id <= 0 ? null : id;
});

function statusText(status: string) {
  if (status === '1') {
    return '已发布';
  }
  return '开发中';
}

function getBadgeClass(status: string) {
  return {
    bage: true,
    'bage-developing': status !== '1',
    'bage-published': status === '1'
  };
}

function openUrl(domain: DomainRecord, path: string) {
  const deployPath = path.replace(/[`'"]/g, '');
  if (window.top && window.top !== window) {
    window.top.postMessage({
      eventType: 'invoke',
      method: 'openUrl',
      params: [domain.domainId, domain.domainCode, domain.domainName, deployPath]
    });
    return;
  }
  window.open(deployPath, '_blank', 'noopener,noreferrer');
}

function buildDomainEditPath(domain: DomainRecord) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mode', 'edit');
  url.searchParams.set('domainId', String(domain.domainId));
  url.searchParams.set('domainName', domain.domainName);
  url.searchParams.set('domainCode', domain.domainCode);
  return url.toString();
}

function openDomainPlatform(domain: DomainRecord) {
  const path = buildDomainEditPath(domain);
  openUrl(domain, path);
}

function buildDomainScenePath(domain: DomainRecord) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('mode', 'scene');
  url.searchParams.set('domainId', String(domain.domainId));
  url.searchParams.set('domainName', domain.domainName);
  url.searchParams.set('domainCode', domain.domainCode);
  return url.toString();
}

function openDomainScen(domain: DomainRecord) {
  store.setCurrentDomain(domain);
  const path = buildDomainScenePath(domain);
  openUrl(domain, path);
}

function handleCreate() {
  setDetailRoute({ mode: 'create' });
}

function resetSearch() {
  searchName.value = '';
  searchStatus.value = '';
}

onMounted(() => {
  syncRouteFromUrl();
  window.addEventListener('hashchange', syncRouteFromUrl);
  window.addEventListener('popstate', syncRouteFromUrl);
  if (!store.domains.length) {
    store.fetchDomains();
  }
});

onUnmounted(() => {
  window.removeEventListener('hashchange', syncRouteFromUrl);
  window.removeEventListener('popstate', syncRouteFromUrl);
});

function parseUrlQuery() {
  const hash = window.location.hash || '';
  const hashQueryIndex = hash.indexOf('?');
  const queryString = hashQueryIndex >= 0
    ? hash.substring(hashQueryIndex + 1)
    : window.location.search.replace(/^\?/, '');
  const params = new URLSearchParams(queryString);
  return {
    mode: params.get('mode') || '',
    domainId: params.get('domainId') || '',
    domainName: params.get('domainName') || '',
    domainCode: params.get('domainCode') || ''
  };
}

function syncRouteFromUrl() {
  routeQuery.value = parseUrlQuery();
}

function setDetailRoute(params: Record<string, string>) {
  const url = new URL(window.location.href);
  const hash = url.hash || '#/';
  const hashPath = hash.includes('?') ? hash.slice(0, hash.indexOf('?')) : hash;
  const next = new URLSearchParams(params);
  url.hash = `${hashPath}?${next.toString()}`;
  window.history.pushState({}, '', url.toString());
  syncRouteFromUrl();
}

function goList() {
  const url = new URL(window.location.href);
  const hash = url.hash || '#/';
  const hashPath = hash.includes('?') ? hash.slice(0, hash.indexOf('?')) : hash;
  url.hash = hashPath;
  window.history.pushState({}, '', url.toString());
  syncRouteFromUrl();
}
</script>

<style scoped>
.domain-page {
  min-height: 100%;
  padding: 16px 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-title-group {
  display: flex;
  align-items: center;
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

.domain-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.f-domain-card {
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

.f-domain-card:hover {
  box-shadow: 0 4px 14px rgba(20, 35, 90, 0.16);
}

.f-domain-card-header.listview-item-content {
  display: flex;
}

.f-domain-card-header .listview-item-icon {
  border-radius: 21px;
  display: flex;
  height: 42px;
  margin-right: 20px;
  width: 42px;
  background-image: linear-gradient(-51deg, #78b5ff 0%, #4d98ff 50%);
}

.f-domain-card-header .listview-item-icon > i {
  margin: auto;
  color: #fff;
  font-size: 22px;
}

.f-domain-card-header .listview-item-title {
  margin-bottom: 0;
  color: rgba(0, 0, 0, 0.85);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.11px;
  line-height: 1.4rem;
}

.f-domain-card-header .listview-item-subtitle {
  margin-bottom: 0;
  color: #7a8dae;
  font-size: 13px;
  font-weight: 400;
}

.f-domain-card-header .bage {
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

.f-domain-card-header .bage-developing {
  background: #eef5ff;
  border: 1px solid rgba(56, 143, 255, 0.8);
  color: #388fff;
}

.f-domain-card-header .bage-published {
  background: #fff4e5;
  border: 1px solid rgba(255, 152, 0, 0.8);
  color: #ff9800;
}

.f-domain-card-content p {
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

.f-domain-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.f-domain-card-footer .btn-group {
  visibility: hidden;
}

.f-domain-card:hover .btn-group {
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
