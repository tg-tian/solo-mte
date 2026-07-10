# Global Deploy Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global "部署配置" Tab in `app-center` (between 我的应用 and 我的环境) with editable Publish Server + Quality Checks cards, refactor `app-builder`'s existing 部署配置 page to be read-only for Publish Server + drop Quality Checks, and wire `app-builder`'s 新建分析任务 to consume the global Quality Checks as defaults with a 恢复默认 button.

**Architecture:** Two independent Vue apps in the monorepo. `app-center` new tab uses Element Plus SFC pattern (matches env.vue/device.vue). `app-builder` modifications stay in the existing Vue 3 + JSX component. Both apps hit `/solo-mte-publish/*` APIs (Nginx-routed prefix). RSA encryption for passwords uses the `publicKey` returned from `GET /config` (dynamic, not hardcoded).

**Tech Stack:** Vue 3 + Element Plus (app-center new tab), Vue 3 + JSX + @farris/ui-vue (app-builder, unchanged), axios, jsencrypt, TypeScript.

## Global Constraints

- **API prefix**: All new backend calls use `/solo-mte-publish` prefix (Nginx转发识别), e.g. `GET /solo-mte-publish/config`
- **APIs**: 4 endpoints per spec §3 — `GET/POST /config`, `GET/POST /quality-config`
- **Response envelope**: `{ ok: boolean, ... }` for all 4 endpoints; errors: `{ ok: false, error: string }` (lowercase `error`)
- **Element Plus**: Globally registered in `app-center/src/main.ts` — use `el-card`/`el-form`/`el-input`/`el-select`/`el-option`/`el-checkbox`/`el-button` directly in template; only `ElMessage` needs explicit import
- **RSA publicKey**: Dynamic, fetched fresh from `GET /config` on every page entry (NOT hardcoded — different from app-builder's `rsaEncrypt` which uses a fixed key)
- **PEM format**: publicKey returned as `-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n`; jsencrypt accepts this directly
- **Password fields never displayed in app-builder readonly view**: API does not return them; rows hidden entirely (not "••••")
- **dbType → name mapping**: Duplicate in both apps (no shared module path; constant is small). Use a simple `Record<number, string>` lookup
- **`dbHost` / `dbPort` empty-on-blur semantics**: UI allows blank; frontend fills defaults (`localhost` / dbType-specific port) before POST
- **DB types**: 11 entries per spec §3.2 — PostgreSQL/1/5432, SqlServer/2/1433, Oracle/3/1521, DM/4/5236, HighGo/5/5866, MySQL/6/3306, Oscar/7/2003, Kingbase/8/54321, DB2/9/50000, OpenGauss/10/5432, OceanBase/11/2881
- **JSX v-model quirk**: In app-builder JSX, never use `v-model={ref}` — use `value={ref.value} onInput={...}` (existing pattern in deploy-config.component.tsx)
- **app-builder user-modified state**: The user previously modified `deploy-config.component.tsx` (added `class="git-btn"` on FButtons, removed `size="small"` on refresh button, removed `<div class="f-admin-main-header"></div>`, swapped initGit.svg → initGit-white.svg). Task 5 changes MUST preserve these — only touch what each step explicitly says to touch.
- **Dev URL**: `https://localhost:5200/apps/platform/development-platform/ide/app-center/index.html` (and equivalent for app-builder)
- **Dev command**: `cd packages/ide && npm run dev`

## File Structure

```
packages/ide/apps/platform/development-platform/ide/app-center/src/
├── api/
│   └── deploy-config.ts                    # NEW: 4 API wrappers + DATABASE_TYPES const
├── components/
│   └── deploy-config/
│       └── deploy-config.vue               # NEW: SFC with Publish Server + Quality Checks cards
└── app.tsx                                 # MODIFY: add Tab to navData + render branch

packages/ide/apps/platform/development-platform/ide/app-builder/src/components/
├── deploy-config/
│   ├── service.ts                          # MODIFY (Task 5): add getPublishServerConfig
│   ├── types.ts                            # MODIFY (Task 5): replace PublishServerConfig shape, add Response type + DB_TYPE_NAME_MAP
│   ├── deploy-config.component.tsx         # MODIFY (Task 5): remove quality section; publish readonly; refresh loads both
│   └── deploy-config.scss                  # MODIFY (Task 5): add warning block + link styles
└── analysis/
    ├── service.ts                          # MODIFY (Task 6): add getQualityConfig + QualityChecksConfig type
    └── components/
        ├── analysis-task-card.component.tsx  # MODIFY (Task 6): load defaults + 恢复默认 button
        └── analysis-task-card.scss           # MODIFY (Task 6): add restore-defaults-btn style
```

---

### Task 1: app-center API Layer

**Goal:** Create the API wrapper module that all subsequent app-center tasks consume. Standalone file, no UI.

**Files:**
- Create: `packages/ide/apps/platform/development-platform/ide/app-center/src/api/deploy-config.ts`

**Interfaces:**
- Produces: `getPublishServerConfig() → Promise<PublishServerConfigResponse>`, `savePublishServerConfig(payload) → Promise<{ok:boolean}>`, `getQualityConfig() → Promise<{ok:boolean, config:QualityChecksConfig}>`, `saveQualityConfig(config) → Promise<{ok:boolean}>`, `rsaEncryptWithKey(plain, publicKey) → string`, `DATABASE_TYPES` const, `DEFAULT_DB_HOST` const, `getDbTypeName(value) → string` helper, `getDbTypeDefaultPort(value) → number` helper
- Produces types: `PublishServerConfig`, `PublishServerConfigResponse`, `QualityChecksConfig`, `DatabaseType`

- [ ] **Step 1: Create the API file**

Create `packages/ide/apps/platform/development-platform/ide/app-center/src/api/deploy-config.ts`:

```typescript
import axios from 'axios';
import JSEncrypt from 'jsencrypt';

const BASE = '/solo-mte-publish';

export interface PublishServerConfig {
    host: string;
    sshPort: number;
    sshUsername: string;
    runtimeRoot: string;
    runtimeUrl: string;
    dbType: number;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUsername: string;
}

export interface PublishServerConfigResponse {
    ok: boolean;
    config: PublishServerConfig | null;
    isComplete: boolean;
    missingHint: string;
    publicKey: string;
}

export interface QualityChecksConfig {
    baseFramework: boolean;
    dependencyInjection: boolean;
    webEndpoints: boolean;
    persistenceFramework: boolean;
}

export interface DatabaseType {
    value: number;
    name: string;
    defaultPort: number;
}

export const DATABASE_TYPES: readonly DatabaseType[] = [
    { value: 1,  name: 'PostgreSQL', defaultPort: 5432 },
    { value: 2,  name: 'SqlServer',  defaultPort: 1433 },
    { value: 3,  name: 'Oracle',     defaultPort: 1521 },
    { value: 4,  name: 'DM',         defaultPort: 5236 },
    { value: 5,  name: 'HighGo',     defaultPort: 5866 },
    { value: 6,  name: 'MySQL',      defaultPort: 3306 },
    { value: 7,  name: 'Oscar',      defaultPort: 2003 },
    { value: 8,  name: 'Kingbase',   defaultPort: 54321 },
    { value: 9,  name: 'DB2',        defaultPort: 50000 },
    { value: 10, name: 'OpenGauss',  defaultPort: 5432 },
    { value: 11, name: 'OceanBase',  defaultPort: 2881 },
];

export const DEFAULT_DB_HOST = 'localhost';

export function getDbTypeName(value: number): string {
    return DATABASE_TYPES.find(t => t.value === value)?.name || `类型${value}`;
}

export function getDbTypeDefaultPort(value: number): number {
    return DATABASE_TYPES.find(t => t.value === value)?.defaultPort || 5432;
}

export function getPublishServerConfig(): Promise<PublishServerConfigResponse> {
    return axios.get(`${BASE}/config`).then(res => res.data);
}

export function savePublishServerConfig(payload: {
    host: string;
    sshPort: number;
    sshUsername: string;
    sshPassword?: string;
    runtimeRoot: string;
    runtimeUrl: string;
    dbType: number;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUsername: string;
    dbPassword?: string;
}): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/config`, payload).then(res => res.data);
}

export function getQualityConfig(): Promise<{ ok: boolean; config: QualityChecksConfig }> {
    return axios.get(`${BASE}/quality-config`).then(res => res.data);
}

export function saveQualityConfig(config: QualityChecksConfig): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/quality-config`, config).then(res => res.data);
}

export function rsaEncryptWithKey(plain: string, publicKey: string): string {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);
    const encrypted = encrypt.encrypt(plain);
    if (encrypted === false) {
        throw new Error('RSA 加密失败');
    }
    return encrypted;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/ide && npx vue-tsc --noEmit 2>&1 | grep -i "api/deploy-config" | head -10`
Expected: no errors mentioning `api/deploy-config`. (Pre-existing errors elsewhere OK.)

- [ ] **Step 3: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-center/src/api/deploy-config.ts
git commit -m "feat(app-center/api): add deploy-config API layer"
```

---

### Task 2: app-center Tab Skeleton

**Goal:** Add the "部署配置" tab to app-center's nav bar and render a placeholder component. Verifies routing/wiring works before filling in card content.

**Files:**
- Create: `packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-center/src/app.tsx`

**Interfaces:**
- Consumes: none (placeholder)
- Produces: `FAppDeployConfig` Vue SFC default export

- [ ] **Step 1: Create placeholder deploy-config.vue**

Create `packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue`:

```vue
<template>
  <div class="deploy-config-page">
    <el-card class="deploy-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">发布服务器</span>
        </div>
      </template>
      <div class="placeholder">待实现</div>
    </el-card>

    <el-card class="deploy-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">质量检查</span>
        </div>
      </template>
      <div class="placeholder">待实现</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
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
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: #909399;
}
</style>
```

- [ ] **Step 2: Modify app.tsx to add the tab**

In `packages/ide/apps/platform/development-platform/ide/app-center/src/app.tsx`:

**2a. Add the import** (after the `import Env ...` line, around line 5):

```typescript
import FAppDeployConfig from './components/deploy-config/deploy-config.vue'
```

**2b. Extend the ViewKey type** (around line 14):

Replace:
```typescript
type ViewKey = 'start' | 'my-apps' | 'env' | 'device'
```
With:
```typescript
type ViewKey = 'start' | 'my-apps' | 'deploy-config' | 'env' | 'device'
```

**2c. Insert deploy-config into navData between my-apps and env** (around line 28-33):

Replace:
```typescript
const navData = [
  { id: 'start', text: '开始' },
  { id: 'my-apps', text: '我的应用' },
  { id: 'env', text: '我的环境' },
  { id: 'device', text: '我的物理设备' },
]
```
With:
```typescript
const navData = [
  { id: 'start', text: '开始' },
  { id: 'my-apps', text: '我的应用' },
  { id: 'deploy-config', text: '部署配置' },
  { id: 'env', text: '我的环境' },
  { id: 'device', text: '我的物理设备' },
]
```

**2d. Add the visibility computed** (around line 58-61, after `shouldShowAppsView`):

```typescript
const shouldShowDeployConfig = computed(() => currentView.value === 'deploy-config')
```

**2e. Add the render branch** (around line 130-134, in the `.f-page-main` block):

Replace:
```tsx
{shouldShowWelcome.value && <FWelcome>Welcome</FWelcome>}
{shouldShowAppsView.value && <FApps>AppList</FApps>}
{shouldShowEnv.value && sceneId.value && <Env sceneId={sceneId.value} />}
{shouldShowDevice.value && sceneId.value && <Device sceneId={sceneId.value} />}
```
With:
```tsx
{shouldShowWelcome.value && <FWelcome>Welcome</FWelcome>}
{shouldShowAppsView.value && <FApps>AppList</FApps>}
{shouldShowDeployConfig.value && <FAppDeployConfig />}
{shouldShowEnv.value && sceneId.value && <Env sceneId={sceneId.value} />}
{shouldShowDevice.value && sceneId.value && <Device sceneId={sceneId.value} />}
```

- [ ] **Step 3: Run dev and verify tab appears**

Run: `cd packages/ide && npm run dev`
Open: `https://localhost:5200/apps/platform/development-platform/ide/app-center/index.html`

Verify in browser:
- Nav bar shows "部署配置" between "我的应用" and "我的环境"
- Clicking "部署配置" shows two empty el-cards with titles "发布服务器" and "质量检查"
- No console errors

- [ ] **Step 4: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue \
        packages/ide/apps/platform/development-platform/ide/app-center/src/app.tsx
git commit -m "feat(app-center): add 部署配置 tab skeleton"
```

---

### Task 3: app-center Publish Server Card

**Goal:** Implement the full Publish Server card — 12 fields in 3 groups (SSH / Runtime / Database), dbType dropdown with dynamic placeholder + clear-on-change, password fields optional, RSA encryption on save, dirty tracking.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue`

**Interfaces:**
- Consumes: `getPublishServerConfig`, `savePublishServerConfig`, `rsaEncryptWithKey`, `DATABASE_TYPES`, `DEFAULT_DB_HOST`, `getDbTypeDefaultPort` from `../../api/deploy-config`
- Consumes: `ElMessage` from `element-plus`

- [ ] **Step 1: Replace deploy-config.vue with full implementation**

Replace the entire contents of `packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue`:

```vue
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
        <el-form-item label="主机地址" required>
          <el-input v-model="publishForm.host" placeholder="例如 139.196.239.110" />
        </el-form-item>
        <el-form-item label="SSH 端口" required>
          <el-input-number v-model="publishForm.sshPort" :min="1" :max="65535" controls-position="right" class="full-width" />
        </el-form-item>
        <el-form-item label="SSH 用户名" required>
          <el-input v-model="publishForm.sshUsername" placeholder="例如 root" />
        </el-form-item>
        <el-form-item label="SSH 密码">
          <el-input v-model="publishForm.sshPassword" type="password" placeholder="不改请留空" show-password />
        </el-form-item>

        <div class="form-group-title">运行环境</div>
        <el-form-item label="安装根目录" required>
          <el-input v-model="publishForm.runtimeRoot" placeholder="例如 /home/BaseEnvironment/igix2508B" />
        </el-form-item>
        <el-form-item label="访问地址" required>
          <el-input v-model="publishForm.runtimeUrl" placeholder="例如 http://139.196.239.110:5220" />
        </el-form-item>

        <div class="form-group-title">数据库</div>
        <el-form-item label="数据库类型" required>
          <el-select v-model="publishForm.dbType" placeholder="请选择" class="full-width" @change="onDbTypeChange">
            <el-option
              v-for="t in DATABASE_TYPES"
              :key="t.value"
              :label="`${t.name}（默认端口 ${t.defaultPort}）`"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数据库服务器">
          <el-input v-model="publishForm.dbHost" :placeholder="`默认 ${DEFAULT_DB_HOST}`" />
        </el-form-item>
        <el-form-item label="数据库端口">
          <el-input-number v-model="publishForm.dbPort" :min="1" :max="65535" controls-position="right" class="full-width" :placeholder="`默认 ${dbPortDefault}`" />
        </el-form-item>
        <el-form-item label="数据库名" required>
          <el-input v-model="publishForm.dbName" />
        </el-form-item>
        <el-form-item label="数据库账号" required>
          <el-input v-model="publishForm.dbUsername" />
        </el-form-item>
        <el-form-item label="数据库密码">
          <el-input v-model="publishForm.dbPassword" type="password" placeholder="不改请留空" show-password />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Quality Checks card placeholder — Task 4 fills this in -->
    <el-card class="deploy-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">质量检查</span>
        </div>
      </template>
      <div class="placeholder">待实现</div>
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
  type PublishServerConfig,
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

onMounted(() => {
  loadPublishConfig();
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
}

.deploy-form {
  max-width: 720px;
}

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

.full-width {
  width: 100%;
}

.placeholder {
  padding: 40px;
  text-align: center;
  color: #909399;
}
</style>
```

- [ ] **Step 2: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open: `https://localhost:5200/apps/platform/development-platform/ide/app-center/index.html`
Click "部署配置" tab.

Verify:
- Page loads without console errors
- 3 group titles visible: "SSH 连接", "运行环境", "数据库"
- 12 fields render with correct labels
- 数据库类型 dropdown shows 11 options with format `PostgreSQL（默认端口 5432）`
- 保存 button disabled on initial load (after GET returns, dirty=false)
- Switch dbType → dbHost/dbPort fields clear visually
- Edit any field → 保存 enables

- [ ] **Step 3: Verify save round-trip with backend**

With a running backend:
- Fill all required fields, leave password fields empty
- Click 保存 → success toast
- Refresh page → fields re-populate from API
- Edit a non-password field, save → success
- Fill sshPassword, save → success (no error about RSA)
- Reload → password field empty again (not returned by API)

- [ ] **Step 4: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue
git commit -m "feat(app-center/deploy-config): implement Publish Server card"
```

---

### Task 4: app-center Quality Checks Card

**Goal:** Replace the placeholder Quality Checks card with 4 checkboxes backed by `GET/POST /quality-config`.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue`

**Interfaces:**
- Consumes: `getQualityConfig`, `saveQualityConfig`, `QualityChecksConfig` from `../../api/deploy-config`

- [ ] **Step 1: Replace the Quality Checks placeholder block**

In `deploy-config.vue`, replace this block (in the template):

```vue
    <!-- Quality Checks card placeholder — Task 4 fills this in -->
    <el-card class="deploy-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">质量检查</span>
        </div>
      </template>
      <div class="placeholder">待实现</div>
    </el-card>
```

With:

```vue
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
```

- [ ] **Step 2: Extend the api import and add quality state**

In the `<script setup>` block, replace the existing api import:

```typescript
import {
  DATABASE_TYPES,
  DEFAULT_DB_HOST,
  getDbTypeDefaultPort,
  getPublishServerConfig,
  savePublishServerConfig,
  rsaEncryptWithKey,
  type PublishServerConfig,
} from '../../api/deploy-config';
```

With:

```typescript
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
```

Then, below the `onSavePublish` function (and before `onMounted`), add:

```typescript
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
    // keep code defaults; non-blocking
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
```

Update the existing `onMounted` to also load quality config:

```typescript
onMounted(() => {
  loadPublishConfig();
  loadQualityConfig();
});
```

- [ ] **Step 3: Add checkbox group styling**

In the `<style scoped>` block, before the closing `</style>` tag, add:

```css
.quality-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quality-checkboxes :deep(.el-checkbox__label) {
  font-size: 13px;
  color: #303133;
}
```

- [ ] **Step 4: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open the deploy-config tab.

Verify:
- Quality Checks card shows 4 checkboxes
- Initial state matches GET response (or code defaults `{true, true, true, false}` if backend unreachable)
- 保存 disabled on load
- Toggle a checkbox → 保存 enables
- Click 保存 → loading state on button → success toast → button disables again
- Reload page → saved state restores

- [ ] **Step 5: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-center/src/components/deploy-config/deploy-config.vue
git commit -m "feat(app-center/deploy-config): implement Quality Checks card"
```

---

### Task 5: app-builder Deploy-Config Refactor (service + types + component + scss)

**Goal:** Refactor the existing app-builder 部署配置 page end-to-end: add the `getPublishServerConfig` API wrapper + new types, replace the editable 发布服务器 section with a read-only API-driven view (3 states: null/incomplete/complete), remove the 质量检查 section entirely, and make the 刷新 button reload both GIT state and publish-server config.

This task folds types/service changes into one task because intermediate states would break the build (the existing `PublishServerConfig` shape is replaced, and `deploy-config.component.tsx` consumes it).

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/types.ts`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/service.ts`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.scss`

**Interfaces:**
- Produces (service): `getPublishServerConfig() → Promise<PublishServerConfigResponse>`
- Produces (types): new `PublishServerConfig` shape (10 fields, no passwords), `PublishServerConfigResponse`, `DB_TYPE_NAME_MAP`

- [ ] **Step 1: Read current deploy-config.component.tsx to confirm current line layout**

Run: `cat packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx | head -50`

The user previously modified this file (added `class="git-btn"`, removed `size="small"` on refresh, removed `f-admin-main-header` div, swapped initGit.svg → initGit-white.svg). The line numbers in subsequent steps are approximate — search by anchor text, not line number.

Locate these anchor points (search by exact text):
- `// === 发布服务器段 (mock) ===` — start of publish server state block
- `// === 质量检查段 (mock) ===` — start of quality checks state block
- `function renderPublishServerSection()` — render function
- `function renderQualityChecksSection()` — render function
- `<div class="f-page-main">` — main render area
- `<FButton type="secondary" onClick={loadRepoState}>刷新</FButton>` — refresh button

- [ ] **Step 2: Update types.ts — replace PublishServerConfig, add new types**

In `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/types.ts`:

**2a. Replace the existing `PublishServerConfig` interface** (which has `address/path/port` fields) with the new shape. Old:

```typescript
export interface PublishServerConfig {
    address: string;
    path: string;
    port: string;
}
```

New:

```typescript
export interface PublishServerConfig {
    host: string;
    sshPort: number;
    sshUsername: string;
    runtimeRoot: string;
    runtimeUrl: string;
    dbType: number;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUsername: string;
}
```

**2b. Append new types and constants at the end of the file** (do NOT remove other existing types — RepoState, ActiveOperation, OperationStatus are still used by the component):

```typescript

export interface PublishServerConfigResponse {
    ok: boolean;
    config: PublishServerConfig | null;
    isComplete: boolean;
    missingHint: string;
    publicKey: string;
}

export const DB_TYPE_NAME_MAP: Record<number, string> = {
    1: 'PostgreSQL',
    2: 'SqlServer',
    3: 'Oracle',
    4: 'DM',
    5: 'HighGo',
    6: 'MySQL',
    7: 'Oscar',
    8: 'Kingbase',
    9: 'DB2',
    10: 'OpenGauss',
    11: 'OceanBase',
};
```

- [ ] **Step 3: Update service.ts — add PublishServerConfigResponse import and getPublishServerConfig**

In `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/service.ts`:

**3a. Add the type import** at the top, changing:

```typescript
import axios from 'axios';
import JSEncrypt from 'jsencrypt';
```

To:

```typescript
import axios from 'axios';
import JSEncrypt from 'jsencrypt';
import type { PublishServerConfigResponse } from './types';
```

**3b. Add the new API function** at the bottom of the file (after `extractErrorMessage`). Match the existing pattern (`.then(res => res.data)`) used by `checkIsGitProject` and others:

```typescript
export function getPublishServerConfig(): Promise<PublishServerConfigResponse> {
    return axios.get('/solo-mte-publish/config').then(res => res.data);
}
```

- [ ] **Step 4: Update deploy-config.component.tsx — refresh imports**

In `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`:

**4a. Update vue import** — `computed` is no longer needed (dirty computeds are being removed). Change:

```typescript
import { computed, defineComponent, inject, onMounted, ref } from 'vue';
```

To:

```typescript
import { defineComponent, inject, onMounted, ref } from 'vue';
```

**4b. Update service import** — add `getPublishServerConfig`. The existing import block:

```typescript
import {
    checkIsGitProject,
    extractErrorMessage,
    getGitRepoConfig,
    gitClone,
    gitCommit,
    gitInit,
    gitPull,
    gitPush,
    gitRemoteAdd,
    gitRemoteDelete,
    gitRemoteView,
    gitRevert,
    updateGitRepoConfig,
    RemoteInfo
} from './service';
```

Becomes (added `getPublishServerConfig` in alphabetical position):

```typescript
import {
    checkIsGitProject,
    extractErrorMessage,
    getGitRepoConfig,
    getPublishServerConfig,
    gitClone,
    gitCommit,
    gitInit,
    gitPull,
    gitPush,
    gitRemoteAdd,
    gitRemoteDelete,
    gitRemoteView,
    gitRevert,
    updateGitRepoConfig,
    RemoteInfo
} from './service';
```

**4c. Update types import** — replace `PublishServerConfig, QualityChecksConfig` (old shapes) with new types:

```typescript
import { ActiveOperation, OperationStatus, PublishServerConfig, PublishServerConfigResponse, DB_TYPE_NAME_MAP, RepoState } from './types';
```

- [ ] **Step 5: Replace publish server + quality checks state blocks**

Find the block starting with `// === 发布服务器段 (mock) ===` and ending with the closing `}` of `savePublishServer` function. Delete this entire block.

Immediately after it, the `// === 质量检查段 (mock) ===` block starts. It ends with the closing `}` of `saveQualityChecks` function. Delete this entire block too.

In place of both deleted blocks, add the new publish-server readonly state:

```typescript
// === 发布服务器段（只读） ===
const publishConfig = ref<PublishServerConfig | null>(null);
const publishIsComplete = ref<boolean>(false);
const publishMissingHint = ref<string>('');
const publishLoading = ref<boolean>(false);

async function loadPublishServerConfig() {
    publishLoading.value = true;
    try {
        const res = await getPublishServerConfig();
        publishConfig.value = res.config;
        publishIsComplete.value = !!res.isComplete;
        publishMissingHint.value = res.missingHint || '';
    } catch (e) {
        publishConfig.value = null;
        publishIsComplete.value = false;
        publishMissingHint.value = '';
    } finally {
        publishLoading.value = false;
    }
}

function openAppCenter() {
    window.open('/apps/platform/development-platform/ide/app-center/index.html', '_blank');
}

function getDbTypeName(dbType: number): string {
    return DB_TYPE_NAME_MAP[dbType] || `类型${dbType}`;
}
```

- [ ] **Step 6: Add loadAll and wire onMounted + 刷新 button**

Find the existing `onMounted(() => { loadRepoState(); });` block. Replace with:

```typescript
async function loadAll() {
    await Promise.all([
        loadRepoState(),
        loadPublishServerConfig(),
    ]);
}

onMounted(() => {
    loadAll();
});
```

In the render function, find the 刷新 button (search for `onClick={loadRepoState}>刷新`):

```tsx
<FButton type="secondary" onClick={loadRepoState}>刷新</FButton>
```

Change to:

```tsx
<FButton type="secondary" onClick={loadAll}>刷新</FButton>
```

(Preserve any existing class attributes the user added, e.g. `class="git-btn"` — do not remove them.)

- [ ] **Step 7: Replace renderPublishServerSection**

Find the existing `function renderPublishServerSection()`. Delete the entire function body (from `function renderPublishServerSection() {` through its closing `}`). Replace with:

```typescript
function renderPublishServerSection() {
    return (
        <div class="deploy-section">
            <div class="deploy-section-header">
                <h5 class="deploy-section-title">发布服务器</h5>
            </div>
            <div class="deploy-section-body">
                {publishLoading.value && (
                    <div style="text-align: center; padding: 24px; color: #999;">加载中...</div>
                )}

                {!publishLoading.value && publishConfig.value === null && (
                    <div class="deploy-empty">
                        <div class="deploy-empty-text">尚未配置运行环境信息</div>
                        <div class="deploy-empty-hint">
                            请前往
                            <span class="deploy-link" onClick={openAppCenter}>应用中心 → 部署配置</span>
                            完成配置
                        </div>
                    </div>
                )}

                {!publishLoading.value && publishConfig.value !== null && (
                    <div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">主机地址</div>
                            <div class="deploy-info-value">{publishConfig.value.host || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">SSH 端口</div>
                            <div class="deploy-info-value">{publishConfig.value.sshPort || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">SSH 用户名</div>
                            <div class="deploy-info-value">{publishConfig.value.sshUsername || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">安装根目录</div>
                            <div class="deploy-info-value">{publishConfig.value.runtimeRoot || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">访问地址</div>
                            <div class="deploy-info-value">{publishConfig.value.runtimeUrl || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">数据库类型</div>
                            <div class="deploy-info-value">{getDbTypeName(publishConfig.value.dbType)}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">数据库服务器</div>
                            <div class="deploy-info-value">{publishConfig.value.dbHost || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">数据库端口</div>
                            <div class="deploy-info-value">{publishConfig.value.dbPort || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">数据库名</div>
                            <div class="deploy-info-value">{publishConfig.value.dbName || '-'}</div>
                        </div>
                        <div class="deploy-info-row">
                            <div class="deploy-info-label">数据库账号</div>
                            <div class="deploy-info-value">{publishConfig.value.dbUsername || '-'}</div>
                        </div>

                        {!publishIsComplete.value && (
                            <div class="deploy-publish-warning">
                                <div class="deploy-publish-warning-hint">⚠ {publishMissingHint.value || '配置不完整'}</div>
                                <div class="deploy-publish-warning-action">
                                    请前往
                                    <span class="deploy-link" onClick={openAppCenter}>应用中心 → 部署配置</span>
                                    完成配置
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 8: Delete renderQualityChecksSection**

Find `function renderQualityChecksSection()`. Delete the entire function (from `function renderQualityChecksSection() {` through its closing `}`).

- [ ] **Step 9: Remove renderQualityChecksSection call from page-main**

In the main `return () => (...)` render output, find the `<div class="f-page-main">` block. It currently looks like:

```tsx
<div class="f-page-main">
    {renderRepoSection()}
    {renderPublishServerSection()}
    {renderQualityChecksSection()}
</div>
```

Delete the `{renderQualityChecksSection()}` line so it becomes:

```tsx
<div class="f-page-main">
    {renderRepoSection()}
    {renderPublishServerSection()}
</div>
```

- [ ] **Step 10: Add CSS for warning block and link**

Open `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.scss`. Append at the end:

```scss
.deploy-link {
    color: #2a87ff;
    cursor: pointer;
    font-weight: 500;

    &:hover {
        text-decoration: underline;
    }
}

.deploy-publish-warning {
    margin-top: 16px;
    padding: 12px;
    background: #fef0f0;
    border: 1px solid #fbc4c4;
    border-radius: 4px;
    color: #f56c6c;
    font-size: 13px;

    .deploy-publish-warning-hint {
        margin-bottom: 4px;
    }

    .deploy-publish-warning-action {
        font-size: 12px;
    }

    .deploy-link {
        color: #2a87ff;
    }
}
```

- [ ] **Step 11: Verify TypeScript compiles**

Run: `cd packages/ide && npx vue-tsc --noEmit 2>&1 | grep "deploy-config" | head -20`
Expected: no errors mentioning `deploy-config`. (Pre-existing errors elsewhere OK.)

Common issues to fix if errors appear:
- Stale import of `computed` from vue — confirm Step 4a applied
- Stale import of `QualityChecksConfig` — confirm Step 4c removed it
- Reference to deleted `publishServerDirty` / `qualityChecksDirty` — search and remove

- [ ] **Step 12: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open: `https://localhost:5200/apps/platform/development-platform/ide/app-builder/index.html?path=/ingpt/aim/aimservice&boId=any&ws=any&version=2.0#/home`
Click "部署配置" in the left nav.

Verify:
- Page renders with only TWO sections: 代码仓库 + 发布服务器 (no 质量检查)
- 代码仓库 section works as before (state machine, operations, auth, delete remote) — including user's prior visual tweaks (git-btn class, initGit-white.svg icon)
- 发布服务器 section renders in one of 3 states based on backend response:
  - `config === null`: empty state with "尚未配置运行环境信息" + clickable link to app-center
  - `config !== null && isComplete === false`: 10 info rows + red warning block with missingHint + link
  - `config !== null && isComplete === true`: 10 info rows only
- No password rows displayed in any state
- Clicking "应用中心 → 部署配置" link opens app-center in new browser tab
- Click 刷新 → both GIT info and Publish Server info reload (loading states may flash briefly)

- [ ] **Step 13: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/types.ts \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/service.ts \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.scss
git commit -m "refactor(app-builder/deploy-config): readonly publish server + drop quality checks"
```

---

### Task 6: app-builder Analysis — Defaults + 恢复默认

**Goal:** When user opens "新建分析任务", fetch the global Quality Checks config and use it as the initial checkbox state. Show a "恢复默认" button whenever the current state differs from defaults; clicking restores defaults.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/service.ts`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/components/analysis-task-card.component.tsx`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/components/analysis-task-card.scss`

**Interfaces:**
- Produces (service): `getQualityConfig() → Promise<{ ok: boolean; config: QualityChecksConfig }>`, `QualityChecksConfig` type

- [ ] **Step 1: Add getQualityConfig to analysis/service.ts**

In `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/service.ts`, add at the very top of the file (this file currently has no top-level imports — the new lines go at line 1):

```typescript
import axios from 'axios';

export interface QualityChecksConfig {
    baseFramework: boolean;
    dependencyInjection: boolean;
    webEndpoints: boolean;
    persistenceFramework: boolean;
}

export function getQualityConfig(): Promise<{ ok: boolean; config: QualityChecksConfig }> {
    return axios.get('/solo-mte-publish/quality-config').then(res => res.data);
}

```

(Add a blank line after this block before the existing `/**` comment for `API_BASE_URL`.) Keep all existing exports (TaskInfo, createTask, listTasks, etc.) untouched.

- [ ] **Step 2: Update analysis-task-card.component.tsx imports**

In `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/components/analysis-task-card.component.tsx`:

**2a. Add `onMounted` to the vue import.** Change:

```typescript
import { defineComponent, ref, computed } from "vue";
```

To:

```typescript
import { defineComponent, ref, computed, onMounted } from "vue";
```

**2b. Extend the service import.** Change:

```typescript
import { createTask, AnalysisOptions } from "../service";
```

To:

```typescript
import { createTask, AnalysisOptions, getQualityConfig, type QualityChecksConfig } from "../service";
```

- [ ] **Step 3: Add default state, modification tracking, and load logic**

In the `setup()` function, locate the existing 4 checkbox refs (`baseFrameworkEnabled`, `dependencyInjectionEnabled`, `webEndpointsEnabled`, `persistenceFrameworkEnabled`). Immediately after the `persistenceFrameworkEnabled` declaration (around line 25), add:

```typescript
const defaultOptions = ref<QualityChecksConfig>({
    baseFramework: true,
    dependencyInjection: true,
    webEndpoints: true,
    persistenceFramework: false,
});

const isQualityModified = computed(() => {
    return (
        baseFrameworkEnabled.value !== defaultOptions.value.baseFramework ||
        dependencyInjectionEnabled.value !== defaultOptions.value.dependencyInjection ||
        webEndpointsEnabled.value !== defaultOptions.value.webEndpoints ||
        persistenceFrameworkEnabled.value !== defaultOptions.value.persistenceFramework
    );
});

function onRestoreDefaults() {
    baseFrameworkEnabled.value = defaultOptions.value.baseFramework;
    dependencyInjectionEnabled.value = defaultOptions.value.dependencyInjection;
    webEndpointsEnabled.value = defaultOptions.value.webEndpoints;
    persistenceFrameworkEnabled.value = defaultOptions.value.persistenceFramework;
}

onMounted(async () => {
    try {
        const res = await getQualityConfig();
        if (res?.config) {
            defaultOptions.value = { ...res.config };
            baseFrameworkEnabled.value = res.config.baseFramework;
            dependencyInjectionEnabled.value = res.config.dependencyInjection;
            webEndpointsEnabled.value = res.config.webEndpoints;
            persistenceFrameworkEnabled.value = res.config.persistenceFramework;
        }
    } catch (e) {
        // keep code defaults; non-blocking
        console.warn('加载质量检查默认值失败，使用代码默认值', e);
    }
});
```

- [ ] **Step 4: Add 恢复默认 button to the 分析选项 form-group**

In the render function, locate the "分析选项" form-group. Current structure:

```tsx
<div class="form-group">
    <label class="form-label">分析选项</label>
    <div class="checkbox-group">
        <label class="checkbox-item">
            <input
                type="checkbox"
                checked={baseFrameworkEnabled.value}
                onChange={(e) => baseFrameworkEnabled.value = (e.target as HTMLInputElement).checked}
            />
            <span>基础框架特性分析</span>
        </label>
        <label class="checkbox-item">
            <input
                type="checkbox"
                checked={dependencyInjectionEnabled.value}
                onChange={(e) => dependencyInjectionEnabled.value = (e.target as HTMLInputElement).checked}
            />
            <span>依赖注入分析</span>
        </label>
        <label class="checkbox-item">
            <input
                type="checkbox"
                checked={webEndpointsEnabled.value}
                onChange={(e) => webEndpointsEnabled.value = (e.target as HTMLInputElement).checked}
            />
            <span>Web端点配置分析</span>
        </label>
        <label class="checkbox-item">
            <input
                type="checkbox"
                checked={persistenceFrameworkEnabled.value}
                onChange={(e) => persistenceFrameworkEnabled.value = (e.target as HTMLInputElement).checked}
            />
            <span>持久化框架特性分析</span>
        </label>
    </div>
</div>
```

**Only modify the outer `<label class="form-label">分析选项</label>` line** — insert a conditional button inside it. Replace:

```tsx
<label class="form-label">分析选项</label>
```

With:

```tsx
<label class="form-label">
    分析选项
    {isQualityModified.value && (
        <button class="restore-defaults-btn" type="button" onClick={onRestoreDefaults}>
            恢复默认
        </button>
    )}
</label>
```

(Match the indentation level of the original `<label>` opening tag.)

**Do NOT touch the 4 `<label class="checkbox-item">` blocks** inside the `checkbox-group` — they stay exactly as shown above.

- [ ] **Step 5: Add CSS for restore-defaults-btn**

Open `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/components/analysis-task-card.scss` and append at the end:

```scss
.restore-defaults-btn {
    margin-left: 12px;
    padding: 2px 10px;
    background: #fff;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    color: #2a87ff;
    font-size: 12px;
    font-weight: 400;
    cursor: pointer;
    transition: border-color 0.2s;

    &:hover {
        border-color: #2a87ff;
    }
}
```

- [ ] **Step 6: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open: `https://localhost:5200/apps/platform/development-platform/ide/app-builder/index.html?path=/ingpt/aim/aimservice&boId=any&ws=any&version=2.0#/home`
Click "质量保障" in left nav, then "+ 新建任务".

Verify:
- New task card opens with 4 checkboxes
- Initial state matches global `GET /quality-config` response (or fallback `{true, true, true, false}` if backend unreachable)
- No "恢复默认" button visible when checkboxes match defaults
- Toggle any checkbox → "恢复默认" button appears next to "分析选项" label
- Click "恢复默认" → all 4 checkboxes revert to defaults → button disappears
- Modify again → button reappears
- Submitting the form still works (existing flow unchanged)

- [ ] **Step 7: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/service.ts \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/components/analysis-task-card.component.tsx \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/analysis/components/analysis-task-card.scss
git commit -m "feat(app-builder/analysis): use global quality-config defaults + 恢复默认 button"
```

---

### Task 7: End-to-End Verification

**Goal:** Walk through the complete acceptance criteria from spec §8. Fix any gaps found.

**Files:**
- Possibly: minor tweaks across files touched by Tasks 1-6

- [ ] **Step 1: Verify app-center acceptance criteria (spec §8.1)**

Run: `cd packages/ide && npm run dev`
Open: `https://localhost:5200/apps/platform/development-platform/ide/app-center/index.html`

Checklist:
1. [ ] Tab 栏 "部署配置" 位置正确（我的应用 与 我的环境 之间）
2. [ ] 两张卡片正确渲染（发布服务器表单 + 质量检查 checkbox）
3. [ ] 首次进入（config=null）：表单空、dbType=PostgreSQL、placeholder 显示对应默认端口
4. [ ] 切换 dbType：dbHost/dbPort 清空，placeholder 同步变化
5. [ ] dbHost/dbPort 留空保存：成功（前端补默认值）
6. [ ] 密码字段留空保存：成功（保留旧密码 — 后端配合验证）
7. [ ] 保存成功后 dirty 重置，按钮禁用，成功 toast
8. [ ] 质量检查保存：勾选 → 启用 → 保存 → 重置 dirty

- [ ] **Step 2: Verify app-builder deploy-config acceptance criteria (spec §8.2)**

Open: `https://localhost:5200/apps/platform/development-platform/ide/app-builder/index.html?path=/ingpt/aim/aimservice&boId=any&ws=any&version=2.0#/home`
Click "部署配置" in left nav.

Checklist:
1. [ ] 只剩"代码仓库"和"发布服务器"两段
2. [ ] config=null：发布服务器段显示"尚未配置"提示 + 跳转链接
3. [ ] isComplete=false：展示已有字段 + 红字 missingHint + 跳转链接
4. [ ] isComplete=true：展示所有非密码字段
5. [ ] 任何状态下都不展示密码行
6. [ ] 跳转链接点击：在新标签打开 app-center
7. [ ] 刷新按钮：同时刷新 GIT 信息和发布服务器配置

- [ ] **Step 3: Verify app-builder analysis acceptance criteria (spec §8.3)**

Click "质量保障" → "+ 新建任务".

Checklist:
1. [ ] 4 个 checkbox 初值来自 GET /quality-config
2. [ ] 接口失败时 fallback 到 {true,true,true,false}
3. [ ] 用户未修改：不显示"恢复默认"
4. [ ] 用户修改任一 checkbox："恢复默认"按钮出现
5. [ ] 点击"恢复默认"：4 个 checkbox 还原为接口返回的默认值
6. [ ] 还原后按钮消失

- [ ] **Step 4: Cross-page integration check**

- In app-center deploy-config tab: modify Quality Checks, save. Open app-builder → 质量保障 → 新建任务 — defaults should reflect what was just saved.
- In app-center deploy-config tab: modify Publish Server (e.g. change host), save. Open app-builder → 部署配置 → 刷新 — the new host should appear in the readonly view.

- [ ] **Step 5: Fix any issues found**

Typical fixes:
- Spacing/alignment adjustments in deploy-config.vue scoped styles
- Form label width tuning
- Missing translation text
- Edge cases in dbType switching

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "polish: end-to-end verification fixes for global deploy-config"
```

- [ ] **Step 7: Verify clean working tree**

Run: `git status`
Expected: clean working tree (or only unrelated changes)
