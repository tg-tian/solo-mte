import type {
    ParamCodeValidateOptions,
    ParamValueValidateOptions,
    ValueExpress,
    Parameter,
    NodeVariableExpr,
} from '@farris/flow-devkit/types';
import { type NodeVariables, useTypeDetails } from '@farris/flow-devkit/composition';
import { VARIABLE_NAME_REGEX, NODE_VARIABLES_KEY } from '@farris/flow-devkit/constants';
import { ValueExpressUtils } from './value-express';

export class ParamValidateUtils {

    public static validateCode(code: string, options?: ParamCodeValidateOptions): string | undefined {
        const fieldName = options?.fieldName || '参数名';
        if (!code) {
            return `${fieldName}不可为空`;
        }
        if (!VARIABLE_NAME_REGEX.test(code)) {
            return `${fieldName}只能包含字母、数字或下划线，并且以字母或下划线开头`;
        }
        const invalidCodes = options?.invalidCodes ?? {};
        if (invalidCodes[code]) {
            return invalidCodes[code];
        }
        const allCodes = options?.getAllCodes?.() ?? [];
        const sames = allCodes.filter((item) => item === code);
        if (sames.length > 1) {
            return `${fieldName}不可重复`;
        }
        return undefined;
    }

    public static validateValue(value?: ValueExpress, options?: ParamValueValidateOptions): string | undefined {
        const fieldName = options?.fieldName || '参数值';
        const allowValueEmpty = options?.allowValueEmpty ?? true;
        if (!value && !allowValueEmpty) {
            return `${fieldName}不可为空`;
        }
        if (!value) {
            return undefined;
        }
        const nodeVariableUndefinedTip = `节点变量未定义`;
        const nodeData = options?.nodeData;
        if (!ValueExpressUtils.isNodeVariableExpr(value) || !nodeData) {
            return undefined;
        }
        const nodeVarsList: NodeVariables[] = nodeData[NODE_VARIABLES_KEY];
        const nodeCode = value.nodeCode;
        const nodeVariables = nodeVarsList.find(
            (item) => item.node.data.code === nodeCode
        );
        if (!nodeVariables) {
            return nodeVariableUndefinedTip;
        }
        const targetNode = nodeVariables.node;
        const targetParam = this.getTargetParameter(value, nodeVariables.params || []);
        const { hasNestedFieldPath } = useTypeDetails();
        const isFieldsValid = hasNestedFieldPath(targetParam?.type, value.fields);
        const isDefined = !!targetNode && !!targetParam && isFieldsValid;
        if (!isDefined) {
            return nodeVariableUndefinedTip;
        }
        return undefined;
    }

    private static getTargetParameter(express: NodeVariableExpr, params: Parameter[]): Parameter | undefined {
        const targetById = params.find((item) => {
            return item.id === express.variableId && item.id && item.code;
        });
        if (targetById) {
            return targetById;
        }
        const targetByCode = params.find((item) => {
            return item.code === express.variable && item.code;
        });
        return targetByCode;
    }
}
