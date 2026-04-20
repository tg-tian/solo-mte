<template>
  <el-dialog :model-value="visible" title="已发现设备" width="70%" @update:model-value="emit('update:visible', $event)">
    <el-table :data="devices" class="device-table" border>
      <el-table-column prop="deviceId" label="设备编码" width="180" />
      <el-table-column prop="deviceName" label="设备名称" min-width="160" />
      <el-table-column prop="category" label="设备类型" width="140" />
      <el-table-column prop="provider" label="设备平台" width="120" />
      <el-table-column label="接入状态" min-width="180">
        <template #default="scope">
          <div>
            <el-tag :type="scope.row.isAccessible === false ? 'warning' : 'success'" size="small">
              {{ scope.row.isAccessible === false ? '不可接入' : '可接入' }}
            </el-tag>
            <div v-if="scope.row.isAccessible === false" style="margin-top: 6px; color: #909399; font-size: 12px; line-height: 1.4;">
              {{ scope.row.inaccessibleMessage || getReasonText(scope.row.inaccessibleReason) }}
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240">
        <template #default="scope">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <el-button
              type="primary"
              size="small"
              :disabled="isAdded(scope.row) || scope.row.isAccessible === false"
              @click="emit('add', scope.row)"
            >
              {{ isAdded(scope.row) ? '已添加' : '添加' }}
            </el-button>
            <el-button
              size="small"
              :type="scope.row.isAccessible === false ? 'warning' : 'success'"
              @click="emit('configure', scope.row)"
            >
              {{ scope.row.isAccessible === false ? '去配置' : '调整Mapper' }}
            </el-button>
          </div>
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

defineProps<{
  visible: boolean
  devices: Device[]
  isAdded: (row: Device) => boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'add', row: Device): void
  (e: 'configure', row: Device): void
}>()

function getReasonText(reason?: Device['inaccessibleReason']) {
  switch (reason) {
    case 'missing_library_url':
      return '设备库地址未配置'
    case 'missing_model':
      return '缺少对应设备元模型'
    case 'missing_mapper':
      return '缺少对应 Mapper'
    case 'mapper_error':
      return 'Mapper 加载异常'
    default:
      return '接入条件不满足'
  }
}
</script>
