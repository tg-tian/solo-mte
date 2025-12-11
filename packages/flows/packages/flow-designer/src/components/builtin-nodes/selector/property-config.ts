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
        this.propertyConfig.categories['branches'] = {
            title: '条件分支',
            properties: {
                branches: {
                    type: "array",
                    editor: {
                        type: 'fvf-branch-editor',
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
