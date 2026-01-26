import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { agentIcon } from '@/assets';
import { BasicTypeRefer, BuiltinNodeType, ValidateUtils } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const AGENT_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.Agent,
        label: '智能体',
        description: '用于调用AI智能体执行任务',
        icon: agentIcon,
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
            agentId: '',
            agentCode: '',
            inputParams: [
                {
                    code: 'input',
                    type: BasicTypeRefer.StringType
                }
            ],
            outputParams: [
                {
                    code: 'result',
                    type: BasicTypeRefer.ObjectType
                }
            ]
        };
    },
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    afterEdgeAddOrRemove: createStreamingOutputChecker(),
        validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateParameters(nodeData.inputParams, {
                nodeData,
            }),
        );
    },
};
