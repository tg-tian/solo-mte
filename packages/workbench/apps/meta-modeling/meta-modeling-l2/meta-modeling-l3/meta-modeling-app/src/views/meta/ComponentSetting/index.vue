<template>
  <div class="component-setting-container">
    <div class="component-header">
      <h2>{{ isEditMode ? '编辑组件' : '创建组件' }}</h2>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </div>
    </div>

    <el-card class="setting-content">
      <el-form 
        :model="componentForm" 
        :rules="rules"
        ref="componentFormRef"
        label-width="120px">
        <el-form-item label="组件编码" prop="code">
          <el-input v-model="componentForm.code" placeholder="请输入组件编码"></el-input>
        </el-form-item>
        <el-form-item label="组件名称" prop="name">
          <el-input v-model="componentForm.name" placeholder="请输入组件名称"></el-input>
        </el-form-item>
        <el-form-item label="组件描述" prop="description">
          <el-input type="textarea" :rows="3" v-model="componentForm.description" placeholder="请输入组件描述"></el-input>
        </el-form-item>
        <el-form-item label="组件类型" prop="type">
          <el-radio-group v-model="componentForm.type" @change="handleTypeChange">
            <el-radio :label="ComponentType.Node">节点</el-radio>
            <el-radio :label="ComponentType.Edge">边</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="用途" prop="purpose">
          <el-select v-model="componentForm.purpose" placeholder="请选择用途">
            <el-option :label="'业务流'" :value="PurposeType.BusinessFlow"></el-option>
            <el-option :label="'界面流'" :value="PurposeType.InterfaceFlow"></el-option>
            <el-option :label="'设备逻辑'" :value="PurposeType.DeviceLogic"></el-option>
          </el-select>
        </el-form-item>
        
        <!-- 节点约束 -->
        <template v-if="componentForm.type === ComponentType.Node">
          <h3>入口约束</h3>
          <el-form-item label="数量" prop="inputConstraint.quantity">
            <el-input-number 
              v-model="componentForm.inputConstraint.quantity" 
              :min="-1" 
              :max="100"
              :controls="true"
              placeholder="请输入约束数量（-1表示无限制）"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="类型" prop="inputConstraint.type">
            <el-input v-model="componentForm.inputConstraint.type" placeholder="请输入约束类型"></el-input>
          </el-form-item>
          
          <h3>出口约束</h3>
          <el-form-item label="数量" prop="outputConstraint.quantity">
            <el-input-number 
              v-model="componentForm.outputConstraint.quantity" 
              :min="-1" 
              :max="100"
              :controls="true"
              placeholder="请输入约束数量（-1表示无限制）"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="类型" prop="outputConstraint.type">
            <el-input v-model="componentForm.outputConstraint.type" placeholder="请输入约束类型"></el-input>
          </el-form-item>
        </template>
        
        <!-- 边约束 -->
        <template v-if="componentForm.type === ComponentType.Edge">
          <h3>起点约束</h3>
          <el-form-item label="数量" prop="startConstraint.quantity">
            <el-input-number 
              v-model="componentForm.startConstraint.quantity" 
              :min="-1" 
              :max="100"
              :controls="true"
              placeholder="请输入约束数量（-1表示无限制）"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="类型" prop="startConstraint.type">
            <el-input v-model="componentForm.startConstraint.type" placeholder="请输入约束类型"></el-input>
          </el-form-item>
          
          <h3>终点约束</h3>
          <el-form-item label="数量" prop="endConstraint.quantity">
            <el-input-number 
              v-model="componentForm.endConstraint.quantity" 
              :min="-1" 
              :max="100"
              :controls="true"
              placeholder="请输入约束数量（-1表示无限制）"
            ></el-input-number>
          </el-form-item>
          <el-form-item label="类型" prop="endConstraint.type">
            <el-input v-model="componentForm.endConstraint.type" placeholder="请输入约束类型"></el-input>
          </el-form-item>
        </template>
      </el-form>
    </el-card>

    <!-- JSON查看对话框 -->
    <el-dialog v-model="jsonDialogVisible" title="组件JSON" width="60%">
      <pre class="json-viewer">{{ formattedJson }}</pre>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="copyJson">复制</el-button>
          <el-button @click="jsonDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
import { useComponentStore } from '@/store/component'
import { Component, ComponentType, PurposeType } from '@/types/models'
import { ElMessage, type FormInstance } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const componentStore = useComponentStore()
const componentFormRef = ref<FormInstance>()

// State
const state = reactive({
  componentForm: {
    code: '',
    name: '',
    description: '',
    type: ComponentType.Node, // Default to Node type
    purpose: PurposeType.BusinessFlow, // Default to Business Flow
    inputConstraint: {
      quantity: 0,
      type: 'none'
    },
    outputConstraint: {
      quantity: 1,
      type: 'any'
    },
    startConstraint: {
      quantity: 1,
      type: 'node'
    },
    endConstraint: {
      quantity: 1,
      type: 'node'
    }
  } as Component,
  submitting: false,
  jsonDialogVisible: false
})

const { componentForm, submitting, jsonDialogVisible } = toRefs(state)

// Determine if we're in edit mode
const isEditMode = computed(() => {
  return route.query.mode === 'edit'
})

// Get component ID if in edit mode
const componentId = computed(() => {
  return parseInt(route.query.componentId as string) || null
})

// Format JSON for viewing
const formattedJson = computed(() => {
  return JSON.stringify(componentForm.value, null, 2)
})

// Rules for form validation
const rules = {
  code: [
    { required: true, message: '请输入组件编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入组件名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入组件描述', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择组件类型', trigger: 'change' }
  ],
  purpose: [
    { required: true, message: '请选择用途', trigger: 'change' }
  ]
}

// Reset form for creation mode
const resetFormData = () => {
  componentForm.value = {
    code: '',
    name: '',
    description: '',
    type: ComponentType.Node,
    purpose: PurposeType.BusinessFlow,
    inputConstraint: {
      quantity: 0,
      type: 'none'
    },
    outputConstraint: {
      quantity: 1,
      type: 'any'
    },
    startConstraint: {
      quantity: 1,
      type: 'node'
    },
    endConstraint: {
      quantity: 1,
      type: 'node'
    }
  }
}

// Handle component type change
const handleTypeChange = (value: any) => {
  // Reset constraints based on component type
  if (value === ComponentType.Node) {
    componentForm.value.inputConstraint = {
      quantity: 0,
      type: 'none'
    }
    componentForm.value.outputConstraint = {
      quantity: 1,
      type: 'any'
    }
  } else {
    componentForm.value.startConstraint = {
      quantity: 1,
      type: 'node'
    }
    componentForm.value.endConstraint = {
      quantity: 1,
      type: 'node'
    }
  }
}

// Copy JSON to clipboard
const copyJson = () => {
  navigator.clipboard.writeText(formattedJson.value)
    .then(() => {
      ElMessage.success('JSON已复制到剪贴板')
    })
    .catch(err => {
      console.error('复制失败:', err)
      ElMessage.error('复制失败')
    })
}

const loadComponent = (data : any) => {
  const comp = JSON.parse(JSON.stringify(data))
  if(comp.type === ComponentType.Node && comp.inputConstraint === null){
    comp.inputConstraint = {
        quantity: 0,
        type: 'none'
    }
  }
  if(comp.type === ComponentType.Node && comp.outputConstraint === null){
    comp.outputConstraint = {
      quantity: 1,
      type: 'any'
    }
  }
  if(comp.type === ComponentType.Edge && comp.startConstraint === null){
    comp.startConstraint = {
      quantity: 1,
      type: 'node'
    }
  }
  if(comp.type === ComponentType.Edge && comp.endConstraint === null){
    comp.endConstraint = {
      quantity: 1,
      type: 'node'
    }
  }
  componentForm.value = comp
}

// Watch for changes in route params to update form data accordingly
watch([() => route.query.componentId, () => route.query.mode], async ([newComponentId, newMode]) => {
  if (newMode === 'create') {
    // Clear form data when switching to create mode
    resetFormData()
  } else if (newMode === 'edit' && newComponentId) {
    // Load component data when switching to edit mode or changing component ID
    if (componentId.value) {
      await componentStore.fetchComponentById(componentId.value)
      if (componentStore.currentComponent) {
        // Deep copy to avoid reference issues
        loadComponent(componentStore.currentComponent)
      } else {
        ElMessage.warning('组件数据不存在或获取失败')
        navigateBack()
      }
    }
  }
}, { immediate: true })

// Load component data if in edit mode
onMounted(async () => {
  // Clear form when in create mode
  if (!isEditMode.value) {
    resetFormData()
  }
  // If in edit mode, load component data if not already loaded by the watcher
  else if (isEditMode.value && componentId.value && !componentStore.currentComponent) {
    try {
      await componentStore.fetchComponentById(componentId.value)
      if (componentStore.currentComponent) {
        // Deep copy to avoid reference issues
        loadComponent(componentStore.currentComponent)
      } else {
        ElMessage.warning('组件数据不存在或获取失败')
        navigateBack()
      }
    } catch (error) {
      ElMessage.warning('加载组件数据失败')
      navigateBack()
    }
  }
})

// Navigate back to component list
const navigateBack = () => {
  router.push('/meta/component/list')
}

// Submit form - either create or update component
const submitForm = async () => {
  if (!componentFormRef.value) return
  
  await componentFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEditMode.value && componentId.value) {
          // Update existing component
          await componentStore.updateComponent(componentId.value, componentForm.value)
          ElMessage.success('更新成功')
        } else {
          // Create new component
          await componentStore.createComponent(componentForm.value)
          ElMessage.success('创建成功')
        }
        // Navigate back to list after successful operation
        navigateBack()
      } catch (error) {
        ElMessage.error(isEditMode.value ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}
</script>

<style scoped>
.component-setting-container {
  padding: 20px;
}

.component-header {
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
}

h3 {
  margin-top: 20px;
  margin-bottom: 10px;
  color: #606266;
  font-size: 16px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
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
