import { BaseControlProperty, type NodeData, type Parameter } from '@farris/flow-devkit';

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
                        validateOptions: {
                            allowValueEmpty: false,
                        },
                    }
                }
            },
            setPropertyRelates(changeObject: any, propertyData: NodeData, _paramters: any) {
                switch (changeObject?.propertyID) {
                    case 'inputParams': {
                        const newParams = changeObject.propertyValue as Parameter[];
                        propertyData.promptVariables = JSON.stringify(newParams.map(param => ({
                            id: param.id,
                            name: param.code,
                            code: param.code,
                        })));
                        break;
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
        this.propertyConfig.categories['prompt'] = {
            title: "提示词",
            properties: {
                systemPrompt: {
                    type: "string",
                    editor: {
                        type: 'system-prompt-editor',
                    },
                },
                userPrompt: {
                    type: "string",
                    editor: {
                        type: 'user-prompt-editor',
                        placeholder: '请输入用户提示词，可以使用{{}}引用输入变量',
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
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
