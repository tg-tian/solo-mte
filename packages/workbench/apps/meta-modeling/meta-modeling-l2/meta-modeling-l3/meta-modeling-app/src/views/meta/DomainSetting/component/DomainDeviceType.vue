<template>
  <div class="domain-device-type">
    <div class="table-action-bar">
      <el-button type="primary" @click="showBindDeviceTypeDialog">
        <el-icon><Plus /></el-icon>绑定设备类型
      </el-button>
    </div>

    <!-- 绑定对话框 -->
    <el-dialog 
      v-model="bindingDialogVisible"
      title="选择要绑定的设备模型"
      width="800px"
      class="premium-dialog"
    >
      <el-table
        :data="availableDeviceTypes"
        style="width: 100%"
        class="premium-table"
        max-height="500"
      >
        <el-table-column label="模型编码" width="150" prop="id">
          <template #default="{ row }">
            <code class="code-text">{{ row.id || row.code }}</code>
          </template>
        </el-table-column>
        <el-table-column label="模型名称" min-width="150" prop="modelName">
          <template #default="{ row }">
            {{ row.modelName || row.name }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
             {{ row.description || row.category || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="bindDeviceType(scope.row)">绑定</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 主表格 -->
    <div v-if="displayDeviceTypes.length === 0" class="empty-state">
      <el-empty description="该领域尚未绑定任何设备模型" />
    </div>
    
    <el-table
      v-else
      v-loading="deviceTypeStore.loading"
      :data="displayDeviceTypes"
      style="width: 100%"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column label="模型编码" width="180">
        <template #default="{ row }">
          <code class="code-text">{{ row.displayCode }}</code>
        </template>
      </el-table-column>
      <el-table-column label="模型名称" min-width="180">
        <template #default="{ row }">
          <span class="model-name-text">{{ row.displayName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="描述" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.displayDesc }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToDeviceTypeSetting(scope.row)">详情</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">取消绑定</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useDeviceTypeStore } from '@/store/deviceType'
import request from '@/utils/request'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const deviceTypeStore = useDeviceTypeStore()

const domainId = computed(() => {
  const id = parseInt(route.query.domainId as string)
  return isNaN(id) ? null : id
})

const isFromTem = computed(() => {
  return route.query.mode === 'template'
})

// 初始化
onMounted(async () => {
    try {
        if (!isFromTem.value && domainId.value !== null) {
            await deviceTypeStore.fetchDeviceTypes(domainId.value)
        }
    } catch (error) {
        console.error('加载设备类型失败:', error)
    }
})

watch([() => route.query.domainId], async ([newDomainId]) => {
    try {
        const id = parseInt(newDomainId as string)
        if (!isFromTem.value && !isNaN(id)) {
            await deviceTypeStore.fetchDeviceTypes(id)
        }
    } catch (error) {
        console.error('加载设备类型失败:', error)
    }
})

// 统一数据展示适配
const displayDeviceTypes = computed(() => {
  if (!deviceTypeStore.deviceTypes) return []
  
  return deviceTypeStore.deviceTypes.map((dt: any)=>{
    return {
      ...dt,
      displayCode: dt.id || dt.code || '-',
      displayName: dt.modelName || dt.name || '未命名模型',
      displayDesc: dt.description || dt.category || '-',
      updateTimeDisplay: dt.updateTime?.split('.')[0].replace('T', ' '),
      createTimeDisplay: dt.createTime?.split('.')[0].replace('T', ' ')
    }
  })
})

const navigateToDeviceTypeSetting = (row: any) => {
  if (row) {
    deviceTypeStore.setCurrentDeviceType(row)
    router.push(`/meta/devicetype/setting?deviceTypeId=${row.id}&mode=edit`)
  }
}

const handleDelete = (row: any) => {
  if (domainId.value === null) return
  ElMessageBox.confirm(
    `确定要取消绑定设备类型 "${row.displayName}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deviceTypeStore.unbindingDeviceType(row.id, domainId.value!)
      ElMessage.success('取消绑定成功')
    } catch (error) {
      ElMessage.error('取消绑定失败')
    }
  }).catch(() => {})
}

const bindingDialogVisible = ref(false)
const availableDeviceTypes = ref([])

const showBindDeviceTypeDialog = async () => {
  try {
    const res = await request({
      url: '/api/v1/device-types',
      method: 'get'
    })
    
    if (res.data && res.status === 200) {
      // 过滤已绑定的
      availableDeviceTypes.value = res.data.filter((dt: any) => {
        return !deviceTypeStore.deviceTypes.some((bound: any) => bound.id === dt.id)
      })
      bindingDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('加载可用设备类型失败')
  }
}

const bindDeviceType = async (row: any) => {
  if (domainId.value === null) return
  try {
    await deviceTypeStore.bindingDeviceType(row.id, domainId.value!)
    ElMessage.success('绑定成功')
    bindingDialogVisible.value = false
  } catch (error) {
    ElMessage.error('绑定失败')
  }
}
</script>

<style scoped>
.table-action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.premium-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.code-text {
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  color: #409eff;
  font-family: inherit;
}

.model-name-text {
  font-weight: 500;
  color: #303133;
}

.empty-state {
  padding: 40px 0;
}
</style>