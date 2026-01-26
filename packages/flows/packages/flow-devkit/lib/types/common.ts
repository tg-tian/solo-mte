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
