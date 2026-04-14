import { inject } from 'vue';
import { post } from '@flow-designer/api/request';
import { FLOW_METADATA_KEY, useFlowMetadata } from '@flow-designer/hooks';
import type { InputParam } from '../types';

export function useWorkflowApi() {
  const { saveFlowMetadata } = useFlowMetadata();
  // 获取流程元数据
  const flowMetadata = inject(FLOW_METADATA_KEY);

  // 获取工作流ID
  function getWorkflowId(): string {
    if (flowMetadata?.id) {
      return flowMetadata.id;
    }

    // 默认工作流ID
    console.warn('无法获取流程ID，使用默认值');
    return '';
  }

  // 保存流程
  async function saveWorkflow(): Promise<boolean> {
    if (!flowMetadata?.extension) {
      console.warn('无法获取流程元数据，跳过保存');
      return true;  // 如果没有元数据，直接继续试运行
    }

    const isSuccess = await saveFlowMetadata(true);
    return isSuccess;
  }

  function getArgs(params: InputParam[], ignoreEmptyValue: boolean = true) {
    const args = Object.fromEntries(params
      .map(param => {
        let paramValue: any;

        // 根据参数类型处理值
        if (param.type === 'fileID') {
          // 文件参数使用文件接口返回的文件ID
          if (!param.value) {
            return { key: param.name, value: undefined };  // 没有文件时不传递
          }

          if (param.multiple === false) {
            // 单文件：param.value 是 FileInfo 对象
            const fileInfo = param.value as any;
            if (fileInfo && fileInfo.metadataId) {
              paramValue = fileInfo.metadataId;
            } else {
              return { key: param.name, value: undefined };  // 没有metadataId时不传递
            }
          } else {
            // 多文件：param.value 是 FileInfo[] 数组
            const fileInfos = param.value as any[];
            if (Array.isArray(fileInfos) && fileInfos.length > 0) {
              // 提取所有文件的metadataId
              const fileIds = fileInfos
                .filter(file => file && file.metadataId)
                .map(file => file.metadataId);

              if (fileIds.length > 0) {
                paramValue = fileIds;
              } else {
                return { key: param.name, value: undefined };  // 没有有效文件时不传递
              }
            } else {
              return { key: param.name, value: undefined };  // 空数组或无效数据时不传递
            }
          }
        } else if (param.type === 'object' || param.type === 'array') {
          // JSON对象或数组参数
          if (param.value && param.value.trim()) {
            try {
              paramValue = JSON.parse(param.value);
            } catch {
              paramValue = param.value;
            }
          } else {
            return { key: param.name, value: undefined };  // 空值不传递
          }
        } else {
          // 其他类型的参数（字符串、数字、布尔值等）
          if (param.value === undefined || param.value === null || param.value === '') {
            return { key: param.name, value: undefined };  // 空值不传递
          }
          paramValue = param.value;
        }

        return {
          key: param.name,
          value: paramValue
        };
      })
      .filter(param => {
        if (!param) {
          return false;
        }
        if (ignoreEmptyValue) {
          return param.value !== undefined;
        }
        return true;
      })
      .map(item => [item.key, item.value]));

    return args;
  }

  // 调用规则流API
  async function callRuleflowAPI(params: InputParam[]): Promise<string> {
    // 构建请求参数：args只包含值的数组（排除USER_INPUT和USER_FILES）
    const args = Object.values(getArgs(params, false));

    // 获取工作流ID - 从URL参数或默认值
    const workflowId = getWorkflowId();

    const requestData = {
      id: workflowId,
      args: args
    };

    try {
      // 使用封装好的post函数，覆盖baseURL以调用外部API
      const result = await post('/runtime/bcc/v1.0/aiflowdebug/syncInvoke', requestData);

      // 处理API响应格式
      if (result.success !== false) {
        // 如果API返回字符串结果，直接返回
        if (typeof result === 'string') {
          return result;
        }

        // 如果API返回对象格式，尝试提取结果字段
        if (typeof result === 'object') {
          const output = result.data

          if (typeof output === 'string') {
            return output;
          }

          // 如果是对象，格式化输出
          return JSON.stringify(output || result, null, 2);
        }

        return JSON.stringify(result, null, 2);
      } else {
        throw new Error(result.message || 'API返回失败状态');
      }
    } catch (error) {
      console.error('API调用失败：', error);
      throw new Error(getErrorMessage(error));
    }
  }

  // 调用工作流API
  async function callWorkflowAPI(params: InputParam[]): Promise<string> {
    // 构建请求参数：args只包含值的数组（排除USER_INPUT和USER_FILES）
    const args = getArgs(params, true);

    // 获取工作流ID - 从URL参数或默认值
    const workflowId = getWorkflowId();

    const requestData = {
      flowId: workflowId,
      inputs: args
    };

    try {
      // 使用封装好的post函数，覆盖baseURL以调用外部API
      const result = await post('/runtime/sys/v1.0/ai/workflows/draft/run', requestData);

      // 处理API响应格式
      if (result.success !== false) {
        // 如果API返回字符串结果，直接返回
        if (typeof result === 'string') {
          return result;
        }

        // 如果API返回对象格式，尝试提取结果字段
        if (typeof result === 'object') {
          const output = result.outputs

          if (typeof output === 'string') {
            return output;
          }

          // 如果是对象，格式化输出
          return JSON.stringify(output || result, null, 2);
        }

        return JSON.stringify(result, null, 2);
      } else {
        throw new Error(result.message || 'API返回失败状态');
      }
    } catch (error) {
      console.error('API调用失败：', error);
      throw new Error(getErrorMessage(error));
    }
  }

  function getErrorMessage(error: any): string {
    let errorMessage = '网络错误或服务器无响应';

    if (error && typeof error === 'object') {
      const errorTip = error.response?.data?.Message;
      if (typeof errorTip === 'string' && errorTip) {
        errorMessage = errorTip;
      } else if (typeof error.message === 'string' && error.message) {
        errorMessage = error.message;
      }
    }

    return `API调用失败：${errorMessage}`;
  }

  return {
    saveWorkflow,
    callWorkflowAPI,
    callRuleflowAPI
  };
}
