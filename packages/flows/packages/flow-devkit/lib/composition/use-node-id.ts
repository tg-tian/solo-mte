import { type InjectionKey, inject, type Ref } from 'vue';

export const USE_NODE_ID_KEY: InjectionKey<Ref<string>> = Symbol('UseNodeId');

export function useNodeId(): Ref<string> {
    return inject(USE_NODE_ID_KEY)!;
}
