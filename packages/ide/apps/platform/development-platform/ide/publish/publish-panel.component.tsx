import { computed, defineComponent } from 'vue';
import { PublishProgress, PUBLISH_STAGES } from './publish.types';
import './publish-panel.scss';

/**
 * 标准产品发布进度面板(仿标准产品 publish-waiting-modal):
 * 发布中展示百分比/进度条/阶段;失败时展示错误信息并保持打开,供用户查看。
 */
export default defineComponent({
    name: 'FStandardPublishPanel',
    props: {
        visible: { type: Boolean, default: false },
        progress: { type: Object as () => PublishProgress, default: null },
        onClose: { type: Function },
    },
    setup(props) {
        const progress = computed(() => props.progress as PublishProgress | null);

        /** 发布中(未收到最终结果) */
        const isPublishing = computed(() => {
            const p = progress.value;
            return !!p && p.status === 0 && p.process !== 100;
        });

        const isSuccess = computed(() => !!progress.value && progress.value.process === 100);

        const isFailed = computed(() => {
            const p = progress.value;
            return !!p && p.status === 1 && p.process !== 100;
        });

        const title = computed(() => {
            if (isSuccess.value) return '发布成功';
            if (isFailed.value) return '发布失败';
            return `正在编译 ${progress.value?.process ?? 0}%`;
        });

        /** 关闭按钮仅在发布结束后显示(与标准产品一致:status != 0 || process === 100) */
        const showClose = computed(() => {
            const p = progress.value;
            return !!p && (p.status !== 0 || p.process === 100);
        });

        /** 阶段状态:1=已完成 0=当前 -1=未开始 */
        function stageState(index: number): 1 | 0 | -1 {
            const p = progress.value;
            if (!p) return -1;
            if (p.process === 100) return 1;
            return index < p.stage ? 1 : index === p.stage ? 0 : -1;
        }

        function renderStageIcon(index: number) {
            const state = stageState(index);
            if (state === 1) {
                return <span class="f-publish-panel-stage-icon f-publish-panel-stage-icon--done">✓</span>;
            }
            if (state === 0) {
                const isFail = isFailed.value && progress.value!.stage === index;
                return isFail
                    ? <span class="f-publish-panel-stage-icon f-publish-panel-stage-icon--fail">✗</span>
                    : <span class="f-publish-panel-stage-icon f-publish-panel-stage-icon--current f-publish-spinner"></span>;
            }
            return <span class="f-publish-panel-stage-icon"></span>;
        }

        return () => {
            if (!props.visible) return null;
            const p = progress.value;
            return (
                <div class="f-publish-panel-mask">
                    <div class="f-publish-panel">
                        <div class={`f-publish-panel-title${isFailed.value ? ' f-publish-panel-title--fail' : ''}`}>
                            {title.value}
                        </div>
                        {isPublishing.value && (
                            <div class="f-publish-panel-progress">
                                <div class="f-publish-panel-progress-bar">
                                    <div class="f-publish-panel-progress-fill" style={`width: ${p?.process ?? 0}%`}></div>
                                </div>
                            </div>
                        )}
                        <div class="f-publish-panel-stages">
                            {PUBLISH_STAGES.map((stageText, index) => (
                                <div class="f-publish-panel-stage" key={index}>
                                    {renderStageIcon(index)}
                                    <span class="f-publish-panel-stage-text">{stageText}</span>
                                </div>
                            ))}
                        </div>
                        {isFailed.value && p?.errorMsg && (
                            <div class="f-publish-panel-error">
                                <div class="f-publish-panel-error-title">错误信息</div>
                                <div class="f-publish-panel-error-text">{p.errorMsg}</div>
                            </div>
                        )}
                        <div class="f-publish-panel-footer">
                            {showClose.value && (
                                <button class="f-publish-panel-close-btn" onClick={() => props.onClose?.()}>
                                    关闭
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        };
    },
});
