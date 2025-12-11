<script setup lang="ts">
import { FlowDesigner } from '@farris/flow-designer';
import { FLOW_REGISTRY } from '../lib';
import { MOCK_FLOW_METADATA } from './mock-data';
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
} from '../../workflow/lib/nodes';
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
} from '../../workflow/lib/components/editors';

const WORKFLOW_NODES = [
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

const WORKFLOW_COMPONENTS = [
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

FLOW_REGISTRY.nodes = [...WORKFLOW_NODES, ...FLOW_REGISTRY.nodes];
FLOW_REGISTRY.componentRegistries = [...WORKFLOW_COMPONENTS, ...(FLOW_REGISTRY.componentRegistries || [])];

</script>

<template>
  <FlowDesigner :flowRegistry="FLOW_REGISTRY" :flowMetadata="MOCK_FLOW_METADATA"></FlowDesigner>
</template>

<style scoped></style>
