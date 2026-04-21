import { computed, defineComponent, inject, nextTick } from "vue";
import { VueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Toolbar } from '../toolbar';
import {
    DEFAULT_BACKGROUND_PATTERN_SIZE as bgSize,
    DEFAULT_BACKGROUND_PATTERN_GAP as bgGap,
    DEFAULT_BACKGROUND_PATTERN_COLOR as bgColor,
    CommonEdge,
} from '@farris/flow-devkit';
import {
    useDragNewNode,
    useNodesInteractions,
    useEdgeTypes,
    useNodeTypes,
    useTrialRunPanel,
    useChatflow,
    useLayout,
    useAiChatPanel,
    FLOW_DESIGNER_PROPS_KEY,
} from '@flow-designer/hooks';
import { flowViewProps } from './flow-view.props';
import {
    useNodePropertyPanel,
    useFlowPropertyPanel,
    useNodePredecessors,
    useVerifyDetails,
    useNodeDebug,
} from './composition';
import { HelperLines } from './components';

import styles from './flow-view.module.scss';

export default defineComponent({
    name: 'FlowView',
    props: flowViewProps,
    emits: [],
    setup() {
        const flowDesignerProps = inject(FLOW_DESIGNER_PROPS_KEY)!;
        const { helperLineHorizontal, helperLineVertical } = useNodesInteractions();
        useChatflow();
        const { rebuildNodePredecessorMap } = useNodePredecessors();
        rebuildNodePredecessorMap();

        const nodePropertyPanelComposition = useNodePropertyPanel();
        const { renderNodePropertyPanel } = nodePropertyPanelComposition;

        const { renderFlowPropertyPanel } = useFlowPropertyPanel();
        const { renderVerifyDetails } = useVerifyDetails(nodePropertyPanelComposition);

        const { renderNodeDebugDrawer } = useNodeDebug();
        const { renderTrialRunPanel } = useTrialRunPanel();
        const { layoutAndFitView } = useLayout();

        function afterReloadFlow(): void {
            rebuildNodePredecessorMap();
            nextTick(() => {
                layoutAndFitView();
            });
        }

        const { renderAiChatPanel } = useAiChatPanel(afterReloadFlow);

        const { onDragOver, onDrop, onDragLeave } = useDragNewNode();

        const shouldRenderToolbar = computed<boolean>(() => {
            if (typeof flowDesignerProps.showToolbar === 'boolean') {
                return flowDesignerProps.showToolbar;
            }
            return flowDesignerProps.mode !== 'canvas';
        });
        const shouldRenderFlowDesignerPanel = computed<boolean>(() => {
            if (typeof flowDesignerProps.showFlowPropertyPanel === 'boolean') {
                return flowDesignerProps.showFlowPropertyPanel;
            }
            return flowDesignerProps.mode !== 'canvas';
        });

        const { edgeTypes } = useEdgeTypes();
        const { nodeTypes } = useNodeTypes();

        const vueFlowProps = computed(() => ({
            nodeTypes: nodeTypes.value,
            edgeTypes: edgeTypes,
            applyDefault: false,
            elevateEdgesOnSelect: true,
            deleteKeyCode: ["backspace", "delete"],
        }));

        function renderVueFlow() {
            return (
                <div class={styles['flow-view']} onDrop={onDrop} onDragover={onDragOver} onDragleave={onDragLeave}>
                    <VueFlow {...vueFlowProps.value}>
                        {{
                            'default': () => <>
                                <Background size={bgSize} gap={bgGap} color={bgColor} variant={flowDesignerProps.backgroundVariant} />
                                <HelperLines horizontal={helperLineHorizontal.value} vertical={helperLineVertical.value} />
                            </>,
                            'connection-line': (props: any) => <CommonEdge {...props} />
                        }}
                    </VueFlow>
                </div>
            );
        }

        function renderFloatLayout() {
            return (
                <div class={styles['float-layout']}>
                    <div class={styles['left-panel']}>
                        <div class={styles['left-main-panel']}>
                            {/* 流程属性面板 */}
                            {shouldRenderFlowDesignerPanel.value && renderFlowPropertyPanel()}
                            {/* 下方工具栏 */}
                            {shouldRenderToolbar.value && <Toolbar />}
                        </div>
                        <div class={styles['left-bottom-panel']}>
                        </div>
                        <div class={styles['left-bottom-panel']}></div>
                        {/* 错误列表 */}
                        {renderVerifyDetails()}
                    </div>
                    <div class={styles['right-panel']}>
                        {/* 试运行面板 */}
                        {renderTrialRunPanel()}
                        {/* 节点属性面板 */}
                        {renderNodePropertyPanel()}
                        {/* 单节点调试面板 */}
                        {renderNodeDebugDrawer()}
                        {/* AI 对话面板 - 浮动在属性面板上方 */}
                        {renderAiChatPanel()}
                    </div>
                </div>
            );
        }

        return () => <>
            {renderVueFlow()}
            {renderFloatLayout()}
        </>;
    }
});
