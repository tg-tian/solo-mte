import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { toolIcon } from '@/assets';
import { BasicTypeRefer } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const TOOL_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.Tool,
        label: '工具',
        description: '调用工具执行特定任务，支持从工具库中选择和管理工具',
        icon: toolIcon,
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
            toolId: '',
            toolName: '',
            inputParams: [],
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
};
