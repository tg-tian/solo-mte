<template>
  <div class="component-list-container">
    <div class="component-header">
      <h2>组件类型</h2>
      <el-button type="primary" @click="navigateToComponentSetting()">创建组件</el-button>
    </div>
    
    <el-card class="component-search">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="组件名称">
          <el-input v-model="searchForm.name" placeholder="请输入组件名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="组件类型">
          <el-select v-model="searchForm.type" placeholder="请选择组件类型" clearable>
            <el-option label="节点" value="node"></el-option>
            <el-option label="边" value="edge"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="用途">
          <el-select v-model="searchForm.purpose" placeholder="请选择用途" clearable>
            <el-option label="业务流" value="businessFlow"></el-option>
            <el-option label="界面流" value="interfaceFlow"></el-option>
            <el-option label="设备逻辑" value="deviceLogic"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-table
      v-loading="componentStore.loading"
      :data="filteredComponents"
      style="width: 100%; margin-top: 20px"
      border
    >
      <el-table-column prop="code" label="组件编码" width="150"></el-table-column>
      <el-table-column prop="name" label="组件名称" min-width="50"></el-table-column>
      <el-table-column prop="description" label="描述" min-width="100"></el-table-column>
      <el-table-column prop="type" label="类型" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.type === 'node' ? 'primary' : 'success'">
            {{ scope.row.type === 'node' ? '节点' : '边' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="purpose" label="用途" width="120">
        <template #default="scope">
          <el-tag :type="getPurposeTagType(scope.row.purpose)">
            {{ getPurposeText(scope.row.purpose) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="150"></el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="150"></el-table-column>
      <el-table-column label="约束" width="150">
        <template #default="scope">
          <el-button 
            type="primary" 
            size="small" 
            @click="showConstraints(scope.row)"
            plain
          >查看约束</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button type="primary" size="small" @click="navigateToComponentSetting(scope.row)">编辑</el-button>
          <el-button type="success" size="small" @click="viewJson(scope.row)">查看JSON</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
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
    <el-dialog v-model="jsonDialogVisible" title="组件JSON" width="60%">
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
import { reactive, computed, onMounted, ref, toRefs } from 'vue'
import { useComponentStore } from '@/store/component'
import { Component, ComponentType, PurposeType } from '@/types/models'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

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

const { searchForm, constraintDialogVisible, jsonDialogVisible, selectedComponent, jsonComponent } = toRefs(state)

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

// 过滤后的组件列表
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

// 导航到组件设置页面
const navigateToComponentSetting = (component?: Component) => {
  if (component) {
    // 编辑组件
    componentStore.setCurrentComponent(component)
    router.push(`/meta/component/setting?mode=edit&componentId=${component.id}`)
  } else {
    // 创建组件
    router.push('/meta/component/setting?mode=create')
  }
}

// 显示约束信息
const showConstraints = (component: Component) => {
  selectedComponent.value = component
  constraintDialogVisible.value = true
}

// 查看组件JSON
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

// 删除组件
const handleDelete = (row: Component) => {
  ElMessageBox.confirm(
    `确定要删除组件 "${row.name}" 吗？`,
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
</script>

<style scoped>
.component-list-container {
  padding: 20px;
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.component-search {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.json-viewer {
  background-color: #f5f7fa;
  color: #606266;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow: auto;
  max-height: 60vh;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
