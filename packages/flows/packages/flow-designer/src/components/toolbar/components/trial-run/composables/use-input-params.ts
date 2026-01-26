import { ref, onMounted } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { InputParam, ParamType } from '../types';
import {
  nodeRegistry,
  useTypeDetails,
  type FlowNodeInstance,
  type NodeData,
  type TypeRefer,
} from '@farris/flow-devkit';

type TrialRunPanelTab = 'input' | 'result';

interface ParamTypeInfo {
  type: ParamType;
  multiple: boolean;
}

/** 旧参数列表，用于保存用户输入的值 */
let oldInputParams: InputParam[] = [];

export function useInputParams() {
  /** 控制运行状态 */
  const isRunning = ref(false);

  /** 标签页状态 */
  const activeTab = ref<TrialRunPanelTab>('input');

  /** 输入参数列表 */
  const inputParams = ref<InputParam[]>([]);

  /** 运行结果数据 */
  const runResult = ref('');

  const { nodes: allNodes } = useVueFlow();
  const { isListType } = useTypeDetails();

  function getStartNode(): FlowNodeInstance | undefined {
    const startNode = allNodes.value.find(node => {
      const nodeMeta = nodeRegistry.getNodeMetadata(node.type);
      return nodeMeta?.isStartNode;
    }) as any as FlowNodeInstance;
    return startNode;
  }

  /** 获取开始节点数据 */
  function getStartNodeInfo(): NodeData | undefined {
    return getStartNode()?.data;
  }

  /** 开始节点的数据 */
  const startNodeData = ref<NodeData | undefined>(getStartNodeInfo());

  function getDefaultValueByParamType(paramType: ParamType): any {
    switch (paramType) {
      case 'boolean':
        return false;
      case 'object':
      case 'array':
        return '';
      case 'fileID':
        return [];
      default:
        return null;
    }
  }

  function getParamTypeInfo(type?: TypeRefer): ParamTypeInfo {
    const defaultResult: ParamTypeInfo = { type: 'string', multiple: false };
    if (!type) {
      return defaultResult;
    }
    if (isListType(type)) {
      const listItemType = type.genericTypes?.[0];
      if (listItemType && listItemType.typeId === 'fileID' && listItemType.source === 'default') {
        return { type: 'fileID', multiple: true };
      } else {
        return { type: 'array', multiple: false };
      }
    }
    if (type.source !== 'default') {
      return defaultResult;
    }
    const typeId = type.typeId || 'string';
    switch (typeId) {
      case 'string':
        return { type: 'string', multiple: false };
      case 'number':
      case 'int':
        return { type: 'number', multiple: false };
      case 'boolean':
        return { type: 'boolean', multiple: false };
      case 'fileID':
        return { type: 'fileID', multiple: false };
      case 'any':
        return { type: 'object', multiple: false };
      case 'array':
        return { type: 'array', multiple: false };
      default:
        return defaultResult;
    }
  }

  // 获取所有需要用户输入的参数
  function getAllRequiredInputParams(): Array<InputParam> {
    const paramMap = new Map<string, InputParam>();

    // 处理开始节点的参数
    const startNode = getStartNode();
    const startNodeParams = startNode?.data?.inputParams;
    if (Array.isArray(startNodeParams) === false) {
      return [];
    }
    startNodeParams.forEach((param) => {
      if (!param || !param.code || !param.type) {
        return;
      }
      // 排除`USER_INPUT`和`USER_FILES`参数，这些是绑定到用户输入的
      if (param.code === 'USER_INPUT' || param.code === 'USER_FILES') {
        return;
      }
      const { type: paramType, multiple } = getParamTypeInfo(param.type);

      const paramInfo: InputParam = {
        name: param.code,
        label: (param.name || '').trim() || param.code,
        type: paramType,
        value: getDefaultValueByParamType(paramType),
        required: param.required || false,
        description: param.description,
        multiple: multiple || false,
        raw: param,
      };

      // 根据参数名去重
      paramMap.set(param.code, paramInfo);
    });

    return Array.from(paramMap.values());
  }

  function isSameParamType(paramA: InputParam, paramB: InputParam): boolean {
    return !!paramA && !!paramB && paramA.type === paramB.type && paramA.multiple === paramB.multiple;
  }

  function initializeInputParams() {
    const allRequiredParams = getAllRequiredInputParams();
    const paramName2OldParam = new Map<string, InputParam>();
    oldInputParams.forEach(param => {
      paramName2OldParam.set(param.name, param);
    });
    allRequiredParams.forEach(param => {
      const oldParam = paramName2OldParam.get(param.name);
      if (oldParam && isSameParamType(oldParam, param)) {
        param.value = oldParam.value;
      }
    });
    inputParams.value = allRequiredParams;
    oldInputParams = allRequiredParams;
  }

  // 组件挂载时初始化数据
  onMounted(() => {
    startNodeData.value = getStartNodeInfo();
    initializeInputParams();
  });

  // 更新输入参数值
  function updateParamValue(index: number, value: any) {
    inputParams.value[index].value = value;
  }

  // 检查是否所有必填参数都已填写
  function checkRequiredParams(): boolean {
    return inputParams.value.every(param => {
      if (!param.required) {
        return true;
      }

      // 对于不同类型的参数，进行不同的检查
      switch (param.type) {
        case 'boolean':
          // 布尔值总是有值（true/false）
          return true;
        case 'fileID':
          // 文件必须有有效的metadataId
          if (param.type === 'fileID') {
            // 多文件：至少有一个文件有metadataId
            if (!Array.isArray(param.value) || param.value.length === 0) {
              return false;
            }
            return param.value.some((file: any) => file && file.metadataId);
          } else {
            // 单文件：必须有metadataId
            const fileInfo = param.value as any;
            return fileInfo && fileInfo.metadataId;
          }
        case 'object':
        case 'array':
          // JSON对象/数组必须有效且不为空
          if (!param.value || !param.value.trim()) {
            return false;
          }
          try {
            JSON.parse(param.value);
            return !param.jsonError;
          } catch {
            return false;
          }
        default:
          // 字符串和数字必须有值
          return param.value !== null && param.value !== undefined && param.value.toString().trim() !== '';
      }
    });
  }

  function setActiveTab(tab: TrialRunPanelTab) {
    activeTab.value = tab;
  }

  return {
    isRunning,
    activeTab,
    runResult,
    inputParams,
    startNodeData,
    getStartNodeInfo,
    updateParamValue,
    checkRequiredParams,
    setActiveTab,
  };
}
