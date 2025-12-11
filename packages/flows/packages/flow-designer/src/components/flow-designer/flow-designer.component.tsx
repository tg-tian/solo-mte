import { ref, defineComponent, watch, computed, provide, type CSSProperties } from "vue";
import { FlowView } from '../flow-view';
import { flowDesignerProps } from './flow-designer.props';
import { throttle } from "lodash-es";
import { useSubFlowCanvasRegistry } from "@farris/flow-devkit";
import { useFlowMetadata, useAllNodePortsRegistry, useMenu, useCanvasMask, FLOW_DESIGNER_PROPS_KEY } from '@flow-designer/hooks';

import './vue-flow.scss';
import './global.scss';
import css from './flow-designer.module.scss';

export default defineComponent({
    name: 'FlowDesigner',
    props: flowDesignerProps,
    emits: [],
    setup(props) {
        provide(FLOW_DESIGNER_PROPS_KEY, props);
        const {
            isLoaded,
            isReady,
            flowRegistry,
            saveFlowMetadata,
        } = useFlowMetadata(props);

        useAllNodePortsRegistry();
        useSubFlowCanvasRegistry();
        const { closeMenu } = useMenu();

        const {
            shouldShowCanvasMask,
            maskOpacity,
        } = useCanvasMask();

        const shouldRenderMask = computed<boolean>(() => {
            return shouldShowCanvasMask.value || !isReady.value;
        });
        const maskStyle = computed<CSSProperties>(() => ({
            backgroundColor: `rgba(var(--mask-bg-rgb), ${maskOpacity.value})`,
        }));

        const shouldRenderFullPage = computed<boolean>(() => {
            return props.mode === 'full';
        });

        const onSave = throttle(() => {
            saveFlowMetadata();
        }, 500, {
            leading: true,
            trailing: false,
        });

        const toolbarItems = [
            { id: 'save', text: '保存', onClick: onSave },
            { id: 'close', text: '关闭', onClick: closeMenu },
        ];

        const pageTitle = ref<string>('流程编排');

        function init(): void {
            if (!isLoaded.value) {
                return;
            }
            const flow = flowRegistry.value!;
            if (flow.name) {
                pageTitle.value = flow.name;
            }
        }

        watch(isLoaded, init, { immediate: true });

        function renderLoadingMask() {
            return (
                <div class={css['mask']} style={maskStyle.value}>
                    <div class={css['loading']}>
                        <div class="f-loading-round"></div>
                    </div>
                </div>
            );
        }

        function renderFullPage() {
            return (
                <div class={[css['flow-designer'], css['full-page']]}>
                    <div class="f-page f-page-navigate">
                        <f-page-header title={pageTitle.value} buttons={toolbarItems}></f-page-header>
                        <div class="f-page-main">
                            {isLoaded.value && (
                                <FlowView />
                            )}
                            {shouldRenderMask.value && renderLoadingMask()}
                        </div>
                    </div>
                </div>
            );
        }

        function renderFlowViewOnly() {
            return (
                <div class={css['flow-designer']}>
                    {isLoaded.value && (
                        <FlowView />
                    )}
                    {shouldRenderMask.value && renderLoadingMask()}
                </div>
            );
        }

        return () => shouldRenderFullPage.value
            ? renderFullPage()
            : renderFlowViewOnly();
    }
});
