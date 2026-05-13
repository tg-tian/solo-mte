import { markRaw } from 'vue';
import { type NodeDefinition } from '@farris/flow-devkit'
import { expressIcon } from '@flow-designer/assets/images';
import { BasicTypeRefer, BuiltinNodeType, ValidateUtils } from '@farris/flow-devkit'
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';

/**
 * 数学表达式计算节点
 */
export const EXPRESS_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.EXPRESS,
        label: '数学计算',
        description: '用于执行数学表达式计算',
        icon: expressIcon,
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
    component: markRaw(NodeComponent),
    initialData: () => {
        return {
            outputParams: [
                {
                    code: 'result',
                    type: BasicTypeRefer.NumberType,
                    description: '返回结果'
                }
            ]
        };
    },
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },

    validator: (nodeData) => {
        const errors: string[] = [];
        if (nodeData.inputParams.length === 0) {
            errors.push('请选择输入参数');
        }

        console.warn('nodeData', nodeData)

        const validTypes = ["int", "number"];
        for (const param of nodeData.inputParams) {
            if (!validTypes.includes(param.type.typeId)) {
                errors.push(`输入参数 "${param.code}" 的类型必须是 Number 或 Integer`);
            }
        }

        const express = nodeData.express?.trim() || '';
        if (!express) {
            errors.push('数学表达式不能为空');
        }

        return ValidateUtils.mergeNodeValidationResult(
            { errors: errors.map(message => ({ message })) },
        );
    }
};
