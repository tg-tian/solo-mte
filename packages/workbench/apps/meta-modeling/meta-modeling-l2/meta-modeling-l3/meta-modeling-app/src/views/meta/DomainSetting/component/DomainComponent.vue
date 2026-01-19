<template>
    <!-- 添加组件绑定功能 -->
    <el-button type="primary" style="float: right;margin-bottom: 10px" @click="showBindComponentDialog">绑定组件</el-button>
    <el-dialog v-model="bindingDialogVisible"
    title="绑定组件"
    width="50%"
    >
      <el-table
        :data="availableComponents"
        style="width: 100%; margin-top: 20px"
        border
      >
      <el-table-column prop="code" label="组件编码" width="150"></el-table-column>
        <el-table-column prop="name" label="组件名称" min-width="150"></el-table-column>
        <el-table-column prop="description" label="组件描述" min-width="200"></el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button type="primary" size="small" @click="bindComponent(scope.row)">绑定</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-empty description="暂无组件" v-if="filteredComponents.length===0"/>
    <el-table
      v-loading="componentStore.loading"
      :data="filteredComponents"
      style="width: 100%; margin-top: 20px"
      border
      v-else
    >
      <el-table-column prop="code" label="组件编码" width="150"></el-table-column>
      <el-table-column prop="name" label="组件名称" min-width="150"></el-table-column>
      <el-table-column prop="description" label="组件描述" min-width="200"></el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <el-button type="primary" size="small" @click="navigateToComponentSetting(scope.row)">查看</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
</template>

<script setup lang="ts">
import { useComponentStore } from '@/store/component'
import request from '@/utils/request'
const route = useRoute()
const router = useRouter()
const componentStore = useComponentStore()

const domainId = computed(() => {
  return parseInt(route.query.domainId as string)
})

const isFromTem = computed(() => {
  return route.query.mode === 'template'
})

// 初始化
onMounted(async () => {
    componentStore.setComponents([])
    try {
        const domain = parseInt(route.query.domainId as string)
        // Only fetch device types if not in template mode
        if (!isFromTem.value) {
            await componentStore.fetchComponents(domain)
        }
    } catch (error) {
        console.error('加载组件失败:', error)
    }
})

watch([() => route.query.domainId], async ([newDomainId]) => {
    componentStore.setComponents([])
    try {
        // Only fetch device types if not in template mode
        if (!isFromTem.value) {
            await componentStore.fetchComponents(parseInt(newDomainId as string))
        }
    } catch (error) {
        console.error('加载设备类型失败:', error)
    }
})

// 过滤后的领域组件列表
const filteredComponents = computed(() => {
  if (!componentStore.components) return []
  
  let components = componentStore.components.map((component: any)=>{
    return {
      ...component,
      updateTime: component.updateTime?.split('.')[0].replace('T', ' '),
      createTime: component.createTime?.split('.')[0].replace('T', ' ')
    }
  })

  return components
})

// 导航到组件设置页面
const navigateToComponentSetting = (component?: any) => {
  if (component) {
    componentStore.setCurrentComponent(component)
    router.push(`/meta/component/setting?mode=edit&componentId=${component.id}`)
  }
}

// 删除领域绑定信息
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要取消绑定组件 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(async () => {
    try {
      await componentStore.unbindingComponent(row.id, domainId.value)
      ElMessage.success('取消绑定成功')
    } catch (error) {
      ElMessage.error('取消绑定失败')
    }
  })
  .catch(() => {
    // 用户取消操作
  })
}

// 添加绑定设备类型对话框
const bindingDialogVisible = ref(false)
const availableComponents = ref([])
const selectedComponentId = ref(null)

// 显示绑定设备类型对话框
const showBindComponentDialog = async () => {
  try {
    // 获取可用的设备类型列表（未绑定到当前领域的）
    const res = await request({
      url: '/components',
      method: 'get'
    })
    
    if (res.data && res.status === 200) {
      // 过滤掉已经绑定的设备类型
      availableComponents.value = res.data.filter((dt: any) => {
        return !filteredComponents.value.some((bound: any) => bound.id === dt.id)
      })
      bindingDialogVisible.value = true
    }
  } catch (error) {
    console.error('加载可用组件失败:', error)
    ElMessage.error('加载可用组件失败')
  }
}

// 绑定组件
const bindComponent = async (row: any) => {
  selectedComponentId.value = row.id
  if (!selectedComponentId.value) {
    ElMessage.warning('请选择组件')
    return
  }
  
  try {
    await componentStore.bindingComponent(selectedComponentId.value, domainId.value)
    ElMessage.success('绑定成功')
    bindingDialogVisible.value = false
    selectedComponentId.value = null
  } catch (error) {
    ElMessage.error('绑定失败')
  }
}
</script>

<style scoped>
</style>