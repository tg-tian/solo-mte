import { markRaw } from 'vue';
import type { NodeDefinition, Parameter } from '@farris/flow-devkit';
import { httpIcon } from '@/assets';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { BasicTypeRefer ,useFlowMetadata, NODE_VALIDATION_DETAILS_KEY, ValidateUtils } from '@farris/flow-devkit';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

// dataType转换工具函数
function dataTypeToTypeRefer(dataType: number): BasicTypeRefer {
  switch (dataType) {
    case 1: return BasicTypeRefer.StringType;
    case 2: return BasicTypeRefer.IntegerType;
    case 3: return BasicTypeRefer.BooleanType;
    case 18: return BasicTypeRefer.NumberType;
    default: return BasicTypeRefer.StringType;
  }
}

/**
 * 检查参数值是否为空
 */
function isParameterValueEmpty(valueExpr: any): boolean {
    if (!valueExpr) {
        return true;
    }

    // 对于节点变量引用，检查是否有效
    if (valueExpr.kind === 'nodeVariable') {
        return !valueExpr.nodeCode || !valueExpr.variable;
    }

    // 对于常量值，检查value字段
    if (valueExpr.kind === 'stringConst') {
        return !valueExpr.value || valueExpr.value.trim() === '';
    }

    if (valueExpr.kind === 'numberConst') {
        return valueExpr.value === null || valueExpr.value === undefined;
    }

    if (valueExpr.kind === 'boolConst') {
        return valueExpr.value === null || valueExpr.value === undefined;
    }

    if (valueExpr.kind === 'stringsConst') {
        return !valueExpr.value || !Array.isArray(valueExpr.value) || valueExpr.value.length === 0;
    }

    // 对于其他类型，如果没有value字段认为是空的
    return !valueExpr.value;
}

/**
 * 从HTTP节点配置中提取参数引用，更新inputParams
 */
function extractInputParamsFromHttpConfig(nodeData: any): Parameter[] {
    const inputParams: Parameter[] = [];
    const restFulService = nodeData?.restFulService || {};

    // 提取请求头参数引用
    if (restFulService.headerList && Array.isArray(restFulService.headerList)) {
        restFulService.headerList.forEach((header: any) => {
            const headerValueExpr = JSON.parse(header.valueExpr || '{}');
            const isVariableReference = headerValueExpr && ( headerValueExpr.kind === 'nodeVariable' );

            if (isVariableReference) {
                // 清理valueExpr，去掉fields字段
                const cleanedValueExpr = { ...headerValueExpr };
                delete cleanedValueExpr.fields;

                // 从dataType转换为实际的TypeRefer，优先使用dataType
                let actualType: any;
                if (header.dataType !== undefined && header.dataType !== null) {
                    actualType = dataTypeToTypeRefer(header.dataType);
                } else {
                    actualType = header.type || BasicTypeRefer.StringType;
                }

                inputParams.push({
                    id: `header_${header.id.replace(/-/g, '_')}`,
                    code: `code_${header.id.replace(/-/g, '_')}`,
                    name: header.code,
                    type: actualType,
                    valueExpr: cleanedValueExpr,
                    schema: undefined
                });
            }
        });
    }

    // 提取请求参数引用
    if (restFulService.params && Array.isArray(restFulService.params)) {
        restFulService.params.forEach((param: any) => {
            const paramValueExpr = JSON.parse(param.valueExpr || '{}');
            const isVariableReference = paramValueExpr && ( paramValueExpr.kind === 'nodeVariable' );

            if (isVariableReference) {
                // 清理valueExpr，去掉fields字段
                const cleanedValueExpr = { ...paramValueExpr };
                delete cleanedValueExpr.fields;

                // 从dataType转换为实际的TypeRefer，优先使用dataType
                let actualType: any;
                if (param.dataType !== undefined && param.dataType !== null) {
                    actualType = dataTypeToTypeRefer(param.dataType);
                } else {
                    actualType = param.type || BasicTypeRefer.StringType;
                }

                inputParams.push({
                    id: `param_${param.id.replace(/-/g, '_')}`,
                    code: `code_${param.id.replace(/-/g, '_')}`,
                    name: param.code,
                    type: actualType,
                    valueExpr: cleanedValueExpr,
                    schema: undefined
                });
            }
        });
    }

    // 提取请求体参数引用
    if (restFulService.bodyList && Array.isArray(restFulService.bodyList)) {
        restFulService.bodyList.forEach((bodyParam: any) => {
            const bodyParamValueExpr = JSON.parse(bodyParam.valueExpr || '{}');
            const isVariableReference = bodyParamValueExpr && ( bodyParamValueExpr.kind === 'nodeVariable' );

            if (isVariableReference) {
                // 清理valueExpr，去掉fields字段
                const cleanedValueExpr = { ...bodyParamValueExpr };
                delete cleanedValueExpr.fields;

                // 从dataType转换为实际的TypeRefer，优先使用dataType
                let actualType: any;
                if (bodyParam.dataType !== undefined && bodyParam.dataType !== null) {
                    actualType = dataTypeToTypeRefer(bodyParam.dataType);
                } else {
                    actualType = bodyParam.type || BasicTypeRefer.StringType;
                }

                inputParams.push({
                    id: `body_${bodyParam.id.replace(/-/g, '_')}`,
                    code: `code_${bodyParam.id.replace(/-/g, '_')}`,
                    name: bodyParam.code,
                    type: actualType,
                    valueExpr: cleanedValueExpr,
                    schema: undefined
                });
            }
        });
    }
    return inputParams;
}

/**
 * 提取HTTP节点用于调试的参数（用户友好的名称和描述）
 * 提取所有配置的参数，包括变量引用和固定值，让用户在调试时都能输入
 */
function extractDebugParamsFromHttpConfig(nodeData: any): Parameter[] {
    const debugParams: Parameter[] = [];
    const restFulService = nodeData?.restFulService || {};

    // 提取请求头参数（只提取有参数名的参数）
    if (restFulService.headerList && Array.isArray(restFulService.headerList)) {
        restFulService.headerList.forEach((header: any) => {
            // 只有当参数名不为空时才添加到调试参数
            if (header.code && header.code.trim() !== '') {
                debugParams.push({
                    id: `header_${header.id.replace(/-/g, '_')}`,
                    code: header.code, // 使用实际的header名称
                    name: `请求头: ${header.code}`,
                    type: header.type || BasicTypeRefer.StringType,
                    description: `HTTP请求头参数: ${header.code}`,
                    required: header.required || false,
                    schema: undefined
                });
            }
        });
    }

    // 提取URL参数（只提取有参数名的参数）
    if (restFulService.params && Array.isArray(restFulService.params)) {
        restFulService.params.forEach((param: any) => {
            // 只有当参数名不为空时才添加到调试参数
            if (param.code && param.code.trim() !== '') {
                debugParams.push({
                    id: `param_${param.id.replace(/-/g, '_')}`,
                    code: param.code, // 使用实际的参数名
                    name: `URL参数: ${param.code}`,
                    type: param.type || BasicTypeRefer.StringType,
                    description: `URL查询参数: ${param.code}`,
                    required: param.required || false,
                    schema: undefined
                });
            }
        });
    }

    // 提取请求体参数（只提取有参数名的参数）
    if (restFulService.bodyList && Array.isArray(restFulService.bodyList)) {
        restFulService.bodyList.forEach((bodyParam: any) => {
            // 只有当参数名不为空时才添加到调试参数
            if (bodyParam.code && bodyParam.code.trim() !== '') {
                debugParams.push({
                    id: `body_${bodyParam.id.replace(/-/g, '_')}`,
                    code: bodyParam.code, // 使用实际的参数名
                    name: `请求体: ${bodyParam.code}`,
                    type: bodyParam.type || BasicTypeRefer.StringType,
                    description: `HTTP请求体参数: ${bodyParam.code}`,
                    required: bodyParam.required || false,
                    schema: undefined
                });
            }
        });
    }

    return debugParams;
}

/**
 * 更新HTTP节点的inputParams，从配置中提取参数引用
 * @param nodeData 节点数据
 * @returns 更新后的节点数据
 */
export function updateHttpNodeInputParams(nodeData: any): any {
    // 提取HTTP配置中的参数引用
    const extractedParams = extractInputParamsFromHttpConfig(nodeData);

    // 更新节点的inputParams
    nodeData.inputParams = extractedParams;

    return nodeData;
}

export const HTTP_REQUEST_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.HttpRequest,
        label: 'HTTP请求',
        description: '发送HTTP请求，支持GET、POST、PUT、DELETE方法',
        icon: httpIcon,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            },
            {
                id: 'output',
                position: 'right',
                type: 'source',
            }
        ]
    },
    component: markRaw(NodeComponent),
    initialData: () => {
      const { flowKind } = useFlowMetadata();
        return {
            restFulService: {
                requestType: 1,
                url: '',
                params: [],
                headerList: flowKind === 'chatflow' ? [] : [
                    {
                        id: 'default_content_type',
                        code: 'Content-Type',
                        type: BasicTypeRefer.StringType,
                        name: 'Content-Type',
                        dataType: 1,
                        required: false,
                        defaultValue: 'multipart/form-data',
                        enableValueMapping: false,
                        valueSerializeType: 1,
                        valueExpr: undefined
                    }
                ],
                bodyList: [],
                bodyOnlyValue: false,
                bodyContent: {
                    bodyType: 'none',
                    content: null
                },
            },
            inputParams: [],
            outputParams: [
                {
                    code: 'response',
                    type: BasicTypeRefer.ObjectType,
                    description: 'HTTP响应结果'
                }
            ]
        };
    },
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },

    /**
     * 获取供后续节点引用的参数列表
     * @description 这里将HTTP节点中配置的参数引用提取出来作为可输出的参数
     */
    getOutputParams: (nodeData) => {
        // 首先更新inputParams，确保参数引用是最新的
        const extractedParams = extractInputParamsFromHttpConfig(nodeData);
        nodeData.inputParams = extractedParams;

        // 返回原有的outputParams加上提取的参数引用
        const originalOutputParams = nodeData.outputParams || [];

        const result = [
            ...extractedParams,
            ...originalOutputParams
        ];
        return result;
    },

    /**
     * 获取调试时需要的参数
     * @description 提取HTTP配置中需要用户输入的可引用参数
     */
    getDebugParams: (nodeData) => {
        return extractDebugParamsFromHttpConfig(nodeData);
    },

    /**
     * 校验节点数据，同时更新inputParams
     */
    validator: (nodeData) => {
        // 在校验时也更新inputParams
        updateHttpNodeInputParams(nodeData);

        const messages: string[] = [];
        const restFulService = nodeData?.restFulService || {};

        // 检查请求头参数
        if (restFulService.headerList && Array.isArray(restFulService.headerList)) {
            restFulService.headerList.forEach((header: any, index: number) => {
                if (header.required !== false && header.defaultValue === '') {
                    if (isParameterValueEmpty(JSON.parse(header.valueExpr || '{}'))) {
                        messages.push(`请求头参数 "${header.code || `参数${index + 1}`}" 不能为空`);
                    }
                }
            });
        }

        // 检查URL参数
        if (restFulService.params && Array.isArray(restFulService.params)) {
            restFulService.params.forEach((param: any, index: number) => {
                if (param.required !== false && param.defaultValue === '') {
                    if (isParameterValueEmpty(JSON.parse(param.valueExpr || '{}'))) {
                        messages.push(`URL参数 "${param.code || `参数${index + 1}`}" 不能为空`);
                    }
                }
            });
        }

        // 检查请求体参数
        if (restFulService.bodyList && Array.isArray(restFulService.bodyList)) {
            restFulService.bodyList.forEach((bodyParam: any, index: number) => {
                if (bodyParam.required !== false) {
                    if (isParameterValueEmpty(JSON.parse(bodyParam.valueExpr || '{}'))) {
                        messages.push(`请求体参数 "${bodyParam.code || `参数${index + 1}`}" 不能为空`);
                    }
                }
            });
        }

        // 使用标准格式创建校验结果
        const validationResult = {
            isValid: messages.length === 0,
            errors: messages.map(message => ({ message }))
        };

        // 安全地将校验结果存储到节点数据中，供UI显示使用
        // 使用 Object.assign 避免直接设置响应式代理属性的问题
        const validationDetails = {
            valid: validationResult.isValid,
            errors: validationResult.errors,
            warnings: []
        };

        try {
            // 尝试使用 Object.assign 设置属性
            Object.assign(nodeData, { [NODE_VALIDATION_DETAILS_KEY]: validationDetails });
        } catch (error) {
            console.warn('Failed to set validation details on nodeData, using fallback method:', error);
            // 如果 Object.assign 失败，尝试使用 Reflect.set
            try {
                Reflect.set(nodeData, NODE_VALIDATION_DETAILS_KEY, validationDetails);
            } catch (reflectError) {
                console.error('Failed to set validation details using Reflect.set:', reflectError);
                // 最后的备选方案：创建一个新对象
                const newNodeData = { ...nodeData };
                newNodeData[NODE_VALIDATION_DETAILS_KEY] = validationDetails;
                // 注意：这里我们只能记录错误，因为无法修改原始的代理对象
                console.warn('Validation details could not be stored on nodeData');
            }
        }

        return validationResult;
    },
    afterEdgeAddOrRemove: createStreamingOutputChecker(),
};
