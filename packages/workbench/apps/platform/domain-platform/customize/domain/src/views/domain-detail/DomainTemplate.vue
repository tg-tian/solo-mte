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

      <el-table
        v-loading="templateStore.loading"
        :data="filteredTemplates"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="template_id" label="模板ID" width="100" />
        <el-table-column prop="name" label="模板名称" min-width="180" />
        <el-table-column label="领域" width="100">
          <template #default="{ row }">{{ tagVal(row.tags, 'domain') }}</template>
        </el-table-column>
        <el-table-column label="模板类型" width="110">
          <template #default="{ row }">{{ tagVal(row.tags, 'template_type') }}</template>
        </el-table-column>
        <el-table-column prop="template_description" label="描述" min-width="220" show-overflow-tooltip />
      </el-table>

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
import { computed, ref, watch } from 'vue';
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

const boundTemplates = computed(() => templateStore.templates || []);

const filteredTemplates = computed(() => {
  const boundIds = boundTemplates.value.map((item) => item.template_id);
  return (templateStore.allTemplates || []).filter((item) => !boundIds.includes(item.template_id));
});

function tagVal(tags: Record<string, string[]> | string | undefined, key: string): string {
  if (!tags) return ''
  let obj: Record<string, string[]> = {}
  if (typeof tags === 'string') {
    try { obj = JSON.parse(tags) } catch { return '' }
  } else {
    obj = tags
  }
  return obj[key]?.join(', ') || ''
}

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
  selectedTemplateIds.value = [];
  await templateStore.fetchAllTemplates();
}

function handleSelectionChange(rows: TemplateRecord[]) {
  selectedTemplateIds.value = rows.map((item) => item.template_id).filter(Boolean) as number[];
}

async function addTemplate() {
  try {
    if (props.isFromTemplate) {
      const selectedRows = templateStore.allTemplates.filter(
        (item) => selectedTemplateIds.value.includes(item.template_id!)
      );
      templateStore.setTemplates([...templateStore.templates, ...selectedRows]);
    } else if (props.domainCode) {
      await templateStore.bindingTemplates(props.domainCode, selectedTemplateIds.value);
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
</style>
