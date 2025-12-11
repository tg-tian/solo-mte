export interface HttpParameter {
    id: string;
    code: string;
    type: any;
    name: string;
    dataType: number;
    required: boolean;
    defaultValue?: string;
    enableValueMapping?: boolean;
    valueSerializeType?: number;
    valueExpr?: any;
}

// 数据类型映射
export const DataTypeMapping = {
    'String': 1,
    'integer': 2,
    'boolean': 3,
    'number': 18
};

// 反向映射（从dataType到显示名称）
export const ReverseDataTypeMapping = {
    1: 'String',
    2: 'integer',
    3: 'boolean',
    18: 'number'
};