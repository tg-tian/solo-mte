<template>
  <div class="scene-setting-container">
    <el-card class="setting-content">
      <el-card class="device-search" shadow="never">
        <div class="device-search-row">
          <el-form :inline="true" :model="searchForm" class="search-form">
            <el-form-item label="设备名称">
              <el-input v-model="searchForm.name" placeholder="请输入设备名称" clearable />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
                <el-option label="在线" :value="1" />
                <el-option label="离线" :value="0" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
          <div class="device-actions">
            <el-button type="primary" @click="selectPageVisible = true">添加设备</el-button>
            <el-button type="primary" @click="handleConfig">平台配置</el-button>
          </div>
        </div>
      </el-card>

      <div v-if="filteredDevices.length > 0">
        <el-table v-loading="deviceStore.loading" :data="filteredDevices" row-key="deviceId" class="device-table" border>
          <el-table-column prop="deviceId" label="设备编码" width="150" />
          <el-table-column prop="deviceName" label="设备名称" min-width="150" />
          <el-table-column prop="category" label="设备类型" width="120" />
          <el-table-column prop="provider" label="设备平台" width="120" />
          <el-table-column label="设备位置" width="120">
            <template #default="scope">
              {{ scope.row?.state?.reported?.location?.name || '' }}
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="180">
            <template #default="scope">
              {{ scope.row?.metadata?.lastUpdated ? new Date(scope.row.metadata.lastUpdated).toLocaleString() : '' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag v-if="scope.row?.metadata?.isOnline" class="device-status-tag" type="success">在线</el-tag>
              <el-tag v-else class="device-status-tag" type="danger">离线</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="320">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
              <el-button type="warning" size="small" :disabled="!scope.row?.metadata?.isOnline" @click="openReportDialog(scope.row)">测试</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <el-empty v-else description="暂无设备" />
    </el-card>

    <el-dialog v-model="deviceDialogVisible" :title="isEdit ? '编辑设备' : '新增设备'" width="50%">
      <el-form ref="deviceFormRef" :model="deviceForm" label-width="120px" :rules="deviceRules">
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="deviceForm.deviceName" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备类型">
          <el-input v-model="deviceForm.category" placeholder="请输入设备类型" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备平台">
          <el-select v-model="deviceForm.provider" disabled>
            <el-option label="MQTT" value="MQTT" />
            <el-option label="HTTP" value="HTTP" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备位置">
          <el-input v-model="deviceForm.state.reported.location.name" placeholder="请输入设备位置" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deviceDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submitDeviceForm">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="reportDialogVisible" :title="reportDialogTitle" width="60%">
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <el-card shadow="never">
          <el-descriptions v-if="Object.keys(reportProperties).length" :column="1" border>
            <el-descriptions-item v-for="(value, key) in reportProperties" :key="String(key)" :label="String(key)">
              <pre style="margin: 0">{{ formatValue(value) }}</pre>
            </el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="无属性" />
        </el-card>

        <el-card v-if="currentDevice?.metaModel?.actions" shadow="never">
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <el-button
              v-for="(action, actionName) in currentDevice.metaModel.actions"
              :key="String(actionName)"
              type="primary"
              plain
              @click="handleAction(String(actionName), action)"
            >
              {{ actionName }}
            </el-button>
          </div>
        </el-card>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="reportDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="actionDialogVisible" :title="currentActionName" width="40%">
      <el-form :model="actionFormModel" label-width="120px">
        <el-form-item v-for="(argDef, argName) in currentActionDef?.arguments" :key="String(argName)" :label="String(argName)" required>
          <el-input-number
            v-if="argDef.type === 'number'"
            v-model="actionFormModel[argName]"
            :min="argDef.min"
            :max="argDef.max"
          />
          <el-select v-else-if="argDef.type === 'enum'" v-model="actionFormModel[argName]" placeholder="请选择">
            <el-option v-for="opt in argDef.enumValues" :key="opt" :label="opt" :value="opt" />
          </el-select>
          <el-input v-else v-model="actionFormModel[argName]" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="actionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitAction">发送</el-button>
        </span>
      </template>
    </el-dialog>

    <DeviceDiscoveryDialog
      v-model:visible="selectPageVisible"
      :devices="selectList"
      :is-added="isInCurrentListByShadow"
      @add="addDeviceFromSelect"
      @config="handleNewConfig"
    />

    <DeviceProviderDialogs
      v-model:list-visible="providerListVisible"
      v-model:form-visible="providerFormVisible"
      :providers="deviceStore.providers"
      :form="providerForm"
      @open-add="openAddProvider"
      @save="submitProvider"
      @delete="handleDeleteProvider"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRefs } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useSceneStore } from '../../store/scene'
import { useDeviceStore } from '../../store/device'
import DeviceDiscoveryDialog from './device-discovery-dialog.vue'
import DeviceProviderDialogs from './device-provider-dialogs.vue'
import type { Device, ProviderConfig } from '../../types/device'

const props = defineProps<{ sceneId: number }>()

const sceneStore = useSceneStore()
const deviceStore = useDeviceStore()
const deviceFormRef = ref<FormInstance>()

const state = reactive({
  searchForm: {
    name: '',
    status: undefined as number | undefined,
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
  currentId: '',
  isEdit: false,
  selectPageVisible: false,
  providerListVisible: false,
  providerFormVisible: false,
  providerForm: {
    provider: '',
    communication: {
      protocol: 'mqtt',
      baseUrl: '',
    },
  } as ProviderConfig,
})

const { searchForm, deviceForm, submitting, deviceDialogVisible, isEdit, currentId, selectPageVisible, providerListVisible, providerFormVisible, providerForm } = toRefs(state)

const deviceRules = {
  deviceName: [
    { required: true, message: '请输入设备名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' },
  ],
}

const selectList = computed(() => deviceStore.discoveredDevices)
const filteredDevices = computed(() => {
  return (deviceStore.devices || []).filter((device: Device) => {
    const nameMatch = !searchForm.value.name || (device.deviceName || '').toLowerCase().includes(searchForm.value.name.toLowerCase())
    const status = searchForm.value.status
    const online = !!device?.metadata?.isOnline
    const statusMatch = status === undefined || status === null ? true : status === 1 ? online : !online
    return nameMatch && statusMatch
  })
})

const reportDialogVisible = ref(false)
const reportDialogTitle = ref('设备测试')
const currentDeviceId = ref('')
const currentDevice = computed(() => deviceStore.devices.find((item: Device) => item.deviceId === currentDeviceId.value) || null)
const reportProperties = computed(() => currentDevice.value?.state?.reported || {})
const actionDialogVisible = ref(false)
const currentActionName = ref('')
const currentActionDef = ref<any>(null)
const actionFormModel = ref<Record<string, any>>({})

function resetSearch() {
  searchForm.value.name = ''
  searchForm.value.status = undefined
}

function handleConfig() {
  providerListVisible.value = true
  deviceStore.fetchProviders()
}

function handleNewConfig(row: Device) {
  console.log('config device', row)
}

function openAddProvider() {
  providerForm.value = {
    provider: '',
    communication: {
      protocol: 'mqtt',
      baseUrl: '',
    },
  } as ProviderConfig
  providerFormVisible.value = true
}

async function submitProvider() {
  if (!providerForm.value.provider || !providerForm.value.communication.baseUrl) {
    ElMessage.error('请填写完整信息')
    return
  }
  try {
    await deviceStore.createProvider({ ...providerForm.value })
    ElMessage.success('保存成功')
    providerFormVisible.value = false
  } catch {
    ElMessage.error('保存失败')
  }
}

async function handleDeleteProvider(row: ProviderConfig) {
  try {
    await ElMessageBox.confirm(`确定删除配置 ${row.provider} ?`, '提示', { type: 'warning' })
    await deviceStore.deleteProvider(row.provider)
    ElMessage.success('删除成功')
  } catch {}
}

function handleEdit(row: Device) {
  isEdit.value = true
  currentId.value = row.deviceId
  deviceForm.value = {
    deviceId: row.deviceId || '',
    provider: row.provider || 'MQTT',
    category: row.category || '',
    deviceName: row.deviceName || '',
    state: {
      reported: { location: { name: row?.state?.reported?.location?.name || '' } },
      desired: row?.state?.desired || {},
    },
    metadata: {
      lastUpdated: row?.metadata?.lastUpdated || Date.now(),
      isOnline: !!row?.metadata?.isOnline,
      version: row?.metadata?.version ?? 1,
    },
  }
  deviceDialogVisible.value = true
}

async function handleDelete(row: Device) {
  try {
    await ElMessageBox.confirm(`确定要删除设备 "${row.deviceName}" 吗？`, '警告', { type: 'warning' })
    const ok = await deviceStore.deleteDevice(row.deviceId)
    if (ok) ElMessage.success('删除成功')
    else ElMessage.error('删除失败')
  } catch {}
}

async function submitDeviceForm() {
  if (isEdit.value) {
    const name = deviceForm.value.deviceName?.trim()
    if (!name) {
      ElMessage.error('设备名称不能为空')
      return
    }
    submitting.value = true
    try {
      const payload: Partial<Device> = {
        deviceName: name,
        provider: deviceForm.value.provider,
        category: deviceForm.value.category,
        state: {
          reported: {
            ...(deviceForm.value.state?.reported || {}),
            location: {
              ...(deviceForm.value.state?.reported?.location || {}),
              name: deviceForm.value.state?.reported?.location?.name || '',
            },
          },
        },
        metadata: {
          lastUpdated: Date.now(),
          isOnline: !!deviceForm.value.metadata?.isOnline,
          version: deviceForm.value.metadata?.version ?? 1,
        },
      }
      await deviceStore.updateDevice(currentId.value, payload)
      ElMessage.success('更新设备成功')
      deviceDialogVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }

  if (!deviceFormRef.value) return
  await deviceFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await deviceStore.createDevice({
        deviceId: deviceForm.value.deviceId,
        provider: deviceForm.value.provider,
        category: deviceForm.value.category,
        isAccessible: true,
        deviceName: deviceForm.value.deviceName,
        state: {
          reported: deviceForm.value.state?.reported || {},
          desired: deviceForm.value.state?.desired || {},
        },
        metadata: deviceForm.value.metadata,
      } as Device)
      ElMessage.success('创建设备成功')
      deviceDialogVisible.value = false
    } catch {
      ElMessage.error('创建设备失败')
    } finally {
      submitting.value = false
    }
  })
}

function openReportDialog(row: Device) {
  currentDeviceId.value = row.deviceId
  reportDialogTitle.value = `${row.deviceName} 设备测试`
  reportDialogVisible.value = true
}

function formatValue(val: unknown) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

async function handleAction(actionName: string, action: any) {
  if (!currentDevice.value) return
  if (!action.arguments || Object.keys(action.arguments).length === 0) {
    try {
      await deviceStore.sendCommand({ deviceId: currentDevice.value.deviceId, action: actionName, params: {} })
      ElMessage.success('指令下发成功')
    } catch {
      ElMessage.error('指令下发失败')
    }
    return
  }
  currentActionName.value = actionName
  currentActionDef.value = action
  actionFormModel.value = {}
  actionDialogVisible.value = true
}

async function submitAction() {
  if (!currentDevice.value) return
  try {
    await deviceStore.sendCommand({
      deviceId: currentDevice.value.deviceId,
      action: currentActionName.value,
      params: actionFormModel.value,
    })
    ElMessage.success('指令下发成功')
    actionDialogVisible.value = false
  } catch {
    ElMessage.error('指令下发失败')
  }
}

function isInCurrentListByShadow(row: Device) {
  return (deviceStore.devices || []).some((item: Device) => item.deviceId === row.deviceId)
}

async function addDeviceFromSelect(row: Device) {
  if (isInCurrentListByShadow(row)) {
    ElMessage.info('该设备已在当前列表中')
    return
  }
  try {
    await deviceStore.createDevice({
      deviceId: row.deviceId,
      provider: row.provider || 'MQTT',
      category: row.category || '',
      deviceName: row.deviceName || row.deviceId,
      isAccessible: row.isAccessible !== false,
      metaModel: row.metaModel || null,
      state: { reported: row?.state?.reported || {} },
      metadata: {
        lastUpdated: Date.now(),
        isOnline: !!row?.metadata?.isOnline,
        version: row?.metadata?.version ?? 1,
      },
    } as Device)
    ElMessage.success(`设备 "${row.deviceName || row.deviceId}" 已添加`)
  } catch {
    ElMessage.error('添加设备失败')
  }
}

onMounted(async () => {
  if (props.sceneId) {
    await sceneStore.fetchSceneById(props.sceneId)
  }
  await deviceStore.fetchDevices()
  await deviceStore.discoverDevices()
  deviceStore.connectShadowStream()
})

onBeforeUnmount(() => {
  deviceStore.disconnectShadowStream()
})
</script>

<style scoped>
.scene-setting-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.setting-content {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
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

.device-status-tag {
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
}
</style>
