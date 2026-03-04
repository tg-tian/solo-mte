import type { Parameter } from './flow-metadata';

/** 调试面板输入参数类型 */
export type DebugParamType = 'string' | 'number' | 'boolean' | 'fileID' | 'object' | 'array';

export interface DebugParamTypeInfo {
    type: DebugParamType;
    multiple: boolean;
}

/** 调试面板输入参数 */
export interface DebugParam {
    name: string;
    label: string;
    type: DebugParamType;
    value: any;
    required?: boolean;
    description?: string;
    jsonError?: string;
    /** 是否支持多文件 */
    multiple?: boolean;
    /** 原始参数 */
    raw?: Parameter;
}
