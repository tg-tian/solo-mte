<template>
  <div class="scene-setting-container">
    <div class="scene-header">
      <h2>{{ sceneForm.name}} </h2>
    </div>
    <el-card class="setting-content">
      <div class="area-actions" style="margin:10px 0;">
        <el-button type="primary" @click="handleAddArea">添加区域</el-button>
      </div>
      <div v-if="filteredAreas && filteredAreas.length > 0">
        <el-table v-loading="areaStore.loading" :data="filteredAreas" style="width: 100%; margin-top: 20px" border>
          <el-table-column prop="name" label="区域名称" min-width="100"></el-table-column>
          <el-table-column prop="image" label="区域布局图" min-width="120">
            <template #default="scope">
              <img :src="areaImageUrl(scope.row)" class="area-image" v-if="scope.row.image" @error="handleImageError" />
              <span v-else>暂无图片</span>
            </template>
          </el-table-column>
          <el-table-column prop="position" label="区域坐标" min-width="100"></el-table-column>
          <el-table-column prop="root" label="区域级别" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.parentId === -1 || scope.row.parentId === null ? 'success' : 'info'">
                {{ scope.row.parentId === -1 || scope.row.parentId === null ? '根区域' : '子区域' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="区域描述" min-width="150"></el-table-column>
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEditArea(scope.row)">编辑</el-button>
              <el-button type="success" size="small" @click="editAreaTree(scope.row)">区域树</el-button>
              <el-button type="danger" size="small" @click="handleDeleteArea(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="暂无区域" />

    </el-card>
    <el-dialog v-model="areaDialogVisible" :title="isEdit ? '编辑区域' : '添加区域'" width="50%">
      <el-form :model="areaForm" label-width="120px" :rules="areaRules" ref="areaFormRef">
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="areaForm.name" placeholder="请输入区域名称"></el-input>
        </el-form-item>
        <el-form-item label="区域描述" prop="description">
          <el-input v-model="areaForm.description" placeholder="请输入区域描述"></el-input>
        </el-form-item>
        <el-form-item label="区域布局图">
          <el-upload class="scene-image-uploader" action="/api/upload" :show-file-list="false"
            :on-success="handleAreaImageSuccess" :before-upload="beforeImageUpload">
            <img v-if="areaForm.image" :src="areaImage" class="area-image" @error="handleImageError" />
            <el-icon v-else class="scene-uploader-icon">
              <Plus />
            </el-icon>
          </el-upload>
          <div class="el-upload__tip">
            支持 jpg/png 文件，大小不超过 5MB
          </div>
        </el-form-item>
        <el-form-item label="区域坐标" prop="position">
          <el-input v-model="areaForm.position" placeholder="请输入区域坐标"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="areaDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAreaForm" :loading="submitting">确认</el-button>
        </span>
      </template>
    </el-dialog>
    <el-dialog v-model="areaTreeVisible" :title="'编辑' + areaForm.name + '区域树'" width="50%">
      <el-form label-width="120px" ref="areaTreeRef">
        <el-form-item>
          <el-tree :data="treeData" :props="treeProps" node-key="id" highlight-current
            :default-expanded-keys="expandedKeys" @node-click="handleTreeNodeClick" ref="treeRef">
            <template #default="{ node, data }">
              <span class="tree-node-content">
                <span class="tree-node-label">{{ data.name }}</span>
                <span v-if="!pathNodeIds.includes(data.id)" class="tree-node-actions">
                  <span class="add-child-action" @click="(event) => { event.stopPropagation(); addNode(data); }">
                    +
                  </span>
                  <span class="delete-node-action" @click="(event) => { event.stopPropagation(); deleteNode(data); }">
                    -
                  </span>
                </span>
              </span>
            </template>
          </el-tree>
        </el-form-item>
      </el-form>
    </el-dialog>
    <el-dialog v-model="areaSelectionDialogVisible" title="选择区域" width="30%">
      <el-checkbox-group v-model="selectedAreas">
        <el-checkbox v-for="area in filteredParentAreas" :key="area.id" :label="area.id">
          {{ area.name }}
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="areaSelectionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddNode">确定</el-button>
      </template>
    </el-dialog>
    
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs, nextTick } from 'vue'
import { useSceneStore } from '../../store/scene'
import { useDomainStore } from '../../store/domain'
import { useDeviceStore } from '../../store/device'
import { useAreaStore } from '../../store/area'
import { useSceneTemplateStore } from "../../store/sceneTemplate";
import { ElMessage, ElMessageBox, type FormInstance, ElTree } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getSceneById } from '../../api/scene'
import { useRouter, useRoute } from 'vue-router'
import { Device, Area, DeviceType, DeviceConnection, Connection } from '../../types/models'
import defaultImage from '@/assets/default.png'

const props = defineProps<{ domainId: number ; sceneId: number }>()


const sceneStore = useSceneStore()
const domainStore = useDomainStore()
const deviceStore = useDeviceStore()
const areaStore = useAreaStore()
const sceneTemplateStore = useSceneTemplateStore()
const sceneFormRef = ref<FormInstance>()
const deviceFormRef = ref<FormInstance>()           // 新增：设备对话框表单引用
const areaFormRef = ref<FormInstance>()           // 新增：区域对话框表单引用
const locationMap = ref<HTMLElement | null>(null)
const treeRef = ref<InstanceType<typeof ElTree>>()
const lngMIn = 73
const lngMax = 135
const latMin = 3
const latMax = 53
const editConnectionsDialogVisible = ref(false)
const deviceConnections = ref<DeviceConnection[]>([])
const addInPointDialogVisible = ref(false);
const selectedDeviceId = ref(undefined);
const selectedPosition = ref(undefined);
const selectedAreas = ref([]); // 存储选中的区域
const areaSelectionDialogVisible = ref(false); // 控制对话框显示


// State
const state = reactive({
  activeTab: 'basic',
  searchForm: {
    name: '',
    status: 0
  },
  sceneForm: {
    code: '',
    name: '',
    description: '',
    status: '0',
    domainId: props.domainId ?? null,
    lng: undefined as number | undefined,
    lat: undefined as number | undefined,
    url: '',
    imageUrl: '',
  },
  deviceForm: {
    code: '',
    name: '',
    deviceTypeId: undefined as number | undefined,
    protocolType: 'MQTT',
    sceneId: props.sceneId ?? null,
    deviceLocation: '',
  },
  areaForm: reactive<Area>({
    id: -1, // 新增字段，用于记录当前区域的 ID
    name: '',
    image: null,
    description: '',
    position: '',
    parentId: -1, // 父区域 ID
    children: [] // 子节点
  }),
  currentNode: reactive<Area>({
    id: -1,
    name: '',
    image: '',
    description: '',
    position: '',
    parentId: -1, // 父区域 ID
    children: [] // 子节点
  }),
  parentNode: reactive<Area>({
    id: -1,
    name: '',
    image: '',
    description: '',
    position: '',
    parentId: -1, // 父区域 ID
    children: [] // 子节点
  }),
  currentDevice: reactive({
    id: -1,
    name: '',
    deviceType: {} as DeviceType,
    sceneId: props.sceneId ?? null,
    connections: [] as Connection[],
  }),
  submitting: false,
  baiduMap: null as BMap.Map | null,
  locationMarker: null as BMap.Marker | null,
  dialogVisible: false,
  deviceDialogVisible: false,
  areaDialogVisible: false,
  areaTreeVisible: false,
  currentId: 0,
  isEdit: false,
  deviceTypeList: [] as DeviceType[],
})

const { activeTab, sceneForm, submitting, baiduMap, locationMarker,
  dialogVisible, searchForm, isEdit, deviceForm,
  currentId, deviceDialogVisible, deviceTypeList,
  areaForm, areaDialogVisible, areaTreeVisible, currentNode, parentNode, currentDevice } = toRefs(state)

// Determine mode and whether we're in edit mode
const mode = ref<'create' | 'edit'>(props.sceneId ? 'edit' : 'create')
const isEditMode = computed(() => mode.value === 'edit')

// Get current scene ID from query params
const sceneId = computed(() => {
  return props.sceneId
})

// 提取图片基础路径常量
const BASE_URL = "http://139.196.147.52:8080"

const sceneImageUrl = computed(() => {
  const imageUrl = BASE_URL + sceneForm.value.imageUrl
  console.log("image url", imageUrl)
  return imageUrl
})

const areaImage = computed(() => {
  const imageUrl = BASE_URL + areaForm.value.image
  console.log("areaImage", imageUrl)
  return imageUrl
})

const areaImageUrl = (area: Area) => {
  if (!area) return undefined;
  const imageUrl = BASE_URL + area.image
  return imageUrl
};

// 新增方法：打开新增设备对话框
const handleAddDevice = () => {
  isEdit.value = false
  currentId.value = -1
  deviceForm.value = {
    code: '',
    name: '',
    deviceTypeId: undefined,
    protocolType: 'MQTT',
    sceneId: sceneId.value,
    deviceLocation: '',
  }
  deviceDialogVisible.value = true
}

const handleAddArea = () => {
  isEdit.value = false
  currentId.value = -1
  areaForm.value = {
    id: -1,
    name: '',
    image: null,
    description: '',
    position: '',
    parentId: -1,
    children: []
  }
  areaDialogVisible.value = true
}

const editAreaTree = async (row: Area) => {
  try {
    currentNode.value = {
      id: row.id,
      name: row.name,
      image: row.image,
      description: row.description,
      position: row.position,
      parentId: row.parentId,
      children: row.children || []
    };
    const areaTree = await areaStore.buildAreaTree(sceneId.value, row.id);
    console.log("areaTree", areaTree);
    console.log("当前结点", currentNode.value);
    areaForm.value = {
      id: areaTree.id,
      name: areaTree.name,
      image: areaTree.image,
      description: areaTree.description,
      position: areaTree.position,
      parentId: areaTree.parentId,
      children: areaTree.children || [], // 使用返回的 areaTree 数据
    };

    // 显示区域树对话框
    areaTreeVisible.value = true;
  } catch (error) {
    ElMessage.error("获取区域树失败");
  }
}

const handleSearch = () => {
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除设备 "${row.name}" 吗？`,
    {
      title: '警告',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    },
  )
    .then(async () => {
      try {
        await deviceStore.deleteDevice(row.id)
        await deviceStore.fetchDevices(sceneId.value)
        ElMessage.success('删除成功')
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {
      // 用户取消操作
    })
}

const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.status = 0
}

// Get domain ID from query params
const domainId = computed(() => {
  return props.domainId ?? null
})

// Get current domain
const currentDomain = computed(() => {
  return domainStore.currentDomain
})

const filteredDeviceConnections = computed(() => {
  console.log("deviceConnections", deviceConnections.value)
  if (!deviceConnections.value) return [];
  return deviceConnections.value.filter((d: any) => (
    d.intelligent === false
  )).map((device: any) => ({
    id: device.id,
    name: device.name,
    deviceTypeName: device.deviceType.name,
    deviceType: device.deviceType,
    connections: device.connections || [],
    connlist: (device.connections && device.connections.length > 0)
      ? device.connections.map((c: any) => `${c.position}: ${c.deviceName}`).join('，')
      : '无连接设备',
    intelligent: device.intelligent
  }));
});

const handleConnection = (row: DeviceConnection) => {
  Object.assign(currentDevice.value, {
    id: row.id,
    name: row.name,
    deviceType: row.deviceType,
    connections: row.connections,
  });
  console.log("currentDevice", currentDevice.value)
  editConnectionsDialogVisible.value = true
};

// 删除接入点
const handleDeletePoint = async (row: Connection) => {
  const sourceId = currentDevice.value.id
  const targetId = row.id
  console.log("sourceId", sourceId, "targetId", targetId)
  try {
    await deviceStore.deleteConnection(sourceId, targetId);
    await loadDeviceConnections()
    currentDevice.value.connections = currentDevice.value.connections.filter(
      (item) => (item.id) !== row.id
    );
    ElMessage.success('删除接入点成功');
  } catch (error) {
    ElMessage.error('删除接入点失败');
  }
};

// Rules for form validation
const rules = {
  code: [
    { required: true, message: '请输入场景编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入场景名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入场景描述', trigger: 'blur' }
  ],
  imageUrl: [
    { required: false }
  ]
}

const deviceRules = {
  code: [
    { required: true, message: '请输入设备编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入设备名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  deviceTypeId: [
    { required: true, message: '请输入设备类型', trigger: 'blur' }
  ],
  protocolType: [
    { required: true, message: '请输入协议类型', trigger: 'blur' }
  ],
  deviceLocation: [
    { required: true, message: '请输入设备位置', trigger: 'blur' }
  ]
}

const areaRules = {
  name: [
    { required: true, message: '请输入区域名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { required: false, message: '请输入区域描述', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  position: [
    { required: false, message: '请输入区域位置', trigger: 'blur' }
  ]
}

// Clear form for creation mode
const resetFormData = () => {
  sceneForm.value = {
    code: '',
    name: '',
    description: '',
    status: '0',
    domainId: domainId.value,
    lng: undefined,
    lat: undefined,
    url: '',
    imageUrl: "",
  }
}

// 过滤后的设备列表
const filteredDevices = computed(() => {
  if (!deviceStore.devices) return []

  return deviceStore.devices.filter((device: Device) => {
    const nameMatch = !searchForm.value.name || device.deviceName.toLowerCase().includes(searchForm.value.name.toLowerCase())
    const statusMatch = !searchForm.value.status || device.status === searchForm.value.status
    return nameMatch && statusMatch
  }).map((device: Device) => {
    return {
      ...device,
      createTime: device.createTime?.split('.')[0].replace('T', ' '),
      updateTime: device.updateTime?.split('.')[0].replace('T', ' '),
      lastOnlineTime: device.lastOnlineTime?.split('.')[0].replace('T', ' ')
    }
  })
})




// 获取区域列表
const filteredAreas = computed(() => {
  if (!areaStore.areas) return [];
  return areaStore.areas.map((area: any) => ({
    ...area,
    createTime: area.createTime?.split('.')[0].replace('T', ' '),
    updateTime: area.updateTime?.split('.')[0].replace('T', ' '),
  }));
});

// Helper function to load scene data to form
const loadSceneToForm = (scene: any) => {
  // First reset the form to clear any previous data
  resetFormData()

  // Then load the scene data
  if (scene) {
    sceneForm.value.code = scene.code || scene.sceneCode || ''
    sceneForm.value.name = scene.name || scene.sceneName || ''
    sceneForm.value.description = scene.description || scene.sceneDescription || ''
    sceneForm.value.status = scene.status || '1'
    sceneForm.value.domainId = scene.domainId || domainId.value
    sceneForm.value.url = scene.url || ''
    sceneForm.value.imageUrl = scene.imageUrl || ''

    // Load location if available
    // 首先尝试使用location对象
    if (scene.location) {
      sceneForm.value.lng = scene.location.lng
      sceneForm.value.lat = scene.location.lat
    }
    // 如果没有location对象，尝试使用独立的经纬度字段
    else if (scene.longitude !== undefined && scene.latitude !== undefined) {
      sceneForm.value.lng = scene.longitude
      sceneForm.value.lat = scene.latitude
    }
  }
}

const handleEdit = (row: Device) => {
  isEdit.value = true
  deviceForm.value = {
    code: row.deviceCode,
    name: row.deviceName,
    deviceTypeId: row.deviceTypeId? row.deviceTypeId : undefined,
    protocolType: row.protocolType,
    sceneId: row.sceneId,
    deviceLocation: row.deviceLocation,
  }
  currentId.value = row.id
  deviceDialogVisible.value = true
}

// 新增方法：提交设备表单
const submitDeviceForm = async () => {
  if (!deviceFormRef.value) return; // 确保表单引用存在
  await deviceFormRef.value.validate(async (valid) => {
    if (valid) {
      // 验证设备位置是否为有效的区域
      const validLocations = areaStore.areas.map((area) => area.name);
      if (!validLocations.includes(deviceForm.value.deviceLocation)) {
        ElMessage.error('设备位置无效，请从已有区域中选择');
        return;
      }

      submitting.value = true;
      try {
        if (isEdit.value && currentId.value !== null) {
          await deviceStore.updateDevice(currentId.value, { ...deviceForm.value });
          ElMessage.success('更新设备成功');
        } else {
          await deviceStore.createDevice({ ...deviceForm.value });
          ElMessage.success('创建设备成功');
        }
        // 刷新设备列表
        await deviceStore.fetchDevices(sceneId.value);
        loadDeviceConnections();
        deviceDialogVisible.value = false;
      } catch {
        ElMessage.error(isEdit.value ? '更新设备失败' : '创建设备失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const submitAreaForm = async () => {
  console.log("areaForm", areaForm.value)
  if (!areaFormRef.value) return; // 确保表单引用存在
  await areaFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true;
      try {
        if (isEdit.value && currentId.value !== null) {
  await areaStore.updateArea(currentId.value, { ...areaForm.value, sceneId: props.sceneId ?? null });
          ElMessage.success('更新区域成功');
        } else {
  await areaStore.createArea({ ...areaForm.value, sceneId: props.sceneId ?? null });
          ElMessage.success('创建区域成功');
        }

        await areaStore.fetchAreas(sceneId.value);
        areaDialogVisible.value = false;
      } catch {
        ElMessage.error(isEdit.value ? '更新区域失败' : '创建区域失败');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const filteredParentAreas = computed(() => {
  // 获取当前节点到根路径上的所有节点 ID
  const pathIds = getPathNodes(parentNode.value)
  pathIds.push(parentNode.value.id) // 添加当前节点 ID 到路径
  console.log("pathIds", pathIds)
  // 过滤掉路径上的节点
  return areaStore.areas.filter((area) => {
    return !pathIds.includes(area.id) && area.parentId === -1; // 过滤掉路径上的节点并保留根节点
  });
});



// Watch for changes in props and mode to update form data accordingly
const { sceneId: propSceneId, domainId: propDomainId } = toRefs(props)
watch([() => propSceneId.value, () => mode.value, () => propDomainId.value], async ([newSceneId, newMode, newDomainId]) => {
  activeTab.value = "basic"
  // Update domainId in form when it changes
  if (newDomainId != null) {
    sceneForm.value.domainId = newDomainId
  }

  if (newMode === 'create') {
    // Clear form data when switching to create mode
    resetFormData()
  } else if (newMode === 'edit' && newSceneId != null) {
    // Load scene data when switching to edit mode or changing scene ID
    try {
      const res: any = await getSceneById(newSceneId as number)
      if (res.data && res.status === 200) {
        sceneStore.setCurrentScene(res.data)
        loadSceneToForm(res.data)
        deviceTypeList.value = await sceneStore.getSceneDeviceTypes(res.data.sceneId)
        await deviceStore.fetchDevices(newSceneId as number)
        await areaStore.fetchAreas(newSceneId as number)
        // Initialize map after data is loaded
        nextTick(() => {
          if (sceneForm.value.lng && sceneForm.value.lat) {
            
          }
        })
      } else {
        ElMessage.warning('场景数据不存在或获取失败')
        navigateBack()
      }
    } catch (error) {
      console.error('Failed to fetch scene:', error)
      ElMessage.warning('场景数据不存在或获取失败')
      navigateBack()
    }
  }
}, { immediate: true })

// Load scene data if in edit mode
onMounted(async () => {
  activeTab.value = "basic"
  // Get scemeId
  const localSceneId = props.sceneId ?? null

  // Clear form when in create mode
  if (!isEditMode.value) {
    resetFormData()
  }
  else if (isEditMode.value && localSceneId) {
    const currentScene = sceneStore.currentScene

    deviceTypeList.value = await sceneStore.getSceneDeviceTypes(localSceneId as number)

    if (currentScene && currentScene.id === (localSceneId as number)) {
      // Load from current scene in store
      loadSceneToForm(currentScene)

      // Initialize map after data is loaded
      nextTick(() => {
        if (sceneForm.value.lng && sceneForm.value.lat) {
          
        }
      })
    } else {
      // Try to fetch scene data from API if not in store
      try {
        const res: any = await getSceneById(localSceneId as number)
        if (res.data && res.status === 200) {
          sceneStore.setCurrentScene(res.data)
          loadSceneToForm(res.data)

          // Initialize map after data is loaded
          nextTick(() => {
            if (sceneForm.value.lng && sceneForm.value.lat) {
             
            }
          })
        } else {
          ElMessage.warning('场景数据不存在或获取失败')
          navigateBack()
        }
      } catch (error) {
        console.error('Failed to fetch scene:', error)
        ElMessage.warning('场景数据不存在或获取失败')
        navigateBack()
      }
    }
  } else if (!domainId.value) {
    // If not in edit mode and no domain ID, show warning
    ElMessage.warning('请先选择一个领域')
    navigateBack()
  }
  if (localSceneId) {
    await deviceStore.fetchDevices(localSceneId as number)
    // 根据场景 ID 加载区域数据
    await areaStore.fetchAreas(localSceneId as number);
  } else {
    await deviceStore.fetchDevices()
  }

})

onMounted(async () => {
  if (sceneId.value) {
    await areaStore.fetchAreas(sceneId.value); // 加载区域数据
  }
});

const loadDeviceConnections = async () => {
  const res = await deviceStore.fetchDeviceConnections(sceneId.value)
  deviceConnections.value = res
}

onMounted(loadDeviceConnections)

watch(sceneId, loadDeviceConnections)

watch(
  () => areaStore.areas,
  (newAreas) => {
    if (!newAreas.some((area) => area.name === deviceForm.value.deviceLocation)) {
      deviceForm.value.deviceLocation = ''; // 如果当前选择的设备位置无效，则清空
    }
  }
);

onMounted(() => {
  if (treeRef.value && currentNode.value.id) {
    treeRef.value.setCurrentKey(currentNode.value.id);
  }
});

watch(
  () => currentNode.value.id,
  (newId) => {
    if (treeRef.value && newId) {
      treeRef.value.setCurrentKey(newId);
    }
  }
);

// Navigate back to scene list
const navigateBack = () => {
  // if (domainId.value) {
  //   router.push(`/domain/scene/list?domainId=${domainId.value}`)
  // } else {
  //   router.push('/domain/scene/list')
  // }
}

// Submit form - either create or update scene
const submitForm = async () => {
  if (!sceneFormRef.value) return;

  await sceneFormRef.value.validate(async (valid) => {
    if (valid) {
      if (sceneForm.value.lng && (sceneForm.value.lng < lngMIn || sceneForm.value.lng > lngMax)) {
        ElMessage.error('经度范围不合法, 73-135')
        return
      }
      if (sceneForm.value.lat && (sceneForm.value.lat < latMin || sceneForm.value.lat > latMax)) {
        ElMessage.error('纬度范围不合法, 3-53')
        return
      }
      submitting.value = true;
      try {
        if (isEditMode.value) {
          await sceneStore.updateScene(sceneId.value, sceneForm.value)
          ElMessage.success("保存成功")
        } else {
          await sceneStore.createScene(sceneForm.value);
          ElMessage.success('创建成功');
          navigateBack();
        }
      } catch (error) {
        console.error('提交失败:', error);
        ElMessage.error('保存失败，请检查数据是否冲突');
      } finally {
        submitting.value = false;
      }
    }
  });
};

const publishForm = async () => {
  if (!sceneFormRef.value) return

  await sceneFormRef.value.validate(async (valid) => {
    if (valid) {
      if (sceneForm.value.status === '1') {
        sceneStore.publishScene(domainId.value, sceneId.value, '', '0')
          .then((res) => {
            ElMessage.success('取消发布成功')
            loadSceneToForm(res)
          })
          .catch((error) => {
            ElMessage.error('取消发布失败:', error)
          })
      } else {
        dialogVisible.value = true
      }
    }
  })
}

const saveTemplate = async () => {
  if (!sceneFormRef.value) return
  await sceneFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await sceneTemplateStore.saveSceneTemplate(
          sceneStore.currentScene,
          deviceStore.devices,
        )
        ElMessage.success('保存模版成功')
      } catch (error) {
        console.error('保存模版失败:', error)
        ElMessage.error('保存模版失败')
      }
    }
  })
}

const publishScene = () => {
  if (sceneForm.value.url) {
    const locationData = sceneForm.value.lng && sceneForm.value.lat ? { lng: sceneForm.value.lng, lat: sceneForm.value.lat } : undefined
    let dslData = {
      sceneData: {
        ...sceneForm.value,
        location: locationData
      },
      devices: deviceStore.devices.map((d: any) => {
        const dc = deviceConnections.value.find((c: any) => c.id === d.id);
        return {
          ...d,
          connections: dc ? dc.connections : [],
        };
      })
    }
    console.log("dslData", dslData)
    sceneStore.publishScene(domainId.value, sceneId.value, sceneForm.value.url, '1', dslData)
      .then((res) => {
        ElMessage.success('发布成功')
        loadSceneToForm(res)
        dialogVisible.value = false
      }
      ).catch((error) => {
        ElMessage.error('发布失败:', error)
      })
  } else {
    ElMessage.warning('请输入url')
  }
}

//下载发布制品
const handleDownload = async () => {
  sceneStore.downloadScene(sceneId.value).
    then((res) => {
      const jsonString = JSON.stringify(res, (key, value) => {
        // 直接过滤掉 null、undefined、空对象、空数组
        if (value === null || value === undefined ||
          (typeof value === 'object' && Object.keys(value).length === 0) ||
          (Array.isArray(value) && value.length === 0)) {
          return undefined;
        }
        return value;
      }, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      console.log("jsonString", jsonString)
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sceneForm.value.code}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      ElMessage.success("文件正在下载中")
    });
}

// const handleDownload = () => {
//   // 固定数据
//   const data = {
//     name: "example",
//     version: 1,
//     description: "This is a fixed JSON file."
//   };

//   // 转成 JSON 字符串，格式化
//   const jsonData = JSON.stringify(data, null, 2);

//   // 创建 Blob 对象
//   const blob = new Blob([jsonData], { type: 'application/json' });

//   // 生成临时链接
//   const url = window.URL.createObjectURL(blob);

//   // 创建 a 标签模拟点击
//   const link = document.createElement('a');
//   link.href = url;
//   link.setAttribute('download', 'fixed_data.json'); // 下载文件名
//   document.body.appendChild(link);
//   link.click();

//   // 清理
//   link.remove();
//   window.URL.revokeObjectURL(url);

//   ElMessage.success("场景配置文件已下载");
// };


// 添加到 script setup 部分
const handleImageSuccess = (res: any) => {
  sceneForm.value.imageUrl = res;
  ElMessage.success("图片上传成功")
}

const handleImageError = (event: any) => {
  //event.target.src = defaultImage;
}

const handleAreaImageSuccess = (res: any) => {
  areaForm.value.image = res;
  ElMessage.success("图片上传成功");
}

const beforeImageUpload = (file: File) => {
  const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
  const isLt5M = file.size / 1024 / 1024 < 5;

  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG 格式的图片!');
    return false;
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!');
    return false;
  }
  return true;
}

// 编辑区域
const handleEditArea = (row: any) => {
  console.log('编辑区域:', row);
  isEdit.value = true
  areaForm.value = {
    id: row.id,
    name: row.name,
    description: row.description,
    image: row.image,
    position: row.position,
    parentId: row.parentId,
    children: row.children || [] // 确保 children 是数组
  }
  currentId.value = row.id
  areaDialogVisible.value = true
};

// 删除区域
const handleDeleteArea = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除区域 "${row.name}" 吗？`,
    {
      title: '警告',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        await areaStore.deleteArea(row.id); // 调用删除接口
        ElMessage.success('删除成功');

        // 重新请求区域数据
        await areaStore.fetchAreas(sceneId.value);
      } catch (error) {
        ElMessage.error('删除失败');
      }
    })
    .catch(() => {
      // 用户取消操作
    });
};

const treeData = computed(() => {
  console.log('ids', expandedKeys.value);
  return [
    {
      id: areaForm.value.id, // 当前区域的 ID
      name: areaForm.value.name, // 当前区域的名称
      children: areaForm.value.children,// 子节点为空
      parentId: areaForm.value.parentId, // 父区域 ID
    }
  ];
});

const treeProps = {
  children: 'children',
  label: 'name',
};

const handleTreeNodeClick = (node: Area) => {
  console.log('选中区域:', node);
};

const getPathNodes = (node: Area | null): number[] => {
  const pathNodes: number[] = [];
  let currentNode = node;
  while (currentNode) {
    currentNode = findNode(areaForm.value, currentNode.parentId);
    if (!currentNode) break;
    pathNodes.push(currentNode.id);
  }
  return pathNodes;
};

const pathNodeIds = computed<number[]>(() => {
  return getPathNodes(currentNode.value);
});

const expandedKeys = computed(() => {
  return pathNodeIds.value; // 默认展开路径上的节点
});

const addNode = (node: Area) => {
  console.log('当前结点:', node);
  areaSelectionDialogVisible.value = true;
  parentNode.value = node; // 保存父节点
};

const deleteNode = (node: Area) => {
  ElMessageBox.confirm(
    `确定要删除子区域 "${node.name}" 吗？`,
    {
      title: '警告',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      console.log('要删除的结点:', node);
      console.log(areaForm.value)
      const parentNode = findNode(areaForm.value, node.parentId);
      console.log('要删除的结点的父节点:', parentNode);
      if (parentNode && parentNode.children) {
        // 从父节点的 children 中删除当前节点
        const index = parentNode.children.findIndex((child) => child.id === node.id);
        if (index > -1) {
          parentNode.children.splice(index, 1);
          await areaStore.deleteNode(node.id); // 调用删除接口
          await areaStore.fetchAreas(sceneId.value); // 刷新区域数据
        }
        ElMessage.success('节点删除成功');
      }

    })
    .catch(() => {
      console.log('用户取消删除操作');
    });
};

const findNode = (node: Area, parentId: number): Area | null => {
  if (node.id === parentId) {
    return node;
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const result = findNode(child, parentId);
      if (result) {
        return result;
      }
    }
  }
  return null;
};

const confirmAddNode = async () => {
  const parent = parentNode.value; // 获取父节点
  // 将选中的区域添加为子节点
  console.log('父节点:', parent);
  let childIds: number[] = [];
  selectedAreas.value.forEach(async (areaId) => {
    let area = areaStore.areas.find((a) => a.id === areaId);
    childIds.push(areaId);
    area = await areaStore.buildAreaTree(sceneId.value, areaId);
    if (area) {
      const newChild = {
        id: area.id,
        name: area.name,
        children: area.children,
        parentId: parent.id,
      } as Area;
      if (parent.children === null) {
        parent.children = [];
      }
      parent.children.push(newChild);
    }
  });

  // 找到路径上所有点的集合
  const getPathNodes = (node: Area | null): number[] => {
    const pathNodes: number[] = [];
    let currentNode = node;
    while (currentNode) {
      pathNodes.push(currentNode.id); // 保存路径上的节点 ID
      currentNode = findNode(areaForm.value, currentNode.parentId); // 向上查找父节点
    }
    return pathNodes;
  };

  const pathNodeIds = getPathNodes(parent); // 获取路径上的所有节点 ID
  console.log('路径上的节点集合:', pathNodeIds);

  // 检查 childIds 是否在路径节点集合中
  const invalidChildren = childIds.filter((childId) => pathNodeIds.includes(childId));

  if (invalidChildren.length > 0) {
    // 获取不能添加的区域名称
    const invalidAreaNames = invalidChildren.map((childId) => {
      const area = areaStore.areas.find((a) => a.id === childId);
      return area ? area.name : '未知区域';
    });

    // 弹出失败弹窗，告知用户不能添加这些节点
    await ElMessageBox.alert(
      `以下区域不能添加为子区域：${invalidAreaNames.join(', ')}`,
      {
        title: '操作失败',
        confirmButtonText: '确定',
        type: 'error',
      }
    );
    return; // 终止操作
  }

  try {
    // 调用 addChildren 方法
    await areaStore.addChildren(parent.id, childIds);
    // 强制刷新 areas 数据
    await areaStore.fetchAreas(sceneId.value);
    ElMessage.success('子区域添加成功');
  } catch (error) {
    ElMessage.error('添加子节点失败');
  }
  selectedAreas.value = [];
  areaSelectionDialogVisible.value = false;
};

const availableDevices = computed(() => {
  const usedIds = (currentDevice.value.connections || []).map((d: any) => d.id);
  console.log("usedIds", usedIds)
  console.log("current", currentDevice.value)
  return deviceConnections.value.filter((d: any) => !usedIds.includes(d.id) && d.id !== currentDevice.value.id && d.intelligent === true);
});


const availablePositions = computed(() => {
  const usedPositions = (currentDevice.value.connections || []).map((d: any) => d.position);
  console.log("currentDevicesdf", currentDevice.value)
  const positions = currentDevice.value.deviceType.model.properties
    .filter(prop => prop.identify.startsWith('OBJECT'))
    .map(prop => prop.name);
  return positions.filter(pos => !usedPositions.includes(pos));
});

const handleAddConnection = () => {
  selectedPosition.value = undefined;
  selectedDeviceId.value = undefined;
  addInPointDialogVisible.value = true;
};

const confirmAddInPoint = async () => {
  if (!selectedPosition.value) {
    ElMessage.warning('请选择一个接入位置');
    return;
  }
  if (!selectedDeviceId.value) {
    ElMessage.warning('请选择一个设备');
    return;
  }
  try {
    await deviceStore.addConnection(currentDevice.value.id, selectedDeviceId.value, selectedPosition.value);
    await loadDeviceConnections()
    addInPointDialogVisible.value = false;
    ElMessage.success('添加连接设备成功');
    const updated = deviceConnections.value.find((d: any) => d.id === currentDevice.value.id);
    if (updated) currentDevice.value.connections = updated.connections;
  } catch (e) {
    ElMessage.error('添加连接设备失败');
  }
};

</script>

<style scoped>
.scene-setting-container {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.setting-content {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  flex: 1 1 auto;
  min-height: 0; /* 允许在 flex 布局中正确滚动 */
  overflow-y: auto;
}

.location-fields {
  display: flex;
  gap: 10px;
}

.coordinate-input {
  width: 180px;
}

.location-map {
  width: 100%;
  height: 300px;
  margin-top: 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.device-search {
  margin-bottom: 20px;
}

.scene-image-uploader .scene-image {
  width: 200px;
  height: 200px;
  object-fit: cover;
}

.area-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
}

.scene-uploader-icon {
  width: 200px;
  height: 200px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  font-size: 28px;
  color: #8c939d;
  text-align: center;
  line-height: 200px;
}


.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tree-node-label {
  flex: 1;
}

.tree-node-actions {
  display: flex;
  gap: 10px;
}

.add-child-action {
  color: green;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
}

.delete-node-action {
  color: red;
  cursor: pointer;
  font-size: 14px;
}


.area-selection-dialog {
  padding: 20px;
}

.el-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
