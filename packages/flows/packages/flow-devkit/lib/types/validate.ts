import type { NodeData } from "./node-definition";

export interface ValidateOptions {
    /**
     * 字段名称
     * @description
     * 可能被用于拼接错误提示文本，比如：`${fieldName}不能为空`
     */
    fieldName?: string;
}

export interface ParamCodeValidateOptions extends ValidateOptions {
    /** 非法的参数编号以及对应的提示 */
    invalidCodes?: Record<string, string>;

    /**
     * 获取同组的所有编号
     * @description 同组的编号不能重复
     */
    getAllCodes?: () => string[];
}

export interface ParamValueValidateOptions extends ValidateOptions {
    /** 是否允许参数值为空，默认允许 */
    allowValueEmpty?: boolean;

    /** 节点数据，用于辅助检查变量引用是否有效 */
    nodeData?: NodeData;
}

export interface ParamValidateOptions extends ParamCodeValidateOptions, ParamValueValidateOptions { }
