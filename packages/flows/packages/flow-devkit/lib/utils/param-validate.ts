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
import { JsonSchemaUtils } from './json-schema';

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

    private static isSame(arrayA?: any[], arrayB?: any[]): boolean {
        if (!arrayA && !arrayB) {
            return true;
        }
        if (!arrayA || !arrayB) {
            return false;
        }
        for (let i = 0; i < arrayA.length; i++) {
            if (arrayA[i] !== arrayB[i]) {
                return false;
            }
        }
        return true;
    }

    public static isNodeVariableFieldsValid(value: NodeVariableExpr, param?: Parameter): {
        isFieldsValid: boolean;
        fields: string[];
    } {
        const fields = value?.fields || [];
        if (!fields.length) {
            return { isFieldsValid: true, fields };
        }
        if (!param) {
            return { isFieldsValid: false, fields };
        }
        if (!JsonSchemaUtils.mayHasJsonSchema(param.type)) {
            const { hasNestedFieldPath } = useTypeDetails();
            const isFieldsValid = hasNestedFieldPath(param.type, fields);
            return { isFieldsValid, fields };
        }
        const fieldIds = value.fieldIds || [];
        const schema = param.schema!;
        // 通过ID路径查找当前的编号路径
        const fieldCodes = JsonSchemaUtils.getCodePathByIdPath(schema, fieldIds);
        let isValid: boolean = false;
        if (fieldCodes.length) {
            // 成功根据ID路径查询到编号路径，更新编号路径
            if (this.isSame(value.fields, fieldCodes) === false) {  // 避免无限递归更新
                value.fields = fieldCodes;
            }
            isValid = true;
        } else {
            // 试图根据编号路径重新确定ID路径
            const newIdPath = JsonSchemaUtils.getIdPathByCodePath(schema, fields);
            if (newIdPath.length) {
                // 重新跟踪成功，更新ID路径
                value.fieldIds = newIdPath;
                isValid = true;
            }
        }
        return {
            isFieldsValid: isValid,
            fields: fieldCodes.length > 0 ? fieldCodes : fields,
        };
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
        const { isFieldsValid } = this.isNodeVariableFieldsValid(value, targetParam);
        const isDefined = !!targetNode && !!targetParam && isFieldsValid;
        if (!isDefined) {
            return nodeVariableUndefinedTip;
        }
        return undefined;
    }

    public static getTargetParameter(express: NodeVariableExpr, params: Parameter[]): Parameter | undefined {
        return ValueExpressUtils.getTargetParameter(express, params);
    }
}
