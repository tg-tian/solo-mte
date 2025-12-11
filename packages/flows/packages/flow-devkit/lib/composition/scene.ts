import { type InjectionKey, inject } from 'vue';

export type NodeRenderScene = 'node' | 'property-panel';

export const NODE_RENDER_SCENE_KEY: InjectionKey<NodeRenderScene> = Symbol('NodeRenderScene');

export function useNodeRenderScene() {
    const scene = inject(NODE_RENDER_SCENE_KEY, null);

    return {
        isNode: scene === 'node',
        isPropertyPanel: scene === 'property-panel',
    };
}
