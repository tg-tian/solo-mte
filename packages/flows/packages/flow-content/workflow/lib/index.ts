import type { FlowRegistry, NodeDefinition, WithComponentRegister } from '@farris/flow-devkit';
import { BuiltinNodeType } from '@farris/flow-devkit';
import {
  LLM_NODE,
  KNOWLEDGE_BASE_NODE,
  INTENT_CLASSIFIER_NODE,
  FILE_EXTRACTOR_NODE,
  RPC_NODE,
  TOOL_NODE,
  AGENT_NODE,
  MCP_NODE,
  HTTP_REQUEST_NODE,
  TEMPLATE_CONVERTER_NODE,
} from './nodes';
import {
  SystemPromptEditor,
  UserPromptEditor,
  ModelSelector,
  KnowledgeSelector,
  IntentClassifierEditor,
  RpcFormEditor,
  RpcSelector,
  ToolSelector,
  AgentSelector,
  McpSelector,
  RequestParams,
  RequestBody,
  HttpParams,
  ApiConfig,
} from './components/editors';
import { getPropertyPanelConfig } from './property-config';
import { CustomNodeType } from './types/node-type';

export const NODES: NodeDefinition[] = [
  LLM_NODE,
  KNOWLEDGE_BASE_NODE,
  INTENT_CLASSIFIER_NODE,
  FILE_EXTRACTOR_NODE,
  RPC_NODE,
  TOOL_NODE,
  AGENT_NODE,
  MCP_NODE,
  HTTP_REQUEST_NODE,
  TEMPLATE_CONVERTER_NODE,
];

export const componentRegistries: WithComponentRegister<any>[] = [
  SystemPromptEditor,
  UserPromptEditor,
  KnowledgeSelector,
  ModelSelector,
  IntentClassifierEditor,
  RpcFormEditor,
  RpcSelector,
  ToolSelector,
  AgentSelector,
  McpSelector,
  RequestParams,
  RequestBody,
  HttpParams,
  ApiConfig,
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
      BuiltinNodeType.MethodInvoke,
      BuiltinNodeType.End,
    ],
  }],
};
