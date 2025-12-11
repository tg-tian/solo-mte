import { type InjectionKey, inject, type Ref } from 'vue';
import type { NodeData } from '../types';

export const USE_NODE_DATA_KEY: InjectionKey<Ref<NodeData>> = Symbol('UseNodeData');

export function useNodeData(): Ref<NodeData> {
    return inject(USE_NODE_DATA_KEY)!;
}
