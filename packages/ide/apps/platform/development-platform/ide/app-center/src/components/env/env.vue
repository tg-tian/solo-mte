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
            <div class="card-title">场景空间预览</div>
            <div class="card-subtitle">展示场景多边形与各区域空间</div>
          </div>
        </div>
      </template>
      <div class="canvas-preview">
        <PolygonCanvas
          :scene-polygon="sceneStore.currentScene?.polygon || null"
          :areas="areaPolygonInfos"
          edit-mode="view"
        />
        <div v-if="!sceneStore.currentScene?.polygon" class="canvas-empty-tip">
          当前场景未定义空间多边形，请到场景管理界面配置。
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
                :src="resolveImageUrl(scope.row.image) || scope.row.image"
                fit="cover"
                class="area-image"
                :preview-src-list="[resolveImageUrl(scope.row.image) || scope.row.image]"
                preview-teleported
              />
              <el-empty v-else :image-size="32" description="无图片" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="区域名称" min-width="180" />
          <el-table-column prop="description" label="区域描述" min-width="220" />
          <el-table-column label="区域空间" width="160">
            <template #default="scope">
              <el-tag v-if="scope.row.polygon && scope.row.polygon.length >= 3" type="success">
                已定义（{{ scope.row.polygon.length }} 顶点）
              </el-tag>
              <el-tag v-else type="info">未定义</el-tag>
            </template>
          </el-table-column>
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
          <el-table-column label="操作" width="260" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button link type="primary" @click="openAreaPolygonDialog(scope.row)">编辑空间</el-button>
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
        <el-form-item label="父区域">
          <el-select v-model="areaForm.parentId" clearable placeholder="不选则为根区域">
            <el-option :value="-1" label="根区域" />
            <el-option v-for="item in parentAreaOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片地址">
          <el-input v-model="areaForm.image" placeholder="请输入图片地址（可选）" />
        </el-form-item>
        <el-form-item v-if="isEdit" label="区域空间">
          <span class="form-tip">保存后请使用列表中的"编辑空间"按钮调整空间多边形。</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitAreaForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="polygonDialogVisible"
      :title="`编辑区域空间 - ${polygonEditingArea?.name || ''}`"
      width="720px"
      :close-on-click-modal="false"
      :close-on-press-escape="!polygonSaving"
      :show-close="!polygonSaving"
      destroy-on-close
    >
      <PolygonCanvas
        v-if="polygonEditingArea"
        :scene-polygon="sceneStore.currentScene?.polygon || null"
        :areas="canvasAreasForEdit"
        edit-mode="area"
        :editing-area-id="String(polygonEditingArea.id)"
        @update-area-polygon="onAreaPolygonChanged"
      />
      <template #footer>
        <el-button type="primary" :loading="polygonSaving" @click="closePolygonDialog">完成编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useSceneStore } from '../../store/scene'
import { useAreaStore, resolveImageUrl } from '../../store/area'
import type { Area, AreaPolygonInfo, PolygonPoint } from '../../types/scene'
import PolygonCanvas from '../PolygonCanvas.vue'

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
  parentId: -1 as number | null,
  image: '',
})

const polygonDialogVisible = ref(false)
const polygonEditingArea = ref<Area | null>(null)
const polygonSaving = ref(false)
const polygonDraft = ref<PolygonPoint[]>([])

const treeProps = {
  label: 'name',
  children: 'children',
}

const areaPolygonInfos = computed<AreaPolygonInfo[]>(() =>
  areaStore.areas
    .filter((a) => a.polygon && a.polygon.length >= 3)
    .map((a) => ({
      id: String(a.id),
      name: a.name,
      polygon: a.polygon as PolygonPoint[],
    }))
)

const canvasAreasForEdit = computed<AreaPolygonInfo[]>(() =>
  areaStore.areas.map((a) => ({
    id: String(a.id),
    name: a.name,
    polygon: (polygonEditingArea.value && polygonEditingArea.value.id === a.id && polygonDraft.value.length > 0)
      ? polygonDraft.value
      : (a.polygon || []) as PolygonPoint[],
  }))
)

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

function getParentAreaName(parentId: number | null) {
  if (parentId === null || parentId === -1) return '根区域'
  return areaStore.areas.find((item) => item.id === parentId)?.name || `#${parentId}`
}

function resetAreaForm() {
  areaForm.name = ''
  areaForm.description = ''
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
  areaForm.parentId = row.parentId ?? -1
  areaForm.image = row.image || ''
  formDialogVisible.value = true
}

function openAreaPolygonDialog(row: Area) {
  polygonEditingArea.value = row
  polygonDraft.value = (row.polygon || []).map((p) => ({ ...p }))
  polygonDialogVisible.value = true
}

function onAreaPolygonChanged(_areaId: string, points: PolygonPoint[]) {
  polygonDraft.value = points.map((p) => ({ ...p }))
}

async function closePolygonDialog() {
  if (!polygonEditingArea.value || !props.sceneId) {
    polygonDialogVisible.value = false
    return
  }
  const target = polygonEditingArea.value
  const draft = polygonDraft.value.slice()
  const original = target.polygon || []

  const changed = !polygonsEqual(original, draft)
  if (!changed) {
    polygonDialogVisible.value = false
    return
  }

  polygonSaving.value = true
  try {
    await areaStore.updateArea(target.id, props.sceneId, {
      name: target.name,
      description: target.description,
      parentId: target.parentId ?? -1,
      image: target.image || '',
      polygon: draft.length >= 3 ? draft : null,
    })
    await areaStore.fetchAreas(props.sceneId)
    ElMessage.success('区域空间已保存')
    polygonDialogVisible.value = false
  } catch (error) {
    console.error(error)
    ElMessage.error('区域空间保存失败')
  } finally {
    polygonSaving.value = false
  }
}

function polygonsEqual(a: PolygonPoint[], b: PolygonPoint[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].x !== b[i].x || a[i].y !== b[i].y) return false
  }
  return true
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
    if (isEdit.value && editingAreaId.value !== null) {
      const existing = areaStore.areas.find((a) => a.id === editingAreaId.value)
      await areaStore.updateArea(editingAreaId.value, props.sceneId, {
        name: areaForm.name.trim(),
        description: areaForm.description.trim(),
        parentId: areaForm.parentId ?? -1,
        image: areaForm.image.trim(),
        polygon: existing?.polygon || null,
      })
      ElMessage.success('区域更新成功')
    } else {
      await areaStore.createArea(props.sceneId, {
        name: areaForm.name.trim(),
        description: areaForm.description.trim(),
        parentId: areaForm.parentId ?? -1,
        image: areaForm.image.trim(),
        polygon: null,
      })
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
    await ElMessageBox.confirm(`确定删除区域"${row.name}"吗？`, '提示', { type: 'warning' })
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

.canvas-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.canvas-empty-tip {
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

.form-tip {
  color: #909399;
  font-size: 12px;
}
</style>
