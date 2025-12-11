import { type FlowRegistry, BasicTypeRefer } from '@farris/flow-devkit';
import { BuiltinNodeType } from '@farris/flow-devkit';
import { getPropertyPanelConfig } from './property-config';
import { CustomNodeType } from './types/node-type';

export const FLOW_REGISTRY: FlowRegistry = {
  name: '对话流',
  nodes: [],
  componentRegistries: [],
  getPropertyPanelConfig,
  initialData: () => {
    return {
      nodes: [{
        id: 'start',
        kind: BuiltinNodeType.Start,
        code: 'start',
        name: '开始',
        description: '',
        inputParams: [{
          code: 'USER_INPUT',
          type: BasicTypeRefer.StringType,
          readOnly: true,
        }, {
          code: 'USER_FILES',
          type: BasicTypeRefer.FileArrayType,
          readOnly: true,
        }],
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
    label: '基础节点',
    nodeTypes: [
      CustomNodeType.LLM,
      CustomNodeType.KnowledgeBase,
      CustomNodeType.IntendClassification,
      CustomNodeType.DocumentExtractor,
      CustomNodeType.RPC,
      CustomNodeType.Tool,
      CustomNodeType.Agent,
      CustomNodeType.MCP,
      CustomNodeType.HttpRequest,
      CustomNodeType.TemplateConverter,
    ],
  }, {
    label: '业务逻辑',
    nodeTypes: [
      BuiltinNodeType.Selector,
      BuiltinNodeType.Loop,
      BuiltinNodeType.VariableDef,
      BuiltinNodeType.VariableAssign,
      BuiltinNodeType.End,
    ],
  }],
};
