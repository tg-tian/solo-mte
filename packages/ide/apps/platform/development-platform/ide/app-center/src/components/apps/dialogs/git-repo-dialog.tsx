import { defineComponent, ref, inject } from 'vue';
import { FInputGroup, F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';

export default defineComponent({
    name: 'GitRepoDialog',
    props: {
        usernameProp: { type: String, default: '' },
        passwordProp: { type: String, default: '' },
        gitService: { type: Object, default: null }
    },
    setup(props) {
        const modalService = inject(F_MODAL_SERVICE_TOKEN) as any;
        const username = ref(props.usernameProp);
        const password = ref(props.passwordProp);
        const isDirty = ref(false);
        const placeholder = ref('******');

        function onPasswordChange() {
            isDirty.value = true;
            placeholder.value = '';
        }

        function close() {
            modalService?.getCurrentModal()?.close();
        }

        function handleConfirm() {
            const gs: any = props.gitService;
            if (!gs) return;

            const user = username.value.trim();
            const pass = password.value.trim();
            if (!user) {
                gs.notifyService.warning({ message: '请输入用户名' });
                return;
            } else if (isDirty.value && !pass) {
                gs.notifyService.warning({ message: '请输入密码' });
                return;
            }
            gs.updateGitRepoConfig(user, pass).then((res: any) => {
                if (res.code === 200) {
                    close();
                    gs.notifyService.success({ message: '更新用户信息成功' });
                } else {
                    gs.notifyService.error({ message: res.message || '更新用户信息失败' });
                }
            }).catch((e: any) => {
                gs.notifyService.error({ message: e?.response?.data?.Message || '更新用户信息失败' });
            });
        }

        return () => (
            <div style="padding: 0 16px;">
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e8ebf1; margin-bottom: 16px;">
                    <h5 style="margin: 0; font-size: 16px; font-weight: 500;">用户认证信息</h5>
                    <span class="f-icon f-icon-close" style="cursor: pointer;" onClick={close}></span>
                </div>
                <div class="ide-git-group">
                    <div class="ide-git-label">
                        <span style="color: #f56c6c; margin-right: 4px;">*</span>
                        <span>用户名</span>
                    </div>
                    <div class="ide-git-input">
                        <FInputGroup modelValue={username.value} onUpdate:modelValue={(v: string) => username.value = v} placeholder=""></FInputGroup>
                    </div>
                </div>
                <div class="ide-git-group" style="margin-top: 8px;">
                    <div class="ide-git-label">
                        <span style="color: #f56c6c; margin-right: 4px;">*</span>
                        <span>密码</span>
                    </div>
                    <div class="ide-git-input">
                        <FInputGroup type="password" modelValue={password.value} onUpdate:modelValue={(v: string) => password.value = v} placeholder={placeholder.value} onInput={onPasswordChange}></FInputGroup>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8ebf1;">
                    <button class="btn btn-primary" onClick={handleConfirm}>确定</button>
                    <button class="btn btn-secondary" onClick={close}>取消</button>
                </div>
            </div>
        );
    }
});
