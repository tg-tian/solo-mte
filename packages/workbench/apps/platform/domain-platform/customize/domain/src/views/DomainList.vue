<template>
  <div class="f-page f-page-is-managelist domain-page">
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

    <el-dialog v-model="createDialogVisible" title="创建领域" width="520px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="88px">
        <el-form-item label="领域名称" prop="domainName">
          <el-input v-model="createForm.domainName" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="领域编码" prop="domainCode">
          <el-input v-model="createForm.domainCode" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="领域描述" prop="domainDescription">
          <el-input v-model="createForm.domainDescription" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

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
            <el-button text class="icon-btn" @click="openDomainDetail(item)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button text class="icon-btn" :loading="publishingDomainId === item.domainId" @click="togglePublish(item)">
              <el-icon v-if="isPublished(item.status)"><RefreshLeft /></el-icon>
              <el-icon v-else><Promotion /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="detailDrawerVisible"
      fullscreen
      destroy-on-close
      :show-close="false"
      class="domain-detail-dialog"
    >
      <DomainDetail
        v-if="activeDomain"
        :domain="activeDomain"
        :saving="editSubmitting"
        @save="saveDomainDetail"
        @cancel="detailDrawerVisible = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Edit, Promotion, RefreshLeft } from '@element-plus/icons-vue';
import { createDomain, getDomainList, publishDomain, updateDomain } from '../api/domain';
import { useDomainStore } from '../store/domain';
import type { DomainRecord } from '../types/models';
import DomainDetail from './DomainDetail.vue';

const store = useDomainStore();
const searchName = ref('');
const searchStatus = ref('');
const activeDomain = ref<DomainRecord | null>(null);
const detailDrawerVisible = ref(false);
const publishingDomainId = ref('');
const editSubmitting = ref(false);
const createDialogVisible = ref(false);
const createSubmitting = ref(false);
const createFormRef = ref<FormInstance>();
const createForm = ref({
  domainName: '',
  domainCode: '',
  domainDescription: ''
});
const createRules: FormRules = {
  domainName: [{ required: true, message: '请输入领域名称', trigger: 'blur' }],
  domainCode: [
    { required: true, message: '请输入领域编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '领域编码需字母开头，仅支持字母数字下划线', trigger: 'blur' }
  ]
};

const filteredDomains = computed(() => {
  return store.domains.filter((item) => {
    const nameMatched = !searchName.value || item.domainName.includes(searchName.value);
    const statusMatched = !searchStatus.value || item.status === searchStatus.value;
    return nameMatched && statusMatched;
  });
});

async function refreshDomains() {
  store.loading = true;
  try {
    store.domains = await getDomainList();
  } finally {
    store.loading = false;
  }
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
    'bage-developing': !isPublished(status),
    'bage-published': isPublished(status)
  };
}

function openDomainDetail(domain: DomainRecord) {
  activeDomain.value = domain;
  detailDrawerVisible.value = true;
}

function isPublished(status: string) {
  return `${status ?? ''}`.trim() === '1';
}

async function togglePublish(domain: DomainRecord) {
  const nextStatus = isPublished(domain.status) ? '0' : '1';
  publishingDomainId.value = domain.domainId;
  try {
    if (nextStatus === '0') {
      await updateDomain(domain.domainId, {
        code: domain.domainCode,
        name: domain.domainName,
        description: domain.domainDescription || '',
        status: '0',
        url: domain.url || ''
      });
    } else {
      await publishDomain({
        domainId: domain.domainId,
        status: '1',
        url: domain.url || ''
      });
    }
    ElMessage.success(nextStatus === '1' ? '发布成功' : '已取消发布');
    await refreshDomains();
    if (activeDomain.value?.domainId === domain.domainId) {
      activeDomain.value = store.domains.find((item) => item.domainId === domain.domainId) || null;
    }
  } catch (error: any) {
    const message = error?.response?.data || '操作失败';
    ElMessage.error(message);
  } finally {
    publishingDomainId.value = '';
  }
}

async function saveDomainDetail(payload: DomainRecord) {
  const currentStatus = activeDomain.value ? (isPublished(activeDomain.value.status) ? '1' : '0') : '0';
  editSubmitting.value = true;
  try {
    await updateDomain(payload.domainId, {
      code: payload.domainCode,
      name: payload.domainName,
      description: payload.domainDescription || '',
      status: currentStatus,
      url: payload.url || ''
    });
    if (currentStatus === '1') {
      await publishDomain({
        domainId: payload.domainId,
        status: '1',
        url: payload.url || ''
      });
    }
    ElMessage.success('保存成功');
    await refreshDomains();
    activeDomain.value = store.domains.find((item) => item.domainId === payload.domainId) || null;
    detailDrawerVisible.value = false;
  } catch (error: any) {
    const message = error?.response?.data || '保存失败';
    ElMessage.error(message);
  } finally {
    editSubmitting.value = false;
  }
}

function handleCreate() {
  createForm.value = {
    domainName: '',
    domainCode: '',
    domainDescription: ''
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
    await createDomain({
      code: createForm.value.domainCode.trim(),
      name: createForm.value.domainName.trim(),
      description: createForm.value.domainDescription.trim(),
      status: '0'
    });
    createDialogVisible.value = false;
    ElMessage.success('创建成功');
    await refreshDomains();
  } catch (error: any) {
    const message = error?.response?.data || '创建失败';
    ElMessage.error(message);
  } finally {
    createSubmitting.value = false;
  }
}

function resetSearch() {
  searchName.value = '';
  searchStatus.value = '';
}

onMounted(() => {
  refreshDomains();
});
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

:deep(.domain-detail-dialog .el-dialog__header) {
  display: none;
}

:deep(.domain-detail-dialog .el-dialog__body) {
  padding: 0;
}
</style>
