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
        this.propertyConfig.categories['expresses'] = {
            title: "变量",
            properties: {
                expresses: {
                    type: "array",
                    editor: {
                        type: 'fvf-variable-assign-editor',
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
