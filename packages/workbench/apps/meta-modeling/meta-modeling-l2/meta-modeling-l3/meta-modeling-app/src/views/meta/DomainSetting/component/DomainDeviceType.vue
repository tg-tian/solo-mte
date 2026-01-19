<template>
    <!-- 添加设备类型绑定功能 -->
    <el-button type="primary" style="float: right;margin-bottom: 10px" @click="showBindDeviceTypeDialog">绑定设备类型</el-button>
    <el-dialog v-model="bindingDialogVisible"
    title="绑定设备类型"
    width="50%"
    >
      <el-table
        :data="availableDeviceTypes"
        style="width: 100%; margin-top: 20px"
        border
      >
      <el-table-column prop="code" label="设备类型编码" width="150"></el-table-column>
        <el-table-column prop="name" label="设备类型名称" min-width="150"></el-table-column>
        <el-table-column prop="description" label="设备类型描述" min-width="200"></el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button type="primary" size="small" @click="bindDeviceType(scope.row)">绑定</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-empty description="暂无组件" v-if="filteredDeviceTypes.length===0"/>
    <el-table
      v-loading="deviceTypeStore.loading"
      :data="filteredDeviceTypes"
      style="width: 100%; margin-top: 20px"
      border
      v-else
    >
      <el-table-column prop="code" label="设备类型编码" width="150"></el-table-column>
      <el-table-column prop="name" label="设备类型名称" min-width="150"></el-table-column>
      <el-table-column prop="description" label="设备类型描述" min-width="200"></el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <el-button type="primary" size="small" @click="navigateToDeviceTypeSetting(scope.row)">查看</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
</template>

<script setup lang="ts">
import { useDeviceTypeStore } from '@/store/deviceType'
import request from '@/utils/request'
const route = useRoute()
const router = useRouter()
const deviceTypeStore = useDeviceTypeStore()

const domainId = computed(() => {
  return parseInt(route.query.domainId as string)
})

const isFromTem = computed(() => {
  return route.query.mode === 'template'
})

// 初始化
onMounted(async () => {
    try {
        const domain = parseInt(route.query.domainId as string)
        // Only fetch device types if not in template mode
        if (!isFromTem.value) {
            await deviceTypeStore.fetchDeviceTypes(domain)
        }
    } catch (error) {
        console.error('加载设备类型失败:', error)
    }
})

watch([() => route.query.domainId], async ([newDomainId]) => {
    try {
        // Only fetch device types if not in template mode
        if (!isFromTem.value) {
            await deviceTypeStore.fetchDeviceTypes(parseInt(newDomainId as string))
        }
    } catch (error) {
        console.error('加载设备类型失败:', error)
    }
})

// 过滤后的领域列表
const filteredDeviceTypes = computed(() => {
  if (!deviceTypeStore.deviceTypes) return []
  
  let deviceTypes = deviceTypeStore.deviceTypes.map((deviceType: any)=>{
    return {
      ...deviceType,
      updateTime: deviceType.updateTime?.split('.')[0].replace('T', ' '),
      createTime: deviceType.createTime?.split('.')[0].replace('T', ' ')
    }
  })

  return deviceTypes
})

// 导航到设备类型设置页面
const navigateToDeviceTypeSetting = (deviceType?: any) => {
  if (deviceType) {
    // 设备类型详情
    deviceTypeStore.setCurrentDeviceType(deviceType)
    router.push(`/meta/devicetype/setting?deviceTypeId=${deviceType.id}&mode=edit`)
  }
}

// 删除领域绑定信息
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要取消绑定设备类型 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(async () => {
    try {
      await deviceTypeStore.unbindingDeviceType(row.id, domainId.value)
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
const availableDeviceTypes = ref([])
const selectedDeviceTypeId = ref(null)

// 显示绑定设备类型对话框
const showBindDeviceTypeDialog = async () => {
  try {
    // 获取可用的设备类型列表（未绑定到当前领域的）
    const res = await request({
      url: '/devicetypes',
      method: 'get'
    })
    
    if (res.data && res.status === 200) {
      // 过滤掉已经绑定的设备类型
      availableDeviceTypes.value = res.data.filter((dt: any) => {
        return !filteredDeviceTypes.value.some((bound: any) => bound.id === dt.id)
      })
      bindingDialogVisible.value = true
    }
  } catch (error) {
    console.error('加载可用设备类型失败:', error)
    ElMessage.error('加载可用设备类型失败')
  }
}

// 绑定设备类型
const bindDeviceType = async (row: any) => {
  selectedDeviceTypeId.value = row.id
  if (!selectedDeviceTypeId.value) {
    ElMessage.warning('请选择设备类型')
    return
  }
  
  try {
    await deviceTypeStore.bindingDeviceType(selectedDeviceTypeId.value, domainId.value)
    ElMessage.success('绑定成功')
    bindingDialogVisible.value = false
    selectedDeviceTypeId.value = null
  } catch (error) {
    ElMessage.error('绑定失败')
  }
}
</script>