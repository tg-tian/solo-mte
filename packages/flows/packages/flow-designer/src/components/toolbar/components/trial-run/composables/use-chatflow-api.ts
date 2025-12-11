import { inject } from 'vue';
import { post } from '@/api/request';
import { FLOW_METADATA_KEY } from '@flow-designer/hooks';
import type { InputParam } from '../types';

export interface ChatFlowRequest {
  flowId: string;
  userInput: string;
  userFiles: string[];
  inputs: object;
  conversationId: null;
  nodeId: null;
}

// 处理单行SSE数据的辅助函数
async function processSSELine(
  line: string,
  onMessage?: (message: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  resolve?: (value: void) => void,
  completed?: { value: boolean }
): Promise<void> {
  try {
    // 跳过空行
    if (!line || line.trim() === '') {
      return;
    }

    // 解析SSE格式字段
    const colonIndex = line.indexOf(':');
    if (colonIndex >= 0) {
      const field = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // 处理data字段
      if (field === 'data') {
        // 跳过空data字段
        if (!value || value === '') {
          return;
        }

        try {
          // 解析JSON数据
          const jsonData = JSON.parse(value);

          // 根据实际API响应格式提取文本
          let textContent = null;
          let isComplete = false;

          // 主要格式: {"output": {"text": "...", "finish_reason": null}, "usage": null, "request_id": "..."}}
          if (jsonData && jsonData.output && typeof jsonData.output.text === 'string') {
            textContent = jsonData.output.text;
            if (jsonData.output.finish_reason === 'stop' || jsonData.output.finish_reason === 'eos') {
              isComplete = true;
            }
          }
          // 备用格式: {"text": "...", "finish_reason": "..."}
          else if (jsonData && typeof jsonData.text === 'string') {
            textContent = jsonData.text;
            if (jsonData.finish_reason === 'stop' || jsonData.finish_reason === 'eos') {
              isComplete = true;
            }
          }
          // 其他可能格式
          else if (jsonData && jsonData.data && typeof jsonData.data.text === 'string') {
            textContent = jsonData.data.text;
          }
          else if (jsonData && typeof jsonData.content === 'string') {
            textContent = jsonData.content;
          }
          else if (jsonData && typeof jsonData.message === 'string') {
            textContent = jsonData.message;
          }

          // 处理文本内容
          if (textContent !== null && textContent !== undefined) {
            // 如果是对话结束标志（即使文本为空）
            if (isComplete && completed && !completed.value) {
              completed.value = true;
              onComplete?.();
              resolve?.();
              return;
            }

            // 处理空字符串但不是结束标志的情况
            if (textContent === '') {
              return;
            }

            // 发送文本内容（逐字显示效果）
            onMessage?.(textContent);
          }
        } catch (error) {
          console.error('解析SSE数据失败:', error, '原始数据:', value);

          // 如果JSON解析失败，检查是否是纯文本
          if (value && value.trim() && value !== 'null' && value !== 'undefined') {
            // 移除可能的引号
            let cleanValue = value.trim();
            if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
              cleanValue = cleanValue.slice(1, -1);
            }
            if (cleanValue) {
              onMessage?.(cleanValue);
            }
          }
        }
      }
      // 处理event字段（通常为"result"）
      else if (field === 'event') {
        // 可以根据事件类型做特殊处理
      }
      // 处理id字段
      else if (field === 'id') {
        // 处理事件ID
      }
      // 处理其他特殊字段（如": HTTP STATUS/200"）
      else if (field.startsWith(':')) {
        // 处理SSE注释行
      }
    }
  } catch (error) {
    console.error('处理SSE行错误:', error);
    const errorMessage = `对话流API调用失败：${error}`;
    onError?.(new Error(errorMessage));
    resolve?.();
  }
}

export function useChatflowApi() {
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

  // 将 inputParams 转换为 inputs 格式（与 syncInvoke 的 args 处理逻辑一致）
  function convertInputParamsToInputs(inputParams: InputParam[]): any[] {
    return inputParams.map(param => {
      let paramValue: any;

      // 根据参数类型处理值
      if (param.type === 'fileID') {
        // 文件参数使用文件接口返回的文件ID
        if (!param.value) {
          return null; // 没有文件时不传递
        }

        if (param.multiple === false) {
          // 单文件：param.value 是 FileInfo 对象
          const fileInfo = param.value as any;
          if (fileInfo && fileInfo.metadataId) {
            paramValue = fileInfo.metadataId;
          } else {
            return null; // 没有metadataId时不传递
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
              return null; // 没有有效文件时不传递
            }
          } else {
            return null; // 空数组或无效数据时不传递
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
          return null; // 空值不传递
        }
      } else {
        // 其他类型的参数（字符串、数字、布尔值等）
        if (param.value === undefined || param.value === null || param.value === '') {
          return null; // 空值不传递
        }
        paramValue = param.value;
      }

      // 直接返回参数值，不包含key
      return paramValue;
    }).filter(param => param !== null); // 过滤掉null值
  }

  // 调用对话流API
  function callChatflowAPI(
    userInput: string,
    userFiles: string[] = [],
    inputs: object = {},
    onMessage?: (message: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // 获取工作流ID
    const flowId = getWorkflowId();

    const requestData: ChatFlowRequest = {
      flowId,
      userInput,
      userFiles,
      inputs,
      conversationId: null,
      nodeId: null
    };

  
    return new Promise((resolve, reject) => {
      // 首先尝试使用fetch API处理流式响应，因为它对SSE支持更好
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        fetch('/api/runtime/sys/v1.0/ai/chatflows/draft/run', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestData)
        })
        .then(response => {
          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('text/event-stream') || contentType.includes('application/stream')) {
            // 处理SSE流式响应
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('无法获取响应流读取器');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = async () => {
              try {
                let completed = false;
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    resolve();
                    break;
                  }

                  // 解码数据块
                  const chunk = decoder.decode(value, { stream: true });
                  buffer += chunk;

                  // 按行分割处理SSE数据
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || ''; // 保存最后一个不完整的行

                  for (const line of lines) {
                    if (line.trim() === '') {
                      continue;
                    }

                    await processSSELine(line, onMessage, onComplete, onError, resolve, { value: completed });
                  }
                }
              } catch (error) {
                console.error('流处理错误:', error);
                const errorMessage = getChatflowErrorMessage(error);
                onError?.(new Error(errorMessage));
                reject(new Error(errorMessage));
              }
            };

            return processStream();
          } else {
            // 非流式响应，使用response.json()或response.text()
            return response.text().then(text => {
              try {
                const data = JSON.parse(text);
                if (data && data.output && data.output.text) {
                  onMessage?.(data.output.text);
                } else if (data && data.text) {
                  onMessage?.(data.text);
                } else if (data && data.content) {
                  onMessage?.(data.content);
                }
              } catch {
                // 如果不是JSON，直接使用文本
                if (text) {
                  onMessage?.(text);
                }
              }
              onComplete?.();
              resolve();
            });
          }
        })
        .catch(error => {
          console.error('fetch请求失败，回退到axios:', error);
          // 如果fetch失败，回退到原来的axios方式
          fallbackToAxios(requestData, onMessage, onComplete, onError, resolve, reject);
        });
      } catch (error) {
        console.error('fetch不支持，回退到axios:', error);
        // 如果fetch不支持，回退到原来的axios方式
        fallbackToAxios(requestData, onMessage, onComplete, onError, resolve, reject);
      }
    });
  }

  // 回退到axios的方法
  async function fallbackToAxios(
    requestData: ChatFlowRequest,
    onMessage?: (message: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void,
    resolve?: (value: void) => void,
    reject?: (reason?: any) => void
  ) {
    // 使用post发送请求，处理流式输出
    try {
      const response = await post('runtime/sys/v1.0/ai/chatflows/draft/run', requestData, {
        responseType: 'stream'
      });

      // 检查响应类型
      const contentType = response.headers?.['content-type'] || '';

      if (contentType.includes('text/event-stream') || contentType.includes('application/stream')) {
        // 处理SSE流式响应

        // 检查response.data的类型
        if (response.data instanceof ReadableStream) {
          // 标准ReadableStream处理（现代浏览器）
          const stream = response.data;
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  onComplete?.();
                  resolve?.();
                  break;
                }

                // 解码数据块
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // 按行分割处理SSE数据
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 保存最后一个不完整的行

                for (const line of lines) {
                  if (line.trim() === '') {
                    continue;
                  }

                  await processSSELine(line, onMessage, onComplete, onError, resolve, { value: false });
                }
              }
            } catch (error) {
              console.error('流处理错误:', error);
              const errorMessage = getChatflowErrorMessage(error);
              onError?.(new Error(errorMessage));
              reject?.(new Error(errorMessage));
            }
          };

          return processStream();
        } else {
          // 处理axios在浏览器中的流式响应
          // axios在浏览器中可能返回字符串或其他格式

          if (typeof response.data === 'string') {
            // 如果响应是字符串，按行分割处理
            const lines = response.data.split('\n');
            for (const line of lines) {
              if (line.trim() === '') {
                continue;
              }
              try {
                await processSSELine(line, onMessage, onComplete, onError, resolve, { value: false });
              } catch (error) {
                console.error('处理SSE行时出错:', error);
              }
            }
            onComplete?.();
            resolve?.();
          } else if (response.data && typeof response.data === 'object') {
            // 如果响应是对象，尝试直接解析

            // 处理可能的JSON格式
            let textContent = null;
            let isComplete = false;

            if (response.data.output && response.data.output.text !== undefined) {
              textContent = response.data.output.text;
              if (response.data.output.finish_reason === 'stop' || response.data.output.finish_reason === 'eos') {
                isComplete = true;
              }
            } else if (response.data.text !== undefined) {
              textContent = response.data.text;
              if (response.data.finish_reason === 'stop' || response.data.finish_reason === 'eos') {
                isComplete = true;
              }
            } else if (response.data.data && response.data.data.text !== undefined) {
              textContent = response.data.data.text;
            } else if (response.data.content !== undefined) {
              textContent = response.data.content;
            } else if (response.data.message !== undefined) {
              textContent = response.data.message;
            }

            if (textContent) {
              onMessage?.(textContent);
            }

            onComplete?.();
            resolve?.();
          } else {
            console.error('未知的响应数据类型:', typeof response.data, response.data);
            const errorMessage = '对话流API调用失败：未知的响应数据类型';
            onError?.(new Error(errorMessage));
            reject?.(new Error(errorMessage));
          }
        }
      } else {
        // 非流式响应
        const data = response.data;
        if (data && data.output && data.output.text) {
          onMessage?.(data.output.text);
        } else if (data && data.text) {
          onMessage?.(data.text);
        } else if (data && data.content) {
          onMessage?.(data.content);
        } else if (data && typeof data === 'string') {
          onMessage?.(data);
        }
        onComplete?.();
        resolve?.();
      }
    } catch (error) {
      console.error('对话流API调用失败:', error);
      const errorMessage = getChatflowErrorMessage(error);
      onError?.(new Error(errorMessage));
      reject?.(new Error(errorMessage));
    }
  }

  function getChatflowErrorMessage(error: any): string {
    let errorMessage = '网络错误或服务器无响应';

    if (error && typeof error === 'object') {
      const errorTip = error.response?.data?.Message || error.response?.data?.message;
      if (typeof errorTip === 'string' && errorTip) {
        errorMessage = errorTip;
      } else if (typeof error.message === 'string' && error.message) {
        errorMessage = error.message;
      }
    }

    return `对话流API调用失败：${errorMessage}`;
  }

  return {
    callChatflowAPI,
    getWorkflowId,
    convertInputParamsToInputs
  };
}