<template>
  <div class="nav">
    <!-- Replace LOGO text with an image -->
    <el-image :src="logoImage" alt="Logo" style="max-width:95%;"/>
    <el-menu
      :default-active="selectedItem"
      class="nav-menu"
      @select="handleMenuSelect"
      :style="{
        '--el-menu-bg-color': '#0454c4',
        '--el-menu-text-color': 'rgba(255, 255, 255, 0.65)',
        '--el-menu-active-color': '#0454c4'
      }"
    >
      <!-- 元工具平台 -->
      <div style="margin-top: 10px" v-if="!routerPath.startsWith('/domain') && !routerPath.startsWith('/scene')">
        <el-sub-menu index="0" class="nav-item">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <div class="menu-item">元建模</div>
          </template>
          <el-menu-item index="meta-devicetype-list" class="sub-menu-item">设备类型</el-menu-item>
          <el-menu-item index="meta-devicemodel-list" class="sub-menu-item">设备型号列表</el-menu-item>
          <el-menu-item index="meta-nodetype-list" class="sub-menu-item">节点类型</el-menu-item>
          <el-menu-item index="meta-component-list" class="sub-menu-item">组件类型</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="1" class="nav-item">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <div class="menu-item">定制领域</div>
          </template>
          <el-menu-item index="meta-domain-list" class="sub-menu-item">领域平台列表</el-menu-item>
          <!--el-menu-item index="meta-domain-setting" class="sub-menu-item">创建领域平台</el-menu-item-->
        </el-sub-menu>
      </div>
      <!-- 领域平台 -->
      <div style="margin-top: 10px" v-if="routerPath.startsWith('/domain')">
        <el-sub-menu index="0" class="nav-item">
          <template #title>
            <el-icon><Monitor /></el-icon>
            <div class="menu-item">场景管理</div>
          </template>
          <el-menu-item index="domain-scene-list" class="sub-menu-item">场景平台列表</el-menu-item>
          <el-menu-item index="domain-scene-setting" class="sub-menu-item">创建场景平台</el-menu-item>
        </el-sub-menu>
      </div>
    </el-menu>
  </div>
</template>
  
<script setup lang="ts">
import { Monitor } from '@element-plus/icons-vue'
import router from '@/router/index.ts'
import logoImage from '@/assets/LOGO_dark.jpg'
import { reactive, watchEffect, ref } from 'vue'

interface State {
  selectedItem: string
  items: any[]
  routerPath: string
}

const routerPath = ref('')
const selectedItem = ref('')
const items = ref([
  // 元工具平台
  {
    index: 'meta-devicetype-list',
    name: '设备类型列表',
    route: '/meta/devicetype/list'
  },
  {
    index: 'meta-devicetype-setting',
    name: '创建设备类型',
    route: '/meta/devicetype/setting'
  },
  {
    index: 'meta-devicemodel-list',
    name: '设备型号列表',
    route: '/meta/devicemodel/list'
  },
  {
    index: 'meta-devicemodel-setting',
    name: '创建设备型号',
    route: '/meta/devicemodel/setting'
  },
  {
    index: 'meta-component-list',
    name: '组件列表',
    route: '/meta/component/list'
  },
  {
    index: 'meta-component-setting',
    name: '组件定制',
    route: '/meta/component/setting'
  },
  {
    index: 'meta-nodetype-list',
    name: '节点类型列表',
    route: '/meta/nodetype/list'
  },
  {
    index: 'meta-nodetype-setting',
    name: '创建节点类型',
    route: '/meta/nodetype/setting'
  },
  {
    index: 'meta-domain-list',
    name: '领域列表',
    route: '/meta/domain/list'
  },
  {
    index: 'meta-domain-setting',
    name: '创建领域',
    route: '/meta/domain/setting'
  },
  // 领域平台
  {
    index: 'domain-scene-list',
    name: '场景列表',
    route: '/domain/scene/list'
  },
  {
    index: 'domain-scene-setting',
    name: '创建场景',
    route: '/domain/scene/setting'
  }
])

watchEffect(() => {
  const fullPath = router.currentRoute.value.fullPath
  const path = router.currentRoute.value.path
  routerPath.value = path
  const matchingItemData = items.value.find(item => 
    item.route.includes(path.toLowerCase()) || 
    item.route.includes(fullPath.toLowerCase())
  )

  if(fullPath.includes('mode=edit')) {
    const index = items.value.findIndex(item => 
      item.route.includes(path.toLowerCase())
    )
    selectedItem.value = (items.value[index-1])?.index
  } else if (matchingItemData) {
    selectedItem.value = matchingItemData.index
  } else {
    selectedItem.value = ''
  }
})

const handleMenuSelect = (key: string, _keyPath: string[]) => {
  selectedItem.value = key
  const selectedItemData = items.value.find(item => item.index === key)
  
  if (selectedItemData) {
    let query = {} as any
    if(!selectedItemData.route.startsWith("/meta")) {
      query = { ...router.currentRoute.value.query }
    }
    if(selectedItemData.route.includes('setting')) {
      query['mode'] = 'create'
    }
    router.push({
      path: selectedItemData.route,
      query: query
    })
  }
}
</script>

<style scoped>
.nav {
  width: 200px;
  height: 100%;
  background-color: #0454c4;
  color: white;
}

.logo {
  font-size: 20px;
  padding-top: 10px;
  margin-left: 10px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
}

.nav-item {
  width: 100%;
}

.menu-item {
  width: 100px;
  text-align: center;
  font-size: 16px;
}

.sub-menu-item {
  text-align: center;
  font-size: 16px;
}

:deep(.nav-item .el-menu-item.is-active) {
  background-color: #e4ecfc;
  margin: 5px;
  border-radius: 5px;
  color: #0454c4;
}

:deep(.nav-item .el-menu-item:hover) {
  color: #0454c4;
}

:deep(.nav-item .el-sub-menu__title:hover) {
  color: #0454c4;
}
</style>
