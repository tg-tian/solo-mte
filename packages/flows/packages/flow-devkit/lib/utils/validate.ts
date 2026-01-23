import type {
    ParamValidateOptions,
    Parameter,
    NodeValidationDetails,
    ValueExpress,
    ParamValueValidateOptions,
    AssignValueExpr,
    SelectorBranch,
    JsonSchema,
} from '@farris/flow-devkit/types';
import { CompareOperator, JsonSchemaBasicType } from '@farris/flow-devkit/types';
import { ValueExpressUtils } from './value-express';
import { ParamValidateUtils } from './param-validate';

export class ValidateUtils {

    /**
     * 合并多个校验结果
     * @description 相同的提示信息将被合并
     * @returns 合并后的校验结果
     */
    public static mergeNodeValidationResult(
        ...results: (NodeValidationDetails | undefined | null)[]
    ): NodeValidationDetails {
        const errors: NodeValidationDetails['errors'] = [];
        const messageSet = new Set<string>();
        results.forEach((result) => {
            if (!result || typeof result !== 'object') {
                return;
            }
            const subErrors = result.errors || [];
            subErrors.forEach((subError) => {
                const message = subError?.message ?? '';
                if (!message) {
                    return;
                }
                if (!messageSet.has(message)) {
                    errors.push({ message });
                    messageSet.add(message);
                }
            });
        });
        return { isValid: !!errors.length, errors };
    }

    private static validateJsonSchema(schema?: JsonSchema, options?: ParamValidateOptions): string[] {
        if (!schema) {
            return [];
        }
        if (schema.type === JsonSchemaBasicType.Array) {
            return this.validateJsonSchema(schema.items);
        }
        if (schema.type === JsonSchemaBasicType.Object && Array.isArray(schema.properties)) {
            const errors: string[] = [];
            const allCodes = schema.properties.map((property) => property.code);
            const getAllCodes = () => allCodes;
            schema.properties.forEach((property) => {
                const codeError = ParamValidateUtils.validateCode(property.code, { ...options, getAllCodes });
                codeError && errors.push(codeError);
                errors.push(...this.validateJsonSchema(property, options));
            });
            return errors;
        }
        return [];
    }

    /**
     * 校验一个参数列表
     * @param params  参数列表
     * @param options 校验选项
     * @returns 校验结果
     */
    public static validateParameters(params: Parameter[], options?: ParamValidateOptions): NodeValidationDetails {
        const allCodes = params.map(param => param.code);
        const allNames = params.map(param => (param.name || '').trim() || param.code);
        const getAllCodes = () => allCodes;
        let messages: string[] = [];
        (params ?? []).forEach((param) => {
            const codeError = ParamValidateUtils.validateCode(param.code, { ...options, getAllCodes });
            codeError && messages.push(codeError);
            messages.push(...this.validateJsonSchema(param.schema, options));
            const name = (param.name || '').trim();
            if (name) {
                const sames = allNames.filter((item) => item === name);
                if (sames.length > 1) {
                    messages.push(`显示名称不可重复`);
                }
            }
        });
        (params ?? []).forEach((param) => {
            const valueError = ParamValidateUtils.validateValue(param.valueExpr, options);
            valueError && messages.push(valueError);
        });
        messages = this.removeDuplicates(messages);
        return {
            isValid: !messages.length,
            errors: messages.map(message => ({ message })),
        };
    }

    /**
     * 校验一个值表达式
     * @param express 值表达式
     * @param options 校验选项
     * @returns 校验结果
     */
    public static validateValueExpress(express?: ValueExpress, options?: ParamValueValidateOptions): NodeValidationDetails {
        const message = ParamValidateUtils.validateValue(express, options);
        if (message) {
            return { isValid: false, errors: [{ message }] };
        } else {
            return { isValid: true, errors: [] };
        }
    }

    /**
     * 校验一个赋值表达式列表
     * @param assignValueExprs 赋值表达式列表
     * @param options          校验选项
     * @returns 校验结果
     */
    public static validateAssignValueExprs(assignValueExprs?: AssignValueExpr[], options?: ParamValueValidateOptions): NodeValidationDetails {
        if (!assignValueExprs || !Array.isArray(assignValueExprs)) {
            return { isValid: true, errors: [] };
        }
        let messages: string[] = [];
        assignValueExprs.forEach((express) => {
            const leftValueOptions: ParamValueValidateOptions = {
                ...options,
                allowValueEmpty: false,
                fieldName: '变量',
            };
            const leftValueError = ParamValidateUtils.validateValue(express.leftExpress, leftValueOptions);
            const rightValueOptions: ParamValueValidateOptions = {
                ...options,
                allowValueEmpty: true,
            }
            const rightValueError = ParamValidateUtils.validateValue(express.rightExpress, rightValueOptions);
            leftValueError && messages.push(leftValueError);
            rightValueError && messages.push(rightValueError);
        });
        messages = this.removeDuplicates(messages);
        return {
            isValid: !messages.length,
            errors: messages.map(message => ({ message })),
        };
    }

    /**
     * 校验一个选择器节点的条件分支列表
     * @param branches 条件分支列表
     * @param options  校验选项
     * @returns 校验结果
     */
    public static validateSelectorBranches(branches: SelectorBranch[], options?: ParamValueValidateOptions): NodeValidationDetails {
        if (!branches || !Array.isArray(branches)) {
            return { isValid: true, errors: [] };
        }
        branches = branches.filter(branch => !!branch.conditionExpr);
        let messages: string[] = [];
        branches.forEach(branch => {
            const expresses = branch.conditionExpr?.expresses || [];
            if (expresses.length === 0) {
                messages.push(`分支的条件不能为空`);
                return;
            }
            expresses.forEach(express => {
                if (!ValueExpressUtils.isCompareExpr(express)) {
                    return;
                }
                if (!express.leftExpress) {
                    messages.push(`条件的左值不能为空`);
                }
                const leftValueError = ParamValidateUtils.validateValue(express.leftExpress, options);
                leftValueError && messages.push(leftValueError);
                if (!express.operator) {
                    messages.push(`条件的比较符不能为空`);
                }
                if (express.operator !== CompareOperator.isEmpty && express.operator !== CompareOperator.notEmpty) {
                    if (!express.rightExpress) {
                        messages.push(`条件的右值不能为空`);
                    }
                    const rightValueError = ParamValidateUtils.validateValue(express.rightExpress, options);
                    rightValueError && messages.push(rightValueError);
                }
            });
        });
        messages = this.removeDuplicates(messages);
        return {
            isValid: !messages.length,
            errors: messages.map(message => ({ message })),
        };
    }

    private static removeDuplicates<T>(values: T[]): T[] {
        const valueSet = new Set<T>();
        const result: T[] = [];
        values.forEach((value) => {
            if (!valueSet.has(value) && value) {
                valueSet.add(value);
                result.push(value);
            }
        });
        return result;
    }
}
