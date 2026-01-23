<template>
  <div class="domain-template">
    <div class="table-action-bar">
      <el-button type="primary" @click="openDialog">
        <el-icon><Plus /></el-icon>添加业务模板
      </el-button>
    </div>

    <div v-if="filteredDomainTemplates.length === 0" class="empty-state">
      <el-empty description="该领域尚未添加任何业务模板" />
    </div>

    <el-table
      v-else
      v-loading="domainComponentTemplateStore.loading"
      :data="filteredDomainTemplates"
      style="width: 100%"
      class="premium-table"
      :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
    >
      <el-table-column prop="name" label="模板名称" min-width="150">
        <template #default="{ row }">
          <span class="template-name-text">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="模板类型" width="150">
        <template #default="{ row }">
          <el-tag effect="light">{{ row.category || '通用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
      <el-table-column label="操作" width="180" align="center" fixed="right">
        <template #default="scope">
          <el-button link type="primary" @click="navigateToTemplate(scope.row)">详情</el-button>
          <el-button link type="danger" @click="handleDelete(scope.row)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 模板详情对话框 -->
    <el-dialog 
      v-model="dialogDetailVisible"
      title="业务模板详情"
      width="600px"
      class="premium-dialog"
    >
        <div class="detail-container">
          <div class="detail-item">
            <span class="label">模板名称:</span>
            <span class="value">{{ domainComponentTemplateStore.currentTemplate.name }}</span>
          </div>
          <div class="detail-item">
            <span class="label">模板类型:</span>
            <span class="value"><el-tag>{{ domainComponentTemplateStore.currentTemplate.category }}</el-tag></span>
          </div>
          <div class="detail-item">
            <span class="label">业务描述:</span>
            <span class="value">{{ domainComponentTemplateStore.currentTemplate.description }}</span>
          </div>
          <div class="detail-item">
            <span class="label">参考链接:</span>
            <span class="value">
              <el-link type="primary" :href="domainComponentTemplateStore.currentTemplate.url" target="_blank">
                点击查看文档
              </el-link>
            </span>
          </div>
          <div class="detail-image" v-if="domainComponentTemplateStore.currentTemplate.image_url">
            <el-image :src="domainComponentTemplateStore.currentTemplate.image_url" fit="contain" />
          </div>
        </div>
    </el-dialog>

    <!-- 模板列表选择对话框 -->
    <el-dialog 
      v-model="dialogVisible"
      title="从模板库搜索并添加"
      width="900px"
      class="premium-dialog"
    >
      <div class="search-bar">
        <el-input
          v-model="state.searchQuery.name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont"
          placeholder="搜索模板名称、分类或描述..."
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
          <template #append><el-button @click="handleSearch">搜索</el-button></template>
        </el-input>
      </div>

      <div class="template-grid" v-loading="domainComponentTemplateStore.loading">
        <el-row :gutter="20">
          <el-col :span="8" v-for="item in filteredTemplates" :key="item.id">
            <TemplateCard 
                :template="item" 
                :reset-selected="resetSelected"
                @template-click="handleSelectTemplate"
            />
          </el-col>
        </el-row>
        <div v-if="filteredTemplates.length === 0" class="empty-search">
          <el-empty description="没有找到匹配的模板" :image-size="100" />
        </div>
      </div>

      <div class="load-more" v-if="domainComponentTemplateStore.hasMore">
        <el-button link @click="loadMore" :loading="domainComponentTemplateStore.loading">加载更多模板</el-button>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <span class="selected-count" v-if="selectedTemplates.length > 0">
            已选择 {{ selectedTemplates.length }} 个模板
          </span>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addTemplate" :disabled="selectedTemplates.length === 0">
            确认添加所选
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, toRefs, nextTick } from 'vue'
import { Plus, Search } from '@element-plus/icons-vue'
import { useDomainComponentTemplateStore } from '@/store/domainComponentTemplate'
import TemplateCard from './TemplateCard.vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const domainComponentTemplateStore = useDomainComponentTemplateStore()

const domainId = computed(() => parseInt(route.query.domainId as string))
const isFromTem = computed(() => route.query.mode === 'template')

const state = reactive({
    dialogVisible: false,
    dialogDetailVisible: false,
    selectedTemplates: [] as number[],
    searchQuery: {
        name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont: '',
        name_cont: '',
        description_cont: '',
        tags_cont: ''
    },
    resetSelected: false
})

const { dialogVisible, selectedTemplates, dialogDetailVisible, searchQuery, resetSelected } = toRefs(state)
const currentPage = ref(1)

onMounted(async () => {
    try {
        const domain = parseInt(route.query.domainId as string)
        if (!isNaN(domain)) {
            domainComponentTemplateStore.setCurrentDomain(domain)
            if (!isFromTem.value) {
                await domainComponentTemplateStore.fetchTemplates(domain)
            }
        }
    } catch (error) {
        console.error('加载模板列表失败:', error)
    }
})

watch(() => route.query.domainId, async (newId) => {
    if (newId) {
        const domain = parseInt(newId as string)
        domainComponentTemplateStore.setCurrentDomain(domain)
        if (!isFromTem.value) {
            await domainComponentTemplateStore.fetchTemplates(domain)
        }
    }
})

const openDialog = async () => {
    dialogVisible.value = true
    selectedTemplates.value = []
    resetSelected.value = true
    currentPage.value = 1
    resetSearch()
    await domainComponentTemplateStore.fetchAllTemplates(1)
    nextTick(() => { resetSelected.value = false })
}

const handleSelectTemplate = (id: number, isSelected: boolean) => {
    if (isSelected) {
        if (!selectedTemplates.value.includes(id)) selectedTemplates.value.push(id)
    } else {
        selectedTemplates.value = selectedTemplates.value.filter(tid => tid !== id)
    }
}

const addTemplate = async () => {
    try {
        const selectedData = domainComponentTemplateStore.allTemplates.filter(item => selectedTemplates.value.includes(item.id))
        if (isFromTem.value) {
            domainComponentTemplateStore.templates.push(...selectedData)
        } else {
            await domainComponentTemplateStore.bindingTemplates(domainId.value, selectedData)
        }
        ElMessage.success("成功添加模板到当前领域")
        dialogVisible.value = false
    } catch (error) {
        ElMessage.error("添加失败")
    }
}

const loadMore = async () => {
    currentPage.value++
    await domainComponentTemplateStore.fetchAllTemplates(currentPage.value, searchQuery.value)
}

const filteredDomainTemplates = computed(() => domainComponentTemplateStore.templates || [])

const filteredTemplates = computed(() => {
    if (!domainComponentTemplateStore.allTemplates) return []
    const boundIds = filteredDomainTemplates.value.map(t => t.template_id || t.id)
    return domainComponentTemplateStore.allTemplates.filter(t => !boundIds.includes(t.id))
})

const navigateToTemplate = (template: any) => {
    domainComponentTemplateStore.setCurrentTemplate(template)
    dialogDetailVisible.value = true
}

const handleDelete = (row: any) => {
    ElMessageBox.confirm(`确定要移除模板 "${row.name}" 吗？`, '警告', {
        type: 'warning'
    }).then(async () => {
        if (isFromTem.value) {
            domainComponentTemplateStore.templates = domainComponentTemplateStore.templates.filter(t => (t.template_id || t.id) !== (row.template_id || row.id))
        } else {
            await domainComponentTemplateStore.unbindingTemplates(domainId.value, row.id)
        }
        ElMessage.success('移除成功')
    }).catch(() => {})
}

const handleSearch = () => {
    currentPage.value = 1
    domainComponentTemplateStore.fetchAllTemplates(1, searchQuery.value)
}

const resetSearch = () => {
    currentPage.value = 1
    searchQuery.value = {
        name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont: '',
        name_cont: '',
        description_cont: '',
        tags_cont: ''
    }
}
</script>

<style scoped>
.domain-template {
  height: 100%;
}

.table-action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.premium-table {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.template-name-text {
  font-weight: 600;
  color: #303133;
}

.empty-state {
  padding: 60px 0;
}

.detail-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  gap: 12px;
  line-height: 1.6;
}

.detail-item .label {
  color: #909399;
  width: 80px;
  flex-shrink: 0;
}

.detail-item .value {
  color: #303133;
}

.detail-image {
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0f2f5;
}

.search-bar {
  margin-bottom: 24px;
}

.template-grid {
  min-height: 300px;
}

.load-more {
  text-align: center;
  margin-top: 24px;
}

.selected-count {
  margin-right: 16px;
  color: #409eff;
  font-weight: 600;
}

.empty-search {
  grid-column: 1 / -1;
  padding: 40px 0;
}
</style>