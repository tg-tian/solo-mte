import { BaseControlProperty, type NodeData } from '@farris/flow-devkit';
import { updateHttpNodeInputParams } from './node-definition';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        // 更新节点的inputParams，确保参数引用是最新的
        updateHttpNodeInputParams(nodeData);

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
        this.propertyConfig.categories['api'] = {
            title: "API配置",
            properties: {
                'restFulService.apiConfig': {
                    type: "object",
                    editor: {
                        type: 'api-config',
                        nodeData,
                    }
                }
            }
        };
        this.propertyConfig.categories['headers'] = {
            title: "请求头",
            properties: {
                headerList: {
                    type: "array",
                    editor: {
                        type: 'http-params',
                        nodeData,
                        targetField: 'headerList'
                    }
                }
            }
        };
        this.propertyConfig.categories['params'] = {
            title: "请求参数",
            properties: {
                params: {
                    type: "array",
                    editor: {
                        type: 'http-params',
                        nodeData,
                        targetField: 'params'
                    }
                }
            }
        };
        this.propertyConfig.categories['body'] = {
            title: "请求体",
            properties: {
                bodyContent: {
                    type: "object",
                    editor: {
                        type: 'request-body',
                        nodeData,
                    }
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
