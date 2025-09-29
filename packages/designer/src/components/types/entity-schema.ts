import {
    FormSchemaEntityField$Type,
    FormSchemaEntityFieldElementType,
    FormSchemaEntityFieldType$Type,
    FormSchemaEntityFieldTypeName
} from "./enums";

/**
 * 枚举类型
 */
export interface EnumData {
    value: string;

    name: string;
}

/**
 * 字段类型对象
 */
export declare class FormSchemaEntityFieldType {
    $type: FormSchemaEntityFieldType$Type;

    name: FormSchemaEntityFieldTypeName | any;

    length?: number;

    precision?: number;

    valueType?: FormSchemaEntityFieldType;

    enumValues?: EnumData[];

    fields?: FormSchemaEntityField[];

    displayName?: string;

    primary?: string;

    entities?: FormSchemaEntity[];

    // 用于区分日期/日期事件和整型/浮点型数据
    elementType?: FormSchemaEntityFieldElementType;

    // 扩展属性:  运行时定制用
    extendProperty?: any;
}

/**
 * 字段编辑器对象
 */
export interface FormSchemaEntityFieldEditor {
    $type: string;

    [propName: string]: any;
}

/**
 * 字段
 */
export interface FormSchemaEntityField {
    $type: FormSchemaEntityField$Type;

    id: string;

    originalId: string;

    code: string;

    label: string;

    bindingField: string;

    name: string;

    defaultValue?: any;

    require?: boolean;

    readonly?: boolean;

    type: FormSchemaEntityFieldType;

    editor?: FormSchemaEntityFieldEditor;

    path?: string;

    bindingPath?: string;

    multiLanguage?: boolean;

    // 表达式
    expression?: any;
}

/**
 * 实体类型对象
 */
export interface FormSchemaEntityType {
    $type: string;

    name: string;

    primary: string;

    fields: FormSchemaEntityField[];

    entities?: FormSchemaEntity[];

    displayName?: string;
}

/**
 * 实体
 */
export interface FormSchemaEntity {
    id: string;

    code: string;

    name: string;

    label: string;

    type: FormSchemaEntityType;
}

/**
 * schema
 */
export interface FormSchema {
    // public dataSource: string;
    sourceUri: string;

    id: string;

    code: string;

    name: string;

    entities: FormSchemaEntity[];

    variables: FormSchemaEntityField[];

    eapiId: string;

    extendProperties: { enableStdTimeFormat: boolean };

    eapiCode?: string;

    eapiName?: string;

    eapiNameSpace?: string;

    voPath?: string;

    voNameSpace?: string;
}
