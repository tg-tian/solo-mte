import { type FlowRegistry } from '@farris/flow-devkit';
import { BuiltinNodeType } from '@farris/flow-devkit';
import { getPropertyPanelConfig } from './property-config';

export const FLOW_REGISTRY: FlowRegistry = {
  name: '事件驱动流',
  nodes: [],
  componentRegistries: [],
  getPropertyPanelConfig,
  initialData: () => {
    return {
      nodes: [],
    };
  },
  nodeCategories: [{
    label: '基础节点',
    nodeTypes: [
      BuiltinNodeType.Selector,
      BuiltinNodeType.Loop,
      BuiltinNodeType.VariableDef,
      BuiltinNodeType.VariableAssign,
      BuiltinNodeType.End,
    ],
  }],
};
