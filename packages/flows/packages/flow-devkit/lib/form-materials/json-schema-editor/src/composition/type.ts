import type { TTreeNodeData } from '@farris/flow-devkit/third-party';
import type { Parameter, JsonSchema } from '@farris/flow-devkit/types';

export type RowDataType = 'param' | 'schema';

export interface RowData {
    type: RowDataType;
    level: number;
    parameter: Parameter;
    schema?: JsonSchema;
}

export interface TreeNodeData extends TTreeNodeData<string> {
    rowData: RowData;
}
