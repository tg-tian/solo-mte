<template>
  <div>
    <div class="table-action-bar">
      <el-button type="primary" @click="showBindDialog">绑定领域组件</el-button>
    </div>

    <el-empty v-if="displayComponents.length === 0" description="该领域尚未绑定任何领域组件" />

    <el-table v-else v-loading="componentStore.loading" :data="displayComponents">
      <el-table-column label="组件编码" width="200">
        <template #default="{ row }">
          <code>{{ row.displayCode }}</code>
        </template>
      </el-table-column>
      <el-table-column label="组件名称" min-width="180">
        <template #default="{ row }">{{ row.displayName }}</template>
      </el-table-column>
      <el-table-column label="描述" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.displayDesc }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button link type="danger" @click="handleDelete(row)">取消绑定</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="bindingDialogVisible" title="选择要绑定的领域组件" width="800px">
      <el-table :data="availableComponents">
        <el-table-column label="组件编码" width="180">
          <template #default="{ row }">{{ row.code || row.id }}</template>
        </el-table-column>
        <el-table-column label="组件名称" min-width="180">
          <template #default="{ row }">{{ row.name || row.componentName || '-' }}</template>
        </el-table-column>
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="bindComponent(row)">绑定</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getComponents } from '../../api/component';
import { useComponentStore } from '../../store/component';
import type { ComponentRecord } from '../../types/models';

const props = defineProps<{
  domainId: number | null;
  isFromTemplate: boolean;
}>();

const componentStore = useComponentStore();
const bindingDialogVisible = ref(false);
const availableComponents = ref<ComponentRecord[]>([]);

const displayComponents = computed(() =>
  componentStore.components.map((item) => ({
    ...item,
    displayCode: item.code || item.id || '-',
    displayName: item.name || item.componentName || '未命名组件',
    displayDesc: item.description || '-'
  }))
);

onMounted(async () => {
  if (!props.isFromTemplate && props.domainId) {
    await componentStore.fetchComponents(props.domainId);
  }
});

async function showBindDialog() {
  try {
    const res = await getComponents();
    if (res.status === 200) {
      availableComponents.value = (res.data || []).filter(
        (item: ComponentRecord) => !componentStore.components.some((bound) => bound.id === item.id)
      );
      bindingDialogVisible.value = true;
      return;
    }
    ElMessage.error('加载可用组件失败');
  } catch (_error) {
    ElMessage.error('加载可用组件失败');
  }
}

async function bindComponent(row: ComponentRecord) {
  if (!props.domainId) {
    return;
  }
  try {
    const componentId = row.id || row.componentId;
    if (!componentId) {
      ElMessage.error('无法获取组件 ID');
      return;
    }
    await componentStore.bindingComponent(componentId, props.domainId);
    ElMessage.success('绑定成功');
    bindingDialogVisible.value = false;
  } catch (_error) {
    ElMessage.error('绑定失败');
  }
}

async function handleDelete(row: any) {
  if (!props.domainId) {
    return;
  }
  await ElMessageBox.confirm(`确定要取消绑定组件 "${row.displayName}" 吗？`, '警告', { type: 'warning' });
  try {
    const componentId = row.id || row.componentId || row.displayCode;
    await componentStore.unbindingComponent(componentId, props.domainId);
    ElMessage.success('取消绑定成功');
  } catch (_error) {
    ElMessage.error('取消绑定失败');
  }
}
</script>

<style scoped>
.table-action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}
</style>
