import { markRaw } from 'vue';
import type { NodeDefinition, Parameter, TypeRefer, JsonSchema } from '@farris/flow-devkit';
import { BasicTypeRefer, BuiltinNodeType, ValidateUtils, ValueExpressUtils } from '@farris/flow-devkit';
import { loopIcon } from '@flow-designer/assets/images';
import SubFlowNode from './node.component.vue';
import { NodeProperty } from './property-config';

export const LOOP_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.Loop,
        label: '循环',
        description: '根据循环数组，循环执行一段逻辑',
        icon: loopIcon,
        isSubFlowContainer: true,
        debuggable: false,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            },
            {
                id: 'output',
                position: 'right',
                type: 'source',
            }
        ]
    },
    component: markRaw(SubFlowNode),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    initialData() {
        return {
            iterableExprType: undefined,
            iterableExpr: undefined,
            iterableVariable: 'item',
        };
    },
    getOutputParamsForChildNodes: (nodeData) => {
        const index: Parameter = {
            id: `${nodeData.id}_index`,
            code: 'index',
            type: BasicTypeRefer.IntegerType,
            writable: false,
        };
        const itemCode = nodeData.iterableVariable || 'item';
        let itemType: TypeRefer | undefined = undefined;
        let itemSchema: JsonSchema | undefined = undefined;
        if (ValueExpressUtils.isNodeVariableExpr(nodeData.iterableExpr)) {
            const valueExpressType = ValueExpressUtils.unwrapValueExpressType(
                ValueExpressUtils.getValueExpressType(nodeData.iterableExpr, nodeData)
            );
            if (valueExpressType) {
                itemType = valueExpressType.type;
                itemSchema = valueExpressType.schema;
            }
        } else {
            itemType = (nodeData.iterableExprType as TypeRefer)?.genericTypes?.[0];
        }
        const item = {
            id: `${nodeData.id}_item`,
            code: itemCode,
            name: `${itemCode} (in items)`,
            type: itemType,
            schema: itemSchema,
            writable: false,
        } as Parameter;
        return [item, index, ...nodeData.outputParams];
    },
    validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateValueExpress(nodeData.iterableExpr, {
                nodeData,
                allowValueEmpty: false,
                fieldName: '循环数组',
            }),
            ValidateUtils.validateParameters(nodeData.outputParams, {
                nodeData,
                invalidCodes: {
                    index: '不能以 index 作为变量名',
                    item: '不能以 item 作为变量名',
                },
            }),
        );
    },
};
