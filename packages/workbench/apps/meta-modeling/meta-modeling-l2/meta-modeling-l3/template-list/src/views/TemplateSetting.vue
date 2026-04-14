<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">{{ isEditMode ? '编辑模板' : '创建模板' }}</h2>
        <p class="page-sub-title">配置模板的基本信息和内容</p>
      </div>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button type="primary" @click="submitTemplateForm" :loading="submitting">保存配置</el-button>
      </div>
    </div>

    <div class="setting-content">
      <el-card class="setting-card" shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>基础信息</span>
          </div>
        </template>
        
        <el-form 
          :model="templateForm" 
          :rules="templateRules" 
          ref="templateFormRef" 
          label-position="top"
          class="premium-form"
        >
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="模板ID" prop="template_id">
                <el-input 
                  v-model="templateForm.template_id" 
                  placeholder="请输入模板ID" 
                  :disabled="isEditMode"
                  type="number"
                >
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模板名称" prop="name">
                <el-input v-model="templateForm.name" placeholder="请输入模板显示名称"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="模板分类" prop="category">
                <el-input v-model="templateForm.category" placeholder="请输入分类"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="描述模型" prop="describing_the_model">
                <el-input v-model="templateForm.describing_the_model" placeholder="请输入描述模型"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="模板标签" prop="tags">
                <el-input v-model="templateForm.tags" placeholder="标签，逗号分隔"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="领域" prop="domain">
                <el-input v-model="templateForm.domain" placeholder="适用领域"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="模板描述" prop="description">
            <el-input 
              v-model="templateForm.description" 
              type="textarea" 
              :rows="3" 
              placeholder="请输入模板描述信息"
              maxlength="200"
              show-word-limit
            ></el-input>
          </el-form-item>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="图片URL" prop="image_url">
                <el-input v-model="templateForm.image_url" placeholder="模板截图URL"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="配置源URL" prop="url">
                <el-input v-model="templateForm.url" placeholder="JSON配置获取地址"></el-input>
              </el-form-item>
            </el-col>
          </el-row>

        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, toRefs } from 'vue'
import { useTemplateStore } from '../store/template'
import { Template } from '../types/models'
import { ElMessage, type FormInstance } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { InfoFilled } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const templateStore = useTemplateStore()
const templateFormRef = ref<FormInstance>()

// 状态
const state = reactive({
  isEditMode: false,
  submitting: false,
  templateForm: {
    template_id: 0,
    name: '',
    description: '',
    category: '',
    tags: '',
    domain: '',
    image_url: '',
    describing_the_model: '',
    url: ''
  } as Template
})

const { 
  isEditMode,
  submitting,
  templateForm
} = toRefs(state);

// 初始化
onMounted(async () => {
  const mode = route.query.mode as string
  const id = route.query.id ? parseInt(route.query.id as string) : null

  if (mode === 'edit' && id) {
    state.isEditMode = true
    await templateStore.fetchTemplateById(id)
    if (templateStore.currentTemplate) {
      loadTemplate(templateStore.currentTemplate)
    } else {
      ElMessage.error('加载模板数据失败')
      router.push('/')
    }
  } else {
    state.isEditMode = false
    resetTemplateForm()
  }
})

const navigateBack = () => {
  router.push('/')
}

// 重置模板表单
const resetTemplateForm = () => {
  templateForm.value = {
    template_id: 0,
    name: '',
    description: '',
    category: '',
    tags: '',
    domain: '',
    image_url: '',
    describing_the_model: '',
    url: ''
  } as Template
}

// 加载模板数据
const loadTemplate = (data: Template) => {
  templateForm.value = JSON.parse(JSON.stringify(data))
}

// 模板表单校验规则
const templateRules = {
  template_id: [
    { required: true, message: '请输入模板ID', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ]
}

// 提交模板表单
const submitTemplateForm = async () => {
  if (!templateFormRef.value) return
  await templateFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const submitData = { ...templateForm.value }
        
        if (isEditMode.value && templateForm.value.id) {
          await templateStore.updateTemplate(templateForm.value.id, submitData)
          ElMessage.success('更新成功')
        } else {
          await templateStore.createTemplate(submitData)
          ElMessage.success('创建成功')
        }
        router.push('/')
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败')
      } finally {
        submitting.value = false
      }
    }
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

.prefix-text {
  color: #909399;
  font-weight: 500;
}

.premium-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
}
</style>

