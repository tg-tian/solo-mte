import { markRaw } from 'vue';
import type { NodeDefinition } from '@farris/flow-devkit';
import { textIcon } from '@/assets';
import { ValidateUtils } from '@farris/flow-devkit';
import NodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { CustomNodeType } from '../../types/node-type';
import { BasicTypeRefer } from '@farris/flow-devkit';
import { createStreamingOutputChecker } from '../../utils/streaming-output-helper';

export const TEMPLATE_CONVERTER_NODE: NodeDefinition = {
    metadata: {
        type: CustomNodeType.TemplateConverter,
        label: '模板转换',
        description: '提供模板转换功能，支持输入变量和模板处理',
        icon: textIcon,
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
            inputParams: [],
            template: '',
            outputParams: [
                {
                    code: 'result',
                    type: BasicTypeRefer.StringType,
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

        if (!nodeData.template) {
            errors.push('模板内容不能为空');
        }

        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateParameters(nodeData.inputParams, {
                nodeData,
                allowValueEmpty: false,
            }),
            { errors: errors.map(message => ({ message })) },
        );
    },
    afterEdgeAddOrRemove: createStreamingOutputChecker(),
};
