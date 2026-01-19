<template>
  <div class="nodetype-setting">
    <div class="nodetype-header">
      <h2>{{ isEditMode ? '编辑节点类型——'+ nodeTypeForm.name : '创建节点类型' }}</h2>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </div>
    </div>

    <!-- 基本信息表单 - 提到最上面 -->
    <el-card class="basic-info-card">
      <el-form 
        :model="nodeTypeForm" 
        :rules="basicRules"
        ref="nodeTypeFormRef"
        label-width="120px">
        <el-form-item label="节点类型编码" prop="code">
          <el-input v-model="nodeTypeForm.code" placeholder="请输入节点类型编码"></el-input>
        </el-form-item>
        <el-form-item label="节点类型名称" prop="name">
          <el-input v-model="nodeTypeForm.name" placeholder="请输入节点类型名称"></el-input>
        </el-form-item>
        <el-form-item label="节点类型描述" prop="description">
          <el-input type="textarea" :rows="3" v-model="nodeTypeForm.description" placeholder="请输入节点类型描述"></el-input>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
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
    // const res: any = await getNodeTypeById(id)
    // if (res.data) {
    //   const nodeType = res.data
    //   nodeTypeForm.value.code = nodeType.code || ''
    //   nodeTypeForm.value.name = nodeType.name || ''
    //   nodeTypeForm.value.description = nodeType.description || ''
    // }
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
  } else {
    nodeTypeForm.value = {
      code: '',
      name: '',
      description: ''
    }
  }
})
</script>

<style scoped>
.nodetype-setting {
  padding: 20px;
}

.nodetype-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.basic-info-card {
  margin-bottom: 20px;
}
</style>
