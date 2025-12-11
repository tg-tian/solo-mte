import { inject, provide, type InjectionKey } from 'vue';

export interface NodeDebugHandler {
  openDebugDrawer: (nodeData: any) => void;
  executeDebug: (debugData: any) => void;
}

export const NODE_DEBUG_KEY: InjectionKey<NodeDebugHandler> = Symbol('node-debug');

export function provideNodeDebug(handler: NodeDebugHandler) {
  provide(NODE_DEBUG_KEY, handler);
}

export function useNodeDebug(): NodeDebugHandler | null {
  return inject(NODE_DEBUG_KEY, null);
}
