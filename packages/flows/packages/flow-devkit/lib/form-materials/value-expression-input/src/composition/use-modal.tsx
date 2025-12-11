import { inject, ref, type SetupContext } from 'vue';
import { F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';
import { type ValueExpress, ValueExpressKind } from '@farris/flow-devkit/types';
import { type ValueExpressionInputProps, VALUE_EXPRESSION_INPUT_NAME } from '../value-expression-input.props';
import { useBem } from '@farris/flow-devkit/utils';
import { useVarTab } from './use-var-tab';
import { useConstTab } from './use-const-tab';
import { useMethodInvokeTab } from './use-method-invoke-tab';
import type { GetValueResult } from './types';
import { useTypeDetails, useNotify } from '@farris/flow-devkit/composition';

export function useModal(
  props: ValueExpressionInputProps,
  context: SetupContext,
) {
  const { bem } = useBem(VALUE_EXPRESSION_INPUT_NAME);
  const notifyService = useNotify();
  const modalService = inject<any>(F_MODAL_SERVICE_TOKEN);
  const modalInstance = ref();

  /** 节点变量 */
  const TAB_NODE_VARIABLE = 'node-variable';
  /** 常量 */
  const TAB_CONSTANT = 'constant';
  /** 函数调用 */
  const TAB_METHOD_INVOKE = 'method-invoke';

  const activeTabId = ref<string>(TAB_NODE_VARIABLE);

  const {
    getNodeVariableExpr,
    renderNodeVarTab,
  } = useVarTab(props);
  const {
    getConstExpr,
    renderConstTab,
    updateConstTab,
  } = useConstTab(props);
  const {
    renderMethodInvokeTab,
    initMethodInvokeTab,
    updateMethodInvokeTab,
    getMethodInvokeExpr,
  } = useMethodInvokeTab(props);

  function getTabIdByCurrentValue(value?: ValueExpress): string {
    if (props.onlyAllowWritableVariable) {
      return TAB_NODE_VARIABLE;
    }
    if (props.onlyAllowVariable) {
      return TAB_NODE_VARIABLE;
    }
    if (value && value.kind) {
      if (value.kind === ValueExpressKind.methodInvoke) {
        return TAB_METHOD_INVOKE;
      }
      if (value.kind !== ValueExpressKind.nodeVariable) {
        return TAB_CONSTANT;
      }
    }
    return TAB_NODE_VARIABLE;
  }



  function closeModal(): void {
    if (modalInstance.value) {
      modalInstance.value.destroy();
      modalInstance.value = null;
    }
  }

  const { loadType } = useTypeDetails();

  function updateValueAndCloseModal(result: GetValueResult): void {
    const { express, type } = result;
    loadType(type);
    context.emit('update:modelValue', express, express, result);
    closeModal();
  }

  function acceptCallback() {
    let getNewValue: () => (GetValueResult | string);
    switch (activeTabId.value) {
      case TAB_NODE_VARIABLE: {
        getNewValue = getNodeVariableExpr;
        break;
      }
      case TAB_METHOD_INVOKE: {
        getNewValue = getMethodInvokeExpr;
        break;
      }
      default: {
        getNewValue = getConstExpr;
      }
    }
    const result = getNewValue();
    if (typeof result === 'string') {
      notifyService.warning(result);
      return;
    }
    updateValueAndCloseModal(result);
  }

  function rejectCallback() {
    closeModal();
  }

  function updateTabId(newTabId: string): void {
    activeTabId.value = newTabId;
  }

  function renderTabs() {
    const shouldShowConstantTab = !props.onlyAllowVariable && !props.onlyAllowWritableVariable;
    const shouldShowMethodInvokeTab = !props.onlyAllowWritableVariable;

    return (
      <f-tabs activeId={activeTabId.value} onUpdate:activeId={updateTabId}>
        <f-tab-page id={TAB_NODE_VARIABLE} title="变量">
          <div class={bem('tab-content')}>{renderNodeVarTab()}</div>
        </f-tab-page>
        <f-tab-page id={TAB_CONSTANT} title="常量" show={shouldShowConstantTab}>
          <div class={bem('tab-content')}>{renderConstTab()}</div>
        </f-tab-page>
        <f-tab-page id={TAB_METHOD_INVOKE} title="函数调用" show={shouldShowMethodInvokeTab}>
          <div class={bem('tab-content')}>{renderMethodInvokeTab()}</div>
        </f-tab-page>
      </f-tabs>
    );
  }

  function renderModalContent() {
    return (
      <div class={bem('modal')}>
        {renderTabs()}
      </div>
    );
  }

  function updateTabData(): void {
    // 解析 modelValue，支持序列化格式
    let parsedValue: ValueExpress | undefined;
    if (props.modelValue) {
      if (typeof props.modelValue === 'object' && props.modelValue !== null) {
        parsedValue = props.modelValue;
      } else if (typeof props.modelValue === 'string') {
        try {
          const parsed = JSON.parse(props.modelValue);
          if (parsed && typeof parsed === 'object' && parsed.kind) {
            parsedValue = parsed;
          }
        } catch (error) {
          console.warn('use-modal: Failed to parse modelValue as JSON', props.modelValue, error);
        }
      }
    }

    activeTabId.value = getTabIdByCurrentValue(parsedValue);
    updateConstTab(parsedValue, props.paramType);
    updateMethodInvokeTab(parsedValue);
  }

  function beforeOpenModal(): void {
    updateTabData();
    initMethodInvokeTab();
  }

  function openModal() {
    beforeOpenModal();
    modalInstance.value = modalService.open({
      title: '参数值',
      width: 500,
      height: 600,
      render: renderModalContent,
      buttons: [{
        name: 'cancel',
        class: 'btn btn-secondary',
        handle: rejectCallback,
        text: '取消',
      }, {
        name: 'confirm',
        class: 'btn btn-primary',
        handle: acceptCallback,
        text: '确定',
      }],
      draggable: true,
      resizeable: true,
      showMaxButton: true,
      showCloseButton: false,
      fitContent: false,
    });
  }

  return {
    openModal,
  };
}
