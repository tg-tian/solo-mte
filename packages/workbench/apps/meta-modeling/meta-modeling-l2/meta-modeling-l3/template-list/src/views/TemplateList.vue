<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">模板管理</h2>
        <p class="page-sub-title">定义和管理系统中的各类模板</p>
      </div>
      <div style="display: flex; gap: 12px">
        <el-button type="success" class="create-btn" @click="openImportDialog">
          <el-icon><Download /></el-icon>从模板库添加
        </el-button>
        <el-button type="primary" class="create-btn" @click="navigateToTemplateSetting()">
          <el-icon><Plus /></el-icon>创建模板
        </el-button>
      </div>
    </div>

    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="模板名称">
          <el-input v-model="searchForm.name" placeholder="名称或编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="模板类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 150px">
            <el-option label="UI模板" value="ui"></el-option>
            <el-option label="逻辑模板" value="logic"></el-option>
            <el-option label="数据模板" value="data"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table
      v-loading="templateStore.loading"
      :data="filteredTemplates"
      style="width: 100%; margin-top: 24px"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column prop="template_id" label="模板ID" width="100" fixed align="center"></el-table-column>
      <el-table-column prop="name" label="模板名称" width="150" fixed>
        <template #default="{ row }">
          <span class="model-name-text">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="template_index" label="索引标识" width="180" show-overflow-tooltip></el-table-column>
      <el-table-column prop="template_description" label="描述" width="220" show-overflow-tooltip></el-table-column>
      <el-table-column label="领域" width="100">
        <template #default="{ row }">
          <span>{{ tagVal(row.tags, 'domain') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="Schema" width="120">
        <template #default="{ row }">
          <span>{{ tagVal(row.tags, 'schema') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="模板类型" width="110">
        <template #default="{ row }">
          <span>{{ tagVal(row.tags, 'template_type') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="语言/框架" width="130">
        <template #default="{ row }">
          <span>{{ tagVal(row.tags, 'language_framework') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="文件后缀" width="100">
        <template #default="{ row }">
          <span>{{ tagVal(row.tags, 'file_extension') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="功能标签" width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <span>{{ tagVal(row.tags, 'function') }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="submitter" label="提交者" width="100"></el-table-column>
      <el-table-column prop="license" label="许可证" width="140" show-overflow-tooltip></el-table-column>
      <el-table-column prop="example_image_url" label="示例图片" width="200" show-overflow-tooltip></el-table-column>
      <el-table-column prop="code_url" label="代码地址" width="200" show-overflow-tooltip></el-table-column>
      <el-table-column prop="repository_url" label="仓库地址" width="200" show-overflow-tooltip></el-table-column>
      <el-table-column prop="file_source" label="文件来源" width="120" show-overflow-tooltip></el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="160">
        <template #default="{ row }">
          <span class="time-text">{{ fmtTime(row.created_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="updated_at" label="更新时间" width="160">
        <template #default="{ row }">
          <span class="time-text">{{ fmtTime(row.updated_at) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToTemplateSetting(scope.row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 从外部模板库添加的弹窗 -->
    <el-dialog v-model="importDialogVisible" title="从模板库搜索并添加" width="900px" @open="onImportDialogOpen">
      <el-input
        v-model="importKeyword"
        placeholder="输入关键词搜索模板..."
        clearable
        @keyup.enter="handleImportSearch"
        style="margin-bottom: 12px"
      >
        <template #append>
          <el-button @click="handleImportSearch">搜索</el-button>
        </template>
      </el-input>

      <el-table
        v-loading="templateStore.loading"
        :data="templateStore.externalTemplates"
        max-height="320"
        style="width: 100%"
        highlight-current-row
        @current-change="handleCurrentChange"
      >
        <el-table-column prop="template_id" label="模板ID" width="90" />
        <el-table-column prop="name" label="模板名称" width="160" />
        <el-table-column label="领域" width="90">
          <template #default="{ row }"><span>{{ tagVal(row.tags, 'domain') }}</span></template>
        </el-table-column>
        <el-table-column label="Schema" width="110">
          <template #default="{ row }"><span>{{ tagVal(row.tags, 'schema') }}</span></template>
        </el-table-column>
        <el-table-column label="模板类型" width="100">
          <template #default="{ row }"><span>{{ tagVal(row.tags, 'template_type') }}</span></template>
        </el-table-column>
        <el-table-column prop="submitter" label="提交者" width="90"></el-table-column>
        <el-table-column prop="template_description" label="描述" min-width="200" show-overflow-tooltip />
      </el-table>

      <el-pagination
        v-if="templateStore.externalTotalPages > 1"
        v-model:current-page="importPage"
        :page-size="importPerPage"
        :total="templateStore.externalTotalPages * importPerPage"
        layout="prev, pager, next"
        small
        style="margin-top: 12px; justify-content: center"
        @current-change="handleImportPageChange"
      />

      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :disabled="!selectedExternalTemplate">
          确认添加
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, toRefs, ref } from 'vue'
import { useTemplateStore } from '../store/template'
import { Template } from '../types/models'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Plus, Download } from '@element-plus/icons-vue'

const router = useRouter()
const templateStore = useTemplateStore()

const state = reactive({
  searchForm: {
    name: '',
    type: ''
  },
  selectedTemplate: null as Template | null
})

const { searchForm, selectedTemplate } = toRefs(state)

// 外部模板库相关
const importDialogVisible = ref(false)
const importKeyword = ref('')
const importPage = ref(1)
const importPerPage = 10
const selectedExternalTemplate = ref<Template | null>(null)

/** 从 tags 对象中提取单个标签值 */
function tagVal(tags: Record<string, string[]> | string | undefined, key: string): string {
  if (!tags) return ''
  let obj: Record<string, string[]> = {}
  if (typeof tags === 'string') {
    try { obj = JSON.parse(tags) } catch { return '' }
  } else {
    obj = tags
  }
  return obj[key]?.join(', ') || ''
}

function fmtTime(val: string | undefined): string {
  if (!val) return ''
  try { return new Date(val).toLocaleDateString('zh-CN') } catch { return val }
}

const filteredTemplates = computed(() => {
  if (!templateStore.allTemplates) return []
  return templateStore.allTemplates.filter((template: Template) => {
    const nameMatch = !searchForm.value.name ||
                     template.name.toLowerCase().includes(searchForm.value.name.toLowerCase()) ||
                     String(template.template_id).includes(searchForm.value.name)
    const typeMatch = !searchForm.value.type || tagVal(template.tags, 'template_type') === searchForm.value.type
    return nameMatch && typeMatch
  })
})

onMounted(() => {
  templateStore.fetchAllTemplates()
})

function handleSearch() {}
function resetSearch() {
  searchForm.value.name = ''
  searchForm.value.type = ''
}

function navigateToTemplateSetting(template?: Template) {
  if (template && template.template_id) {
    router.push({ path: '/template-setting', query: { templateId: template.template_id.toString() } })
  } else {
    router.push({ path: '/template-setting' })
  }
}

async function handleDelete(template: Template) {
  ElMessageBox.confirm(`确认删除模板 ${template.name} 吗？`, '警告', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    try {
      const deleteId = template.template_id
      if (deleteId) {
        await templateStore.deleteTemplate(deleteId)
        ElMessage.success('删除成功')
      } else {
        ElMessage.error('无法删除：模板缺少ID')
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {})
}

// ── 从外部模板库添加 ──

function openImportDialog() {
  importDialogVisible.value = true
}

async function onImportDialogOpen() {
  importKeyword.value = ''
  importPage.value = 1
  selectedExternalTemplate.value = null
  await handleImportSearch()
}

async function handleImportSearch() {
  importPage.value = 1
  await templateStore.searchExternal(importKeyword.value, 1, importPerPage)
}

async function handleImportPageChange(page: number) {
  importPage.value = page
  await templateStore.searchExternal(importKeyword.value, page, importPerPage)
}

function handleCurrentChange(row: Template | null) {
  selectedExternalTemplate.value = row
}

async function handleImport() {
  if (!selectedExternalTemplate.value?.template_id) return
  const tid = selectedExternalTemplate.value.template_id
  // 检查是否已存在相同 template_id 的模板
  const exists = templateStore.allTemplates.some((t: Template) => t.template_id === tid)
  if (exists) {
    ElMessage.warning(`模板ID ${tid} 已存在，不可重复添加`)
    return
  }
  try {
    await templateStore.importExternal(tid)
    ElMessage.success('模板已从外部库导入到本地')
    importDialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '导入失败')
  }
}
</script>

<style scoped>
.page-container { padding: 24px; background-color: #f5f7fa; min-height: calc(100vh - 48px) }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px }
.page-title-group { display: flex; flex-direction: column; gap: 8px }
.page-main-title { margin: 0; font-size: 24px; font-weight: 600; color: #303133 }
.page-sub-title { margin: 0; font-size: 14px; color: #909399 }
.create-btn { padding: 12px 24px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3); transition: all 0.3s ease }
.create-btn:hover { transform: translateY(-2px) }
.search-card { border-radius: 12px; border: none; box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05) }
.search-form { display: flex; flex-wrap: wrap; gap: 16px }
.search-form .el-form-item { margin-bottom: 0; margin-right: 0 }
.premium-table { border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) }
.model-name-text { font-weight: 500; color: #303133 }
:deep(.el-table__row) { transition: background-color 0.3s ease }
:deep(.el-table__row:hover > td.el-table__cell) { background-color: #f0f7ff !important }
:deep(.el-button--link) { font-weight: 500 }
</style>