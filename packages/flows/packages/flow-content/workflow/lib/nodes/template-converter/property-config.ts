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
        this.propertyConfig.categories['template'] = {
            title: "模板",
            properties: {
                template: {
                    type: "string",
                    editor: {
                        type: 'user-prompt-editor',
                        placeholder: '请输入模板内容，可以使用{{}}引用输入变量进行模板转换',
                        title: '模板内容',
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
