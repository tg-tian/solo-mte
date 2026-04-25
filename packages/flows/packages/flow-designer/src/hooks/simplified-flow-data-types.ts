import type { CompareOperatorType } from '@farris/flow-devkit';

// #region 值表达式

/** 变量引用值表达式 */
export interface SimplifiedVariableRef {
    nodeId: string;
    variablePath: string;
}

/** 常量值表达式 */
export interface SimplifiedLiteral {
    literal: string | number | boolean | any[];
}

/** 嵌套函数调用值表达式 */
export interface SimplifiedMethodInvokeValue {
    methodInvoke: {
        typeUrl: string;
        methodCode: string;
        parameters: SimplifiedMethodParam[];
    };
}

/** 简化版值表达式（三选一） */
export type SimplifiedValueExpr = SimplifiedVariableRef | SimplifiedLiteral | SimplifiedMethodInvokeValue;

/** 简化版函数调用参数 */
export interface SimplifiedMethodParam {
    code: string;
    value: SimplifiedValueExpr;
}

// #endregion

// #region 简化版参数

/** 带编号和类型的参数（设备事件监听 outputParams 等使用） */
export interface SimplifiedParamWithCode {
    code: string;
    type?: string;
}

/** 带编号和值的参数（设备调用 inputParams 等使用） */
export interface SimplifiedParamWithValue {
    code: string;
    value: SimplifiedValueExpr;
}

/** 带编号、类型和值的参数（变量定义 outputParams 使用） */
export interface SimplifiedParamWithValueAndType {
    code: string;
    type: string;
    value: SimplifiedValueExpr;
}

// #endregion

// #region 选择器相关

/** 简化版比较条件 */
export interface SimplifiedCondition {
    left: SimplifiedValueExpr;
    operator: CompareOperatorType;
    right: SimplifiedValueExpr;
}

/** 简化版选择器分支 */
export interface SimplifiedBranch {
    logicOperator: 'and' | 'or' | null;
    conditions: SimplifiedCondition[];
    port: string;
}

// #endregion

// #region 连接线

/** 简化版连接线 */
export interface SimplifiedEdge {
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort?: string;
    targetPort?: string;
}

// #endregion

// #region 节点

/** 简化版节点基类 */
export interface SimplifiedNodeBase {
    id: string;
    type: string;
    name: string;
    position?: { x: number; y: number };
    parentNodeId?: string;
}

/** 变量定义节点 */
export interface SimplifiedVariableDefNode extends SimplifiedNodeBase {
    type: 'variableDef';
    outputParams: SimplifiedParamWithValueAndType[];
}

/** 变量赋值节点 */
export interface SimplifiedBatchAssignValueNode extends SimplifiedNodeBase {
    type: 'batchAssignValue';
    assignmentExpressions: {
        nodeId: string;
        variablePath: string;
        newValue: SimplifiedValueExpr;
    }[];
}

/** 设备事件监听节点 */
export interface SimplifiedDeviceEventListenNode extends SimplifiedNodeBase {
    type: 'deviceEventListen';
    deviceModelId: string;
    deviceEvent: string;
    outputParams: SimplifiedParamWithCode[];
}

/** 设备调用节点 */
export interface SimplifiedDeviceCallNode extends SimplifiedNodeBase {
    type: 'device';
    deviceModelId: string;
    deviceId?: string;
    deviceAction: string;
    inputParams: SimplifiedParamWithValue[];
}

/** 选择器节点 */
export interface SimplifiedSelectorNode extends SimplifiedNodeBase {
    type: 'selector';
    branches: SimplifiedBranch[];
}

/** 循环节点 */
export interface SimplifiedLoopNode extends SimplifiedNodeBase {
    type: 'loop';
    iterableExpr: SimplifiedValueExpr;
    iterableVariable: string;
    outputParams?: SimplifiedParamWithCode[];
}

/** 函数调用节点 */
export interface SimplifiedMethodInvokeNode extends SimplifiedNodeBase {
    type: 'methodInvoke';
    typeUrl: string;
    methodCode: string;
    parameters: SimplifiedMethodParam[];
    outputParams: SimplifiedParamWithCode[];
}

/** 简化版节点联合类型 */
export type SimplifiedNode =
    | SimplifiedVariableDefNode
    | SimplifiedBatchAssignValueNode
    | SimplifiedDeviceEventListenNode
    | SimplifiedDeviceCallNode
    | SimplifiedSelectorNode
    | SimplifiedLoopNode
    | SimplifiedMethodInvokeNode;

// #endregion

// #region 流程数据

/** 简化版流程数据 */
export interface SimplifiedFlowData {
    nodes: SimplifiedNode[];
    edges: SimplifiedEdge[];
}

// #endregion
