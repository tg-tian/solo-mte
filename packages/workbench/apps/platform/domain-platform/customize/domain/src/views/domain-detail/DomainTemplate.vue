<template>
  <div class="domain-template">
    <div class="table-action-bar">
      <el-button type="primary" @click="openDialog">添加业务模板</el-button>
    </div>

    <el-empty v-if="boundTemplates.length === 0" description="该领域尚未添加任何业务模板" />

    <el-table
      v-else
      v-loading="templateStore.loading"
      :data="boundTemplates"
      style="width: 100%"
    >
      <el-table-column prop="name" label="模板名称" min-width="180" />
      <el-table-column prop="category" label="模板类型" width="140" />
      <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button link type="danger" @click="handleDelete(row)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="从模板库搜索并添加" width="900px">
      <el-input
        v-model="searchQuery.name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont"
        placeholder="搜索模板名称、分类或描述..."
        clearable
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button @click="handleSearch">搜索</el-button>
        </template>
      </el-input>

      <el-table
        v-loading="templateStore.loading"
        :data="filteredTemplates"
        style="width: 100%; margin-top: 16px"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="name" label="模板名称" min-width="180" />
        <el-table-column prop="category" label="模板类型" width="140" />
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
      </el-table>

      <div class="load-more" v-if="templateStore.hasMore">
        <el-button link @click="loadMore" :loading="templateStore.loading">加载更多模板</el-button>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addTemplate" :disabled="selectedTemplateIds.length === 0">
          确认添加所选
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useDomainComponentTemplateStore } from '../../store/domainComponentTemplate';
import type { TemplateRecord } from '../../types/models';

const props = defineProps<{
  domainId: number | null;
  isFromTemplate: boolean;
}>();

const templateStore = useDomainComponentTemplateStore();
const dialogVisible = ref(false);
const selectedTemplateIds = ref<number[]>([]);
const currentPage = ref(1);
const searchQuery = reactive({
  name_or_category_or_description_or_domain_or_tags_or_code_key_word_string_cont: '',
  name_cont: '',
  description_cont: '',
  tags_cont: ''
});

const boundTemplates = computed(() => templateStore.templates || []);
const filteredTemplates = computed(() => {
  const boundIds = boundTemplates.value.map((item) => item.template_id || item.id);
  return (templateStore.allTemplates || []).filter((item) => !boundIds.includes(item.id));
});

onMounted(async () => {
  if (!props.isFromTemplate && props.domainId) {
    await templateStore.fetchTemplates(props.domainId);
  }
});

async function openDialog() {
  dialogVisible.value = true;
  selectedTemplateIds.value = [];
  currentPage.value = 1;
  await templateStore.fetchAllTemplates(1);
}

function handleSelectionChange(rows: TemplateRecord[]) {
  selectedTemplateIds.value = rows.map((item) => item.id);
}

async function addTemplate() {
  const selectedRows = templateStore.allTemplates.filter((item) => selectedTemplateIds.value.includes(item.id));
  try {
    if (props.isFromTemplate) {
      templateStore.setTemplates([...templateStore.templates, ...selectedRows]);
    } else if (props.domainId) {
      for (const row of selectedRows) {
        await templateStore.bindingTemplates(props.domainId, row.id);
      }
    }
    ElMessage.success('成功添加模板到当前领域');
    dialogVisible.value = false;
  } catch (_error) {
    ElMessage.error('添加失败');
  }
}

async function handleDelete(row: TemplateRecord) {
  await ElMessageBox.confirm(`确定要移除模板 "${row.name}" 吗？`, '警告', { type: 'warning' });
  if (props.isFromTemplate) {
    templateStore.setTemplates(
      templateStore.templates.filter((item) => (item.template_id || item.id) !== (row.template_id || row.id))
    );
  } else if (props.domainId) {
    const templateId = row.template_id || row.id;
    await templateStore.unbindingTemplates(props.domainId, templateId);
  }
  ElMessage.success('移除成功');
}

async function loadMore() {
  currentPage.value += 1;
  await templateStore.fetchAllTemplates(currentPage.value, searchQuery);
}

async function handleSearch() {
  currentPage.value = 1;
  await templateStore.fetchAllTemplates(1, searchQuery);
}
</script>

<style scoped>
.table-action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.load-more {
  margin-top: 12px;
  text-align: center;
}
</style>
