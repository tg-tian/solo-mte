import { defineComponent, ref, inject } from 'vue';
import { F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';

export default defineComponent({
    name: 'GitCommitDialog',
    props: {
        placeholder: { type: String, default: '请填写提交信息' },
        boPath: { type: String, default: '' },
        gitService: { type: Object, default: null }
    },
    setup(props) {
        const modalService = inject(F_MODAL_SERVICE_TOKEN) as any;
        const commitMessage = ref('');

        function close() {
            modalService?.getCurrentModal()?.close();
        }

        function handleConfirm() {
            const gs: any = props.gitService;
            if (!gs) return;

            const msg = commitMessage.value.trim();
            if (!msg) {
                gs.notifyService.warning({ message: '请填写提交信息' });
                return;
            }
            gs.gitCommit(props.boPath, msg).then((res: any) => {
                if (res && res.code === 200) {
                    gs.notifyService.success({ message: '代码提交成功' });
                    close();
                } else {
                    gs.notifyService.warning({ message: res?.message || '代码提交失败' });
                }
            }).catch((e: any) => {
                gs.notifyService.error({ message: e?.response?.data?.Message || '代码提交失败' });
            });
        }

        return () => (
            <div style="padding: 0 16px;">
                <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e8ebf1; margin-bottom: 16px;">
                    <h5 style="margin: 0; font-size: 16px; font-weight: 500;">提交信息</h5>
                    <span class="f-icon f-icon-close" style="cursor: pointer;" onClick={close}></span>
                </div>
                <textarea
                    class="form-control"
                    style="width: 100%; height: 90px; resize: none;"
                    v-model={commitMessage.value}
                    placeholder={props.placeholder}
                ></textarea>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8ebf1;">
                    <button class="btn btn-primary" onClick={handleConfirm}>确定</button>
                    <button class="btn btn-secondary" onClick={close}>取消</button>
                </div>
            </div>
        );
    }
});
