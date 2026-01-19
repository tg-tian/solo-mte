<template>
  <div class="domain-setting-container">
    <div class="domain-header">
      <h2>{{ isEditMode ? '编辑领域-'+domainForm.name : isFromTem ? '创建领域-从模板导入' : '创建领域' }}</h2>
      <div class="header-actions">
        <el-button @click="navigateBack">返回列表</el-button>
        <el-button 
          type="primary" 
          @click="handlePublish"
          v-if="isEditMode"
        >{{domainForm.status==='1' ? '取消发布':'发布'}}</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">{{ isEditMode ? '保存' : '创建' }}</el-button>
        <el-button 
          type="primary" 
          plain
          v-if="isEditMode"
          @click="saveTemplate"
        >保存为模板</el-button>
        <el-button @click="handleDownload" v-if="isEditMode && domainForm.status==='1'">下载发布制品</el-button>
      </div>
    </div>
    
    <el-card class="setting-content">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本信息" name="basic">
          <el-form 
            :model="domainForm" 
            :rules="rules"
            ref="domainFormRef"
            label-width="120px">
            <el-form-item label="领域编码" prop="code">
              <el-input v-model="domainForm.code" placeholder="请输入领域名称"></el-input>
            </el-form-item>
            <el-form-item label="领域名称" prop="name">
              <el-input v-model="domainForm.name" placeholder="请输入领域名称"></el-input>
            </el-form-item>
            <el-form-item label="领域描述" prop="description">
              <el-input type="textarea" :rows="3" v-model="domainForm.description" placeholder="请输入领域描述"></el-input>
            </el-form-item>
            <el-form-item label="代码编辑器" prop="codeEditor" class="half-width">
              <el-select v-model="domainForm.codeEditor" placeholder="请选择代码编辑器">
                <el-option label="默认" value="default" />
              </el-select>
            </el-form-item>
            <el-form-item label="模型编辑器" prop="modelEditor" class="half-width">
              <el-select v-model="domainForm.modelEditor" placeholder="请选择模型编辑器">
                <el-option label="默认" value="default" />
              </el-select>
            </el-form-item>
            <el-form-item label="基础运行框架" prop="baseFramework" class="half-width">
              <el-select v-model="domainForm.baseFramework" placeholder="请选择基础运行框架">
                <el-option label="Spring Boot" value="springboot" />
                <el-option label="Node.js" value="nodejs" />
              </el-select>
            </el-form-item>
            <el-form-item label="DSL标准" prop="dslStandard" class="half-width">
              <el-select v-model="domainForm.dslStandard" placeholder="请选择DSL标准">
                <el-option label="不限" value="default" />
                <el-option label="UBML" value="UBML" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-tag :type="domainForm.status==='1' ? 'success':'info'">{{ domainForm.status==='1' ? '已发布':'定制中' }}</el-tag>
            </el-form-item>
            <el-form-item label="领域地址" prop="url" v-if="domainForm.status==='1'">
              <el-input v-model="domainForm.url"></el-input>
            </el-form-item>
            <!-- <el-form-item label="图标">
              <el-upload
                action="#"
                list-type="picture-card"
                :auto-upload="false"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item> -->
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="领域模板" name="template" v-if="isEditMode || isFromTem">
          <!-- 模板库对接 -->
          <DomainTemplate />
        </el-tab-pane>

        <el-tab-pane label="设备类型" name="model" v-if="isEditMode || isFromTem">
          <DomainDeviceType />
        </el-tab-pane>

        <el-tab-pane label="领域组件" name="component" v-if="isEditMode || isFromTem">
          <DomainComponent />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- Publish Dialog -->
    <el-dialog
    v-model="publishDialogVisible"
    title="发布领域"
    width="500"
    >
    <el-input v-model="domainForm.url" placeholder="请输入发布地址"></el-input>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="publishDomain">
          确定
        </el-button>
      </div>
    </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { useDomainStore } from '@/store/domain'
import {useDomainTemplateStore} from "@/store/domainTemplate";
import {useDomainComponentTemplateStore} from "@/store/domainComponentTemplate";
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { getDomainById, getMockDomainById } from '@/api/domain'
import { useRouter, useRoute } from 'vue-router'
import DomainDeviceType from './component/DomainDeviceType.vue'
import DomainTemplate from './component/DomainTemplate.vue'
import DomainComponent from './component/DomainComponent.vue'
import {useDeviceTypeStore} from "@/store/deviceType";
import axios from 'axios';
import { request } from 'http';
import { useComponentStore } from '@/store/component';
import { ComponentType } from '@/types/models';

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
  domainTemplateId: number
}

const router = useRouter()
const route = useRoute()
const domainStore = useDomainStore()
const domainTemplateStore = useDomainTemplateStore()
const domainComponentTemplateStore = useDomainComponentTemplateStore()
const deviceTypeStore = useDeviceTypeStore()
const componentStore = useComponentStore()
const domainFormRef = ref<FormInstance>()

// State
const state = reactive({
  activeTab: 'basic',
  domainForm: {
    code: '',
    name: '',
    description: '',
    status: '0',
    codeEditor: '',
    modelEditor: '',
    baseFramework: '',
    dslStandard: '',
    url: '',
    domainTemplateId: 0
  } as DomainForm,
  submitting: false,
  publishDialogVisible: false
})

const { activeTab, domainForm, submitting, publishDialogVisible } = toRefs(state)

// 计算属性
const isEditMode = computed(() => {
  return route.query.mode === 'edit'
})

const isFromTem = computed(() => {
  return route.query.mode === 'template'
})

const domainId = computed(() => {
  return parseInt(route.query.domainId as string)
})

// 表单验证规则
const rules: FormRules = {
  code: [
    { required: true, message: '请输入领域编码', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入领域名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入领域描述', trigger: 'blur' }
  ],
  codeEditor: [
    { required: true, message: '请选择代码编辑器', trigger: 'change' }
  ],
  modelEditor: [
    { required: true, message: '请选择模型编辑器', trigger: 'change' }
  ],
  baseFramework: [
    { required: true, message: '请选择基础运行框架', trigger: 'change' }
  ],
  dslStandard: [
    { required: true, message: '请选择DSL标准', trigger: 'change' }
  ]
}

// 清空表单
const resetFormData = () => {
  domainForm.value = {
    code: '',
    name: '',
    description: '',
    status: '0',
    codeEditor: '',
    modelEditor: '',
    baseFramework: '',
    dslStandard: '',
    url: '',
    domainTemplateId: 0
  }
}

// 编辑表单时加载领域
const loadDomainToForm = (domain: any) => {
  // First reset the form to clear any previous data
  resetFormData()
  
  // Then load the domain data
  if (domain) {
    domainForm.value.code = domain.domainCode || ''
    domainForm.value.name = domain.domainName || ''
    domainForm.value.description = domain.domainDescription || ''
    domainForm.value.status = domain.status || '0'
    domainForm.value.url = domain.url || ''
    domainForm.value.codeEditor = domain.codeEditor || ''
    domainForm.value.modelEditor = domain.modelEditor || ''
    domainForm.value.baseFramework = domain.framework || ''
    domainForm.value.dslStandard = domain.dsl || ''
    domainForm.value.domainTemplateId = domain.domainTemplateId || null
    
    console.log('Domain data loaded to form:', domainForm.value)
  }
}

// 监听路由参数变化
watch([() => route.query.domainId, () => route.query.mode , () => route.query.domainName ,() => route.query.domainCode], async ([newDomainId, newMode,newDomainName,newDomainCode]) => {
  if (newMode === 'create' || newMode === 'template') {
    // 清空表单
    resetFormData()
    domainForm.value.code = newDomainCode as string;
    domainForm.value.name = newDomainName as string;

    // If template mode, load template data
    if (newMode === 'template') {
      const currentTemplate = domainTemplateStore.currentDomainTemplate as any
      if (currentTemplate) {
        domainForm.value.description = currentTemplate.domainData.description || ''
        domainForm.value.status = '0'
        domainForm.value.url = ''
        domainForm.value.codeEditor = currentTemplate.domainData.codeEditor || ''
        domainForm.value.modelEditor = currentTemplate.domainData.modelEditor || ''
        domainForm.value.baseFramework = currentTemplate.domainData.baseFramework || ''
        domainForm.value.dslStandard = currentTemplate.domainData.dslStandard || ''
        domainForm.value.domainTemplateId = 0

        domainComponentTemplateStore.setTemplates(currentTemplate.templates)
        deviceTypeStore.setDeviceTypes(currentTemplate.deviceTypes)
        componentStore.setComponents(currentTemplate.components)
        console.log('template:', domainComponentTemplateStore.templates)
        console.log('deviceType:', deviceTypeStore.deviceTypes)
        console.log('components:', componentStore.components)
        
        console.log('Domain data loaded from template:', domainForm.value)
      }
    }
  } else if (newMode === 'edit' && newDomainId) {
    // 加载领域数据
    try {
      const res: any = await getDomainById(parseInt(newDomainId as string))
      if (res.data && res.status === 200) {
        domainStore.setCurrentDomain(res.data)
        loadDomainToForm(res.data)
      } else {
        ElMessage.warning('领域数据不存在或获取失败')
        navigateBack()
      }
    } catch (error) {
      console.error('Failed to fetch domain:', error)
      ElMessage.warning('领域数据不存在或获取失败')
      navigateBack()
    }
  }
}, { immediate: true })

// 加载领域数据
onMounted(async () => {
  if (isEditMode.value && domainId.value) {
    const currentDomain = domainStore.currentDomain
    
    if (currentDomain && currentDomain.id === domainId.value) {
      // Load from current domain in store
      loadDomainToForm(currentDomain)
    } else {
      // Try to fetch domain data from API if not in store
      try {
        const res: any = await getDomainById(domainId.value)
        if (res.data && res.status === 200) {
          domainStore.setCurrentDomain(res.data)
          loadDomainToForm(res.data)
        } else {
          ElMessage.warning('领域数据不存在或获取失败')
          navigateBack()
        }
      } catch (error) {
        console.error('Failed to fetch domain:', error)
        ElMessage.warning('领域数据不存在或获取失败')
        navigateBack()
      }
    }
  }
})

// 返回领域列表
const navigateBack = () => {
  router.push('/meta/domain/list')
}

// 提交表单 - 创建或更新领域
const submitForm = async () => {
  if (!domainFormRef.value) return
  
  await domainFormRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (isEditMode.value && domainId.value) {
          // Update existing domain
          await domainStore.updateDomain(domainId.value, domainForm.value)
          ElMessage.success('更新成功')
        } else if (isFromTem.value) {
          // Create new domain from template
          await domainStore.createDomainFromTemplate(domainForm.value, domainComponentTemplateStore.templates, deviceTypeStore.deviceTypes, componentStore.components)
          ElMessage.success('创建成功')
        }else {
          // Create new domain
          await domainStore.createDomain(domainForm.value)
          ElMessage.success('创建成功')
        }
        // Navigate back to list after successful operation
        navigateBack()
      } catch (error) {
        console.error('Failed to create domain:', error)
        ElMessage.error(isEditMode.value ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }

    }
  })
}

/*-------------------------------------------------------发布领域---------------------------------------------------- */

// 点击发布按钮
const handlePublish = async () => {
  if (!domainFormRef.value) return
  
  await domainFormRef.value.validate(async (valid) => {
    if (valid) {
      if(domainForm.value.status === '1') {
        domainStore.publishDomain(domainId.value, '', '0')
        .then((res)=>{
          ElMessage.success('取消发布成功')
          loadDomainToForm(res)
        }
        ).catch((error)=>{
          ElMessage.error('取消发布失败:', error)
        })
      }else{
        publishDialogVisible.value=true
      }
    }
  })
}

// 发布领域
const publishDomain = () => {
  if(domainForm.value.url){
    let dslData = {
        domainData: domainForm.value,
        templates: domainComponentTemplateStore.templates,
        deviceTypes: deviceTypeStore.deviceTypes,
        components: componentStore.components
    }
    domainStore.publishDomain(domainId.value, domainForm.value.url, '1', dslData)
    .then((res)=>{
        ElMessage.success('发布成功')
        loadDomainToForm(res)
        publishDialogVisible.value = false
      }
    ).catch((error)=>{
      ElMessage.error('发布失败:', error)
    })
  }else{
    ElMessage.warning('请输入url')
  }
}

// 下载发布制品
const handleDownload =async () => {
  axios.get(`${import.meta.env.VITE_BASE_PATH as string}/domains/download/${domainId.value}`, {
    responseType: 'blob'
  }).then(response => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${domainForm.value.code}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    ElMessage.success("文件正在下载中")
});
}

/*--------------------------------------------------领域模板导入导出------------------------------------------------ */

// 保存模板
const saveTemplate = async () => {
  if (!domainFormRef.value) return
  await domainFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const res = await domainTemplateStore.saveDomainTemplate(
          domainForm.value,
          domainComponentTemplateStore.templates,
          deviceTypeStore.deviceTypes,
          componentStore.components,
          domainForm.value.domainTemplateId
        )
        
        if (!domainForm.value.domainTemplateId) {
          const saveRes = await domainTemplateStore.saveTemplateId(domainId.value, res.id)
          if (saveRes) {
            ElMessage.success('保存模版成功')
          }
        } else {
          ElMessage.success('保存模版成功')
        }
      } catch (error) {
        console.error('保存模版失败:', error)
        ElMessage.error('保存模版失败')
      }
    }
  })
}

const loadDomainFromTemplate = (template: any) => {
  if (template) {
    domainForm.value.description = template.domainData.description || ''
    domainForm.value.status = '0'
    domainForm.value.url = ''
    domainForm.value.codeEditor = template.domainData.codeEditor || ''
    domainForm.value.modelEditor = template.domainData.modelEditor || ''
    domainForm.value.baseFramework = template.domainData.baseFramework || ''
    domainForm.value.dslStandard = template.domainData.dslStandard || ''
    domainForm.value.domainTemplateId = 0

    domainComponentTemplateStore.templates = template.templates
    deviceTypeStore.deviceTypes = template.deviceTypes
    componentStore.components =  template.components
    
    console.log('Domain data loaded to template:', domainForm.value)
  }
}
</script>

<style scoped>
.domain-setting-container {
  padding: 20px;
}

.domain-header {
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

.publish-url {
  margin-top: 10px;
  width: 100%;
}

:deep(.half-width) {
  width: 50%;
}

.template-carousel {
  height:200px;
  border: 2px solid #ebeef5;
  border-radius: 4px;
  margin: 0 auto 30px;
}

.carousel-item {
  margin-top: 15%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  height: 40%;
  background: beige;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
  padding: 20px;
  border: 1px solid gray;
  box-sizing: border-box;
}
</style>
