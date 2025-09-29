/**
 * 字段类型枚举
 */
export enum FormSchemaEntityField$Type {
    /**
     * 简单类型字段
     */
    SimpleField = 'SimpleField',
    /**
     * 关联/UDT类型字段
     */
    ComplexField = 'ComplexField'
}

/**
 * 字段类型对象中的类型枚举
 */
export enum FormSchemaEntityFieldType$Type {

    /**
     * 字符串
     */
    StringType = 'StringType',
    /**
     * 备注
     */
    TextType = 'TextType',
    /**
     * 数字（整数、浮点数）
     */
    NumericType = 'NumericType',
    /**
     * 布尔
     */
    BooleanType = 'BooleanType',
    /**
     * 日期
     */
    DateType = 'DateType',

    /**
     * 日期时间
     */
    DateTimeType = 'DateTimeType',

    /**
     * 枚举
     */
    EnumType = 'EnumType',
    /**
     * 实体类
     */
    EntityType = 'EntityType',

    /**
     * 分级码
     */
    HierarchyType = 'HierarchyType',

    /**
     * 对象
     */
    ObjectType = 'ObjectType',

    /**
     * 数字（大数据）
     */
    BigNumericType = 'BigNumericType'
}

/**
 * 字段类型中的名称
 */
export enum FormSchemaEntityFieldTypeName {
    /**
     * 简单类型字段
     */
    String = 'String',
    /**
     * 日期时间
     */
    DateTime = 'DateTime',
    /**
     * 日期
     */
    Date = 'Date',
    /**
     * 枚举
     */
    Enum = 'Enum',
    /**
     * 布尔
     */
    Boolean = 'Boolean',

    /**
     * 数字
     */
    Number = 'Number',

    /**
     * 备注
     */
    Text = 'Text',

    /**
     * 大数字
     */
    BigNumber = 'BigNumber'
    /**
     * 人员
     */
}
/**
 * 字段数据类型
 */
export enum FormSchemaEntityFieldElementType {
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
 * 组件类型
 */
export enum ComponentType {
    /**
     * 表单
     */
    Frame = 'frame',

    /**
     * 列表/树表类
     */
    dataGrid = 'data-grid',

    /**
     * 列表视图
     */
    listView = 'list-view',

    /**
     * 卡片类（待优化，目前类型中带有控件列布局信息）
     */
    form = 'form',

    /**
     *  附件
     */
    uploader = 'uploader',

    /**
     * 子表弹出编辑后创建的模态框组件---运行态是动态创建的
     */
    modalFrame = 'modal-frame',

    /** 表格类 */
    table = 'table',

    /** 预约日历 */
    appointmentCalendar = 'appointment-calendar'
}

/**
 * 变量类型
 */
export enum FormVariableCategory {
    locale = 'locale',
    remote = 'remote'
}

/**
 * binding 类型
 */
export enum FormBindingType {
    Form = 'Form',
    Variable = 'Variable'
}

/**
 * DOM GridField 中的数据类型
 */
export enum GridFieldDataType {
    string = 'string',
    boolean = 'boolean',
    date = 'date',
    number = 'number',
    enum = 'enum',
    datetime = 'datetime'
}

/**
 * 配置表达式的控件类型，Field:字段类， Button:按钮类，容器类:Container
 */
export enum FormExpressionSourceType {
    /** 输入控件类，包括卡片控件和列表 */
    Field = 'Field',
    /** 按钮类，包括工具栏按钮、标签页按钮、分组面板按钮等 */
    Button = 'Button',
    /** 容器类，包括普通容器、标签页、分组面板、附件等控件 */
    Container = 'Container'
}
