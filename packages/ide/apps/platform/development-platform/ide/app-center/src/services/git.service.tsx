import axios from 'axios';
import JSEncrypt from 'jsencrypt';
import { FLoadingService } from '@farris/ui-vue';

const PUBLIC_KEY = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8Uvi7YbPGxof2p7NGneZGfwGhMOhWrj/Jk6bjDS87jCQ0uEQ7PquzVbgWLMV0eyFzAOBiHMT+Gy9q5x7aPpskm7CnMwPgjlXt1xVENOM/fXtAl908dG+UadbzZvUWV68KBF14Q8JOZ3kyUo9jzsn0Ro0tzORDVH6WnasdVcPBHQIDAQAB';

export interface GitOperation {
    icon: string;
    name: string;
    id: string;
}

export class GitService {
    public modalService: any;
    public notifyService: any;

    constructor(modalService: any, notifyService: any) {
        this.modalService = modalService;
        this.notifyService = notifyService;
    }

    getGitOperations(status: number): GitOperation[] {
        if (status === 1) {
            return [
                { icon: '\u{1F4E6}', name: '初始化仓库', id: 'initGit' },
                { icon: '\u{2B07}️', name: '导入远程仓库', id: 'importGit' }
            ];
        } else if (status === 2) {
            return [
                { icon: '\u{2795}', name: '添加远程仓库', id: 'addRemote' }
            ];
        } else if (status === 3) {
            return [
                { icon: '\u{1F441}', name: '查看远程仓库', id: 'viewRemote' },
                { icon: '\u{2B07}️', name: '拉取', id: 'pull' },
                { icon: '\u{2714}️', name: '提交', id: 'commit' },
                { icon: '\u{2B06}️', name: '推送', id: 'push' },
                { icon: '\u{21A9}️', name: '撤销', id: 'revert' }
            ];
        }
        return [];
    }

    handleGitOperation(gitOperation: GitOperation, boPath: string): void {
        switch (gitOperation.id) {
            case 'initGit':
                this.showGitUrlDialog(boPath, 'initGit');
                break;
            case 'importGit':
                this.showGitUrlDialog(boPath, 'importGit');
                break;
            case 'addRemote':
                this.showGitUrlDialog(boPath, 'addRemote');
                break;
            case 'viewRemote':
                this.handleViewRemote(boPath);
                break;
            case 'pull':
                this.handlePull(boPath);
                break;
            case 'push':
                this.handlePush(boPath);
                break;
            case 'commit':
                this.handleCommit(boPath);
                break;
            case 'revert':
                this.showRevertModal(boPath);
                break;
        }
    }

    // ========== HTTP methods ==========

    checkIsGitProject(boPath: string): Promise<any> {
        return axios.get('/api/dev/main/v1.0/git/addr?wsPath=' + boPath).then(res => res.data);
    }

    gitInit(boPath: string): Promise<any> {
        return axios.post('/api/dev/main/v1.0/git/init?projectPath=' + boPath, {}).then(res => res.data);
    }

    gitClone(boPath: string, gitUrl: string, branch: string): Promise<any> {
        const sendData = { branchToFetch: branch, remoteUrl: gitUrl, workDir: boPath };
        return axios.post('/api/dev/main/v1.0/git/clone', sendData).then(res => {
            if (res.data && res.data.currentBranch) {
                this.notifyService.success({ message: '导入远程仓库成功' });
            } else {
                this.notifyService.error({ message: '导入远程仓库失败' });
            }
            return res.data;
        }).catch(e => {
            this.notifyService.error({ message: e?.response?.data?.Message || '导入远程仓库失败' });
            throw e;
        });
    }

    gitRemoteAdd(boPath: string, gitUrl: string): Promise<any> {
        const sendData = { password: null, url: gitUrl, name: 'origin', username: null };
        return axios.post('/api/dev/main/v1.0/git/remote?projectPath=' + boPath, sendData).then(res => res.data);
    }

    gitRemoteView(boPath: string): Promise<any> {
        return axios.get('/api/dev/main/v1.0/git/remote?projectPath=' + boPath).then(res => res.data);
    }

    gitRemoteDelete(boPath: string, name: string): Promise<any> {
        return axios.delete('/api/dev/main/v1.0/git/remote/' + name + '?projectPath=' + boPath + '&name=' + name).then(res => res.data);
    }

    gitPull(boPath: string): Promise<any> {
        const sendData = { password: null, remote: 'origin', rebase: false, username: null };
        return axios.post('/api/dev/main/v1.0/git/pull?projectPath=' + boPath, sendData).then(res => res.data);
    }

    gitCommit(boPath: string, message: string): Promise<any> {
        const sendData = { message, all: true };
        return axios.post('/api/dev/main/v1.0/git/commit?projectPath=' + boPath, sendData).then(res => res.data);
    }

    gitPush(boPath: string): Promise<any> {
        const sendData = { password: null, remote: 'origin', branchname: '', username: null };
        return axios.post('/api/dev/main/v1.0/git/push?projectPath=' + boPath, sendData).then(res => res.data);
    }

    gitRevert(boPath: string): Promise<any> {
        return axios.post('/api/dev/main/v1.0/git/backout?projectPath=' + boPath, {}).then(res => res.data);
    }

    getGitRepoConfig(): Promise<any> {
        return axios.get('/api/dev/main/v1.0/git/repoconfig').then(res => res.data);
    }

    updateGitRepoConfig(name: string, password: string): Promise<any> {
        const sendData = { name, password: password ? this.rsaEncrypt(password) : '' };
        return axios.post('/api/dev/main/v1.0/git/repoconfig', sendData).then(res => res.data);
    }

    // ========== Publish ==========

    async handlePublish(boPath: string): Promise<void> {
        FLoadingService.show({ message: '正在发布，请稍候...' });
        try {
            const res = await axios.post('http://139.196.239.110:26789/publish', { path: boPath });
            FLoadingService.close();
            if (res.data && res.data.ok) {
                this.notifyService.success({ message: '发布成功' });
            } else {
                this.notifyService.error({ message: res.data?.error || '发布失败' });
            }
        } catch (e: any) {
            FLoadingService.close();
            const errMsg = e?.response?.data?.error || '发布失败';
            this.notifyService.error({ message: errMsg });
        }
    }

    // ========== Orchestration methods ==========

    async handleInitGit(boPath: string, remoteUrl: string): Promise<void> {
        const initResult = await this.gitInit(boPath);
        if (initResult && initResult.code === 200) {
            this.notifyService.success({ message: '初始化仓库成功' });
            this.addRemoteUrl(boPath, remoteUrl);
        } else {
            this.notifyService.error({ message: initResult?.message || '' });
        }
    }

    handleViewRemote(boPath: string): void {
        this.gitRemoteView(boPath).then(res => {
            if (res && res.length && res[0].name) {
                this.showGitUrlDialog(boPath, 'viewRemote', {
                    url: res[0].url,
                    branchName: res[0].branchName,
                    name: res[0].name
                });
            }
        }).catch(() => {});
    }

    async handlePull(boPath: string): Promise<void> {
        const gitStatus = await this.beforeCheck(boPath);
        if (!gitStatus) return;
        this.gitPull(boPath).then(res => {
            if (res && res.commandOutput === 'SUCCESS') {
                this.notifyService.success({ message: '代码拉取成功' });
            } else {
                this.notifyService.error({ message: res?.mergeStatus || '代码拉取失败' });
            }
        }).catch(e => {
            this.notifyService.error({ message: e?.response?.data?.Message || '代码拉取失败' });
        });
    }

    async handleCommit(boPath: string): Promise<void> {
        const gitStatus = await this.beforeCheck(boPath);
        if (!gitStatus) return;
        this.showCommitMessageDialog(boPath);
    }

    async handlePush(boPath: string): Promise<void> {
        const gitStatus = await this.beforeCheck(boPath);
        if (!gitStatus) return;
        this.gitPush(boPath).then(res => {
            if (res && res.code === 200) {
                this.notifyService.success({ message: '代码推送成功' });
            } else {
                this.notifyService.error({ message: res?.message || '代码推送失败' });
            }
        }).catch(e => {
            this.notifyService.error({ message: e?.response?.data?.Message || '代码推送失败' });
        });
    }

    async handleRevert(boPath: string): Promise<void> {
        const gitStatus = await this.beforeCheck(boPath);
        if (!gitStatus) return;
        this.gitRevert(boPath).then(res => {
            if (res && res.code === 200) {
                this.notifyService.success({ message: res.data || '代码回退成功' });
            } else {
                this.notifyService.error({ message: res?.data || '代码回退失败' });
            }
        }).catch(e => {
            this.notifyService.error({ message: e?.response?.data?.Message || '代码回退失败' });
        });
    }

    addRemoteUrl(boPath: string, remoteUrl: string): void {
        this.gitRemoteAdd(boPath, remoteUrl).then(() => {
            this.notifyService.success({ message: '添加远程仓库成功，仓库地址为:' + remoteUrl });
        }).catch(() => {
            this.notifyService.error({ message: '添加远程仓库失败' });
        });
    }

    handleRepo(): void {
        this.getGitRepoConfig().then(res => {
            if (res) {
                this.showRepoMessageDialog(res.name, res.password);
            } else {
                this.notifyService.error({ message: '获取用户账号密码信息失败' });
            }
        }).catch(e => {
            this.notifyService.error({ message: e?.response?.data?.Message || '获取用户账号密码信息失败' });
        });
    }

    handleDeleteUrl(boPath: string, name: string): Promise<boolean> {
        const that = this;
        return new Promise((resolve) => {
            const modalRef: any = that.modalService?.open({
                title: '提示',
                width: 420,
                fitContent: true,
                showHeader: false,
                showButtons: true,
                buttons: [
                    { text: '取消', class: 'btn btn-secondary', handle: () => { modalRef?.close(); resolve(false); } },
                    {
                        text: '确定', class: 'btn btn-primary', handle: () => {
                            modalRef?.close();
                            that.gitRemoteDelete(boPath, name).then(() => {
                                that.notifyService.success({ message: '删除该远程仓库成功' });
                                resolve(true);
                            }).catch((e: any) => {
                                that.notifyService.error({ message: e?.response?.data?.Message || '删除该远程仓库失败' });
                                resolve(false);
                            });
                        }
                    }
                ],
                render: () => (
                    <div style="display: flex; align-items: center; padding: 20px;">
                        <span class="f-icon f-icon-warning" style="font-size: 26px; margin-right: 12px; color: #f0ad4e;"></span>
                        <span>是否删除该远程仓库配置？</span>
                    </div>
                )
            });
        });
    }

    beforeCheck(boPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.checkIsGitProject(boPath).then(res => {
                if (!res || !res.addr || res.addr !== boPath) {
                    this.notifyService.error({ message: '不存在远程仓库，请先添加远程仓库' });
                    resolve(false);
                } else if (!res.gitUrl) {
                    this.notifyService.error({ message: '不存在远程仓库，请先添加远程仓库' });
                    resolve(false);
                } else if (!res.gitConfig) {
                    this.notifyService.error({ message: '当前账号没有权限，请修改用户认证信息' });
                    resolve(false);
                } else {
                    resolve(true);
                }
            }).catch(() => { resolve(false); });
        });
    }

    // ========== Dialog helpers ==========

    showGitUrlDialog(boPath: string, type: string, options?: any): void {
        const that = this;
        import('../components/apps/dialogs/git-url-dialog').then(module => {
            const GitUrlDialog = module.default;
            that.modalService?.open({
                title: type === 'viewRemote' ? '查看远程仓库' : '添加远程仓库',
                width: 550,
                showButtons: false,
                showHeader: false,
                fitContent: true,
                render: () => {
                    return <GitUrlDialog
                        showType={type}
                        boPath={boPath}
                        remoteUrlProp={options?.url || ''}
                        branchProp={options?.branchName || ''}
                        nameProp={options?.name || ''}
                        gitService={that}
                    ></GitUrlDialog>;
                }
            });
        });
    }

    showCommitMessageDialog(boPath: string): void {
        const that = this;
        import('../components/apps/dialogs/git-commit-dialog').then(module => {
            const GitCommitDialog = module.default;
            that.modalService?.open({
                title: '提交信息',
                width: 550,
                showButtons: false,
                showHeader: false,
                fitContent: true,
                render: () => {
                    return <GitCommitDialog boPath={boPath} placeholder="请填写提交信息" gitService={that}></GitCommitDialog>;
                }
            });
        });
    }

    showRepoMessageDialog(username: string, password: string): void {
        const that = this;
        import('../components/apps/dialogs/git-repo-dialog').then(module => {
            const GitRepoDialog = module.default;
            that.modalService?.open({
                title: '用户认证信息',
                width: 550,
                showButtons: false,
                showHeader: false,
                fitContent: true,
                render: () => {
                    return <GitRepoDialog usernameProp={username} passwordProp={password} gitService={that}></GitRepoDialog>;
                }
            });
        });
    }

    showRevertModal(boPath: string): void {
        const that = this;
        import('../components/apps/dialogs/git-revert-dialog').then(module => {
            const GitRevertDialog = module.default;
            that.modalService?.open({
                title: '',
                width: 390,
                showButtons: false,
                showHeader: false,
                fitContent: true,
                render: () => {
                    return <GitRevertDialog boPath={boPath} gitService={that}></GitRevertDialog>;
                }
            });
        });
    }

    rsaEncrypt(info: string): string {
        const encrypt = new JSEncrypt();
        encrypt.setPublicKey(PUBLIC_KEY);
        const encrypted = (encrypt as any).encryptLong ? (encrypt as any).encryptLong(info) : encrypt.encrypt(info);
        return encrypted as string;
    }
}
