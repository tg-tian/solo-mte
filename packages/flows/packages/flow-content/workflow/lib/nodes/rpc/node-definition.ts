import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { rpcIcon } from '@/assets';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { BasicTypeRefer } from '@farris/flow-devkit';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const RPC_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.RPC,
        label: 'RPC',
        description: '用于执行远程过程调用',
        icon: rpcIcon,
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
            serviceUnit: '',
            serviceId: '',
            inputParams: [],
            outputParams: [
                {
                    code: 'result',
                    type: BasicTypeRefer.StringType
                }
            ]
        };
    },
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    afterEdgeAddOrRemove: createStreamingOutputChecker(),
};
