# 全局部署配置（app-center）+ app-builder 联动改造 设计

**日期**: 2026-06-26
**前置设计**: `2026-06-25-deploy-config-design.md`（已完成实施）
**状态**: 设计已与产品对齐，待实施

---

## 1. 背景

`app-builder` 中已实现"部署配置"页面（设计文档 `2026-06-25-deploy-config-design.md`），但内部评审后明确：

- **应用层面配置**（`app-builder` 中的"部署配置"）：只关注当前应用的代码仓库，不应承担"发布服务器"与"质量检查"这类**全局配置**
- **全局层面配置**（新增）：在 `app-center` 顶部 Tab 栏新增"部署配置"，承载发布服务器与质量检查的全局配置
- **作用流转**：
  - 发布服务器配置 → 让 `app-center / 我的应用 / 应用卡片 / 发布` 按钮调用的 `/solo-mte-publish/publish` 接口能动态读取目标运行环境（替代当前写死的实现）
  - 质量检查配置 → 作为 `app-builder / 质量保障 / 新建分析任务 / 分析选项` 的默认值来源

## 2. 目标

### 2.1 app-center 新增"部署配置"Tab

- 位置：`我的应用` 与 `我的环境` 之间
- 内容：两张独立可编辑卡片
  - 发布服务器（12 个字段，分 3 组）
  - 质量检查（4 个 checkbox）

### 2.2 改造 app-builder 既有"部署配置"

- 移除"质量检查"段
- "发布服务器"段改为只读展示
- "刷新"按钮同时刷新 GIT 信息与发布服务器配置

### 2.3 改造 app-builder"质量保障"

- "新建分析任务"的 4 个分析选项默认值改为从 `GET /solo-mte-publish/quality-config` 拉取
- 用户修改后出现"恢复默认"按钮

## 3. 接口契约

所有接口前缀 `/solo-mte-publish`（Nginx 转发标识），文档：`D:\Projects\farris-pc\solo\solo-app-publish\plans\接口文档.md`

| 方法 | 端点 | 用途 |
|---|---|---|
| GET | `/solo-mte-publish/config` | 查询发布服务器配置（不含密码）+ isComplete + missingHint + publicKey |
| POST | `/solo-mte-publish/config` | 保存发布服务器配置（密码字段 RSA 加密，非密码字段合并） |
| GET | `/solo-mte-publish/quality-config` | 查询质量检查配置（4 个布尔） |
| POST | `/solo-mte-publish/quality-config` | 保存质量检查配置（全量覆盖） |

### 3.1 数据结构

```typescript
// GET /config 响应
interface PublishServerConfigResponse {
  ok: boolean;
  config: PublishServerConfig | null;  // 未配置时为 null
  isComplete: boolean;                  // 12 个字段是否全部非空
  missingHint: string;                  // 完整时为 ""，否则为缺失提示
  publicKey: string;                    // RSA-2048 PEM 公钥
}

interface PublishServerConfig {
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
// 注意：config 不包含 sshPassword / dbPassword
```

### 3.2 数据库类型与端口映射

| dbType | 名称 | 默认端口 |
|---|---|---|
| 1 | PostgreSQL | 5432 |
| 2 | SqlServer | 1433 |
| 3 | Oracle | 1521 |
| 4 | DM | 5236 |
| 5 | HighGo | 5866 |
| 6 | MySQL | 3306 |
| 7 | Oscar | 2003 |
| 8 | Kingbase | 54321 |
| 9 | DB2 | 50000 |
| 10 | OpenGauss | 5432 |
| 11 | OceanBase | 2881 |

默认 `dbHost = 'localhost'`，默认 `dbPort` 根据 `dbType` 取上表值。

### 3.3 合并语义要点

- **非密码字段**：传值非空 → 覆盖；传空/未传 → 保留旧值
- **密码字段**：传 RSA 密文 → 解密后覆盖；传空/未传 → 保留旧密码
- **dbHost / dbPort**：文档标注必填，但 UI 允许留空（前端用默认值补齐后提交）
- **RSA 加密**：使用 GET /config 返回的 `publicKey` + `jsencrypt` 加密密码字段，输出 Base64 字符串

## 4. 详细 UX 设计

### 4.1 app-center "部署配置" Tab

#### Tab 顺序

```
开始 → 我的应用 → 部署配置 → 我的环境 → 我的物理设备
```

#### 页面骨架

```vue
<div class="f-page f-admin-deploy-config">
  <div class="deploy-config-cards">
    <PublishServerCard />
    <QualityChecksCard />
  </div>
</div>
```

复用 `app-center/style.css` 中 `.f-admin-app-center .f-page-main` 的 padding/scroll 约束。

#### 4.1.1 发布服务器卡片

**组件**: `el-card` + `el-form` + `el-input` + `el-select`

**字段分组**:

```
SSH 连接
├─ 主机地址 *        [el-input]
├─ SSH 端口 *        [el-input type=number, 默认 22]
├─ SSH 用户名 *      [el-input]
└─ SSH 密码          [el-input type=password, placeholder "不改请留空"]

运行环境
├─ 安装根目录 *      [el-input]
└─ 访问地址 *        [el-input]

数据库
├─ 数据库类型 *      [el-select, 11 个选项]
├─ 数据库服务器      [el-input, placeholder 动态 "<默认值>"]
├─ 数据库端口        [el-input type=number, placeholder 动态 "<默认值>"]
├─ 数据库名 *        [el-input]
├─ 数据库账号 *      [el-input]
└─ 数据库密码        [el-input type=password, placeholder "不改请留空"]
```

**el-select 选项文案**：`<数据库名称>（默认端口 <默认端口>）`，例如 `PostgreSQL（默认端口 5432）`。

**交互**：
- 进入页面调 `GET /config`：
  - `config` 为 null → 全部字段空值，`dbType` 默认 `1`(PostgreSQL)，placeholder 用 PostgreSQL 的默认值
  - `config` 非 null → 用 config 字段填充表单（密码字段始终留空，靠 placeholder 提示）
- 切换 `dbType`：
  - **清空** `dbHost` 与 `dbPort` 输入值
  - **动态更新** 二者 placeholder 为新类型的默认值
- 保存按钮：
  - 仅在任一字段相对 GET 返回的初始值有变更时启用
  - 点击 → 前端用默认值补齐空的 `dbHost`/`dbPort` → 密码字段做 RSA 加密 → POST `/config`
  - 成功：`FNotifyService.success({ message: '已保存' })`，并重新拉取 `GET /config` 重置 dirty 状态
  - 失败：`FNotifyService.error({ message: e.response.data.error })`

**RSA 加密**：复用 `jsencrypt`（已在 app-builder 中使用过），公钥来自 GET /config，每次进入页面都要重新拉公钥（避免公钥过期）。

#### 4.1.2 质量检查卡片

**组件**: `el-card` + 4 个 `el-checkbox`

```
☐ 基础框架特性分析
☐ 依赖注入分析
☐ Web端点配置分析
☐ 持久化框架特性分析
```

无说明文字，独立保存按钮。

**交互**：
- 进入页面调 `GET /quality-config`，用返回值初始化 4 个 checkbox
- 保存按钮：仅在有变更时启用；点击 → POST 全量覆盖 4 个字段 → 成功提示 + 重置 dirty

### 4.2 app-builder "部署配置" 改造

#### 4.2.1 移除"质量检查"段

整段删除（包括 `qualityChecks` ref、`saveQualityChecks`、`renderQualityChecksSection` 等）。

#### 4.2.2 "发布服务器"段改为只读

**展示字段**（10 个非密码字段；密码行**全部隐藏不显示**）：

```
主机地址      {host}
SSH 端口      {sshPort}
SSH 用户名    {sshUsername}
安装根目录    {runtimeRoot}
访问地址      {runtimeUrl}
数据库类型    {dbTypeName}      ← 用 dbType→name 映射显示文本
数据库服务器  {dbHost}
数据库端口    {dbPort}
数据库名      {dbName}
数据库账号    {dbUsername}
```

**三种状态**：

**a. config 为 null（完全未配置）**

```
┌─ 发布服务器 ───────────────────────────────┐
│                                            │
│         尚未配置运行环境信息                │
│         请前往应用中心 → 部署配置 完成配置  │  ← 蓝色可点击链接
│                                            │
└────────────────────────────────────────────┘
```

**b. config 非 null 且 isComplete=false（部分缺失）**

```
┌─ 发布服务器 ───────────────────────────────┐
│  主机地址      139.196.239.110             │
│  SSH 端口      22                          │
│  ...（其它已配置字段）                      │
│                                            │
│  ⚠ {missingHint 文案}                      │  ← 红字
│  请前往应用中心 → 部署配置 完成配置         │  ← 红字 + 蓝色链接
└────────────────────────────────────────────┘
```

**c. config 非 null 且 isComplete=true（完整）**

```
┌─ 发布服务器 ───────────────────────────────┐
│  主机地址      139.196.239.110             │
│  ...（所有字段平铺展示）                    │
└────────────────────────────────────────────┘
```

**链接点击行为**：
```typescript
window.open('/apps/platform/development-platform/ide/app-center/index.html', '_blank');
```

文案统一为：`请前往应用中心 → 部署配置 完成配置`（"前往应用中心 → 部署配置"部分为蓝色可点击链接，"完成配置"为黑色文本）。

#### 4.2.3 刷新按钮

原 `loadRepoState` 仅刷新 GIT 信息。改为新增 `loadAll()`，并行调用：
- `checkIsGitProject(boPath)` + `gitRemoteView(boPath)`（原逻辑）
- `GET /solo-mte-publish/config`（新增）

刷新按钮的点击 handler 改为 `loadAll`。

### 4.3 app-builder "质量保障" 改造

#### 新建分析任务的默认值来源

修改 `analysis-task-card.component.tsx:22-25`：

```typescript
// 改造前
const baseFrameworkEnabled = ref<boolean>(true);
const dependencyInjectionEnabled = ref<boolean>(true);
const webEndpointsEnabled = ref<boolean>(true);
const persistenceFrameworkEnabled = ref<boolean>(false);

// 改造后
const defaultOptions = ref<QualityConfig>({ baseFramework: true, dependencyInjection: true, webEndpoints: true, persistenceFramework: false });
const baseFrameworkEnabled = ref<boolean>(true);
const dependencyInjectionEnabled = ref<boolean>(true);
const webEndpointsEnabled = ref<boolean>(true);
const persistenceFrameworkEnabled = ref<boolean>(false);

onMounted(async () => {
  const cfg = await getQualityConfig();
  if (cfg) {
    defaultOptions.value = { ...cfg };
    baseFrameworkEnabled.value = cfg.baseFramework;
    dependencyInjectionEnabled.value = cfg.dependencyInjection;
    webEndpointsEnabled.value = cfg.webEndpoints;
    persistenceFrameworkEnabled.value = cfg.persistenceFramework;
  }
});
```

#### "恢复默认"按钮

在"分析选项"行右侧（与"Java 版本"对齐位置）增加一个按钮，**仅当 4 个 checkbox 中任一与 `defaultOptions` 不一致时显示**：

```typescript
const isModified = computed(() => 
  baseFrameworkEnabled.value !== defaultOptions.value.baseFramework ||
  dependencyInjectionEnabled.value !== defaultOptions.value.dependencyInjection ||
  webEndpointsEnabled.value !== defaultOptions.value.webEndpoints ||
  persistenceFrameworkEnabled.value !== defaultOptions.value.persistenceFramework
);

function onRestoreDefaults() {
  baseFrameworkEnabled.value = defaultOptions.value.baseFramework;
  dependencyInjectionEnabled.value = defaultOptions.value.dependencyInjection;
  webEndpointsEnabled.value = defaultOptions.value.webEndpoints;
  persistenceFrameworkEnabled.value = defaultOptions.value.persistenceFramework;
}
```

UI:
```
分析选项                              [恢复默认]   ← 仅 isModified 时渲染
☑ 基础框架特性分析
...
```

## 5. 文件清单

### 5.1 新增

| 路径 | 用途 |
|---|---|
| `app-center/src/api/deploy-config.ts` | 4 个 API 调用封装（axios） |
| `app-center/src/components/deploy-config/deploy-config.vue` | Tab 主组件（SFC + `<script setup>`） |
| `app-center/src/components/deploy-config/deploy-config.scss` | scoped 样式 |

### 5.2 修改

| 路径 | 改动点 |
|---|---|
| `app-center/src/app.tsx` | navData 新增 `deploy-config`，ViewKey 联动，渲染分支 |
| `app-builder/src/components/deploy-config/deploy-config.component.tsx` | 删除质量检查段；发布服务器段改只读（3 状态）；刷新按钮加载 publish 配置 |
| `app-builder/src/components/deploy-config/service.ts` | 新增 `getPublishServerConfig()` 调 `/solo-mte-publish/config` |
| `app-builder/src/components/deploy-config/types.ts` | 新增 `PublishServerConfigResponse` / `PublishServerConfig` 类型 |
| `app-builder/src/components/analysis/service.ts` | 新增 `getQualityConfig()` 调 `/solo-mte-publish/quality-config` |
| `app-builder/src/components/analysis/components/analysis-task-card.component.tsx` | onMounted 拉取默认值；新增"恢复默认"按钮 |

### 5.3 不动

- `app-builder/src/components/deploy-config/deploy-config.scss`（保留原有 .deploy-section 样式供"代码仓库"段和"发布服务器"只读段复用）
- `app-center/src/services/git.service.tsx`（与本次改造无关）
- `app-builder/src/components/analysis/analysis.component.tsx`（任务列表页面无变化，只改任务卡片）

## 6. 服务层设计

### 6.1 app-center 新增 API（`api/deploy-config.ts`）

```typescript
import axios from 'axios';

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

export function getPublishServerConfig(): Promise<PublishServerConfigResponse> {
  return axios.get(`${BASE}/config`).then(res => res.data);
}

export function savePublishServerConfig(payload: {
  host: string; sshPort: number; sshUsername: string;
  sshPassword?: string;
  runtimeRoot: string; runtimeUrl: string;
  dbType: number; dbHost: string; dbPort: number;
  dbName: string; dbUsername: string;
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

// 数据库类型映射
export const DATABASE_TYPES = [
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
] as const;

export const DEFAULT_DB_HOST = 'localhost';
```

### 6.2 app-builder 新增/调整服务

**`deploy-config/service.ts` 新增**:
```typescript
export async function getPublishServerConfig(): Promise<PublishServerConfigResponse> {
  const { data } = await axios.get('/solo-mte-publish/config');
  return data;
}
```

**`analysis/service.ts` 新增**:
```typescript
export async function getQualityConfig(): Promise<{ ok: boolean; config: QualityChecksConfig }> {
  const { data } = await axios.get('/solo-mte-publish/quality-config');
  return data;
}
```

## 7. 错误处理

| 场景 | 处理 |
|---|---|
| `GET /config` 4xx/5xx | FNotifyService.error 提示，卡片显示空表单（用户可重新填写） |
| `POST /config` 密码密文无效 (400) | FNotifyService.error 显示 `e.response.data.error` |
| `POST /config` 写入失败 (500) | FNotifyService.error 显示 `e.response.data.error` |
| `GET /quality-config` 失败 | checkbox 用代码默认值 `{true,true,true,false}`，不阻塞页面 |
| `POST /quality-config` 失败 | FNotifyService.error，保留用户输入不重置 |
| RSA 加密失败 | FNotifyService.error("密码加密失败，请刷新页面重试")，阻断 POST |
| `dbHost`/`dbPort` 留空 | 前端补默认值后提交，不提示 |

## 8. 验收标准

### 8.1 app-center "部署配置" Tab

1. Tab 栏出现"部署配置"项，位于"我的应用"右侧、"我的环境"左侧
2. 进入页面时两张卡片正确渲染：发布服务器表单 + 质量检查 checkbox
3. 首次进入（config 为 null）：表单为空，dbType=PostgreSQL，placeholder 显示对应默认端口
4. 切换 dbType：dbHost/dbPort 输入清空，placeholder 同步变化
5. dbHost/dbPort 留空保存：成功，接口收到补齐后的默认值
6. 密码字段留空保存：成功，后端保留旧密码（验证需后端配合）
7. 保存成功后：dirty 状态重置，按钮禁用，成功 toast
8. 质量检查保存：勾选状态变化 → 启用 → 保存 → 重置 dirty

### 8.2 app-builder "部署配置" 改造

1. 部署配置页面只剩"代码仓库"和"发布服务器"两段
2. config 为 null：发布服务器段显示"尚未配置"提示 + 跳转链接
3. isComplete=false：展示已有字段 + 红字 missingHint + 跳转链接
4. isComplete=true：展示所有非密码字段
5. 任何状态下都不展示密码行
6. 跳转链接点击：在新标签打开 app-center
7. 刷新按钮：同时刷新 GIT 信息和发布服务器配置

### 8.3 app-builder "质量保障" 改造

1. 点击"+ 新建任务"打开任务卡片时，4 个 checkbox 初值来自 `GET /quality-config`
2. 接口失败时 fallback 到 `{true,true,true,false}`
3. 用户未修改：不显示"恢复默认"
4. 用户修改任一 checkbox："恢复默认"按钮出现
5. 点击"恢复默认"：4 个 checkbox 还原为接口返回的默认值
6. 还原后按钮消失（isModified=false）

## 9. 风险与未决项

1. **公钥时效**：`publicKey` 来自 GET /config，每次进入页面都重新拉取。如果用户停留在页面很久，公钥可能过期 — 短期内可接受，后续可加"保存失败 → 重新拉公钥 → 重试一次"逻辑。
2. **Element Plus 依赖**：env.vue/device.vue 已使用 Element Plus，组件库已注入，无需新增依赖。
3. **`el-form` 校验**：UI 上不强制校验所有字段（API 允许部分留空），但必填字段（`*`）应在 UI 上明确标识。提交时仅校验 `host`、`sshUsername`、`runtimeRoot`、`runtimeUrl`、`dbName`、`dbUsername` 非空。
4. **boPath 不影响新 Tab**：新 Tab 是全局配置，不依赖任何应用上下文，可在任何时机访问。
5. **app-builder 中的"恢复默认"**：默认值在 `onMounted` 拉取一次后冻结。如果用户在另一个浏览器 Tab 修改了全局配置，本组件不会感知 — 短期可接受。
