<template>
  <div class="domain-setting-container">
    <div class="page-header">
      <div class="page-title-group">
        <h2 class="page-main-title">{{ isEditMode ? '编辑领域' : '创建领域' }}</h2>
        <p v-if="isEditMode" class="page-sub-title">{{ domainForm.name || '领域详情' }}</p>
        <p v-else-if="isFromTem" class="page-sub-title">从模板快速创建领域及其预定义模型和组件</p>
        <p v-else class="page-sub-title">定义新的物联网垂直领域及其专有的元工具集</p>
      </div>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button 
          v-if="isEditMode"
          :type="domainForm.status === '1' ? 'warning' : 'success'" 
          plain
          @click="handlePublish"
        >
          {{ domainForm.status === '1' ? '取消发布' : '发布领域' }}
        </el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">
          {{ isEditMode ? '保存更改' : '立即创建' }}
        </el-button>
        <el-dropdown v-if="isEditMode" @command="handleMoreAction" trigger="click">
          <el-button>更多操作<el-icon class="el-icon--right"><arrow-down /></el-icon></el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="saveTemplate">保存为模板</el-dropdown-item>
              <el-dropdown-item command="download" :disabled="domainForm.status !== '1'">下载制品</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <div class="setting-content">
      <el-tabs v-model="activeTab" class="premium-tabs">
        <el-tab-pane label="基本信息" name="basic">
          <el-form 
            :model="domainForm" 
            :rules="rules"
            ref="domainFormRef"
            label-position="top">
            
            <div class="form-section">
              <div class="section-header">
                <el-icon><InfoFilled /></el-icon>
                <span>基础信息配置</span>
              </div>
              <el-row :gutter="32">
                <el-col :span="8">
                  <el-form-item label="领域编码" prop="code">
                    <el-input v-model="domainForm.code" :disabled="isEditMode" placeholder="不可修改，只能包含字母数字"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="领域名称" prop="name">
                    <el-input v-model="domainForm.name" placeholder="支持中文，简洁明了"></el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="DSL 标准" prop="dslStandard">
                    <el-select v-model="domainForm.dslStandard" style="width: 100%">
                      <el-option label="默认不限" value="default" />
                      <el-option label="UBML" value="UBML" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-form-item label="领域详情描述" prop="description">
                <el-input type="textarea" :rows="3" v-model="domainForm.description" placeholder="请输入领域的详细描述和业务背景..."></el-input>
              </el-form-item>
            </div>

            <div class="form-section" style="margin-top: 24px">
              <div class="section-header">
                <el-icon><Setting /></el-icon>
                <span>技术栈与工具链</span>
              </div>
              <el-row :gutter="32">
                <el-col :span="8">
                  <el-form-item label="代码编辑器" prop="codeEditor">
                    <el-select v-model="domainForm.codeEditor" style="width: 100%">
                      <el-option label="Monaco Editor" value="default" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="模型编辑器" prop="modelEditor">
                    <el-select v-model="domainForm.modelEditor" style="width: 100%">
                      <el-option label="GoJS / G6" value="default" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="后端运行框架" prop="baseFramework">
                    <el-select v-model="domainForm.baseFramework" style="width: 100%">
                      <el-option label="Spring Boot" value="springboot" />
                      <el-option label="Node.js" value="nodejs" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </div>

            <div class="form-section status-section" style="margin-top: 24px" v-if="isEditMode">
              <div class="section-header">
                <el-icon><Connection /></el-icon>
                <span>发布状态</span>
              </div>
              <div class="status-card">
                <div class="status-info">
                  <span class="label">当前状态:</span>
                  <el-tag :type="domainForm.status === '1' ? 'success' : 'info'" effect="dark" round>
                    {{ domainForm.status === '1' ? '已发布' : '定制中' }}
                  </el-tag>
                </div>
                <div v-if="domainForm.status === '1'" class="url-info">
                  <span class="label">领域访问地址:</span>
                  <el-link type="primary" :href="domainForm.url" target="_blank">{{ domainForm.url }}</el-link>
                </div>
              </div>
            </div>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="模型模板组" name="template" v-if="isEditMode || isFromTem">
          <DomainTemplate />
        </el-tab-pane>

        <el-tab-pane label="设备模型库" name="model" v-if="isEditMode || isFromTem">
          <DomainDeviceType />
        </el-tab-pane>

        <el-tab-pane label="领域原子组件" name="component" v-if="isEditMode || isFromTem">
          <DomainComponent />
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- Publish Dialog -->
    <el-dialog
      v-model="publishDialogVisible"
      title="发布领域至平台"
      width="500px"
      class="premium-dialog"
    >
      <p class="dialog-tip">发布后，该领域将可以在领域平台中被访问 and 使用。</p>
      <el-form label-position="top">
        <el-form-item label="发布访问地址 (URL)">
          <el-input v-model="domainForm.url" placeholder="http(s)://example.com" clearable>
            <template #prefix><el-icon><Link /></el-icon></template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="publishDialogVisible = false">暂不发布</el-button>
          <el-button type="primary" @click="publishDomain">确认发布</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
import { ArrowDown, InfoFilled, Setting, Connection, Link } from '@element-plus/icons-vue'
import { useDomainStore } from '@/store/domain'
import { useDomainTemplateStore } from '@/store/domainTemplate'
import { useDomainComponentTemplateStore } from '@/store/domainComponentTemplate'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getDomainById } from '@/api/domain'
import { useRouter, useRoute } from 'vue-router'
import DomainDeviceType from './component/DomainDeviceType.vue'
import DomainTemplate from './component/DomainTemplate.vue'
import DomainComponent from './component/DomainComponent.vue'
import { useDeviceTypeStore } from "@/store/deviceType"
import { useComponentStore } from '@/store/component'
import axios from 'axios'

interface DomainForm {
  code: string
  name: string
  description: string
  status: string
  codeEditor: string
  modelEditor: string
  baseFramework: string
  dslStandard: string
  url: string
  domainTemplateId: number | null
}

const router = useRouter()
const route = useRoute()
const domainStore = useDomainStore()
const domainTemplateStore = useDomainTemplateStore()
const domainComponentTemplateStore = useDomainComponentTemplateStore()
const deviceTypeStore = useDeviceTypeStore()
const componentStore = useComponentStore()
const domainFormRef = ref<FormInstance>()

const state = reactive({
  activeTab: 'basic',
  domainForm: {
    code: '',
    name: '',
    description: '',
    status: '0',
    codeEditor: 'default',
    modelEditor: 'default',
    baseFramework: 'springboot',
    dslStandard: 'default',
    url: '',
    domainTemplateId: null
  } as DomainForm,
  submitting: false,
  publishDialogVisible: false
})

const { activeTab, domainForm, submitting, publishDialogVisible } = toRefs(state)

const isEditMode = computed(() => route.query.mode === 'edit')
const isFromTem = computed(() => route.query.mode === 'template')
const domainId = computed(() => parseInt(route.query.domainId as string))

const rules: FormRules = {
  code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }]
}

const resetFormData = () => {
  domainForm.value = {
    code: '',
    name: '',
    description: '',
    status: '0',
    codeEditor: 'default',
    modelEditor: 'default',
    baseFramework: 'springboot',
    dslStandard: 'default',
    url: '',
    domainTemplateId: null
  }
}

const loadDomainToForm = (domain: any) => {
  if (domain) {
    domainForm.value = {
      code: domain.domainCode || '',
      name: domain.domainName || '',
      description: domain.domainDescription || '',
      status: domain.status || '0',
      url: domain.url || '',
      codeEditor: domain.codeEditor || 'default',
      modelEditor: domain.modelEditor || 'default',
      baseFramework: domain.framework || 'springboot',
      dslStandard: domain.dsl || 'default',
      domainTemplateId: domain.domainTemplateId || null
    }
  }
}

watch([() => route.query.domainId, () => route.query.mode, () => route.query.domainName, () => route.query.domainCode], async ([newId, newMode, newName, newCode]) => {
  if (newMode === 'create' || newMode === 'template') {
    resetFormData()
    domainForm.value.code = newCode as string || ''
    domainForm.value.name = newName as string || ''

    if (newMode === 'template') {
      const template = domainTemplateStore.currentDomainTemplate as any
      if (template) {
        domainForm.value.description = template.domainData.description || ''
        domainForm.value.codeEditor = template.domainData.codeEditor || 'default'
        domainForm.value.modelEditor = template.domainData.modelEditor || 'default'
        domainForm.value.baseFramework = template.domainData.baseFramework || 'springboot'
        domainForm.value.dslStandard = template.domainData.dslStandard || 'default'
        
        domainComponentTemplateStore.setTemplates(template.templates)
        deviceTypeStore.setDeviceTypes(template.deviceTypes)
        componentStore.setComponents(template.components)
      }
    }
  } else if (newMode === 'edit' && newId) {
    const res: any = await getDomainById(parseInt(newId as string))
    if (res.data) loadDomainToForm(res.data)
  }
}, { immediate: true })

const navigateBack = () => router.push('/meta/domain/list')

const submitForm = async () => {
  if (!domainFormRef.value) return
  await domainFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEditMode.value) {
          await domainStore.updateDomain(domainId.value, domainForm.value)
          ElMessage.success('更新领域成功')
        } else if (isFromTem.value) {
          await domainStore.createDomainFromTemplate(domainForm.value, domainComponentTemplateStore.templates, deviceTypeStore.deviceTypes, componentStore.components)
          ElMessage.success('从模板创建成功')
        } else {
          await domainStore.createDomain(domainForm.value)
          ElMessage.success('新建领域成功')
        }
        navigateBack()
      } catch (error) {
        ElMessage.error('操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

const handlePublish = async () => {
  if (domainForm.value.status === '1') {
    domainStore.publishDomain(domainId.value, '', '0').then(res => {
      ElMessage.success('领域已下线')
      loadDomainToForm(res)
    })
  } else {
    publishDialogVisible.value = true
  }
}

const publishDomain = () => {
  if (!domainForm.value.url) return ElMessage.warning('请输入发布地址')
  const dslData = {
    domainData: domainForm.value,
    templates: domainComponentTemplateStore.templates,
    deviceTypes: deviceTypeStore.deviceTypes,
    components: componentStore.components
  }
  domainStore.publishDomain(domainId.value, domainForm.value.url, '1', dslData).then(res => {
    ElMessage.success('领域发布成功')
    loadDomainToForm(res)
    publishDialogVisible.value = false
  })
}

const handleMoreAction = (command: string) => {
  if (command === 'saveTemplate') saveTemplate()
  if (command === 'download') handleDownload()
}

const saveTemplate = async () => {
  const res = await domainTemplateStore.saveDomainTemplate(
    domainForm.value,
    domainComponentTemplateStore.templates,
    deviceTypeStore.deviceTypes,
    componentStore.components,
    domainForm.value.domainTemplateId || undefined
  )
  if (res.id && !domainForm.value.domainTemplateId) {
    await domainTemplateStore.saveTemplateId(domainId.value, res.id as number)
  }
  ElMessage.success('已保存为模板')
}

const handleDownload = () => {
  axios.get(`${import.meta.env.VITE_BASE_PATH}/domains/download/${domainId.value}`, { responseType: 'blob' }).then(res => {
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `${domainForm.value.code}.json`
    link.click()
    ElMessage.success('导出成功')
  })
}
</script>

<style scoped>
.domain-setting-container {
  width: 100%;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.setting-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.premium-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 24px;
  background: #fcfcfc;
  border-bottom: 1px solid #f0f2f5;
}

.premium-tabs :deep(.el-tabs__item) {
  height: 60px;
  line-height: 60px;
  font-size: 15px;
  font-weight: 500;
}

.premium-tabs :deep(.el-tab-pane) {
  padding: 32px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
  color: #303133;
  font-weight: 600;
  font-size: 16px;
}

.section-header .el-icon {
  color: #409eff;
}

.status-card {
  background: #f8fafd;
  padding: 24px;
  border-radius: 8px;
  border: 1px solid #edf2f9;
}

.status-info, .url-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.url-info { margin-top: 16px; }

.status-card .label {
  color: #606266;
  font-weight: 500;
  width: 100px;
}

.dialog-tip {
  color: #909399;
  font-size: 14px;
  margin-bottom: 20px;
}
</style>
