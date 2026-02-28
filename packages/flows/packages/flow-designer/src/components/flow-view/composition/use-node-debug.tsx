import { ref, inject } from 'vue';
import { post } from '@flow-designer/api/request';
import { FLOW_METADATA_KEY } from '@flow-designer/hooks';
import { useWorkflowApi } from '../../toolbar/components/trial-run/composables/use-workflow-api';
import { provideNodeDebug, useNotify, type NodeDebugHandler } from '@farris/flow-devkit';
import { useValidate } from '@flow-designer/hooks';
import { NodeDebugDrawer } from '@flow-designer/components/node-debug-drawer';

export function useNodeDebug() {
  // 获取流程元数据
  const flowMetadata = inject(FLOW_METADATA_KEY);

  // 使用试运行的保存API
  const { saveWorkflow } = useWorkflowApi();

  const { isNodeValid } = useValidate();
  const notifyService = useNotify();

  // 调试处理器
  const debugHandler: NodeDebugHandler = {
    openDebugDrawer: (nodeData: any) => {
      const nodeId = nodeData.nodeId;
      if (isNodeValid(nodeId)) {
        handleDebugNode(nodeData);
      } else {
        notifyService.error('当前节点存在配置错误，请先解决错误');
      }
    },
    executeDebug: async (debugData: any) => {
      await handleNodeDebugRun(debugData);
    }
  };

  provideNodeDebug(debugHandler);

  function handleFailedResult(error: any): void {
    let errorMessage = '节点调试失败，请稍后重试';

    if (error && typeof error === 'object') {
      const errorTip = error.response?.data?.Message;
      if (typeof errorTip === 'string' && errorTip) {
        errorMessage = errorTip;
      } else if (typeof error.message === 'string' && error.message) {
        errorMessage = error.message;
      }
    }

    updateDebugResult(`调试失败：${errorMessage}`, false);
  }

  // 处理节点调试执行
  const handleNodeDebugRun = async (debugData: any) => {
    const { nodeId } = debugData;

    if (!nodeId) {
      console.error('节点ID缺失');
      return;
    }

    try {
      const saveSuccess = await saveWorkflow();

      if (!saveSuccess) {
        throw new Error('流程保存失败');
      }

      await executeNodeDebug(debugData);
    } catch (error) {
      handleFailedResult(error);
    }
  };

  // 执行节点调试函数
  const executeNodeDebug = async (debugData: any) => {
    const { nodeId, params } = debugData;

    try {
      // 获取工作流ID
      const workflowId = flowMetadata?.id || '';
      if (!workflowId) {
        throw new Error('无法获取工作流ID');
      }

      // 构建请求参数：参考试运行的参数处理逻辑
      const args = params.map((param: any) => {
        let paramValue: any;

        // 根据参数类型处理值
        if (param.type === 'fileID') {
          if (!param.value) return null;
          const fileInfo = param.value as any;
          if (fileInfo && fileInfo.metadataId) {
            paramValue = fileInfo.metadataId;
          } else {
            return null;
          }
        } else if (param.type === 'object' || param.type.includes('array')) {
          if (param.value && param.value.trim()) {
            try {
              paramValue = JSON.parse(param.value);
            } catch {
              paramValue = param.value;
            }
          } else {
            return null;
          }
        } else {
          if (param.value === undefined || param.value === null || param.value === '') {
            return null;
          }
          paramValue = param.value;
        }

        return paramValue;
      }).filter((param: any) => param !== null);

      const requestData = {
        id: workflowId,
        nodeId: nodeId,
        args: args
      };

      // 更新调试状态为"正在调试"
      updateDebugResult('正在调试节点...', true);

      // 调用节点调试API
      const result = await post('/runtime/bcc/v1.0/aiflowdebug/debugSingleNode', requestData);

      // 处理API响应格式
      let debugResult = '';
      if (result.success !== false) {
        if (typeof result === 'string') {
          debugResult = result;
        } else if (typeof result === 'object') {
          const output = result.res || result.result || result;
          if (typeof output === 'string') {
            debugResult = output;
          } else {
            debugResult = JSON.stringify(output, null, 2);
          }
        } else {
          debugResult = JSON.stringify(result, null, 2);
        }
      } else {
        throw new Error(result.message || 'API返回失败状态');
      }

      // 更新调试结果
      updateDebugResult(debugResult, false);
    } catch (error) {
      handleFailedResult(error);
    }
  };

  const showDebugDrawer = ref(false);
  const debugNodeData = ref<any>(null);
  const debugResult = ref<string>('');
  const isDebugRunning = ref(false);

  function handleDebugNode(nodeData: any) {
    debugNodeData.value = nodeData;
    debugResult.value = '';
    showDebugDrawer.value = true;
  }

  function closeDebugDrawer() {
    showDebugDrawer.value = false;
    debugNodeData.value = null;
    debugResult.value = '';
  }

  function handleDebugRun(params: any[]) {
    if (!debugNodeData.value?.nodeId) {
      return;
    }

    isDebugRunning.value = true;
    debugResult.value = '正在调试节点...';

    debugHandler.executeDebug({
      ...debugNodeData.value,
      params
    });
  }

  /** 处理外部调试结果更新 */
  function updateDebugResult(result: string, isRunning: boolean = false) {
    debugResult.value = result;
    isDebugRunning.value = isRunning;
  }

  function renderNodeDebugDrawer() {
    return (
      <NodeDebugDrawer
        visible={showDebugDrawer.value}
        nodeId={debugNodeData.value?.nodeId || ''}
        nodeType={debugNodeData.value?.nodeType || ''}
        nodeName={debugNodeData.value?.nodeName || ''}
        inputParams={debugNodeData.value?.inputParams || []}
        debugResult={debugResult.value}
        isDebugRunning={isDebugRunning.value}
        onClose={closeDebugDrawer}
        onDebug={handleDebugRun}
      />
    );
  }

  return {
    debugHandler,
    handleNodeDebugRun,
    saveWorkflow,
    executeNodeDebug,
    renderNodeDebugDrawer,
  };
}
