import { computed, ref, watch, provide, type CSSProperties, defineComponent, type PropType, type Ref } from 'vue';
import { FlowPropertyPanel, type PanelShowMode } from '@flow-designer/components/property-panel';
import { useVueFlow, type GraphNode } from '@vue-flow/core';
import { nodeRegistry, PROPERTY_PANEL_KEY, provideNodeVariables } from '@farris/flow-devkit';
import type { NodeDefinition, NodeMetadata, FlowNodeInstance, NodeData } from '@farris/flow-devkit';
import { NODE_RENDER_SCENE_KEY, USE_NODE_ID_KEY, USE_NODE_DATA_KEY } from '@farris/flow-devkit';
import type { UseNodePropertyPanel } from './types';
import { useFloatPanelLayout } from '@flow-designer/hooks';

import styles from '../flow-view.module.scss';

const PropertyPanelContextProvider = defineComponent({
    name: 'PropertyPanelContextProvider',
    props: {
        selectedNodeId: {
            type: Object as PropType<Ref<string>>,
            required: true,
        },
        selectedNodeData: {
            type: Object as PropType<Ref<NodeData>>,
            required: true,
        },
    },
    setup(props, context) {
        provide(NODE_RENDER_SCENE_KEY, 'property-panel');
        provide(USE_NODE_ID_KEY, props.selectedNodeId);
        provide(USE_NODE_DATA_KEY, props.selectedNodeData);
        return () => context.slots.default?.();
    },
});

const NodeContextProvider = defineComponent({
    name: 'NodeContextProvider',
    props: {},
    setup(_props, context) {
        provideNodeVariables();
        return () => context.slots.default?.();
    },
});

export function useNodePropertyPanel(): UseNodePropertyPanel {

    const {
        getSelectedNodes,
        nodes: allNodes,
        onNodeClick,
    } = useVueFlow();

    const isShow = ref(true);
    const propertyPanelInstance = ref();
    const panelShowMode = ref<PanelShowMode>('panel');

    const selectedNode = computed<GraphNode | undefined>(() => {
        const selectedNodes = getSelectedNodes.value;
        if (selectedNodes.length === 1) {
            return selectedNodes[0];
        }
        return undefined;
    });

    const lastClickedNodeId = ref<string>('');

    const selectedNodeId = computed<string>(() => {
        return selectedNode.value?.id || '';
    });

    const selectedNodeData = computed<any>(() => {
        return selectedNode.value?.data;
    });

    const selectedNodeDefinition = computed<NodeDefinition | undefined>(() => {
        const nodeType = selectedNode.value?.type;
        return nodeType ? nodeRegistry.get(nodeType) : undefined;
    });

    const selectedNodeMetadata = computed<NodeMetadata | undefined>(() => {
        return selectedNodeDefinition.value?.metadata;
    });

    const selectedNodeInstance = computed<FlowNodeInstance | undefined>(() => {
        const node = selectedNode.value;
        if (!node) {
            return;
        }
        const metadata = selectedNodeMetadata.value!;
        return {
            ...node,
            metadata,
        };
    });

    const hasPropertyPanel = computed<boolean>(() => {
        const getPropertyPanelConfig = selectedNodeDefinition.value?.getPropertyPanelConfig;
        return typeof getPropertyPanelConfig === 'function';
    });

    function updatePropertyPanel(forceUpdate = true): void {
        const nodeId = selectedNode.value?.id;
        const nodeData = selectedNode.value?.data;
        const getPropertyPanelConfig = selectedNodeDefinition.value?.getPropertyPanelConfig;
        if (!nodeId || !nodeData || !getPropertyPanelConfig) {
            propertyPanelInstance.value.updatePropertyConfig({}, {}, true);
            return;
        }
        const nodeInstance = selectedNodeInstance.value!;
        const propertyConfig = getPropertyPanelConfig(nodeData, nodeInstance);
        propertyPanelInstance.value.updatePropertyConfig(propertyConfig, nodeData, forceUpdate);
    }

    watch([selectedNode], () => {
        updatePropertyPanel();
    });

    watch([selectedNodeData], () => {
        if (!selectedNodeData.value) {
            return;
        }
        updatePropertyPanel(false);
    });

    const shouldShowNodePropertyPanel = computed<boolean>(() => {
        return hasPropertyPanel.value &&
            isShow.value &&
            !!lastClickedNodeId.value &&
            lastClickedNodeId.value === selectedNodeId.value;
    });

    watch(
        shouldShowNodePropertyPanel,
        (newValue, oldValue) => {
            if (!newValue && !!oldValue) {
                lastClickedNodeId.value = '';
            }
        }
    );

    const isShowPanel = computed<boolean>(() => {
        return panelShowMode.value === 'panel';
    });

    const rightPanelWidth = ref<number>(450);

    const PANEL_ID = 'NodePropertyPanel';
    const { currentRightFloatPanelId } = useFloatPanelLayout();
    function renderCurrentPanel() {
        currentRightFloatPanelId.value = PANEL_ID;
    }
    const shouldRenderOtherPanel = computed<boolean>(() => {
        return !!currentRightFloatPanelId.value && currentRightFloatPanelId.value !== PANEL_ID;
    });

    const rightPanelStyle = computed<CSSProperties>(() => ({
        display: (
            shouldShowNodePropertyPanel.value && !shouldRenderOtherPanel.value
        ) ? undefined : 'none',
        width: isShowPanel.value ? `${rightPanelWidth.value}px` : `auto`,
    }));

    function onPropertyChanged(_event: any): void { }

    function onRefreshPanel(): void {
        updatePropertyPanel(false);
    }

    function onUpdateMode(newValue: PanelShowMode): void {
        panelShowMode.value = newValue;
    }

    onNodeClick((event) => {
        isShow.value = true;
        const { node } = event;
        lastClickedNodeId.value = node.id;
        renderCurrentPanel();
    });

    function close(): void {
        isShow.value = false;
    }

    function open(nodeId: string): void {
        allNodes.value.forEach((node) => {
            if (node.id === nodeId) {
                node.selected = true;
            } else {
                node.selected = false;
            }
        });
        isShow.value = true;
        lastClickedNodeId.value = nodeId;
    }

    provide(PROPERTY_PANEL_KEY, {
        open,
        close,
    });

    function renderNodePropertyPanel() {
        return (
            <PropertyPanelContextProvider
                selectedNodeId={selectedNodeId}
                selectedNodeData={selectedNodeData}
            >
                <NodeContextProvider>
                    <div class={styles['right-property-panel']} style={rightPanelStyle.value}>
                        <FlowPropertyPanel
                            ref={propertyPanelInstance}
                            panelWidth="100%"
                            hideHeader={true}
                            mode={panelShowMode.value}
                            onUpdate:mode={onUpdateMode}
                            onPropertyChanged={onPropertyChanged}
                            onRefreshPanel={onRefreshPanel}
                        ></FlowPropertyPanel>
                    </div>
                </NodeContextProvider>
            </PropertyPanelContextProvider>
        );
    }

    return {
        open,
        close,
        renderNodePropertyPanel,
    };
}
