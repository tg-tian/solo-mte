import { markRaw } from 'vue';
import type { NodeDefinition, MethodInvokeExpr } from '@farris/flow-devkit';
import { BuiltinNodeType, ValueExpressUtils } from '@farris/flow-devkit';
import { methodInvokeIcon } from '@flow-designer/assets/images';
import MethodInvokeComponent from './node.component.vue';
import { NodeProperty } from './property-config';

export const METHOD_INVOKE_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.MethodInvoke,
        label: '函数调用',
        description: '用于调用一个函数',
        icon: methodInvokeIcon,
        debuggable: true,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            },
            {
                id: 'output',
                position: 'right',
                type: 'source',
            }
        ]
    },
    component: markRaw(MethodInvokeComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    validator: (nodeData) => {
        if (!ValueExpressUtils.isMethodInvokeExpr(nodeData.express)) {
            return { errors: [{ message: "函数名不可为空" }] };
        }
    },
    getDebugParams: (nodeData) => {
        const express = nodeData.express as MethodInvokeExpr;
        const method = ValueExpressUtils.getMethodTypeByMethodInvokeExpr(express);
        return method?.parameters || [];
    },
};
