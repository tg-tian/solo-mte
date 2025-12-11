import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { BasicTypeRefer, BuiltinNodeType, ValidateUtils } from '@farris/flow-devkit';
import { llmIcon } from '@/assets';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const LLM_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.LLM,
        label: '大模型',
        description: '调用大语言模型，使用变量和提示词生成回复',
        icon: llmIcon,
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
            modelInfo: {
                modelId: '',
                modelName: '',
            },
            inputParams: [],
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
                allowValueEmpty: false,
            }),
            ValidateUtils.validateParameters(nodeData.outputParams, {
                nodeData,
            }),
        );
    },
};
