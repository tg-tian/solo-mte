import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { knowledgeBaseIcon } from '@/assets';
import { BasicTypeRefer } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const KNOWLEDGE_BASE_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.KnowledgeBase,
        label: '知识库',
        description: '在选定的知识中，根据输入变量召回最匹配的信息，并以列表形式返回',
        icon: knowledgeBaseIcon,
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
                    code: 'query',
                    type: BasicTypeRefer.StringType
                }
            ],
            outputParams: [
                {
                    code: 'result',
                    type: {
                        source: 'default',
                        typeId: 'list',
                        typeCode: 'Array<KbAnswerInfo>',
                        typeName: 'Array<知识库返回值>',
                        genericTypes: [{
                            source: 'default',
                            typeId: 'com.inspures.ai.aaf.aicenter.data.KbAnswerInfo',
                            typeCode: 'KbAnswerInfo',
                            typeName: '知识库返回值',
                        }]
                    },
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
