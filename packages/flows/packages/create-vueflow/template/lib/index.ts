import type { FlowRegistry, NodeDefinition, WithComponentRegister } from '@farris/flow-devkit';
import { BuiltinNodeType } from '@farris/flow-devkit';
import { getPropertyPanelConfig } from './property-config';
import { CustomNodeType } from './types';
import {
  INTENT_CLASSIFIER_NODE,
} from './nodes';
import {
  IntentClassifierEditor,
} from './components';

export const NODES: NodeDefinition[] = [
  INTENT_CLASSIFIER_NODE,
];

export const componentRegistries: WithComponentRegister<any>[] = [
  IntentClassifierEditor,
];

export const FLOW_REGISTRY: FlowRegistry = {
  name: '工作流',
  nodes: NODES,
  componentRegistries,
  getPropertyPanelConfig,
  initialData: () => {
    return {
      nodes: [{
        id: 'start',
        kind: BuiltinNodeType.Start,
        code: 'start',
        name: '开始',
        description: '',
        inputParams: [],
        outputParams: [],
        inputPorts: [],
        outputPorts: [],
        graphMeta: {
          position: { x: 0, y: 0 },
        },
      }, {
        id: 'end',
        kind: BuiltinNodeType.End,
        code: 'end',
        name: '结束',
        description: '',
        inputParams: [],
        outputParams: [],
        inputPorts: [],
        outputPorts: [],
        graphMeta: {
          position: { x: 1000, y: 0 },
        },
      }],
    };
  },
  nodeCategories: [{
    label: '示例节点',
    nodeTypes: [
      CustomNodeType.DemoIntendClassification,
    ],
  }, {
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
