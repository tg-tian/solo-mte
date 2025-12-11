import { ref, watch, onMounted } from 'vue';
import { useVueFlow } from '@vue-flow/core';
import type { InputParam, ParamType } from '../types';

export function useInputParams() {
  // 控制运行状态
  const isRunning = ref(false);

  // 标签页状态
  const activeTab = ref('input'); // input, result

  // 输入参数列表
  const inputParams = ref<InputParam[]>([]);

  // 运行结果数据
  const runResult = ref('');

  // 获取Vue Flow实例
  const { nodes: allNodes } = useVueFlow();

  // 获取start节点信息
  function getStartNodeInfo() {
    // 使用Vue Flow的nodes响应式数据获取画布中的节点
    const nodes = allNodes.value;
    if (!nodes || nodes.length === 0) {
      return null;
    }

    // 查找类型为'start'的节点
    const startNode = nodes.find(node => node.data?.kind === 'start');
    return startNode?.data || null; // 返回节点的data属性
  }

  // 检测参数配置变化（类型变化时清空对应参数值）
  function checkAndClearModifiedParamValues(newStartNode: any, oldStartNode: any) {
    if (!newStartNode?.inputParams || !oldStartNode?.inputParams) {
      return;
    }

    const newParams = newStartNode.inputParams;
    const oldParams = oldStartNode.inputParams;

    // 创建参数映射，以参数名为键
    const oldParamsMap = new Map();
    oldParams.forEach((param: any) => {
      if (param && param.code) {
        oldParamsMap.set(param.code, param);
      }
    });

    // 检查每个新参数的类型变化
    newParams.forEach((newParam: any) => {
      if (!newParam || !newParam.code) {
        return;
      }

      const oldParam = oldParamsMap.get(newParam.code);
      if (oldParam) {
        // 检查参数类型是否变化
        const oldTypeId = oldParam.type?.typeId || oldParam.type || 'string';
        const newTypeId = newParam.type?.typeId || newParam.type || 'string';

        if (oldTypeId !== newTypeId) {
          // 参数类型变化，清空对应的输入参数值
          const inputParamIndex = inputParams.value.findIndex(p => p.name === newParam.code);
          if (inputParamIndex !== -1) {
            // 根据新类型设置默认值
            let defaultValue: any;
            const newParamType = getParamTypeFromTypeId(newTypeId);

            switch (newParamType) {
              case 'boolean':
                defaultValue = false;
                break;
              case 'object':
              case 'array':
                defaultValue = '';
                break;
              case 'fileID':
                defaultValue = [];
                break;
              default:
                defaultValue = null;
            }

            inputParams.value[inputParamIndex].value = defaultValue;
          }
        }
      }
    });
  }

  // 根据typeId获取参数类型
  function getParamTypeFromTypeId(typeId: string): 'string' | 'number' | 'boolean' | 'fileID' | 'object' | 'array' {
    switch (typeId) {
      case 'string':
        return 'string';
      case 'number':
      case 'int':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'fileID':
        return 'fileID';
      case 'object':
        return 'object';
      case 'array':
        return 'array';
      case 'list':
        return 'array';
      default:
        return 'string';
    }
  }

  // 监听画布节点数组的变化
  watch(
    allNodes,
    (newNodes, oldNodes) => {
      // 查找开始节点
      const newStartNode = newNodes.find(node => node.data?.kind === 'start');
      const oldStartNode = oldNodes?.find(node => node.data?.kind === 'start');

      if (!newStartNode && !newNodes?.some(node => node.data?.inputParams)) {
        return;
      }

      // 检查start节点参数类型变化并清空对应值
      if (oldStartNode && newStartNode) {
        checkAndClearModifiedParamValues(newStartNode.data, oldStartNode.data);
      }

      // 获取所有需要输入的参数配置用于比较
      const currentAllParams = getAllRequiredInputParams();
      const currentParamsStr = JSON.stringify(currentAllParams.map(param => ({
        name: param.name,
        type: param.type,
        required: param.required,
        description: param.description,
        sourceNode: param.sourceNode
      })));

      const previousParamsStr = JSON.stringify(inputParams.value.map(param => ({
        name: param.name,
        type: param.type,
        required: param.required,
        description: param.description
      })));

      // 如果参数配置发生变化，重新初始化
      if (currentParamsStr !== previousParamsStr) {
        initializeInputParams();
      }
    },
    {
      deep: true, // 深度监听节点数组变化
    }
  );

  // 获取所有需要用户输入的参数
  function getAllRequiredInputParams(): Array<{name: string, label: string, type: ParamType, value: any, required: boolean, description: string, sourceNode?: string, multiple?: boolean}> {
    const requiredParams: Array<{name: string, label: string, type: ParamType, value: any, required: boolean, description: string, sourceNode?: string, multiple?: boolean}> = [];
    
    const nodes = allNodes.value;
    if (!nodes || nodes.length === 0) {
      return requiredParams;
    }

    // 用于去重的映射，key为参数名，value为参数信息
    const paramMap = new Map<string, {name: string, label: string, type: ParamType, value: any, required: boolean, description: string, sourceNode?: string, multiple?: boolean}>();

    
    // 处理start节点的参数
    const startNode = nodes.find(node => node.data?.kind === 'start');
    if (startNode?.data?.inputParams && Array.isArray(startNode.data.inputParams)) {
      startNode.data.inputParams.forEach((param: any) => {
        if (param && param.code && param.type) {
          // 排除USER_INPUT和USER_FILES参数，这些是绑定到用户输入的
          if (param.code === 'USER_INPUT' || param.code === 'USER_FILES') {
            return;
          }

          let paramType: ParamType = 'string';
          const typeId = param.type.typeId || 'string';
          let multiple = false;

          // 根据typeId映射到输入类型
          switch (typeId) {
            case 'string': paramType = 'string'; break;
            case 'number':
            case 'int': paramType = 'number'; break;
            case 'boolean': paramType = 'boolean'; break;
            case 'fileID': paramType = 'fileID'; break;
            case 'object': paramType = 'object'; break;
            case 'array': paramType = 'array'; break;
            case 'list':
              if (param.type?.genericTypes?.length > 0 && param.type.genericTypes[0].typeId === 'fileID') {
                paramType = 'fileID';
                multiple = true;
              } else {
                paramType = 'array';
              }
              break;
            default: paramType = 'string';
          }

          let defaultValue: any;
          if (paramType === 'boolean') {
            defaultValue = false;
          } else if (paramType === 'object' || paramType === 'array') {
            defaultValue = '';
          } else if (paramType === 'fileID') {
            defaultValue = [];
          } else {
            defaultValue = null;
          }

          const paramInfo = {
            name: param.code,
            label: param.description || param.code,
            type: paramType,
            value: defaultValue,
            required: param.required || false,
            description: param.description,
            sourceNode: 'start',
            multiple: multiple || false,
          };

          // 使用参数名作为key进行去重
          paramMap.set(param.code, paramInfo);
        }
      });
    }

    // 将map转换为数组
    const result = Array.from(paramMap.values());
    return result.map(item => ({
      ...item,
      type: item.type as ParamType,
      multiple: item.multiple || false,
    }));
  }

  // 初始化输入参数，从start节点读取inputParams
  function initializeInputParams() {
    const allRequiredParams = getAllRequiredInputParams();

    // 保存当前已输入的值（如果参数名匹配）
    const existingValues = new Map();
    inputParams.value.forEach(param => {
      existingValues.set(param.name, param.value);
    });

    // 清空现有参数
    inputParams.value = [];

    // 重新创建参数列表
    allRequiredParams.forEach((param) => {
      // 优先使用之前输入的值，如果没有则使用默认值
      let defaultValue = existingValues.get(param.name);
      if (defaultValue === undefined) {
        defaultValue = param.value;
      }

      inputParams.value.push({
        name: param.name,
        label: param.label,
        type: param.type,
        value: defaultValue,
        required: param.required,
        description: param.description,
        multiple: param.multiple || false,
      });
    });
  }

  // 组件挂载时初始化数据
  onMounted(() => {
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

  return {
    isRunning,
    activeTab,
    runResult,
    inputParams,
    getStartNodeInfo,
    updateParamValue,
    checkRequiredParams,
    setActiveTab: (tab: string) => { activeTab.value = tab; }
  };
}