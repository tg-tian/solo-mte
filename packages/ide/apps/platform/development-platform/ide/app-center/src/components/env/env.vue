<template>
  <div class="scene-setting-container">
    <div class="scene-header">
      <div>
        <h2>{{ sceneTitle }}</h2>
        <p class="scene-desc">{{ sceneDescription }}</p>
      </div>
      <el-tag :type="sceneStore.currentScene?.status === '1' ? 'success' : 'info'">
        {{ sceneStore.currentScene?.status === '1' ? '已发布' : '未发布' }}
      </el-tag>
    </div>

    <el-card class="setting-content" shadow="never">
      <template #header>
        <div class="card-header">
          <span>场景信息</span>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="场景ID">{{ sceneStore.currentScene?.id || '-' }}</el-descriptions-item>
        <el-descriptions-item label="领域ID">{{ sceneStore.currentScene?.domainId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备数量">{{ sceneStore.currentScene?.deviceCount ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ sceneStore.currentScene?.updateTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="访问地址" :span="2">{{ sceneStore.currentScene?.url || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="setting-content" shadow="never">
      <template #header>
        <div class="card-header">
          <span>区域列表</span>
          <span class="area-count">共 {{ areaStore.areas.length }} 个区域</span>
        </div>
      </template>

      <el-table v-loading="areaStore.loading" :data="areaStore.areas" border>
        <el-table-column prop="id" label="区域ID" width="100" />
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

      <el-empty v-if="!areaStore.loading && areaStore.areas.length === 0" description="当前场景暂无区域" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSceneStore } from '../../store/scene'
import { useAreaStore } from '../../store/area'

const props = defineProps<{ domainId: number; sceneId: number }>()

const sceneStore = useSceneStore()
const areaStore = useAreaStore()

const sceneTitle = computed(() => sceneStore.currentScene?.name || '场景信息')
const sceneDescription = computed(() => sceneStore.currentScene?.description || '仅展示当前场景及其区域列表')

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
  height: 100%;
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.scene-header h2 {
  margin: 0 0 6px;
}

.scene-desc {
  margin: 0;
  color: #666;
}

.setting-content {
  border-radius: 6px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.area-count {
  color: #909399;
  font-size: 12px;
}
</style>
