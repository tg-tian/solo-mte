import { defineComponent, inject, onMounted, ref } from 'vue';
import { FButton, F_NOTIFY_SERVICE_TOKEN, FNotifyService } from '@farris/ui-vue';
import { DeployConfigProps, deployConfigProps } from './deploy-config.props';
import { UseWorkspace } from '../../composition/types';
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
import { ActiveOperation, OperationStatus, PublishServerConfig, PublishServerConfigResponse, DB_TYPE_NAME_MAP, RepoState } from './types';

const GIT_ICON_BASE = '/assets/img/git-';

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

        // === Inline form state ===
        const initUrl = ref('');
        const importUrl = ref('');
        const importBranch = ref('');
        const addRemoteUrl = ref('');
        const commitMessage = ref('');
        const revertCountdown = ref(0);
        const authUsername = ref('');
        const authPassword = ref('');
        const authPasswordDirty = ref(false);
        const formSubmitting = ref(false);
        let revertTimer: any = null;

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

        async function loadAll() {
            await Promise.all([
                loadRepoState(),
                loadPublishServerConfig(),
            ]);
        }

        onMounted(() => {
            loadAll();
        });

        // === Form helpers ===
        function resetForms() {
            initUrl.value = '';
            importUrl.value = '';
            importBranch.value = '';
            addRemoteUrl.value = '';
            commitMessage.value = '';
            authPassword.value = '';
            authPasswordDirty.value = false;
        }

        function cancelOperation() {
            if (revertTimer) {
                clearInterval(revertTimer);
                revertTimer = null;
            }
            revertCountdown.value = 0;
            activeOperation.value = null;
            resetForms();
        }

        function isValidUrl(url: string): boolean {
            return /^(http|https):\/\//.test(url.trim());
        }

        // === Init / Import / AddRemote ===
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

        // === Pull / Push / Commit / Revert ===
        function setOperationResult(type: 'pull' | 'push', success: boolean, message: string) {
            operationStatus.value = { type, loading: false, success, message };
            setTimeout(() => {
                if (operationStatus.value.type === type) {
                    operationStatus.value = { type: null, loading: false, success: null, message: '' };
                }
            }, 6000);
        }

        function clearOperationResult() {
            operationStatus.value = { type: null, loading: false, success: null, message: '' };
        }

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
                    if (revertTimer) {
                        clearInterval(revertTimer);
                        revertTimer = null;
                    }
                }
            }, 1000);
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

        // === Auth ===
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
                // ignore
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

        // === Delete remote ===
        async function submitDeleteRemote() {
            const name = remoteInfo.value?.name || 'origin';
            formSubmitting.value = true;
            try {
                await gitRemoteDelete(boPath, name);
                notifyService.success({ message: '删除远程仓库成功' });
                remoteInfo.value = null;
                cancelOperation();
                await loadRepoState();
            } catch (e) {
                notifyService.error({ message: extractErrorMessage(e, '删除远程仓库失败') });
            } finally {
                formSubmitting.value = false;
            }
        }

        // === Render: Repo states ===
        function renderRepoEmpty() {
            return (
                <div class="deploy-empty">
                    <div class="deploy-empty-icon">
                        <span class="f-icon f-icon-file"></span>
                    </div>
                    <div class="deploy-empty-text">尚未初始化代码仓库</div>
                    <div class="deploy-empty-hint">初始化后可将应用代码纳入版本管理，通过发布流水线自动部署到运行环境。</div>
                    <div style="display: flex; gap: 12px; justify-content: center;">
                        <FButton type="primary" class="git-btn" onClick={() => activeOperation.value = 'init'}>
                            <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'initGit-white.svg'} alt="" />
                            <span>初始化仓库</span>
                        </FButton>
                        <FButton type="secondary" class="git-btn" onClick={() => activeOperation.value = 'import'}>
                            <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'importGit.svg'} alt="" />
                            <span>导入远程仓库</span>
                        </FButton>
                    </div>
                </div>
            );
        }

        function renderRepoNoRemote() {
            return (
                <div class="deploy-empty">
                    <div class="deploy-empty-text">本地仓库已就绪，尚未配置远程仓库</div>
                    <FButton type="primary" onClick={() => activeOperation.value = 'addRemote'}>
                        <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'addRemote.svg'} alt="" />
                        <span>添加远程仓库</span>
                    </FButton>
                </div>
            );
        }

        function renderRepoReady() {
            return (
                <div>
                    {!gitConfigured.value && (
                        <div class="deploy-auth-warning">
                            <span>⚠ 当前账号未配置认证信息</span>
                            <span class="deploy-auth-warning-action" onClick={openAuthForm}>立即配置</span>
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
                            <span style="color: #2a87ff; cursor: pointer;" onClick={openAuthForm}>
                                {gitConfigured.value ? '修改认证信息' : '配置认证信息'} ▼
                            </span>
                        </div>
                    </div>

                    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8ebf1; display: flex; gap: 8px; flex-wrap: wrap;">
                        <FButton type="secondary" class="git-btn" onClick={handlePull}>
                            <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'pull.svg'} alt="" />
                            <span>{operationStatus.value.type === 'pull' && operationStatus.value.loading ? '拉取中...' : '拉取'}</span>
                        </FButton>
                        <FButton type="secondary" class="git-btn" onClick={openCommitForm}>
                            <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'commit.svg'} alt="" />
                            <span>提交</span>
                        </FButton>
                        <FButton type="secondary" class="git-btn" onClick={handlePush}>
                            <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'push.svg'} alt="" />
                            <span>{operationStatus.value.type === 'push' && operationStatus.value.loading ? '推送中...' : '推送'}</span>
                        </FButton>
                        <FButton type="secondary" class="git-btn" onClick={openRevertForm}>
                            <img class="deploy-btn-icon" src={GIT_ICON_BASE + 'revert.svg'} alt="" />
                            <span>撤销</span>
                        </FButton>
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

        // === Render: Inline forms ===
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

        function renderCommitForm() {
            return (
                <div style="margin-top: 16px; padding: 16px; background: #f8f9fb; border-radius: 4px;">
                    <div class="deploy-form-row is-top">
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
                    <div class="deploy-form-actions" style="borderTop: none; paddingTop: 0;">
                        <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                        <FButton type="primary" onClick={submitRevert} disabled={revertCountdown.value > 0 || formSubmitting.value}>
                            {formSubmitting.value ? '提交中...' : label}
                        </FButton>
                    </div>
                </div>
            );
        }

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

        function renderDeleteConfirmForm() {
            return (
                <div style="margin-top: 16px; padding: 16px; background: #fef0f0; border: 1px solid #fbc4c4; border-radius: 4px;">
                    <div style="font-size: 13px; color: #f56c6c; margin-bottom: 12px;">
                        ⚠ 删除后将清除当前远程仓库配置，可重新配置新的远程仓库。是否继续？
                    </div>
                    <div class="deploy-form-actions" style="borderTop: none; paddingTop: 0;">
                        <FButton type="secondary" onClick={cancelOperation} disabled={formSubmitting.value}>取消</FButton>
                        <FButton type="primary" onClick={submitDeleteRemote} disabled={formSubmitting.value}>
                            {formSubmitting.value ? '删除中...' : '确定删除'}
                        </FButton>
                    </div>
                </div>
            );
        }

        function renderRepoSection() {
            return (
                <div class="deploy-section">
                    <div class="deploy-section-header">
                        <h5 class="deploy-section-title">代码仓库</h5>
                        {repoState.value === 'ready' && !repoLoading.value && (
                            <div class="deploy-section-actions">
                                <span class="deploy-delete-link" onClick={() => activeOperation.value = 'delete'}>删除远程仓库</span>
                            </div>
                        )}
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
                    {activeOperation.value === 'commit' && renderCommitForm()}
                    {activeOperation.value === 'revert' && renderRevertForm()}
                    {activeOperation.value === 'auth' && renderAuthForm()}
                    {activeOperation.value === 'delete' && renderDeleteConfirmForm()}
                </div>
            );
        }

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

        return () => (
            <div class="f-page f-page-card f-page-is-mainsubcard f-app-deploy-config">
                <div class="f-admin-main-content">
                    <div class="f-page-header">
                        <nav class="f-page-header-base">
                            <div class="f-title">
                                <div class="f-title-logo"></div>
                                <h4 class="f-title-text">{title}</h4>
                            </div>
                            <div class="f-toolbar">
                                <FButton type="secondary" onClick={loadAll}>刷新</FButton>
                            </div>
                        </nav>
                        <div class="f-page-header-background"></div>
                    </div>
                    <div class="f-page-main">
                        {renderRepoSection()}
                        {renderPublishServerSection()}
                    </div>
                </div>
            </div>
        );
    }
});
