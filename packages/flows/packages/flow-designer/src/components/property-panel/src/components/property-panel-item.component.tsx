import { defineComponent, ref, computed, watch, reactive } from 'vue';
import { propertyPanelItemProps } from './property-panel-item.props';
import { FDynamicFormGroup } from '@farris/ui-vue';
import type { PropertyChangeObject, PropertyEntity } from '../composition/types';

import '../styles/property-panel-item.scss';

export default defineComponent({
    name: 'FlowPropertyPanelItem',
    props: propertyPanelItemProps,
    emits: ['propertyChange', 'triggerRefreshPanel'],
    setup(props, context) {
        const categoryId = ref(props.category?.categoryId);
        const propertyId = ref(props.elementConfig.propertyID);
        const propertyName = ref(props.elementConfig.propertyName);
        const propertyValue = ref(props.elementConfig.propertyValue);
        const propertyItemClass = computed(() => {
            const visibleProperty = (props.elementConfig as PropertyEntity).visible;
            const visiblePropertyValue = typeof visibleProperty == 'boolean' ?
                visibleProperty : visibleProperty === undefined ? true : visibleProperty();
            return {
                'farris-group-wrap': true,
                'property-item': true,
                'd-none': !visiblePropertyValue
            };
        });
        watch(() => props.elementConfig?.propertyValue, (value) => {
            propertyValue.value = value;
        });
        // 修复表格切换列编辑器时，标签名丢失问题
        watch(() => props.elementConfig?.propertyName, (value) => {
            propertyName.value = value;
        });

        function onPropertyChange(newValue: any, options: any) {
            const { parameters } = options;
            (props.elementConfig as PropertyEntity).propertyValue = newValue;
            const changeObject: PropertyChangeObject = {
                propertyID: (props.elementConfig as PropertyEntity).propertyID,
                propertyValue: newValue
            };
            context.emit('propertyChange', changeObject, parameters);

            // 属性变更后需要触发刷新面板
            if (props.elementConfig.refreshPanelAfterChanged) {
                context.emit('triggerRefreshPanel');
            }
        }
        const descriptionElement = props.elementConfig.description ? `<div style="color: gray; "> 描述 ：${props.elementConfig.description}</div>` : '';
        const labelTooltip = reactive({
            content: `
            <div>
                <div style="color: black; ">${props.elementConfig.propertyName}</div>
                <div style="color: gray; ">ID：${props.elementConfig.propertyID}</div>
                ${descriptionElement}
            </div>`,
            placement: 'left'
        });
        const controlId = ref('');
        controlId.value = `${categoryId.value}-${propertyId.value}`;


        return () => {
            return (
                <div class={propertyItemClass.value}>
                    {props.elementConfig.propertyName && <label class={`col-form-label ${controlId.value}`} v-tooltip={labelTooltip}>
                        <span class="farris-label-text">{propertyName.value}</span>
                    </label>}
                    <FDynamicFormGroup
                        id={controlId.value}
                        showLabel={false}
                        editor={props.elementConfig.editor}
                        modelValue={propertyValue.value}
                        onChange={onPropertyChange}
                        editorParams={props.elementConfig.editorParams}
                    ></FDynamicFormGroup>
                </div >
            );
        };
    }
});
