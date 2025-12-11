import { useInputParams } from './use-input-params';
import { useWorkflowApi } from './use-workflow-api';
import { useValidate, useVerifyDetailsPanel, useFlowMetadata } from '@flow-designer/hooks';
import { useNotify } from '@farris/flow-devkit';

export function useTrialRun() {
  // 使用输入参数逻辑
  const {
    isRunning,
    activeTab,
    runResult,
    inputParams,
    updateParamValue,
    checkRequiredParams,
    setActiveTab
  } = useInputParams();

  const notifyService = useNotify();
  const { isFlowValid } = useValidate();
  const verifyDetailsPanel = useVerifyDetailsPanel();

  // 使用工作流API逻辑
  const { saveWorkflow, callWorkflowAPI, callRuleflowAPI } = useWorkflowApi();
  const { flowType } = useFlowMetadata();

  function canRunFlow(): boolean {
    if (isFlowValid()) {
      return true;
    } else {
      notifyService.error('请先解决错误列表中的问题再运行');
      verifyDetailsPanel.show();
      return false;
    }
  }

  // 运行工作流
  async function runWorkflow() {
    if (!canRunFlow()) {
      return;
    }
    // 检查必填参数
    if (!checkRequiredParams()) {
      runResult.value = '请填写所有必填参数';
      activeTab.value = 'result';
      return;
    }

    isRunning.value = true;

    try {
      runResult.value = '正在保存流程...';
      const saveSuccess = await saveWorkflow();

      if (!saveSuccess) {
        throw new Error('流程保存失败');
      }

      runResult.value = '正在执行...';
      const result = flowType.value === 'ruleflow' ? await callRuleflowAPI(inputParams.value) : await callWorkflowAPI(inputParams.value);

      runResult.value = result;
      activeTab.value = 'result';

    } catch (error) {
      console.error('运行出错:', error);
      const errorMessage = error instanceof Error ? error.message : '运行失败，请稍后重试';
      runResult.value = `运行失败：${errorMessage}`;
      activeTab.value = 'result';
    } finally {
      isRunning.value = false;
    }
  }

  // 重置结果
  function resetResult() {
    runResult.value = '';
    activeTab.value = 'input';
  }

  return {
    // 状态
    isRunning,
    activeTab,
    runResult,
    inputParams,

    // 方法
    updateParamValue,
    runWorkflow,
    resetResult,
    setActiveTab,

    // 工具方法
    checkRequiredParams
  };
}
