import { computed, ref, watch } from 'vue';
import { type VisualDataCell } from '@farris/ui-vue';
import { VALUE_EXPRESSION_INPUT_NAME, type ValueExpressionInputProps } from '../value-expression-input.props';
import type { FlowNodeInstance, Parameter, TypeField, TypeRefer } from '@farris/flow-devkit/types';
import { ValueExpressUtils } from '@farris/flow-devkit/utils';
import { useBem } from '@farris/flow-devkit/utils';
import { getNodeVariables, getWritableNodeVariables } from '@farris/flow-devkit/composition';
import { useTypeDetails } from '@farris/flow-devkit/composition';
import type { GetValueResult } from './types';

interface TreeNodeData {
  /** 所属节点 */
  node: FlowNodeInstance;
  /** 所属参数 */
  param?: Parameter;
  /** 字段路径 */
  fields?: TypeField[];
  /** 目标字段 */
  field?: TypeField;
}

interface TreeNode {
  id: string;
  data: TreeNodeData,
  parent: string;
  collapse: boolean;
  disabled?: boolean;
}

export function useVarTab(props: ValueExpressionInputProps) {
  const onlyAllowArrayType = props.onlyAllowArrayType;
  const typeFilter = props.typeFilter;

  const { bem } = useBem(VALUE_EXPRESSION_INPUT_NAME);
  const nodeVariables = props.nodeVariables ? props.nodeVariables : getNodeVariables();
  const writableNodeVariables = props.writableNodeVariables ? props.writableNodeVariables : getWritableNodeVariables();
  const nodeVarsList = computed(() => props.onlyAllowWritableVariable ? writableNodeVariables.value : nodeVariables.value);
  const {
    fullTypeID2Type,
    getFullTypeID,
    getTypeCode,
    getTypeName,
    isListType,
    getListItemType,
    loadType,
  } = useTypeDetails();

  const selectedTreeNode = ref<TreeNode>();

  function generateChildNodes(
    parentId: string,
    data: Parameter | TypeField,
    dataType: 'Parameter' | 'TypeField',
    node: FlowNodeInstance,
    param: Parameter,
    fieldPath: TypeField[] = [],
  ): TreeNode[] {
    const nodes: TreeNode[] = [];
    const typeRefer = 'type' in data ? data.type : undefined;
    const currentType = typeRefer ? fullTypeID2Type.get(getFullTypeID(typeRefer)) : undefined;

    let currentNode: TreeNode;
    if (dataType === 'Parameter') {
      const paramData = data as Parameter;
      currentNode = {
        id: `${parentId}_param_${paramData.id || paramData.code}`,
        data: {
          node,
          param: paramData,
          fields: undefined,
          field: undefined,
        },
        parent: parentId,
        collapse: true,
      };
    } else {
      const fieldData = data as TypeField;
      currentNode = {
        id: `${parentId}_field_${fieldData.code}`,
        data: {
          node,
          param,
          fields: fieldPath,
          field: fieldData,
        },
        parent: parentId,
        collapse: true,
      };
    }

    const isValid = (() => {
      if (typeof typeFilter === 'function' && typeRefer) {
        return typeFilter(typeRefer);
      }
      if (onlyAllowArrayType) {
        return !!typeRefer && isListType(typeRefer);
      }
      return true;
    })();

    const childNodes: TreeNode[] = [];
    const targetType = isListType(typeRefer) ? getListItemType(typeRefer) : currentType;
    const childFields = targetType?.fields || [];
    childFields.forEach((field) => {
      const children = generateChildNodes(
        currentNode.id,
        field,
        'TypeField',
        node,
        param,
        [...fieldPath, field],
      );
      childNodes.push(...children);
    });

    if (isValid || childNodes.length > 0) {
      nodes.push(currentNode);
      nodes.push(...childNodes);
    }
    return nodes;
  }

  const allTypeRefers = computed<TypeRefer[]>(() => {
    const refs: TypeRefer[] = [];
    nodeVarsList.value.forEach(({ params }) => {
      params.forEach((param) => {
        refs.push(param.type);
      });
    });
    return refs;
  });

  watch(allTypeRefers, () => {
    loadType(allTypeRefers.value);
  }, { immediate: true });

  const treeData = computed<TreeNode[]>(() => {
    fullTypeID2Type;
    const treeNodes: TreeNode[] = [];

    nodeVarsList.value.forEach(({ node, params }) => {
      const nodeId = `node_${node.id}`;
      const paramNodes: TreeNode[] = [];

      params.forEach((param) => {
        if (!param || !param.code) {
          return;
        }
        const children = generateChildNodes(
          nodeId,
          param,
          'Parameter',
          node,
          param,
          [],
        );
        paramNodes.push(...children);
      });

      if (paramNodes.length > 0) {
        const nodeTreeNode: TreeNode = {
          id: nodeId,
          data: {
            node,
            param: undefined,
            fields: undefined,
            field: undefined,
          },
          parent: '',
          collapse: false,
          disabled: true,
        };
        treeNodes.push(nodeTreeNode, ...paramNodes);
      }
    });

    return treeNodes;
  });

  function onVarTreeSelectionChange(selectedItems: TreeNode[]): void {
    const selectedNode = selectedItems?.[0];
    if (!selectedNode) {
      return;
    }
    selectedTreeNode.value = selectedNode;
  }

  function renderNodeRow(node: FlowNodeInstance) {
    const iconUrl = node.metadata.icon || '';
    const nodeName = node.data.name || node.metadata.label || '未命名';
    return (
      <div class={bem('var-row')}>
        {iconUrl && (
          <div class={bem('var-row-icon')}>
            <img src={iconUrl} />
          </div>
        )}
        <div class={bem('var-row-name')} title={nodeName}>
          <span>{nodeName}</span>
        </div>
      </div>
    );
  }

  function renderParamRow(data: TreeNodeData) {
    const param = data.param!;
    const field = data.field;
    const nodeTitle = field ? field.code : (param.name || param.code);
    const nodeSubTitle = field ? field.name : '';
    const typeRefer = field ? field.type : param.type;
    const typeCode = getTypeCode(typeRefer);
    const typeName = getTypeName(typeRefer);
    return (
      <div class={bem('var-row')}>
        <div class={bem('var-row-name')} title={nodeTitle}>
          <span>{nodeTitle}</span>
        </div>
        {nodeSubTitle && (
          <div class={bem('var-row-sub-name')} title={nodeSubTitle}>
            <span>{nodeSubTitle}</span>
          </div>
        )}
        {typeCode && (
          <div class={bem('var-row-type')} title={typeName}>
            <span>{typeCode}</span>
          </div>
        )}
      </div>
    );
  }

  function renderCellTemplate(cell: VisualDataCell) {
    const data = cell.data as TreeNodeData;
    if (data.param) {
      return renderParamRow(data);
    } else {
      return renderNodeRow(data.node);
    }
  }

  function renderNodeVarTab() {
    return (
      <f-tree-view
        columns={[{
          field: 'data',
          title: '',
          dataType: 'object',
          width: '100%',
          columnTemplate: renderCellTemplate,
        }]}
        hierarchy={{
          collapseField: 'collapse'
        }}
        data={treeData.value}
        fit={true}
        onSelectionChange={onVarTreeSelectionChange}
      ></f-tree-view>
    );
  }

  function wrapTypeWithArray(itemType: TypeRefer, count: number): TypeRefer {
    let wrappedType = itemType;
    while (count > 0) {
      --count;
      wrappedType = {
        source: 'default',
        typeId: 'list',
        typeCode: `Array<${wrappedType.typeCode || wrappedType.typeId}>`,
        typeName: `Array<${wrappedType.typeName || wrappedType.typeCode || wrappedType.typeId}>`,
        genericTypes: [wrappedType],
      };
    }
    return wrappedType;
  }

  function getNewType(param: Parameter, fields?: TypeField[]): TypeRefer {
    if (!fields || !fields.length) {
      return param.type;
    }
    const itemType = fields[fields.length - 1].type;
    const parentTypes = [
      param.type,
      ...fields.slice(0, -1).map(field => field.type),
    ];
    let listParentCount = 0;
    parentTypes.forEach(parentType => {
      if (isListType(parentType)) {
        ++listParentCount;
      }
    });
    return wrapTypeWithArray(itemType, listParentCount);
  }

  function getNodeVariableExpr(): GetValueResult | string {
    if (!selectedTreeNode.value || !selectedTreeNode.value.data.param) {
      return '请选择一个节点变量';
    }
    const data = selectedTreeNode.value.data;
    const param = data.param!;
    const node = data.node!;
    const fields = (data.fields || []).map(field => (field.code || ''));
    const type = getNewType(param, data.fields);
    return {
      express: ValueExpressUtils.createNodeVariableExpr(param, node, fields),
      type,
    };
  }

  return {
    getNodeVariableExpr,
    renderNodeVarTab,
  };
}
