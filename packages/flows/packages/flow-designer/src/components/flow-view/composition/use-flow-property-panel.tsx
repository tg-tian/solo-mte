import { inject, ref, computed, type CSSProperties, watch } from 'vue';
import { FlowPropertyPanel, type PanelShowMode } from '@flow-designer/components/property-panel';
import { FLOW_REGISTRY_KEY, FLOW_METADATA_KEY } from '@flow-designer/hooks';
import type { PropertyCategory, PropertyPanelConfig } from '@farris/flow-devkit';

import css from '../flow-view.module.scss';

export function useFlowPropertyPanel() {

    const flowRegistry = inject(FLOW_REGISTRY_KEY);
    const flowMetadata = inject(FLOW_METADATA_KEY);

    /**
     * 流程的通用属性
     * @description `categoryID`等于`_basic_`
     */
    const defaultPropertyCategory: PropertyCategory = {
        title: "基本信息",
        description: "Basic Information",
        properties: {
            id: {
                title: "ID",
                type: "string",
                readonly: true,
                description: "流程的唯一标识",
            },
            code: {
                title: "编号",
                type: "string",
                description: "流程的编号",
            },
            name: {
                title: "名称",
                type: "string",
                description: "流程的名称",
            },
            description: {
                title: "简介",
                type: "string",
                editor: {
                    type: 'textarea',
                    placeholder: '请输入描述',
                    maxLength: 600,
                    showCount: true,
                },
                description: "流程的简介",
            },
        },
    };

    const propertyData = computed(() => {
        return flowMetadata?.extension || {};
    });

    const propertyPanelInstance = ref();
    const panelShowMode = ref<PanelShowMode>('sidebar');

    const getPropertyPanelConfig = computed(() => {
        return flowRegistry?.value?.getPropertyPanelConfig;
    });

    const shouldShowPropertyPanel = computed<boolean>(() => {
        return true;
    });

    const isShowPanel = computed<boolean>(() => {
        return panelShowMode.value === 'panel';
    });

    const leftPanelWidth = ref<number>(300);

    const leftPanelStyle = computed<CSSProperties>(() => ({
        display: shouldShowPropertyPanel.value ? undefined : 'none',
        width: isShowPanel.value ? `${leftPanelWidth.value}px` : `auto`,
    }));

    const defaultPropertyPanelConfig: PropertyPanelConfig = {
        type: 'object',
        categories: {},
    };

    function updatePropertyPanel(forceUpdate = true): void {
        const propertyConfig = getPropertyPanelConfig.value?.(propertyData.value) || defaultPropertyPanelConfig;
        propertyConfig.type = 'object';
        propertyConfig.categories = Object.assign({ _basic_: defaultPropertyCategory }, propertyConfig.categories);
        propertyPanelInstance.value.updatePropertyConfig(propertyConfig, propertyData.value, forceUpdate);
    }

    watch([propertyPanelInstance, getPropertyPanelConfig], () => {
        if (propertyPanelInstance.value) {
            updatePropertyPanel();
        }
    });

    function onPropertyChanged(_event: any): void { }

    function onRefreshPanel(): void {
        updatePropertyPanel(false);
    }

    function onUpdateMode(newValue: PanelShowMode): void {
        panelShowMode.value = newValue;
    }

    function renderFlowPropertyPanel() {
        return (
            <div
                class={[css['left-property-panel'], !isShowPanel.value && css['panel-collapse']]}
                style={leftPanelStyle.value}
            >
                <FlowPropertyPanel
                    ref={propertyPanelInstance}
                    position="left"
                    panelWidth="100%"
                    defaultTabName={'信息配置'}
                    mode={panelShowMode.value}
                    onUpdate:mode={onUpdateMode}
                    onPropertyChanged={onPropertyChanged}
                    onRefreshPanel={onRefreshPanel}
                ></FlowPropertyPanel>
            </div>
        );
    }

    return {
        renderFlowPropertyPanel,
    };
}
