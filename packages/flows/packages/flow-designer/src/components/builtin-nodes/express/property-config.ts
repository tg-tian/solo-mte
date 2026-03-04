import { BaseControlProperty, BasicTypeRefer, type NodeData, type TypeRefer } from '@farris/flow-devkit'
import type { PropType } from 'vue'

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
                      nodeData
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
                      /*type: 'express-input-params',*/
                      type: 'express-input-params',
                      nodeData
                    },
                }
            }
        };
        this.propertyConfig.categories['express'] = {
            title: "数学表达式",
            properties: {
                express: {
                    type: "string",
                    editor: {
                      type: 'textarea',
                      placeholder: '请输入',
                      rows: 5,
                      nodeData
                    }
                }
            }
        };
        this.propertyConfig.categories['outputs'] = {
            title: "输出",
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                      type: 'fvf-json-schema-editor',
                      readonly: true,
                      nodeData
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
