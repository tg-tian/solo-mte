<template>
    <div class="devicetype-list-container">
      <div class="devicetype-header">
        <h2>设备类型列表</h2>
        <el-button type="primary" @click="navigateToDeviceTypeSetting()">创建设备类型</el-button>
      </div>
      
      <el-card class="devicetype-search">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="设备类型名称">
            <el-input v-model="searchForm.name" placeholder="请输入设备类型名称" clearable></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <el-table
        v-loading="deviceTypeStore.loading"
        :data="filteredDevicetypes"
        style="width: 100%; margin-top: 20px"
        border
      >
        <el-table-column prop="code" label="设备类型编码" width="150"></el-table-column>
        <el-table-column prop="name" label="设备类型名称" min-width="150"></el-table-column>
        <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="150"></el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="150"></el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button type="primary" size="small" @click="navigateToDeviceTypeSetting(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </template>
  
  <script setup lang="ts">
  import { reactive, computed, onMounted, toRefs } from 'vue'
  import { useDeviceTypeStore } from '@/store/deviceType'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { DeviceType } from '@/types/models'
  
  const deviceTypeStore = useDeviceTypeStore()
  
  // 状态
  const state = reactive({
    searchForm: {
      name: ''
    }
  })
  
  const { searchForm } = toRefs(state)
  
  // 过滤后的领域列表
  const filteredDevicetypes = computed(() => {
    if (!deviceTypeStore.allDeviceTypes) return []
    
    return deviceTypeStore.allDeviceTypes.filter((deviceType: DeviceType) => {
      const nameMatch = !searchForm.value.name || deviceType.name.toLowerCase().includes(searchForm.value.name.toLowerCase())
      return nameMatch
    }).map((deviceType: any)=>{
      return {
        ...deviceType,
        updateTime: deviceType.updateTime?.split('.')[0].replace('T', ' '),
        createTime: deviceType.createTime?.split('.')[0].replace('T', ' ')
      }
  })
  })
  
  // 初始化
  onMounted(async () => {
    await deviceTypeStore.fetchAllDeviceTypes()
  })
  
  // 搜索处理
  const handleSearch = () => {
    // 过滤是在计算属性中完成的
  }
  
  // 重置搜索
  const resetSearch = () => {
    searchForm.value.name = ''
  }
  
  // 导航到设备类型设置页面
  const navigateToDeviceTypeSetting = (deviceType?: DeviceType) => {
    // 在workbench的iframe环境中，使用postMessage通知父窗口打开新URL
    let url = '/apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-type-setting/index.html'
    if (deviceType) {
      // 编辑设备类型
      deviceTypeStore.setCurrentDeviceType(deviceType)
      url += `?deviceTypeId=${deviceType.id}&mode=edit`
    } else {
      // 创建设备类型
      url += '?mode=create'
    }
    
    // 使用workbench的postMessage机制
    if (window.top && window.top !== window) {
      window.top.postMessage({
        eventType: 'invoke',
        method: 'openUrl',
        params: [
          deviceType?.id?.toString() || 'device-type-setting',
          deviceType?.code || 'device-type-setting',
          deviceType?.name || '设备类型设置',
          url
        ]
      }, '*')
    } else {
      // 如果不在iframe中，直接跳转
      window.location.href = url
    }
  }
  
  // 删除设备类型
  const handleDelete = (row: DeviceType) => {
    ElMessageBox.confirm(
      `确定要删除设备类型 "${row.name}" 吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    .then(async () => {
      try {
        await deviceTypeStore.deleteDeviceType(row.id)
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
  .devicetype-list-container {
    padding: 20px;
  }
  
  .devicetype-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .devicetype-search {
    margin-bottom: 20px;
  }
  
  .search-form {
    display: flex;
    flex-wrap: wrap;
  }
  </style>