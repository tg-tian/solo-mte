import type { ValueExpress } from './flow-metadata';

/**
 * 值表达式的类型
 * @description 不止是参数的表达式，包含了所有后端定义的值表达式的类型
 */
export const ValueExpressKind = {
    nodeVariable: 'nodeVariable',
    systemVariable: 'systemVariable',
    boolConst: 'boolConst',
    numberConst: 'numberConst',
    stringConst: 'stringConst',
    stringsConst: 'stringsConst',
    staticFieldConst: 'staticFieldConst',
    enumConst: 'enumConst',
    compare: 'compare',
    logic: 'logic',
    assignValue: 'assignValue',
    methodInvoke: 'methodInvoke',
} as const;

export interface NodeVariableExpr extends ValueExpress {
    kind: typeof ValueExpressKind.nodeVariable;
    /** 节点编号 */
    nodeCode: string;
    /**
     * 变量名
     * @description 节点的输出变量的编号，对应`Parameter`的`code`字段
     */
    variable: string;
    /**
     * 字段编号路径
     * @description 如果希望选择一个`Object`类型的变量的子字段，需要通过`fields`表明字段的路径
     */
    fields?: string[];

    /**
     * 变量ID
     * @description 后端不存储，仅前端内部使用，与`Parameter.id`对应
     */
    variableId?: string;

    /**
     * 字段ID路径
     * @description 后端不存储，仅前端内部使用，与`JsonSchema.id`对应
     */
    fieldIds?: string[];
}

/** 系统变量值表达式 */
export interface SystemVariableExpr extends ValueExpress {
    kind: typeof ValueExpressKind.systemVariable;
    /**
     * 系统变量名
     * @description 暂时只有对话流能看到，后续再通过注册的方式加载
     */
    variable: string;
}

/** 布尔常量值表达式 */
export interface BoolConstExpr extends ValueExpress {
    kind: typeof ValueExpressKind.boolConst;
    value: boolean;
}

/** 数值常量值表达式 */
export interface NumberConstExpr extends ValueExpress {
    kind: typeof ValueExpressKind.numberConst;
    value: number;
}

/** 字符串常量值表达式 */
export interface StringConstExpr extends ValueExpress {
    kind: typeof ValueExpressKind.stringConst;
    value: string;
}

/** 字符串数组常量值表达式 */
export interface StringsConstExpr extends ValueExpress {
    kind: typeof ValueExpressKind.stringsConst;
    value: string[];
}

/** 未知用途的值表达式 */
export interface StaticFieldConstExpr extends ValueExpress {
    kind: typeof ValueExpressKind.staticFieldConst;
    dslType: string;
    fieldCode: string;
}

/** 未知用途的值表达式 */
export interface EnumConstExpr extends ValueExpress {
    kind: typeof ValueExpressKind.enumConst;
    dslType: string;
    fieldCode: string;
}

/**
 * 值比较符
 * @description 后端支持的所有比较符
 */
export const CompareOperator = {
    equal: 'equal',
    notEqual: 'notEqual',
    greaterThan: 'greaterThan',
    greaterThanEqual: 'greaterThanEqual',
    lessThan: 'lessThan',
    lessThanEqual: 'lessThanEqual',
    lengthGreaterThan: 'lengthGreaterThan',
    lengthGreaterThanEqual: 'lengthGreaterThanEqual',
    lengthLessThan: 'lengthLessThan',
    lengthLessThanEqual: 'lengthLessThanEqual',
    contain: 'contain',
    notContain: 'notContain',
    isEmpty: 'isEmpty',
    notEmpty: 'notEmpty',
} as const;

export const CompareOperatorName = {
    [CompareOperator.equal]: '等于',
    [CompareOperator.notEqual]: '不等于',
    [CompareOperator.greaterThan]: '大于',
    [CompareOperator.greaterThanEqual]: '大于等于',
    [CompareOperator.lessThan]: '小于',
    [CompareOperator.lessThanEqual]: '小于等于',
    [CompareOperator.lengthGreaterThan]: '长度大于',
    [CompareOperator.lengthGreaterThanEqual]: '长度大于等于',
    [CompareOperator.lengthLessThan]: '长度小于',
    [CompareOperator.lengthLessThanEqual]: '长度小于等于',
    [CompareOperator.contain]: '包含',
    [CompareOperator.notContain]: '不包含',
    [CompareOperator.isEmpty]: '为空',
    [CompareOperator.notEmpty]: '不为空',
} as const;

export type CompareOperatorType = typeof CompareOperator[keyof typeof CompareOperator];

/** 比较表达式 */
export interface CompareExpr extends ValueExpress {
    kind: typeof ValueExpressKind.compare;
    /** 左值表达式 */
    leftExpress?: ValueExpress;
    /** 比较符 */
    operator?: CompareOperatorType;
    /** 右值表达式 */
    rightExpress?: ValueExpress;
}

export const LogicOperator = {
    and: 'and',
    or: 'or',
} as const;

export const LogicOperatorName = {
    [LogicOperator.and]: '且',
    [LogicOperator.or]: '或',
} as const;

export type LogicOperatorType = typeof LogicOperator[keyof typeof LogicOperator];

/**
 * 逻辑表达式
 * @description 由多个比较表达式组合而成
 */
export interface LogicExpr extends ValueExpress {
    kind: typeof ValueExpressKind.logic;
    /** 表达式列表，一般是`CompareExpr`或者`LogicExpr`类型的表达式 */
    expresses: ValueExpress[];
    /** 表达式之间的关系 */
    operator: LogicOperatorType;
}

/**
 * 赋值表达式
 * @description 用于修改一个变量的值
 */
export interface AssignValueExpr extends ValueExpress {
    kind: typeof ValueExpressKind.assignValue;
    /** 左值表达式 */
    leftExpress?: ValueExpress;
    /** 右值表达式 */
    rightExpress?: ValueExpress;
}

export interface MethodParameter {
    /** 参数编号 */
    code: string;
    /** 参数值 */
    value: ValueExpress;
}

/**
 * 方法调用表达式
 */
export interface MethodInvokeExpr extends ValueExpress {
    kind: typeof ValueExpressKind.methodInvoke;
    /** 是否静态 */
    isStatic?: boolean;
    /** 类型路径，静态时非空 */
    typeUrl?: string;
    express?: ValueExpress;
    /** 方法编号 */
    methodCode: string;
    /** 入参列表 */
    parameters: MethodParameter[];
}
