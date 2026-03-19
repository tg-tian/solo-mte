<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">设备列表</h2>
        <p class="page-sub-title">定义物理设备与平台设备模型之间的映射关系及驱动配置</p>
      </div>
      <el-button type="primary" class="create-btn" @click="handleCreate">
        <el-icon><Plus /></el-icon>创建设备
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="供应商">
          <el-select v-model="searchForm.provider" placeholder="全部" clearable style="width: 150px">
            <el-option label="MQTT" value="mqtt" />
            <el-option label="浪潮 IOT" value="inspire_iot" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="searchForm.deviceName" placeholder="请输入设备名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-table
      v-loading="store.loading"
      :data="formattedRecords"
      style="width: 100%; margin-top: 24px"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column prop="deviceId" label="设备ID" min-width="150" align="center">
        <template #default="{ row }">
          <el-tag size="small" effect="plain">{{ row.deviceId }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="deviceName" label="设备名称" min-width="150">
        <template #default="{ row }">
          <span class="model-name-text">{{ row.deviceName }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="provider" label="供应商" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="row.provider === 'mqtt' ? 'success' : 'warning'" size="small" effect="light">
            {{ row.provider }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="设备模型" min-width="150" align="center">
        <template #default="{ row }">
          {{ getModelName(row.modelId) }}
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" min-width="180" align="center" />
      <el-table-column prop="updateTime" label="更新时间" min-width="180" align="center" />
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="success" @click="viewMapper(row)">查看驱动</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="searchForm.current"
        v-model:page-size="searchForm.size"
        :total="store.deviceList.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSearch"
        @current-change="handleSearch"
      />
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设备' : '创建设备'"
      width="700px"
      destroy-on-close
      custom-class="premium-dialog"
      height="50vh"
      body-class="premium-dialog-body"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="premium-form"
      >
        <div class="form-grid">
          <el-form-item label="供应商" prop="provider">
            <el-select v-model="form.provider" placeholder="请选择供应商" style="width: 100%">
              <el-option label="MQTT" value="mqtt" />
              <el-option label="浪潮 IOT" value="inspire_iot" />
            </el-select>
          </el-form-item>
          <el-form-item label="设备模型" prop="modelId">
            <el-select 
              v-model="form.modelId" 
              placeholder="请选择设备模型" 
              style="width: 100%"
              filterable
              @change="handleDeviceTypeChange"
            >
              <el-option
                v-for="item in deviceModelStore.deviceModels"
                :key="item.id"
                :label="item.modelName"
                :value="item.modelId"
              />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-grid">
          <el-form-item label="设备ID" prop="deviceId">
            <el-input v-model="form.deviceId" placeholder="请输入设备ID (例如: SN123456)" @input="handleModelInput" />
          </el-form-item>
          <el-form-item label="设备名称" prop="deviceName">
            <el-input v-model="form.deviceName" placeholder="请输入设备名称" />
          </el-form-item>
        </div>

        <el-divider content-position="left">属性映射 (物理属性 -> 平台属性)</el-divider>
        <div class="property-mapping-section">
          <div v-if="!form.propertyMap || Object.keys(form.propertyMap).length === 0" class="empty-state">
            请先选择设备模型以加载属性
          </div>
          <div v-else class="mapping-list">
            <div v-for="(value, key) in form.propertyMap" :key="key" class="mapping-item">
              <span class="platform-prop">{{ key }}</span>
              <el-icon class="arrow-icon"><Right /></el-icon>
              <el-input v-model="form.propertyMap[key]" class="physical-input" placeholder="物理属性字段" />
            </div>
          </div>
        </div>

        <el-divider content-position="left">操作实现 (Action Implementation)</el-divider>
        <div class="property-mapping-section">
          <div v-if="!form.actionMap || Object.keys(form.actionMap).length === 0" class="empty-state">
            请先选择设备模型以加载操作
          </div>
          <div v-else class="mapping-list">
            <div v-for="(value, key) in form.actionMap" :key="key" class="mapping-item-vertical">
              <div class="mapping-item-header">
                <span class="platform-prop">{{ key }}</span>
                <span class="prop-desc" v-if="deviceModelStore.deviceModels.find(t => t.modelId === form.modelId)?.model?.actions[key]?.description">
                  ({{ deviceModelStore.deviceModels.find(t => t.modelId === form.modelId)?.model?.actions[key]?.description }})
                </span>
              </div>
              <div class="editor-wrapper">
                <codemirror
                  v-model="form.actionMap[key]"
                  placeholder="请输入自定义操作实现代码 (例如: return params.value + 1;)"
                  :style="{ height: '150px' }"
                  :autofocus="false"
                  :indent-with-tab="true"
                  :tab-size="2"
                  :extensions="extensions"
                />
              </div>
            </div>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 驱动内容对话框 -->
    <el-dialog 
      v-model="mapperVisible" 
      title="驱动配置脚本 (Mapper)" 
      width="1000px"
      class="premium-dialog mapper-dialog"
      append-to-body
      :lock-scroll="true"
      modal-class="no-scroll-overlay"
    >
      <div class="mapper-container">
        <div class="mapper-header">
          <div class="mapper-info">
            <el-tag size="small" type="info" effect="dark">JavaScript</el-tag>
            <span class="file-path">device-mapper.js</span>
          </div>
          <el-button type="primary" link :icon="DocumentCopy" @click="copyMapperContent">复制脚本</el-button>
        </div>
        <div class="code-wrapper">
          <pre class="code-block"><code>{{ mapperContent }}</code></pre>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="mapperVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus, Right, Search, DocumentCopy } from '@element-plus/icons-vue'
import { useDeviceStore } from '../store/device'
import { useDeviceModelStore } from '../store/deviceModel'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMapperContent } from '../api/device'
import type { FormInstance, FormRules } from 'element-plus'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

const extensions = [javascript(), oneDark]

const store = useDeviceStore()
const deviceModelStore = useDeviceModelStore()

const searchForm = reactive({
  current: 1,
  size: 10,
  provider: '',
  deviceName: ''
})

const formattedRecords = computed(() => {
  return store.deviceList.records.map((item: any) => ({
    ...item,
    createTime: item.createTime?.split('.')[0].replace('T', ' '),
    updateTime: item.updateTime?.split('.')[0].replace('T', ' ')
  }))
})

const getModelName = (modelId: string) => {
  const model = deviceModelStore.deviceModels.find((item: any) => item.modelId === modelId)
  return model ? model.modelName : modelId
}

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as number | undefined,
  provider: '',
  modelId: '',
  deviceId: '',
  deviceName: '',
  deviceMapperPath: undefined as string | undefined,
  propertyMap: {} as Record<string, string>,
  actionMap: {} as Record<string, string>
})

const rules = reactive<FormRules>({
    provider: [{ required: true, message: '请选择供应商', trigger: 'change' }],
    modelId: [{ required: true, message: '请选择设备模型', trigger: 'change' }],
    deviceId: [{ required: true, message: '请输入设备ID', trigger: 'blur' }]
  })

onMounted(async () => {
  await deviceModelStore.fetchDeviceModels()
  handleSearch()
})

const handleSearch = () => {
  store.fetchDevicePage(searchForm)
}

const resetSearch = () => {
  searchForm.provider = ''
  searchForm.deviceName = ''
  searchForm.current = 1
  handleSearch()
}

const handleCreate = () => {
  isEdit.value = false
  Object.assign(form, {
    id: undefined,
    provider: 'mqtt',
    modelId: '',
    deviceId: '',
    deviceName: '',
    deviceMapperPath: undefined,
    propertyMap: {},
    actionMap: {}
  })
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  
  // 确保所有字段都被正确复制，特别是id
  form.id = row.id
  form.provider = row.provider
  form.modelId = row.modelId
  form.deviceId = row.deviceId
  form.deviceName = row.deviceName
  form.deviceMapperPath = row.deviceMapperPath
  form.propertyMap = row.propertyMap ? { ...row.propertyMap } : {}
  form.actionMap = row.actionMap ? { ...row.actionMap } : {}
  
  dialogVisible.value = true
}

const handleDeviceTypeChange = (modelId: string) => {
  const selectedType = deviceModelStore.deviceModels.find((t: any) => t.modelId === modelId)
  if (selectedType) {
    // form.deviceTypeName = selectedType.modelName // No longer needed
    // 初始化属性映射为 1:1
    const mapping = {} as Record<string, string>
    if (selectedType.model && selectedType.model.properties) {
      Object.keys(selectedType.model.properties).forEach(key => {
        mapping[key] = key
      })
    }
    form.propertyMap = mapping

    // 初始化操作映射
    const actionMapping = {} as Record<string, string>
    if (selectedType.model && selectedType.model.actions) {
      Object.keys(selectedType.model.actions).forEach(key => {
        actionMapping[key] = '' // 默认空，用户自定义
      })
    }
    form.actionMap = actionMapping
  }
}

const handleModelInput = (val: string) => {
  // 默认将设备ID字段带出到设备名称 (如果名称为空或与之前ID一致)
  if (!form.deviceName || form.deviceName === '') {
    form.deviceName = val
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        let success = false
        if (isEdit.value) {
          success = await store.updateDevice(form as any)
        } else {
          success = await store.saveDevice(form as any)
        }

        if (success) {
          ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
          dialogVisible.value = false
          handleSearch()
        } else {
          ElMessage.error('操作失败：服务器返回失败')
        }
      } catch (error: any) {
        ElMessage.error('操作失败: ' + (error.message || '未知错误'))
      } finally {
        submitting.value = false
      }
    }
  })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定要删除设备${row.deviceName || row.deviceId} 吗?`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    const success = await store.deleteDevice(row.id)
    if (success) {
      ElMessage.success('删除成功')
      handleSearch()
    }
  })
}

const mapperVisible = ref(false)
const mapperContent = ref('')
const viewMapper = async (row: any) => {
  try {
    const res: any = await getMapperContent({
      provider: row.provider,
      deviceId: row.deviceId
    })
    mapperContent.value = res.data?.content
    mapperVisible.value = true
  } catch (error: any) {
    ElMessage.error(error.message || '获取驱动失败')
  }
}

const copyMapperContent = () => {
    if (!mapperContent.value) return
    navigator.clipboard.writeText(mapperContent.value).then(() => {
      ElMessage.success('已成功复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
  }
</script>

<style scoped>
.page-container {
  padding: 24px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-main-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.page-sub-title {
  font-size: 14px;
  color: #909399;
  margin: 8px 0 0 0;
}

.create-btn {
  padding: 12px 24px;
  font-size: 16px;
}

.search-card {
  margin-bottom: 24px;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.search-form {
  display: flex;
  align-items: center;
}

.premium-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.model-name-text {
  font-weight: 500;
  color: #303133;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.property-mapping-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.mapping-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.platform-prop {
  flex: 1;
  font-weight: 500;
  color: #409eff;
}

.arrow-icon {
  color: #c0c4cc;
}

.physical-input {
  flex: 1.5;
}

.mapping-item-vertical {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.mapping-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prop-desc {
  font-size: 12px;
  color: #909399;
}

.action-input {
  width: 100%;
}

.editor-wrapper {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

:deep(.cm-editor) {
  font-size: 13px;
  font-family: 'Fira Code', 'Monaco', 'Menlo', 'Consolas', monospace;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 20px;
}

/* 编辑/创建对话框样式 */
:deep(.premium-dialog) {
  margin-top: 5vh !important;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

:deep(.premium-dialog .el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-right: 0;
}

:deep(.premium-dialog .el-dialog__body) {
  max-height: 65vh;
  overflow-y: auto;
  padding: 20px;
}

:deep(.premium-dialog .el-dialog__footer) {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
}

.mapper-container {
  background-color: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #333333;
}

.mapper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.mapper-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-path {
  color: #858585;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', monospace;
}

.code-wrapper {
  padding: 16px;
  max-height: 62vh; /* Reduced from 70vh to ensure total dialog fits in viewport */
  overflow: auto;
}

/* Custom premium scrollbar for code viewing */
.code-wrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.code-wrapper::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.code-wrapper::-webkit-scrollbar-thumb {
  background: #444444;
  border-radius: 3px;
}

.code-wrapper::-webkit-scrollbar-thumb:hover {
  background: #555555;
}

.code-block {
  margin: 0;
  color: #d4d4d4;
  font-family: 'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre; 
}

.mapper-dialog :deep(.el-dialog) {
  margin-top: 4vh !important;
  max-height: 92vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mapper-dialog :deep(.el-dialog__body) {
  padding: 20px;
  flex: 1;
  overflow: hidden;
}

.mapper-dialog :deep(.el-dialog__footer) {
  padding-bottom: 20px;
}


:deep(.el-table__header) {
  font-weight: 600;
}

:deep(.el-button--link) {
  padding: 4px 8px;
  font-size: 14px;
}

:deep(.el-table__row) {
  transition: all 0.3s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
  transform: translateY(-1px);
}
</style>
