<template>
  <div class="deploy-config-page">
    <el-card class="deploy-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">发布服务器</span>
          <el-button
            type="primary"
            :disabled="!publishDirty || publishSaving"
            :loading="publishSaving"
            @click="onSavePublish"
          >
            保存
          </el-button>
        </div>
      </template>

      <el-form label-width="120px" class="deploy-form">
        <div class="form-group-title">SSH 连接</div>
        <div class="form-row">
          <el-form-item label="主机地址" required>
            <el-input v-model="publishForm.host" placeholder="发布服务器 IP 或域名" />
          </el-form-item>
          <el-form-item label="SSH 端口" required>
            <el-input-number v-model="publishForm.sshPort" :min="1" :max="65535" controls-position="right" class="full-width port-input" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="SSH 用户名" required>
            <el-input v-model="publishForm.sshUsername" placeholder="SSH 登录用户名" />
          </el-form-item>
          <el-form-item label="SSH 密码">
            <el-input v-model="publishForm.sshPassword" type="password" placeholder="******" show-password />
          </el-form-item>
        </div>

        <div class="form-group-title">运行环境</div>
        <div class="form-row">
          <el-form-item label="安装根目录" required>
            <el-input v-model="publishForm.runtimeRoot" placeholder="运行环境安装根目录路径" />
          </el-form-item>
          <el-form-item label="访问地址" required>
            <el-input v-model="publishForm.runtimeUrl" placeholder="运行环境 HTTP 访问地址" />
          </el-form-item>
        </div>

        <div class="form-group-title">数据库</div>
        <div class="form-row">
          <el-form-item label="数据库类型" required>
            <el-select v-model="publishForm.dbType" placeholder="请选择" class="full-width" @change="onDbTypeChange">
              <el-option
                v-for="t in DATABASE_TYPES"
                :key="t.value"
                :label="t.name"
                :value="t.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="数据库服务器">
            <el-input v-model="publishForm.dbHost" :placeholder="`默认 ${DEFAULT_DB_HOST}`" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="数据库端口">
            <el-input-number v-model="publishForm.dbPort" :min="1" :max="65535" controls-position="right" class="full-width port-input" :placeholder="`默认 ${dbPortDefault}`" />
          </el-form-item>
          <el-form-item label="数据库名" required>
            <el-input v-model="publishForm.dbName" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="数据库账号" required>
            <el-input v-model="publishForm.dbUsername" />
          </el-form-item>
          <el-form-item label="数据库密码">
            <el-input v-model="publishForm.dbPassword" type="password" placeholder="******" show-password />
          </el-form-item>
        </div>

        <div v-if="missingHint" class="missing-hint">{{ missingHint }}</div>
      </el-form>
    </el-card>

    <!-- Quality Checks card -->
    <el-card class="deploy-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">质量检查</span>
          <el-button
            type="primary"
            :disabled="!qualityDirty || qualitySaving"
            :loading="qualitySaving"
            @click="onSaveQuality"
          >
            保存
          </el-button>
        </div>
      </template>
      <div class="quality-checkboxes">
        <el-checkbox v-model="qualityForm.baseFramework">基础框架特性分析</el-checkbox>
        <el-checkbox v-model="qualityForm.dependencyInjection">依赖注入分析</el-checkbox>
        <el-checkbox v-model="qualityForm.webEndpoints">Web端点配置分析</el-checkbox>
        <el-checkbox v-model="qualityForm.persistenceFramework">持久化框架特性分析</el-checkbox>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  DATABASE_TYPES,
  DEFAULT_DB_HOST,
  getDbTypeDefaultPort,
  getPublishServerConfig,
  savePublishServerConfig,
  rsaEncryptWithKey,
  getQualityConfig,
  saveQualityConfig,
  type PublishServerConfig,
  type QualityChecksConfig,
} from '../../api/deploy-config';

interface PublishFormState {
  host: string;
  sshPort: number;
  sshUsername: string;
  sshPassword: string;
  runtimeRoot: string;
  runtimeUrl: string;
  dbType: number;
  dbHost: string;
  dbPort: number | null;
  dbName: string;
  dbUsername: string;
  dbPassword: string;
}

const publishForm = reactive<PublishFormState>({
  host: '',
  sshPort: 22,
  sshUsername: '',
  sshPassword: '',
  runtimeRoot: '',
  runtimeUrl: '',
  dbType: 1,
  dbHost: '',
  dbPort: null,
  dbName: '',
  dbUsername: '',
  dbPassword: '',
});

const publishSaved = ref<PublishFormState | null>(null);
const publishSaving = ref(false);
const publicKey = ref('');
const missingHint = ref('');

const dbPortDefault = computed(() => getDbTypeDefaultPort(publishForm.dbType));

const publishDirty = computed(() => {
  if (!publishSaved.value) return true;
  const s = publishSaved.value;
  return (
    publishForm.host !== s.host ||
    publishForm.sshPort !== s.sshPort ||
    publishForm.sshUsername !== s.sshUsername ||
    publishForm.runtimeRoot !== s.runtimeRoot ||
    publishForm.runtimeUrl !== s.runtimeUrl ||
    publishForm.dbType !== s.dbType ||
    publishForm.dbHost !== s.dbHost ||
    publishForm.dbPort !== s.dbPort ||
    publishForm.dbName !== s.dbName ||
    publishForm.dbUsername !== s.dbUsername ||
    publishForm.sshPassword !== '' ||
    publishForm.dbPassword !== ''
  );
});

function onDbTypeChange() {
  publishForm.dbHost = '';
  publishForm.dbPort = null;
}

function applyConfigToForm(config: PublishServerConfig | null) {
  if (config) {
    publishForm.host = config.host;
    publishForm.sshPort = config.sshPort;
    publishForm.sshUsername = config.sshUsername;
    publishForm.sshPassword = '';
    publishForm.runtimeRoot = config.runtimeRoot;
    publishForm.runtimeUrl = config.runtimeUrl;
    publishForm.dbType = config.dbType;
    publishForm.dbHost = config.dbHost;
    publishForm.dbPort = config.dbPort;
    publishForm.dbName = config.dbName;
    publishForm.dbUsername = config.dbUsername;
    publishForm.dbPassword = '';
  } else {
    publishForm.host = '';
    publishForm.sshPort = 22;
    publishForm.sshUsername = '';
    publishForm.sshPassword = '';
    publishForm.runtimeRoot = '';
    publishForm.runtimeUrl = '';
    publishForm.dbType = 1;
    publishForm.dbHost = '';
    publishForm.dbPort = null;
    publishForm.dbName = '';
    publishForm.dbUsername = '';
    publishForm.dbPassword = '';
  }
  publishSaved.value = {
    ...publishForm,
    sshPassword: '',
    dbPassword: '',
  };
}

async function loadPublishConfig() {
  try {
    const res = await getPublishServerConfig();
    publicKey.value = res.publicKey || '';
    missingHint.value = res.missingHint || '';
    applyConfigToForm(res.config);
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '加载发布服务器配置失败');
  }
}

function validateRequired(): string | null {
  if (!publishForm.host.trim()) return '请填写主机地址';
  if (!publishForm.sshUsername.trim()) return '请填写 SSH 用户名';
  if (!publishForm.runtimeRoot.trim()) return '请填写安装根目录';
  if (!publishForm.runtimeUrl.trim()) return '请填写访问地址';
  if (!publishForm.dbName.trim()) return '请填写数据库名';
  if (!publishForm.dbUsername.trim()) return '请填写数据库账号';
  return null;
}

async function onSavePublish() {
  const err = validateRequired();
  if (err) {
    ElMessage.warning(err);
    return;
  }
  if (!publicKey.value) {
    ElMessage.error('公钥缺失，请刷新页面重试');
    return;
  }

  publishSaving.value = true;
  try {
    const finalDbHost = publishForm.dbHost.trim() || DEFAULT_DB_HOST;
    const finalDbPort = publishForm.dbPort ?? dbPortDefault.value;

    const payload: any = {
      host: publishForm.host.trim(),
      sshPort: publishForm.sshPort,
      sshUsername: publishForm.sshUsername.trim(),
      runtimeRoot: publishForm.runtimeRoot.trim(),
      runtimeUrl: publishForm.runtimeUrl.trim(),
      dbType: publishForm.dbType,
      dbHost: finalDbHost,
      dbPort: finalDbPort,
      dbName: publishForm.dbName.trim(),
      dbUsername: publishForm.dbUsername.trim(),
    };
    if (publishForm.sshPassword) {
      payload.sshPassword = rsaEncryptWithKey(publishForm.sshPassword, publicKey.value);
    }
    if (publishForm.dbPassword) {
      payload.dbPassword = rsaEncryptWithKey(publishForm.dbPassword, publicKey.value);
    }

    await savePublishServerConfig(payload);
    ElMessage.success('已保存');
    publishForm.sshPassword = '';
    publishForm.dbPassword = '';
    publishForm.dbHost = finalDbHost;
    publishForm.dbPort = finalDbPort;
    publishSaved.value = { ...publishForm };
    await loadPublishConfig();
  } catch (e: any) {
    const msg = e?.response?.data?.error || e?.message || '保存失败';
    ElMessage.error(msg);
  } finally {
    publishSaving.value = false;
  }
}

const qualityForm = reactive<QualityChecksConfig>({
  baseFramework: true,
  dependencyInjection: true,
  webEndpoints: true,
  persistenceFramework: false,
});
const qualitySaved = ref<QualityChecksConfig>({ ...qualityForm });
const qualitySaving = ref(false);

const qualityDirty = computed(() => {
  return (
    qualityForm.baseFramework !== qualitySaved.value.baseFramework ||
    qualityForm.dependencyInjection !== qualitySaved.value.dependencyInjection ||
    qualityForm.webEndpoints !== qualitySaved.value.webEndpoints ||
    qualityForm.persistenceFramework !== qualitySaved.value.persistenceFramework
  );
});

async function loadQualityConfig() {
  try {
    const res = await getQualityConfig();
    if (res?.config) {
      qualityForm.baseFramework = res.config.baseFramework;
      qualityForm.dependencyInjection = res.config.dependencyInjection;
      qualityForm.webEndpoints = res.config.webEndpoints;
      qualityForm.persistenceFramework = res.config.persistenceFramework;
      qualitySaved.value = { ...qualityForm };
    }
  } catch (e: any) {
    console.warn('加载质量检查配置失败，使用默认值', e);
  }
}

async function onSaveQuality() {
  qualitySaving.value = true;
  try {
    await saveQualityConfig({ ...qualityForm });
    qualitySaved.value = { ...qualityForm };
    ElMessage.success('已保存');
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error || '保存失败');
  } finally {
    qualitySaving.value = false;
  }
}

onMounted(() => {
  loadPublishConfig();
  loadQualityConfig();
});
</script>

<style scoped>
.deploy-config-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deploy-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 0 !important;
}

.deploy-form {
  max-width: 1400px;
}

/* ---- Responsive 2-column rows ---- */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-row :deep(.el-form-item) {
  min-width: 0;
}

@media (max-width: 760px) {
  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

/* ---- Group titles ---- */
.form-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin: 16px 0 12px;
  padding-left: 8px;
  border-left: 3px solid #2a87ff;
}

.form-group-title:first-child {
  margin-top: 0;
}

/* ---- Port inputs: left-align ---- */
.port-input :deep(.el-input__inner) {
  text-align: left;
}

.full-width {
  width: 100%;
}

/* ---- Missing hint ---- */
.missing-hint {
  color: #f56c6c;
  font-size: 13px;
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(245, 108, 108, 0.06);
  border-radius: 4px;
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: #909399;
}

.quality-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quality-checkboxes :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #303133;
}

:deep(.el-card__header) {
  border-bottom: none !important;
  padding: 0 !important;
}

:deep(.form-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}
</style>
