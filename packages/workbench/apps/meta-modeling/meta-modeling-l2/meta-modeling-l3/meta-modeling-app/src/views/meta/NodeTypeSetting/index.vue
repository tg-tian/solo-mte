<template>
  <div class="nodetype-setting">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">{{ isEditMode ? '编辑节点类型' : '创建节点类型' }}</h2>
        <p v-if="isEditMode" class="page-sub-title">{{ nodeTypeForm.name || '节点类型详情' }}</p>
        <p v-else class="page-sub-title">定义新的拓扑节点类型及其相关的业务属性</p>
      </div>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </div>
    </div>

    <!-- 基本信息表单 -->
    <el-card class="setting-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon><InfoFilled /></el-icon>
          <span>基础配置</span>
        </div>
      </template>
      <el-form 
        :model="nodeTypeForm" 
        :rules="basicRules"
        ref="nodeTypeFormRef"
        label-position="top">
        <el-row :gutter="32">
          <el-col :span="12">
            <el-form-item label="节点类型编码" prop="code">
              <el-input v-model="nodeTypeForm.code" placeholder="例如：sensor_node" :disabled="isEditMode"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="节点类型名称" prop="name">
              <el-input v-model="nodeTypeForm.name" placeholder="例如：传感器节点"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="节点类型描述" prop="description">
          <el-input type="textarea" :rows="3" v-model="nodeTypeForm.description" placeholder="请输入节点类型的功能描述、适用场景等信息"></el-input>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 表单引用
const nodeTypeFormRef = ref<FormInstance>()

// 状态
const state = reactive({
  nodeTypeForm: {
    code: '',
    name: '',
    description: ''
  },
  submitting: false
})

const { nodeTypeForm, submitting } = toRefs(state)

// 确定是否是编辑模式
const isEditMode = computed(() => {
  return route.query.mode === 'edit'
})

// 获取节点类型ID
const nodeTypeId = computed(() => {
  return parseInt(route.query.nodeTypeId as string) || null
})

// 验证规则
const basicRules = {
  code: [
    { required: true, message: '请输入节点类型编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入节点类型名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入节点类型描述', trigger: 'blur' }
  ]
}

// 返回列表
const navigateBack = () => {
  router.push('/meta/nodetype/list')
}

// 提交表单
const submitForm = async () => {
  if (!nodeTypeFormRef.value) return
  await nodeTypeFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEditMode.value && nodeTypeId.value) {
          // TODO: 更新节点类型
          // await updateNodeType(nodeTypeId.value, nodeTypeForm.value)
          ElMessage.success('更新成功')
        } else {
          // TODO: 创建节点类型
          // await createNodeType(nodeTypeForm.value)
          ElMessage.success('创建成功')
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

// 加载节点类型数据
const loadNodeTypeData = async (id: number) => {
  try {
    // TODO: 从API获取节点类型数据
  } catch (error) {
    console.error('加载节点类型数据失败:', error)
    ElMessage.error('加载节点类型数据失败')
  }
}

// 监听路由变化，加载对应的节点类型数据
watch([() => route.query.nodeTypeId, () => route.query.mode], async ([newId, newMode]) => {
  if (newMode === 'edit' && newId) {
    await loadNodeTypeData(parseInt(newId as string))
  } else {
    nodeTypeForm.value = {
      code: '',
      name: '',
      description: ''
    }
  }
}, { immediate: true })

onMounted(async () => {
  if (isEditMode.value && nodeTypeId.value) {
    await loadNodeTypeData(nodeTypeId.value)
  }
})
</script>

<style scoped>
.nodetype-setting {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.setting-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
</style>
