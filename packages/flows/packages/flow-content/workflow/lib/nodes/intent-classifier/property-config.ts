import { BaseControlProperty, type NodeData } from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        // 初始化默认值
        if (!nodeData.intentions) {
            nodeData.intentions = [];
        }

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
                    }
                }
            }
        };
        this.propertyConfig.categories['model'] = {
            title: "模型",
            properties: {
                modelInfo: {
                    type: "object",
                    editor: {
                        type: 'model-selector',
                        nodeData
                    },
                }
            }
        };
        this.propertyConfig.categories['classifier'] = {
            title: "意图分类",
            properties: {
                intentions: {
                    type: "array",
                    editor: {
                        type: 'intent-classifier-editor',
                        nodeData
                    },
                }
            }
        };
        this.propertyConfig.categories['outputs'] = {
            title: "输出变量",
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-json-schema-editor',
                        readonly: true,
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
