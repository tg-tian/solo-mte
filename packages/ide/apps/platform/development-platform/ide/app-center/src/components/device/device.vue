<template>
  <div class="scene-setting-container">
    <el-card class="setting-content">
      <el-tabs v-model="activeTab" class="device-tabs">
        <el-tab-pane label="设备管理" name="devices">
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
                <el-button @click="openLibraryConfig">配置设备库</el-button>
                <el-button type="primary" @click="handleConfig">物理平台配置</el-button>
              </div>
            </div>
          </el-card>

          <div v-if="filteredDevices.length > 0">
            <el-table v-loading="deviceStore.loading" :data="filteredDevices" row-key="deviceId" class="device-table" border>
              <el-table-column prop="deviceId" label="设备编码" width="150" />
              <el-table-column prop="deviceName" label="设备名称" min-width="150" />
              <el-table-column prop="category" label="设备类型" width="120" />
              <el-table-column prop="provider" label="设备平台" width="120" />
              <el-table-column label="设备位置" width="160">
                <template #default="scope">
                  {{ getAreaDisplayName(scope.row) || scope.row?.state?.reported?.location?.name || '' }}
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
        </el-tab-pane>

        <el-tab-pane label="事件统计" name="events">
          <el-card shadow="never" class="event-stats-toolbar-card">
            <div class="event-stats-toolbar">
              <el-select v-model="eventDeviceFilter" clearable filterable placeholder="按设备过滤" style="width: 260px">
                <el-option
                  v-for="device in eventDeviceOptions"
                  :key="device.deviceId"
                  :label="device.deviceName || device.deviceId"
                  :value="device.deviceId"
                />
              </el-select>
              <el-button @click="clearEvents">清空事件缓存</el-button>
            </div>
          </el-card>

          <el-row :gutter="16" class="event-summary-row">
            <el-col :xs="24" :sm="8">
              <el-card shadow="hover">
                <div class="summary-item"><span>事件总数</span><strong>{{ filteredEvents.length }}</strong></div>
              </el-card>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-card shadow="hover">
                <div class="summary-item"><span>上报设备数</span><strong>{{ eventDeviceCount }}</strong></div>
              </el-card>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-card shadow="hover">
                <div class="summary-item"><span>事件类型数</span><strong>{{ eventTypeCount }}</strong></div>
              </el-card>
            </el-col>
          </el-row>

          <el-row :gutter="16">
            <el-col :xs="24" :lg="10">
              <el-card shadow="never">
                <template #header>
                  <div class="panel-header">
                    <span>设备事件统计</span>
                  </div>
                </template>
                <el-table :data="deviceEventStats" border>
                  <el-table-column prop="deviceName" label="设备名称" min-width="140" />
                  <el-table-column prop="deviceId" label="设备编码" min-width="150" />
                  <el-table-column prop="count" label="事件数" width="100" />
                  <el-table-column prop="typesText" label="事件类型" min-width="180" show-overflow-tooltip />
                </el-table>
              </el-card>
            </el-col>
            <el-col :xs="24" :lg="14">
              <el-card shadow="never">
                <template #header>
                  <div class="panel-header">
                    <span>事件明细</span>
                  </div>
                </template>
                <div class="event-list-full">
                  <el-card v-for="(event, index) in filteredEvents" :key="`${event.deviceId}-${event.timestamp}-${index}`" shadow="hover" class="event-card">
                    <div class="event-card-head">
                      <div>
                        <strong>{{ getDeviceDisplayName(event.deviceId) }}</strong>
                        <div class="event-card-sub">{{ event.deviceId }}</div>
                      </div>
                      <div class="event-card-right">
                        <el-tag size="small">{{ getEventType(event) }}</el-tag>
                        <span>{{ formatTime(event.timestamp) }}</span>
                      </div>
                    </div>
                    <pre>{{ formatValue(event.payload) }}</pre>
                  </el-card>
                  <el-empty v-if="!filteredEvents.length" description="暂无事件" />
                </div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
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
        <el-form-item v-if="isEdit" label="所属区域">
          <el-select v-model="deviceForm.area" value-key="id" placeholder="请选择当前场景区域" clearable>
            <el-option
              v-for="area in areaStore.areas"
              :key="area.id"
              :label="area.name"
              :value="area"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isEdit" label="设备位置">
          <el-input :model-value="deviceForm.area?.name || deviceForm.state.reported.location.name" placeholder="请选择所属区域" readonly />
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
      @configure="openWorkbenchForDevice"
    />

    <DeviceProviderDialogs
      v-model:list-visible="providerListVisible"
      v-model:form-visible="providerFormVisible"
      v-model:library-visible="libraryConfigVisible"
      v-model:mapper-loader-url="mapperLoaderUrl"
      :providers="deviceStore.providers"
      :form="providerForm"
      :is-edit="providerFormEditMode"
      @open-add="openAddProvider"
      @open-library-config="openLibraryConfig"
      @edit="openEditProvider"
      @save="submitProvider"
      @save-library-config="submitLibraryConfig"
      @delete="handleDeleteProvider"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRefs } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useSceneStore } from '../../store/scene'
import { useAreaStore } from '../../store/area'
import { useDeviceStore } from '../../store/device'
import DeviceDiscoveryDialog from './device-discovery-dialog.vue'
import DeviceProviderDialogs from './device-provider-dialogs.vue'
import type { Device, ProviderConfig } from '../../types/device'
import type { Area } from '../../types/scene'

const props = defineProps<{ sceneId: number }>()

const sceneStore = useSceneStore()
const areaStore = useAreaStore()
const deviceStore = useDeviceStore()
const deviceFormRef = ref<FormInstance>()
const activeTab = ref('devices')
const eventDeviceFilter = ref('')

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
    area: null as Area | null,
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
  libraryConfigVisible: false,
  providerFormEditMode: false,
  providerEditingId: '',
  mapperLoaderUrl: '',
  providerForm: {
    provider: '',
    communication: {
      protocol: 'mqtt',
      baseUrl: '',
    },
  } as ProviderConfig,
})

const { searchForm, deviceForm, submitting, deviceDialogVisible, isEdit, currentId, selectPageVisible, providerListVisible, providerFormVisible, libraryConfigVisible, providerForm, providerFormEditMode, providerEditingId, mapperLoaderUrl } = toRefs(state)

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

const eventDeviceOptions = computed(() => {
  const map = new Map<string, Device>()
  for (const device of deviceStore.devices || []) map.set(device.deviceId, device)
  for (const event of deviceStore.recentEvents || []) {
    if (event?.deviceId && !map.has(event.deviceId)) {
      map.set(event.deviceId, { deviceId: event.deviceId, deviceName: event.deviceId } as Device)
    }
  }
  return Array.from(map.values())
})

const filteredEvents = computed(() => {
  const list = deviceStore.recentEvents || []
  if (!eventDeviceFilter.value) return list
  return list.filter((event: any) => event?.deviceId === eventDeviceFilter.value)
})

const deviceEventStats = computed(() => {
  const grouped = new Map<string, { deviceId: string; deviceName: string; count: number; types: Set<string> }>()
  for (const event of filteredEvents.value) {
    const deviceId = event?.deviceId || 'unknown'
    const name = getDeviceDisplayName(deviceId)
    if (!grouped.has(deviceId)) {
      grouped.set(deviceId, { deviceId, deviceName: name, count: 0, types: new Set<string>() })
    }
    const current = grouped.get(deviceId)!
    current.count += 1
    current.types.add(getEventType(event))
  }
  return Array.from(grouped.values()).map((item) => ({
    ...item,
    typesText: Array.from(item.types).join('、') || '-',
  }))
})

const eventDeviceCount = computed(() => deviceEventStats.value.length)
const eventTypeCount = computed(() => {
  const set = new Set<string>()
  for (const event of filteredEvents.value) set.add(getEventType(event))
  return set.size
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

async function handleConfig() {
  providerListVisible.value = true
  await Promise.all([deviceStore.fetchProviders(), deviceStore.fetchMapperLoaderUrl()])
  mapperLoaderUrl.value = deviceStore.mapperLoaderUrl || ''
}

async function openLibraryConfig() {
  if (!mapperLoaderUrl.value) {
    await deviceStore.fetchMapperLoaderUrl()
    mapperLoaderUrl.value = deviceStore.mapperLoaderUrl || ''
  }
  libraryConfigVisible.value = true
}

function openAddProvider() {
  providerFormEditMode.value = false
  providerEditingId.value = ''
  providerForm.value = {
    provider: '',
    communication: {
      protocol: 'mqtt',
      baseUrl: '',
    },
  } as ProviderConfig
  providerFormVisible.value = true
}

function openEditProvider(row: ProviderConfig) {
  providerFormEditMode.value = true
  providerEditingId.value = row.provider
  providerForm.value = {
    provider: row.provider,
    communication: {
      protocol: row.communication?.protocol || 'mqtt',
      baseUrl: row.communication?.baseUrl || '',
    },
    auth: row.auth,
  } as ProviderConfig
  providerFormVisible.value = true
}

async function submitProvider() {
  if (!providerForm.value.provider || !providerForm.value.communication.baseUrl) {
    ElMessage.error('请填写完整信息')
    return
  }
  try {
    const payload = { ...providerForm.value }
    const ok = providerFormEditMode.value
      ? await deviceStore.updateProvider(providerEditingId.value || providerForm.value.provider, payload)
      : await deviceStore.createProvider(payload)

    if (!ok) {
      ElMessage.error(providerFormEditMode.value ? '更新失败' : '保存失败')
      return
    }

    ElMessage.success(providerFormEditMode.value ? '更新成功' : '保存成功')
    providerFormVisible.value = false
    await deviceStore.fetchProviders()
  } catch {
    ElMessage.error(providerFormEditMode.value ? '更新失败' : '保存失败')
  }
}

async function handleDeleteProvider(row: ProviderConfig) {
  try {
    await ElMessageBox.confirm(`确定删除配置 ${row.provider} ?`, '提示', { type: 'warning' })
    await deviceStore.deleteProvider(row.provider)
    ElMessage.success('删除成功')
    await deviceStore.fetchProviders()
  } catch {}
}

async function submitLibraryConfig() {
  const url = mapperLoaderUrl.value.trim()
  if (!url) {
    ElMessage.error('请填写设备库地址')
    return
  }

  try {
    const ok = await deviceStore.updateMapperLoaderUrl(url)
    if (!ok) {
      ElMessage.error('设备库地址保存失败')
      return
    }
    mapperLoaderUrl.value = deviceStore.mapperLoaderUrl || url
    libraryConfigVisible.value = false
    ElMessage.success('设备库地址已更新')
  } catch {
    ElMessage.error('设备库地址保存失败')
  }
}

function handleEdit(row: Device) {
  isEdit.value = true
  currentId.value = row.deviceId
  deviceForm.value = {
    deviceId: row.deviceId || '',
    provider: row.provider || 'MQTT',
    category: row.category || '',
    deviceName: row.deviceName || '',
    area: resolveAreaFromDevice(row),
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
      const selectedArea = deviceForm.value.area || null
      const payload: Partial<Device> = {
        deviceName: name,
        provider: deviceForm.value.provider,
        category: deviceForm.value.category,
        area: selectedArea,
        state: {
          reported: {
            ...(deviceForm.value.state?.reported || {}),
            location: {
              ...(deviceForm.value.state?.reported?.location || {}),
              name: selectedArea?.name || deviceForm.value.state?.reported?.location?.name || '',
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

function resolveAreaFromDevice(device: Device): Area | null {
  if (device?.area && typeof device.area === 'object' && 'id' in device.area) {
    const matched = areaStore.areas.find((area) => area.id === Number((device.area as Area).id))
    return matched || (device.area as Area)
  }
  const locationName = device?.state?.reported?.location?.name
  if (!locationName) return null
  return areaStore.areas.find((area) => area.name === locationName) || null
}

function getAreaDisplayName(device: Device) {
  return resolveAreaFromDevice(device)?.name || ''
}

function formatValue(val: unknown) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}

function formatTime(val?: number) {
  return val ? new Date(val).toLocaleString() : '-'
}

function getDeviceDisplayName(deviceId?: string) {
  if (!deviceId) return '未知设备'
  const matched = (deviceStore.devices || []).find((item) => item.deviceId === deviceId)
  return matched?.deviceName || deviceId
}

function getEventType(event: any) {
  const payload = event?.payload
  if (!payload || typeof payload !== 'object') return 'unknown'
  if (typeof payload.type === 'string' && payload.type) return payload.type
  if (typeof payload.eventType === 'string' && payload.eventType) return payload.eventType
  if (typeof payload.name === 'string' && payload.name) return payload.name
  const keys = Object.keys(payload)
  return keys[0] || 'unknown'
}

async function handleAction(actionName: string, action: any) {
  if (!currentDevice.value) return
  if (!action.arguments || Object.keys(action.arguments).length === 0) {
    try {
      await deviceStore.sendCommand({ deviceId: currentDevice.value.deviceId, action: actionName, params: {} } as any)
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
    } as any)
    ElMessage.success('指令下发成功')
    actionDialogVisible.value = false
  } catch {
    ElMessage.error('指令下发失败')
  }
}

function isInCurrentListByShadow(row: Device) {
  return (deviceStore.devices || []).some((item: Device) => item.deviceId === row.deviceId)
}

function getWorkbenchBaseUrl() {
  return import.meta.env.VITE_WORKBENCH_TARGET_BASE_URL || 'http://139.196.239.110:5173/'
}

function buildWorkbenchUrl(menuPath: string, query: Record<string, string | number | undefined> = {}) {
  const url = new URL(menuPath, getWorkbenchBaseUrl())
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}` !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

function openWorkbenchForDevice(row: Device) {
  if (row.inaccessibleReason === 'missing_library_url') {
    openLibraryConfig()
    ElMessage.warning('请先配置设备库地址，再继续处理设备模型或 Mapper')
    return
  }

  const deviceId = row.deviceId || ''
  const deviceName = row.deviceName || ''
  const provider = row.provider || ''
  const deviceModel = (row as any).deviceModel || ''
  const category = row.category || ''

  const commonQuery = {
    source: 'app-center',
    deviceId,
    deviceName,
    provider,
    deviceModel,
    category,
  }

  let targetUrl = ''
  if (row.isAccessible === false) {
    if (row.inaccessibleReason === 'missing_model') {
      targetUrl = buildWorkbenchUrl('apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-model-list/index.html#/setting', {
        mode: 'create',
        ...commonQuery,
      })
    } else {
      targetUrl = buildWorkbenchUrl('apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-list/index.html', commonQuery)
    }
  } else {
    targetUrl = buildWorkbenchUrl('apps/meta-modeling/meta-modeling-l2/meta-modeling-l3/device-list/index.html', commonQuery)
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer')
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

function clearEvents() {
  deviceStore.recentEvents = []
}

onMounted(async () => {
  if (props.sceneId) {
    await sceneStore.fetchSceneById(props.sceneId)
    await areaStore.fetchAreas(props.sceneId)
  }
  await deviceStore.fetchDevices()
  await deviceStore.discoverDevices()
  await deviceStore.fetchProviders()
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

.event-stats-toolbar-card {
  margin-bottom: 16px;
}

.event-stats-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.event-summary-row {
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-item span {
  color: #909399;
}

.summary-item strong {
  font-size: 28px;
  color: #303133;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.event-list-full {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-card {
  background: #f8fafc;
  border: 1px solid #ebeef5;
}

.event-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.event-card-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.event-card-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 12px;
}

.event-card pre,
.shadow-viewer {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  max-height: 320px;
  overflow: auto;
  background: #0f172a;
  color: #e5e7eb;
  padding: 12px;
  border-radius: 6px;
}
</style>
