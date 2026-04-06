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
          <el-button :disabled="areaTree.length === 0" @click="treeDialogVisible = true">查看区域树</el-button>
        </div>
      </template>

      <div class="area-table-wrap">
        <el-table v-loading="areaStore.loading" :data="areaStore.areas" border>
          <el-table-column prop="id" label="区域ID" width="100" />
          <el-table-column label="区域图片" width="120">
            <template #default="scope">
              <el-image
                v-if="scope.row.image"
                :src="scope.row.image"
                fit="cover"
                class="area-image"
                :preview-src-list="[scope.row.image]"
                preview-teleported
              />
              <el-empty v-else :image-size="32" description="无图片" />
            </template>
          </el-table-column>
          <el-table-column prop="name" label="区域名称" min-width="180" />
          <el-table-column prop="description" label="区域描述" min-width="220" />
          <el-table-column prop="position" label="区域位置" min-width="180" />
          <el-table-column label="层级" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.parentId === -1 || scope.row.parentId === null ? 'success' : 'info'">
                {{ scope.row.parentId === -1 || scope.row.parentId === null ? '根区域' : '子区域' }}
              </el-tag>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSceneStore } from '../../store/scene'
import { useAreaStore } from '../../store/area'
import type { Area } from '../../types/scene'

const props = defineProps<{ sceneId: number }>()

const sceneStore = useSceneStore()
const areaStore = useAreaStore()
const treeDialogVisible = ref(false)

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

.scene-summary-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  color: #909399;
  font-size: 12px;
  white-space: nowrap;
}

.scene-meta-item {
  line-height: 1.4;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
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
