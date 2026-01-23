<template>
  <div class="domain-component">
    <div class="table-action-bar">
      <el-button type="primary" @click="showBindComponentDialog">
        <el-icon><Plus /></el-icon>绑定领域组件
      </el-button>
    </div>

    <el-dialog 
      v-model="bindingDialogVisible"
      title="选择要绑定的领域组件"
      width="800px"
      class="premium-dialog"
    >
      <el-table
        :data="availableComponents"
        style="width: 100%"
        class="premium-table"
        max-height="500"
      >
        <el-table-column label="组件编码" width="180">
          <template #default="{ row }">
            <code class="code-text">{{ row.code || row.id }}</code>
          </template>
        </el-table-column>
        <el-table-column label="组件名称" min-width="150">
          <template #default="{ row }">
            {{ row.name || row.componentName || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="scope">
            <el-button type="primary" link @click="bindComponent(scope.row)">绑定</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <div v-if="displayComponents.length === 0" class="empty-state">
      <el-empty description="该领域尚未绑定任何领域组件" />
    </div>
    
    <el-table
      v-else
      v-loading="componentStore.loading"
      :data="displayComponents"
      style="width: 100%"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column label="组件编码" width="180">
        <template #default="{ row }">
          <code class="code-text">{{ row.displayCode }}</code>
        </template>
      </el-table-column>
      <el-table-column label="组件名称" min-width="150">
        <template #default="{ row }">
          <span class="component-name-text">{{ row.displayName }}</span>
        </template>
      </el-table-column>
      <el-table-column label="描述" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.displayDesc }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToComponentSetting(scope.row)">详情</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">取消绑定</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useComponentStore } from '@/store/component'
import request from '@/utils/request'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const componentStore = useComponentStore()

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
            await componentStore.fetchComponents(domainId.value)
        }
    } catch (error) {
        console.error('加载组件失败:', error)
    }
})

watch([() => route.query.domainId], async ([newDomainId]) => {
    try {
        const id = parseInt(newDomainId as string)
        if (!isFromTem.value && !isNaN(id)) {
            await componentStore.fetchComponents(id)
        }
    } catch (error) {
        console.error('加载组件失败:', error)
    }
})

// 数据展示适配
const displayComponents = computed(() => {
  if (!componentStore.components) return []
  
  return componentStore.components.map((c: any)=>{
    return {
      ...c,
      displayCode: c.code || c.id || '-',
      displayName: c.name || c.componentName || '未命名组件',
      displayDesc: c.description || '-',
      updateTimeDisplay: c.updateTime?.split('.')[0].replace('T', ' '),
      createTimeDisplay: c.createTime?.split('.')[0].replace('T', ' ')
    }
  })
})

const navigateToComponentSetting = (row?: any) => {
  if (row) {
    componentStore.setCurrentComponent(row)
    router.push(`/meta/node/setting?mode=edit&componentId=${row.id}`)
  }
}

const handleDelete = (row: any) => {
  if (domainId.value === null) return
  ElMessageBox.confirm(
    `确定要取消绑定组件 "${row.displayName}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await componentStore.unbindingComponent(row.id, domainId.value!)
      ElMessage.success('取消绑定成功')
    } catch (error) {
      ElMessage.error('取消绑定失败')
    }
  }).catch(() => {})
}

const bindingDialogVisible = ref(false)
const availableComponents = ref([])

const showBindComponentDialog = async () => {
  try {
    const res = await request({
      url: '/components',
      method: 'get'
    })
    
    if (res.data && res.status === 200) {
      availableComponents.value = res.data.filter((c: any) => {
        return !componentStore.components.some((bound: any) => bound.id === c.id)
      })
      bindingDialogVisible.value = true
    }
  } catch (error) {
    ElMessage.error('加载可用组件失败')
  }
}

const bindComponent = async (row: any) => {
  if (domainId.value === null) return
  try {
    await componentStore.bindingComponent(row.id, domainId.value!)
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

.component-name-text {
  font-weight: 500;
  color: #303133;
}

.empty-state {
  padding: 40px 0;
}
</style>