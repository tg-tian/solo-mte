import type { NodeDefinition } from '@farris/flow-devkit';
import { BasicTypeRefer } from '@farris/flow-devkit';
import { CustomNodeType } from '@/types/node-type';
import { markRaw } from 'vue';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { mcpIcon } from '@/assets';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const MCP_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.MCP,
        label: 'MCP',
        description: '调用MCP服务执行特定任务，支持从MCP服务库中选择和管理MCP工具',
        icon: mcpIcon,
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
            mcpServerId: '',
            mcpServerName: '',
            mcpToolId: '',
            mcpToolName: '',
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
