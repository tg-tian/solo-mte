<template>
  <div class="scene-list-container">
    <div class="scene-header">
      <h2>场景列表 <small v-if="currentDomain"> {{ currentDomain.domainName }}</small></h2>
      <div class="header-actions">
        <el-button type="primary" @click="navigateToSceneSetting()">创建场景</el-button>
      </div>
    </div>
    
    <el-card class="scene-search">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="场景名称">
          <el-input v-model="searchForm.name" placeholder="请输入场景名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="已发布" value='1'></el-option>
            <el-option label="定制中" value='0'></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <div class="scene-content">
      <div class="scene-list">
        <el-table
          v-loading="sceneStore.loading"
          :data="filteredScenes"
          border
        >
          <el-table-column prop="code" label="场景编码" width="100"></el-table-column>
          <el-table-column prop="name" label="场景名称" width="150"></el-table-column>
          <el-table-column prop="description" label="描述" min-width="220"></el-table-column>
          <!-- <el-table-column label="坐标" width="180">
            <template #default="scope">
              <span v-if="getLocation(scope.row).hasLocation">
                {{ getLocation(scope.row).lng.toFixed(4) }}, {{ getLocation(scope.row).lat.toFixed(4) }}
              </span>
              <span v-else class="location-empty">暂无坐标</span>
            </template>
          </el-table-column> -->
          <el-table-column prop="createTime" label="创建时间" width="120"></el-table-column>
          <el-table-column prop="updateTime" label="更新时间" width="120"></el-table-column>
          <el-table-column prop="deviceCount" label="设备数量" width="100"></el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === '1' ? 'success' : 'info'">
                {{ scope.row.status === '1' ? '已发布' : '定制中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="300">
            <template #default="scope">
              <el-button type="primary" size="small" @click="navigateToSceneSetting(scope.row)">编辑</el-button>
              <el-button type="success" size="small" @click="handleScenePlatform(scope.row)">进入场景</el-button>
              <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="scene-map">
        <div id="map-canvas" ref="mapCanvas"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, toRefs, nextTick } from 'vue'
import { useSceneStore } from '@/store/scene'
import { useDomainStore } from '@/store/domain'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Scene } from '@/types/models'
import scenePlatformRequest from "@/utils/scenePlatformRequest";
import {setScenePlatform} from "@/api/scene";

const router = useRouter()
const route = useRoute()
const sceneStore = useSceneStore()
const domainStore = useDomainStore()
const mapCanvas = ref<HTMLElement | null>(null)

// 状态
const state = reactive({
  searchForm: {
    name: '',
    status: ''
  },
  dialogVisible: false,
  currentId: null,
  baiduMap: null as BMap.Map | null,
  markers: [] as BMap.Marker[],
  infoWindow: null as BMap.InfoWindow | null
})

const { searchForm, dialogVisible, currentId, baiduMap, markers, infoWindow } = toRefs(state)

// 获取当前域
const currentDomain = computed(() => {
  return domainStore.currentDomain
})

// 过滤后的场景列表
const filteredScenes = computed(() => {
  if (!sceneStore.scenes) return []
  
  return sceneStore.scenes.filter((scene: any) => {
    const nameMatch = !searchForm.value.name || scene.name.toLowerCase().includes(searchForm.value.name.toLowerCase())
    const statusMatch = !searchForm.value.status || scene.status === searchForm.value.status
    return nameMatch && statusMatch
  }).map((scene)=>{
    return {
      ...scene,
      createTime: scene.createTime?.split('.')[0].replace('T', ' '),
      updateTime: scene.updateTime?.split('.')[0].replace('T', ' ')
    }
  })
})

// 初始化
onMounted(async () => {
  // Get domainId parameter
  const domainId = parseInt(route.query.domainId as string)
  if (domainId) {
    await sceneStore.fetchScenes(domainId)
  } else {
    await sceneStore.fetchScenes()
  }
  // Initialize map after data is loaded
  nextTick(() => {
    initMap()
  })
})

// Clean up on component unmount
onUnmounted(() => {
  // Clean up map resources if needed
  if (baiduMap.value) {
    baiduMap.value.clearOverlays()
  }
})

// Initialize Baidu Map
const initMap = () => {
  if (!mapCanvas.value) return
  
  // Create map instance
    baiduMap.value = new BMap.Map('map-canvas')
  
  // Set initial center and zoom
  let centerPoint: BMap.Point
  
  // Check if we have scenes with locations
  const scenesWithLocation = filteredScenes.value.filter(
    (scene: Scene) => scene.location && scene.location.lng && scene.location.lat
  )
  
  if (scenesWithLocation.length > 0) {
    // Use first scene with location as center
    const firstScene = scenesWithLocation[0]
    centerPoint = new BMap.Point(firstScene.location!.lng, firstScene.location!.lat)
  } else {
    // Default to Shanghai as center
    centerPoint = new BMap.Point(121.4737, 31.2304)
  }
  
  // baiduMap.value.centerAndZoom(centerPoint, 12)
  
  // Enable scroll wheel zoom
  baiduMap.value.enableScrollWheelZoom()
  
  // Add navigation control
  const navigationControl = new BMap.NavigationControl({
    type: BMAP_NAVIGATION_CONTROL_LARGE
  })
  //@ts-ignore
  baiduMap.value.addControl(navigationControl)
  
  // Add scale control
  const scaleControl = new BMap.ScaleControl()
  //@ts-ignore
  baiduMap.value.addControl(scaleControl)
  
  // Add markers for each scene
  addSceneMarkers()
}

// Add markers for scenes
const addSceneMarkers = () => {
  if (!baiduMap.value) return
  
  // Clear any existing markers
  baiduMap.value.clearOverlays()
  markers.value = []
  
  // Create info window for markers
  infoWindow.value = new BMap.InfoWindow('', {
    width: 300,
    height: 140,
    enableAutoPan: true
  })
  
  // 添加调试信息
  console.log('Adding markers for scenes:', filteredScenes.value)
  const points : BMap.Point[] = [] 
  // Add a marker for each scene with location
  filteredScenes.value.forEach((scene: any) => {
    // 增强兼容性，处理不同的数据结构
    // 场景位置可能存在于 location 对象中或分开存储为longitude/latitude
    const lng = scene.location?.lng || scene.longitude || null;
    const lat = scene.location?.lat || scene.latitude || null;
    
    // 打印每个场景的位置信息以便调试
    console.log(`Scene ${scene.id || scene.sceneId} (${scene.name || scene.sceneName}) location:`, { lng, lat })
    
    // Make sure scene has location data before adding marker
    if (lng !== null && lat !== null) {
      const point = new BMap.Point(lng, lat)
      const marker = new BMap.Marker(point)
      // Add marker to map
      baiduMap.value?.addOverlay(marker)
      markers.value.push(marker)
      points.push(point)
      // Add click listener to marker
      marker.addEventListener('click', () => {
        showSceneInfo(scene, marker)
      })
    }
  })
  baiduMap.value?.setViewport(points)
  // 如果没有场景有位置信息，居中显示到一个默认位置
  if (markers.value.length === 0) {
    // 默认到上海
    baiduMap.value.centerAndZoom(new BMap.Point(121.4737, 31.2304), 12)
  }
}

// Show scene info when marker is clicked
const showSceneInfo = (scene: Scene, marker: BMap.Marker) => {
  if (!infoWindow.value || !baiduMap.value) return
  
  // Create info window content
  const content = document.createElement('div')
  content.className = 'map-info-window'
  
  // Scene title
  const title = document.createElement('h3')
  title.textContent = scene.name
  title.style.marginBottom = '5px'
  content.appendChild(title)
  
  // Scene description
  const description = document.createElement('p')
  description.textContent = scene.description
  description.style.fontSize = '12px'
  description.style.marginBottom = '10px'
  content.appendChild(description)
  
  // Status
  const statusContainer = document.createElement('div')
  statusContainer.style.marginBottom = '10px'
  
  const statusLabel = document.createElement('span')
  statusLabel.textContent = '状态: '
  statusContainer.appendChild(statusLabel)
  
  const statusValue = document.createElement('span')
  statusValue.textContent = scene.status === '1' ? '已发布' : '定制中'
  statusValue.style.padding = '2px 6px'
  statusValue.style.borderRadius = '4px'
  statusValue.style.backgroundColor = scene.status === '1' ? '#67C23A' : '#909399'
  statusValue.style.color = 'white'
  statusValue.style.fontSize = '12px'
  statusContainer.appendChild(statusValue)
  
  content.appendChild(statusContainer)
  
  // Action buttons
  const actionsContainer = document.createElement('div')
  actionsContainer.style.display = 'flex'
  actionsContainer.style.justifyContent = 'space-between'
  
  // Edit button
  const editButton = document.createElement('button')
  editButton.textContent = '编辑'
  editButton.style.backgroundColor = '#409EFF'
  editButton.style.color = 'white'
  editButton.style.border = 'none'
  editButton.style.padding = '2px 6px'  // 减小padding
  editButton.style.borderRadius = '4px'
  editButton.style.cursor = 'pointer'
  editButton.style.fontSize = '12px'    // 减小字体大小
  editButton.style.marginRight = '4px'  // 添加右边距
  editButton.onclick = (e) => {
    e.preventDefault()
    navigateToSceneSetting(scene)
  }
  actionsContainer.appendChild(editButton)
  
  // Enter button
  const enterButton = document.createElement('button')
  enterButton.textContent = '进入场景'
  enterButton.style.backgroundColor = '#67C23A'
  enterButton.style.color = 'white'
  enterButton.style.border = 'none'
  enterButton.style.padding = '2px 6px'  // 减小padding
  enterButton.style.borderRadius = '4px'
  enterButton.style.cursor = 'pointer'
  enterButton.style.fontSize = '12px'    // 减小字体大小
  enterButton.style.marginRight = '4px'  // 添加右边距
  enterButton.onclick = (e) => {
    e.preventDefault()
    navigateToSceneSetting(scene)
  }
  actionsContainer.appendChild(enterButton)
  
  // Delete button
  const deleteButton = document.createElement('button')
  deleteButton.textContent = '删除'
  deleteButton.style.backgroundColor = '#F56C6C'
  deleteButton.style.color = 'white'
  deleteButton.style.border = 'none'
  deleteButton.style.padding = '2px 6px'  // 减小padding
  deleteButton.style.borderRadius = '4px'
  deleteButton.style.cursor = 'pointer'
  deleteButton.style.fontSize = '12px'    // 减小字体大小
  deleteButton.onclick = (e) => {
    e.preventDefault()
    //@ts-ignore
    baiduMap.value?.closeInfoWindow() // Close info window first
    handleDelete(scene)
  }
  actionsContainer.appendChild(deleteButton)
  content.appendChild(actionsContainer)


  // Set info window content and open it
  //@ts-ignore
  infoWindow.value.setContent(content)
  marker.openInfoWindow(infoWindow.value)
}

// Refresh map markers when search criteria change
watch([() => searchForm.value.name, () => searchForm.value.status], () => {
  if (baiduMap.value) {
    nextTick(() => {
      addSceneMarkers()
    })
  }
})

// 搜索处理
const handleSearch = () => {
  if (baiduMap.value) {
    addSceneMarkers()
  }
}

// 重置搜索
const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.status = ''
  
  if (baiduMap.value) {
    addSceneMarkers()
  }
}

// 导航到场景设置页面
const navigateToSceneSetting = (scene?: any) => {
  const domainId = parseInt(route.query.domainId as string) || 
                  (currentDomain.value ? currentDomain.value.id : null)
                  
  if (!domainId) {
    ElMessage.warning('请先选择一个领域')
    return
  }
  
  if (scene) {
    // For editing, set the current scene and navigate with scene ID
    sceneStore.setCurrentScene(scene)
    router.push(`/domain/scene/setting?mode=edit&sceneId=${scene.id}&domainId=${domainId}`)
  } else {
    // For creation, navigate to setting page with domain ID
    router.push(`/domain/scene/setting?mode=create&domainId=${domainId}`)
  }
}

// 进入场景平台
const handleScenePlatform = async (row: any) => {
  sceneStore.setCurrentScene(row)
  if(row.status !== '1'){
    ElMessage.warning('请先发布')
  }else if(row.url === ''){
    ElMessage.warning('场景地址不能为空')
  }else{
    const data ={
      name:row.code,
      cnName:row.name,
      platformKind: "solo-sp",
      logo:"https://www.gitlink.org.cn/images/avatars/Organization/130318?t=1712062266"
    }
    const result =  await setScenePlatform(data)
    if(result) window.open(row.url)
  }
}

// 删除场景
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除场景 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(async () => {
    try {
      await sceneStore.deleteScene(row.id)
      ElMessage.success('删除成功')
      
      // Refresh map markers after deletion
      if (baiduMap.value) {
        addSceneMarkers()
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
  .catch(() => {
    // 用户取消操作
  })
}

// 获取场景位置
const getLocation = (scene: any) => {
  const lng = scene.location?.lng || scene.longitude || null
  const lat = scene.location?.lat || scene.latitude || null
  return {
    lng,
    lat,
    hasLocation: lng !== null && lat !== null
  }
}
</script>

<style scoped>
.scene-list-container {
  padding: 20px;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.scene-search {
  margin-bottom: 20px;
}

.scene-content {
  display: block;
  /* display: flex; */
  gap: 10px;
  height: calc(100vh - 260px); /* 根据需求调整高度 */
}

.scene-list {
  /* flex: 1; */
  overflow: auto;
}

.scene-map {
  /* width: 100%; */
  padding: 50px;
  height: 500px;
  margin-top: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

#map-canvas {
  width: 100%;
  height: 100%;
}
</style>
