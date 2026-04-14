import { markRaw } from 'vue';
import { type NodeDefinition, BuiltinNodeType, ValidateUtils } from '@farris/flow-devkit'
import { NodeProperty } from './property-config';
import { logIcon } from '@flow-designer/assets/images';
import NodeComponent from './node.component.vue'

/**
 * 日志节点
 */
export const LOG_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.Log,
        label: '日志',
        description: '打印执行过程中的日志',
        icon: logIcon,
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
            level: 'warn',
        };
    },

    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },

    validator: (nodeData) => {
        const errors: string[] = [];
        const logInfo = nodeData.logInfo?.trim() || '';
        if (!logInfo) {
            errors.push('日志信息不能为空');
        }
        if (!nodeData.level || !nodeData.level.trim()) {
            errors.push('请选择日志级别');
        }
        return ValidateUtils.mergeNodeValidationResult(
          { errors: errors.map(message => ({ message })) },
        );
    }
};
