<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">设备元模型管理</h2>
        <p class="page-sub-title">定义和管理平台支持的物联网设备元模型</p>
      </div>
      <el-button type="primary" class="create-btn" @click="openDeviceModelSetting()">
        <el-icon><Plus /></el-icon>创建设备元模型
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="模型名称">
          <el-input 
            v-model="searchForm.modelName" 
            placeholder="请输入模型名称" 
            clearable
            @keyup.enter="handleSearch"
            style="width: 240px"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-table
      v-loading="deviceModelStore.loading"
      :data="formattedDeviceModels"
      style="width: 100%; margin-top: 24px"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column prop="modelId" label="模型ID" width="150" align="center">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ row.model?.modelId || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="modelName" label="模型名称" min-width="150">
        <template #default="{ row }">
          <span class="model-name-text">{{ row.modelName }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="品类" width="120" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.category" size="small" effect="light" round>
            {{ row.category }}
          </el-tag>
          <span v-else style="color: #c0c4cc">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" min-width="180" align="center" />
      <el-table-column prop="updateTime" label="更新时间" min-width="180" align="center" />
      <el-table-column label="操作" width="250" fixed="right" align="center">
        <template #default="scope">
          <el-button link type="primary" @click="openDeviceModelSetting(scope.row)">编辑</el-button>
          <el-button link type="success" @click="viewJson(scope.row)">查看JSON</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="searchForm.current"
        v-model:page-size="searchForm.size"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="deviceModelStore.deviceModelPage.total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- JSON查看对话框 -->
    <el-dialog v-model="jsonDialogVisible" title="设备模型JSON" width="60%">
      <pre class="json-viewer">{{ formattedDeviceModelJson }}</pre>
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
import { reactive, computed, onMounted, ref } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { useDeviceModelStore } from '../store/deviceModel'
import { getDeviceModelById } from '../api/deviceModel'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DeviceModel } from '../types/models'
import { useRouter } from 'vue-router'

const router = useRouter()
const deviceModelStore = useDeviceModelStore()

// JSON对话框相关状态
const jsonDialogVisible = ref(false)
const jsonDeviceModel = ref<DeviceModel | null>(null)

// 格式化JSON - 只显示model部分，和编辑页面保持一致
const formattedDeviceModelJson = computed(() => {
  if (!jsonDeviceModel.value) return ''
  // 只显示model部分，和编辑页面的formattedModelJson保持一致
  return JSON.stringify(jsonDeviceModel.value.model || {}, null, 2)
})

const searchForm = reactive({
  current: 1,
  size: 10,
  modelName: ''
})

const formattedDeviceModels = computed(() => {
  return deviceModelStore.deviceModelPage.records.map((deviceModel: any) => {
    return {
      ...deviceModel,
      updateTime: deviceModel.updateTime?.split('.')[0].replace('T', ' '),
      createTime: deviceModel.createTime?.split('.')[0].replace('T', ' ')
    }
  })
})

onMounted(() => {
  handleSearch()
})

const handleSearch = () => {
  // 设备类型页面只显示 type=device 的数据
  deviceModelStore.fetchDeviceModelPage({ ...searchForm, type: 'device' })
}

const resetSearch = () => {
  searchForm.modelName = ''
  searchForm.current = 1
  handleSearch()
}

const handleSizeChange = (val: number) => {
  searchForm.size = val
  searchForm.current = 1
  handleSearch()
}

const handleCurrentChange = (val: number) => {
  searchForm.current = val
  handleSearch()
}

const openDeviceModelSetting = (deviceModel?: DeviceModel) => {
  if (deviceModel) {
    deviceModelStore.setCurrentDeviceModel(deviceModel)
    // 使用路由跳转到设置页面，传入ID
    router.push({
      path: '/setting',
      query: {
        mode: 'edit',
        id: deviceModel.id,
        category: 'device'
      }
    })
  } else {
    // 使用路由跳转到设置页面，创建模式
    router.push({
      path: '/setting',
      query: {
        mode: 'create',
        category: 'device'
      }
    })
  }
}

const viewJson = async (row: DeviceModel) => {
  try {
    const res = await getDeviceModelById(row.id!)
    if (res && res.data) {
      jsonDeviceModel.value = res.data
      jsonDialogVisible.value = true
    } else {
      // 容错处理：如果没取到完整数据，就用列表数据展示
      jsonDeviceModel.value = row
      jsonDialogVisible.value = true
    }
  } catch (error) {
    // 接口异常容错：用列表数据展示
    jsonDeviceModel.value = row
    jsonDialogVisible.value = true
  }
}

const copyJson = () => {
  if (formattedDeviceModelJson.value) {
    navigator.clipboard.writeText(formattedDeviceModelJson.value).then(() => {
      ElMessage.success('复制成功')
    })
  }
}

const handleDelete = (row: DeviceModel) => {
  ElMessageBox.confirm(
    `确定要删除设备模型 "${row.modelName}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    const success = await deviceModelStore.deleteDeviceModel(row.id!)
    if (success) {
      ElMessage.success('删除成功')
      handleSearch()
    }
  })
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

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-bottom: 24px;
}

.json-viewer {
  background-color: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #333;
  max-height: 500px;
  overflow: auto;
  border: 1px solid #e4e7ed;
}

:deep(.el-table__header) {
  font-weight: 600;
}

:deep(.el-button--link) {
  padding: 4px 8px;
  font-size: 14px;
}
</style>
