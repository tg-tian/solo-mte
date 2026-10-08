# 部署配置（Deploy Config）页面设计

**日期**: 2026-06-25
**位置**: `app-builder` 左侧导航，紧跟"质量保障"之下
**状态**: 设计已确认，待实施

---

## 1. 背景

本项目是一个低代码平台，目前部署了两套环境——开发环境与运行环境，以及一个 GitLab 服务。目标：用户在开发环境进行低代码开发，通过 GitLab 流水线将产物发布到运行环境。

领导指出任务书中的"部署流水线按需配置"功能缺失。本设计在 `app-builder` 中新增"部署配置"页签，让开发者集中配置发布流水线的三段内容：代码仓库、发布服务器、质量检查。

## 2. 目标

将分散的 GIT 功能与新增的发布服务器/质量检查配置整合到一个页面中，作为发布前的统一配置入口。

**包含范围**:
- 新增"部署配置"页签
- 整合现有 GIT 操作（init/clone/remote add/view/delete/pull/commit/push/revert/repo-config）到内联交互
- 新增"发布服务器"配置（mock 数据，前端可编辑不持久化）
- 新增"质量检查"配置（mock 数据，前端可编辑不持久化）

**不包含范围**:
- 真正的发布动作（"发布"按钮仍在 `app-center` 应用卡片上）
- 发布服务器/质量检查的后端接口实现（后续阶段）
- 现有 `app-center` 应用卡片右下角"..."按钮及其 popover/弹框流程（保留不动，作为并行入口）

## 3. 整体架构

### 3.1 页面骨架

复用 `analysis.component.tsx` 的页面骨架样式以保持视觉一致：

```
f-page f-page-card f-page-is-mainsubcard f-app-deploy-config
├── f-admin-main-header (空)
└── f-admin-main-content
    ├── f-page-header
    │   └── f-page-header-base
    │       ├── f-title ("部署配置")
    │       └── f-toolbar ([刷新])
    └── f-page-main
        ├── Section: 代码仓库
        ├── Section: 发布服务器
        └── Section: 质量检查
```

### 3.2 纵向三段卡片布局

三个独立 section 卡片自上而下堆叠，整页可滚动。每段：
- 标题（左）+ 段级动作按钮（右，可选）
- 内容区
- 内联可展开的子表单（按需）

### 3.3 交互模式

- **代码仓库段**: action-driven。每个操作按钮点击后内联展开表单，确认时执行一次 API 调用。**无段级保存按钮**。
- **发布服务器段 / 质量检查段**: form-driven。每个段有独立的"保存"按钮，按钮在"无变更"时禁用。

## 4. 详细 UX 设计

### 4.1 代码仓库段（状态驱动）

页面进入时调用 `GET /api/dev/main/v1.0/git/addr?wsPath=<boPath>`，响应字段为 `{ exit, addr, gitUrl, gitConfig }`。

**状态判定逻辑**（必须与 `app-center/apps.component.tsx:217-249` 的 `handleGitClick` 完全一致）：

```typescript
if (!res)                              → 状态 A（接口失败）
if (res.exit && res.addr === boPath && res.gitUrl && res.gitConfig)
                                        → 状态 C（已配置远程 + 已配置认证）
if (res.exit && res.addr === boPath && res.gitUrl && !res.gitConfig)
                                        → 状态 C + 显示"未配置认证"提示条
if (res.exit && res.addr === boPath && !res.gitUrl)
                                        → 状态 B（已初始化，无远程）
else                                   → 状态 A（未初始化）
```

字段说明：
- `exit` (boolean): 本地 git 仓库是否已初始化（注意是 `exit` 不是 `exist`，沿用后端命名）
- `addr` (string): git 项目绝对路径，应与 boPath 匹配
- `gitUrl` (string): 远程仓库 URL，空表示未配置
- `gitConfig` (boolean): 是否已配置认证信息

#### 状态 A：未初始化 GIT

```
┌─ 代码仓库 ─────────────────────────────────────┐
│                                                │
│        📦 尚未初始化代码仓库                    │
│        初始化后可将应用代码纳入版本管理，       │
│        通过发布流水线自动部署到运行环境。       │
│                                                │
│        [+ 初始化仓库]   [⬇ 导入远程仓库]       │
│                                                │
└────────────────────────────────────────────────┘
```

- **初始化仓库**: 点击后下方内联展开表单
  - URL 输入框（必填，校验 `^(http|https)://`）
  - [取消] [确定]
  - 确定：调 `POST /git/init` 然后 `POST /git/remote`，成功后刷新整段状态
- **导入远程仓库**: 点击后下方内联展开表单
  - URL 输入框（必填）
  - 分支输入框（必填）
  - [取消] [确定]
  - 确定：调 `POST /git/clone`，成功后刷新整段状态

#### 状态 B：已初始化，未配置远程

```
┌─ 代码仓库 ─────────────────────────────────────┐
│  本地仓库已就绪，尚未配置远程仓库。            │
│                                                │
│  [+ 添加远程仓库]                              │
└────────────────────────────────────────────────┘
```

- **添加远程仓库**: 点击后内联展开 URL 输入表单
  - 确定：调 `POST /git/remote`，成功后刷新整段状态

#### 状态 C：已配置远程仓库

```
┌─ 代码仓库 ─────────────────────────────────────┐
│  ⚠ 当前账号未配置认证信息 [立即配置 ▼]         │  ← 仅 gitConfig=false 时显示
│                                                │
│  名称    origin                                │
│  远程    https://gitlab.xxx/xxx.git            │
│  分支    main                                  │
│  认证    [👤 配置认证信息] ▼                    │
│                                                │
│  [⬇ 拉取] [✔ 提交] [⬆ 推送] [↩ 撤销]          │
└────────────────────────────────────────────────┘
```

远程信息字段通过 `GET /api/dev/main/v1.0/git/remote?projectPath=<boPath>` 单独获取（返回数组，取 `[0]`，字段为 `{ name, url, branchName }`）。进入状态 C 时并行调用此接口填充名称/URL/分支。

**认证信息子区**（点击"配置认证信息"展开）：
- 用户名输入框（必填）
- 密码输入框（编辑后才必填，占位 `******`）
- [取消] [保存]
- 保存：调 `POST /git/repoconfig`（密码用 RSA 加密），成功后收起子区并显示成功提示

**操作按钮**：
- **拉取**: 直接调 `POST /git/pull`，按钮显示 loading；成功/失败在按钮下方内联提示条显示
- **提交**: 内联展开 commit message textarea（必填）；确定调 `POST /git/commit`
- **推送**: 直接调 `POST /git/push`，loading + 内联结果提示
- **撤销**: 内联展开警告 + 5 秒倒计时确认按钮；确定调 `POST /git/backout`

**操作前的状态校验**：复用 `app-center/git.service.tsx:337-354` 的 `beforeCheck` 逻辑——若 `gitConfig=false`，拉取/提交/推送/撤销按钮点击后直接显示内联错误提示"当前账号没有权限，请先配置认证信息"，并自动展开认证信息子区。

### 4.2 发布服务器段（可编辑，mock）

```
┌─ 发布服务器 ───────────────────────────────────┐
│  服务器地址 *  [139.196.239.110_____________]  │
│  部署路径 *    [/home/BaseEnvironment/igx2508B] │
│  端口 *        [5220_________________________]  │
│                                                │
│                              [取消] [保存]      │
└────────────────────────────────────────────────┘
```

- 三个文本输入框，初始值为 mock 默认值
- 字段级变更检测：任一字段与初始值不同则"保存"按钮启用
- **保存按钮**: 点击 → loading（500ms 模拟延迟）→ 成功通知"已保存"
- **取消按钮**: 还原所有字段为上次保存的值
- 数据仅保存在组件状态中（mock），刷新页面会重置为默认值
- 后端接口暂未实现，未来对接 `POST /api/.../deploy-config/server` 之类

### 4.3 质量检查段（可编辑，mock）

```
┌─ 质量检查 ─────────────────────────────────────┐
│  ☑ 基础框架特性分析                            │
│  ☑ 依赖注入分析                                │
│  ☑ Web端点配置分析                             │
│  ☐ 持久化框架特性分析                          │
│                                                │
│                                       [保存]   │
└────────────────────────────────────────────────┘
```

- 4 个 checkbox，默认勾选状态与 `analysis-task-card.component.tsx:22-25` 保持一致（前 3 个勾选，持久化不勾选）
- 复用 `checkbox-group` / `checkbox-item` 样式
- 保存按钮逻辑同发布服务器段
- 不显示任何说明文字

### 4.4 顶部"刷新"按钮

重新调用 `checkIsGitProject` 刷新代码仓库段状态（用于外部状态变更后的兜底）。发布服务器与质量检查段为本地 mock 状态，刷新按钮不影响这两段。

## 5. 技术设计

### 5.1 文件结构

```
packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/
├── deploy-config.component.tsx        # 主页面，包含三段渲染逻辑
├── deploy-config.props.ts             # props 类型定义
├── deploy-config.scss                 # 样式（部分复用 analysis.scss 模式）
├── service.ts                         # GIT API 封装（从 app-center 移植）
└── types.ts                           # 共享类型
```

### 5.2 service.ts — GIT API 封装

从 `app-center/src/services/git.service.tsx` 移植以下纯 HTTP 方法（约 12 个）：

| 方法 | 端点 |
|---|---|
| `checkIsGitProject(boPath)` | `GET /api/dev/main/v1.0/git/addr?wsPath=<boPath>` |
| `gitInit(boPath)` | `POST /api/dev/main/v1.0/git/init?projectPath=<boPath>` |
| `gitClone(boPath, gitUrl, branch)` | `POST /api/dev/main/v1.0/git/clone` |
| `gitRemoteAdd(boPath, gitUrl)` | `POST /api/dev/main/v1.0/git/remote?projectPath=<boPath>` |
| `gitRemoteView(boPath)` | `GET /api/dev/main/v1.0/git/remote?projectPath=<boPath>` |
| `gitRemoteDelete(boPath, name)` | `DELETE /api/dev/main/v1.0/git/remote/<name>?...` |
| `gitPull(boPath)` | `POST /api/dev/main/v1.0/git/pull?projectPath=<boPath>` |
| `gitCommit(boPath, message)` | `POST /api/dev/main/v1.0/git/commit?projectPath=<boPath>` |
| `gitPush(boPath)` | `POST /api/dev/main/v1.0/git/push?projectPath=<boPath>` |
| `gitRevert(boPath)` | `POST /api/dev/main/v1.0/git/backout?projectPath=<boPath>` |
| `getGitRepoConfig()` | `GET /api/dev/main/v1.0/git/repoconfig` |
| `updateGitRepoConfig(name, password)` | `POST /api/dev/main/v1.0/git/repoconfig` |

**与 app-center 版本的关键差异**：
- **不依赖 `modalService` / `notifyService`** — 内联交互不需要 modal；通知改为返回 `{ success: boolean, message: string, data?: any }` 让组件决定如何展示
- **不包含弹框触发逻辑**（`showGitUrlDialog` 等不移植）
- **保留 `rsaEncrypt` 与 `PUBLIC_KEY`** — 密码加密逻辑必须一致

### 5.3 组件内部状态

```typescript
// boPath 来源（已确认）
const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
const { options: workspaceOptions } = useWorkspaceComposition;
const boPath = workspaceOptions.path;  // 例如 "/ingpt/aim/aimservice"

// 代码仓库段
const repoState = ref<'loading' | 'noGit' | 'noRemote' | 'ready'>('loading');
const remoteInfo = ref<{ name, url, branch } | null>(null);
const repoError = ref<string>('');
const gitConfigured = ref<boolean>(false);  // res.gitConfig
const activeOperation = ref<null | 'init' | 'import' | 'addRemote' | 'commit' | 'revert' | 'auth'>(null);
const operationStatus = ref<{ type: 'pull' | 'push' | null, loading: boolean, success: boolean | null, message: string }>({ type: null, loading: false, success: null, message: '' });

// 发布服务器段
const publishServerInitial = { address: '139.196.239.110', path: '/home/BaseEnvironment/igx2508B', port: '5220' };
const publishServer = ref({ ...publishServerInitial });
const publishServerSaved = ref({ ...publishServerInitial });  // 上次"保存"的快照，用于取消和脏检查
const publishServerSaving = ref(false);

// 质量检查段
const qualityChecksInitial = { baseFramework: true, dependencyInjection: true, webEndpoints: true, persistenceFramework: false };
const qualityChecks = ref({ ...qualityChecksInitial });
const qualityChecksSaved = ref({ ...qualityChecksInitial });
const qualityChecksSaving = ref(false);
```

### 5.4 菜单与组件注册

**修改 3 个文件**:

1. `packages/ide/public/.../app-builder/assets/app-builder-functions.json` — 在 `analysis` 后追加：
   ```json
   {
       "id": "deploy-config",
       "code": "DeployConfig",
       "name": "部署配置",
       "parentId": "0",
       "layer": "1",
       "menuType": "",
       "funcType": "1",
       "menuPath": "",
       "icon": "./assets/icon/SystemFoundation.svg",
       "description": null,
       "pinyin": null,
       "simpinyin": null,
       "child": null
   }
   ```

2. `packages/ide/public/.../app-builder/assets/app-builder-work-areas.json` — 在 `analysis` 后追加：
   ```json
   {
       "id": "deploy-config",
       "code": "deploy-config",
       "name": "部署配置"
   }
   ```

3. `app-builder/src/components/component-registry.ts` — 增加 `'deploy-config': FAppDeployConfig`

### 5.5 操作反馈：内联提示条

操作（拉取/推送/提交/撤销）执行后，在按钮下方显示内联提示条：

```
[⬇ 拉取] [✔ 提交] [⬆ 推送] [↩ 撤销]
┌──────────────────────────────────────────┐
│ ✓ 代码拉取成功                           │  ← 绿色
└──────────────────────────────────────────┘
```

或失败时为红色 + 错误信息。提示条 5 秒后自动消失，或被下一次操作覆盖。

## 6. 待修改/新增文件清单

### 新增

1. `app-builder/src/components/deploy-config/deploy-config.component.tsx`
2. `app-builder/src/components/deploy-config/deploy-config.props.ts`
3. `app-builder/src/components/deploy-config/deploy-config.scss`
4. `app-builder/src/components/deploy-config/service.ts`
5. `app-builder/src/components/deploy-config/types.ts`

### 修改

1. `app-builder/src/components/component-registry.ts` — 注册新组件
2. `packages/ide/public/.../app-builder/assets/app-builder-functions.json` — 新增菜单项
3. `packages/ide/public/.../app-builder/assets/app-builder-work-areas.json` — 新增工作区映射

### 不动

- `app-center/src/services/git.service.tsx` 及所有相关 dialog 组件 — 保持不变，作为并行入口
- `app-center` 应用卡片的"..."按钮 — 保持不变

## 7. 风险与未决项

1. **boPath 来源**: 已确认。`app-center` 点击应用卡片时通过 URL 参数传递：`?path=<boPath>&boId=<id>&ws=<ws>`（见 `apps.component.tsx:374-375`）。`app-builder` 中已有 `useWorkspace` composition 解析这些参数（`use-workspace.ts:21-25`），并通过 `provide('f-admin-workspace', useWorkspaceComposition)`（`workspace.component.tsx:164`）注入。新组件用法：`const { options } = inject('f-admin-workspace') as UseWorkspace; const boPath = options.path;`。与 `profile.component.tsx:39-41`、`menu.component.tsx:14-15` 等现有用法一致。

2. **mock 数据持久化**: 当前设计是组件状态保存，刷新即丢失。如果演示时需要"看起来保存了"，可以考虑用 `localStorage` 兜底，但非必需。

3. **`rsaEncrypt` 一致性**: 必须与 `app-center` 版本使用相同的 `PUBLIC_KEY`，否则认证信息无法在后端解密。已确认移植时保持一致（PUBLIC_KEY 在 `app-center/src/services/git.service.tsx:5`）。

4. **git API 错误格式**: 后端错误信息可能在 `e.response.data.Message`（大写 M）或 `e.response.data.message`。移植时严格匹配 `app-center/git.service.tsx` 现有模式（多数用大写 M）。

5. **状态判定字段**: `res.exit` 字段名沿用后端命名（疑似拼写错误但已是契约），不要改成 `exist`。

## 8. 验收标准

1. 左侧导航"质量保障"之下出现"部署配置"项，点击进入页面
2. 页面三段卡片正确渲染：代码仓库状态驱动、发布服务器可编辑、质量检查可编辑
3. 代码仓库段：在 mock 应用上完成"添加远程仓库→认证→提交→推送→拉取→撤销"全流程无报错
4. 发布服务器段：修改字段后保存按钮启用，点击保存显示 loading + 成功通知
5. 质量检查段：勾选状态变化后保存按钮启用，点击保存显示 loading + 成功通知
6. 顶部刷新按钮可重新加载代码仓库段状态
7. 视觉风格与 `analysis` 页一致（页面骨架、表单、按钮样式）
8. `app-center` 应用卡片"..."按钮流程未被影响，原有 GIT 功能正常
