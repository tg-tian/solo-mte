import { defineComponent, ref, inject } from 'vue';
import { FInputGroup, F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';

export default defineComponent({
    name: 'GitUrlDialog',
    props: {
        showType: { type: String, default: 'initGit' },
        boPath: { type: String, default: '' },
        remoteUrlProp: { type: String, default: '' },
        branchProp: { type: String, default: '' },
        nameProp: { type: String, default: '' },
        gitService: { type: Object, default: null }
    },
    setup(props) {
        const modalService = inject(F_MODAL_SERVICE_TOKEN) as any;
        const remoteUrl = ref(props.remoteUrlProp);
        const branch = ref(props.branchProp);
        const name = ref(props.nameProp);

        function close() {
            modalService?.getCurrentModal()?.close();
        }

        function handleConfirm() {
            const gs: any = props.gitService;
            if (!gs) return;

            const url = remoteUrl.value.trim();
            const branchName = branch.value.trim();
            const urlValid = /^(http|https):\/\//.test(url);

            if (props.showType !== 'viewRemote') {
                if (!url || !urlValid) {
                    gs.notifyService.warning({ message: '请填写正确的远程仓库地址' });
                    return;
                }
                if (props.showType === 'importGit' && !branchName) {
                    gs.notifyService.warning({ message: '请填写分支' });
                    return;
                }
            }
            close();
            if (props.showType === 'initGit') {
                gs.handleInitGit(props.boPath, url);
            } else if (props.showType === 'importGit') {
                gs.gitClone(props.boPath, url, branchName);
            } else if (props.showType === 'addRemote') {
                gs.addRemoteUrl(props.boPath, url);
            }
        }

        function handleDelete() {
            const gs: any = props.gitService;
            if (!name.value || !gs) return;
            gs.handleDeleteUrl(props.boPath, name.value).then((res: boolean) => {
                if (res) {
                    name.value = '';
                    remoteUrl.value = '';
                    branch.value = '';
                    close();
                    setTimeout(() => {
                        gs.showGitUrlDialog(props.boPath, 'addRemote');
                    }, 300);
                }
            });
        }

        function handleRepo() {
            const gs: any = props.gitService;
            if (!gs) return;
            close();
            setTimeout(() => {
                gs.handleRepo();
            }, 300);
        }

        const isViewRemote = props.showType === 'viewRemote';
        const isImport = props.showType === 'importGit';
        const title = isViewRemote ? '查看远程仓库' : '添加远程仓库';

        return () => (
            <div style="padding: 0 16px;">
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e8ebf1; margin-bottom: 16px;">
                    <h5 style="margin: 0; font-size: 16px; font-weight: 500;">{title}</h5>
                    <span class="f-icon f-icon-close" style="cursor: pointer;" onClick={close}></span>
                </div>

                {!isViewRemote && (
                    <div class="ide-git-group" style="margin-bottom: 16px;">
                        <div class="ide-git-label">
                            <span style="color: #f56c6c; margin-right: 4px;">*</span>
                            <span>URL</span>
                        </div>
                        <div class="ide-git-input">
                            <FInputGroup v-model={remoteUrl} placeholder="请填写远程仓库地址http(s)://"></FInputGroup>
                        </div>
                    </div>
                )}
                {isImport && (
                    <div class="ide-git-group" style="margin-bottom: 16px;">
                        <div class="ide-git-label">
                            <span style="color: #f56c6c; margin-right: 4px;">*</span>
                            <span>分支</span>
                        </div>
                        <div class="ide-git-input">
                            <FInputGroup v-model={branch}></FInputGroup>
                        </div>
                    </div>
                )}
                {isViewRemote && (
                    <div>
                        <div class="ide-git-group">
                            <div class="ide-git-label"><span>名称</span></div>
                            <div class="ide-git-input">
                                <FInputGroup v-model={name} disabled={true}></FInputGroup>
                            </div>
                            <div class="ide-git-delete" onClick={handleDelete}>
                                {name.value ? <span class="f-icon f-icon-delete"></span> : null}
                            </div>
                        </div>
                        <div class="ide-git-group" style="margin-top: 8px;">
                            <div class="ide-git-label"><span>URL</span></div>
                            <div class="ide-git-input">
                                <FInputGroup v-model={remoteUrl} disabled={true}></FInputGroup>
                            </div>
                        </div>
                        <div class="ide-git-group" style="margin-top: 8px;">
                            <div class="ide-git-label"><span>分支</span></div>
                            <div class="ide-git-input">
                                <FInputGroup v-model={branch} disabled={true}></FInputGroup>
                            </div>
                        </div>
                        <div class="ide-git-vertify" style="margin-top: 8px;">
                            <span onClick={handleRepo}>认证信息</span>
                        </div>
                    </div>
                )}

                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8ebf1;">
                    {!isViewRemote && (
                        <button class="btn btn-primary" onClick={handleConfirm}>确定</button>
                    )}
                    <button class="btn btn-secondary" onClick={close}>{isViewRemote ? '关闭' : '取消'}</button>
                </div>
            </div>
        );
    }
});
