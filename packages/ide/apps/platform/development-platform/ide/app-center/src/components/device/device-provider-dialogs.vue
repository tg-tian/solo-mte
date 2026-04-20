<template>
  <el-dialog :model-value="listVisible" title="配置管理" width="70%" @update:model-value="emit('update:listVisible', $event)">
    <div style="margin-bottom: 15px; display: flex; gap: 12px;">
      <el-button type="primary" @click="emit('open-add')">新增配置</el-button>
      <el-button @click="emit('open-library-config')">配置设备库</el-button>
    </div>
    <el-table :data="providers" border>
      <el-table-column prop="provider" label="Provider ID" width="150" />
      <el-table-column prop="communication.protocol" label="协议" width="100" />
      <el-table-column prop="communication.baseUrl" label="Base URL" min-width="200" />
      <el-table-column label="操作" width="160">
        <template #default="scope">
          <el-button type="primary" size="small" @click="emit('edit', scope.row)">编辑</el-button>
          <el-button type="danger" size="small" @click="emit('delete', scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="emit('update:listVisible', false)">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog :model-value="formVisible" :title="isEdit ? '编辑配置' : '新增配置'" width="50%" @update:model-value="emit('update:formVisible', $event)">
    <el-form :model="form" label-width="120px">
      <el-form-item label="Provider ID" required>
        <el-input v-model="form.provider" :disabled="isEdit" placeholder="例如: mqtt-prod"></el-input>
      </el-form-item>
      <el-form-item label="协议" required>
        <el-select v-model="form.communication.protocol" placeholder="选择协议">
          <el-option label="MQTT" value="mqtt"></el-option>
          <el-option label="HTTP" value="http"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="Base URL" required>
        <el-input v-model="form.communication.baseUrl" placeholder="例如: mqtt://localhost:1883"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="emit('update:formVisible', false)">取消</el-button>
        <el-button type="primary" @click="emit('save')">保存</el-button>
      </span>
    </template>
  </el-dialog>

  <el-dialog :model-value="libraryVisible" title="配置设备库" width="50%" @update:model-value="emit('update:libraryVisible', $event)">
    <el-form label-width="120px">
      <el-form-item label="设备库地址" required>
        <el-input :model-value="mapperLoaderUrl" placeholder="例如: http://139.196.147.52:8080" @update:model-value="emit('update:mapperLoaderUrl', $event)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="emit('update:libraryVisible', false)">取消</el-button>
        <el-button type="primary" @click="emit('save-library-config')">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ProviderConfig } from '../../types/device'

defineProps<{
  listVisible: boolean
  formVisible: boolean
  libraryVisible: boolean
  mapperLoaderUrl: string
  providers: ProviderConfig[]
  form: ProviderConfig
  isEdit: boolean
}>()

const emit = defineEmits<{
  (e: 'update:listVisible', value: boolean): void
  (e: 'update:formVisible', value: boolean): void
  (e: 'update:libraryVisible', value: boolean): void
  (e: 'update:mapperLoaderUrl', value: string): void
  (e: 'open-add'): void
  (e: 'open-library-config'): void
  (e: 'edit', row: ProviderConfig): void
  (e: 'save'): void
  (e: 'save-library-config'): void
  (e: 'delete', row: ProviderConfig): void
}>()
</script>
