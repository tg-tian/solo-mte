import type {
    Parameter, FlowNodeInstance, NodeVariableExpr, SystemVariableExpr, BoolConstExpr, NumberConstExpr,
    StringConstExpr, StringsConstExpr, SelectorBranch, LogicExpr, CompareExpr,
    ValueExpress, CompareOperatorType, AssignValueExpr, MethodInvokeExpr,
    MethodParameter,
} from '@farris/flow-devkit/types';
import { LogicOperator, ValueExpressKind } from '@farris/flow-devkit/types';
import { uuid } from './uuid';

export class ValueExpressUtils {

    public static createNodeVariableExpr(param: Parameter, node: FlowNodeInstance, fields?: string[]): NodeVariableExpr {
        return {
            kind: ValueExpressKind.nodeVariable,
            nodeCode: node.data.code,
            variable: param.code,
            fields: fields || [],
            variableId: param.id,
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
        return value.kind === ValueExpressKind.nodeVariable;
    }

    public static isSystemVariableExpr(value: ValueExpress): value is SystemVariableExpr {
        return value.kind === ValueExpressKind.systemVariable;
    }

    public static isCompareExpr(value: ValueExpress): value is CompareExpr {
        return value.kind === ValueExpressKind.compare;
    }
}
