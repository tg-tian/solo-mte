<template>
  <div class="scenario-detail-page">
    <div class="detail-header">
      <div class="header-main">
        <h2>{{ isCreateMode ? '创建场景' : form.sceneName || '场景详情' }}</h2>
        <p>{{ isCreateMode ? '按和编辑页一致的方式完成场景基础信息、地图定位和区域配置。' : (form.sceneDescription || '暂无场景描述') }}</p>
      </div>
      <div class="header-actions">
        <el-tag :type="form.status === '1' ? 'warning' : 'primary'" effect="light" style="margin-right: 12px">
          {{ form.status === '1' ? '已发布' : '开发中' }}
        </el-tag>
        <el-button v-if="!isCreateMode" plain @click="exportScenarioConfig">导出配置</el-button>
        <el-button
          v-if="!isCreateMode"
          :type="form.status === '1' ? 'warning' : 'success'"
          plain
          @click="handlePublish"
        >
          {{ form.status === '1' ? '取消发布' : '发布场景' }}
        </el-button>
      </div>
    </div>

    <div v-if="!isCreateMode" class="summary-grid">
      <el-card shadow="hover" class="summary-card">
        <div class="summary-title">场景编码</div>
        <div class="summary-value">{{ form.sceneCode || '-' }}</div>
      </el-card>
      <el-card shadow="hover" class="summary-card">
        <div class="summary-title">场景编号</div>
        <div class="summary-value">{{ form.sceneId || '-' }}</div>
      </el-card>
      <el-card shadow="hover" class="summary-card">
        <div class="summary-title">状态</div>
        <div class="summary-value">{{ form.status === '1' ? '已发布' : '开发中' }}</div>
      </el-card>
    </div>

    <el-card shadow="never" class="detail-card">
      <template #header>
        <div class="card-header">{{ isCreateMode ? '场景创建' : '场景编辑' }}</div>
      </template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="场景名称" prop="sceneName">
              <el-input v-model="form.sceneName" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="场景编码" prop="sceneCode">
              <el-input v-model="form.sceneCode" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="所属领域" prop="domainId">
              <el-select v-model="form.domainId" style="width: 100%">
                <el-option v-for="item in domains" :key="item.domainId" :label="item.domainName" :value="item.domainId" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="经度" prop="longitude">
              <el-input-number v-model="form.longitude" :precision="3" :step="0.001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="纬度" prop="latitude">
              <el-input-number v-model="form.latitude" :precision="3" :step="0.001" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="场景图片" prop="imageUrl">
              <el-upload
                class="image-uploader"
                :show-file-list="false"
                :before-upload="beforeImageUpload"
                :http-request="(options) => customUploadImage(options, 'scenario')"
              >
                <img v-if="form.imageUrl" :src="getFullImageUrl(form.imageUrl)" class="uploaded-image" />
                <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="访问地址" prop="url">
          <el-input v-model="form.url" maxlength="255" />
        </el-form-item>
        <el-form-item label="场景描述" prop="sceneDescription">
          <el-input v-model="form.sceneDescription" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="detail-card map-card">
      <template #header>
        <div class="card-header">地图定位（百米级）</div>
      </template>
      <div class="map-wrapper">
        <div ref="mapRef" class="map-container"></div>
        <div v-if="mapError" class="map-error">{{ mapError }}</div>
      </div>
    </el-card>

    <el-card shadow="never" class="detail-card area-card">
      <template #header>
        <div class="card-header area-header">
          <span>区域管理</span>
          <el-button size="small" type="primary" @click="openCreateArea">新增区域</el-button>
        </div>
      </template>
      <el-table :data="areas" border v-loading="areaLoading" empty-text="暂无区域">
        <el-table-column label="区域图片" width="120" align="center">
          <template #default="{ row }">
            <img v-if="row.image" :src="getFullImageUrl(row.image)" class="area-table-image" />
            <span v-else class="text-gray-400">-</span>
          </template>
        </el-table-column>
        <el-table-column label="区域名称" min-width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="showAreaTree(row)">{{ row.name }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="区域描述" min-width="220" />
        <el-table-column prop="position" label="坐标" min-width="180" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="showAreaTree(row)">查看树</el-button>
            <el-button link type="primary" @click.stop="openEditArea(row)">编辑</el-button>
            <el-button link type="danger" @click.stop="handleDeleteArea(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div class="detail-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">{{ isCreateMode ? '创建' : '保存' }}</el-button>
    </div>

    <el-dialog v-model="areaDialogVisible" :title="editingAreaId ? '编辑区域' : '新增区域'" width="520px" destroy-on-close>
      <el-form ref="areaFormRef" :model="areaForm" :rules="areaRules" label-width="88px">
        <el-form-item label="区域名称" prop="name">
          <el-input v-model="areaForm.name" maxlength="50" />
        </el-form-item>
        <el-form-item label="父区域" prop="parentId">
          <el-select v-model="areaForm.parentId" clearable placeholder="不选则为顶级区域" style="width: 100%">
            <el-option label="无父区域（顶级）" value="-1" />
            <el-option v-for="item in parentAreaOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="区域坐标" prop="position">
          <el-input v-model="areaForm.position" maxlength="200" placeholder='{"x":0,"y":0}' />
        </el-form-item>
        <el-form-item label="区域描述" prop="description">
          <el-input v-model="areaForm.description" type="textarea" :rows="3" maxlength="200" />
        </el-form-item>
        <el-form-item label="区域图片" prop="image">
          <el-upload
            class="image-uploader"
            :show-file-list="false"
            :before-upload="beforeImageUpload"
            :http-request="(options) => customUploadImage(options, 'area')"
          >
            <img v-if="areaForm.image" :src="getFullImageUrl(areaForm.image)" class="uploaded-image" />
            <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="areaDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="areaSubmitting" @click="submitArea">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="areaTreeDialogVisible" title="区域树" width="560px" destroy-on-close>
      <div class="area-tree-header">{{ selectedAreaName }}</div>
      <el-tree :data="areaTreeData" node-key="id" default-expand-all :props="{ label: 'name', children: 'children' }" />
    </el-dialog>

    <el-dialog
      v-model="publishDialogVisible"
      :title="form.status === '1' ? '取消发布场景' : '发布场景'"
      width="500px"
      class="premium-dialog"
    >
      <p class="dialog-tip">{{ form.status === '1' ? '取消发布后，该场景将无法在场景平台中被访问并使用。' : '发布后，该场景将可以在场景平台中被访问并使用。' }}</p>
      <el-form label-position="top" v-if="form.status !== '1'">
        <el-form-item label="发布访问地址 (URL)">
          <el-input v-model="form.url" placeholder="http(s)://example.com" clearable>
            <template #prefix><el-icon><Link /></el-icon></template>
          </el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="publishDialogVisible = false">暂不处理</el-button>
          <el-button type="primary" :loading="publishSubmitting" @click="publishScene">确认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { Link, Plus } from '@element-plus/icons-vue';
import { createArea, deleteArea, getAreaList, updateArea, publishScenario, uploadImage } from '../api/scenario';
import type { AreaRecord, DomainOption, ScenarioRecord } from '../types/models';

interface ScenarioSubmitPayload {
  scenario: ScenarioRecord;
  areas: AreaRecord[];
}

const props = withDefaults(defineProps<{
  scenario?: ScenarioRecord | null;
  domains: DomainOption[];
  saving?: boolean;
  mode?: 'create' | 'edit';
}>(), {
  scenario: null,
  saving: false,
  mode: 'edit'
});

const emit = defineEmits<{
  submit: [payload: ScenarioSubmitPayload];
  cancel: [];
}>();

const isCreateMode = computed(() => props.mode === 'create');
const formRef = ref<FormInstance>();
const form = reactive<ScenarioRecord>({
  sceneId: '',
  sceneName: '',
  sceneCode: '',
  sceneDescription: '',
  status: '0',
  domainId: '',
  longitude: null,
  latitude: null,
  imageUrl: '',
  url: ''
});
const rules: FormRules = {
  sceneName: [{ required: true, message: '请输入场景名称', trigger: 'blur' }],
  sceneCode: [
    { required: true, message: '请输入场景编码', trigger: 'blur' },
    { pattern: /^[A-Za-z][A-Za-z0-9_]*$/, message: '场景编码需字母开头，仅支持字母数字下划线', trigger: 'blur' }
  ],
  domainId: [{ required: true, message: '请选择所属领域', trigger: 'change' }]
};

const areas = ref<AreaRecord[]>([]);
const areaLoading = ref(false);
const areaDialogVisible = ref(false);
const areaSubmitting = ref(false);
const areaFormRef = ref<FormInstance>();
const editingAreaId = ref('');
const areaTreeDialogVisible = ref(false);
const areaTreeData = ref<AreaRecord[]>([]);
const selectedAreaName = ref('');
const publishDialogVisible = ref(false);
const publishSubmitting = ref(false);
const areaForm = reactive({
  name: '',
  description: '',
  position: '',
  image: '',
  parentId: null as string | null
});
const areaRules: FormRules = {
  name: [{ required: true, message: '请输入区域名称', trigger: 'blur' }]
};
const parentAreaOptions = computed(() => areas.value.filter((item) => item.id !== editingAreaId.value));
const mapRef = ref<HTMLElement>();
const mapError = ref('');
const baiduMapAk = (import.meta as any).env?.VITE_BAIDU_MAP_AK || '';
let mapInstance: any = null;
let mapMarker: any = null;
let mapCircle: any = null;
const host = ((import.meta as any).env?.VITE_BASE_PATH || '').replace(/\/$/, '');

function normalizeImagePath(path: string) {
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

function getFullImageUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const normalizedUrl = normalizeImagePath(url);
  return host ? `${host}${normalizedUrl}` : normalizedUrl;
}

function beforeImageUpload(file: File) {
  const isImage = file.type.startsWith('image/');
  const isLt2M = file.size / 1024 / 1024 < 5;
  if (!isImage) ElMessage.error('上传图片只能是 JPG/PNG/GIF 格式!');
  if (!isLt2M) ElMessage.error('上传图片大小不能超过 5MB!');
  return isImage && isLt2M;
}

async function customUploadImage(options: any, target: 'scenario' | 'area') {
  try {
    const res = await uploadImage(options.file);
    if (res.status === 200 && typeof res.data === 'string') {
      const imageUrl = res.data;
      if (target === 'scenario') form.imageUrl = imageUrl;
      else areaForm.image = imageUrl;
      ElMessage.success('上传成功');
      options.onSuccess(res, options.file);
    } else {
      throw new Error('上传失败');
    }
  } catch (error) {
    ElMessage.error('上传图片失败');
    options.onError(error);
  }
}

let mapScriptPromise: Promise<void> | null = null;
let localAreaSeed = 0;

async function refreshAreas() {
  if (isCreateMode.value) {
    areaLoading.value = false;
    return;
  }
  if (!form.sceneId) {
    areas.value = [];
    return;
  }
  areaLoading.value = true;
  try {
    areas.value = await getAreaList(form.sceneId);
  } finally {
    areaLoading.value = false;
  }
}

function toHundredMeter(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(3));
}

function clearMapOverlays() {
  if (mapInstance && mapMarker) {
    mapInstance.removeOverlay(mapMarker);
    mapMarker = null;
  }
  if (mapInstance && mapCircle) {
    mapInstance.removeOverlay(mapCircle);
    mapCircle = null;
  }
}

async function ensureBaiduMapScript() {
  if ((window as any).BMap) return;
  if (!baiduMapAk) throw new Error('缺少百度地图 AK，请在环境变量中配置 VITE_BAIDU_MAP_AK');
  if (mapScriptPromise) return mapScriptPromise;
  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const callbackName = `__bmap_callback_${Date.now()}`;
    (window as any)[callbackName] = () => {
      resolve();
      delete (window as any)[callbackName];
    };
    const script = document.createElement('script');
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${encodeURIComponent(baiduMapAk)}&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      reject(new Error('百度地图脚本加载失败'));
      delete (window as any)[callbackName];
    };
    document.head.appendChild(script);
  });
  return mapScriptPromise;
}

async function renderMap() {
  const lng = toHundredMeter(form.longitude);
  const lat = toHundredMeter(form.latitude);
  if (lng === null || lat === null) {
    mapError.value = '请先填写经纬度';
    clearMapOverlays();
    return;
  }
  try {
    await nextTick();
    if (!mapRef.value) return;
    await ensureBaiduMapScript();
    const BMap = (window as any).BMap;
    if (!mapInstance) {
      mapInstance = new BMap.Map(mapRef.value);
      mapInstance.enableScrollWheelZoom(true);
      if (typeof mapInstance.setMinZoom === 'function') mapInstance.setMinZoom(16);
      if (typeof mapInstance.setMaxZoom === 'function') mapInstance.setMaxZoom(19);
    }
    const point = new BMap.Point(lng, lat);
    mapInstance.centerAndZoom(point, 17);
    clearMapOverlays();
    mapMarker = new BMap.Marker(point);
    mapInstance.addOverlay(mapMarker);
    mapCircle = new BMap.Circle(point, 100, {
      strokeColor: '#409eff',
      strokeWeight: 2,
      strokeOpacity: 0.9,
      fillColor: '#409eff',
      fillOpacity: 0.15
    });
    mapInstance.addOverlay(mapCircle);
    mapError.value = '';
  } catch (error: any) {
    mapError.value = error?.message || '地图加载失败';
  }
}

function buildAreaTreeNodes() {
  const nodeMap = new Map<string, AreaRecord>();
  areas.value.forEach((item) => nodeMap.set(item.id, { ...item, children: [] }));
  nodeMap.forEach((node) => {
    const parentId = `${node.parentId ?? '-1'}`;
    if (parentId !== '-1' && nodeMap.has(parentId)) nodeMap.get(parentId)!.children!.push(node);
  });
  return nodeMap;
}

function showAreaTree(area: AreaRecord) {
  const nodeMap = buildAreaTreeNodes();
  const targetNode = nodeMap.get(area.id);
  areaTreeData.value = targetNode ? [targetNode] : [];
  selectedAreaName.value = targetNode ? `当前区域：${area.name}` : area.name;
  areaTreeDialogVisible.value = true;
}

const handlePublish = () => {
  publishDialogVisible.value = true;
};

function buildScenarioConfigPayload() {
  return {
    sceneData: {
      sceneId: form.sceneId,
      code: form.sceneCode,
      name: form.sceneName,
      description: form.sceneDescription || '',
      status: form.status,
      url: form.url || '',
      domainId: Number(form.domainId),
      location:
        form.longitude !== null && form.longitude !== undefined && form.latitude !== null && form.latitude !== undefined
          ? { lng: Number(form.longitude), lat: Number(form.latitude) }
          : null,
      imageUrl: form.imageUrl || ''
    },
    areas: areas.value.map((item) => ({
      id: item.id,
      name: item.name,
      sceneId: item.sceneId,
      description: item.description || '',
      image: item.image || '',
      position: item.position || '',
      parentId: item.parentId ?? '-1'
    }))
  };
}

function exportScenarioConfig() {
  const configPayload = buildScenarioConfigPayload();
  const blob = new Blob([JSON.stringify(configPayload, null, 2)], { type: 'application/json' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `${form.sceneCode || form.sceneName || 'scenario'}.config`;
  link.click();
  window.URL.revokeObjectURL(downloadUrl);
  ElMessage.success('配置导出成功');
}

const publishScene = async () => {
  if (form.status !== '1' && !form.url) {
    ElMessage.warning('请输入发布访问地址');
    return;
  }
  publishSubmitting.value = true;
  try {
    const targetStatus = form.status === '1' ? '0' : '1';
    await publishScenario({
      sceneId: Number(form.sceneId),
      status: targetStatus,
      url: form.url || ''
    });

    form.status = targetStatus;
    publishDialogVisible.value = false;
    ElMessage.success(targetStatus === '1' ? '场景发布成功' : '场景已取消发布');
    emit('submit', { scenario: { ...form }, areas: [...areas.value] });
  } catch (error: any) {
    ElMessage.error(error?.response?.data || '操作失败');
  } finally {
    publishSubmitting.value = false;
  }
};

function normalizeIncomingScenario(scenario?: ScenarioRecord | null) {
  form.sceneId = scenario?.sceneId || '';
  form.sceneName = scenario?.sceneName || '';
  form.sceneCode = scenario?.sceneCode || '';
  form.sceneDescription = scenario?.sceneDescription || '';
  form.status = `${scenario?.status ?? '0'}`.trim() === '1' ? '1' : '0';
  form.domainId = scenario?.domainId || props.domains[0]?.domainId || '';
  form.longitude = scenario?.longitude ?? null;
  form.latitude = scenario?.latitude ?? null;
  form.imageUrl = scenario?.imageUrl || '';
  form.url = scenario?.url || '';
}

watch(
  () => props.scenario,
  (scenario) => {
    normalizeIncomingScenario(scenario);
    if (isCreateMode.value) {
      areas.value = [];
    } else {
      refreshAreas();
    }
    renderMap();
  },
  { immediate: true }
);

watch(() => props.mode, () => {
  normalizeIncomingScenario(props.scenario);
  if (isCreateMode.value) areas.value = [];
  else refreshAreas();
  renderMap();
}, { immediate: true });

watch(
  () => [form.longitude, form.latitude],
  () => {
    renderMap();
  }
);

function openCreateArea() {
  editingAreaId.value = '';
  areaForm.name = '';
  areaForm.description = '';
  areaForm.position = '';
  areaForm.image = '';
  areaForm.parentId = null;
  areaDialogVisible.value = true;
}

function openEditArea(area: AreaRecord) {
  editingAreaId.value = area.id;
  areaForm.name = area.name;
  areaForm.description = area.description || '';
  areaForm.position = area.position || '';
  areaForm.image = area.image || '';
  areaForm.parentId = area.parentId && area.parentId !== '-1' ? area.parentId : null;
  areaDialogVisible.value = true;
}

async function submitArea() {
  if (!areaFormRef.value) return;
  const valid = await areaFormRef.value.validate().catch(() => false);
  if (!valid) return;
  areaSubmitting.value = true;
  try {
    const payload = {
      name: areaForm.name.trim(),
      sceneId: form.sceneId,
      description: areaForm.description.trim(),
      position: areaForm.position.trim(),
      image: areaForm.image.trim(),
      parentId: areaForm.parentId && areaForm.parentId !== '-1' ? `${areaForm.parentId}` : '-1'
    };

    if (isCreateMode.value) {
      if (editingAreaId.value) {
        const index = areas.value.findIndex((item) => item.id === editingAreaId.value);
        if (index >= 0) {
          areas.value[index] = { ...areas.value[index], ...payload, id: editingAreaId.value, sceneId: '' };
        }
      } else {
        localAreaSeed += 1;
        areas.value.push({ ...payload, id: `local-${localAreaSeed}`, sceneId: '' });
      }
    } else {
      const requestPayload = {
        name: payload.name,
        sceneId: Number(form.sceneId),
        description: payload.description,
        position: payload.position,
        image: payload.image,
        parentId: payload.parentId !== '-1' ? Number(payload.parentId) : -1
      };
      if (editingAreaId.value) {
        await updateArea(editingAreaId.value, requestPayload);
      } else {
        await createArea(requestPayload);
      }
      await refreshAreas();
    }

    areaDialogVisible.value = false;
    ElMessage.success('区域保存成功');
  } catch (error: any) {
    ElMessage.error(error?.response?.data || '区域保存失败');
  } finally {
    areaSubmitting.value = false;
  }
}

async function handleDeleteArea(area: AreaRecord) {
  try {
    await ElMessageBox.confirm(`确认删除区域「${area.name}」吗？`, '删除区域', { type: 'warning' });
    if (isCreateMode.value) {
      areas.value = areas.value.filter((item) => item.id !== area.id);
    } else {
      await deleteArea(area.id);
      await refreshAreas();
    }
    ElMessage.success('删除成功');
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return;
    ElMessage.error(error?.response?.data || '删除失败');
  }
}

async function submit() {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  emit('submit', {
    scenario: {
      sceneId: form.sceneId,
      sceneName: form.sceneName.trim(),
      sceneCode: form.sceneCode.trim(),
      sceneDescription: form.sceneDescription.trim(),
      status: form.status,
      domainId: form.domainId,
      longitude: toHundredMeter(form.longitude),
      latitude: toHundredMeter(form.latitude),
      imageUrl: (form.imageUrl || '').trim(),
      url: (form.url || '').trim()
    },
    areas: areas.value.map((item) => ({ ...item }))
  });
}

function handleCancel() {
  if (!isCreateMode.value && window.top && window.top !== window) {
    window.top.postMessage({ eventType: 'invoke', method: 'closeUrl', params: [] });
  } else {
    emit('cancel');
  }
}

onBeforeUnmount(() => {
  clearMapOverlays();
  mapInstance = null;
});
</script>

<style scoped>
.scenario-detail-page {
  min-height: 100%;
  padding: 16px 20px;
  background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 35%);
}
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}
.header-main { flex: 1; }
.header-main h2 { margin: 0; font-size: 22px; color: #1f2d3d; }
.header-main p { margin: 8px 0 0; color: #6b7a90; font-size: 13px; }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-card, .detail-card { border-radius: 10px; }
.summary-title { font-size: 12px; color: #8a98ae; }
.summary-value { margin-top: 6px; color: #1f2d3d; font-size: 18px; font-weight: 600; }
.detail-card { margin-bottom: 16px; }
.card-header { font-size: 14px; font-weight: 600; color: #1f2d3d; }
.area-header { display: flex; justify-content: space-between; align-items: center; }
.map-card { overflow: hidden; }
.map-wrapper { position: relative; }
.map-container { width: 100%; height: 320px; border-radius: 8px; }
.map-error { position: absolute; top: 12px; left: 12px; right: 12px; padding: 10px 12px; border-radius: 8px; background: #fef0f0; color: #f56c6c; }
.area-tree-header { margin-bottom: 12px; color: #1f2d3d; font-weight: 500; }
.detail-actions { display: flex; justify-content: flex-end; }
.image-uploader { border: 1px dashed var(--el-border-color); border-radius: 6px; cursor: pointer; position: relative; overflow: hidden; transition: var(--el-transition-duration-fast); width: 100%; display: flex; justify-content: center; align-items: center; height: 120px; background-color: var(--el-fill-color-lighter); }
.image-uploader :deep(.el-upload) { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
.image-uploader:hover { border-color: var(--el-color-primary); }
.image-uploader-icon { font-size: 28px; color: #8c939d; text-align: center; }
.uploaded-image { width: 100%; height: 100%; object-fit: contain; }
.area-table-image { width: 60px; height: 40px; object-fit: contain; border-radius: 4px; border: 1px solid var(--el-border-color-lighter); }
@media (max-width: 900px) { .summary-grid { grid-template-columns: 1fr; } }
</style>