import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { ValidateUtils, BuiltinNodeType } from '@farris/flow-devkit';
import { startIcon } from '@flow-designer/assets/images';
import StartNodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';

export const START_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.Start,
        label: '开始',
        description: '流程的起始节点，用于设定流程的入参列表',
        icon: startIcon,
        isStartNode: true,
        deletable: false,
        canCopy: false,
        canRename: false,
        ports: [
            {
                id: 'output',
                position: 'right',
                type: 'source',
            }
        ]
    },
    component: markRaw(StartNodeComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateParameters(nodeData.inputParams, {
                nodeData,
            }),
        );
    },
};
