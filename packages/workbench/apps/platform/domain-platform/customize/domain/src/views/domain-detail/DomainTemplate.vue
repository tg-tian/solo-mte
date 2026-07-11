<template>
  <div class="domain-template">
    <div class="table-action-bar">
      <el-button type="primary" @click="openDialog">添加领域模板</el-button>
    </div>

    <el-empty v-if="boundTemplates.length === 0" description="该领域尚未添加任何领域模板" />

    <el-table
      v-else
      v-loading="templateStore.loading"
      :data="boundTemplates"
      style="width: 100%"
      max-height="calc(100vh - 280px)"
    >
      <el-table-column prop="template_id" label="模板ID" width="100" />
      <el-table-column prop="name" label="模板名称" min-width="180" />
      <el-table-column label="领域" width="100">
        <template #default="{ row }">{{ tagVal(row.tags, 'domain') }}</template>
      </el-table-column>
      <el-table-column label="模板类型" width="110">
        <template #default="{ row }">{{ tagVal(row.tags, 'template_type') }}</template>
      </el-table-column>
      <el-table-column prop="template_description" label="描述" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button link type="danger" @click="handleDelete(row)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="添加领域模板" width="900px">
      <div class="filter-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="关键词搜索模板库..."
          clearable
          @keyup.enter="handleSearch"
          style="width: 240px"
        >
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
        <el-select
          v-model="filters.schema"
          placeholder="Schema"
          clearable
          filterable
          style="width: 150px"
          @change="handleSearch"
        >
          <el-option v-for="v in filterOptions.schema" :key="v" :label="v" :value="v" />
        </el-select>
        <el-select
          v-model="filters.domain"
          placeholder="领域"
          clearable
          filterable
          style="width: 150px"
          @change="handleSearch"
        >
          <el-option v-for="v in filterOptions.domain" :key="v" :label="v" :value="v" />
        </el-select>
        <el-select
          v-model="filters.template_type"
          placeholder="模板类型"
          clearable
          filterable
          style="width: 150px"
          @change="handleSearch"
        >
          <el-option v-for="v in filterOptions.template_type" :key="v" :label="v" :value="v" />
        </el-select>
        <el-select
          v-model="filters.language_framework"
          placeholder="语言/框架"
          clearable
          filterable
          style="width: 160px"
          @change="handleSearch"
        >
          <el-option v-for="v in filterOptions.language_framework" :key="v" :label="v" :value="v" />
        </el-select>
        <el-select
          v-model="filters.file_extension"
          placeholder="文件后缀"
          clearable
          filterable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option v-for="v in filterOptions.file_extension" :key="v" :label="v" :value="v" />
        </el-select>
        <el-select
          v-model="filters.function"
          placeholder="功能标签"
          clearable
          filterable
          style="width: 180px"
          @change="handleSearch"
        >
          <el-option v-for="v in filterOptions.function" :key="v" :label="v" :value="v" />
        </el-select>
      </div>

      <el-table
        v-loading="templateStore.loading"
        :data="selectableExternalTemplates"
        style="width: 100%; margin-top: 12px"
        max-height="360"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="template_id" label="模板ID" width="90" />
        <el-table-column prop="name" label="模板名称" min-width="160" />
        <el-table-column label="Schema" width="120">
          <template #default="{ row }">{{ tagVal(row.tags, 'schema') }}</template>
        </el-table-column>
        <el-table-column label="领域" width="90">
          <template #default="{ row }">{{ tagVal(row.tags, 'domain') }}</template>
        </el-table-column>
        <el-table-column label="模板类型" width="100">
          <template #default="{ row }">{{ tagVal(row.tags, 'template_type') }}</template>
        </el-table-column>
        <el-table-column label="语言/框架" width="120">
          <template #default="{ row }">{{ tagVal(row.tags, 'language_framework') }}</template>
        </el-table-column>
        <el-table-column prop="template_description" label="描述" min-width="200" show-overflow-tooltip />
      </el-table>

      <div v-if="poolNote" class="pool-note">{{ poolNote }}</div>

      <el-pagination
        v-if="paginationTotalPages > 1"
        v-model:current-page="searchPage"
        :page-size="searchPerPage"
        :total="paginationTotal"
        layout="prev, pager, next, total"
        small
        style="margin-top: 12px; justify-content: center"
        @current-change="handlePageChange"
      />

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
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useDomainComponentTemplateStore } from '../../store/domainComponentTemplate';
import type { TemplateRecord } from '../../types/models';

const props = defineProps<{
  domainCode: string;
  isFromTemplate: boolean;
}>();

const templateStore = useDomainComponentTemplateStore();
const dialogVisible = ref(false);
const selectedTemplateIds = ref<number[]>([]);
const searchKeyword = ref('');
const searchPage = ref(1);
const searchPerPage = 10;

const FILTER_KEYS = ['schema', 'domain', 'template_type', 'language_framework', 'file_extension', 'function'] as const;
const filters = reactive<Record<string, string>>({
  schema: '',
  domain: '',
  template_type: '',
  language_framework: '',
  file_extension: '',
  function: ''
});

const boundTemplates = computed(() => templateStore.templates || []);

function tagArr(tags: Record<string, string[]> | string | undefined, key: string): string[] {
  if (!tags) return [];
  let obj: Record<string, string[]> = {};
  if (typeof tags === 'string') {
    try { obj = JSON.parse(tags); } catch { return []; }
  } else {
    obj = tags;
  }
  return Array.isArray(obj[key]) ? obj[key] : [];
}

function tagVal(tags: Record<string, string[]> | string | undefined, key: string): string {
  return tagArr(tags, key).join(', ');
}

const filterOptions = computed(() => {
  const opts: Record<string, string[]> = {};
  for (const key of FILTER_KEYS) {
    opts[key] = [...(templateStore.filterPresets[key] || [])].sort((a, b) => a.localeCompare(b, 'zh'));
  }
  return opts;
});

const isPoolMode = computed(() => templateStore.mode === 'pool');

const selectableExternalTemplates = computed(() => {
  if (isPoolMode.value) {
    const start = (searchPage.value - 1) * searchPerPage;
    return (templateStore.filteredPool || []).slice(start, start + searchPerPage);
  }
  const boundIds = boundTemplates.value.map((item) => item.template_id);
  return (templateStore.externalTemplates || []).filter((item) => !boundIds.includes(item.template_id));
});

const paginationTotal = computed(() => {
  if (isPoolMode.value) {
    return (templateStore.filteredPool || []).length;
  }
  return templateStore.externalTotalPages * searchPerPage;
});

const paginationTotalPages = computed(() => {
  if (isPoolMode.value) {
    return Math.ceil(paginationTotal.value / searchPerPage);
  }
  return templateStore.externalTotalPages;
});

const poolNote = computed(() => {
  if (!isPoolMode.value) return '';
  if (templateStore.loading) {
    return `正在按条件筛选...已找到 ${templateStore.filteredPool.length} 条`;
  }
  if (templateStore.poolCapped) {
    return `结果较多，仅显示前 ${templateStore.filteredPool.length} 条，请细化筛选条件`;
  }
  return '';
});

watch(
  () => [props.domainCode, props.isFromTemplate] as const,
  async ([domainCode, isFromTemplate]) => {
    if (isFromTemplate) {
      return;
    }
    await templateStore.fetchTemplates(domainCode);
  },
  { immediate: true }
);

async function openDialog() {
  dialogVisible.value = true;
  searchKeyword.value = '';
  searchPage.value = 1;
  selectedTemplateIds.value = [];
  for (const key of FILTER_KEYS) {
    filters[key] = '';
  }
  templateStore.preloadPresets();
  await handleSearch();
}

async function handleSearch() {
  searchPage.value = 1;
  selectedTemplateIds.value = [];
  await templateStore.search(searchKeyword.value, { ...filters }, 1, searchPerPage);
}

async function handlePageChange(page: number) {
  searchPage.value = page;
  selectedTemplateIds.value = [];
  if (isPoolMode.value) {
    return;
  }
  await templateStore.search(searchKeyword.value, { ...filters }, page, searchPerPage);
}

function handleSelectionChange(rows: TemplateRecord[]) {
  selectedTemplateIds.value = rows.map((item) => item.template_id).filter(Boolean) as number[];
}

async function addTemplate() {
  try {
    if (props.isFromTemplate) {
      const ok = await templateStore.importTemplatesForStaging(selectedTemplateIds.value);
      if (!ok) throw new Error('staging failed');
    } else if (props.domainCode) {
      const ok = await templateStore.importAndBindTemplates(props.domainCode, selectedTemplateIds.value);
      if (!ok) throw new Error('bind failed');
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
      templateStore.templates.filter((item) => item.template_id !== row.template_id)
    );
  } else if (props.domainCode && row.template_id) {
    await templateStore.unbindingTemplates(props.domainCode, row.template_id);
  }
  ElMessage.success('移除成功');
}

</script>

<style scoped>
.table-action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.pool-note {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
</style>
