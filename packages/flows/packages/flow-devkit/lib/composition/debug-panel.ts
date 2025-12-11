import { ref, inject, provide } from 'vue';

// 调试面板相关的全局状态和函数
const DEBUG_PANEL_KEY = Symbol('debug-panel');

export interface DebugPanelContext {
  showDebugPanel: (nodeData: any) => void;
  debugNodeData: any;
}

export function useDebugPanelProvider() {
  const debugNodeData = ref<any>(null);
  const showNodeDebugPanel = ref(false);
  const showTrialRunPanel = ref(false);

  const showDebugPanel = (nodeData: any) => {
    debugNodeData.value = nodeData;
    showNodeDebugPanel.value = true;
    showTrialRunPanel.value = true;
  };

  const context: DebugPanelContext = {
    showDebugPanel,
    debugNodeData
  };

  provide(DEBUG_PANEL_KEY, context);

  return {
    debugNodeData,
    showNodeDebugPanel,
    showTrialRunPanel,
    showDebugPanel
  };
}

export function useDebugPanel() {
  const context = inject<DebugPanelContext>(DEBUG_PANEL_KEY);

  if (!context) {
    throw new Error('useDebugPanel must be used within a DebugPanelProvider');
  }

  return context;
}
