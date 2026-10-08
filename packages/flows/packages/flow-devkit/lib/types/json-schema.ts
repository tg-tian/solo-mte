export type JsonSchemaType = 'array' | 'object' | 'string' | 'boolean' | 'number' | 'int';

export enum JsonSchemaBasicType {
    Array = 'array',
    Object = 'object',
    String = 'string',
    Boolean = 'boolean',
    Number = 'number',
    Integer = 'int',
}

export interface JsonSchema {
    /**
     * 唯一标识
     * @description 后端不存储`id`字段，仅前端内部使用，创建参数时必须设置`id`属性
     */
    id: string;

    type: JsonSchemaType;
    code: string;
    name?: string;
    description?: string;
    items?: JsonSchema;
    properties?: JsonSchema[];
}
