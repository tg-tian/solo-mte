<template>
  <el-dialog :model-value="visible" title="已发现设备" width="70%" @update:model-value="emit('update:visible', $event)">
    <el-table :data="devices" class="device-table" border>
      <el-table-column prop="deviceId" label="设备编码" width="180" />
      <el-table-column prop="deviceName" label="设备名称" min-width="160" />
      <el-table-column prop="category" label="设备类型" width="140" />
      <el-table-column prop="provider" label="设备平台" width="120" />
      <el-table-column label="操作" width="160">
        <template #default="scope">
          <el-button
            type="primary"
            size="small"
            :disabled="isAdded(scope.row) || scope.row.isAccessible === false"
            @click="emit('add', scope.row)"
          >
            {{ isAdded(scope.row) ? '已添加' : '添加' }}
          </el-button>
          <el-button type="warning" size="small" @click="emit('config', scope.row)">配置</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { Device } from '../../types/device'

const props = defineProps<{
  visible: boolean
  devices: Device[]
  isAdded: (row: Device) => boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'add', row: Device): void
  (e: 'config', row: Device): void
}>()
</script>
