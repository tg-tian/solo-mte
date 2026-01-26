import type { Ref } from 'vue';
import type { ValueExpress, NodeVariableExpr, SystemVariableExpr, MethodInvokeExpr } from '@farris/flow-devkit/types';
import { ValueExpressKind } from '@farris/flow-devkit/types';
import { useBem, ParamValidateUtils } from '@farris/flow-devkit/utils';
import { getNodeVariables, useFlow } from '@farris/flow-devkit/composition';
import { VALUE_EXPRESSION_INPUT_NAME } from '../value-expression-input.props';
import { type NodeVariables } from '@farris/flow-devkit/composition';
import { useMethodTypes } from '@farris/flow-devkit/hooks';

interface RenderOptions {
  /** 是否显示节点图标，默认显示 */
  showNodeIcon?: boolean;

  nodeVariables?: Ref<NodeVariables[]>;
}

const SYS_VAR_PREFIX = 'sys.';

export function useValueExpression(options?: RenderOptions) {
  const showNodeIcon = options?.showNodeIcon ?? true;

  const { bem } = useBem(VALUE_EXPRESSION_INPUT_NAME);
  const nodeVarsList = options?.nodeVariables ? options.nodeVariables : getNodeVariables();
  const useFlowComposition = useFlow();
  const { mergedMethodTypes } = useMethodTypes();

  function getNodeNameByNodeCode(nodeCode: string): string {
    const node = useFlowComposition?.getNodeByCode?.(nodeCode);
    if (!node) {
      return '';
    }
    const nodeName = node.data.name || node.metadata.label || '';
    return nodeName;
  }

  function getNodeVariableInfo(express: NodeVariableExpr): {
    isDefined: boolean;
    nodeName?: string;
    nodeIcon?: string;
    paramCode?: string;
    fieldCodes?: string[];
  } {
    const nodeCode = express.nodeCode;
    const nodeVariables = nodeVarsList.value.find(
      (item) => item.node.data.code === nodeCode
    );
    if (!nodeVariables) {
      const nodeName = getNodeNameByNodeCode(nodeCode);
      return { isDefined: false, nodeName, paramCode: express.variable };
    }
    const targetNode = nodeVariables.node;
    const targetParam = ParamValidateUtils.getTargetParameter(express, nodeVariables.params || []);
    const { isFieldsValid, fields } = ParamValidateUtils.isNodeVariableFieldsValid(express, targetParam);
    const isDefined = !!targetNode && !!targetParam && isFieldsValid;
    if (!isDefined) {
      const nodeName = getNodeNameByNodeCode(nodeCode);
      return { isDefined, nodeName, paramCode: express.variable, fieldCodes: fields };
    }
    const nodeName = targetNode.data.name || targetNode.metadata.label || '';
    const nodeIcon = targetNode.metadata.icon || '';
    const paramCode = targetParam.code || '';
    return { isDefined, nodeName, nodeIcon, paramCode, fieldCodes: fields };
  }

  function getFieldsText(express: NodeVariableExpr, fields?: string[]): string {
    const fieldCodes = fields || express?.fields;
    if (!fieldCodes || !fieldCodes.length) {
      return '';
    }
    return `.${fieldCodes.join('.')}`;
  }

  function renderNodeVariable(express: NodeVariableExpr) {
    const { isDefined, nodeName, nodeIcon, paramCode, fieldCodes } = getNodeVariableInfo(express);
    const fields = getFieldsText(express, fieldCodes);
    const undefinedText = '未定义';

    if (!isDefined && (!nodeName || !paramCode)) {
      return (
        <div class={[bem('content-var'), bem('content-var', 'undefined')]} title={undefinedText}>
          <i class="f-icon f-icon-warning"></i>
          <span>{undefinedText}</span>
        </div>
      );
    }
    const label = `${nodeName} - ${paramCode}${fields}`;
    return (
      <div class={[bem('content-var'), !isDefined && bem('content-var', 'undefined')]} title={isDefined ? label : undefinedText}>
        {(showNodeIcon && nodeIcon) && (
          <div class={bem('content-var-icon')}>
            <img src={nodeIcon} />
          </div>
        )}
        <div class={bem('content-var-name')}>
          <span>{nodeName}</span>
        </div>
        <span class={bem('content-var-divider')}>-</span>
        <div class={bem('content-var-code')}>
          <span>{`${paramCode}${fields}`}</span>
        </div>
      </div>
    );
  }

  function renderMethodInvokeExpress(express: MethodInvokeExpr) {
    const typeId = express.typeUrl!;
    const methodCode = express.methodCode;
    const methodType = mergedMethodTypes.value.find((type) => {
      return type.typeId === typeId;
    });
    const methods = methodType?.methods || [];
    const method = methods.find((item) => {
      return item.code === methodCode;
    });
    const methodName = method?.name || methodCode || '';
    const methodTitle = `${methodName} - ${methodCode}`;
    return (
      <div class={bem('content-method')} title={methodTitle}>
        <div class={bem('content-method-icon')}></div>
        <div class={bem('content-method-name')}>{methodName}</div>
      </div>
    );
  }

  function renderTextContent(text: string) {
    if (!text) {
      return;
    }
    return (
      <div class={bem('content-text')} title={text}>{text}</div>
    );
  }

  function renderValueExpression(express?: ValueExpress) {
    if (!express || !express.kind) {
      return;
    }
    const expressKind = express.kind;
    if (expressKind === ValueExpressKind.nodeVariable) {
      return renderNodeVariable(express as NodeVariableExpr);
    }
    if (expressKind === ValueExpressKind.systemVariable) {
      const systemVarExpr = express as SystemVariableExpr;
      const varName = systemVarExpr.variable;
      return renderTextContent(SYS_VAR_PREFIX + varName);
    }
    if (expressKind === ValueExpressKind.methodInvoke) {
      return renderMethodInvokeExpress(express as MethodInvokeExpr);
    }
    const value = express.value;
    if (expressKind === ValueExpressKind.stringConst) {
      return renderTextContent(`"${value}"` || '""');
    }
    if (expressKind === ValueExpressKind.numberConst) {
      return renderTextContent(String(value));
    }
    if (expressKind === ValueExpressKind.boolConst) {
      return renderTextContent(value ? '是' : '否');
    }
    if (expressKind === ValueExpressKind.stringsConst) {
      return renderTextContent(Array.isArray(value) ? JSON.stringify(value) : '');
    }
  }

  return {
    renderValueExpression,
  };
}
