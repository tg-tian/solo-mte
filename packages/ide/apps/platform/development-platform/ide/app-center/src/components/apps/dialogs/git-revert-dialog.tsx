import { defineComponent, ref, onMounted, inject } from 'vue';
import { F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';

export default defineComponent({
    name: 'GitRevertDialog',
    props: {
        boPath: { type: String, default: '' },
        gitService: { type: Object, default: null }
    },
    setup(props) {
        const modalService = inject(F_MODAL_SERVICE_TOKEN) as any;
        const buttonText = ref('(5s)');
        const disabled = ref(true);

        onMounted(() => {
            let count = 4;
            const timer = setInterval(() => {
                if (count === 0) {
                    clearInterval(timer);
                    buttonText.value = '';
                    disabled.value = false;
                    return;
                }
                buttonText.value = '(' + count + 's)';
                count--;
            }, 1000);
        });

        function close() {
            modalService?.getCurrentModal()?.close();
        }

        function handleConfirm() {
            if (disabled.value) return;
            const gs: any = props.gitService;
            if (gs) {
                gs.handleRevert(props.boPath);
            }
            close();
        }

        return () => (
            <div style="padding: 0 16px 16px 16px;">
                <div style="display: flex; align-items: center; padding: 16px;">
                    <span class="f-icon f-icon-warning" style="font-size: 26px; margin-right: 12px; color: #f0ad4e;"></span>
                    <span>当前操作会撤销并丢弃当前所有修改，并将文件还原到修改前状态。</span>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8ebf1;">
                    <button class="btn btn-primary" disabled={disabled.value} onClick={handleConfirm}>
                        确定{buttonText.value}
                    </button>
                    <button class="btn btn-secondary" onClick={close}>取消</button>
                </div>
            </div>
        );
    }
});
