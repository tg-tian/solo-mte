import { BaseControlProperty, type NodeData } from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {
    public getPropertyConfig(nodeData: NodeData) {
        this.propertyConfig.categories['basic'] = {
            hideTitle: true,
            title: "基本信息",
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
                        isFixedSchema: true, // 输入参数改为只读，由MCP工具的schema决定
                    }
                }
            }
        };

        this.propertyConfig.categories['mcp'] = {
            title: "MCP工具",
            properties: {
                mcpToolId: {
                    type: "string",
                    editor: {
                        type: 'mcp-selector',
                        nodeData,
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
