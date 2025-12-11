import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { ValidateUtils, BuiltinNodeType } from '@farris/flow-devkit';
import { endIcon } from '@flow-designer/assets/images';
import EndNodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';

export const END_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.End,
        label: '结束',
        description: '流程的最终节点，用于返回流程的执行结果',
        icon: endIcon,
        isEndNode: true,
        deletable: true,
        canCopy: true,
        canRename: true,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            }
        ]
    },
    component: markRaw(EndNodeComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateParameters(nodeData.outputParams, {
                nodeData,
                allowValueEmpty: false,
            }),
        );
    },
};
