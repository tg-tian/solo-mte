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
        this.propertyConfig.categories['exceptionInfo'] = {
            title: '异常信息',
            properties: {
                exceptionInfo: {
                    type: "string",
                    editor: {
                        type: 'textarea',
                        placeholder: '请输入异常信息，支持使用占位符格式 {{参数名}}，示例：{{a}}不能为空。',
                        rows: 6,
                        nodeData
                    },
                }
            }
        };
        this.propertyConfig.categories['level'] = {
            title: "异常级别",
            properties: {
                level: {
                    type: "object",
                    editor: {
                        type: 'exception-level-selector',
                        nodeData
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
