export enum BuiltinNodeType {
    /** 开始节点 */
    Start = 'start',
    /** 结束节点 */
    End = 'end',
    /** 选择器节点 */
    Selector = 'selector',
    /** 循环节点 */
    Loop = 'loop',
    /** 变量定义节点 */
    VariableDef = 'variableDef',
    /** 变量赋值节点 */
    VariableAssign = 'batchAssignValue',
    /** 函数调用节点 */
    MethodInvoke = 'methodInvoke',

    /** 设备调用节点 */
    DeviceCall = 'deviceCall',
    /** 设备事件监听节点 */
    DeviceEventListen = 'deviceEventListen',
}
