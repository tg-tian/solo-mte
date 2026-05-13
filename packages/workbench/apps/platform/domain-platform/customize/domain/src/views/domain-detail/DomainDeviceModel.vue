<template>
  <div>
    <div class="table-action-bar">
      <el-button type="primary" @click="showBindDialog">绑定设备模型</el-button>
    </div>

    <el-empty v-if="displayDeviceModels.length === 0" description="该领域尚未绑定任何设备模型" />

    <el-table v-else v-loading="deviceModelStore.loading" :data="displayDeviceModels">
      <el-table-column label="模型编码" width="200">
        <template #default="{ row }">
          <code>{{ row.displayCode }}</code>
        </template>
      </el-table-column>
      <el-table-column label="模型名称" min-width="180">
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

    <el-dialog v-model="bindingDialogVisible" title="选择要绑定的设备模型" width="800px">
      <el-table :data="availableDeviceModels">
        <el-table-column label="模型编码" width="180">
          <template #default="{ row }">{{ row.id || row.modelId }}</template>
        </el-table-column>
        <el-table-column label="模型名称" min-width="180">
          <template #default="{ row }">{{ row.modelName || row.name }}</template>
        </el-table-column>
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }">{{ row.description || row.category || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="bindDeviceModel(row)">绑定</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useDeviceModelStore } from '../../store/deviceModel';
import { getDeviceModels } from '../../api/deviceModel';
import type { DeviceModelRecord } from '../../types/models';

const props = defineProps<{
  domainId: number | null;
  isFromTemplate: boolean;
}>();

const deviceModelStore = useDeviceModelStore();
const bindingDialogVisible = ref(false);
const availableDeviceModels = ref<DeviceModelRecord[]>([]);

const displayDeviceModels = computed(() =>
  deviceModelStore.deviceModels.map((item) => ({
    ...item,
    displayCode: item.id || item.modelId || '-',
    displayName: item.modelName || item.name || '未命名模型',
    displayDesc: item.description || item.category || '-'
  }))
);

onMounted(async () => {
  if (!props.isFromTemplate && props.domainId) {
    await deviceModelStore.fetchDeviceModels(props.domainId);
  }
});

async function showBindDialog() {
  try {
    const res = await getDeviceModels();
    if (res.status === 200) {
      availableDeviceModels.value = (res.data || []).filter(
        (item: DeviceModelRecord) => !deviceModelStore.deviceModels.some((bound) => (bound.id || bound.modelId) === (item.id || item.modelId))
      );
      bindingDialogVisible.value = true;
      return;
    }
  } catch (_error) {
    // fall through
  }
  ElMessage.error('加载可用设备模型失败');
}

async function bindDeviceModel(row: DeviceModelRecord) {
  if (!props.domainId) {
    return;
  }
  try {
    const deviceModelId = row.id || row.modelId;
    if (!deviceModelId) {
      ElMessage.error('无法获取设备模型 ID');
      return;
    }
    await deviceModelStore.bindDeviceModel(deviceModelId, props.domainId);
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
  await ElMessageBox.confirm(`确定要取消绑定设备模型 "${row.displayName}" 吗？`, '警告', { type: 'warning' });
  try {
    const deviceModelId = row.id || row.modelId || row.displayCode;
    await deviceModelStore.unbindDeviceModel(deviceModelId, props.domainId);
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
