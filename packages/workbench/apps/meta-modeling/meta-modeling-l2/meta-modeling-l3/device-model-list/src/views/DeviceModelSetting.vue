<template>
  <div class="device-type-setting">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">{{ isEditMode ? (deviceTypeCategory === 'component' ? '编辑组件类型' : '编辑设备类型') : (deviceTypeCategory === 'component' ? '创建组件类型' : '创建设备类型') }}</h2>
        <p v-if="isEditMode" class="page-sub-title">{{ deviceModelForm.modelName || (deviceTypeCategory === 'component' ? '组件类型详情' : '设备类型详情') }}</p>
        <p v-else class="page-sub-title">{{ deviceTypeCategory === 'component' ? '定义组件及其属性、操作和事件' : '定义新的物联网设备类型及其属性、操作和事件' }}</p>
      </div>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </div>
    </div>

    <!-- 基本信息表单 - 提到最上面 -->
    <el-card class="basic-info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>基础配置</span>
        </div>
      </template>
      <el-form 
        :model="deviceModelForm" 
        :rules="basicRules"
        ref="deviceModelFormRef"
        label-position="top">
        <el-row :gutter="32">
          <el-col :span="12">
            <el-form-item label="设备类型名称" prop="modelName">
              <el-input v-model="deviceModelForm.modelName" placeholder="例如：智能空调、工业传感器"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="设备类型标识符(ID)" prop="modelId">
              <el-input v-model="deviceModelForm.modelId" placeholder="例如：coffeeMaker"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="32">
          <el-col :span="12">
            <el-form-item label="所属品类" prop="category">
              <el-input v-model="deviceModelForm.category" placeholder="例如：coffer"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- Tab页面：属性、服务、事件 -->
    <el-card class="setting-content" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Operation /></el-icon>
          <span>物模型定义</span>
        </div>
      </template>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="属性" name="property">
          <div class="tab-content-wrapper">
            <div class="tab-actions">
              <el-button type="primary" :icon="Plus" @click="addProperty">添加属性</el-button>
            </div>
            
            <el-table :data="propertyList" border style="width: 100%;" header-align="center">
              <el-table-column prop="identify" label="标识符" min-width="120" show-overflow-tooltip></el-table-column>
              <el-table-column prop="description" label="名称/描述" min-width="150" show-overflow-tooltip></el-table-column>
              <el-table-column prop="type" label="数据类型" width="100" align="center">
                <template #default="scope">
                  <el-tag size="small" effect="plain">{{ getDataTypeLabel(scope.row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="unit" label="单位" width="80" align="center"></el-table-column>
              <el-table-column label="范围/枚举" min-width="150" show-overflow-tooltip>
                <template #default="scope">
                  <span class="spec-text">{{ formatV1PropertySpecs(scope.row) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template #default="scope">
                  <div class="table-ops">
                    <el-button type="primary" :icon="Edit" link @click="editProperty(scope.row.identify)">编辑</el-button>
                    <el-button type="danger" :icon="Delete" link @click="removeProperty(scope.row.identify)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="propertyList.length === 0" description="暂无属性" :image-size="100"></el-empty>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="操作" name="action">
          <div class="tab-content-wrapper">
            <div class="tab-actions">
              <el-button type="primary" :icon="Plus" @click="addAction">添加操作</el-button>
            </div>
            <el-table :data="actionList" border style="width: 100%;" header-align="center">
              <el-table-column prop="description" label="操作名称" min-width="150" show-overflow-tooltip>
                <template #default="scope">
                  <div class="action-name-cell">
                    <el-icon><Pointer /></el-icon>
                    <span>{{ scope.row.description }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="identify" label="标识符(Command)" min-width="150" show-overflow-tooltip>
                <template #default="scope">
                  <code>{{ scope.row.identify }}</code>
                </template>
              </el-table-column>
              <el-table-column label="参数配置" min-width="250">
                <template #default="scope">
                  <div class="arg-preview-list">
                    <template v-if="Object.keys(scope.row.arguments || {}).length > 0">
                      <el-tooltip
                        v-for="(arg, argKey) in scope.row.arguments"
                        :key="argKey"
                        :content="`${arg.description} (${getDataTypeLabel(arg.type)})`"
                        placement="top"
                      >
                        <el-tag size="small" class="arg-tag">
                          {{ argKey }}
                        </el-tag>
                      </el-tooltip>
                    </template>
                    <span v-else class="no-args-text">无参数</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template #default="scope">
                  <div class="table-ops">
                    <el-button type="primary" :icon="Edit" link @click="editAction(scope.row.identify)">编辑</el-button>
                    <el-button type="danger" :icon="Delete" link @click="removeAction(scope.row.identify)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="actionList.length === 0" description="暂无操作" :image-size="100"></el-empty>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="事件" name="event">
          <div class="tab-content-wrapper">
            <div class="tab-actions">
              <el-button type="primary" :icon="Plus" @click="addEvent">添加事件</el-button>
            </div>
            <el-table :data="eventList" border style="width: 100%;" header-align="center">
              <el-table-column prop="identify" label="标识符" min-width="150" show-overflow-tooltip></el-table-column>
              <el-table-column prop="level" label="级别" width="100" align="center">
                <template #default="scope">
                  <el-tag :type="getEventTypeTag(scope.row.level)" size="small" effect="dark">{{ getEventTypeText(scope.row.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="名称/描述" min-width="200" show-overflow-tooltip></el-table-column>
              <el-table-column label="事件字段" width="120" align="center">
                <template #default="scope">
                  <el-tag size="small" type="info">{{ Object.keys(scope.row.fields || {}).length }} 项</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" align="center" fixed="right">
                <template #default="scope">
                  <div class="table-ops">
                    <el-button type="primary" :icon="Edit" link @click="editEvent(scope.row.identify)">编辑</el-button>
                    <el-button type="danger" :icon="Delete" link @click="removeEvent(scope.row.identify)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-if="eventList.length === 0" description="暂无事件" :image-size="100"></el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 属性对话框 -->
    <el-dialog 
      v-model="propertyDialogVisible" 
      :title="isPropertyEdit ? '编辑属性' : '添加属性'" 
      width="600px"
      class="premium-dialog"
    >
      <el-form :model="propertyForm" :rules="propertyRules" ref="propertyFormRef" label-position="top">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标识符" prop="identify">
              <el-input v-model="propertyForm.identify" placeholder="例如：temperature" :disabled="isPropertyEdit"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示名称" prop="description">
              <el-input v-model="propertyForm.description" placeholder="例如：当前温度"></el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数据类型" prop="type">
              <el-select v-model="propertyForm.type" placeholder="选择类型" @change="handleTypeChange" style="width: 100%">
                <el-option label="字符串(String)" value="string"></el-option>
                <el-option label="数字(Number)" value="number"></el-option>
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
                <el-input v-model="propertyForm.unit" placeholder="℃等"></el-input>
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

    <!-- 操作 (Action) 对话框 -->
    <el-dialog 
      v-model="actionDialogVisible" 
      :title="isActionEdit ? '编辑操作' : '添加操作'" 
      width="700px"
      class="premium-dialog"
    >
      <el-form :model="actionForm" :rules="actionRules" ref="actionFormRef" label-position="top">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="标识符(Command)" prop="identify">
              <el-input v-model="actionForm.identify" placeholder="例如：open_door" :disabled="isActionEdit"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作显示名称" prop="description">
              <el-input v-model="actionForm.description" placeholder="例如：远程开门"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <div class="dialog-section">
          <div class="section-header">
            <span class="section-title">参数定义 (Arguments)</span>
            <el-button type="primary" size="small" :icon="Plus" @click="addParam('argument')">新增参数</el-button>
          </div>
          <el-table :data="argumentList" border style="width: 100%; margin-top: 12px">
            <el-table-column prop="identify" label="参数标识" width="120" show-overflow-tooltip></el-table-column>
            <el-table-column prop="description" label="描述" min-width="120" show-overflow-tooltip></el-table-column>
            <el-table-column prop="type" label="类型" width="100" align="center">
              <template #default="scope">
                <el-tag size="small" effect="plain">{{ getDataTypeLabel(scope.row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="scope">
                <div class="table-ops">
                  <el-button type="primary" :icon="Edit" link @click="editParam('argument', scope.row.identify)">编辑</el-button>
                  <el-button type="danger" :icon="Delete" link @click="removeParam('argument', scope.row.identify)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="argumentList.length === 0" :image-size="60" description="暂无参数"></el-empty>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="actionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitActionForm">保存操作</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 事件对话框 -->
    <el-dialog 
      v-model="eventDialogVisible" 
      :title="isEventEdit ? '编辑事件' : '添加事件'" 
      width="700px"
      class="premium-dialog"
    >
      <el-form :model="eventForm" :rules="eventRules" ref="eventFormRef" label-position="top">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="事件标识符" prop="identify">
              <el-input v-model="eventForm.identify" placeholder="例如：alarm" :disabled="isEventEdit"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="显示名称" prop="description">
              <el-input v-model="eventForm.description" placeholder="例如：异常告警"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="事件级别" prop="level">
              <el-select v-model="eventForm.level" placeholder="请选择级别" style="width: 100%">
                <el-option label="信息 (Info)" value="info"></el-option>
                <el-option label="告警 (Warning)" value="warning"></el-option>
                <el-option label="故障 (Error)" value="error"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <div class="dialog-section">
          <div class="section-header">
            <span class="section-title">事件字段 (Fields)</span>
            <el-button type="primary" size="small" :icon="Plus" @click="addParam('field')">新增字段</el-button>
          </div>
          <el-table :data="fieldList" border style="width: 100%; margin-top: 12px">
            <el-table-column prop="identify" label="字段标识" width="120" show-overflow-tooltip></el-table-column>
            <el-table-column prop="description" label="描述" min-width="120" show-overflow-tooltip></el-table-column>
            <el-table-column prop="type" label="数据类型" width="100" align="center">
              <template #default="scope">
                <el-tag size="small" effect="plain">{{ getDataTypeLabel(scope.row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="scope">
                <div class="table-ops">
                  <el-button type="primary" :icon="Edit" link @click="editParam('field', scope.row.identify)">编辑</el-button>
                  <el-button type="danger" :icon="Delete" link @click="removeParam('field', scope.row.identify)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="fieldList.length === 0" :image-size="60" description="暂无字段"></el-empty>
        </div>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="eventDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEventForm">保存事件</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 参数/字段编辑对话框 -->
    <el-dialog 
      v-model="paramDialogVisible" 
      :title="isParamEdit ? '编辑参数' : '添加参数'" 
      width="500px" 
      append-to-body
      class="premium-dialog"
    >
      <el-form :model="paramForm" :rules="propertyRules" ref="paramFormRef" label-position="top">
        <el-form-item label="标识符" prop="identify">
          <el-input v-model="paramForm.identify" placeholder="例如：mode" :disabled="isParamEdit"></el-input>
        </el-form-item>
        <el-form-item label="名称/描述" prop="description">
          <el-input v-model="paramForm.description" placeholder="例如：运行模式"></el-input>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数据类型" prop="type">
              <el-select v-model="paramForm.type" placeholder="请选择" @change="handleParamTypeChange" style="width: 100%">
                <el-option label="字符串" value="string"></el-option>
                <el-option label="数字" value="number"></el-option>
                <el-option label="布尔值" value="boolean"></el-option>
                <el-option label="枚举" value="enum"></el-option>
                <el-option label="对象" value="object"></el-option>
                <el-option label="数组" value="array"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="paramForm.type === 'number'">
            <el-form-item label="单位" prop="unit">
              <el-input v-model="paramForm.unit" placeholder="℃、kg"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <template v-if="paramForm.type === 'number'">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最小值" prop="min">
                <el-input-number v-model="paramForm.min" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最大值" prop="max">
                <el-input-number v-model="paramForm.max" style="width: 100%"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
        </template>
        
        <template v-if="paramForm.type === 'enum'">
          <el-form-item label="枚举选项">
            <div class="enum-list-container">
              <div v-for="(val, index) in paramForm.enumValues" :key="index" class="enum-item">
                <el-input v-model="paramForm.enumValues[index]" placeholder="选项内容" style="flex: 1"></el-input>
                <el-button type="danger" :icon="Delete" circle @click="paramForm.enumValues.splice(index, 1)"></el-button>
              </div>
              <div class="enum-add-btn">
                <el-button type="primary" :icon="Plus" link @click="paramForm.enumValues.push('')">添加选项</el-button>
              </div>
            </div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="paramDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitParamForm">保存配置</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
import { Delete, Plus, Edit, Pointer, InfoFilled, Operation } from '@element-plus/icons-vue'
import { useDeviceModelStore } from '../store/deviceModel'
import { ElMessage, type FormInstance } from 'element-plus'
import { getDeviceModelById } from '../api/deviceModel'
import type { DeviceModel, PropertyDefinition, ActionDefinition, EventDefinition, BaseDeviceModel } from '../types/models'
import { useRouter, useRoute } from 'vue-router'

// 定义 Props
interface Props {
  mode?: 'create' | 'edit'
  deviceTypeId?: number | null
  deviceTypeCategory?: 'device' | 'component'
}

const props = withDefaults(defineProps<Props>(), {
  mode: undefined,
  deviceTypeId: undefined,
  deviceTypeCategory: 'device'
})

// 定义 Emits
const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'cancelled'): void
}>()

const router = useRouter()
const route = useRoute()
const deviceModelStore = useDeviceModelStore()

// 表单引用
const deviceModelFormRef = ref<FormInstance>()

const propertyFormRef = ref<FormInstance>()
const actionFormRef = ref<FormInstance>()
const eventFormRef = ref<FormInstance>()
const paramFormRef = ref<FormInstance>()

// 状态
const state = reactive({
  activeTab: 'property',
  deviceModelForm: {
    modelId: '',
    modelName: '',
    category: '',
    provider: undefined
  } as Partial<DeviceModel> & { modelId?: string },
  modelForm: {
    modelName: '',
    modelId: '',
    category: '',
    provider: undefined,
    properties: {} as Record<string, PropertyDefinition>,
    actions: {} as Record<string, ActionDefinition>,
    events: {} as Record<string, EventDefinition>
  } as BaseDeviceModel,
  propertyForm: {
    identify: '',
    type: 'string',
    unit: '',
    readOnly: false,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    enumValues: [] as string[],
    description: ''
  },
  actionForm: {
    identify: '',
    description: '',
    arguments: {} as Record<string, PropertyDefinition>
  },
  eventForm: {
    identify: '',
    description: '',
    level: 'info' as 'info' | 'warning' | 'error',
    fields: {} as Record<string, PropertyDefinition>,
    outputs: {} as Record<string, PropertyDefinition>
  } as EventDefinition & { identify: string },
  paramForm: {
    identify: '',
    type: 'string',
    unit: '',
    readOnly: false,
    min: undefined as number | undefined,
    max: undefined as number | undefined,
    enumValues: [] as string[],
    description: ''
  },
  submitting: false,
  propertyDialogVisible: false,
  actionDialogVisible: false,
  eventDialogVisible: false,
  paramDialogVisible: false,
  isPropertyEdit: false,
  isActionEdit: false,
  isEventEdit: false,
  isParamEdit: false,
  editingPropertyKey: '',
  editingActionKey: '',
  editingEventKey: '',
  editingParamKey: '',
  editingParamType: '' as 'argument' | 'field',
  currentDeviceModelId: null as number | null
})

// 计算属性
const {
  activeTab, deviceModelForm, modelForm, propertyForm, actionForm, eventForm, paramForm,
  submitting, propertyDialogVisible, actionDialogVisible, eventDialogVisible, paramDialogVisible,
  isPropertyEdit, isActionEdit, isEventEdit, isParamEdit, editingPropertyKey, editingActionKey,
  editingEventKey, editingParamKey, editingParamType, currentDeviceModelId
} = toRefs(state)

const propertyList = computed(() => {
  return Object.entries(modelForm.value.properties || {}).map(([key, value]) => ({
    identify: key,
    ...((typeof value === 'object' && value !== null) ? value : {})
  }))
})

const actionList = computed(() => {
  return Object.entries(modelForm.value.actions || {}).map(([key, value]) => ({
    identify: key,
    ...((typeof value === 'object' && value !== null) ? value : {})
  }))
})

const eventList = computed(() => {
  return Object.entries(modelForm.value.events || {}).map(([key, value]) => ({
    identify: key,
    ...((typeof value === 'object' && value !== null) ? value : {})
  }))
})

const argumentList = computed(() => {
  return Object.entries(actionForm.value.arguments || {}).map(([key, value]) => ({
    identify: key,
    ...((typeof value === 'object' && value !== null) ? value : {})
  }))
})

const fieldList = computed(() => {
  return Object.entries(eventForm.value.fields || {}).map(([key, value]) => ({
    identify: key,
    ...((typeof value === 'object' && value !== null) ? value : {})
  }))
})

const outputList = computed(() => {
  const outputs = eventForm.value.outputs || {}
  return Object.entries(outputs).map(([key, value]) => ({
    identify: key,
    ...((typeof value === 'object' && value !== null) ? value : {})
  }))
})

// 确定是否是编辑模式（优先使用 props，否则使用路由参数）
const isEditMode = computed(() => {
  if (props.mode !== undefined) {
    return props.mode === 'edit'
  }
  return route.query.mode === 'edit'
})

// 获取设备模型ID（优先使用 props，否则使用路由参数）
const deviceModelId = computed(() => {
  if (props.deviceTypeId !== undefined) {
    return props.deviceTypeId
  }
  return parseInt(route.query.id as string) || null
})

// 获取类型（device �?component）（优先使用 props，否则使用路由参数）
const deviceTypeCategory = computed(() => {
  if (props.deviceTypeCategory !== undefined) {
    return props.deviceTypeCategory
  }
  return route.query.type as string || 'device'
})

// 验证规则
const basicRules = {
  modelName: [
    { required: true, message: '请输入设备类型名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  modelId: [
    { required: true, message: '请输入设备类型标识符', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含英文字母、数字和下划线，且必须以字母或下划线开头', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请输入所属品类', trigger: 'blur' }
  ]
}

// 验证规则
const propertyRules = {
  identify: [{ required: true, message: '请输入标识符', trigger: 'blur' }],
  description: [{ required: true, message: '请输入说明', trigger: 'blur' }],
  type: [{ required: true, message: '请选择数据类型', trigger: 'change' }]
}

const actionRules = {
  identify: [{ required: true, message: '请输入标识符', trigger: 'blur' }],
  description: [{ required: true, message: '请输入说明', trigger: 'blur' }]
}

const eventRules = {
  identify: [{ required: true, message: '请输入标识符', trigger: 'blur' }],
  description: [{ required: true, message: '请输入说明', trigger: 'blur' }],
  level: [{ required: true, message: '请选择级别', trigger: 'change' }]
}

// 处理数据类型变更
const handleTypeChange = (type: string) => {
  if (type === 'number') {
    propertyForm.value.min = 0
    propertyForm.value.max = 100
    propertyForm.value.unit = ''
  } else if (type === 'enum') {
    propertyForm.value.enumValues = ['']
  }
}

const handleParamTypeChange = (type: string) => {
  if (type === 'number') {
    paramForm.value.min = 0
    paramForm.value.max = 100
    paramForm.value.unit = ''
  } else if (type === 'enum') {
    paramForm.value.enumValues = ['']
  }
}



// 获取事件类型文本和标签类型
const getEventTypeText = (level: string) => {
  switch(level) {
    case 'info': return '信息'
    case 'warning': return '告警'
    case 'error': return '故障'
    default: return level
  }
}

const getEventTypeTag = (level: string) => {
  switch(level) {
    case 'info': return 'info'
    case 'warning': return 'warning'
    case 'error': return 'danger'
    default: return 'info'
  }
}

// 格式化V1属性规范
const formatV1PropertySpecs = (prop: PropertyDefinition) => {
  if (prop.type === 'number') {
    let str = ''
    if (prop.min !== undefined) str += `最小: ${prop.min}`
    if (prop.max !== undefined) str += (str ? ', ' : '') + `最大: ${prop.max}`
    if (prop.unit) str += (str ? ', ' : '') + `单位: ${prop.unit}`
    return str || '-'
  }
  if (prop.type === 'enum' && prop.enumValues) {
    return `枚举: ${prop.enumValues.join(', ')}`
  }
  return '-'
}

// 获取数据类型标签
const getDataTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    'string': '字符串',
    'number': '数字',
    'boolean': '布尔值',
    'enum': '枚举',
    'object': '对象',
    'array': '数组'
  }
  return map[type] || type
}

// 初始化表单数据
const resetDeviceModelForm = () => {
  deviceModelForm.value = {
    modelName: '',
    modelId: '',
    category: '',
    provider: undefined
  }
}

// 初始化表单数据
const resetModelForm = () => {
  modelForm.value = {
    modelName: '',
    modelId: '',
    category: '',
    provider: undefined,
    properties: {},
    actions: {},
    events: {}
  }
}

// 初始化属性表单
const initPropertyForm = () => {
  propertyForm.value = {
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

// 初始化功能表单
const initActionForm = () => {
  actionForm.value = {
    identify: '',
    description: '',
    arguments: {}
  }
}

// 初始化事件表单
const initEventForm = () => {
  eventForm.value = {
    identify: '',
    description: '',
    level: 'info',
    fields: {},
    outputs: {}
  }
}

// 初始化参数表单
const initParamForm = () => {
  paramForm.value = {
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

// 加载设备模型数据
const loadDeviceModelData = async (id: number) => {
  try {
    // 从 store 获取设备模型数据
    if (deviceModelStore.allDeviceModels.length === 0) {
      await deviceModelStore.fetchAllDeviceModels();
    }
    
    const deviceModel = deviceModelStore.allDeviceModels.find((m: any) => String(m.id) === String(id));
    
    if (deviceModel) {
      // 加载基本信息
      deviceModelForm.value.modelName = deviceModel.modelName || ''
      deviceModelForm.value.category = deviceModel.category || ''
      deviceModelForm.value.modelId = deviceModel.model ? (deviceModel.model as any).modelId : ''
      
      // 加载模型数据
      if (deviceModel.model) {
        const parsedModel = JSON.parse(JSON.stringify(deviceModel.model))
        modelForm.value = {
          ...parsedModel,
          properties: parsedModel.properties || {},
          actions: parsedModel.actions || {},
          events: parsedModel.events || {}
        }
      } else {
        resetModelForm()
      }
    } else {
      throw new Error('未找到对应的设备类型')
    }
  } catch (error) {
    console.error('加载设备类型数据失败:', error)
    ElMessage.error('加载设备类型数据失败')
  }
}

// 监听路由、props 变化，加载对应的设备模型数据
watch([() => route.query.id, () => route.query.mode, () => props.deviceTypeId, () => props.mode], async ([routeId, routeMode, propsId, propsMode]) => {
  const mode = propsMode !== undefined ? propsMode : routeMode
  const id = propsId !== undefined ? propsId : (routeId ? parseInt(routeId as string) : null)
  
  if (mode === 'edit' && id) {
    await loadDeviceModelData(id as number)
  }
}, { immediate: true })

onMounted(async () => {
  if (isEditMode.value && deviceModelId.value) {
    await loadDeviceModelData(deviceModelId.value)
  }
})

// 返回列表（如果是弹窗模式，发�?cancelled 事件；否则路由跳转）
const navigateBack = () => {
  if (props.mode !== undefined) {
    // 弹窗模式：发出取消事件
    emit('cancelled')
  } else {
    // 路由模式：返回列表页面
    router.push('/')
  }
}

// 保存模型（不再需要单独方法）

// 提交表单
const submitForm = async () => {
  if (!deviceModelFormRef.value) return
  await deviceModelFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        // 同步 modelForm 的基本信息
        modelForm.value.modelName = deviceModelForm.value.modelName!
        modelForm.value.category = deviceModelForm.value.category!
        modelForm.value.modelId = deviceModelForm.value.modelId!

        if (isEditMode.value && deviceModelId.value) {
          // 更新设备模型 (包含模型)
          const deviceModelData = {
            ...deviceModelForm.value,
            modelId: deviceModelForm.value.modelId,
            model: modelForm.value
          } as DeviceModel
          await deviceModelStore.updateDeviceModel(deviceModelId.value, deviceModelData)
          ElMessage.success('更新成功')
          
          // 如果是弹窗模式，发出保存事件；否则路由跳转
          if (props.mode !== undefined) {
            emit('saved')
          } else {
            // 返回列表页面
            router.push('/')
          }
        } else {
          // 创建设备模型 - 明确排除 id 字段，让数据库自动生成
          const { id, ...createData } = deviceModelForm.value
          const deviceModelData = {
            ...createData,
            modelId: deviceModelForm.value.modelId,
            type: deviceTypeCategory.value, // 根据来源页面设置 type 字段
            model: modelForm.value
          } as any as DeviceModel
          const result = await deviceModelStore.createDeviceModel(deviceModelData)
          if (result && result.id) {
            currentDeviceModelId.value = result.id
            ElMessage.success('创建成功')
            
            // 如果是弹窗模式，发出保存事件；否则路由跳转
            if (props.mode !== undefined) {
              emit('saved')
            } else {
              // 返回列表页面
              router.push('/')
            }
          }
        }
      } catch (error) {
        console.error(error)
        ElMessage.error(isEditMode.value ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 属性相关方法
const addProperty = () => {
  initPropertyForm()
  isPropertyEdit.value = false
  propertyDialogVisible.value = true
}

const editProperty = (key: string) => {
  const prop = modelForm.value.properties[key]
  if (prop) {
    propertyForm.value = { identify: key, ...JSON.parse(JSON.stringify(prop)) }
    isPropertyEdit.value = true
    editingPropertyKey.value = key
    propertyDialogVisible.value = true
  }
}

const removeProperty = (key: string) => {
  delete modelForm.value.properties[key]
  ElMessage.success('属性已移除，保存表单后生效')
}

const submitPropertyForm = async () => {
  if (!propertyFormRef.value) return
  await propertyFormRef.value.validate((valid) => {
    if (valid) {
      const { identify, ...data } = propertyForm.value
      if (isPropertyEdit.value && editingPropertyKey.value !== identify) {
        delete modelForm.value.properties[editingPropertyKey.value]
      }
      modelForm.value.properties[identify] = data as PropertyDefinition
      propertyDialogVisible.value = false
    }
  })
}

// 操作相关方法
const addAction = () => {
  initActionForm()
  isActionEdit.value = false
  actionDialogVisible.value = true
}

const editAction = (key: string) => {
  const action = modelForm.value.actions[key]
  if (action) {
    actionForm.value = { identify: key, ...JSON.parse(JSON.stringify(action)) }
    isActionEdit.value = true
    editingActionKey.value = key
    actionDialogVisible.value = true
  }
}

const removeAction = (key: string) => {
  delete modelForm.value.actions[key]
  ElMessage.success('操作已移除，保存表单后生效')
}

const submitActionForm = async () => {
  if (!actionFormRef.value) return
  await actionFormRef.value.validate((valid: boolean) => {
    if (valid) {
      const { identify, ...data } = actionForm.value
      if (isActionEdit.value && editingActionKey.value !== identify) {
        delete modelForm.value.actions[editingActionKey.value]
      }
      modelForm.value.actions[identify] = data as ActionDefinition
      actionDialogVisible.value = false
    }
  })
}

// 事件相关方法
const addEvent = () => {
  initEventForm()
  isEventEdit.value = false
  eventDialogVisible.value = true
}

const editEvent = (key: string) => {
  const event = modelForm.value.events[key]
  if (event) {
    eventForm.value = { identify: key, ...JSON.parse(JSON.stringify(event)) }
    isEventEdit.value = true
    editingEventKey.value = key
    eventDialogVisible.value = true
  }
}

const removeEvent = (key: string) => {
  delete modelForm.value.events[key]
  ElMessage.success('事件已移除，保存表单后生效')
}

const submitEventForm = async () => {
  if (!eventFormRef.value) return
  await eventFormRef.value.validate((valid: boolean) => {
    if (valid) {
      const { identify, ...data } = eventForm.value
      if (isEventEdit.value && editingEventKey.value !== identify) {
        delete modelForm.value.events[editingEventKey.value]
      }
      modelForm.value.events[identify] = data as EventDefinition
      eventDialogVisible.value = false
    }
  })
}

// 参数/字段相关方法
const addParam = (type: 'argument' | 'field') => {
  initParamForm()
  isParamEdit.value = false
  editingParamType.value = type
  paramDialogVisible.value = true
}

const editParam = (type: 'argument' | 'field', key: string) => {
  let targetMap: Record<string, PropertyDefinition>
  if (type === 'argument') {
    targetMap = actionForm.value.arguments
  } else {
    targetMap = eventForm.value.fields
  }
  
  const param = targetMap[key]
  if (param) {
    paramForm.value = { identify: key, ...JSON.parse(JSON.stringify(param)) }
    isParamEdit.value = true
    editingParamType.value = type
    editingParamKey.value = key
    paramDialogVisible.value = true
  }
}

const removeParam = (type: 'argument' | 'field', key: string) => {
  if (type === 'argument') {
    delete actionForm.value.arguments[key]
  } else {
    delete eventForm.value.fields[key]
  }
}

const submitParamForm = async () => {
  if (!paramFormRef.value) return
  await paramFormRef.value.validate((valid: boolean) => {
    if (valid) {
      const { identify, ...data } = paramForm.value
      let targetMap: Record<string, PropertyDefinition>
      
      if (editingParamType.value === 'argument') {
        if (!actionForm.value.arguments) {
          actionForm.value.arguments = {}
        }
        targetMap = actionForm.value.arguments
      } else {
        if (!eventForm.value.fields) {
          eventForm.value.fields = {}
        }
        targetMap = eventForm.value.fields
      }
      
      if (isParamEdit.value && editingParamKey.value !== identify) {
        delete targetMap[editingParamKey.value]
      }
      
      targetMap[identify] = data as PropertyDefinition
      paramDialogVisible.value = false
    }
  })
}

</script>

<style scoped>
.device-type-setting {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.basic-info-card {
  margin-bottom: 20px;
}

.model-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
}

.section-actions {
  display: flex;
  gap: 10px;
}

.enum-list-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.enum-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.enum-add-btn {
  margin-top: 4px;
}

.params-section {
  margin-bottom: 20px;
}

.tab-content-wrapper {
  padding: 10px 0;
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 16px;
}

.dialog-section {
  margin-top: 24px;
  padding: 16px;
  background-color: #f8fafd;
  border-radius: 8px;
  border: 1px solid #edf2f9;
}

.dialog-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #475669;
}

.premium-dialog :deep(.el-dialog__header) {
  margin-right: 0;
  padding-bottom: 20px;
  border-bottom: 1px solid #f2f4f7;
}

.premium-dialog :deep(.el-dialog__body) {
  max-height: 60vh;
  overflow-y: auto;
}

.premium-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #1d1e23;
}

.premium-dialog :deep(.el-dialog__footer) {
  padding-top: 20px;
  border-top: 1px solid #f2f4f7;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.table-ops {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.spec-text {
  font-size: 13px;
  color: #606266;
}

.action-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.arg-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.arg-tag {
  cursor: help;
  background-color: #f0f9eb;
  border-color: #e1f3d8;
  color: #67c23a;
}

.no-args-text {
  color: #909399;
  font-size: 12px;
  font-style: italic;
}

.json-viewer {
  background-color: #f5f7fa;
  color: #606266;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow: auto;
  max-height: 60vh;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
