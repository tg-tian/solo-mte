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
        this.propertyConfig.categories['express'] = {
            title: "调用配置",
            properties: {
                express: {
                    type: "object",
                    editor: {
                        type: 'fvf-method-invoke-express',
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
