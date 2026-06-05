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
                <el-input v-model.number="templateForm.template_id" placeholder="模板唯一标识" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模板名称" prop="name">
                <el-input v-model="templateForm.name" placeholder="请输入模板显示名称" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="索引标识" prop="template_index">
                <el-input v-model="templateForm.template_index" placeholder="如 inBuilder_eventflow_001" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="提交者" prop="submitter">
                <el-input v-model="templateForm.submitter" placeholder="提交者名称" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="模板描述" prop="template_description">
            <el-input v-model="templateForm.template_description" type="textarea" :rows="3" placeholder="请输入模板描述信息" maxlength="500" show-word-limit />
          </el-form-item>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="示例图片URL" prop="example_image_url">
                <el-input v-model="templateForm.example_image_url" placeholder="模板截图URL" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="许可证" prop="license">
                <el-input v-model="templateForm.license" placeholder="如 MulanOWLBYv1" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="代码地址" prop="code_url">
                <el-input v-model="templateForm.code_url" placeholder="模板代码URL" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="仓库地址" prop="repository_url">
                <el-input v-model="templateForm.repository_url" placeholder="Git仓库URL" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="文件来源" prop="file_source">
            <el-input v-model="templateForm.file_source" placeholder="文件来源" />
          </el-form-item>

          <el-divider content-position="left">标签信息</el-divider>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="领域">
                <el-input v-model="tagDomain" placeholder="如 通用" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Schema">
                <el-input v-model="tagSchema" placeholder="如 inBuilderFlow" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="模板类型">
                <el-input v-model="tagTemplateType" placeholder="如 eventflow" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="语言/框架">
                <el-input v-model="tagLanguageFramework" placeholder="如 Vue" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="文件后缀">
                <el-input v-model="tagFileExtension" placeholder="如 json" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="功能标签">
                <el-input v-model="tagFunction" placeholder="如 设备事件驱动流" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="40" v-if="isEditMode">
            <el-col :span="12">
              <el-form-item label="创建时间">
                <el-input :model-value="fmtTime(templateForm.created_at)" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="更新时间">
                <el-input :model-value="fmtTime(templateForm.updated_at)" disabled />
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

const defaultForm = (): Template => ({
  template_id: 0,
  name: '',
  template_index: '',
  template_description: '',
  example_image_url: '',
  code_url: '',
  repository_url: '',
  file_source: '',
  submitter: '',
  license: '',
  tags: '' as any,
  created_at: '',
  updated_at: '',
})

const state = reactive({
  isEditMode: false,
  submitting: false,
  templateForm: defaultForm()
})

const { isEditMode, submitting, templateForm } = toRefs(state)

// 标签独立字段
const tagDomain = ref('')
const tagSchema = ref('')
const tagTemplateType = ref('')
const tagLanguageFramework = ref('')
const tagFileExtension = ref('')
const tagFunction = ref('')

/** 从 tags JSON 解析到独立字段 */
function parseTags(tags: Record<string, string[]> | string | undefined) {
  if (!tags) return
  let obj: Record<string, string[]> = {}
  if (typeof tags === 'string') {
    try { obj = JSON.parse(tags) } catch { return }
  } else {
    obj = tags
  }
  tagDomain.value = (obj.domain || []).join(', ')
  tagSchema.value = (obj.schema || []).join(', ')
  tagTemplateType.value = (obj.template_type || []).join(', ')
  tagLanguageFramework.value = (obj.language_framework || []).join(', ')
  tagFileExtension.value = (obj.file_extension || []).join(', ')
  tagFunction.value = (obj.function || []).join(', ')
}

/** 将独立字段合并为 tags JSON */
function buildTags(): Record<string, string[]> {
  return {
    domain: splitTags(tagDomain.value),
    schema: splitTags(tagSchema.value),
    template_type: splitTags(tagTemplateType.value),
    language_framework: splitTags(tagLanguageFramework.value),
    file_extension: splitTags(tagFileExtension.value),
    function: splitTags(tagFunction.value),
  }
}

function splitTags(val: string): string[] {
  return val.split(/[,，]/).map(s => s.trim()).filter(Boolean)
}

function fmtTime(val: string | undefined): string {
  if (!val) return ''
  try { return new Date(val).toLocaleDateString('zh-CN') } catch { return val }
}

onMounted(async () => {
  const templateId = route.query.templateId ? parseInt(route.query.templateId as string) : null

  if (templateId) {
    state.isEditMode = true
    await templateStore.fetchTemplateById(templateId)
    if (templateStore.currentTemplate) {
      templateForm.value = JSON.parse(JSON.stringify(templateStore.currentTemplate))
      parseTags(templateForm.value.tags)
    } else {
      ElMessage.error('加载模板数据失败')
      router.push('/')
    }
  } else {
    state.isEditMode = false
  }
})

const navigateBack = () => router.push('/')

const templateRules = {
  template_id: [
    { required: true, message: '请输入模板ID', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ]
}

const submitTemplateForm = async () => {
  if (!templateFormRef.value) return
  await templateFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        const submitData = { ...templateForm.value, tags: buildTags() }
        if (isEditMode.value && templateForm.value.template_id) {
          await templateStore.updateTemplate(templateForm.value.template_id, submitData)
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
.page-container { padding: 24px; background-color: #f5f7fa; min-height: 100vh }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px }
.page-main-title { font-size: 24px; font-weight: 600; color: #303133; margin: 0 }
.page-sub-title { font-size: 14px; color: #909399; margin: 8px 0 0 0 }
.header-actions { display: flex; gap: 12px }
.setting-card { margin-bottom: 24px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08) }
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600 }
.premium-form :deep(.el-form-item__label) { font-weight: 500; color: #606266 }
</style>