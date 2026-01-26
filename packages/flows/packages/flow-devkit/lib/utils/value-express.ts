import type {
    Parameter, FlowNodeInstance, NodeVariableExpr, SystemVariableExpr, BoolConstExpr, NumberConstExpr,
    StringConstExpr, StringsConstExpr, SelectorBranch, LogicExpr, CompareExpr,
    ValueExpress, CompareOperatorType, AssignValueExpr, MethodInvokeExpr,
    MethodParameter, ValueExpressType, NodeData, TypeMethod, TypeRefer
} from '@farris/flow-devkit/types';
import { NODE_VARIABLES_KEY } from '@farris/flow-devkit/constants';
import { type NodeVariables, useTypeDetails } from '@farris/flow-devkit/composition';
import { useMethodTypes } from '@farris/flow-devkit/hooks';
import { LogicOperator, ValueExpressKind, BasicTypeRefer, JsonSchemaBasicType } from '@farris/flow-devkit/types';
import { uuid } from './uuid';
import { JsonSchemaUtils } from './json-schema';

export class ValueExpressUtils {

    public static createNodeVariableExpr(param: Parameter, node: FlowNodeInstance, fields?: string[], fieldIds?: string[]): NodeVariableExpr {
        return {
            kind: ValueExpressKind.nodeVariable,
            nodeCode: node.data.code,
            variable: param.code,
            variableId: param.id,
            fields: fields || [],
            fieldIds,
        };
    }

    public static createSystemVariableExpr(variable: string): SystemVariableExpr {
        return {
            kind: ValueExpressKind.systemVariable,
            variable,
        };
    }

    public static createBoolConstExpr(value: boolean): BoolConstExpr {
        return {
            kind: ValueExpressKind.boolConst,
            value,
        };
    }

    public static createNumberConstExpr(value: number): NumberConstExpr {
        return {
            kind: ValueExpressKind.numberConst,
            value,
        };
    }

    public static createStringConstExpr(value: string): StringConstExpr {
        return {
            kind: ValueExpressKind.stringConst,
            value,
        }
    }

    public static createStringsConstExpr(value: string[]): StringsConstExpr {
        return {
            kind: ValueExpressKind.stringsConst,
            value,
        }
    }

    public static createCompareExpr(
        leftExpress?: ValueExpress,
        operator?: CompareOperatorType,
        rightExpress?: ValueExpress,
    ): CompareExpr {
        return {
            kind: ValueExpressKind.compare,
            leftExpress,
            operator,
            rightExpress,
        }
    }

    public static createLogicExpr(expresses?: (CompareExpr | LogicExpr)[]): LogicExpr {
        expresses = expresses || [];
        return {
            kind: ValueExpressKind.logic,
            expresses,
            operator: LogicOperator.and,
        };
    }

    public static createSelectorBranch(conditionExpr?: LogicExpr): SelectorBranch {
        return {
            conditionExpr,
            port: uuid(),
        };
    }

    public static createAssignValueExpr(leftExpress?: ValueExpress, rightExpress?: ValueExpress): AssignValueExpr {
        return {
            kind: ValueExpressKind.assignValue,
            leftExpress,
            rightExpress,
        };
    }

    public static createMethodInvokeExpr(typeUrl: string, methodCode: string, parameters: MethodParameter[]): MethodInvokeExpr {
        return {
            kind: ValueExpressKind.methodInvoke,
            isStatic: true,
            typeUrl,
            methodCode,
            parameters,
        };
    }

    public static isNodeVariableExpr(value: ValueExpress): value is NodeVariableExpr {
        return !!value && value.kind === ValueExpressKind.nodeVariable;
    }

    public static isSystemVariableExpr(value: ValueExpress): value is SystemVariableExpr {
        return !!value && value.kind === ValueExpressKind.systemVariable;
    }

    public static isCompareExpr(value: ValueExpress): value is CompareExpr {
        return !!value && value.kind === ValueExpressKind.compare;
    }

    public static isMethodInvokeExpr(value: any): value is MethodInvokeExpr {
        return (
            !!value &&
            typeof value === "object" &&
            value.kind === ValueExpressKind.methodInvoke &&
            !!value.typeUrl &&
            !!value.methodCode
        );
    }

    public static getMethodTypeByMethodInvokeExpr(express: MethodInvokeExpr): TypeMethod | undefined {
        if (!this.isMethodInvokeExpr(express)) {
            return undefined;
        }
        const typeRefer: TypeRefer = {
            source: 'default',
            typeId: express.typeUrl!,
        };
        const { mergedMethodTypes } = useMethodTypes();
        const methodType = mergedMethodTypes.value.find((type) => {
            return type.source === typeRefer.source && type.typeId === typeRefer.typeId;
        });
        const methods = methodType?.methods || [];
        return methods.find((method) => {
            return method.code === express.methodCode;
        });
    }

    public static getReturnTypeByMethodInvokeExpr(express: MethodInvokeExpr): TypeRefer | undefined {
        const method = this.getMethodTypeByMethodInvokeExpr(express);
        return method?.returnType;
    }

    public static getTargetParameter(express: NodeVariableExpr, params: Parameter[]): Parameter | undefined {
        const targetById = params.find((item) => {
            return item.id === express.variableId && item.id && item.code;
        });
        if (targetById) {
            if (express.variable !== targetById.code) {
                express.variable = targetById.code;
            }
            return targetById;
        }
        const targetByCode = params.find((item) => {
            return item.code === express.variable && item.code;
        });
        if (targetByCode) {
            express.variableId = targetByCode.id;  // 重新跟踪变化
        }
        return targetByCode;
    }

    /**
     * 获取常量表达式的类型信息
     * @description 对于其它类型的表达式一律返回`undefined`
     * @param constValueExpress 常量表达式
     * @returns 值表达式的类型信息
     */
    public static getConstValueExpressType(express: ValueExpress): ValueExpressType | undefined {
        if (!express || !express.kind) {
            return undefined;
        }
        switch (express.kind) {
            case ValueExpressKind.boolConst:
                return { type: BasicTypeRefer.BooleanType };
            case ValueExpressKind.numberConst:
                return { type: BasicTypeRefer.NumberType };
            case ValueExpressKind.stringConst:
                return { type: BasicTypeRefer.StringType };
            case ValueExpressKind.stringsConst:
                return { type: BasicTypeRefer.StringArrayType };
        }
        return undefined;
    }

    /**
     * 获取节点变量引用表达式的类型信息
     * @description 对于其它类型的表达式一律返回`undefined`
     * @param express  节点变量引用表达式
     * @param nodeData 值表达式所属节点的数据
     * @returns 值表达式的类型信息
     */
    public static getNodeVariableExpressType(express: ValueExpress, nodeData: NodeData): ValueExpressType | undefined {
        if (!express || !nodeData || !this.isNodeVariableExpr(express)) {
            return undefined;
        }
        const nodeVarsList: NodeVariables[] = nodeData[NODE_VARIABLES_KEY];
        if (!Array.isArray(nodeVarsList)) {
            return undefined;
        }
        const nodeCode = express.nodeCode;
        const nodeVariables = nodeVarsList.find(
            (item) => item.node.data.code === nodeCode
        );
        const targetParam = this.getTargetParameter(express, nodeVariables?.params || []);
        if (!targetParam) {
            return undefined;
        }
        if (JsonSchemaUtils.mayHasJsonSchema(targetParam.type)) {
            const fieldIds = express.fieldIds;
            if (!fieldIds || !fieldIds.length) {
                return { type: targetParam.type, schema: targetParam.schema };
            }
            const fieldSchema = JsonSchemaUtils.getFieldJsonSchema(targetParam.schema, fieldIds);
            if (!fieldSchema) {
                return undefined;
            }
            return { type: JsonSchemaUtils.getTypeRefer(fieldSchema)!, schema: fieldSchema };
        } else {
            const { getFieldTypeRefer } = useTypeDetails();
            const type = getFieldTypeRefer(targetParam.type, express.fields);
            if (type) {
                return { type };
            }
        }
        return undefined;
    }

    /**
     * 获取值表达式的类型信息
     * @description 目前仅支持推断`节点变量引用表达式`和`常量表达式`的类型，其它一律返回`undefined`，待后续完善
     * @param express  值表达式
     * @param nodeData 值表达式所属节点的数据
     * @returns 值表达式的类型信息
     */
    public static getValueExpressType(express: ValueExpress, nodeData: NodeData): ValueExpressType | undefined {
        const constValueExpressType = this.getConstValueExpressType(express);
        if (constValueExpressType) {
            return constValueExpressType;
        }
        const nodeVariableExpressType = this.getNodeVariableExpressType(express, nodeData);
        if (nodeVariableExpressType) {
            return nodeVariableExpressType;
        }
        return undefined;
    }

    public static unwrapValueExpressType(valueExpressType?: ValueExpressType): ValueExpressType | undefined {
        if (!valueExpressType) {
            return undefined;
        }
        const { type, schema } = valueExpressType;
        if (schema && schema.type === JsonSchemaBasicType.Array) {
            const itemSchema = schema.items;
            const itemType = JsonSchemaUtils.getTypeRefer(itemSchema);
            if (itemType) {
                return { type: itemType, schema: itemSchema };
            }
        }
        const itemType = type.genericTypes?.[0];
        if (itemType) {
            return { type: itemType };
        }
        return undefined;
    }
}
