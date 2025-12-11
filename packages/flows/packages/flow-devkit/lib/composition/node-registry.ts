import { reactive, computed, type Ref } from 'vue';
import type { NodeDefinition, NodeMetadata } from '../types/node-definition';

class NodeRegistry {

  private nodes = reactive(new Map<string, NodeDefinition>());

  private allNodeDefinitions = computed<NodeDefinition[]>(() => {
    return Array.from(this.nodes.values());
  });

  /** 注册单个节点 */
  register(node: NodeDefinition): void {
    const { type } = node.metadata;
    if (this.nodes.has(type)) {
      console.warn(`节点类型 ${type} 已存在，将被覆盖`);
    }
    this.nodes.set(type, node);
  }

  /** 批量注册节点 */
  registerMultiple(nodes: NodeDefinition[]): void {
    nodes.forEach(node => this.register(node));
  }

  /** 获取节点定义 */
  get(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  /** 获取节点配置信息 */
  getNodeMetadata(type: string): NodeMetadata | undefined {
    const nodeDef = this.get(type);
    return nodeDef?.metadata;
  }

  /** 获取所有节点类型 */
  getAllTypes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * 是否容器节点
   * @param nodeType 节点类型
   */
  isContainerNode(nodeType: string): boolean {
    const nodeMeta = this.getNodeMetadata(nodeType);
    return !!nodeMeta?.isSubFlowContainer;
  }

  /**
   * 获取全部节点定义
   */
  getAllNodeDefinitions(): Ref<NodeDefinition[]> {
    return this.allNodeDefinitions;
  }

}

// 单例导出
export const nodeRegistry = new NodeRegistry();
