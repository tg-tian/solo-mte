import { ref, defineComponent, watch, computed, provide, type CSSProperties } from "vue";
import { FlowView } from '../flow-view';
import { TemplateSearch } from '../template-search';
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

        const showCloseButton = false;

        function renderLoadingMask() {
            return (
                <div class={css['mask']} style={maskStyle.value}>
                    <div class={css['loading']}>
                        <div class="f-loading-round"></div>
                    </div>
                </div>
            );
        }

        function renderPageHeader() {
            return (
                <div class="f-page-header">
                    <nav class="f-page-header-base">
                        <div class="f-title">
                            <span class="f-title-icon f-text-orna-bill">
                                <i class="f-icon f-icon-page-title-record"></i>
                            </span>
                            <h4 class="f-title-text">事件驱动流</h4>
                        </div>
                        <div class={css['f-page-header__right']}>
                            <TemplateSearch />
                            <div class={css['f-page-header__divider']}></div>
                            <button class="btn f-rt-btn f-btn-ml btn-secondary" onClick={onSave}>保存</button>
                            {showCloseButton && <button class="btn f-rt-btn f-btn-ml btn-secondary" onClick={closeMenu}>关闭</button>}
                        </div>
                    </nav>
                </div>
            );
        }

        function renderFullPage() {
            return (
                <div class={[css['flow-designer'], css['full-page']]}>
                    <div class="f-page f-page-navigate">
                        {renderPageHeader()}
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
