import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { fileExtractorIcon } from '@/assets';
import { BasicTypeRefer } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const FILE_EXTRACTOR_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.DocumentExtractor,
        label: '文件提取',
        description: '从输入中提取文件内容，支持指定文件类型',
        icon: fileExtractorIcon,
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
            inputParams: [
                {
                    code: 'file_input',
                    type: BasicTypeRefer.StringType
                }
            ],
            outputParams: [
                {
                    code: 'text',
                    type: BasicTypeRefer.StringArrayType
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
