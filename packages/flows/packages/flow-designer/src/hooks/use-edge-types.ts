import { reactive, markRaw, type Component } from 'vue';
import { type EdgeProps } from '@vue-flow/core';
import { CommonEdge } from '@farris/flow-devkit';

const edgeTypes = reactive<Record<string, Component<EdgeProps>>>({
    common: markRaw(CommonEdge),
});

export function useEdgeTypes() {

    function registerCustomEdge(type: string, edgeComponent: Component<EdgeProps>): void {
        if (type && edgeComponent) {
            edgeTypes[type] = markRaw(edgeComponent);
        }
    }

    function registerCustomEdges(edges?: Record<string, Component<EdgeProps>>): void {
        if (!edges || typeof edges !== 'object') {
            return;
        }
        Object.keys(edges).forEach(type => {
            registerCustomEdge(type, edges[type]);
        });
    }

    return {
        edgeTypes,
        registerCustomEdge,
        registerCustomEdges,
    };
}
