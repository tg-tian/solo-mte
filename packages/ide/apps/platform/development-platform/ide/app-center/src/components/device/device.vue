<template>
  <div class="scene-setting-container">
    <div class="scene-header">
      <h2>{{ sceneName }} </h2>
    </div>
    <el-card class="setting-content">
      <el-card class="device-search">
        <div class="device-search-row">
          <el-form :inline="true" :model="searchForm" class="search-form">
            <el-form-item label="设备名称">
              <el-input v-model="searchForm.name" placeholder="请输入设备名称" clearable></el-input>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
                <el-option label="在线" :value="Number(1)"></el-option>
                <el-option label="离线" :value="Number(0)"></el-option>
                <el-option label="未激活" :value="Number(2)"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
          <div class="device-actions">
            <el-button type="primary" @click="handleAddDevice">添加设备</el-button>
          </div>
        </div>
      </el-card>
          <div v-if="filteredDevices && filteredDevices.length > 0">
            <el-table v-loading="deviceStore.loading" :data="filteredDevices" class="device-table" border>
              <el-table-column prop="deviceId" label="设备编码" width="150"></el-table-column>
              <el-table-column prop="deviceName" label="设备名称" min-width="150"></el-table-column>
              <el-table-column prop="category" label="设备类型" width="120"></el-table-column>
              <el-table-column prop="provider" label="设备平台" width="120"></el-table-column>
              <el-table-column label="设备位置" width="120">
                <template #default="scope">
                  {{ scope.row?.state?.reported?.location?.name || '' }}
                </template>
              </el-table-column>
              <el-table-column label="更新时间" width="150">
                <template #default="scope">
                  {{ scope.row?.metadata?.lastUpdated }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="scope">
                  <el-tag v-if="scope.row?.metadata?.isOnline" type="success">在线</el-tag>
                  <el-tag v-else type="danger">离线</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="320">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
                  <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
                  <el-button type="warning" size="small" @click="openReportDialog(scope.row)">测试</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty v-else description="暂无设备" />
    </el-card>


    <el-dialog v-model="deviceDialogVisible" :title="isEdit ? '编辑设备' : '添加设备'" width="50%">
      <el-form :model="deviceForm" label-width="120px" :rules="deviceRules" ref="deviceFormRef">
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="deviceForm.deviceName" placeholder="请输入设备名称"></el-input>
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备类型">
          <el-input v-model="deviceForm.category" placeholder="请输入设备类型"></el-input>
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备平台">
          <el-select v-model="deviceForm.provider" placeholder="请选择协议类型">
            <el-option label="MQTT" value="MQTT"></el-option>
            <el-option label="HTTP" value="HTTP"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备位置">
          <el-input v-model="deviceForm.state.reported.location.name" placeholder="请输入设备位置"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deviceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitDeviceForm" :loading="submitting">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="reportDialogVisible" :title="reportDialogTitle" width="50%">
      <el-descriptions v-if="Object.keys(reportProperties).length" :column="1" border>
        <el-descriptions-item v-for="(value, key) in reportProperties" :key="key" :label="key">
          <pre style="margin:0">{{ formatValue(value) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="无属性" />
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="reportDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="selectPageVisible" title="已发现设备" width="60%">
      <el-table :data="selectList" class="device-table" border v-loading="selectLoading">
        <el-table-column prop="deviceId" label="设备编码" width="180" />
        <el-table-column prop="deviceName" label="设备名称" min-width="160" />
        <el-table-column prop="category" label="设备类型" width="140" />
        <el-table-column prop="provider" label="设备平台" width="120" />
        <el-table-column label="操作" width="160">
          <template #default="scope">
            <el-button type="primary" size="small" :disabled="isInCurrentListByShadow(scope.row)" @click="addDeviceFromSelect(scope.row)">
              {{ isInCurrentListByShadow(scope.row) ? '已添加' : '添加' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="closeSelectPage">关闭</el-button>
      </template>
    </el-dialog>

  </div>

</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, toRefs } from 'vue'
import { useSceneStore } from '../../store/scene'
import { useDeviceStore } from '../../store/device'
import { getSceneById } from '../../api/scene'
import { useDeviceShadowStore } from '../../store/deviceshadow'
import { getDeviceShadows } from '../../api/deviceshadow'
import type { DeviceShadow, Device } from '../../types/models'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
 
const props = defineProps<{ domainId: number ; sceneId: number }>()
const sceneStore = useSceneStore()
const deviceStore = useDeviceStore()
const shadowStore = useDeviceShadowStore()
const deviceFormRef = ref<FormInstance>()           // 新增：设备对话框表单引用
 

// State
const state = reactive({
  searchForm: {
    name: '',
    status: 0
  },
  deviceForm: {
    deviceId: '',
    provider: 'MQTT',
    category: '',
    deviceName: '',
    state: { reported: { location: { name: '' } }, desired: {} },
    metadata: { lastUpdated: Date.now(), isOnline: true, version: 1 },
  },
  submitting: false,
  deviceDialogVisible: false,
  currentId: 0,
  isEdit: false,
  selectPageVisible: false,
  selectList: [] as DeviceShadow[],
  selectLoading: false,
})

const { submitting, searchForm, isEdit, deviceForm, currentId, deviceDialogVisible } = toRefs(state)
const { selectPageVisible, selectList, selectLoading } = toRefs(state)

// Get current scene ID from query params
const sceneId = computed(() => {
  return props.sceneId
})

const sceneName = computed(() => sceneStore.currentScene?.name || '')
 

// 添加设备：打开对话框并重置表单
const handleAddDevice = () => {
  openSelectPage()
}



const handleSearch = () => {
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除设备 "${row.deviceName}" 吗？`,
    {
      title: '警告',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    },
  )
    .then(() => {
      deleteDevice(row)
    })
    .catch(() => {
      // 用户取消操作
    })
}



const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.status = 0
}


const domainId = computed(() => {
  return props.domainId ?? null
})

const deviceRules = {
  deviceName: [
    { required: true, message: '请输入设备名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
}
const filteredDevices = computed(() => {
  const source = (deviceStore.devices || []) as Device[]
  return source.filter((device: Device) => {
    const nameMatch = !searchForm.value.name || (device.deviceName || '').toLowerCase().includes(searchForm.value.name.toLowerCase())
    const s = searchForm.value.status
    const online = !!device?.metadata?.isOnline
    const statusMatch = !s || (s === 1 ? online : s === 0 ? online === false : true)
    return nameMatch && statusMatch
  })
})

 

const reportDialogVisible = ref(false)
const reportDialogTitle = ref('设备消息上报')
const reportProperties = ref<Record<string, any>>({})
const openReportDialog = (row: any) => {
  const reported = row?.state?.reported || {}
  reportProperties.value = reported
  reportDialogTitle.value = `${row.deviceName} 消息上报`
  reportDialogVisible.value = true
}
const formatValue = (val: any) => {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

const handleEdit = (row: any) => {
  isEdit.value = true
  deviceForm.value = {
    deviceId: row?.deviceId || '',
    provider: row?.provider || 'MQTT',
    category: row?.category || '',
    deviceName: row?.deviceName || '',
    state: { reported: { location: { name: row?.state?.reported?.location?.name || '' } }, desired: row?.state?.desired || {} },
    metadata: { lastUpdated: row?.metadata?.lastUpdated || Date.now(), isOnline: !!row?.metadata?.isOnline, version: row?.metadata?.version ?? 1 },
  }
  currentId.value = deviceForm.value.deviceId as any
  deviceDialogVisible.value = true
}

// 新增方法：提交设备表单
const submitDeviceForm = async () => {
  if (isEdit.value) {
    const name = deviceForm.value.deviceName?.trim()
    if (!name) {
      ElMessage.error('设备名称不能为空')
      return
    }
    submitting.value = true
    try {
      const payload = {
        deviceName: name,
        provider: deviceForm.value.provider,
        category: deviceForm.value.category,
        state: {
          reported: {
            ...(deviceForm.value.state?.reported || {}),
            location: {
              ...(deviceForm.value.state?.reported?.location || {}),
              name: deviceForm.value.state?.reported?.location?.name || ''
            }
          }
        },
        metadata: {
          lastUpdated: Date.now(),
          isOnline: !!deviceForm.value.metadata?.isOnline,
          version: deviceForm.value.metadata?.version ?? 1
        }
      } as Partial<Device>
      await deviceStore.updateDevice(String(currentId.value), payload)
      await deviceStore.fetchDevices()
      ElMessage.success('更新设备成功')
      deviceDialogVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  if (!deviceFormRef.value) return
  await deviceFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        await deviceStore.createDevice({
          deviceId: deviceForm.value.deviceId,
          provider: deviceForm.value.provider,
          category: deviceForm.value.category,
          deviceName: deviceForm.value.deviceName,
          state: { reported: deviceForm.value.state?.reported || {}, desired: deviceForm.value.state?.desired || {} },
          metadata: deviceForm.value.metadata || { lastUpdated: Date.now(), isOnline: true, version: 1 }
        } as Device)
        await deviceStore.fetchDevices()
        ElMessage.success('创建设备成功')
        deviceDialogVisible.value = false
      } catch {
        ElMessage.error('创建设备失败')
      } finally {
        submitting.value = false
      }
    }
  })
};

const openSelectPage = async () => {
  selectPageVisible.value = true
  selectLoading.value = true
  try {
    const res: any = await getDeviceShadows()
    let raw = res?.data
    if (typeof raw === 'string') { try { raw = JSON.parse(raw) } catch {} }
    const data = Array.isArray(raw) ? raw : (raw?.data || raw?.devices || [])
    selectList.value = data
  } finally {
    selectLoading.value = false
  }
}

const closeSelectPage = () => {
  selectPageVisible.value = false
}

const isInCurrentListByShadow = (row: DeviceShadow) => {
  return (deviceStore.devices || []).some((d: any) => d.deviceId === row.deviceId)
}

const addDeviceFromSelect = async (row: DeviceShadow) => {
  if (isInCurrentListByShadow(row)) {
    ElMessage.info('该设备已在当前列表中')
    return
  }
  const reported = row?.state?.reported || {}
  try {
    await deviceStore.createDevice({
      deviceId: row.deviceId,
      provider: row.provider || 'MQTT',
      category: row.category || '',
      deviceName: row.deviceName || row.deviceId,
      state: { reported },
      metadata: { lastUpdated: Date.now(), isOnline: !!row?.metadata?.isOnline, version: row?.metadata?.version ?? 1 }
    } as Device)
    await deviceStore.fetchDevices()
    ElMessage.success(`设备 "${row.deviceName || row.deviceId}" 已添加`)
  } catch {
    ElMessage.error('添加设备失败')
  }
}

const deleteDevice = async (row: any) => {
  try {
    const id = row?.deviceId || row?.id
    const res = await deviceStore.deleteDevice(id)
    if (res) {
      await deviceStore.fetchDevices()
      ElMessage.success('删除成功')
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(async () => {
  const localSceneId = sceneId.value as number
  try {
    const res: any = await getSceneById(localSceneId)
    if (res.data && res.status === 200) {
      sceneStore.setCurrentScene(res.data)
    }
  } catch {}
  await deviceStore.fetchDevices()
  deviceStore.connectShadowStream()
});
onBeforeUnmount(() => {
  deviceStore.disconnectShadowStream()
})
 
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

.device-search-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.search-form {
  flex: 1 1 auto;
}

.device-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-table {
  width: 100%;
  margin-top: 20px;
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
