import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { BasicTypeRefer, ValidateUtils } from '@farris/flow-devkit';
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
            outputParams: [
                {
                    code: 'output',
                    name: 'output',
                    type: BasicTypeRefer.StringType,
                    description: '大模型回复',
                },
            ],
        };
    },
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
      afterEdgeAddOrRemove: createStreamingOutputChecker(),

    validator: (nodeData) => {
        // 验证模型选择是否必填
        let modelValidation = { isValid: true, errors: [] as Array<{message: string}> };

        if (!nodeData.modelInfo?.modelId || nodeData.modelInfo.modelId.trim() === '') {
            modelValidation = {
                isValid: false,
                errors: [{ message: '模型选择不能为空' }]
            };
        }

        // 验证用户提示词是否必填
        let promptValidation = { isValid: true, errors: [] as Array<{message: string}> };

        if (!nodeData.userPrompt || nodeData.userPrompt.trim() === '') {
            promptValidation = {
                isValid: false,
                errors: [{ message: '用户提示词不能为空' }]
            };
        }

        return ValidateUtils.mergeNodeValidationResult(
            modelValidation,
            promptValidation,
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
