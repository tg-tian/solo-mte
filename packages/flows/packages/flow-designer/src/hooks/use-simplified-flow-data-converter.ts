import type {
    FlowMetadata,
    FlowNode,
    FlowEdge,
    Parameter,
    ValueExpress,
    NodeVariableExpr,
    AssignValueExpr,
    MethodInvokeExpr,
    MethodParameter,
    TypeRefer,
    SelectorBranch,
    LogicExpr,
    CompareExpr,
    CompareOperatorType,
} from '@farris/flow-devkit';
import {
    uuid,
    BasicTypeRefer,
    ValueExpressKind,
    LogicOperator,
    DEFAULT_SUB_FLOW_CANVAS_SIZE,
    useDeviceInfo,
    DeviceUtils,
} from '@farris/flow-devkit';
import type { DeviceModel, DeviceParameter } from '@farris/flow-devkit';
import type {
    SimplifiedFlowData,
    SimplifiedNode,
    SimplifiedNodeBase,
    SimplifiedLoopNode,
    SimplifiedEdge,
    SimplifiedValueExpr,
    SimplifiedVariableRef,
    SimplifiedLiteral,
    SimplifiedMethodInvokeValue,
    SimplifiedParamWithCode,
    SimplifiedParamWithValue,
    SimplifiedParamWithValueAndType,
    SimplifiedBranch,
    SimplifiedCondition,
} from './simplified-flow-data-types';

export function useSimplifiedFlowDataConverter() {

    // #region 辅助函数：类型映射

    /** 简单类型字符串 → TypeRefer */
    function mapSimpleTypeToTypeRefer(typeStr?: string): TypeRefer {
        switch (typeStr) {
            case 'string': return BasicTypeRefer.StringType;
            case 'number': return BasicTypeRefer.NumberType;
            case 'boolean': return BasicTypeRefer.BooleanType;
            case 'object': return BasicTypeRefer.ObjectType;
            case 'array': return BasicTypeRefer.ArrayType;
            default: return BasicTypeRefer.ObjectType;
        }
    }

    /** TypeRefer → 简单类型字符串 */
    function typeReferToString(typeRef?: TypeRefer): string | undefined {
        if (!typeRef) return undefined;
        if (typeRef.source !== 'default') return typeRef.typeId;
        switch (typeRef.typeId) {
            case 'string': return 'string';
            case 'number': return 'number';
            case 'int': return 'number';
            case 'boolean': return 'boolean';
            case 'any': return 'object';
            case 'fileID': return 'string';
            case 'list': return 'array';
            default: return 'object';
        }
    }

    // #endregion

    // #region 辅助函数：值表达式转换

    /** 简化版值表达式 → 原始 ValueExpress */
    function convertSimplifiedValueExpr(
        expr: SimplifiedValueExpr | undefined,
        nodeIdToCodeMap: Map<string, string>,
    ): ValueExpress | undefined {
        if (!expr) return undefined;

        // 变量引用: { nodeId, variablePath }
        if ('nodeId' in expr && 'variablePath' in expr) {
            const ref = expr as SimplifiedVariableRef;
            const nodeCode = nodeIdToCodeMap.get(ref.nodeId) || ref.nodeId;
            const pathSegments = ref.variablePath.split('.');
            const variable = pathSegments[0];
            const fields = pathSegments.length > 1 ? pathSegments.slice(1) : undefined;
            return {
                kind: ValueExpressKind.nodeVariable,
                nodeCode,
                variable,
                fields,
            } as NodeVariableExpr;
        }

        // 常量: { literal: value }
        if ('literal' in expr) {
            const lit = expr as SimplifiedLiteral;
            const value = lit.literal;
            if (typeof value === 'string') {
                return { kind: ValueExpressKind.stringConst, value };
            }
            if (typeof value === 'number') {
                return { kind: ValueExpressKind.numberConst, value };
            }
            if (typeof value === 'boolean') {
                return { kind: ValueExpressKind.boolConst, value };
            }
            if (Array.isArray(value)) {
                return { kind: ValueExpressKind.stringsConst, value: value.map(String) };
            }
            return { kind: ValueExpressKind.stringConst, value: String(value) };
        }

        // 嵌套函数调用: { methodInvoke: { typeUrl, methodCode, parameters } }
        if ('methodInvoke' in expr) {
            const mi = (expr as SimplifiedMethodInvokeValue).methodInvoke;
            return {
                kind: ValueExpressKind.methodInvoke,
                isStatic: true,
                typeUrl: mi.typeUrl,
                methodCode: mi.methodCode,
                parameters: mi.parameters.map(p => ({
                    code: p.code,
                    value: convertSimplifiedValueExpr(p.value, nodeIdToCodeMap)!,
                })),
            } as MethodInvokeExpr;
        }

        return undefined;
    }

    /** 原始 ValueExpress → 简化版值表达式 */
    function convertValueExprToSimplified(
        expr: ValueExpress | undefined,
        codeToNodeIdMap: Map<string, string>,
    ): SimplifiedValueExpr | undefined {
        if (!expr || !expr.kind) return undefined;

        switch (expr.kind) {
            case ValueExpressKind.nodeVariable: {
                const ne = expr as NodeVariableExpr;
                const nodeId = codeToNodeIdMap.get(ne.nodeCode) || ne.nodeCode;
                const variablePath = [ne.variable, ...(ne.fields || [])].join('.');
                return { nodeId, variablePath };
            }
            case ValueExpressKind.stringConst:
                return { literal: (expr as { kind: string; value: string }).value };
            case ValueExpressKind.numberConst:
                return { literal: (expr as { kind: string; value: number }).value };
            case ValueExpressKind.boolConst:
                return { literal: (expr as { kind: string; value: boolean }).value };
            case ValueExpressKind.stringsConst:
                return { literal: (expr as { kind: string; value: string[] }).value };
            case ValueExpressKind.methodInvoke: {
                const mi = expr as MethodInvokeExpr;
                return {
                    methodInvoke: {
                        typeUrl: mi.typeUrl || '',
                        methodCode: mi.methodCode,
                        parameters: (mi.parameters || []).map(p => ({
                            code: p.code,
                            value: convertValueExprToSimplified(p.value, codeToNodeIdMap)!,
                        })),
                    },
                };
            }
            default:
                return undefined;
        }
    }

    // #endregion

    // #region 辅助函数：参数转换

    /** 简化版参数（带code+type） → 原始 Parameter */
    function convertSimpleParamToParameter(param: SimplifiedParamWithCode): Parameter {
        return {
            id: uuid(),
            code: param.code,
            type: mapSimpleTypeToTypeRefer(param.type),
        };
    }

    /** 简化版参数（带code+type+value） → 原始 Parameter */
    function convertSimpleParamWithValueToParameter(
        param: SimplifiedParamWithValueAndType,
        nodeIdToCodeMap: Map<string, string>,
    ): Parameter {
        return {
            id: uuid(),
            code: param.code,
            type: mapSimpleTypeToTypeRefer(param.type),
            valueExpr: convertSimplifiedValueExpr(param.value, nodeIdToCodeMap),
        };
    }

    /** 原始 Parameter → 简化版参数（带code+type） */
    function convertParameterToSimpleParam(param: Parameter): SimplifiedParamWithCode {
        return {
            code: param.code,
            type: typeReferToString(param.type),
        };
    }

    /** 原始 Parameter → 简化版参数（带code+type+value） */
    function convertParameterToSimpleParamWithValue(
        param: Parameter,
        codeToNodeIdMap: Map<string, string>,
    ): SimplifiedParamWithValueAndType {
        return {
            code: param.code,
            type: typeReferToString(param.type) || 'object',
            value: convertValueExprToSimplified(param.valueExpr, codeToNodeIdMap)!,
        };
    }

    /** 原始 Parameter → 简化版参数（带code+value） */
    function convertParameterToSimpleInputParam(
        param: Parameter,
        codeToNodeIdMap: Map<string, string>,
    ): SimplifiedParamWithValue {
        return {
            code: param.code,
            value: convertValueExprToSimplified(param.valueExpr, codeToNodeIdMap)!,
        };
    }

    // #endregion

    // #region 辅助函数：设备参数转换

    /** 以设备元数据参数定义为基础，填入简化版参数值 */
    function convertDeviceInputParams(
        simplifiedParams: SimplifiedParamWithValue[],
        actionArgs: Record<string, DeviceParameter> | undefined,
        nodeIdToCodeMap: Map<string, string>,
    ): Parameter[] {
        if (!actionArgs) return [];
        const result: Parameter[] = [];
        for (const [argCode, deviceParam] of Object.entries(actionArgs)) {
            const simplifiedParam = simplifiedParams.find(p => p.code === argCode);
            const param = DeviceUtils.convertDeviceParameter2Parameter(argCode, deviceParam);
            if (simplifiedParam) {
                param.valueExpr = convertSimplifiedValueExpr(simplifiedParam.value, nodeIdToCodeMap);
            }
            result.push(param);
        }
        return result;
    }

    /** 以设备事件元数据的字段定义生成 outputParams */
    function convertDeviceEventOutputParams(
        eventFields: Record<string, DeviceParameter> | undefined,
    ): Parameter[] {
        if (!eventFields) return [];
        return Object.entries(eventFields).map(([fieldCode, deviceParam]) =>
            DeviceUtils.convertDeviceParameter2Parameter(fieldCode, deviceParam),
        );
    }

    // #endregion

    // #region 辅助函数：选择器转换

    /** 简化版选择器条件 → CompareExpr */
    function convertSimplifiedCondition(
        condition: SimplifiedCondition,
        nodeIdToCodeMap: Map<string, string>,
    ): CompareExpr {
        return {
            kind: ValueExpressKind.compare,
            leftExpress: convertSimplifiedValueExpr(condition.left, nodeIdToCodeMap),
            operator: condition.operator,
            rightExpress: convertSimplifiedValueExpr(condition.right, nodeIdToCodeMap),
        };
    }

    /** 简化版分支 → SelectorBranch */
    function convertSimplifiedBranch(
        branch: SimplifiedBranch,
        nodeIdToCodeMap: Map<string, string>,
    ): SelectorBranch {
        // ELSE 分支：logicOperator 为 null 或 conditions 为空
        if (!branch.logicOperator || !branch.conditions.length) {
            return { port: branch.port };
        }
        const logicExpr: LogicExpr = {
            kind: ValueExpressKind.logic,
            operator: branch.logicOperator as typeof LogicOperator.and | typeof LogicOperator.or,
            expresses: branch.conditions.map(c => convertSimplifiedCondition(c, nodeIdToCodeMap)),
        };
        return {
            conditionExpr: logicExpr,
            port: branch.port,
        };
    }

    /** SelectorBranch → 简化版分支 */
    function convertSelectorBranchToSimplified(
        branch: SelectorBranch,
        codeToNodeIdMap: Map<string, string>,
    ): SimplifiedBranch {
        if (!branch.conditionExpr) {
            return { logicOperator: null, conditions: [], port: branch.port };
        }
        const logicExpr = branch.conditionExpr;
        const conditions: SimplifiedCondition[] = (logicExpr.expresses || [])
            .filter((e): e is CompareExpr => e.kind === ValueExpressKind.compare)
            .map(e => ({
                left: convertValueExprToSimplified(e.leftExpress, codeToNodeIdMap)!,
                operator: e.operator!,
                right: convertValueExprToSimplified(e.rightExpress, codeToNodeIdMap)!,
            }));
        return {
            logicOperator: logicExpr.operator as 'and' | 'or' | null,
            conditions,
            port: branch.port,
        };
    }

    // #endregion

    // #region 简化 → 原始

    /**
     * 将简化版流程数据转换为原始 FlowNode[] + FlowEdge[]
     */
    function convertSimplifiedToOriginal(data: SimplifiedFlowData): { nodes: FlowNode[]; edges: FlowEdge[] } {
        // Step 1: 构建 nodeId → nodeCode 映射
        const nodeIdToCodeMap = new Map<string, string>();
        data.nodes.forEach(node => {
            nodeIdToCodeMap.set(node.id, `${node.type}_${node.id}`);
        });

        // Step 1.5: 构建设备模型查找表
        const { deviceCategories } = useDeviceInfo();
        const deviceModelMap = new Map<string, DeviceModel>();
        deviceCategories.value.forEach((dm: any) => deviceModelMap.set(dm.modelId, dm));

        // Step 2: 转换所有节点
        const allFlowNodes = new Map<string, FlowNode>();
        const parentNodeIds = new Set<string>();

        data.nodes.forEach(simplifiedNode => {
            const flowNode = convertSimplifiedNode(simplifiedNode, nodeIdToCodeMap, deviceModelMap);
            allFlowNodes.set(flowNode.id, flowNode);
            if (simplifiedNode.parentNodeId) {
                parentNodeIds.add(simplifiedNode.parentNodeId);
            }
        });

        // Step 3: 转换所有边
        const allFlowEdges: FlowEdge[] = data.edges.map(edge => convertSimplifiedEdge(edge));

        // Step 4: 处理循环节点嵌套——将有 parentNodeId 的子节点移入父节点的 nodes[]
        const rootNodes: FlowNode[] = [];
        const childNodesByParent = new Map<string, FlowNode[]>();

        allFlowNodes.forEach(flowNode => {
            const simplifiedNode = data.nodes.find(n => n.id === flowNode.id);
            const parentNodeId = simplifiedNode?.parentNodeId;
            if (parentNodeId) {
                if (!childNodesByParent.has(parentNodeId)) {
                    childNodesByParent.set(parentNodeId, []);
                }
                childNodesByParent.get(parentNodeId)!.push(flowNode);
            } else {
                rootNodes.push(flowNode);
            }
        });

        // 将子节点设置到父节点中
        childNodesByParent.forEach((children, parentId) => {
            const parentNode = allFlowNodes.get(parentId);
            if (parentNode) {
                parentNode.nodes = children;
                parentNode.edges = [];
            }
        });

        // 将子画布内的边设置到对应的父节点
        // 需要找出哪些节点属于哪个父节点
        const nodeIdToParentId = new Map<string, string>();
        data.nodes.forEach(n => {
            if (n.parentNodeId) {
                nodeIdToParentId.set(n.id, n.parentNodeId);
            }
        });

        const rootEdges: FlowEdge[] = [];
        allFlowEdges.forEach(edge => {
            const sourceParent = nodeIdToParentId.get(edge.sourceNodeId);
            const targetParent = nodeIdToParentId.get(edge.targetNodeId);
            // 如果 source 和 target 属于同一个父节点，边放入父节点的 edges
            if (sourceParent && targetParent && sourceParent === targetParent) {
                const parentNode = allFlowNodes.get(sourceParent);
                if (parentNode) {
                    parentNode.edges = parentNode.edges || [];
                    parentNode.edges.push(edge);
                }
            } else {
                rootEdges.push(edge);
            }
        });

        return { nodes: rootNodes, edges: rootEdges };
    }

    /** 转换单个简化节点为 FlowNode */
    function convertSimplifiedNode(
        node: SimplifiedNode,
        nodeIdToCodeMap: Map<string, string>,
        deviceModelMap: Map<string, DeviceModel>,
    ): FlowNode {
        const code = `${node.type}_${node.id}`;
        const baseNode: FlowNode = {
            id: node.id,
            kind: node.type,
            code,
            name: node.name,
            description: '',
            inputParams: [],
            outputParams: [],
            inputPorts: [],
            outputPorts: [],
            graphMeta: {
                position: node.position || { x: 0, y: 0 },
            },
        };

        switch (node.type) {
            case 'variableDef':
                baseNode.outputParams = node.outputParams.map(
                    p => convertSimpleParamWithValueToParameter(p, nodeIdToCodeMap),
                );
                baseNode.inputPorts = ['input'];
                baseNode.outputPorts = ['output'];
                break;

            case 'batchAssignValue':
                baseNode.expresses = node.assignmentExpressions.map(expr => {
                    const nodeCode = nodeIdToCodeMap.get(expr.nodeId) || expr.nodeId;
                    const pathSegments = expr.variablePath.split('.');
                    const variable = pathSegments[0];
                    const fields = pathSegments.length > 1 ? pathSegments.slice(1) : undefined;
                    const leftExpress: NodeVariableExpr = {
                        kind: ValueExpressKind.nodeVariable,
                        nodeCode,
                        variable,
                        fields,
                    };
                    const rightExpress = convertSimplifiedValueExpr(expr.newValue, nodeIdToCodeMap);
                    return {
                        kind: ValueExpressKind.assignValue,
                        leftExpress,
                        rightExpress,
                    } as AssignValueExpr;
                });
                baseNode.inputPorts = ['input'];
                baseNode.outputPorts = ['output'];
                break;

            case 'deviceEventListen': {
                baseNode.deviceModelId = node.deviceModelId;
                baseNode.deviceEvent = node.deviceEvent;
                const eventModel = deviceModelMap.get(node.deviceModelId);
                const eventDef = eventModel?.events?.[node.deviceEvent];
                baseNode.outputParams = convertDeviceEventOutputParams(eventDef?.fields);
                baseNode.inputPorts = [];
                baseNode.outputPorts = ['output'];
                break;
            }

            case 'device': {
                baseNode.deviceModelId = node.deviceModelId;
                baseNode.deviceId = node.deviceId || '';
                baseNode.deviceAction = node.deviceAction;
                const deviceModel = deviceModelMap.get(node.deviceModelId);
                const action = deviceModel?.actions?.[node.deviceAction];
                baseNode.inputParams = convertDeviceInputParams(
                    node.inputParams, action?.arguments, nodeIdToCodeMap,
                );
                baseNode.inputPorts = ['input'];
                baseNode.outputPorts = ['output'];
                break;
            }

            case 'selector':
                baseNode.branches = node.branches.map(
                    b => convertSimplifiedBranch(b, nodeIdToCodeMap),
                );
                baseNode.inputPorts = ['input'];
                baseNode.outputPorts = node.branches.map(b => b.port);
                break;

            case 'loop':
                baseNode.iterableExpr = convertSimplifiedValueExpr(node.iterableExpr, nodeIdToCodeMap);
                baseNode.iterableVariable = node.iterableVariable;
                baseNode.outputParams = (node.outputParams || []).map(p => convertSimpleParamToParameter(p));
                baseNode.inputPorts = ['input'];
                baseNode.outputPorts = ['output'];
                baseNode.nodes = [];
                baseNode.edges = [];
                baseNode.graphMeta.subFlowCanvasSize = { ...DEFAULT_SUB_FLOW_CANVAS_SIZE };
                break;

            case 'methodInvoke': {
                const methodExpr: MethodInvokeExpr = {
                    kind: ValueExpressKind.methodInvoke,
                    isStatic: true,
                    typeUrl: node.typeUrl,
                    methodCode: node.methodCode,
                    parameters: node.parameters.map(p => ({
                        code: p.code,
                        value: convertSimplifiedValueExpr(p.value, nodeIdToCodeMap)!,
                    })),
                };
                baseNode.express = methodExpr;
                baseNode.outputParams = node.outputParams.map(p => convertSimpleParamToParameter(p));
                baseNode.inputPorts = ['input'];
                baseNode.outputPorts = ['output'];
                break;
            }
        }

        return baseNode;
    }

    /** 转换简化版边为原始 FlowEdge */
    function convertSimplifiedEdge(edge: SimplifiedEdge): FlowEdge {
        return {
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
            sourcePort: edge.sourcePort || 'output',
            targetPort: edge.targetPort || 'input',
        };
    }

    // #endregion

    // #region 原始 → 简化

    /**
     * 将原始 FlowMetadata 转换为简化版流程数据
     */
    function convertOriginalToSimplified(metadata: FlowMetadata): SimplifiedFlowData {
        // Step 1: 构建 nodeCode → nodeId 反向映射（递归收集所有节点）
        const codeToNodeIdMap = new Map<string, string>();
        function collectCodeMappings(nodes: FlowNode[]) {
            nodes.forEach(node => {
                codeToNodeIdMap.set(node.code, node.id);
                if (node.nodes?.length) {
                    collectCodeMappings(node.nodes);
                }
            });
        }
        collectCodeMappings(metadata.nodes || []);

        // Step 2: 展平嵌套节点
        const flatNodes: SimplifiedNode[] = [];
        const parentMap = new Map<string, string>(); // nodeId → parentNodeId

        function flattenNodes(nodes: FlowNode[], parentNodeId?: string) {
            nodes.forEach(node => {
                if (parentNodeId) {
                    parentMap.set(node.id, parentNodeId);
                }
                const simplified = convertFlowNodeToSimplified(node, codeToNodeIdMap);
                if (parentNodeId) {
                    (simplified as SimplifiedNodeBase).parentNodeId = parentNodeId;
                }
                flatNodes.push(simplified);
                if (node.nodes?.length) {
                    flattenNodes(node.nodes, node.id);
                }
            });
        }
        flattenNodes(metadata.nodes || []);

        // Step 3: 展平边（递归收集所有层级的边）
        const flatEdges: SimplifiedEdge[] = [];
        function flattenEdges(edges: FlowEdge[]) {
            edges.forEach(edge => {
                flatEdges.push(convertFlowEdgeToSimplified(edge));
            });
        }
        flattenEdges(metadata.edges || []);
        function collectEdgesFromNodes(nodes: FlowNode[]) {
            nodes.forEach(node => {
                if (node.edges?.length) {
                    flattenEdges(node.edges);
                }
                if (node.nodes?.length) {
                    collectEdgesFromNodes(node.nodes);
                }
            });
        }
        collectEdgesFromNodes(metadata.nodes || []);

        return { nodes: flatNodes, edges: flatEdges };
    }

    /** 转换单个 FlowNode 为简化节点 */
    function convertFlowNodeToSimplified(
        node: FlowNode,
        codeToNodeIdMap: Map<string, string>,
    ): SimplifiedNode {
        const base: SimplifiedNodeBase = {
            id: node.id,
            type: node.kind,
            name: node.name,
            position: node.graphMeta?.position,
        };

        switch (node.kind) {
            case 'variableDef':
                return {
                    ...base,
                    type: 'variableDef',
                    outputParams: (node.outputParams || []).map(
                        p => convertParameterToSimpleParamWithValue(p, codeToNodeIdMap),
                    ),
                };

            case 'batchAssignValue':
                return {
                    ...base,
                    type: 'batchAssignValue',
                    assignmentExpressions: (node.expresses as AssignValueExpr[] || []).map(expr => {
                        const left = expr.leftExpress as NodeVariableExpr | undefined;
                        const nodeId = left ? (codeToNodeIdMap.get(left.nodeCode) || left.nodeCode) : '';
                        const variablePath = left
                            ? [left.variable, ...(left.fields || [])].join('.')
                            : '';
                        return {
                            nodeId,
                            variablePath,
                            newValue: convertValueExprToSimplified(expr.rightExpress, codeToNodeIdMap)!,
                        };
                    }),
                };

            case 'deviceEventListen':
                return {
                    ...base,
                    type: 'deviceEventListen',
                    deviceModelId: node.deviceModelId || '',
                    deviceEvent: node.deviceEvent || '',
                    outputParams: (node.outputParams || []).map(p => convertParameterToSimpleParam(p)),
                };

            case 'device':
                return {
                    ...base,
                    type: 'device',
                    deviceModelId: node.deviceModelId || '',
                    deviceId: node.deviceId || '',
                    deviceAction: node.deviceAction || '',
                    inputParams: (node.inputParams || []).map(
                        p => convertParameterToSimpleInputParam(p, codeToNodeIdMap),
                    ),
                };

            case 'selector':
                return {
                    ...base,
                    type: 'selector',
                    branches: (node.branches || []).map(
                        (b: any) => convertSelectorBranchToSimplified(b, codeToNodeIdMap),
                    ),
                };

            case 'loop': {
                const loopNode: SimplifiedLoopNode = {
                    ...base,
                    type: 'loop',
                    iterableExpr: convertValueExprToSimplified(node.iterableExpr, codeToNodeIdMap)!,
                    iterableVariable: node.iterableVariable || 'item',
                    outputParams: (node.outputParams || []).map(p => convertParameterToSimpleParam(p)),
                };
                return loopNode;
            }

            case 'methodInvoke': {
                const express = node.express as MethodInvokeExpr | undefined;
                return {
                    ...base,
                    type: 'methodInvoke',
                    typeUrl: express?.typeUrl || '',
                    methodCode: express?.methodCode || '',
                    parameters: (express?.parameters || []).map(p => ({
                        code: p.code,
                        value: convertValueExprToSimplified(p.value, codeToNodeIdMap)!,
                    })),
                    outputParams: (node.outputParams || []).map(p => convertParameterToSimpleParam(p)),
                };
            }

            default:
                // 未识别的节点类型，作为基础节点返回
                return {
                    ...base,
                    type: node.kind,
                } as SimplifiedNode;
        }
    }

    /** 转换原始 FlowEdge 为简化版边 */
    function convertFlowEdgeToSimplified(edge: FlowEdge): SimplifiedEdge {
        const simplified: SimplifiedEdge = {
            sourceNodeId: edge.sourceNodeId,
            targetNodeId: edge.targetNodeId,
        };
        // 只在非默认端口时包含端口信息
        if (edge.sourcePort && edge.sourcePort !== 'output') {
            simplified.sourcePort = edge.sourcePort;
        }
        if (edge.targetPort && edge.targetPort !== 'input') {
            simplified.targetPort = edge.targetPort;
        }
        return simplified;
    }

    // #endregion

    return {
        convertSimplifiedToOriginal,
        convertOriginalToSimplified,
    };
}
