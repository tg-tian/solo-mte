import type { NodeData, MethodInvokeExpr, Parameter } from '@farris/flow-devkit';
import { BaseControlProperty, ValueExpressUtils, ParameterUtils, useTypeDetails } from '@farris/flow-devkit';

export class NodeProperty extends BaseControlProperty {

    public getPropertyConfig(nodeData: NodeData) {
        const self = this;
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
            },
            setPropertyRelates() {
                const express = nodeData.express as MethodInvokeExpr;
                const returnType = ValueExpressUtils.getReturnTypeByMethodInvokeExpr(express);
                if (!returnType || ParameterUtils.isVoid(returnType)) {
                    self.setOutputParameters(nodeData, []);
                    return;
                }
                const { loadType } = useTypeDetails();
                loadType(returnType);
                self.setOutputParameters(nodeData, [{
                    id: `${nodeData.id}_returnValue`,
                    code: `returnValue`,
                    type: returnType,
                    description: `函数的返回值`,
                    readOnly: true,
                }]);
            },
        };
        return this.propertyConfig;
    }

    private setOutputParameters(nodeData: NodeData, params: Parameter[]): void {
        nodeData.outputParams = params || [];
    }
}
