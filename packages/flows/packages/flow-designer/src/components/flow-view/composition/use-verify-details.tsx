import { useVueFlow } from '@vue-flow/core';
import { nodeRegistry, NODE_VALIDATION_DETAILS_KEY, type NodeValidationDetails, type NodeData, type NodeMetadata } from '@farris/flow-devkit';
import { VerifyDetails, type ChecklistItem } from '@flow-designer/components/verify-details';
import { computed, ref, provide } from 'vue';
import type { UseNodePropertyPanel } from './types';
import { VERIFY_DETAILS_PANEL_KEY } from '@flow-designer/hooks';

export function useVerifyDetails(
    nodePropertyPanelComposition: UseNodePropertyPanel,
) {
    const {
        nodes: allNodes,
        setViewport,
    } = useVueFlow();

    const verifyDetailsRef = ref();

    function isNodeForbidDuplicateName(nodeMeta?: NodeMetadata): boolean {
        return nodeMeta?.canRename !== false;
    }

    const checklist = computed<ChecklistItem[]>(() => {
        const list: ChecklistItem[] = [];
        allNodes.value.forEach((node) => {
            const nodeData = node.data as NodeData;
            const nodeName = nodeData.name;
            const sameNameNodes = allNodes.value.filter(n => n.data.name === nodeName);
            const validationDetails = nodeData[NODE_VALIDATION_DETAILS_KEY] as NodeValidationDetails;
            const nodeId = node.id;
            const nodeType = node.type;
            const nodeMeta = nodeRegistry.getNodeMetadata(nodeType);
            const nodeIcon = nodeMeta?.icon;
            const newItem: ChecklistItem = {
                id: nodeId,
                icon: nodeIcon,
                name: nodeData.name || nodeMeta?.label || '',
                errors: [],
            };
            if (sameNameNodes.length > 1 && isNodeForbidDuplicateName(nodeMeta)) {
                newItem.errors.push({ message: `节点名称不可重复` });
            }
            (validationDetails?.errors || []).forEach((error) => {
                newItem.errors.push({ ...error });
            });
            if (newItem.errors.length) {
                list.push(newItem);
            }
        });
        return list;
    });

    function getViewportElement(): HTMLElement {
        return document.querySelector(`.vue-flow__viewport.vue-flow__container`)!;
    }

    function handleItemClick(item: ChecklistItem): void {
        const nodeId = item?.id;
        if (!nodeId) {
            return;
        }
        const targetNode = allNodes.value.find((node) => node.id === nodeId);
        if (!targetNode) {
            return;
        }
        const { x: nodeX, y: nodeY } = targetNode.computedPosition;
        const { width, height } = targetNode.dimensions;
        const nodeCenterX = nodeX + width / 2;
        const nodeCenterY = nodeY + height / 2;
        const viewportElement = getViewportElement();
        if (!viewportElement) {
            return;
        }
        const { clientWidth, clientHeight } = viewportElement;
        nodePropertyPanelComposition.open(nodeId);
        setViewport({
            x: clientWidth / 2 - nodeCenterX,
            y: clientHeight / 2 - nodeCenterY,
            zoom: 1,
        }, { duration: 300 });
    }

    function showVerifyDetails(): void {
        verifyDetailsRef.value?.show();
    }

    function hideVerifyDetails(): void {
        verifyDetailsRef.value?.hide();
    }

    function renderVerifyDetails() {
        if (checklist.value.length === 0) {
            return;
        }
        return (
            <VerifyDetails
                ref={verifyDetailsRef}
                list={checklist.value}
                onItemClick={handleItemClick}
            />
        );
    }

    function provideVerifyDetailsPanel(): void {
        provide(VERIFY_DETAILS_PANEL_KEY, {
            show: showVerifyDetails,
            hide: hideVerifyDetails,
        });
    }

    provideVerifyDetailsPanel();

    return {
        checklist,
        showVerifyDetails,
        hideVerifyDetails,
        renderVerifyDetails,
    };
}
