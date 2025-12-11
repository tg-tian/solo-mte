import type { Parameter } from './flow-metadata';

export interface TypeProvider {
    id: string;
    code: string;
    name: string;
    description: string;
    navigationKind: string;
}

/**
 * 类型
 * @description 可能为基础类型、BE、IDPForm等
 */
export interface TypeRefer {
    /**
     * @description 值为`default`时为基础数据类型，为其它值时可能代表BE、IDPForm等复杂类型
     */
    source: "default" | string;
    /**
     * @description
     * 当`source`的值等于`default`时，`typeId`的可能取值`string`/`boolean`/`number`/`int`/`any`...，表示基础数据类型。
     * 当`source`代表BE或IDPForm等复杂类型时，`typeId`可能需要取值为BE元数据的ID等。
     */
    typeId: string;
    /**
     * 类型编号
     * @description 用于显示，当类型表示BE时，对外显示BE的元数据ID不友好，应该显示BE的编号或名称
     */
    typeCode?: string;
    /**
     * 类型名称
     * @description 用于显示，当类型表示BE时，对外显示BE的元数据ID不友好，应该显示BE的编号或名称
     */
    typeName?: string;
    /**
     * 泛型的类型
     * @description
     * 当`source`与`typeId`表示的类型有泛型时，需要通过本字段声明泛型的类型。
     * 比如：当`source`等于`default`且`typeId`等于`list`时，列表类型有一个泛型，需要通过本字段表明列表的类型。
     */
    genericTypes?: Array<TypeRefer>;

    /** 仅部分特殊接口的返回值中包含本字段，用于区分类型是否方法 */
    kind?: 'structure' | 'function';
}

export type TypeKind = "CLASS" | "INTERFACE" | "ENUM";

export interface DecorationOption {
    name: string;
    optionMap: Record<string, string>;
}

export interface TypeField {
    code: string;
    name?: string;
    type: TypeRefer;
    isStatic: boolean;
    valueExpress?: any;
    decorationMap: Record<string, DecorationOption>;
}

export interface TypeMethod {
    /** 函数编号 */
    code: string;
    /** 函数名称 */
    name?: string;
    /** 是否静态 */
    isStatic: boolean;
    /** 返回值类型 */
    returnType: TypeRefer;
    /** 入参列表 */
    parameters: Parameter[];
    decorationMap: Record<string, DecorationOption>;
}

/**
 * 类型详情
 * @description `TypeRefer`的详细信息
 */
export interface Type {
    source: string;
    typeId: string;
    code: string;
    name?: string;
    description?: string;
    example?: string;
    implementList?: TypeRefer[];
    extendType?: TypeRefer;
    typeKind: TypeKind;
    enumItems?: {
        code: string;
        value: string;
    }[];
    fields?: TypeField[];
    methods?: TypeMethod[];
    genericTypeNames?: string[];
    decorationMap: Record<string, DecorationOption>;
    virtual: boolean;
}
