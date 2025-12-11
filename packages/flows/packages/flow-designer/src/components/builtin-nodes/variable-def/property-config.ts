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
        this.propertyConfig.categories['outputs'] = {
            title: "变量",
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-input-params',
                        paramCodeColumnTitle: '变量名',
                        paramValueColumnTitle: '变量值',
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
