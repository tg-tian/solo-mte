import { markRaw } from 'vue';
import { type NodeDefinition, BuiltinNodeType, ValidateUtils } from '@farris/flow-devkit';
import VariableDefComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { variableDefIcon } from '@flow-designer/assets/images';

export const VARIABLE_DEF_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.VariableDef,
        label: '变量定义',
        description: '定义一个或多个变量',
        icon: variableDefIcon,
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
    component: markRaw(VariableDefComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateParameters(nodeData.outputParams, {
                nodeData,
            }),
        );
    },
};
