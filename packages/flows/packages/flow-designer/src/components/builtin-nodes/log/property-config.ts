import { BaseControlProperty, type NodeData } from '@farris/flow-devkit';

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
            title: '参数',
            properties: {
                inputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-input-params',
                        nodeData
                    },
                }
            }
        };
        this.propertyConfig.categories['logInfo'] = {
            title: '日志信息',
            properties: {
                logInfo: {
                    type: "string",
                    editor: {
                        type: 'textarea',
                        placeholder: '请输入日志信息，支持使用占位符格式 {{参数名}}，示例：{{a}}的值为{{b}}。',
                        rows: 6,
                        nodeData
                    },
                }
            }
        };
        this.propertyConfig.categories['level'] = {
            title: "日志级别",
            properties: {
                level: {
                    type: "string",
                    editor: {
                        type: 'log-level-selector',
                        nodeData
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
