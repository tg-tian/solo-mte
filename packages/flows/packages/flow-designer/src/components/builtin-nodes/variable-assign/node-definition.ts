import { markRaw } from 'vue';
import { type NodeDefinition, BuiltinNodeType, ValidateUtils } from '@farris/flow-devkit';
import VariableAssignComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { variableAssignIcon } from '@flow-designer/assets/images';

export const VARIABLE_ASSIGN_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.VariableAssign,
        label: '变量赋值',
        description: '用于给可写入的变量赋值',
        icon: variableAssignIcon,
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
    component: markRaw(VariableAssignComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateAssignValueExprs(nodeData.expresses, {
                nodeData,
            }),
        );
    },
};
