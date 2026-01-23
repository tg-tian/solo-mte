import { BaseControlProperty, useFlowMetadata, type NodeData } from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        const { flowKind } = useFlowMetadata();

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
        this.propertyConfig.categories['outputs'] = {
            title: flowKind === 'chatflow' ? "输出变量（运行时只能有一个输出）" : "输出变量",
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-input-params',
                        validateOptions: {
                            allowValueEmpty: false,
                        },
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
