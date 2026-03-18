<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">{{ isEditMode ? '编辑节点' : '创建节点' }}</h2>
        <p class="page-sub-title">{{ isEditMode ? componentForm.name : '定义新的节点类型' }}</p>
      </div>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitComponentForm" :loading="submitting">保存</el-button>
      </div>
    </div>

    <div class="component-setting-container">
      <el-card class="setting-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>基础配置</span>
          </div>
        </template>
        <el-form 
          :model="componentForm" 
          :rules="componentRules"
          ref="componentFormRef"
          label-position="top">
          <el-row :gutter="32">
            <el-col :span="8">
              <el-form-item label="节点编码" prop="code">
                <el-input v-model="componentForm.code" placeholder="例如: temp_sensor" :disabled="isEditMode"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="节点名称" prop="name">
                <el-input v-model="componentForm.name" placeholder="例如: 温度传感器"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="用途" prop="purpose">
                <el-select v-model="componentForm.purpose" placeholder="选择用途" style="width: 100%">
                  <el-option :label="'业务流'" :value="PurposeType.BusinessFlow"></el-option>
                  <el-option :label="'界面流'" :value="PurposeType.InterfaceFlow"></el-option>
                  <el-option :label="'设备逻辑'" :value="PurposeType.DeviceLogic"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="32">
            <el-col :span="8">
              <el-form-item label="节点类型" prop="type">
                <el-select v-model="componentForm.type" placeholder="选择节点类型" style="width: 100%" @change="handleTypeChange">
                  <el-option label="开始节点(Start)" value="start"></el-option>
                  <el-option label="结束节点 (End)" value="end"></el-option>
                  <el-option label="处理节点 (Process)" value="process"></el-option>
                  <el-option label="条件节点 (Condition)" value="condition"></el-option>
                  <el-option label="设备节点 (Device)" value="device"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="16">
              <el-form-item label="节点描述" prop="description">
                <el-input type="textarea" :rows="1" v-model="componentForm.description" placeholder="请输入节点的功能说明"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <!-- 属性定义 -->
          <div class="constraint-divider">
            <span>属性定义</span>
          </div>
          
          <div class="property-section">
            <div class="section-header">
              <span class="section-title">节点属性列表</span>
              <el-button type="primary" size="small" :icon="Plus" @click="addProperty">添加属性</el-button>
            </div>
            
            <el-table :data="propertyList" border style="width: 100%; margin-top: 12px" v-if="propertyList.length > 0">
              <el-table-column prop="identify" label="标识符" min-width="120" show-overflow-tooltip></el-table-column>
              <el-table-column prop="description" label="名称/描述" min-width="150" show-overflow-tooltip></el-table-column>
              <el-table-column prop="type" label="数据类型" width="100" align="center">
                <template #default="scope">
                  <el-tag size="small" effect="plain">{{ getDataTypeLabel(scope.row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="unit" label="单位" width="80" align="center"></el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template #default="scope">
                  <div class="table-ops">
                    <el-button type="primary" :icon="Edit" link @click="editProperty(scope.row.identify)">编辑</el-button>
                    <el-button type="danger" :icon="Delete" link @click="removeProperty(scope.row.identify)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-else description="暂无属性" :image-size="60"></el-empty>
          </div>

          <!-- 约束配置 -->
          <div class="constraint-divider">
            <span>拓扑约束配置</span>
          </div>
          
          <!-- 节点约束 -->
          <div class="constraint-section">
            <el-row :gutter="40">
              <el-col :span="12" v-if="componentForm.type !== 'start'">
                <div class="constraint-group">
                  <div class="group-title">
                    <span>入口约束 (Input)</span>
                    <el-button type="primary" size="small" :icon="Plus" @click="addInputParam" style="margin-left: auto">添加</el-button>
                  </div>
                  <div v-if="componentForm.inputs && componentForm.inputs.length > 0" class="param-list">
                    <div v-for="(param, index) in componentForm.inputs" :key="index" class="param-item">
                      <el-select v-model="param.type" placeholder="类型" style="width: 40%">
                        <el-option label="字符串(String)" value="string"></el-option>
                        <el-option label="数字 (Number)" value="number"></el-option>
                        <el-option label="布尔 (Boolean)" value="boolean"></el-option>
                        <el-option label="对象 (Object)" value="object"></el-option>
                        <el-option label="数组 (Array)" value="array"></el-option>
                        <el-option label="任意 (Any)" value="any"></el-option>
                      </el-select>
                      <el-button type="danger" :icon="Delete" circle size="small" @click="removeInputParam(index)"></el-button>
                    </div>
                  </div>
                  <el-empty v-else description="暂无入口参数" :image-size="60"></el-empty>
                </div>
              </el-col>
              <el-col :span="12" v-else>
                <div class="constraint-group">
                  <div class="group-title">
                    <span>入口参数 (Input)</span>
                  </div>
                  <div class="no-input-tip">开始节点没有入口参数</div>
                </div>
              </el-col>

              <el-col :span="12">
                <div class="constraint-group">
                  <div class="group-title">
                    <span>出口约束 (Output)</span>
                    <el-button type="primary" size="small" :icon="Plus" @click="addOutputParam" style="margin-left: auto">添加</el-button>
                  </div>
                  <div v-if="componentForm.outputs && componentForm.outputs.length > 0" class="param-list">
                    <div v-for="(param, index) in componentForm.outputs" :key="index" class="param-item">
                      <el-select v-model="param.type" placeholder="类型" style="width: 40%">
                        <el-option label="字符串(String)" value="string"></el-option>
                        <el-option label="数字 (Number)" value="number"></el-option>
                        <el-option label="布尔 (Boolean)" value="boolean"></el-option>
                        <el-option label="对象 (Object)" value="object"></el-option>
                        <el-option label="数组 (Array)" value="array"></el-option>
                        <el-option label="任意 (Any)" value="any"></el-option>
                      </el-select>
                      <el-button type="danger" :icon="Delete" circle size="small" @click="removeOutputParam(index)"></el-button>
                    </div>
                  </div>
                  <el-empty v-else description="暂无出口参数" :image-size="60"></el-empty>
                </div>
              </el-col>
            </el-row>
          </div>

        </el-form>
      </el-card>

      <!-- 属性对话框 -->
      <el-dialog 
        v-model="propertyDialogVisible" 
        :title="isPropertyEdit ? '编辑属性' : '添加属性'" 
        width="600px"
        append-to-body
        class="premium-dialog"
      >
        <el-form :model="propertyForm" :rules="propertyRules" ref="propertyFormRef" label-position="top">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="标识符" prop="identify">
                <el-input v-model="propertyForm.identify" placeholder="例如: temperature" :disabled="isPropertyEdit"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="显示名称" prop="description">
                <el-input v-model="propertyForm.description" placeholder="例如: 当前温度"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="数据类型" prop="type">
                <el-select v-model="propertyForm.type" placeholder="选择类型" @change="handlePropertyTypeChange" style="width: 100%">
                  <el-option label="字符串(String)" value="string"></el-option>
                  <el-option label="数值(Number)" value="number"></el-option>
                  <el-option label="布尔值(Boolean)" value="boolean"></el-option>
                  <el-option label="枚举 (Enum)" value="enum"></el-option>
                  <el-option label="对象 (Object)" value="object"></el-option>
                  <el-option label="数组 (Array)" value="array"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-divider v-if="propertyForm.type === 'number' || propertyForm.type === 'enum'"></el-divider>
          
          <template v-if="propertyForm.type === 'number'">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="最小值" prop="min">
                  <el-input-number v-model="propertyForm.min" style="width: 100%"></el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="最大值" prop="max">
                  <el-input-number v-model="propertyForm.max" style="width: 100%"></el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="单位" prop="unit">
                  <el-input v-model="propertyForm.unit" placeholder="℃"></el-input>
                </el-form-item>
              </el-col>
            </el-row>
          </template>
          
          <template v-if="propertyForm.type === 'enum'">
            <el-form-item label="允许的枚举值">
              <div class="enum-list-container">
                <div v-for="(val, index) in propertyForm.enumValues" :key="index" class="enum-item">
                  <el-input v-model="propertyForm.enumValues[index]" placeholder="枚举项值" style="flex: 1"></el-input>
                  <el-button type="danger" :icon="Delete" circle @click="propertyForm.enumValues.splice(index, 1)"></el-button>
                </div>
                <div class="enum-add-btn">
                  <el-button type="primary" :icon="Plus" link @click="propertyForm.enumValues.push('')">添加选项</el-button>
                </div>
              </div>
            </el-form-item>
          </template>
        </el-form>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="propertyDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitPropertyForm">确认保存</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, ref, toRefs } from 'vue'
import { useComponentStore } from '../store/component'
import { Component, PurposeType, PropertyDefinition } from '../types/models'
import { ElMessage, type FormInstance } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { Plus, Delete, Edit, InfoFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const componentStore = useComponentStore()
const componentFormRef = ref<FormInstance>()
const propertyFormRef = ref<FormInstance>()

// 状态
const state = reactive({
  isEditMode: false,
  submitting: false,
  componentForm: {
    code: '',
    name: '',
    description: '',
    type: 'process',
    purpose: PurposeType.BusinessFlow,
    inputs: [] as Array<{ name: string; type: string }>,
    outputs: [] as Array<{ type: string }>,
    properties: {} as Record<string, PropertyDefinition>
  } as any,
  // 属性相关
  propertyDialogVisible: false,
  isPropertyEdit: false,
  editingPropertyKey: '',
  propertyForm: {
    identify: '',
    type: 'string',
    unit: '',
    readOnly: false,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    enumValues: [] as string[],
    description: ''
  }
})

const { 
  isEditMode,
  submitting,
  componentForm,
  propertyDialogVisible,
  isPropertyEdit,
  propertyForm
} = toRefs(state);

// 初始化
onMounted(async () => {
  const mode = route.query.mode as string
  const id = route.query.id ? parseInt(route.query.id as string) : null

  if (mode === 'edit' && id) {
    state.isEditMode = true
    await componentStore.fetchComponentById(id)
    if (componentStore.currentComponent) {
      loadComponent(componentStore.currentComponent)
    } else {
      ElMessage.error('加载节点数据失败')
      router.push('/')
    }
  } else {
    state.isEditMode = false
    resetComponentForm()
  }
})

const navigateBack = () => {
  router.push('/')
}

// 閲嶇疆缁勪欢琛ㄥ崟
const resetComponentForm = () => {
  componentForm.value = {
    code: '',
    name: '',
    description: '',
    type: 'process',
    purpose: PurposeType.BusinessFlow,
    inputs: [],
    outputs: [],
    properties: {}
  }
}

// 鍔犺浇缁勪欢鏁版嵁
const loadComponent = (data: Component) => {
  const comp = JSON.parse(JSON.stringify(data))
  if (!comp.inputs) comp.inputs = []
  if (!comp.outputs) comp.outputs = []
  if (!comp.properties) comp.properties = {}
  componentForm.value = comp
}

// 澶勭悊鑺傜偣绫诲瀷鍙樺寲
const handleTypeChange = (value: any) => {
  if (value === 'start') {
    componentForm.value.inputs = []
    componentForm.value.outputs = [{ type: 'any' }]
  } else if (value === 'end') {
    componentForm.value.inputs = [{ name: 'input', type: 'any' }]
    componentForm.value.outputs = []
  }
}

// 娣诲姞鍏ュ彛鍙傛暟
const addInputParam = () => {
  if (!componentForm.value.inputs) {
    componentForm.value.inputs = []
  }
  componentForm.value.inputs.push({ name: '', type: 'any' })
}

// 鍒犻櫎鍏ュ彛鍙傛暟
const removeInputParam = (index: number | string) => {
  const idx = typeof index === 'string' ? parseInt(index) : index
  componentForm.value.inputs.splice(idx, 1)
}

// 娣诲姞鍑哄彛鍙傛暟
const addOutputParam = () => {
  if (!componentForm.value.outputs) {
    componentForm.value.outputs = []
  }
  componentForm.value.outputs.push({ type: 'any' })
}

// 鍒犻櫎鍑哄彛鍙傛暟
const removeOutputParam = (index: number | string) => {
  const idx = typeof index === 'string' ? parseInt(index) : index
  componentForm.value.outputs.splice(idx, 1)
}

// 缁勪欢琛ㄥ崟鏍￠獙瑙勫垯
const componentRules = {
  code: [
    { required: true, message: '请输入节点编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入节点名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  purpose: [
    { required: true, message: '请选择用途', trigger: 'change' }
  ]
}

// 鎻愪氦缁勪欢琛ㄥ崟
const submitComponentForm = async () => {
  if (!componentFormRef.value) return
  await componentFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const submitData = {
          ...componentForm.value,
          inputs: componentForm.value.inputs || [],
          outputs: componentForm.value.outputs || [],
          properties: componentForm.value.properties || {}
        }
        
        if (isEditMode.value && componentForm.value.id) {
          await componentStore.updateComponent(componentForm.value.id, submitData)
          ElMessage.success('鏇存柊鎴愬姛')
        } else {
          await componentStore.createComponent(submitData)
          ElMessage.success('鍒涘缓鎴愬姛')
        }
        router.push('/')
      } catch (error) {
        console.error('淇濆瓨澶辫触:', error)
        ElMessage.error('淇濆瓨澶辫触')
      } finally {
        submitting.value = false
      }
    }
  })
}

// ==================== 灞炴€х浉鍏抽€昏緫 ====================

// 灞炴€у垪琛紙杞崲涓烘暟缁勬牸寮忥級
const propertyList = computed(() => {
  if (!componentForm.value.properties) return []
  return Object.entries(componentForm.value.properties).map(([key, value]: [string, any]) => ({
    identify: key,
    ...value
  }))
})

// 灞炴€ц〃鍗曟牎楠岃鍒
const propertyRules = {
  identify: [
    { required: true, message: '请输入属性标识符', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '标识符只能包含字母、数字和下划线，且不能以数字开头', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入属性名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择数据类型', trigger: 'change' }
  ]
}

// 获取数据类型标签
const getDataTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'string': '字符串',
    'number': '数值',
    'boolean': '布尔值',
    'enum': '枚举',
    'object': '对象',
    'array': '数组'
  }
  return typeMap[type] || type
}

// 鍒濆鍖栧睘鎬ц〃鍗
const initPropertyForm = () => {
  state.propertyForm = {
    identify: '',
    type: 'string',
    unit: '',
    readOnly: false,
    min: undefined,
    max: undefined,
    enumValues: [],
    description: ''
  }
}

// 娣诲姞灞炴€
const addProperty = () => {
  initPropertyForm()
  state.isPropertyEdit = false
  state.propertyDialogVisible = true
}

// 缂栬緫灞炴€
const editProperty = (key: string) => {
  const prop = componentForm.value.properties?.[key]
  if (prop) {
    state.propertyForm = { identify: key, ...JSON.parse(JSON.stringify(prop)) }
    state.isPropertyEdit = true
    state.editingPropertyKey = key
    state.propertyDialogVisible = true
  }
}

// 删除属性
const removeProperty = (key: string) => {
  if (componentForm.value.properties) {
    delete componentForm.value.properties[key]
    ElMessage.success('属性已移除')
  }
}

// 提交属性表单
const submitPropertyForm = async () => {
  if (!propertyFormRef.value) return
  await propertyFormRef.value.validate((valid) => {
    if (valid) {
      const { identify, ...data } = state.propertyForm
      if (!componentForm.value.properties) {
        componentForm.value.properties = {}
      }
      if (state.isPropertyEdit && state.editingPropertyKey !== identify) {
        delete componentForm.value.properties[state.editingPropertyKey]
      }
      componentForm.value.properties[identify] = data as PropertyDefinition
      state.propertyDialogVisible = false
      ElMessage.success(state.isPropertyEdit ? '属性已更新' : '属性已添加')
    }
  })
}

// 处理属性类型变化
const handlePropertyTypeChange = (value: string) => {
  if (value !== 'number') {
    state.propertyForm.min = undefined
    state.propertyForm.max = undefined
    state.propertyForm.unit = ''
  }
  if (value !== 'enum') {
    state.propertyForm.enumValues = []
  } else if (state.propertyForm.enumValues.length === 0) {
    state.propertyForm.enumValues = ['']
  }
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

.header-actions {
  display: flex;
  gap: 12px;
}

.setting-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.constraint-divider {
  margin: 32px 0 24px;
  position: relative;
  text-align: center;
}

.constraint-divider:before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #ebeef5;
}

.constraint-divider span {
  position: relative;
  background: #fff;
  padding: 0 16px;
  color: #909399;
  font-size: 14px;
  font-weight: 500;
}

.constraint-section {
  background: #f8fafd;
  padding: 24px;
  border-radius: 8px;
  border: 1px solid #edf2f9;
}

.constraint-group {
  margin-bottom: 0;
}

.group-title {
  font-size: 15px;
  font-weight: 600;
  color: #475669;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}

.group-title:before {
  content: "";
  width: 4px;
  height: 16px;
  background: #409eff;
  border-radius: 2px;
  margin-right: 8px;
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.no-input-tip {
  color: #909399;
  font-size: 14px;
  padding: 20px;
  text-align: center;
  background: #fff;
  border-radius: 6px;
  border: 1px dashed #e4e7ed;
}

/* 灞炴€у尯鍩熸牱寮?*/
.property-section {
  background: #f8fafd;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #edf2f9;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #475669;
}

.table-ops {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.enum-list-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.enum-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.enum-add-btn {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>

