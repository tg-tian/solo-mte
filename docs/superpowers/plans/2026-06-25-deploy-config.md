# Deploy Config Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "部署配置" tab to `app-builder` left nav, integrating GIT operations (inline expand pattern), publish server config (mock editable), and quality check options (mock editable) into one vertical-section page.

**Architecture:** Vue 3 + JSX component following `analysis.component.tsx` patterns. State-driven 代码仓库 section consumes a ported GIT API service (no UI dependencies). Two mock sections use local refs with section-level Save buttons. Menu data is static JSON, edited directly.

**Tech Stack:** Vue 3 Composition API, @farris/ui-vue, axios, jsencrypt, TypeScript, SCSS.

## Global Constraints

- **Runtime**: Vue 3 + JSX (`defineComponent` + `setup()` return render function)
- **boPath source**: `inject('f-admin-workspace') as UseWorkspace` → `options.path` (NOT URL parsing — workspace composition already does that)
- **Notify service**: `inject(F_NOTIFY_SERVICE_TOKEN) as typeof FNotifyService` (matches `pages.component.tsx:21`)
- **RSA PUBLIC_KEY**: Copy verbatim from `app-center/src/services/git.service.tsx:5`
- **API state field**: Use `res.exit` (NOT `res.exist`) — backend naming quirk, contract is fixed
- **API error format**: `e?.response?.data?.Message` (capital M, matches app-center pattern)
- **Don't modify `app-center/`**: Existing popover/dialog flow stays untouched
- **JSX v-model quirk**: Never use `v-model={ref}` — always use explicit `modelValue={ref.value} onUpdate:modelValue={(v) => ref.value = v}` (Vue 3 JSX compiles `v-model={ref}` incorrectly)
- **CSS isolation**: All custom styles scoped under `.f-app-deploy-config` to avoid collision with analysis page

## File Structure

```
packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/
├── service.ts                          # Pure HTTP wrappers (no UI deps)
├── types.ts                            # Shared TS types
├── deploy-config.props.ts              # Component props
├── deploy-config.component.tsx         # Main page
└── deploy-config.scss                  # Styles
```

Files modified:
- `app-builder/src/components/component-registry.ts` — register new component
- `packages/ide/public/.../app-builder/assets/app-builder-functions.json` — add menu entry
- `packages/ide/public/.../app-builder/assets/app-builder-work-areas.json` — add work area

---

### Task 1: Service Layer — GIT API Wrappers

**Files:**
- Create: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/service.ts`

**Interfaces:**
- Produces: `checkIsGitProject(boPath) → Promise<GitCheckResult>`, `gitInit(boPath) → Promise<any>`, `gitClone(boPath, url, branch) → Promise<any>`, `gitRemoteAdd(boPath, url) → Promise<any>`, `gitRemoteView(boPath) → Promise<RemoteInfo[]>`, `gitRemoteDelete(boPath, name) → Promise<any>`, `gitPull(boPath) → Promise<any>`, `gitCommit(boPath, message) → Promise<any>`, `gitPush(boPath) → Promise<any>`, `gitRevert(boPath) → Promise<any>`, `getGitRepoConfig() → Promise<{name, password}>`, `updateGitRepoConfig(name, password) → Promise<any>`, `rsaEncrypt(s) → string`

- [ ] **Step 1: Create the service file with all HTTP methods**

Create `service.ts`:

```typescript
import axios from 'axios';
import JSEncrypt from 'jsencrypt';

const PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8Uvi7YbPGxof2p7NGneZGfwGhMOhWrj/Jk6bjDS87jCQ0uEQ7PquzVbgWLMV0eyFzAOBiHMT+Gy9q5x7aPpskm7CnMwPgjlXt1xVENOM/fXtAl908dG+UadbzZvUWV68KBF14Q8JOZ3kyUo9jzsn0Ro0tzORDVH6WnasdVcPBHQIDAQAB';

export interface GitCheckResult {
    exit?: boolean;
    addr?: string;
    gitUrl?: string;
    gitConfig?: boolean;
}

export interface RemoteInfo {
    name: string;
    url: string;
    branchName: string;
}

export function checkIsGitProject(boPath: string): Promise<GitCheckResult> {
    return axios.get('/api/dev/main/v1.0/git/addr?wsPath=' + encodeURIComponent(boPath)).then(res => res.data);
}

export function gitInit(boPath: string): Promise<any> {
    return axios.post('/api/dev/main/v1.0/git/init?projectPath=' + encodeURIComponent(boPath), {}).then(res => res.data);
}

export function gitClone(boPath: string, gitUrl: string, branch: string): Promise<any> {
    const sendData = { branchToFetch: branch, remoteUrl: gitUrl, workDir: boPath };
    return axios.post('/api/dev/main/v1.0/git/clone', sendData).then(res => res.data);
}

export function gitRemoteAdd(boPath: string, gitUrl: string): Promise<any> {
    const sendData = { password: null, url: gitUrl, name: 'origin', username: null };
    return axios.post('/api/dev/main/v1.0/git/remote?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitRemoteView(boPath: string): Promise<RemoteInfo[]> {
    return axios.get('/api/dev/main/v1.0/git/remote?projectPath=' + encodeURIComponent(boPath)).then(res => res.data);
}

export function gitRemoteDelete(boPath: string, name: string): Promise<any> {
    return axios.delete('/api/dev/main/v1.0/git/remote/' + encodeURIComponent(name) + '?projectPath=' + encodeURIComponent(boPath) + '&name=' + encodeURIComponent(name)).then(res => res.data);
}

export function gitPull(boPath: string): Promise<any> {
    const sendData = { password: null, remote: 'origin', rebase: false, username: null };
    return axios.post('/api/dev/main/v1.0/git/pull?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitCommit(boPath: string, message: string): Promise<any> {
    const sendData = { message, all: true };
    return axios.post('/api/dev/main/v1.0/git/commit?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitPush(boPath: string): Promise<any> {
    const sendData = { password: null, remote: 'origin', branchname: '', username: null };
    return axios.post('/api/dev/main/v1.0/git/push?projectPath=' + encodeURIComponent(boPath), sendData).then(res => res.data);
}

export function gitRevert(boPath: string): Promise<any> {
    return axios.post('/api/dev/main/v1.0/git/backout?projectPath=' + encodeURIComponent(boPath), {}).then(res => res.data);
}

export function getGitRepoConfig(): Promise<{ name: string; password: string }> {
    return axios.get('/api/dev/main/v1.0/git/repoconfig').then(res => res.data);
}

export function updateGitRepoConfig(name: string, password: string): Promise<any> {
    const sendData = { name, password: password ? rsaEncrypt(password) : '' };
    return axios.post('/api/dev/main/v1.0/git/repoconfig', sendData).then(res => res.data);
}

export function rsaEncrypt(info: string): string {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(PUBLIC_KEY);
    const encrypted = (encrypt as any).encryptLong ? (encrypt as any).encryptLong(info) : encrypt.encrypt(info);
    return encrypted as string;
}

export function extractErrorMessage(e: any, fallback: string): string {
    return e?.response?.data?.Message || e?.response?.data?.message || fallback;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd packages/ide && npx vue-tsc --noEmit 2>&1 | head -20`
Expected: No errors specific to `service.ts`. (Pre-existing errors elsewhere are OK.)

- [ ] **Step 3: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/service.ts
git commit -m "feat(deploy-config): add GIT API service layer"
```

---

### Task 2: Types and Props

**Files:**
- Create: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/types.ts`
- Create: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.props.ts`

**Interfaces:**
- Produces: `RepoState` type, `PublishServerConfig`, `QualityChecksConfig`, `DeployConfigProps`

- [ ] **Step 1: Create types.ts**

```typescript
export type RepoState = 'loading' | 'noGit' | 'noRemote' | 'ready';

export type ActiveOperation = null | 'init' | 'import' | 'addRemote' | 'commit' | 'revert' | 'auth';

export interface PublishServerConfig {
    address: string;
    path: string;
    port: string;
}

export interface QualityChecksConfig {
    baseFramework: boolean;
    dependencyInjection: boolean;
    webEndpoints: boolean;
    persistenceFramework: boolean;
}

export interface OperationStatus {
    type: 'pull' | 'push' | null;
    loading: boolean;
    success: boolean | null;
    message: string;
}
```

- [ ] **Step 2: Create deploy-config.props.ts**

```typescript
import { ExtractPropTypes } from 'vue';

export const deployConfigProps = {
    /** Reserved for future use; component currently takes no props. */
};

export type DeployConfigProps = ExtractPropTypes<typeof deployConfigProps>;
```

- [ ] **Step 3: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/types.ts \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.props.ts
git commit -m "feat(deploy-config): add types and props"
```

---

### Task 3: Component Skeleton + Menu Registration

**Goal:** Get the page mounting in the app with a placeholder, accessible from the left nav. Verify the integration works before filling in section content.

**Files:**
- Create: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/component-registry.ts`
- Modify: `packages/ide/public/apps/platform/development-platform/ide/app-builder/assets/app-builder-functions.json`
- Modify: `packages/ide/public/apps/platform/development-platform/ide/app-builder/assets/app-builder-work-areas.json`

- [ ] **Step 1: Create the skeleton component**

Create `deploy-config.component.tsx`:

```tsx
import { defineComponent, inject, onMounted, ref } from 'vue';
import { FButton, F_NOTIFY_SERVICE_TOKEN, FNotifyService } from '@farris/ui-vue';
import { DeployConfigProps, deployConfigProps } from './deploy-config.props';
import { UseWorkspace } from '../../composition/types';

export default defineComponent({
    name: 'FAppDeployConfig',
    props: deployConfigProps,
    setup(props: DeployConfigProps) {
        const notifyService = inject(F_NOTIFY_SERVICE_TOKEN) as typeof FNotifyService;
        const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
        const { options: workspaceOptions } = useWorkspaceComposition;
        const boPath = workspaceOptions.path;

        const title = '部署配置';

        return () => (
            <div class="f-page f-page-card f-page-is-mainsubcard f-app-deploy-config">
                <div class="f-admin-main-header"></div>
                <div class="f-admin-main-content">
                    <div class="f-page-header">
                        <nav class="f-page-header-base">
                            <div class="f-title">
                                <div class="f-title-logo"></div>
                                <h4 class="f-title-text">{title}</h4>
                            </div>
                            <div class="f-toolbar">
                                <FButton type="secondary" size="small">刷新</FButton>
                            </div>
                        </nav>
                        <div class="f-page-header-background"></div>
                    </div>
                    <div class="f-page-main">
                        <div style="padding: 40px; text-align: center; color: #999;">
                            boPath = {boPath || '(空)'} — 部署配置内容待实现
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});
```

- [ ] **Step 2: Register in component-registry.ts**

Replace `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/component-registry.ts` contents:

```typescript
import FAppAnalysis from './analysis/analysis.component';
import FAppMenu from './menu/menu.component';
import FAppVariables from './variables/variables.component';
import FAppProfile from './profile/profile.component';
import FAppDevices from './devices/devices.component';
import FAppPages from './pages/pages.component';
import FAppPageFlows from './page-flow/page-flow.component';
import FAppLogicFlows from './logic-flow/logic-flow.component';
import FAppDeployConfig from './deploy-config/deploy-config.component';

const componentRegistryMap = new Map<string, any>(
    [['menu', FAppMenu], ['variables', FAppVariables], ['profile', FAppProfile], ['analysis', FAppAnalysis], ['devices', FAppDevices], ['pages', FAppPages], ['page-flow', FAppPageFlows], ['logic-flow', FAppLogicFlows], ['deploy-config', FAppDeployConfig]]
);

export default componentRegistryMap;
```

- [ ] **Step 3: Add menu entry in app-builder-functions.json**

In `packages/ide/public/apps/platform/development-platform/ide/app-builder/assets/app-builder-functions.json`, append after the `analysis` entry (before the closing `]`):

```json
    ,
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

- [ ] **Step 4: Add work area in app-builder-work-areas.json**

In `packages/ide/public/apps/platform/development-platform/ide/app-builder/assets/app-builder-work-areas.json`, append after the `analysis` entry:

```json
    ,
    {
        "id": "deploy-config",
        "code": "deploy-config",
        "name": "部署配置"
    }
```

- [ ] **Step 5: Run dev server and verify**

Run: `cd packages/ide && npm run dev`
Open: `https://localhost:5200/apps/platform/development-platform/ide/app-builder/index.html?path=/ingpt/aim/aimservice&boId=<any>&ws=<any>&version=2.0#/home`

Verify in browser:
- Left nav shows "部署配置" below "质量保障"
- Clicking it opens the page with title "部署配置"
- Placeholder text shows the boPath from URL

- [ ] **Step 6: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/component-registry.ts \
        packages/ide/public/apps/platform/development-platform/ide/app-builder/assets/app-builder-functions.json \
        packages/ide/public/apps/platform/development-platform/ide/app-builder/assets/app-builder-work-areas.json
git commit -m "feat(deploy-config): add page skeleton and menu registration"
```

---

### Task 4: SCSS Foundation + Section Card Layout

**Goal:** Establish the styles for the three-section card layout before adding interactive content. Avoids inline-style sprawl in later tasks.

**Files:**
- Create: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.scss`
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

**Interfaces:**
- Produces: CSS classes `.f-app-deploy-config`, `.deploy-section`, `.deploy-section-header`, `.deploy-section-body`, `.deploy-info-row`, `.deploy-info-label`, `.deploy-info-value`, `.deploy-empty`, `.deploy-form-row`, `.deploy-inline-result`, `.deploy-inline-result-success`, `.deploy-inline-result-error`

- [ ] **Step 1: Create deploy-config.scss**

```scss
.f-app-deploy-config {
    .f-page-header {
        position: relative;
        height: 48px;
        margin-bottom: 1rem !important;

        .f-page-header-base {
            position: absolute;
            z-index: 1;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;

            .f-toolbar {
                display: flex;
                align-items: center;
                gap: 12px;

                .btn {
                    box-shadow: 0 4px 10px 0 rgba(69, 144, 255, 0.25);
                    border-radius: 15px;
                }

                .btn-secondary {
                    background: #FFFFFF;
                    border: 1px solid rgba(233, 236, 243, 1);
                    box-shadow: 0px 2px 6px 0px rgba(31, 35, 41, 0.06);
                    border-radius: 6px;
                    color: #2D2F33;

                    &:hover {
                        border-color: #388FFF;
                    }
                }
            }
        }

        .f-page-header-background {
            background-image: linear-gradient(180deg, rgba(221, 236, 255, 0.9) 0%, rgba(249, 252, 255, 0.9) 63%);
            border-radius: 8px;
            box-shadow: 0 1px 10px 0 rgba(90, 102, 133, 0.05);
            height: 100%;
            opacity: 0.66;
            position: absolute;
            width: 100%;
            z-index: 0;
        }
    }

    .f-page-main {
        height: 100%;
        overflow: auto;
        padding: 0 0 32px 0;
    }
}

.deploy-section {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    margin-bottom: 16px;
    padding: 20px 24px;
}

.deploy-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e8ebf1;

    .deploy-section-title {
        font-size: 15px;
        font-weight: 500;
        color: #303e55;
        margin: 0;
    }

    .deploy-section-actions {
        display: flex;
        gap: 8px;

        .btn {
            border-radius: 6px;
            font-size: 13px;
        }

        .btn-primary {
            background-image: linear-gradient(-51deg, #328bff 0%, #2a87ff 100%);
            border: none;
            color: #fff;
        }

        .btn-secondary {
            background: #fff;
            border: 1px solid #e9ecf3;
            color: #2D2F33;

            &:hover {
                border-color: #388FFF;
            }
        }
    }
}

.deploy-section-body {
    font-size: 13px;
    color: #303e55;
}

.deploy-info-row {
    display: flex;
    align-items: center;
    padding: 6px 0;
}

.deploy-info-label {
    width: 100px;
    flex-shrink: 0;
    color: #7a8dae;
    font-size: 13px;
}

.deploy-info-value {
    flex: 1;
    color: #303e55;
    word-break: break-all;
}

.deploy-empty {
    text-align: center;
    padding: 32px 16px;

    .deploy-empty-icon {
        font-size: 40px;
        color: #c0c4cc;
        margin-bottom: 8px;
    }

    .deploy-empty-text {
        color: #606266;
        font-size: 14px;
        margin-bottom: 16px;
    }

    .deploy-empty-hint {
        color: #909399;
        font-size: 12px;
        margin-bottom: 20px;
    }
}

.deploy-form-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;

    .deploy-form-label {
        width: 100px;
        flex-shrink: 0;
        text-align: right;
        padding-right: 12px;
        color: #303e55;
        font-size: 13px;

        .required {
            color: #f56c6c;
            margin-right: 4px;
        }
    }

    .deploy-form-control {
        flex: 1;

        input, textarea {
            width: 100%;
            padding: 6px 12px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            font-size: 13px;
            color: #303e55;
            outline: none;
            transition: border-color 0.2s;
            font-family: inherit;

            &:focus {
                border-color: #2a87ff;
            }

            &:disabled {
                background: #f5f7fa;
                color: #909399;
            }
        }

        textarea {
            min-height: 80px;
            resize: vertical;
            font-family: inherit;
        }
    }
}

.deploy-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #e8ebf1;
}

.deploy-inline-result {
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.deploy-inline-result-success {
    background: #f0f9eb;
    color: #67c23a;
    border: 1px solid #c2e7b0;
}

.deploy-inline-result-error {
    background: #fef0f0;
    color: #f56c6c;
    border: 1px solid #fbc4c4;
}

.deploy-auth-warning {
    background: #fff6e6;
    border: 1px solid #ffb84d;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 13px;
    color: #b88100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .deploy-auth-warning-action {
        color: #2a87ff;
        cursor: pointer;
        font-weight: 500;

        &:hover {
            text-decoration: underline;
        }
    }
}

.deploy-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .deploy-checkbox-item {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 13px;
        color: #303e55;

        input[type="checkbox"] {
            margin-right: 8px;
            cursor: pointer;
        }
    }
}
```

- [ ] **Step 2: Wire scss into the component**

In Vite, scss imports in `.tsx` don't auto-load. Check `vite.config.dev.ts` for the existing pattern. If analysis.scss is loaded via a global import, just import the new scss at the top of the entry file (likely `main.ts` or `app.vue`).

Find the global scss import location:
```bash
grep -r "analysis.scss" packages/ide/apps/platform/development-platform/ide/app-builder/src/
```

Add an analogous import for `deploy-config.scss` next to wherever `analysis.scss` is imported.

If no global import exists, add this to the top of `deploy-config.component.tsx`:
```typescript
import './deploy-config.scss';
```

- [ ] **Step 3: Verify dev server still loads the page without errors**

Run: `cd packages/ide && npm run dev`
Open the page. Confirm: page loads, no console errors about missing CSS.

- [ ] **Step 4: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.scss \
        packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
# plus any file where you added the global scss import
git commit -m "feat(deploy-config): add SCSS foundation for section card layout"
```

---

### Task 5: 代码仓库 Section — State Machine & Rendering

**Goal:** On page mount, call `checkIsGitProject` and render the correct empty state (noGit / noRemote / ready). No interactions yet — just visual states.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

**Interfaces:**
- Consumes: `checkIsGitProject`, `gitRemoteView` from `./service`
- Consumes: `RepoState`, `OperationStatus` from `./types`

- [ ] **Step 1: Add state and load logic to setup()**

Replace the entire `deploy-config.component.tsx` with:

```tsx
import { defineComponent, inject, onMounted, ref } from 'vue';
import { FButton, F_NOTIFY_SERVICE_TOKEN, FNotifyService } from '@farris/ui-vue';
import { DeployConfigProps, deployConfigProps } from './deploy-config.props';
import { UseWorkspace } from '../../composition/types';
import { checkIsGitProject, gitRemoteView, extractErrorMessage, RemoteInfo } from './service';
import { RepoState, OperationStatus, ActiveOperation } from './types';
import './deploy-config.scss';

export default defineComponent({
    name: 'FAppDeployConfig',
    props: deployConfigProps,
    setup(props: DeployConfigProps) {
        const notifyService = inject(F_NOTIFY_SERVICE_TOKEN) as typeof FNotifyService;
        const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
        const { options: workspaceOptions } = useWorkspaceComposition;
        const boPath = workspaceOptions.path;

        const title = '部署配置';

        // === 代码仓库段 ===
        const repoState = ref<RepoState>('loading');
        const remoteInfo = ref<RemoteInfo | null>(null);
        const gitConfigured = ref<boolean>(false);
        const repoLoading = ref<boolean>(false);
        const activeOperation = ref<ActiveOperation>(null);
        const operationStatus = ref<OperationStatus>({ type: null, loading: false, success: null, message: '' });

        async function loadRepoState() {
            if (!boPath) {
                repoState.value = 'noGit';
                return;
            }
            repoLoading.value = true;
            try {
                const res = await checkIsGitProject(boPath);
                if (res && res.exit && res.addr === boPath && res.gitUrl) {
                    repoState.value = 'ready';
                    gitConfigured.value = !!res.gitConfig;
                    // Parallel fetch remote details
                    gitRemoteView(boPath).then(list => {
                        if (list && list.length) {
                            remoteInfo.value = list[0];
                        }
                    }).catch(() => {});
                } else if (res && res.exit && res.addr === boPath && !res.gitUrl) {
                    repoState.value = 'noRemote';
                } else {
                    repoState.value = 'noGit';
                }
            } catch (e) {
                repoState.value = 'noGit';
            } finally {
                repoLoading.value = false;
            }
        }

        onMounted(() => {
            loadRepoState();
        });

        function renderRepoEmpty() {
            return (
                <div class="deploy-empty">
                    <div class="deploy-empty-icon">
                        <span class="f-icon f-icon-file"></span>
                    </div>
                    <div class="deploy-empty-text">尚未初始化代码仓库</div>
                    <div class="deploy-empty-hint">初始化后可将应用代码纳入版本管理，通过发布流水线自动部署到运行环境。</div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <FButton type="primary" onClick={() => activeOperation.value = 'init'}>初始化仓库</FButton>
                        <FButton type="secondary" onClick={() => activeOperation.value = 'import'}>导入远程仓库</FButton>
                    </div>
                </div>
            );
        }

        function renderRepoNoRemote() {
            return (
                <div class="deploy-empty">
                    <div class="deploy-empty-text">本地仓库已就绪，尚未配置远程仓库</div>
                    <FButton type="primary" onClick={() => activeOperation.value = 'addRemote'}>添加远程仓库</FButton>
                </div>
            );
        }

        function renderRepoReady() {
            return (
                <div>
                    {!gitConfigured.value && (
                        <div class="deploy-auth-warning">
                            <span>⚠ 当前账号未配置认证信息</span>
                            <span class="deploy-auth-warning-action" onClick={() => activeOperation.value = 'auth'}>立即配置</span>
                        </div>
                    )}
                    <div class="deploy-info-row">
                        <div class="deploy-info-label">名称</div>
                        <div class="deploy-info-value">{remoteInfo.value?.name || 'origin'}</div>
                    </div>
                    <div class="deploy-info-row">
                        <div class="deploy-info-label">远程</div>
                        <div class="deploy-info-value">{remoteInfo.value?.url || '-'}</div>
                    </div>
                    <div class="deploy-info-row">
                        <div class="deploy-info-label">分支</div>
                        <div class="deploy-info-value">{remoteInfo.value?.branchName || '-'}</div>
                    </div>
                    <div class="deploy-info-row">
                        <div class="deploy-info-label">认证</div>
                        <div class="deploy-info-value">
                            <span style="color: #2a87ff; cursor: pointer;" onClick={() => activeOperation.value = 'auth'}>
                                {gitConfigured.value ? '修改认证信息' : '配置认证信息'} ▼
                            </span>
                        </div>
                    </div>
                </div>
            );
        }

        function renderRepoSection() {
            return (
                <div class="deploy-section">
                    <div class="deploy-section-header">
                        <h5 class="deploy-section-title">代码仓库</h5>
                    </div>
                    <div class="deploy-section-body">
                        {repoLoading.value && <div style="text-align: center; padding: 24px; color: #999;">加载中...</div>}
                        {!repoLoading.value && repoState.value === 'noGit' && renderRepoEmpty()}
                        {!repoLoading.value && repoState.value === 'noRemote' && renderRepoNoRemote()}
                        {!repoLoading.value && repoState.value === 'ready' && renderRepoReady()}
                    </div>
                </div>
            );
        }

        return () => (
            <div class="f-page f-page-card f-page-is-mainsubcard f-app-deploy-config">
                <div class="f-admin-main-header"></div>
                <div class="f-admin-main-content">
                    <div class="f-page-header">
                        <nav class="f-page-header-base">
                            <div class="f-title">
                                <div class="f-title-logo"></div>
                                <h4 class="f-title-text">{title}</h4>
                            </div>
                            <div class="f-toolbar">
                                <FButton type="secondary" size="small" onClick={loadRepoState}>刷新</FButton>
                            </div>
                        </nav>
                        <div class="f-page-header-background"></div>
                    </div>
                    <div class="f-page-main">
                        {renderRepoSection()}
                    </div>
                </div>
            </div>
        );
    }
});
```

- [ ] **Step 2: Run dev and verify state rendering**

Run: `cd packages/ide && npm run dev`
Open the page. Verify:
- Page loads without console errors
- "代码仓库" section appears with loading state → then transitions to one of the three states based on the boPath's actual git status
- The 刷新 button re-triggers loading

- [ ] **Step 3: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
git commit -m "feat(deploy-config): render 代码仓库 state-driven section"
```

---

### Task 6: 代码仓库 Section — Inline Forms (init/import/addRemote)

**Goal:** Make the three "configure" buttons functional. Clicking opens an inline form below; submitting calls the API and refreshes state.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

**Interfaces:**
- Consumes: `gitInit`, `gitClone`, `gitRemoteAdd` from `./service`

- [ ] **Step 1: Add form refs and submit handlers**

In the `setup()` function, after `operationStatus` ref, add:

```typescript
// === Inline form state ===
const initUrl = ref('');
const importUrl = ref('');
const importBranch = ref('');
const addRemoteUrl = ref('');
const formSubmitting = ref(false);

function resetForms() {
    initUrl.value = '';
    importUrl.value = '';
    importBranch.value = '';
    addRemoteUrl.value = '';
}

function cancelOperation() {
    activeOperation.value = null;
    resetForms();
}

function isValidUrl(url: string): boolean {
    return /^(http|https):\/\//.test(url.trim());
}

async function submitInit() {
    if (!isValidUrl(initUrl.value)) {
        notifyService.warning({ message: '请填写正确的远程仓库地址' });
        return;
    }
    formSubmitting.value = true;
    try {
        const initRes = await gitInit(boPath);
        if (initRes && initRes.code === 200) {
            await gitRemoteAdd(boPath, initUrl.value.trim());
            notifyService.success({ message: '初始化仓库成功' });
            cancelOperation();
            await loadRepoState();
        } else {
            notifyService.error({ message: initRes?.message || '初始化仓库失败' });
        }
    } catch (e) {
        notifyService.error({ message: extractErrorMessage(e, '初始化仓库失败') });
    } finally {
        formSubmitting.value = false;
    }
}

async function submitImport() {
    if (!isValidUrl(importUrl.value)) {
        notifyService.warning({ message: '请填写正确的远程仓库地址' });
        return;
    }
    if (!importBranch.value.trim()) {
        notifyService.warning({ message: '请填写分支' });
        return;
    }
    formSubmitting.value = true;
    try {
        const res = await gitClone(boPath, importUrl.value.trim(), importBranch.value.trim());
        if (res && res.currentBranch) {
            notifyService.success({ message: '导入远程仓库成功' });
            cancelOperation();
            await loadRepoState();
        } else {
            notifyService.error({ message: '导入远程仓库失败' });
        }
    } catch (e) {
        notifyService.error({ message: extractErrorMessage(e, '导入远程仓库失败') });
    } finally {
        formSubmitting.value = false;
    }
}

async function submitAddRemote() {
    if (!isValidUrl(addRemoteUrl.value)) {
        notifyService.warning({ message: '请填写正确的远程仓库地址' });
        return;
    }
    formSubmitting.value = true;
    try {
        await gitRemoteAdd(boPath, addRemoteUrl.value.trim());
        notifyService.success({ message: '添加远程仓库成功' });
        cancelOperation();
        await loadRepoState();
    } catch (e) {
        notifyService.error({ message: extractErrorMessage(e, '添加远程仓库失败') });
    } finally {
        formSubmitting.value = false;
    }
}
```

- [ ] **Step 2: Add form render functions**

Below the existing render functions, add:

```typescript
function renderInitForm() {
    return (
        <div style="margin-top: 16px; padding: 16px; background: #f8f9fb; border-radius: 4px;">
            <div class="deploy-form-row">
                <div class="deploy-form-label"><span class="required">*</span>URL</div>
                <div class="deploy-form-control">
                    <input type="text" value={initUrl.value} onInput={(e: any) => initUrl.value = e.target.value} placeholder="请填写远程仓库地址 http(s)://" />
                </div>
            </div>
            <div class="deploy-form-actions">
                <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                <FButton type="primary" onClick={submitInit} disabled={formSubmitting.value}>
                    {formSubmitting.value ? '提交中...' : '确定'}
                </FButton>
            </div>
        </div>
    );
}

function renderImportForm() {
    return (
        <div style="margin-top: 16px; padding: 16px; background: #f8f9fb; border-radius: 4px;">
            <div class="deploy-form-row">
                <div class="deploy-form-label"><span class="required">*</span>URL</div>
                <div class="deploy-form-control">
                    <input type="text" value={importUrl.value} onInput={(e: any) => importUrl.value = e.target.value} placeholder="请填写远程仓库地址 http(s)://" />
                </div>
            </div>
            <div class="deploy-form-row">
                <div class="deploy-form-label"><span class="required">*</span>分支</div>
                <div class="deploy-form-control">
                    <input type="text" value={importBranch.value} onInput={(e: any) => importBranch.value = e.target.value} />
                </div>
            </div>
            <div class="deploy-form-actions">
                <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                <FButton type="primary" onClick={submitImport} disabled={formSubmitting.value}>
                    {formSubmitting.value ? '提交中...' : '确定'}
                </FButton>
            </div>
        </div>
    );
}

function renderAddRemoteForm() {
    return (
        <div style="margin-top: 16px; padding: 16px; background: #f8f9fb; border-radius: 4px;">
            <div class="deploy-form-row">
                <div class="deploy-form-label"><span class="required">*</span>URL</div>
                <div class="deploy-form-control">
                    <input type="text" value={addRemoteUrl.value} onInput={(e: any) => addRemoteUrl.value = e.target.value} placeholder="请填写远程仓库地址 http(s)://" />
                </div>
            </div>
            <div class="deploy-form-actions">
                <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                <FButton type="primary" onClick={submitAddRemote} disabled={formSubmitting.value}>
                    {formSubmitting.value ? '提交中...' : '确定'}
                </FButton>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Wire forms into renderRepoSection**

Update `renderRepoSection` to render the active form below the body:

```typescript
function renderRepoSection() {
    return (
        <div class="deploy-section">
            <div class="deploy-section-header">
                <h5 class="deploy-section-title">代码仓库</h5>
            </div>
            <div class="deploy-section-body">
                {repoLoading.value && <div style="text-align: center; padding: 24px; color: #999;">加载中...</div>}
                {!repoLoading.value && repoState.value === 'noGit' && renderRepoEmpty()}
                {!repoLoading.value && repoState.value === 'noRemote' && renderRepoNoRemote()}
                {!repoLoading.value && repoState.value === 'ready' && renderRepoReady()}
            </div>
            {activeOperation.value === 'init' && renderInitForm()}
            {activeOperation.value === 'import' && renderImportForm()}
            {activeOperation.value === 'addRemote' && renderAddRemoteForm()}
        </div>
    );
}
```

- [ ] **Step 4: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open the page. Verify:
- In state noGit: clicking "初始化仓库" / "导入远程仓库" opens inline form
- Submitting with invalid URL shows warning notification
- Submitting with valid URL calls API (success or error depends on backend state)
- Cancel button closes form

- [ ] **Step 5: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
git commit -m "feat(deploy-config): inline forms for init/import/addRemote"
```

---

### Task 7: 代码仓库 Section — Operation Toolbar (pull/push/commit/revert)

**Goal:** In `ready` state, show operation buttons and execute them with inline feedback.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

**Interfaces:**
- Consumes: `gitPull`, `gitPush`, `gitCommit`, `gitRevert` from `./service`

- [ ] **Step 1: Add commit form state and operation handlers**

In `setup()`, add after `addRemoteUrl`:

```typescript
// === Commit / Revert inline forms ===
const commitMessage = ref('');
const revertCountdown = ref(0);
let revertTimer: any = null;

// === Operation execution ===
function setOperationResult(type: 'pull' | 'push', success: boolean, message: string) {
    operationStatus.value = { type, loading: false, success, message };
    // Auto-clear after 6 seconds
    setTimeout(() => {
        if (operationStatus.value.type === type) {
            operationStatus.value = { type: null, loading: false, success: null, message: '' };
        }
    }, 6000);
}

function clearOperationResult() {
    operationStatus.value = { type: null, loading: false, success: null, message: '' };
}

/** Returns true if auth is configured; otherwise shows error + opens auth form. */
function guardAuth(): boolean {
    if (!gitConfigured.value) {
        notifyService.error({ message: '当前账号没有权限，请先配置认证信息' });
        activeOperation.value = 'auth';
        return false;
    }
    return true;
}

async function handlePull() {
    if (!guardAuth()) return;
    clearOperationResult();
    operationStatus.value = { type: 'pull', loading: true, success: null, message: '' };
    try {
        const res = await gitPull(boPath);
        if (res && res.commandOutput === 'SUCCESS') {
            setOperationResult('pull', true, '代码拉取成功');
        } else {
            setOperationResult('pull', false, res?.mergeStatus || '代码拉取失败');
        }
    } catch (e) {
        setOperationResult('pull', false, extractErrorMessage(e, '代码拉取失败'));
    }
}

async function handlePush() {
    if (!guardAuth()) return;
    clearOperationResult();
    operationStatus.value = { type: 'push', loading: true, success: null, message: '' };
    try {
        const res = await gitPush(boPath);
        if (res && res.code === 200) {
            setOperationResult('push', true, '代码推送成功');
        } else {
            setOperationResult('push', false, res?.message || '代码推送失败');
        }
    } catch (e) {
        setOperationResult('push', false, extractErrorMessage(e, '代码推送失败'));
    }
}

function openCommitForm() {
    if (!guardAuth()) return;
    clearOperationResult();
    activeOperation.value = 'commit';
}

function openRevertForm() {
    if (!guardAuth()) return;
    clearOperationResult();
    startRevertCountdown();
    activeOperation.value = 'revert';
}

async function submitCommit() {
    if (!commitMessage.value.trim()) {
        notifyService.warning({ message: '请填写提交信息' });
        return;
    }
    formSubmitting.value = true;
    try {
        const res = await gitCommit(boPath, commitMessage.value.trim());
        if (res && res.code === 200) {
            notifyService.success({ message: '代码提交成功' });
            commitMessage.value = '';
            cancelOperation();
        } else {
            notifyService.error({ message: res?.message || '代码提交失败' });
        }
    } catch (e) {
        notifyService.error({ message: extractErrorMessage(e, '代码提交失败') });
    } finally {
        formSubmitting.value = false;
    }
}

function startRevertCountdown() {
    revertCountdown.value = 5;
    revertTimer = setInterval(() => {
        revertCountdown.value -= 1;
        if (revertCountdown.value <= 0) {
            clearInterval(revertTimer);
            revertTimer = null;
        }
    }, 1000);
}

async function submitRevert() {
    if (revertCountdown.value > 0) return;
    formSubmitting.value = true;
    try {
        const res = await gitRevert(boPath);
        if (res && res.code === 200) {
            notifyService.success({ message: res.data || '代码回退成功' });
            cancelOperation();
        } else {
            notifyService.error({ message: res?.data || '代码回退失败' });
        }
    } catch (e) {
        notifyService.error({ message: extractErrorMessage(e, '代码回退失败') });
    } finally {
        formSubmitting.value = false;
    }
}

function cancelRevert() {
    if (revertTimer) {
        clearInterval(revertTimer);
        revertTimer = null;
    }
    revertCountdown.value = 0;
    cancelOperation();
}
```

- [ ] **Step 2: Update renderRepoReady to add the operation toolbar**

Replace `renderRepoReady` with:

```typescript
function renderRepoReady() {
    return (
        <div>
            {!gitConfigured.value && (
                <div class="deploy-auth-warning">
                    <span>⚠ 当前账号未配置认证信息</span>
                    <span class="deploy-auth-warning-action" onClick={() => activeOperation.value = 'auth'}>立即配置</span>
                </div>
            )}
            <div class="deploy-info-row">
                <div class="deploy-info-label">名称</div>
                <div class="deploy-info-value">{remoteInfo.value?.name || 'origin'}</div>
            </div>
            <div class="deploy-info-row">
                <div class="deploy-info-label">远程</div>
                <div class="deploy-info-value">{remoteInfo.value?.url || '-'}</div>
            </div>
            <div class="deploy-info-row">
                <div class="deploy-info-label">分支</div>
                <div class="deploy-info-value">{remoteInfo.value?.branchName || '-'}</div>
            </div>
            <div class="deploy-info-row">
                <div class="deploy-info-label">认证</div>
                <div class="deploy-info-value">
                    <span style="color: #2a87ff; cursor: pointer;" onClick={() => activeOperation.value = 'auth'}>
                        {gitConfigured.value ? '修改认证信息' : '配置认证信息'} ▼
                    </span>
                </div>
            </div>

            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8ebf1; display: flex; gap: 8px; flex-wrap: wrap;">
                <FButton type="secondary" onClick={handlePull}>
                    {operationStatus.value.type === 'pull' && operationStatus.value.loading ? '拉取中...' : '⬇ 拉取'}
                </FButton>
                <FButton type="secondary" onClick={openCommitForm}>✔ 提交</FButton>
                <FButton type="secondary" onClick={handlePush}>
                    {operationStatus.value.type === 'push' && operationStatus.value.loading ? '推送中...' : '⬆ 推送'}
                </FButton>
                <FButton type="secondary" onClick={openRevertForm}>↩ 撤销</FButton>
            </div>

            {operationStatus.value.type && !operationStatus.value.loading && operationStatus.value.success !== null && (
                <div class={`deploy-inline-result ${operationStatus.value.success ? 'deploy-inline-result-success' : 'deploy-inline-result-error'}`}>
                    <span>{operationStatus.value.success ? '✓' : '✗'}</span>
                    <span>{operationStatus.value.message}</span>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Add commit and revert form render functions**

Below `renderAddRemoteForm`:

```typescript
function renderCommitForm() {
    return (
        <div style="margin-top: 16px; padding: 16px; background: #f8f9fb; border-radius: 4px;">
            <div class="deploy-form-row" style={{ alignItems: 'flex-start' }}>
                <div class="deploy-form-label"><span class="required">*</span>提交信息</div>
                <div class="deploy-form-control">
                    <textarea
                        value={commitMessage.value}
                        onInput={(e: any) => commitMessage.value = e.target.value}
                        placeholder="请填写提交信息"
                    ></textarea>
                </div>
            </div>
            <div class="deploy-form-actions">
                <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                <FButton type="primary" onClick={submitCommit} disabled={formSubmitting.value}>
                    {formSubmitting.value ? '提交中...' : '确定'}
                </FButton>
            </div>
        </div>
    );
}

function renderRevertForm() {
    const label = revertCountdown.value > 0 ? `确定(${revertCountdown.value}s)` : '确定';
    return (
        <div style="margin-top: 16px; padding: 16px; background: #fff6e6; border: 1px solid #ffb84d; border-radius: 4px;">
            <div style="font-size: 13px; color: #b88100; margin-bottom: 12px;">
                ⚠ 撤销操作将回退最近一次提交且不可恢复，请确认。
            </div>
            <div class="deploy-form-actions" style={{ borderTop: 'none', paddingTop: 0 }}>
                <FButton type="secondary" onClick={cancelRevert} disabled={formSubmitting.value}>取消</FButton>
                <FButton type="primary" onClick={submitRevert} disabled={revertCountdown.value > 0 || formSubmitting.value}>
                    {formSubmitting.value ? '提交中...' : label}
                </FButton>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Wire commit/revert forms into renderRepoSection**

Update `renderRepoSection`'s form block:

```typescript
{activeOperation.value === 'init' && renderInitForm()}
{activeOperation.value === 'import' && renderImportForm()}
{activeOperation.value === 'addRemote' && renderAddRemoteForm()}
{activeOperation.value === 'commit' && renderCommitForm()}
{activeOperation.value === 'revert' && renderRevertForm()}
```

- [ ] **Step 5: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open the page. In ready state:
- Click 拉取 → button shows "拉取中..." → then inline result appears (green/red)
- Click 提交 → inline form opens, textarea + buttons
- Click 推送 → similar to 拉取
- Click 撤销 → inline form with 5s countdown; button disabled until 0
- If gitConfigured is false, click 拉取/推送 → error notification + auth form opens

- [ ] **Step 6: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
git commit -m "feat(deploy-config): add operation toolbar (pull/push/commit/revert)"
```

---

### Task 8: 代码仓库 Section — Auth Sub-Area

**Goal:** Make "配置认证信息" expand an inline form to update username/password.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

**Interfaces:**
- Consumes: `getGitRepoConfig`, `updateGitRepoConfig` from `./service`

- [ ] **Step 1: Add auth form refs and handlers**

In `setup()`, add:

```typescript
// === Auth form ===
const authUsername = ref('');
const authPassword = ref('');
const authPasswordDirty = ref(false);

async function openAuthForm() {
    activeOperation.value = 'auth';
    authPasswordDirty.value = false;
    authPassword.value = '';
    try {
        const res = await getGitRepoConfig();
        if (res) {
            authUsername.value = res.name || '';
        }
    } catch (e) {
        // ignore — leave fields blank
    }
}

function onAuthPasswordInput() {
    authPasswordDirty.value = true;
}

async function submitAuth() {
    if (!authUsername.value.trim()) {
        notifyService.warning({ message: '请输入用户名' });
        return;
    }
    if (authPasswordDirty.value && !authPassword.value.trim()) {
        notifyService.warning({ message: '请输入密码' });
        return;
    }
    formSubmitting.value = true;
    try {
        const pass = authPasswordDirty.value ? authPassword.value.trim() : '';
        const res = await updateGitRepoConfig(authUsername.value.trim(), pass);
        if (res && res.code === 200) {
            notifyService.success({ message: '更新认证信息成功' });
            cancelOperation();
            await loadRepoState();
        } else {
            notifyService.error({ message: res?.message || '更新认证信息失败' });
        }
    } catch (e) {
        notifyService.error({ message: extractErrorMessage(e, '更新认证信息失败') });
    } finally {
        formSubmitting.value = false;
    }
}
```

- [ ] **Step 2: Update the认证 row and warning action to call openAuthForm**

In `renderRepoReady`, change the认证 row click:

```tsx
<span style="color: #2a87ff; cursor: pointer;" onClick={openAuthForm}>
    {gitConfigured.value ? '修改认证信息' : '配置认证信息'} ▼
</span>
```

And the warning action:

```tsx
<span class="deploy-auth-warning-action" onClick={openAuthForm}>立即配置</span>
```

- [ ] **Step 3: Add renderAuthForm**

Below `renderRevertForm`:

```typescript
function renderAuthForm() {
    const placeholder = authPasswordDirty.value ? '' : '******';
    return (
        <div style="margin-top: 16px; padding: 16px; background: #f8f9fb; border-radius: 4px;">
            <div class="deploy-form-row">
                <div class="deploy-form-label"><span class="required">*</span>用户名</div>
                <div class="deploy-form-control">
                    <input type="text" value={authUsername.value} onInput={(e: any) => authUsername.value = e.target.value} />
                </div>
            </div>
            <div class="deploy-form-row">
                <div class="deploy-form-label"><span class="required">*</span>密码</div>
                <div class="deploy-form-control">
                    <input
                        type="password"
                        value={authPassword.value}
                        placeholder={placeholder}
                        onInput={(e: any) => { authPassword.value = e.target.value; onAuthPasswordInput(); }}
                    />
                </div>
            </div>
            <div class="deploy-form-actions">
                <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                <FButton type="primary" onClick={submitAuth} disabled={formSubmitting.value}>
                    {formSubmitting.value ? '保存中...' : '保存'}
                </FButton>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Wire auth form into renderRepoSection**

Add to the form block:

```typescript
{activeOperation.value === 'auth' && renderAuthForm()}
```

- [ ] **Step 5: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Open page. In ready state:
- Click "配置认证信息" → form opens, username pre-filled if previously configured
- Submit with empty username → warning
- Submit with username + dirty empty password → warning
- Submit valid → success notification → form closes → state refreshes (warning banner should disappear if `gitConfig` becomes true)

- [ ] **Step 6: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
git commit -m "feat(deploy-config): inline auth credentials sub-form"
```

---

### Task 9: 发布服务器 Section (Mock Editable)

**Goal:** Add the publish server section with 3 editable fields and a section-level Save button. Mock save shows loading then success notification.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

- [ ] **Step 1: Add publish server state and handlers**

In `setup()`, add:

```typescript
// === 发布服务器段 (mock) ===
const PUBLISH_SERVER_DEFAULT = { address: '139.196.239.110', path: '/home/BaseEnvironment/igix2508B', port: '5220' };
const publishServer = ref({ ...PUBLISH_SERVER_DEFAULT });
const publishServerSaved = ref({ ...PUBLISH_SERVER_DEFAULT });
const publishServerSaving = ref(false);

const publishServerDirty = computed(() => {
    return publishServer.value.address !== publishServerSaved.value.address
        || publishServer.value.path !== publishServerSaved.value.path
        || publishServer.value.port !== publishServerSaved.value.port;
});

function resetPublishServer() {
    publishServer.value = { ...publishServerSaved.value };
}

async function savePublishServer() {
    if (!publishServer.value.address.trim() || !publishServer.value.path.trim() || !publishServer.value.port.trim()) {
        notifyService.warning({ message: '请填写完整的发布服务器信息' });
        return;
    }
    publishServerSaving.value = true;
    // Mock save with simulated network latency
    await new Promise(resolve => setTimeout(resolve, 500));
    publishServerSaved.value = { ...publishServer.value };
    publishServerSaving.value = false;
    notifyService.success({ message: '已保存' });
}
```

Add `computed` to the Vue import at the top of the file:

```typescript
import { computed, defineComponent, inject, onMounted, ref } from 'vue';
```

- [ ] **Step 2: Add renderPublishServerSection**

Below `renderRepoSection`:

```typescript
function renderPublishServerSection() {
    return (
        <div class="deploy-section">
            <div class="deploy-section-header">
                <h5 class="deploy-section-title">发布服务器</h5>
            </div>
            <div class="deploy-section-body">
                <div class="deploy-form-row">
                    <div class="deploy-form-label"><span class="required">*</span>服务器地址</div>
                    <div class="deploy-form-control">
                        <input type="text" value={publishServer.value.address} onInput={(e: any) => publishServer.value.address = e.target.value} />
                    </div>
                </div>
                <div class="deploy-form-row">
                    <div class="deploy-form-label"><span class="required">*</span>部署路径</div>
                    <div class="deploy-form-control">
                        <input type="text" value={publishServer.value.path} onInput={(e: any) => publishServer.value.path = e.target.value} />
                    </div>
                </div>
                <div class="deploy-form-row">
                    <div class="deploy-form-label"><span class="required">*</span>端口</div>
                    <div class="deploy-form-control">
                        <input type="text" value={publishServer.value.port} onInput={(e: any) => publishServer.value.port = e.target.value} />
                    </div>
                </div>
                <div class="deploy-form-actions">
                    <FButton type="secondary" onClick={resetPublishServer} disabled={!publishServerDirty.value || publishServerSaving.value}>取消</FButton>
                    <FButton type="primary" onClick={savePublishServer} disabled={!publishServerDirty.value || publishServerSaving.value}>
                        {publishServerSaving.value ? '保存中...' : '保存'}
                    </FButton>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Add to render output**

In the main render function's `f-page-main`, add below `{renderRepoSection()}`:

```tsx
{renderPublishServerSection()}
```

- [ ] **Step 4: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Verify:
- 发布服务器 section appears below 代码仓库
- 3 inputs pre-filled with mock values
- Save button initially disabled (no changes)
- Edit a field → Save button enables
- Click Save → button shows "保存中..." for ~500ms → success notification "已保存"
- Click 取消 after editing → fields revert to last saved values

- [ ] **Step 5: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
git commit -m "feat(deploy-config): add 发布服务器 section with mock save"
```

---

### Task 10: 质量检查 Section (Mock Editable)

**Goal:** Add the 4-checkbox quality checks section with mock Save button.

**Files:**
- Modify: `packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx`

- [ ] **Step 1: Add quality checks state and handlers**

In `setup()`, add:

```typescript
// === 质量检查段 (mock) ===
const QUALITY_CHECKS_DEFAULT = {
    baseFramework: true,
    dependencyInjection: true,
    webEndpoints: true,
    persistenceFramework: false
};
const qualityChecks = ref({ ...QUALITY_CHECKS_DEFAULT });
const qualityChecksSaved = ref({ ...QUALITY_CHECKS_DEFAULT });
const qualityChecksSaving = ref(false);

const qualityChecksDirty = computed(() => {
    return qualityChecks.value.baseFramework !== qualityChecksSaved.value.baseFramework
        || qualityChecks.value.dependencyInjection !== qualityChecksSaved.value.dependencyInjection
        || qualityChecks.value.webEndpoints !== qualityChecksSaved.value.webEndpoints
        || qualityChecks.value.persistenceFramework !== qualityChecksSaved.value.persistenceFramework;
});

function resetQualityChecks() {
    qualityChecks.value = { ...qualityChecksSaved.value };
}

async function saveQualityChecks() {
    qualityChecksSaving.value = true;
    await new Promise(resolve => setTimeout(resolve, 500));
    qualityChecksSaved.value = { ...qualityChecks.value };
    qualityChecksSaving.value = false;
    notifyService.success({ message: '已保存' });
}
```

- [ ] **Step 2: Add renderQualityChecksSection**

Below `renderPublishServerSection`:

```typescript
function renderQualityChecksSection() {
    return (
        <div class="deploy-section">
            <div class="deploy-section-header">
                <h5 class="deploy-section-title">质量检查</h5>
            </div>
            <div class="deploy-section-body">
                <div class="deploy-checkbox-group">
                    <label class="deploy-checkbox-item">
                        <input
                            type="checkbox"
                            checked={qualityChecks.value.baseFramework}
                            onChange={(e: any) => qualityChecks.value.baseFramework = e.target.checked}
                        />
                        <span>基础框架特性分析</span>
                    </label>
                    <label class="deploy-checkbox-item">
                        <input
                            type="checkbox"
                            checked={qualityChecks.value.dependencyInjection}
                            onChange={(e: any) => qualityChecks.value.dependencyInjection = e.target.checked}
                        />
                        <span>依赖注入分析</span>
                    </label>
                    <label class="deploy-checkbox-item">
                        <input
                            type="checkbox"
                            checked={qualityChecks.value.webEndpoints}
                            onChange={(e: any) => qualityChecks.value.webEndpoints = e.target.checked}
                        />
                        <span>Web端点配置分析</span>
                    </label>
                    <label class="deploy-checkbox-item">
                        <input
                            type="checkbox"
                            checked={qualityChecks.value.persistenceFramework}
                            onChange={(e: any) => qualityChecks.value.persistenceFramework = e.target.checked}
                        />
                        <span>持久化框架特性分析</span>
                    </label>
                </div>
                <div class="deploy-form-actions">
                    <FButton type="secondary" onClick={resetQualityChecks} disabled={!qualityChecksDirty.value || qualityChecksSaving.value}>取消</FButton>
                    <FButton type="primary" onClick={saveQualityChecks} disabled={!qualityChecksDirty.value || qualityChecksSaving.value}>
                        {qualityChecksSaving.value ? '保存中...' : '保存'}
                    </FButton>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Add to render output**

In the main render function's `f-page-main`, add below `{renderPublishServerSection()}`:

```tsx
{renderQualityChecksSection()}
```

- [ ] **Step 4: Run dev and verify**

Run: `cd packages/ide && npm run dev`
Verify:
- 质量检查 section appears below 发布服务器
- 4 checkboxes, first 3 checked by default
- Save button initially disabled
- Toggle a checkbox → Save enables
- Save → loading → success notification
- 取消 → revert to last saved

- [ ] **Step 5: Commit**

```bash
git add packages/ide/apps/platform/development-platform/ide/app-builder/src/components/deploy-config/deploy-config.component.tsx
git commit -m "feat(deploy-config): add 质量检查 section with mock save"
```

---

### Task 11: End-to-End Verification & Polish

**Goal:** Run through the full acceptance criteria from the spec and fix any visual/interaction gaps.

**Files:**
- Possibly: minor tweaks to `deploy-config.component.tsx` or `deploy-config.scss`

- [ ] **Step 1: Run dev server and walk through acceptance criteria**

Run: `cd packages/ide && npm run dev`

Test each item from the spec §8 acceptance criteria:
1. Left nav shows "部署配置" below "质量保障"; clicking enters the page
2. Three sections render: 代码仓库 (state-driven), 发布服务器 (editable), 质量检查 (editable)
3. 代码仓库 full flow (noGit → addRemote → auth → commit → push → pull → revert) works without console errors
4. 发布服务器: edit → save button enables → click → loading → success notification
5. 质量检查: toggle → save button enables → click → loading → success notification
6. 顶部 刷新 button re-loads 代码仓库 state (does NOT clear 发布服务器/质量检查 — those are local mock)
7. Visual style matches `analysis` page (header, toolbar, card patterns)
8. `app-center` 应用卡片 "..." button flow still works (sanity check — should not be affected)

- [ ] **Step 2: Fix any visual or interaction issues found**

Typical fixes:
- Spacing/padding adjustments in `deploy-config.scss`
- Button alignment
- Form row alignment
- Section card shadow consistency

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "polish(deploy-config): final visual and interaction tweaks"
```

- [ ] **Step 4: Verify clean working tree**

Run: `git status`
Expected: clean working tree (or only unrelated changes)
