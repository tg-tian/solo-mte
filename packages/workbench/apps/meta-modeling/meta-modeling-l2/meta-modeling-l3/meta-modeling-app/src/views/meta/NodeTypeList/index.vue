<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">节点类型管理</h2>
        <p class="page-sub-title">定义和管理流程引擎使用的节点</p>
      </div>
      <el-button type="primary" @click="navigateToComponentSetting()">创建节点</el-button>
    </div>
    
    <el-card class="component-search" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><Filter /></el-icon>
          <span>筛选条件</span>
        </div>
      </template>
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="节点名称">
          <el-input v-model="searchForm.name" placeholder="名称或编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="节点类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 150px">
            <el-option label="开始节点" value="start"></el-option>
            <el-option label="结束节点" value="end"></el-option>
            <el-option label="处理节点" value="process"></el-option>
            <el-option label="条件节点" value="condition"></el-option>
            <el-option label="设备节点" value="device"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="用途">
          <el-select v-model="searchForm.purpose" placeholder="全部" clearable style="width: 150px">
            <el-option label="业务流" value="businessFlow"></el-option>
            <el-option label="界面流" value="interfaceFlow"></el-option>
            <el-option label="设备逻辑" value="deviceLogic"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-table
      v-loading="componentStore.loading"
      :data="filteredComponents"
      style="width: 100%; margin-top: 20px"
      border
    >
      <el-table-column prop="code" label="节点编码" width="150"></el-table-column>
      <el-table-column prop="name" label="节点名称" min-width="50"></el-table-column>
      <el-table-column prop="description" label="描述" min-width="100"></el-table-column>
      <el-table-column prop="type" label="类型" width="120">
        <template #default="scope">
          <el-tag :type="getTypeTagType(scope.row.type)">
            {{ getTypeText(scope.row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="purpose" label="用途" width="120">
        <template #default="scope">
          <el-tag :type="getPurposeTagType(scope.row.purpose)">
            {{ getPurposeText(scope.row.purpose) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="150"></el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="150"></el-table-column>
      <el-table-column label="约束" width="150">
        <template #default="scope">
          <el-button 
            type="primary" 
            size="small" 
            @click="showConstraints(scope.row)"
            plain
          >查看约束</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button type="primary" size="small" @click="navigateToComponentSetting(scope.row)">编辑</el-button>
          <el-button type="success" size="small" @click="viewJson(scope.row)">查看JSON</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 约束信息对话框 -->
    <el-dialog v-model="constraintDialogVisible" :title="selectedComponent ? `${selectedComponent.name} 的约束` : '约束信息'" width="500px">
      <div v-if="selectedComponent">
        <template v-if="selectedComponent.type === 'node'">
          <h4>入口约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.inputConstraint?.quantity === -1 ? '无限制' : selectedComponent.inputConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.inputConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
          
          <h4 style="margin-top: 20px">出口约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.outputConstraint?.quantity === -1 ? '无限制' : selectedComponent.outputConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.outputConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
        </template>
        
        <template v-else>
          <h4>起点约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.startConstraint?.quantity === -1 ? '无限制' : selectedComponent.startConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.startConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
          
          <h4 style="margin-top: 20px">终点约束</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="数量">{{ selectedComponent.endConstraint?.quantity === -1 ? '无限制' : selectedComponent.endConstraint?.quantity }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedComponent.endConstraint?.type }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-dialog>

    <!-- JSON查看对话框 -->
    <el-dialog v-model="jsonDialogVisible" title="节点JSON" width="60%">
      <pre class="json-viewer">{{ formattedComponentJson }}</pre>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="copyJson">复制</el-button>
          <el-button @click="jsonDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 节点设置对话框 -->
    <el-dialog 
      v-model="settingDialogVisible" 
      :title="isEditMode ? '编辑节点' : '创建节点'" 
      width="80%"
      :close-on-click-modal="false"
      class="setting-dialog"
    >
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
                  <el-input v-model="componentForm.code" placeholder="例如：temp_sensor" :disabled="isEditMode"></el-input>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="节点名称" prop="name">
                  <el-input v-model="componentForm.name" placeholder="例如：温度传感器"></el-input>
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
                    <el-option label="开始节点 (Start)" value="start"></el-option>
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
                <el-table-column prop="readOnly" label="只读" width="80" align="center">
                  <template #default="scope">
                    <el-tag :type="scope.row.readOnly ? 'info' : 'success'" size="small">{{ scope.row.readOnly ? '是' : '否' }}</el-tag>
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
                          <el-option label="字符串 (String)" value="string"></el-option>
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
                          <el-option label="字符串 (String)" value="string"></el-option>
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
                  <el-select v-model="propertyForm.type" placeholder="选择类型" @change="handlePropertyTypeChange" style="width: 100%">
                    <el-option label="字符串 (String)" value="string"></el-option>
                    <el-option label="数值 (Number)" value="number"></el-option>
                    <el-option label="布尔值 (Boolean)" value="boolean"></el-option>
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
                    <el-input v-model="propertyForm.unit" placeholder="℃、%"></el-input>
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
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="settingDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitComponentForm" :loading="submitting">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, ref, toRefs } from 'vue'
import { useComponentStore } from '@/store/component'
import { Component, ComponentType, PurposeType, PropertyDefinition } from '@/types/models'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useRouter } from 'vue-router'
import { Filter, Search, Refresh, Plus, Delete, Edit, InfoFilled } from '@element-plus/icons-vue'

const router = useRouter()
const componentStore = useComponentStore()
const componentFormRef = ref<FormInstance>()
const propertyFormRef = ref<FormInstance>()

// 状态
const state = reactive({
  searchForm: {
    name: '',
    type: '',
    purpose: ''
  },
  constraintDialogVisible: false,
  jsonDialogVisible: false,
  selectedComponent: null as Component | null,
  jsonComponent: null as Component | null,
  // 节点设置弹窗相关
  settingDialogVisible: false,
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
  searchForm, 
  constraintDialogVisible, 
  jsonDialogVisible, 
  selectedComponent, 
  jsonComponent,
  settingDialogVisible,
  isEditMode,
  submitting,
  componentForm,
  propertyDialogVisible,
  isPropertyEdit,
  propertyForm
} = toRefs(state)

// 格式化JSON
const formattedComponentJson = computed(() => {
  if(!jsonComponent.value) return ''
  let formatJson = jsonComponent.value
  if(formatJson.type === ComponentType.Node){
    formatJson = {
      ...formatJson,
      startConstraint: {} as any,
      endConstraint: {} as any
    }
  }else{
    formatJson = {
      ...formatJson,
      inputConstraint: {} as any,
      outputConstraint: {} as any
    }
  }
  return JSON.stringify(formatJson, null, 2)
})

// 过滤后的节点列表
const filteredComponents = computed(() => {
  if (!componentStore.allComponents) return []
  return componentStore.allComponents.filter((component: Component) => {
    const nameMatch = !searchForm.value.name || 
                     component.name.toLowerCase().includes(searchForm.value.name.toLowerCase()) || 
                     component.code.toLowerCase().includes(searchForm.value.name.toLowerCase())
    const typeMatch = !searchForm.value.type || component.type === searchForm.value.type
    const purposeMatch = !searchForm.value.purpose || component.purpose === searchForm.value.purpose
    return nameMatch && typeMatch && purposeMatch
  })
})

// 初始化
onMounted(async () => {
  await componentStore.fetchAllComponents()
})

// 搜索处理
const handleSearch = () => {
  // 过滤是在计算属性中完成的
}

// 重置搜索
const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.type = ''
  searchForm.value.purpose = ''
}

// 打开节点设置弹窗
const navigateToComponentSetting = (component?: Component) => {
  if (component) {
    // 编辑节点
    isEditMode.value = true
    loadComponent(component)
  } else {
    // 创建节点
    isEditMode.value = false
    resetComponentForm()
  }
  settingDialogVisible.value = true
}

// 重置组件表单
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

// 加载组件数据
const loadComponent = (data: Component) => {
  const comp = JSON.parse(JSON.stringify(data))
  if (!comp.inputs) comp.inputs = []
  if (!comp.outputs) comp.outputs = []
  if (!comp.properties) comp.properties = {}
  componentForm.value = comp
}

// 处理节点类型变化
const handleTypeChange = (value: any) => {
  if (value === 'start') {
    componentForm.value.inputs = []
    componentForm.value.outputs = [{ type: 'any' }]
  } else if (value === 'end') {
    componentForm.value.inputs = [{ name: 'input', type: 'any' }]
    componentForm.value.outputs = []
  }
}

// 添加入口参数
const addInputParam = () => {
  if (!componentForm.value.inputs) {
    componentForm.value.inputs = []
  }
  componentForm.value.inputs.push({ name: '', type: 'any' })
}

// 删除入口参数
const removeInputParam = (index: number | string) => {
  const idx = typeof index === 'string' ? parseInt(index) : index
  componentForm.value.inputs.splice(idx, 1)
}

// 添加出口参数
const addOutputParam = () => {
  if (!componentForm.value.outputs) {
    componentForm.value.outputs = []
  }
  componentForm.value.outputs.push({ type: 'any' })
}

// 删除出口参数
const removeOutputParam = (index: number | string) => {
  const idx = typeof index === 'string' ? parseInt(index) : index
  componentForm.value.outputs.splice(idx, 1)
}

// 组件表单校验规则
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

// 提交组件表单
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
          ElMessage.success('更新成功')
        } else {
          await componentStore.createComponent(submitData)
          ElMessage.success('创建成功')
        }
        settingDialogVisible.value = false
        await componentStore.fetchAllComponents()
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// ==================== 属性相关逻辑 ====================

// 属性列表（转换为数组格式）
const propertyList = computed(() => {
  if (!componentForm.value.properties) return []
  return Object.entries(componentForm.value.properties).map(([key, value]: [string, any]) => ({
    identify: key,
    ...value
  }))
})

// 属性表单校验规则
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

// 初始化属性表单
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

// 添加属性
const addProperty = () => {
  initPropertyForm()
  state.isPropertyEdit = false
  state.propertyDialogVisible = true
}

// 编辑属性
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

// 显示约束信息
const showConstraints = (component: Component) => {
  selectedComponent.value = component
  constraintDialogVisible.value = true
}

// 查看节点JSON
const viewJson = (component: Component) => {
  jsonComponent.value = component
  jsonDialogVisible.value = true
}

// 复制JSON
const copyJson = () => {
  navigator.clipboard.writeText(formattedComponentJson.value)
    .then(() => {
      ElMessage.success('JSON已复制到剪贴板')
    })
    .catch(err => {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    })
}

// 删除节点
const handleDelete = (row: Component) => {
  ElMessageBox.confirm(
    `确定要删除节点 "${row.name}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(async () => {
    try {
      if (row.id) {
        await componentStore.deleteComponent(row.id)
        ElMessage.success('删除成功')
      }
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
  .catch(() => {
    // 用户取消操作
  })
}

// 获取用途对应的标签类型
const getPurposeTagType = (purpose: string) => {
  switch(purpose) {
    case PurposeType.BusinessFlow: return 'primary'
    case PurposeType.InterfaceFlow: return 'warning'
    case PurposeType.DeviceLogic: return 'success'
    default: return 'info'
  }
}

// 获取用途文本
const getPurposeText = (purpose: string) => {
  switch(purpose) {
    case PurposeType.BusinessFlow: return '业务流'
    case PurposeType.InterfaceFlow: return '界面流'
    case PurposeType.DeviceLogic: return '设备逻辑'
    default: return purpose
  }
}

// 获取节点类型对应的标签类型
const getTypeTagType = (type: string) => {
  switch(type) {
    case 'start': return 'success'
    case 'end': return 'danger'
    case 'process': return 'primary'
    case 'condition': return 'warning'
    case 'device': return 'info'
    default: return 'info'
  }
}

// 获取节点类型文本
const getTypeText = (type: string) => {
  switch(type) {
    case 'start': return '开始节点'
    case 'end': return '结束节点'
    case 'process': return '处理节点'
    case 'condition': return '条件节点'
    case 'device': return '设备节点'
    default: return type
  }
}
</script>

<style scoped>
.page-container {
  width: 100%;
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

/* 设置弹窗样式 */
.setting-dialog :deep(.el-dialog__body) {
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
}

.component-setting-container {
  width: 100%;
}

.setting-card {
  margin-bottom: 0;
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

/* 属性区域样式 */
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
  gap: 12px;
}

.premium-dialog :deep(.el-dialog__body) {
  max-height: 65vh;
  overflow-y: auto;
}
</style>
