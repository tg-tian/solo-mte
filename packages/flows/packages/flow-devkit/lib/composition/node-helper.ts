import type { NodeDefinition } from '../types/node-definition';
import { nodeRegistry } from './node-registry';

/**
 * 快速注册节点
 */
export function registerNode(def: NodeDefinition) {
  nodeRegistry.register(def);
}

/**
 * 快速批量注册节点
 */
export function registerNodes(defs: NodeDefinition[]) {
  nodeRegistry.registerMultiple(defs);
}
