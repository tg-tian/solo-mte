<template>
    <div class="nodetype-list-container">
      <div class="nodetype-header">
        <h2>组件类型列表</h2>
        <el-button type="primary" @click="navigateToNodeTypeSetting()">创建组件类型</el-button>
      </div>
      
      <el-card class="nodetype-search">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="组件类型名称">
            <el-input v-model="searchForm.name" placeholder="请输入组件类型名称" clearable></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
      
      <el-table
        v-loading="loading"
        :data="filteredNodeTypes"
        style="width: 100%; margin-top: 20px"
        border
      >
        <el-table-column prop="code" label="组件类型编码" width="150"></el-table-column>
        <el-table-column prop="name" label="组件类型名称" min-width="150"></el-table-column>
        <el-table-column prop="description" label="描述" min-width="200"></el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="150"></el-table-column>
        <el-table-column prop="updateTime" label="更新时间" min-width="150"></el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="scope">
            <el-button type="primary" size="small" @click="navigateToNodeTypeSetting(scope.row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </template>
  
  <script setup lang="ts">
  import { reactive, computed, onMounted, toRefs, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  
  const loading = ref(false)
  
  // 状态
  const state = reactive({
    searchForm: {
      name: ''
    },
    nodeTypes: [] as any[]
  })
  
  const { searchForm } = toRefs(state)
  
  // 过滤后的组件类型列表
  const filteredNodeTypes = computed(() => {
    if (!state.nodeTypes) return []
    
    return state.nodeTypes.filter((nodeType: any) => {
      const nameMatch = !searchForm.value.name || nodeType.name.toLowerCase().includes(searchForm.value.name.toLowerCase())
      return nameMatch
    }).map((nodeType: any)=>{
      return {
        ...nodeType,
        updateTime: nodeType.updateTime?.split('.')[0].replace('T', ' '),
        createTime: nodeType.createTime?.split('.')[0].replace('T', ' ')
      }
  })
  })
  
  // 初始化
  onMounted(async () => {
    // TODO: 调用API获取节点类型列表
    // await fetchNodeTypes()
  })
  
  // 搜索处理
  const handleSearch = () => {
    // 过滤是在计算属性中完成的
  }
  
  // 重置搜索
  const resetSearch = () => {
    searchForm.value.name = ''
  }
  
  // 导航到组件类型设置页面（在workbench中使用URL跳转）
  const navigateToNodeTypeSetting = (nodeType?: any) => {
    // 在workbench的iframe环境中，使用postMessage通知父窗口打开新URL
    let url = '/apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/node-type-setting/index.html'
    if (nodeType) {
      // 编辑组件类型
      url += `?nodeTypeId=${nodeType.id}&mode=edit`
    } else {
      // 创建组件类型
      url += '?mode=create'
    }
    
    // 使用workbench的postMessage机制
    if (window.top && window.top !== window) {
      window.top.postMessage({
        eventType: 'invoke',
        method: 'openUrl',
        params: [
          nodeType?.id?.toString() || 'node-type-setting',
          nodeType?.code || 'node-type-setting',
          nodeType?.name || '组件类型设置',
          url
        ]
      }, '*')
    } else {
      // 如果不在iframe中，直接跳转
      window.location.href = url
    }
  }
  
  // 删除组件类型
  const handleDelete = (row: any) => {
    ElMessageBox.confirm(
      `确定要删除组件类型 "${row.name}" 吗？`,
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    .then(async () => {
      try {
        // TODO: 调用API删除节点类型
        // await deleteNodeType(row.id)
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
  .nodetype-list-container {
    padding: 20px;
  }
  
  .nodetype-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .nodetype-search {
    margin-bottom: 20px;
  }
  
  .search-form {
    display: flex;
    flex-wrap: wrap;
  }
  </style>
