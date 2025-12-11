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
        this.propertyConfig.categories['loopSettings'] = {
            title: "循环设置",
            description: "Loop Settings",
            properties: {
                iterableExpr: {
                    title: '循环数组',
                    description: '循环次数等于数组的长度',
                    type: "object",
                    editor: {
                        type: 'fvf-value-expression-input',
                        placeholder: '请输入或选择循环数组',
                        onlyAllowArrayType: true,
                        validateOptions: {
                            allowValueEmpty: false,
                            fieldName: '循环数组',
                        },
                    },
                }
            },
            setPropertyRelates(changeObject: any, propertyData: NodeData, paramters: any) {
                switch (changeObject?.propertyID) {
                    case 'iterableExpr': {
                        propertyData.iterableExprType = paramters?.type;
                        break;
                    }
                }
            }
        };
        this.propertyConfig.categories['outputs'] = {
            title: "循环变量",
            properties: {
                outputParams: {
                    type: "array",
                    editor: {
                        type: 'fvf-input-params',
                        validateOptions: {
                            invalidCodes: {
                                index: '不能以 index 作为变量名',
                                item: '不能以 item 作为变量名',
                            },
                        },
                    }
                }
            }
        };
        return this.propertyConfig;
    }
}
