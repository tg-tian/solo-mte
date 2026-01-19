<template>
  <div class="domain-list-container">
    <div class="domain-header">
      <h2>领域平台列表</h2>
      <el-button type="primary" @click="handleCreate">创建领域</el-button>
    </div>
    
    <el-card class="domain-search">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="领域名称">
          <el-input v-model="searchForm.name" placeholder="请输入领域名称" clearable></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="已发布" value="1"></el-option>
            <el-option label="定制中" value="0"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <el-table
      v-loading="domainStore.loading"
      :data="filteredDomains"
      style="width: 100%; margin-top: 20px"
      border
    >
      <el-table-column prop="domainCode" label="领域编码" width="150"></el-table-column>
      <el-table-column prop="domainName" label="领域名称" min-width="100"></el-table-column>
      <el-table-column prop="domainDescription" label="描述" min-width="150"></el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="120">
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="120">
      </el-table-column>
      <!-- <el-table-column prop="sceneCount" label="场景数量" width="100"></el-table-column> -->
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === '1' ? 'success' : 'info'">
            {{ scope.row.status === '1' ? '已发布' : '定制中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="350">
        <template #default="scope">
          <el-button type="primary" size="small" @click="navigateToDomainSetting(scope.row)">编辑</el-button>
          <el-button type="success" size="small" @click="navigateToDomainPlatform(scope.row)">进入领域</el-button>
          <el-button type="success" size="small" @click="handleViewScenes(scope.row)">查看场景</el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog
        v-model="createDialogVisible"
        title="创建领域"
        width="50%"
    >
        <el-form :model="createForm" :rules="rules" ref="createFormRef" label-width="120px">
          <el-form-item label="领域名称" prop="name">
            <el-input v-model="createForm.name" placeholder="请输入领域名称" />
          </el-form-item>
          <el-form-item label="领域编码" prop="code">
            <el-input v-model="createForm.code" placeholder="请输入领域编码" />
          </el-form-item>
          <el-form-item label="选择创建方式" prop="createModel">
            <el-radio-group v-model="createModel">
              <el-radio value='1' size="large">自定义创建</el-radio>
              <el-radio value='2' size="large">从模版创建</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      <template #footer>
        <span class="dialog-footer">
        <el-button @click="resetCreate()">取消</el-button>
        <el-button type="primary" @click="navigateToDomainSetting()">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Template Selection Dialog -->
    <el-dialog
        v-model="templateDialogVisible"
        title="选择导入模版"
        width="500"
    >
      <el-carousel
          v-if="domainTemplates.length > 0"
          indicator-position="outside"
          type="card"
          :autoplay="false"
          class="template-carousel"
          ref="carouselRef"
          @change="handleCarouselChange"
      >
        <el-carousel-item v-for="(item, index) in domainTemplates" :key="index">
          <div class="carousel-item" >
            {{ item.domainData.name || '未命名模板' }}
          </div>
        </el-carousel-item>
      </el-carousel>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="templateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleTemplateSelect">
            确定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, toRefs } from 'vue'
import { useDomainStore } from '@/store/domain'
import { useDomainTemplateStore } from '@/store/domainTemplate'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FormInstance } from 'element-plus'
import {setDomainPlatform} from "@/api/domain";

const router = useRouter()
const domainStore = useDomainStore()
const domainTemplateStore = useDomainTemplateStore()

// 状态
const state = reactive({
  createDialogVisible: false,
  templateDialogVisible: false,
  searchForm: {
    name: '',
    status: ''
  },
  createForm:{
    name:'',
    code:'',
  },
  createModel: '1',
  domainTemplates: [] as any[],
  activeTemplateIndex: 0
})

const { searchForm, createDialogVisible, createForm, createModel, templateDialogVisible, domainTemplates, activeTemplateIndex } = toRefs(state)

const createFormRef = ref<FormInstance>()
const carouselRef = ref()

const rules = {
  name: [
    { required: true, message: '请输入领域名称', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9]{1,40}$/, message: '支持中文、大小写字母、数字，不超过40个字符', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入领域编码', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]{2,20}$/, message: '领域编码只能包含字母和数字，长度在2-20个字符之间', trigger: 'blur' }
  ]
}

// 过滤后的领域列表
const filteredDomains = computed(() => {
  if (!domainStore.domains) return []
  
  let domains = domainStore.domains.filter((domain: any) => {
    const nameMatch = !searchForm.value.name || domain.domainName.toLowerCase().includes(searchForm.value.name.toLowerCase())
    const statusMatch = !searchForm.value.status || domain.status === searchForm.value.status
    return nameMatch && statusMatch
  }) as any[]
  domains = domains.map((domain: any)=>{
    return {
      ...domain,
      updateTime: domain.updateTime?.split('.')[0].replace('T', ' '),
      createTime: domain.createTime?.split('.')[0].replace('T', ' ')
    }
  })

  return domains
})


// 初始化
onMounted(async () => {
  await domainStore.fetchDomains()
})

//重置创建
const resetCreate = () => {
  createForm.value = {
    name: '',
    code: ''
  }
  createModel.value = '1'
  if (createFormRef.value) {
    createFormRef.value.resetFields()
  }
  createDialogVisible.value = false
}
// 搜索处理
const handleSearch = () => {
  // 过滤是在计算属性中完成的
}

// 重置搜索
const resetSearch = () => {
  searchForm.value.name = ''
  searchForm.value.status = ''
}

// 导航到领域设置页面
const navigateToDomainSetting = async (domain?: any) => {
  if (domain) {
    // 编辑领域
    domainStore.setCurrentDomain(domain)
    router.push(`/meta/domain/setting?mode=edit&domainId=${domain.domainId}`)
  } else {
    // 创建领域
    if (!createFormRef.value) return
    
    try {
      await createFormRef.value.validate()
      // 验证通过，继续处理
      if(createModel.value === '1'){
        router.push({
          path: '/meta/domain/setting',
          query: {
            mode:'create',
            domainName:createForm.value.name,
            domainCode:createForm.value.code,
          }
        })
      }else if(createModel.value === '2'){
        // Show template selection dialog
        templateDialogVisible.value = true
        await loadDomainTemplates()
      }
      createDialogVisible.value = false
    } catch (error) {
      // 验证失败
      console.error('表单验证失败:', error)
      return
    }
  }
}

// Load domain templates
const loadDomainTemplates = async () => {
  try {
    await domainTemplateStore.fetchDomainTemplates()
    domainTemplates.value = domainTemplateStore.domainTemplates.map((item: any) => ({
      ...JSON.parse(item.code)
    }))
  } catch (error) {
    console.error('Failed to load templates:', error)
    ElMessage.error('加载模板失败')
  }
}

const handleCarouselChange = (index: number) => {
  activeTemplateIndex.value = index
}

const handleTemplateSelect = async () => {
  if (domainTemplates.value.length === 0) {
    ElMessage.warning('没有可用的模板')
    return
  }
  
  const selectedTemplate = domainTemplates.value[activeTemplateIndex.value]
  if (!selectedTemplate) {
    ElMessage.warning('请选择模板')
    return
  }

  domainTemplateStore.setCurrentDomainTemplate(selectedTemplate)
  
  // Navigate to domain setting with template data
  router.push({
    path: '/meta/domain/setting',
    query: {
      mode: 'template',
      domainName: createForm.value.name,
      domainCode: createForm.value.code,
    }
  })
  
  templateDialogVisible.value = false
}

// 进入领域平台
const navigateToDomainPlatform = async (row: any) => {
  domainStore.setCurrentDomain(row)
  if(row.status !== '1'){
    ElMessage.warning('请先发布')
  }else if(row.url === ''){
    ElMessage.warning('领域地址不能为空')
  }else{
    const data = {
      name:row.domainCode,
      cnName:row.domainName,
      platformKind: "solo-dp",
      logo:"https://www.gitlink.org.cn/images/avatars/Organization/130318?t=1712062266"
    }
    const result = await setDomainPlatform(data)
    if(result) window.open(row.url)
  }
}

// 查看场景
const handleViewScenes = (row: any) => {
  console.log('Navigating to scenes for domain:', row)
  domainStore.setCurrentDomain(row)
  window.open(`/#/domain/scene/list?domainId=${row.domainId}`)
}

// 删除领域
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除领域 "${row.domainName}" 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
  .then(async () => {
    try {
      await domainStore.deleteDomain(row.domainId)
      ElMessage.success('删除成功')
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
  .catch(() => {
    // 用户取消操作
  })
}

// 在 script setup 部分添加
const handleCreate = () => {
  resetCreate()
  createDialogVisible.value = true
}
</script>

<style scoped>

.domain-list-container {
  padding: 20px;
}

.domain-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.domain-search {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.template-carousel {
  height: 200px;
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