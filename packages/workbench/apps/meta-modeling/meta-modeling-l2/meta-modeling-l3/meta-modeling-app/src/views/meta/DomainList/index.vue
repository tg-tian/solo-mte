<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">领域平台列表</h2>
        <p class="page-sub-title">管理和定制不同行业的物联网领域解决方案</p>
      </div>
      <el-button type="primary" size="large" @click="handleCreate">
        <el-icon><Plus /></el-icon>创建领域
      </el-button>
    </div>
    
    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <template #header>
        <div class="search-header">
          <el-icon><Search /></el-icon>
          <span>筛选领域平台</span>
        </div>
      </template>
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="领域名称">
          <el-input v-model="searchForm.name" placeholder="请输入名称" clearable style="width: 220px"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="已发布" value="1"></el-option>
            <el-option label="定制中" value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-table
      v-loading="domainStore.loading"
      :data="filteredDomains"
      style="width: 100%; margin-top: 24px"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column prop="domainCode" label="领域编码" width="150" />
      <el-table-column prop="domainName" label="领域名称" min-width="150">
        <template #default="{ row }">
          <span class="domain-name-text">{{ row.domainName }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="domainDescription" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="120" align="center">
        <template #default="scope">
          <el-tag :type="scope.row.status === '1' ? 'success' : 'warning'" effect="light" round>
            {{ scope.row.status === '1' ? '已发布' : '定制中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
      <el-table-column prop="updateTime" label="更新时间" width="180" align="center" />
      <el-table-column label="操作" width="300" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToDomainSetting(scope.row)">编辑</el-button>
          <el-button link type="success" @click="navigateToDomainPlatform(scope.row)">进入</el-button>
          <el-button link type="primary" @click="handleViewScenes(scope.row)">场景</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 创建领域对话框 -->
    <el-dialog
        v-model="createDialogVisible"
        title="创建新领域"
        width="600px"
        class="premium-dialog"
    >
        <el-form :model="createForm" :rules="rules" ref="createFormRef" label-position="top">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="领域名称" prop="name">
                <el-input v-model="createForm.name" placeholder="例如：智慧园区" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="领域编码" prop="code">
                <el-input v-model="createForm.code" placeholder="例如：smart_park" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="创建方式" prop="createModel">
            <el-radio-group v-model="createModel">
              <el-radio-button label="1">自定义创建</el-radio-button>
              <el-radio-button label="2">从模板导入</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resetCreate">取消</el-button>
          <el-button type="primary" @click="handleCreateConfirm">下一步</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 模板选择对话框 -->
    <el-dialog
        v-model="templateDialogVisible"
        title="选择领域模板"
        width="800px"
        class="premium-dialog"
    >
      <el-carousel
          v-if="domainTemplates.length > 0"
          indicator-position="outside"
          type="card"
          :autoplay="false"
          height="300px"
          ref="carouselRef"
          @change="handleCarouselChange"
      >
        <el-carousel-item v-for="(item, index) in domainTemplates" :key="index">
          <div class="carousel-item">
            <div class="template-icon">
              <el-icon :size="48"><Collection /></el-icon>
            </div>
            <h3 class="template-name">{{ item.domainData.name || '未命名模板' }}</h3>
            <p class="template-desc">{{ item.domainData.description || '无描述信息' }}</p>
          </div>
        </el-carousel-item>
      </el-carousel>
      <div v-else class="empty-templates">
        <el-empty description="暂无可用模板" />
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="templateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleTemplateSelect" :disabled="domainTemplates.length === 0">
            确定选择并创建
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, toRefs } from 'vue'
import { Plus, Search, Collection } from '@element-plus/icons-vue'
import { useDomainStore } from '@/store/domain'
import { useDomainTemplateStore } from '@/store/domainTemplate'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useRouter } from 'vue-router'
import { setDomainPlatform } from "@/api/domain"

const router = useRouter()
const domainStore = useDomainStore()
const domainTemplateStore = useDomainTemplateStore()

const state = reactive({
  createDialogVisible: false,
  templateDialogVisible: false,
  searchForm: {
    name: '',
    status: ''
  },
  createForm: {
    name: '',
    code: '',
  },
  createModel: '1',
  domainTemplates: [] as any[],
  activeTemplateIndex: 0
})

const { searchForm, createDialogVisible, createForm, createModel, templateDialogVisible, domainTemplates, activeTemplateIndex } = toRefs(state)

const createFormRef = ref<FormInstance>()
const carouselRef = ref()

const rules = {
  name: [
    { required: true, message: '请输入领域名称', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9]{1,40}$/, message: '支持中文、大小写字母、数字，不超过40个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入领域编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{2,20}$/, message: '领域编码只能包含字母和数字，长度在2-20个字符之间', trigger: 'blur' }
  ]
}

const filteredDomains = computed(() => {
  if (!domainStore.domains) return []
  
  return domainStore.domains.filter((domain: any) => {
    const nameMatch = !searchForm.value.name || domain.domainName.toLowerCase().includes(searchForm.value.name.toLowerCase())
    const statusMatch = !searchForm.value.status || domain.status === searchForm.value.status
    return nameMatch && statusMatch
  }).map((domain: any) => ({
    ...domain,
    updateTime: domain.updateTime?.split('.')[0].replace('T', ' '),
    createTime: domain.createTime?.split('.')[0].replace('T', ' ')
  }))
})

onMounted(async () => {
  await domainStore.fetchDomains()
})

const resetCreate = () => {
  createForm.value = { name: '', code: '' }
  createModel.value = '1'
  if (createFormRef.value) createFormRef.value.resetFields()
  createDialogVisible.value = false
}

const handleSearch = () => {}

const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.status = ''
}

const handleCreate = () => {
  resetCreate()
  createDialogVisible.value = true
}

const handleCreateConfirm = async () => {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      if (createModel.value === '1') {
        router.push({
          path: '/meta/domain/setting',
          query: {
            mode: 'create',
            domainName: createForm.value.name,
            domainCode: createForm.value.code,
          }
        })
        createDialogVisible.value = false
      } else {
        templateDialogVisible.value = true
        await loadDomainTemplates()
      }
    }
  })
}

const loadDomainTemplates = async () => {
  try {
    await domainTemplateStore.fetchDomainTemplates()
    domainTemplates.value = domainTemplateStore.domainTemplates.map((item: any) => ({
      ...JSON.parse(item.code)
    }))
  } catch (error) {
    ElMessage.error('加载模板失败')
  }
}

const handleCarouselChange = (index: number) => {
  activeTemplateIndex.value = index
}

const handleTemplateSelect = () => {
  if (domainTemplates.value.length === 0) return
  const selectedTemplate = domainTemplates.value[activeTemplateIndex.value]
  domainTemplateStore.setCurrentDomainTemplate(selectedTemplate)
  router.push({
    path: '/meta/domain/setting',
    query: {
      mode: 'template',
      domainName: createForm.value.name,
      domainCode: createForm.value.code,
    }
  })
  templateDialogVisible.value = false
  createDialogVisible.value = false
}

const navigateToDomainSetting = (domain: any) => {
  domainStore.setCurrentDomain(domain)
  router.push(`/meta/domain/setting?mode=edit&domainId=${domain.domainId}`)
}

const navigateToDomainPlatform = async (row: any) => {
  if (row.status !== '1') {
    ElMessage.warning('请先发布领域')
    return
  }
  if (!row.url) {
    ElMessage.warning('领域访问地址不能为空')
    return
  }
  const data = {
    name: row.domainCode,
    cnName: row.domainName,
    platformKind: "solo-dp",
    logo: "https://www.gitlink.org.cn/images/avatars/Organization/130318?t=1712062266"
  }
  const result = await setDomainPlatform(data)
  if (result) window.open(row.url)
}

const handleViewScenes = (row: any) => {
  domainStore.setCurrentDomain(row)
  window.open(`/#/domain/scene/list?domainId=${row.domainId}`)
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除领域 "${row.domainName}" 吗？`, '警告', {
    type: 'warning'
  }).then(async () => {
    await domainStore.deleteDomain(row.domainId)
    ElMessage.success('删除成功')
  }).catch(() => {})
}
</script>

<style scoped>
.page-container {
  width: 100%;
}

.search-card {
  border: none;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.premium-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: none;
}

:deep(.el-table__row) {
  transition: all 0.3s;
  height: 64px;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
  transform: translateY(-1px);
}

.domain-name-text {
  font-weight: 600;
  color: #303133;
}

.carousel-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
}

.template-icon {
  margin-bottom: 20px;
  color: #409eff;
}

.template-name {
  margin: 0 0 12px;
  font-size: 18px;
  color: #303133;
}

.template-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.empty-templates {
  padding: 40px 0;
}
</style>