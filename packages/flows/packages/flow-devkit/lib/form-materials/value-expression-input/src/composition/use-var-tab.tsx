import { computed, ref, watch } from 'vue';
import { type VisualDataCell } from '@farris/ui-vue';
import { VALUE_EXPRESSION_INPUT_NAME, type ValueExpressionInputProps } from '../value-expression-input.props';
import type { FlowNodeInstance, Parameter, TypeField, TypeRefer, JsonSchema, ValueExpressionResult } from '@farris/flow-devkit/types';
import { ValueExpressUtils, JsonSchemaUtils } from '@farris/flow-devkit/utils';
import { useBem } from '@farris/flow-devkit/utils';
import { getNodeVariables, getWritableNodeVariables } from '@farris/flow-devkit/composition';
import { useTypeDetails } from '@farris/flow-devkit/composition';
import { nodeRegistry } from '@farris/flow-devkit/composition';

interface TreeNodeData {
  /** 所属节点 */
  node: FlowNodeInstance;
  /** 所属参数 */
  param?: Parameter;
  /** 字段路径 */
  fieldPath?: TypeField[];
  /** 目标字段 */
  field?: TypeField;
  /** schema路径 */
  schemaPath?: JsonSchema[];
  /** schema字段 */
  schema?: JsonSchema;
}

type TreeNodeDataType = 'Parameter' | 'TypeField' | 'Schema';

interface TreeNode {
  id: string;
  data: TreeNodeData,
  parent: string;
  collapse: boolean;
  disabled?: boolean;
}

export function useVarTab(props: ValueExpressionInputProps) {
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
    getListDepth,
    getListItemType,
    loadType,
    wrapTypeWithArray,
  } = useTypeDetails();

  const selectedTreeNode = ref<TreeNode>();

  function getTypeRefer(data: Parameter | TypeField | JsonSchema): TypeRefer | undefined {
    if ('type' in data && typeof data.type === 'object') {
      return data.type;
    }
    return JsonSchemaUtils.getTypeRefer(data);
  }

  function createParameterTreeNode(
    parentId: string,
    node: FlowNodeInstance,
    param: Parameter,
  ): TreeNode {
    return {
      id: `${parentId}_param_${param.id || param.code}`,
      data: {
        node,
        param,
      },
      parent: parentId,
      collapse: true,
    };
  }

  function createTypeFieldTreeNode(
    parentId: string,
    node: FlowNodeInstance,
    param: Parameter,
    field: TypeField,
    fieldPath: TypeField[],
  ): TreeNode {
    return {
      id: `${parentId}_field_${field.code}`,
      data: {
        node,
        param,
        fieldPath,
        field,
      },
      parent: parentId,
      collapse: true,
    };
  }

  function createJsonSchemaTreeNode(
    parentId: string,
    node: FlowNodeInstance,
    param: Parameter,
    schema: JsonSchema,
    schemaPath: JsonSchema[],
  ): TreeNode | undefined {
    if (!schema || !schema.code) {
      return undefined;
    }
    return {
      id: `${parentId}_schema_${schema.id || schema.code}`,
      data: {
        node,
        param,
        schemaPath,
        schema,
      },
      parent: parentId,
      collapse: false,
    };
  }

  function isTypeValid(
    data: Parameter | TypeField | JsonSchema,
    param: Parameter,
    path: TypeField[] | JsonSchema[],
  ): boolean {
    const typeRefer = getTypeRefer(data);
    if (typeof props.typeFilter === 'function' && typeRefer) {
      const result = props.typeFilter(typeRefer);
      if (!result) {
        return false;
      }
    }
    if (props.onlyAllowArrayType) {
      const hasListType = [param, ...path].some((item) => {
        const itemTypeRefer = getTypeRefer(item);
        return isListType(itemTypeRefer);
      });
      if (!hasListType) {
        return false;
      }
    }
    return true;
  }

  function generateChildNodes(
    parentId: string,
    data: Parameter | TypeField | JsonSchema,
    dataType: TreeNodeDataType,
    node: FlowNodeInstance,
    param: Parameter,
    path: TypeField[] | JsonSchema[] = [],
  ): TreeNode[] {
    const nodes: TreeNode[] = [];
    const typeRefer = getTypeRefer(data);
    const currentType = typeRefer ? fullTypeID2Type.get(getFullTypeID(typeRefer)) : undefined;

    let currentNode: TreeNode;
    if (dataType === 'Parameter') {
      currentNode = createParameterTreeNode(parentId, node, param);
    } else if (dataType === 'TypeField') {
      currentNode = createTypeFieldTreeNode(parentId, node, param, data as TypeField, path as TypeField[]);
    } else {
      currentNode = createJsonSchemaTreeNode(parentId, node, param, data as JsonSchema, path as JsonSchema[])!;
    }
    if (!currentNode) {
      return [];
    }

    const isValid = isTypeValid(data, param, path);
    if (!isValid) {
      currentNode.disabled = true;
    }

    const childNodes: TreeNode[] = [];
    if (dataType !== 'Schema') {
      const targetType = isListType(typeRefer) ? getListItemType(typeRefer) : currentType;
      const childFields = targetType?.fields || [];
      childFields.forEach((field) => {
        const children = generateChildNodes(
          currentNode.id,
          field,
          'TypeField',
          node,
          param,
          [...(path as TypeField[]), field],
        );
        childNodes.push(...children);
      });
    }
    if (dataType === 'Parameter' || dataType === 'Schema') {
      const currentSchema = dataType === 'Schema' ? data as JsonSchema : param.schema;
      const objectProperties = JsonSchemaUtils.getObjectProperties(currentSchema);
      if (Array.isArray(objectProperties)) {
        objectProperties.forEach((property) => {
          const children = generateChildNodes(
            currentNode.id,
            property,
            'Schema',
            node,
            param,
            [...(path as JsonSchema[]), property],
          );
          childNodes.push(...children);
          if (children.length) {
            currentNode.collapse = false;
          }
        });
      }
    }

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
            fieldPath: undefined,
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
    const nodeDefinition = nodeRegistry.get(node.type || '');
    const getNodeIconUrl = nodeDefinition?.getNodeIconUrl;
    const iconUrl = getNodeIconUrl?.(node.data) || node.metadata?.icon || '';
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

  function getNodeTitle(data: TreeNodeData): string {
    const param = data.param!;
    if (data.schema) {
      return data.schema.code;
    }
    if (data.field) {
      return data.field.code;
    }
    return (param.name || '').trim() || param.code;
  }

  function getNodeSubTitle(data: TreeNodeData): string | undefined {
    if (data.field) {
      return data.field.name;
    }
  }

  function getNodeTypeRefer(data: TreeNodeData): TypeRefer | undefined {
    if (data.schema) {
      return JsonSchemaUtils.getTypeRefer(data.schema);
    }
    return data.field ? data.field.type : data.param!.type;
  }

  function renderParamRow(data: TreeNodeData) {
    const nodeTitle = getNodeTitle(data);
    const nodeSubTitle = getNodeSubTitle(data);
    const typeRefer = getNodeTypeRefer(data);
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

  function getNewType(nodeData: TreeNodeData): TypeRefer {
    const { param, fieldPath, schemaPath } = nodeData;
    if (!fieldPath && !schemaPath) {
      return param!.type;
    }
    const pathTypes = (fieldPath || schemaPath)!.map((item) => getTypeRefer(item)).filter(type => !!type);
    const itemType = pathTypes[pathTypes.length - 1];
    const parentTypes = [param!.type, ...pathTypes.slice(0, -1)];
    let listParentCount = 0;
    parentTypes.forEach(parentType => {
      listParentCount += getListDepth(parentType);
    });
    return wrapTypeWithArray(itemType, listParentCount);
  }

  function getNodeVariableExpr(): ValueExpressionResult {
    if (!selectedTreeNode.value || !selectedTreeNode.value.data.param) {
      return { errorTip: '请选择一个节点变量' };
    }
    const data = selectedTreeNode.value.data;
    const param = data.param!;
    const node = data.node!;
    const fields = (data.fieldPath || data.schemaPath || []).map(field => (field.code || ''));
    const fieldIds = (data.schemaPath || []).map(field => (field.id || ''));
    const type = getNewType(data);
    return {
      express: ValueExpressUtils.createNodeVariableExpr(param, node, fields, fieldIds),
      type,
    };
  }

  return {
    getNodeVariableExpr,
    renderNodeVarTab,
  };
}
