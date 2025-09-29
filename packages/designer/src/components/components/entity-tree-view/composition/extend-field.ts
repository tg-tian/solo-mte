import { IdService } from "../../view-model-designer/method-manager/service/id.service";

export enum ElementObjectType {
    /**
     * 未设置
     */
    None = "None",
    /**
     * 关联
     */
    Association = "Association",
    /**
     * 枚举
     */
    Enum = "Enum",
    /**
     * 动态属性
     */
    DynamicProp = "DynamicProp"
}
/**
 * 字段数据类型
 */
export enum ElementDataType {
    /**
     * 文本
     */
    String = "String",
    /**
     * 备注
     */
    Text = "Text",
    /**
     * 整数
     */
    Integer = "Integer",
    /**
     * 浮点数
     */
    Decimal = "Decimal",
    /**
     * 布尔型
     */
    Boolean = "Boolean",
    /**
     * 日期型
     */
    Date = "Date",
    /**
     * 日期时间型
     */
    DateTime = "DateTime",
    /**
     * 二进制
     */
    Binary = "Binary"
}
/**
 * 枚举类型
 */
export class EnumData {
    public value: string = '';
    public name: string = '';
}
export class ExtendFieldEntity {
    // id
    id: string = new IdService().generate();

    // 字段编号
    code = '';

    // 字段名称
    name = '';

    label = '';

    // 字段类型
    type = ElementDataType.String;

    // 是否只读
    readonly = false;

    // 是否必填
    require = false;

    // 关联 枚举类型
    objectType: ElementObjectType = ElementObjectType.None;

    // 字段长度  文本36 浮点18 其他0
    length = 36;

    // 字段精度 整数：0 浮点：2
    precision = 0;

    // 是否支持多语
    multiLanguage = false;

    // 枚举值
    enumValues?: EnumData[];

    // 默认值
    defaultValue: any;

}

/**
 * 字段类型
 */
export const FieldTypeEnums = [
    {
        value: ElementDataType.String, text: '文本'
    },
    {
        value: ElementDataType.Text, text: '备注'
    },
    {
        value: ElementDataType.Integer, text: '整数'
    },
    {
        value: ElementDataType.Decimal, text: '浮点数字'
    },
    {
        value: ElementDataType.Boolean, text: '布尔型'
    },
    {
        value: ElementDataType.Date, text: '日期'
    },
    {
        value: ElementDataType.DateTime, text: '日期时间'
    }
];

/**
 * 字段对象类型
 */
export const FieldObjectTypeEnums = [
    {
        value: ElementObjectType.None, text: '无'
    },
    {
        value: ElementObjectType.Enum, text: '枚举'
    },
    {
        value: ElementObjectType.Association, text: '关联'
    }
];
