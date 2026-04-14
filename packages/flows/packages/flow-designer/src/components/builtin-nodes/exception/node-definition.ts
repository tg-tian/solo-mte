import { markRaw } from 'vue';
import { type NodeDefinition, BuiltinNodeType, BasicTypeRefer, ValidateUtils } from '@farris/flow-devkit'
import { NodeProperty } from './property-config';
import { exceptionIcon } from '@flow-designer/assets/images';
import NodeComponent from './node.component.vue';

/**
 * 异常节点
 */
export const EXCEPTION_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.Exception,
        label: '异常',
        description: '抛出执行过程中的异常',
        icon: exceptionIcon,
        debuggable: false,
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
            level: 'error',
        };
    },

    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },

    validator: (nodeData) => {
        const errors: string[] = [];
        const exceptionInfo = nodeData.exceptionInfo?.trim() || '';
        if (!exceptionInfo) {
            errors.push('异常信息不能为空');
        }
        if (!nodeData.level || !nodeData.level.trim()) {
            errors.push('请选择异常级别');
        }
        return ValidateUtils.mergeNodeValidationResult(
          { errors: errors.map(message => ({ message })) },
        );
    }
};
