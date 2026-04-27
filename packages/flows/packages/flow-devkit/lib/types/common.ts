import type { TypeRefer, ValueExpress } from '@farris/flow-devkit/types';

export interface ValueExpressionResult {
    express?: ValueExpress;
    type?: TypeRefer;
    errorTip?: string;
}

export type FvComboListData = {
    name: string;
    value: string;
}[];

export interface ParamOperationOptions {
    /** 是否显示新增参数按钮 */
    showAddBtn?: boolean;
    /** 是否显示删除参数按钮 */
    showDeleteBtn?: boolean;
    /** 参数名是否可编辑 */
    paramCodeEditable?: boolean;
    /** 参数类型是否可编辑 */
    paramTypeEditable?: boolean;
    /** 参数值是否可编辑 */
    paramValueEditable?: boolean;
}
