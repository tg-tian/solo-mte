import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { intentClassifierIcon } from '@/assets';
import { BasicTypeRefer, uuid, ValidateUtils } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '@/types/node-type';

/**
 * 自定义节点示例 - 意图分类节点
 * @todo 请在正式发版前移除示例节点的相关代码
 */
export const INTENT_CLASSIFIER_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.DemoIntendClassification,
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
    validator: (nodeData) => {
        const errors: string[] = [];

        const intentions = nodeData.intentions as any[];
        intentions.forEach(intention => {
            if (!intention.categoryName || !intention.categoryName.trim()) {
                errors.push('分类名称不能为空');
            }
        });

        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateParameters(nodeData.inputParams, {
                nodeData,
                allowValueEmpty: false,
            }),
            { errors: errors.map(message => ({ message })) },
        );
    }
};
