<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">节点类型管理</h2>
        <p class="page-sub-title">定义和管理流程引擎使用的节点</p>
      </div>
      <el-button type="primary" class="create-btn" @click="navigateToComponentSetting()">
        <el-icon><Plus /></el-icon>创建节点
      </el-button>
    </div>
    
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="节点名称">
          <el-input v-model="searchForm.name" placeholder="名称或编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="节点类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 150px">
            <el-option label="开始节点" value="start"></el-option>
            <el-option label="结束节点" value="end"></el-option>
            <el-option label="处理节点" value="process"></el-option>
            <el-option label="条件节点" value="condition"></el-option>
            <el-option label="设备节点" value="device"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="用途">
          <el-select v-model="searchForm.purpose" placeholder="全部" clearable style="width: 150px">
            <el-option label="业务流" value="businessFlow"></el-option>
            <el-option label="界面流" value="interfaceFlow"></el-option>
            <el-option label="设备逻辑" value="deviceLogic"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-table
      v-loading="componentStore.loading"
      :data="filteredComponents"
      style="width: 100%; margin-top: 24px"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column prop="code" label="节点编码" width="150" align="center"></el-table-column>
      <el-table-column prop="name" label="节点名称" min-width="150">
        <template #default="{ row }">
          <span class="model-name-text">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="150" align="center"></el-table-column>
      <el-table-column prop="type" label="类型" width="120" align="center">
        <template #default="scope">
          <el-tag :type="getTypeTagType(scope.row.type)" size="small" effect="light" round>
            {{ getTypeText(scope.row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="purpose" label="用途" width="120" align="center">
        <template #default="scope">
          <el-tag :type="getPurposeTagType(scope.row.purpose)" size="small" effect="light">
            {{ getPurposeText(scope.row.purpose) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" min-width="180" align="center"></el-table-column>
      <el-table-column prop="updateTime" label="更新时间" min-width="180" align="center"></el-table-column>
      <el-table-column label="约束" width="120" align="center">
        <template #default="scope">
          <el-button 
            type="primary" 
            link
            @click="showConstraints(scope.row)"
          >查看约束</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToComponentSetting(scope.row)">编辑</el-button>
          <el-button link type="success" @click="viewJson(scope.row)">查看JSON</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 约束信息对话框 -->
    <el-dialog v-model="constraintDialogVisible" :title="selectedComponent ? `${selectedComponent.name} 的约束` : '约束信息'" width="500px">
      <div v-if="selectedComponent">
        <template v-if="selectedComponent.type === 'node'">
          <h4>入口约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.inputConstraint?.quantity === -1 ? '无限制' : selectedComponent.inputConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.inputConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
          
          <h4 style="margin-top: 20px">出口约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.outputConstraint?.quantity === -1 ? '无限制' : selectedComponent.outputConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.outputConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
        </template>
        
        <template v-else>
          <h4>起点约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.startConstraint?.quantity === -1 ? '无限制' : selectedComponent.startConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.startConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
          
          <h4 style="margin-top: 20px">终点约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.endConstraint?.quantity === -1 ? '无限制' : selectedComponent.endConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.endConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-dialog>

    <!-- JSON查看对话框 -->
    <el-dialog v-model="jsonDialogVisible" title="节点JSON" width="60%">
      <pre class="json-viewer">{{ formattedComponentJson }}</pre>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="copyJson">复制</el-button>
          <el-button @click="jsonDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, toRefs } from 'vue'
import { useComponentStore } from '../store/component'
import { Component, ComponentType, PurposeType } from '../types/models'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { Filter, Search, Refresh } from '@element-plus/icons-vue'

const router = useRouter()
const componentStore = useComponentStore()

// 状态
const state = reactive({
  searchForm: {
    name: '',
    type: '',
    purpose: ''
  },
  constraintDialogVisible: false,
  jsonDialogVisible: false,
  selectedComponent: null as Component | null,
  jsonComponent: null as Component | null
})

const { 
  searchForm, 
  constraintDialogVisible, 
  jsonDialogVisible, 
  selectedComponent, 
  jsonComponent
} = toRefs(state)

// 格式化JSON
const formattedComponentJson = computed(() => {
  if(!jsonComponent.value) return ''
  let formatJson = jsonComponent.value
  if(formatJson.type === ComponentType.Node){
    formatJson = {
      ...formatJson,
      startConstraint: {} as any,
      endConstraint: {} as any
    }
  }else{
    formatJson = {
      ...formatJson,
      inputConstraint: {} as any,
      outputConstraint: {} as any
    }
  }
  return JSON.stringify(formatJson, null, 2)
})

// 过滤后的节点列表
const filteredComponents = computed(() => {
  if (!componentStore.allComponents) return []
  return componentStore.allComponents.filter((component: Component) => {
    const nameMatch = !searchForm.value.name || 
                     component.name.toLowerCase().includes(searchForm.value.name.toLowerCase()) || 
                     component.code.toLowerCase().includes(searchForm.value.name.toLowerCase())
    const typeMatch = !searchForm.value.type || component.type === searchForm.value.type
    const purposeMatch = !searchForm.value.purpose || component.purpose === searchForm.value.purpose
    return nameMatch && typeMatch && purposeMatch
  })
})

// 初始化
onMounted(async () => {
  await componentStore.fetchAllComponents()
})

// 搜索处理
const handleSearch = () => {
  // 过滤是在计算属性中完成的
}

// 重置搜索
const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.type = ''
  searchForm.value.purpose = ''
}

// 导航到节点设置页面
const navigateToComponentSetting = (component?: Component) => {
  if (component) {
    router.push({
      path: '/setting',
      query: {
        mode: 'edit',
        id: component.id
      }
    })
  } else {
    router.push({
      path: '/setting',
      query: {
        mode: 'create'
      }
    })
  }
}

// 显示约束信息
const showConstraints = (component: Component) => {
  selectedComponent.value = component
  constraintDialogVisible.value = true
}

// 查看节点JSON
const viewJson = (component: Component) => {
  jsonComponent.value = component
  jsonDialogVisible.value = true
}

// 复制JSON
const copyJson = () => {
  navigator.clipboard.writeText(formattedComponentJson.value)
    .then(() => {
      ElMessage.success('JSON已复制到剪贴板')
    })
    .catch(err => {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    })
}

// 删除节点
const handleDelete = (row: Component) => {
  ElMessageBox.confirm(
    `确定要删除节点 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(async () => {
    try {
      if (row.id) {
        await componentStore.deleteComponent(row.id)
        ElMessage.success('删除成功')
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
  .catch(() => {
    // 用户取消操作
  })
}

// 获取用途对应的标签类型
const getPurposeTagType = (purpose: string) => {
  switch(purpose) {
    case PurposeType.BusinessFlow: return 'primary'
    case PurposeType.InterfaceFlow: return 'warning'
    case PurposeType.DeviceLogic: return 'success'
    default: return 'info'
  }
}

// 获取用途文本
const getPurposeText = (purpose: string) => {
  switch(purpose) {
    case PurposeType.BusinessFlow: return '业务流'
    case PurposeType.InterfaceFlow: return '界面流'
    case PurposeType.DeviceLogic: return '设备逻辑'
    default: return purpose
  }
}

// 获取节点类型对应的标签类型
const getTypeTagType = (type: string) => {
  switch(type) {
    case 'start': return 'success'
    case 'end': return 'danger'
    case 'process': return 'primary'
    case 'condition': return 'warning'
    case 'device': return 'info'
    default: return 'info'
  }
}

// 获取节点类型文本
const getTypeText = (type: string) => {
  switch(type) {
    case 'start': return '开始节点'
    case 'end': return '结束节点'
    case 'process': return '处理节点'
    case 'condition': return '条件节点'
    case 'device': return '设备节点'
    default: return type
  }
}
</script>

<style scoped>
.page-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-main-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.page-sub-title {
  font-size: 14px;
  color: #909399;
  margin: 8px 0 0 0;
}

.create-btn {
  padding: 12px 24px;
  font-size: 16px;
}

.search-card {
  margin-bottom: 24px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.search-form {
  display: flex;
  align-items: center;
}

.premium-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.model-name-text {
  font-weight: 500;
  color: #303133;
}

.json-viewer {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
}
</style>
