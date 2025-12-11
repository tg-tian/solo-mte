import { markRaw } from 'vue';
import { type NodeDefinition, BuiltinNodeType, ValueExpressUtils, ValidateUtils } from '@farris/flow-devkit';
import SelectorNodeComponent from './node.component.vue';
import { NodeProperty } from './property-config';
import { selectorIcon } from '@flow-designer/assets/images';

export const SELECTOR_NODE: NodeDefinition = {
    metadata: {
        type: BuiltinNodeType.Selector,
        label: '选择器',
        description: '连接多个下游分支，若设定的条件成立则仅运行对应的分支，若均不成立则只运行“否则”分支',
        icon: selectorIcon,
        debuggable: false,
        ports: [
            {
                id: 'input',
                position: 'left',
                type: 'target',
            }
        ]
    },
    component: markRaw(SelectorNodeComponent),
    getPropertyPanelConfig: (nodeData) => {
        const config = new NodeProperty();
        return config.getPropertyConfig(nodeData);
    },
    initialData() {
        return {
            branches: [
                ValueExpressUtils.createSelectorBranch(
                    ValueExpressUtils.createLogicExpr([
                        ValueExpressUtils.createCompareExpr()
                    ])
                ),
                ValueExpressUtils.createSelectorBranch(),
            ],
        };
    },
    validator: (nodeData) => {
        return ValidateUtils.mergeNodeValidationResult(
            ValidateUtils.validateSelectorBranches(nodeData.branches, {
                nodeData,
            }),
        );
    },
};
