import { type Ref, type InjectionKey, inject, computed, provide } from 'vue';
import type { FlowNodeInstance, Parameter } from '@farris/flow-devkit/types';
import { useNodeId } from './use-node-id';
import { NODE_OUTPUT_PARAMS_KEY, NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY } from '@farris/flow-devkit/constants';

export interface NodeVariables {
    /** 所属节点 */
    node: FlowNodeInstance;
    /** 输出参数列表 */
    params: Parameter[];
}

/** 节点ID到节点的所有前序节点的映射 */
export const NODE_PREDECESSORS_KEY: InjectionKey<Map<string, FlowNodeInstance[]>> = Symbol('NodePredecessors');
/** 节点ID到节点的所有祖先节点ID集合的映射 */
export const NODE_PARENTIDS_KEY: InjectionKey<Map<string, Set<string>>> = Symbol('NodeParentIds');

function useNodeVariables(writableOnly?: boolean): Ref<NodeVariables[]> {
    const nodeId = useNodeId();
    const nodePredecessorMap = inject(NODE_PREDECESSORS_KEY)!;
    const nodeParentIdsMap = inject(NODE_PARENTIDS_KEY)!;

    const nodeVariables = computed<NodeVariables[]>(() => {
        const nodes = nodePredecessorMap.get(nodeId.value);
        if (!nodes) {
            return [];
        }
        return nodes.map((node) => {
            const nodeData = node.data;
            const isParentNode = nodeParentIdsMap.get(nodeId.value)?.has(node.id);
            const outputParams = nodeData[NODE_OUTPUT_PARAMS_KEY] as Parameter[];
            const outputParamsForChildNodes = nodeData[NODE_OUTPUT_PARAMS_FOR_CHILD_NODES_KEY] as Parameter[];
            const allParams = isParentNode ? outputParamsForChildNodes : outputParams;
            const params = writableOnly ? allParams.filter(param => param.writable !== false) : allParams;
            return { node, params };
        });
    });
    return nodeVariables;
}

const NODE_VARIABLES_KEY: InjectionKey<Ref<NodeVariables[]>> = Symbol('NodeVariables');
const WRITABLE_NODE_VARIABLES_KEY: InjectionKey<Ref<NodeVariables[]>> = Symbol('WritableNodeVariables');

export function provideNodeVariables(): {
    nodeVariables: Ref<NodeVariables[]>;
    writableNodeVariables: Ref<NodeVariables[]>;
} {
    const nodeVariables = useNodeVariables();
    const writableNodeVariables = useNodeVariables(true);
    provide(NODE_VARIABLES_KEY, nodeVariables);
    provide(WRITABLE_NODE_VARIABLES_KEY, writableNodeVariables);
    return { nodeVariables, writableNodeVariables };
}

/**
 * 获取可引用的节点变量列表
 */
export function getNodeVariables(): Ref<NodeVariables[]> {
    return inject(NODE_VARIABLES_KEY)!;
}

/**
 * 获取可引用且可写入的节点变量列表
 */
export function getWritableNodeVariables(): Ref<NodeVariables[]> {
    return inject(WRITABLE_NODE_VARIABLES_KEY)!;
}
