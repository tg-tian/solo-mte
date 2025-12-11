import { BaseControlProperty, type NodeData, BasicTypeRefer } from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        this.propertyConfig.categories['basic'] = {
            hideTitle: true,
            title: "基本信息",
            description: "Basic Information",
            properties: {
                name: {
                    type: "object",
                    editor: {
                        type: 'fvf-node-header',
                        nodeData,
                    },
                }
            }
        };
        this.propertyConfig.categories['inputs'] = {
            title: '输入',
            properties: {
                inputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-input-params',
                        isFixedSchema: true, // 输入参数只读，由RPC服务定义决定
                    }
                }
            }
        };
        // 调试nodeData

        this.propertyConfig.categories['rpc-config'] = {
            title: 'RPC配置',
            properties: {
                rpcServiceList: {
                    type: "object",
                    editor: {
                        type: 'rpc-selector',
                        nodeData,
                        onChange: (value: any) => {
                            console.log('RPC selector onChange:', value);
                            if (value) {
                                // 更新nodeData
                                nodeData.serviceUnit = value.su;
                                nodeData.serviceId = value.serviceId;
                                nodeData.rpcServiceList = [value];

                                // 更新输入参数 - 转换为输入参数编辑器期望的格式
                                if (value.inputParams) {
                                    const convertedParams = value.inputParams.map((param: any, index: number) => {
                                        // 根据RPC参数类型映射到标准类型
                                        let typeRefer = BasicTypeRefer.StringType; // 默认字符串类型

                                        if (param.type && typeof param.type === 'object') {
                                            // 处理复杂类型对象
                                            if (param.type.typeEnum) {
                                                const typeEnum = param.type.typeEnum.toLowerCase();
                                                switch (typeEnum) {
                                                    case 'string':
                                                        typeRefer = BasicTypeRefer.StringType;
                                                        break;
                                                    case 'number':
                                                    case 'int':
                                                    case 'integer':
                                                        typeRefer = BasicTypeRefer.NumberType;
                                                        break;
                                                    case 'boolean':
                                                        typeRefer = BasicTypeRefer.BooleanType;
                                                        break;
                                                    case 'array':
                                                    case 'list':
                                                        typeRefer = BasicTypeRefer.StringArrayType; // 默认字符串数组
                                                        break;
                                                    case 'map':
                                                    case 'object':
                                                        typeRefer = BasicTypeRefer.ObjectType;
                                                        break;
                                                    default:
                                                        // 无法匹配标准类型时，使用原始类型信息
                                                        typeRefer = {
                                                            source: param.type.source || 'default',
                                                            typeId: param.type.typeId || param.type.typeEnum?.toLowerCase() || 'any',
                                                            typeCode: param.type.typeCode || param.type.typeEnum,
                                                            typeName: param.type.typeName || param.type.typeEnum,
                                                            kind: param.type.kind
                                                        };
                                                }
                                            } else {
                                                // 如果没有typeEnum，使用原始类型信息
                                                typeRefer = {
                                                    source: param.type.source || 'default',
                                                    typeId: param.type.typeId || 'any',
                                                    typeCode: param.type.typeCode || 'Unknown',
                                                    typeName: param.type.typeName || 'Unknown',
                                                    kind: param.type.kind
                                                };
                                            }
                                        } else {
                                            // 处理简单字符串类型或空类型
                                            const paramType = param.type ? String(param.type).toLowerCase() : 'string';
                                            switch (paramType) {
                                                case 'string':
                                                    typeRefer = BasicTypeRefer.StringType;
                                                    break;
                                                case 'number':
                                                case 'int':
                                                case 'integer':
                                                    typeRefer = BasicTypeRefer.NumberType;
                                                    break;
                                                case 'boolean':
                                                    typeRefer = BasicTypeRefer.BooleanType;
                                                    break;
                                                case 'array':
                                                case 'list':
                                                    typeRefer = BasicTypeRefer.StringArrayType;
                                                    break;
                                                case 'map':
                                                case 'object':
                                                    typeRefer = BasicTypeRefer.ObjectType;
                                                    break;
                                                default:
                                                    typeRefer = BasicTypeRefer.StringType;
                                            }
                                        }

                                        return {
                                            id: `rpc_param_${index}`,
                                            code: param.name,
                                            description: '',
                                            type: typeRefer,
                                            required: false
                                        };
                                    });
                                    nodeData.inputParams = convertedParams;
                                }

                                // 更新输出参数
                                if (value.outputParam) {
                                    nodeData.outputParams = [value.outputParam];
                                }
                            } else {
                                // 删除时清理
                                delete nodeData.serviceUnit;
                                delete nodeData.serviceId;
                                delete nodeData.rpcServiceList;
                            }
                        }
                    },
                }
            }
        };
        this.propertyConfig.categories['outputs'] = {
            title: '输出变量',
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-json-schema-editor',
                        readonly: true, // 输出参数只读
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
