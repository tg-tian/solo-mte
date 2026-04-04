<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">模板管理</h2>
        <p class="page-sub-title">定义和管理系统中的各类模板</p>
      </div>
      <el-button type="primary" class="create-btn" @click="navigateToTemplateSetting()">
        <el-icon><Plus /></el-icon>创建模板
      </el-button>
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
      <el-table-column prop="template_id" label="模板ID" width="100" align="center"></el-table-column>
      <el-table-column prop="name" label="模板名称" min-width="150">
        <template #default="{ row }">
          <span class="model-name-text">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="120" align="center">
        <template #default="scope">
          <el-tag :type="getTypeTagType(scope.row.category)" size="small" effect="light" round>
            {{ scope.row.category || '未分类' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="tags" label="标签" min-width="150" align="center"></el-table-column>
      <el-table-column prop="domain" label="领域" min-width="150" align="center"></el-table-column>
      <el-table-column prop="describing_the_model" label="描述模型" width="120" align="center"></el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToTemplateSetting(scope.row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, toRefs } from 'vue'
import { useTemplateStore } from '../store/template'
import { Template } from '../types/models'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'

const router = useRouter()
const templateStore = useTemplateStore()

// 状态
const state = reactive({
  searchForm: {
    name: '',
    type: ''
  },
  selectedTemplate: null as Template | null
})

const { 
  searchForm, 
  selectedTemplate
} = toRefs(state)

// 过滤后的列表
const filteredTemplates = computed(() => {
  if (!templateStore.allTemplates) return []
  return templateStore.allTemplates.filter((template: Template) => {
    const nameMatch = !searchForm.value.name || 
                     template.name.toLowerCase().includes(searchForm.value.name.toLowerCase()) || 
                     String(template.template_id).includes(searchForm.value.name)
    const typeMatch = !searchForm.value.type || template.category === searchForm.value.type
    return nameMatch && typeMatch
  })
})

// 初始化
onMounted(() => {
  templateStore.fetchAllTemplates()
})

// 搜索
const handleSearch = () => {
  // 过滤逻辑已在 computed 中实现
}

// 重置搜索
const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.type = ''
}

// 获取类型标签颜色
const getTypeTagType = (type: string) => {
  const map: Record<string, string> = {
    'ui': 'primary',
    'logic': 'success',
    'data': 'warning'
  }
  return map[type] || 'info'
}

// 获取类型显示文本
const getTypeText = (type: string) => {
  const map: Record<string, string> = {
    'ui': 'UI模板',
    'logic': '逻辑模板',
    'data': '数据模板'
  }
  return map[type] || type
}

// 导航到编辑/创建页面
const navigateToTemplateSetting = (template?: Template) => {
  if (template && template.id) {
    router.push({
      path: '/template-setting',
      query: { id: template.id.toString() }
    })
  } else {
    router.push({ path: '/template-setting' })
  }
}

// 删除模板
const handleDelete = (template: Template) => {
  ElMessageBox.confirm(
    `确认删除模板 ${template.name} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      if(template.id) {
        await templateStore.deleteTemplate(template.id)
        ElMessage.success('删除成功')
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  }).catch(() => {
    // 取消删除
  })
}
</script>

<style scoped>
.page-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 48px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-main-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-sub-title {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.create-btn {
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

.search-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.search-form .el-form-item {
  margin-bottom: 0;
  margin-right: 0;
}

.premium-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.model-name-text {
  font-weight: 500;
  color: #303133;
}

:deep(.el-table__row) {
  transition: background-color 0.3s ease;
}

:deep(.el-table__row:hover > td.el-table__cell) {
  background-color: #f0f7ff !important;
}

:deep(.el-button--link) {
  font-weight: 500;
}
</style>
