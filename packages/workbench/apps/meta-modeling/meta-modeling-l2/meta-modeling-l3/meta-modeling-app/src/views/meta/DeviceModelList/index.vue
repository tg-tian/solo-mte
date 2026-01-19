<template>
    <div class="devicemodel-list-container">
      <div class="devicemodel-header">
        <h2>设备型号列表</h2>
        <el-button type="primary" @click="navigateToDeviceModelSetting()">创建设备型号</el-button>
      </div>
      
      <el-card class="devicemodel-search">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="设备型号名称">
            <el-input v-model="searchForm.name" placeholder="请输入设备型号名称" clearable></el-input>
          </el-form-item>
          <el-form-item label="设备类型">
            <el-select v-model="searchForm.deviceTypeId" placeholder="请选择设备类型" clearable>
              <el-option
                v-for="deviceType in deviceTypeStore.allDeviceTypes"
                :key="deviceType.id"
                :label="deviceType.name"
                :value="deviceType.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <el-table
        v-loading="deviceModelStore.loading"
        :data="filteredDeviceModels"
        style="width: 100%; margin-top: 20px"
        border
      >
        <el-table-column prop="code" label="设备型号编码" width="150"></el-table-column>
        <el-table-column prop="name" label="设备型号名称" min-width="150"></el-table-column>
        <el-table-column prop="deviceType.name" label="设备类型" min-width="150">
          <template #default="scope">
            {{ scope.row.deviceType?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
        <el-table-column label="Mapper" width="120">
          <template #default="scope">
            <el-button 
              type="primary" 
              size="small" 
              @click="viewMapper(scope.row)"
              plain
            >查看Mapper</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="150"></el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="150"></el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button type="primary" size="small" @click="navigateToDeviceModelSetting(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mapper信息对话框 -->
      <el-dialog v-model="mapperDialogVisible" :title="selectedDeviceModel ? `${selectedDeviceModel.name} 的Mapper` : 'Mapper信息'" width="600px">
        <el-input
          v-model="mapperJson"
          type="textarea"
          :rows="15"
          readonly
          placeholder="Mapper配置"
        ></el-input>
        <template #footer>
          <el-button @click="mapperDialogVisible = false">关闭</el-button>
        </template>
      </el-dialog>
    </div>
  </template>
  
  <script setup lang="ts">
  import { reactive, computed, onMounted, toRefs, ref } from 'vue'
  import { useDeviceModelStore } from '@/store/deviceModel'
  import { useDeviceTypeStore } from '@/store/deviceType'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useRouter } from 'vue-router'
  import { DeviceModel } from '@/types/models'
  
  const router = useRouter()
  const deviceModelStore = useDeviceModelStore()
  const deviceTypeStore = useDeviceTypeStore()
  
  // 状态
  const state = reactive({
    searchForm: {
      name: '',
      deviceTypeId: undefined as number | undefined
    }
  })
  
  const mapperDialogVisible = ref(false)
  const selectedDeviceModel = ref<DeviceModel | null>(null)
  const mapperJson = ref('')
  
  const { searchForm } = toRefs(state)
  
  // 过滤后的设备型号列表
  const filteredDeviceModels = computed(() => {
    if (!deviceModelStore.deviceModels) return []
    
    return deviceModelStore.deviceModels.filter((deviceModel: DeviceModel) => {
      const nameMatch = !searchForm.value.name || deviceModel.name.toLowerCase().includes(searchForm.value.name.toLowerCase())
      const deviceTypeMatch = !searchForm.value.deviceTypeId || deviceModel.deviceTypeId === searchForm.value.deviceTypeId
      return nameMatch && deviceTypeMatch
    }).map((deviceModel: any) => {
      return {
        ...deviceModel,
        updateTime: deviceModel.updateTime?.split('.')[0].replace('T', ' '),
        createTime: deviceModel.createTime?.split('.')[0].replace('T', ' ')
      }
    })
  })
  
  // 初始化
  onMounted(async () => {
    await deviceTypeStore.fetchAllDeviceTypes()
    await deviceModelStore.fetchDeviceModels()
  })
  
  // 搜索处理
  const handleSearch = () => {
    // 过滤是在计算属性中完成的
  }
  
  // 重置搜索
  const resetSearch = () => {
    searchForm.value.name = ''
    searchForm.value.deviceTypeId = undefined
  }
  
  // 导航到设备型号设置页面
  const navigateToDeviceModelSetting = (deviceModel?: DeviceModel) => {
    if (deviceModel) {
      // 编辑设备型号
      deviceModelStore.setCurrentDeviceModel(deviceModel)
      router.push(`/meta/devicemodel/setting?deviceModelId=${deviceModel.id}&mode=edit`)
    } else {
      // 创建设备型号
      router.push('/meta/devicemodel/setting?mode=create')
    }
  }
  
  // 查看Mapper
  const viewMapper = (row: DeviceModel) => {
    selectedDeviceModel.value = row
    mapperJson.value = JSON.stringify(row.mapper || {}, null, 2)
    mapperDialogVisible.value = true
  }
  
  // 删除设备型号
  const handleDelete = (row: DeviceModel) => {
    ElMessageBox.confirm(
      `确定要删除设备型号 "${row.name}" 吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    .then(async () => {
      try {
        await deviceModelStore.deleteDeviceModel(row.id, row.deviceTypeId)
        ElMessage.success('删除成功')
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {
      // 用户取消操作
    })
  }
  </script>
  
  <style scoped>
  .devicemodel-list-container {
    padding: 20px;
  }
  
  .devicemodel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .devicemodel-search {
    margin-bottom: 20px;
  }
  
  .search-form {
    display: flex;
    flex-wrap: wrap;
  }
  </style>
