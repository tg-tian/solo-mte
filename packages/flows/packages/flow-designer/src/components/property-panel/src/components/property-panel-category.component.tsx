import { defineComponent, ref, watch } from 'vue';
import { propertyPanelCategoryProps } from './property-panel-category.props';
import FlowPropertyPanelItem from './property-panel-item.component';
import type { ElementPropertyConfig, PropertyEntity } from '../composition/types';

import '../styles/property-panel-category.scss';

export default defineComponent({
    name: 'FlowPropertyPanelCategory',
    props: propertyPanelCategoryProps,
    emits: ['valueChanged', 'submitModal', 'triggerRefreshPanel'],
    setup(props, context) {

        const category = ref(props.category);

        function hideCascadeTitle(propItem: any) {
            if (!propItem.hideCascadeTitle) {
                return (
                    <div class="farris-input-wrap">
                        <input title='summary' type="input" class="form-control form-control-sm" value={propItem.cascadeSummary} readonly>
                        </input>
                    </div>
                );
            }
        }

        function onClickExpandButton(_payload: MouseEvent, propertyItem: PropertyEntity) {
            propertyItem.isExpand = !propertyItem.isExpand;
        }

        function renderExpandButton(propertyItem: PropertyEntity) {
            return (
                <div class="landscape">
                    <button title='expand-button' class={['btn f-btn-collapse-expand f-btn-mx px-1', { 'f-state-expand': propertyItem.isExpand }]}
                        onClick={(payload: MouseEvent) => onClickExpandButton(payload, propertyItem)} >
                        <span></span>
                    </button>
                </div>
            );
        }

        function formgroup(propertyItem: PropertyEntity) {
            return (
                <div class={`f-section-formgroup-legend ${category.value.categoryId}-${propertyItem.propertyID}`}>
                    <div class="f-header px-0 my-0 col-form-label" style="font-size: inherit;">
                        <div class="wrap">
                            <span class={["f-icon mr-1", { 'f-icon-arrow-60-right': !propertyItem.isExpand, 'f-icon-arrow-60-down': propertyItem.isExpand }]}></span>
                            <span class="farris-label-text">{propertyItem.propertyName}</span>
                        </div>
                    </div>
                </div>
            );
        }

        function getPropertyItemKey(propertyItem: PropertyEntity) {
            return `${props.categoryKey}_${propertyItem.propertyID}`;
        }

        function onPropertyChanged(changeObject: any, parameters: any) {
            changeObject.categoryId = category.value.categoryId;
            if (category.value.enableCascade) {
                changeObject.propertyPath = category.value.parentPropertyID;
            }
            if (category.value.setPropertyRelates) {
                category.value.setPropertyRelates(changeObject, props.propertyData, parameters);
            }
            context.emit('valueChanged', { changeObject });
        }

        function triggerRefreshPanel() {
            context.emit('triggerRefreshPanel');
        }

        function renderPropertyPanelItem(propertyItem: PropertyEntity) {
            return (
                <div class="mb-2">
                    <FlowPropertyPanelItem key={getPropertyItemKey(propertyItem)}
                        elementConfig={propertyItem}
                        category={category.value}
                        onPropertyChange={onPropertyChanged}
                        onTriggerRefreshPanel={triggerRefreshPanel}
                    ></FlowPropertyPanelItem>
                </div>
            );
        }

        /** 带级联属性的类型 */
        function renderCascadePropertyPanelItem(propertyItem: PropertyEntity) {
            return (
                <div class="propertyCascadeItem farris-panel px-2 mb-2">
                    <div class={['farris-panel-item card', { hidden: !propertyItem.isExpand }]}>
                        <div class="card-header" onClick={(payload: MouseEvent) => onClickExpandButton(payload, propertyItem)}>
                            <div class="panel-item-title">
                                <div class="form-group farris-form-group line-item">
                                    {formgroup(propertyItem)}
                                    {hideCascadeTitle(propertyItem)}
                                    {renderExpandButton(propertyItem)}
                                </div>
                            </div>
                        </div>
                        <div class={['card-body', { hidden: !propertyItem.isExpand }]}>
                            {propertyItem.cascadeConfig?.map((cascadeItem: any) => renderPropertyPanelItem(cascadeItem))}
                        </div>
                    </div>
                </div>
            );
        }

        watch(() => props.category, () => {
            category.value = props.category as ElementPropertyConfig;
        });

        function getPropertyPanelItemRender(propertyItem: PropertyEntity) {
            return propertyItem.propertyType === 'cascade' ? renderCascadePropertyPanelItem : renderPropertyPanelItem;
        }

        return () => {
            return <>
                {category.value.properties.map((propertyItem: PropertyEntity) => {
                    const renderPropertyItem = getPropertyPanelItemRender(propertyItem);
                    return renderPropertyItem(propertyItem);
                })}
            </>;
        };
    }
});
