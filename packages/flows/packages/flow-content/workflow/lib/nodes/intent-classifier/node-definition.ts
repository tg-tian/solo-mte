import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { intentClassifierIcon } from '@/assets';
import { BasicTypeRefer, uuid, ValidateUtils } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const INTENT_CLASSIFIER_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.IntendClassification,
        label: '意图分类',
        description: '根据预定义的分类，对用户输入进行意图识别和分类',
        icon: intentClassifierIcon,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            }
        ]
    },
    component: markRaw(NodeComponent),
    initialData: () => {
        const timestamp = Date.now();
        const random1 = Math.random().toString(36).slice(2, 11);
        const random2 = Math.random().toString(36).slice(2, 11);
        const class1Id = `class_${timestamp}_${random1}`;
        const class2Id = `class_${timestamp}_${random2}`;

        return {
            modelInfo: {
                modelId: '',
                modelName: '',
            },
            inputParams: [],
            intentions: [
                {
                    categoryId: class1Id,
                    categoryName: '分类1'
                },
                {
                    categoryId: class2Id,
                    categoryName: '分类2'
                }
            ],
            outputPorts: [`${class1Id}`, `${class2Id}`],
            outputParams: [
                {
                    id: uuid(),
                    code: 'categoryName',
                    type: BasicTypeRefer.StringType
                },
                {
                    id: uuid(),
                    code: 'categoryId',
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
    validator: (nodeData) => {
        // 验证模型选择是否必填
        let modelValidation = { isValid: true, errors: [] as Array<{message: string}> };

        if (!nodeData.modelInfo?.modelId || nodeData.modelInfo.modelId.trim() === '') {
            modelValidation = {
                isValid: false,
                errors: [{ message: '模型选择不能为空' }]
            };
        }

        return ValidateUtils.mergeNodeValidationResult(
            modelValidation,
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
