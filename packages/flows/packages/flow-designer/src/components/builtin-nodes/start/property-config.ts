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
        this.propertyConfig.categories['inputs'] = {
            title: '输入',
            properties: {
                inputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-json-schema-editor',
                        canEditName: true,
                        canEditInputHelp: true,
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
