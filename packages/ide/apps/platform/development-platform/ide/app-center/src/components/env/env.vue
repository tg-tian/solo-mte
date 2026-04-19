<template>
  <div class="scene-setting-container">
    <el-card class="scene-summary-card" shadow="never">
      <div class="scene-summary">
        <div class="scene-summary-main">
          <div class="scene-summary-title">{{ sceneStore.currentScene?.name || '当前场景' }}</div>
          <div class="scene-summary-desc">
            {{ sceneStore.currentScene?.description || '展示当前场景下的区域列表与区域树。' }}
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="setting-content" shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <div class="card-title">区域列表</div>
            <div class="card-subtitle">共 {{ areaStore.areas.length }} 个区域</div>
          </div>
          <div class="card-actions">
            <el-button type="primary" @click="openCreateDialog">新增区域</el-button>
            <el-button :disabled="areaTree.length === 0" @click="treeDialogVisible = true">查看区域树</el-button>
          </div>
        </div>
      </template>

      <div class="area-table-wrap">
        <el-table v-loading="areaStore.loading" :data="areaStore.areas" border>
          <el-table-column prop="id" label="区域ID" width="100" />
          <el-table-column label="区域图片" width="120">
            <template #default="scope">
              <el-image
                v-if="scope.row.image"
                :src="getFullImageUrl(scope.row.image)"
                fit="cover"
                class="area-image"
                :preview-src-list="[getFullImageUrl(scope.row.image)]"
                preview-teleported
              />
              <el-empty v-else :image-size="32" description="无图片" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="区域名称" min-width="180" />
          <el-table-column prop="description" label="区域描述" min-width="220" />
          <el-table-column prop="position" label="区域位置" min-width="180" />
          <el-table-column label="父区域" min-width="140">
            <template #default="scope">
              {{ getParentAreaName(scope.row.parentId) }}
            </template>
          </el-table-column>
          <el-table-column label="层级" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.parentId === -1 || scope.row.parentId === null ? 'success' : 'info'">
                {{ scope.row.parentId === -1 || scope.row.parentId === null ? '根区域' : '子区域' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-empty v-if="!areaStore.loading && areaStore.areas.length === 0" description="当前场景暂无区域" />
    </el-card>

    <el-dialog v-model="treeDialogVisible" title="区域树" width="420px">
      <el-tree
        v-if="areaTree.length"
        :data="areaTree"
        node-key="id"
        default-expand-all
        :props="treeProps"
        class="area-tree"
      >
        <template #default="{ data }">
          <span class="tree-node">
            <span>{{ data.name }}</span>
            <span class="tree-node-id">#{{ data.id }}</span>
          </span>
        </template>
      </el-tree>
      <el-empty v-else description="暂无区域树数据" />
    </el-dialog>

    <el-dialog v-model="formDialogVisible" :title="isEdit ? '编辑区域' : '新增区域'" width="520px">
      <el-form ref="areaFormRef" :model="areaForm" label-width="100px">
        <el-form-item label="区域名称" required>
          <el-input v-model="areaForm.name" placeholder="请输入区域名称" />
        </el-form-item>
        <el-form-item label="区域描述">
          <el-input v-model="areaForm.description" type="textarea" :rows="3" placeholder="请输入区域描述" />
        </el-form-item>
        <el-form-item label="区域位置">
          <el-input v-model="areaForm.position" placeholder="请输入区域位置" />
        </el-form-item>
        <el-form-item label="父区域">
          <el-select v-model="areaForm.parentId" clearable placeholder="不选则为根区域">
            <el-option :value="-1" label="根区域" />
            <el-option v-for="item in parentAreaOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片地址">
          <el-input v-model="areaForm.image" placeholder="请输入图片地址（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAreaForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useSceneStore } from '../../store/scene'
import { useAreaStore } from '../../store/area'
import type { Area } from '../../types/scene'

const props = defineProps<{ sceneId: number }>()

const sceneStore = useSceneStore()
const areaStore = useAreaStore()
const treeDialogVisible = ref(false)
const formDialogVisible = ref(false)
const isEdit = ref(false)
const editingAreaId = ref<number | null>(null)
const submitting = ref(false)
const areaFormRef = ref<FormInstance>()
const areaForm = reactive({
  name: '',
  description: '',
  position: '',
  parentId: -1 as number | null,
  image: '',
})

const treeProps = {
  label: 'name',
  children: 'children',
}

const areaTree = computed<Area[]>(() => {
  const areaMap = new Map<number, Area>()
  const roots: Area[] = []

  areaStore.areas.forEach((item) => {
    areaMap.set(item.id, { ...item, children: [] })
  })

  areaMap.forEach((item) => {
    if (item.parentId === null || item.parentId === -1) {
      roots.push(item)
      return
    }
    const parent = areaMap.get(item.parentId)
    if (parent) {
      parent.children.push(item)
    } else {
      roots.push(item)
    }
  })

  return roots
})

const parentAreaOptions = computed(() => {
  if (!isEdit.value || editingAreaId.value === null) return areaStore.areas
  return areaStore.areas.filter((item) => item.id !== editingAreaId.value)
})

const baseURL = import.meta.env.VITE_APP_CENTER_BASE_URL || 'http://139.196.147.52:8080'

function getFullImageUrl(url?: string | null) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${baseURL}${url}`
}

function getParentAreaName(parentId: number | null) {
  if (parentId === null || parentId === -1) return '根区域'
  return areaStore.areas.find((item) => item.id === parentId)?.name || `#${parentId}`
}

function resetAreaForm() {
  areaForm.name = ''
  areaForm.description = ''
  areaForm.position = ''
  areaForm.parentId = -1
  areaForm.image = ''
}

function openCreateDialog() {
  isEdit.value = false
  editingAreaId.value = null
  resetAreaForm()
  formDialogVisible.value = true
}

function openEditDialog(row: Area) {
  isEdit.value = true
  editingAreaId.value = row.id
  areaForm.name = row.name
  areaForm.description = row.description
  areaForm.position = row.position
  areaForm.parentId = row.parentId ?? -1
  areaForm.image = row.image || ''
  formDialogVisible.value = true
}

async function submitAreaForm() {
  if (!props.sceneId) {
    ElMessage.error('缺少场景ID')
    return
  }
  if (!areaForm.name.trim()) {
    ElMessage.error('请输入区域名称')
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: areaForm.name.trim(),
      description: areaForm.description.trim(),
      position: areaForm.position.trim(),
      parentId: areaForm.parentId ?? -1,
      image: areaForm.image.trim(),
    }

    if (isEdit.value && editingAreaId.value !== null) {
      await areaStore.updateArea(editingAreaId.value, props.sceneId, payload)
      ElMessage.success('区域更新成功')
    } else {
      await areaStore.createArea(props.sceneId, payload)
      ElMessage.success('区域创建成功')
    }

    formDialogVisible.value = false
    await areaStore.fetchAreas(props.sceneId)
  } catch (error) {
    console.error(error)
    ElMessage.error(isEdit.value ? '区域更新失败' : '区域创建失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row: Area) {
  try {
    await ElMessageBox.confirm(`确定删除区域“${row.name}”吗？`, '提示', { type: 'warning' })
    await areaStore.deleteArea(row.id)
    ElMessage.success('区域删除成功')
    if (props.sceneId) {
      await areaStore.fetchAreas(props.sceneId)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error(error)
      ElMessage.error('区域删除失败')
    }
  }
}

onMounted(async () => {
  if (props.sceneId) {
    await sceneStore.fetchSceneById(props.sceneId)
    await areaStore.fetchAreas(props.sceneId)
  }
})
</script>

<style scoped>
.scene-setting-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding-bottom: 16px;
  box-sizing: border-box;
}

.scene-summary-card,
.setting-content {
  border-radius: 8px;
  flex: 0 0 auto;
}

.scene-summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.scene-summary-main {
  min-width: 0;
}

.scene-summary-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.scene-summary-desc {
  margin-top: 8px;
  color: #606266;
  line-height: 1.6;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.card-subtitle {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.area-table-wrap {
  padding: 4px 0;
  overflow-x: auto;
}

.area-image {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  display: block;
}

.area-tree {
  max-height: 460px;
  overflow: auto;
}

.tree-node {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tree-node-id {
  color: #909399;
  font-size: 12px;
}
</style>
