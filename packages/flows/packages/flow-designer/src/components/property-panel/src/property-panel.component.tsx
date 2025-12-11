import { defineComponent, ref, onMounted, onBeforeMount, computed, type CSSProperties } from 'vue';
import { propertyPanelProps } from './property-panel.props';
import FlowPropertyPanelCategory from './components/property-panel-category.component';
import type { ElementPropertyConfig } from './composition/types';
import { useConfigConverter } from './composition/use-config-converter';

import './styles/property-panel.scss';

export default defineComponent({
    name: 'FlowPropertyPanel',
    props: propertyPanelProps,
    emits: ['update:mode', 'propertyChanged', 'refreshPanel'],
    setup(props, context) {
        const { convertPropertyConfig } = useConfigConverter();
        const defaultTabName = computed<string>(() => {
            return props.defaultTabName || '属性';
        });

        /** 属性类型 */
        const propertyConfig = ref();
        /** 属性值 */
        const propertyData = ref();
        /** 当前选中的标签页ID */
        const selectedTabId = ref('');
        /** 外层分类，以标签页形式展示 */
        let categoryTabs: any[] = [];

        const fPropertyPanel = ref<HTMLDivElement>();
        const propertyPanel = ref<HTMLDivElement>();

        /** 当前选中的标签页 */
        const selectedTab = ref();
        /** 给分类组件配置唯一id，用于切换控件时强制刷新分类 */
        const categoryReload = ref(0);

        /** 当前是否只有一个标签页 */
        const isOnlyTab = computed(() => {
            return categoryTabs.map(category => !category.hide).length === 1;
        });

        /** 收折 */
        function changeStatus(item: any) {
            if (!item.status || item.status === 'open') {
                item.status = 'closed';
            } else {
                item.status = 'open';
            }
        }

        /**
         * 将属性分类按照标签页进行归类
         */
        function checkShowTabCategory() {
            categoryTabs = [];
            if (!propertyConfig.value || propertyConfig.value.length === 0) {
                categoryTabs = [
                    {
                        tabId: 'default',
                        tabName: defaultTabName.value,
                        categoryList: []
                    }
                ];
                selectedTab.value = null;
                return;
            }
            propertyConfig?.value?.forEach((config: any) => {
                if (config.tabId) {
                    const propTab = categoryTabs.find((t: any) => t.tabId === config.tabId) as any;
                    if (!propTab) {
                        categoryTabs.push({
                            tabId: config.tabId,
                            tabName: config.tabName,
                            categoryList: [config],
                            hide: config.hide || config.properties.length === 0
                        });
                    } else {
                        propTab.categoryList.push(config);
                        if (propTab.hide) {
                            propTab.hide = config.hide || config.properties.length === 0;
                        }
                    }
                } else {
                    const defaultTab = categoryTabs.find((t: any) => t.tabId === 'default') as any;
                    if (!defaultTab) {
                        categoryTabs.push({
                            tabId: 'default',
                            tabName: defaultTabName.value,
                            categoryList: [config]
                        });
                    } else {
                        defaultTab.categoryList.push(config);
                    }
                }
            });
            // 记录已选的页签
            if (selectedTabId.value) {
                const selectedTabValue = categoryTabs?.find((tab: any) => tab.tabId === selectedTabId.value && !tab.hide);
                selectedTab.value = selectedTabValue || categoryTabs[0];
            } else {
                selectedTab.value = categoryTabs[0];
            }
            selectedTabId.value = selectedTab.value?.tabId;
        }

        onMounted(() => {
            checkShowTabCategory();
        });

        function updatePropertyConfig(newPropertyConfig: any, newSchema?: any, refreshFlag = true) {
            if (!propertyData.value || newSchema) {
                propertyData.value = newSchema;
            }
            propertyConfig.value = convertPropertyConfig(newPropertyConfig, propertyData.value);
            checkShowTabCategory();
            refreshFlag && categoryReload.value++;
        }

        /** 收折属性面板 */
        function onSwitcherClickEvent() {
            const newMode = props.mode === 'panel' ? 'sidebar' : 'panel';
            context.emit('update:mode', newMode);
        }

        function onRefreshPanel() {
            context.emit('refreshPanel');
        }

        function getCategoryKey(category: ElementPropertyConfig) {
            return `_${category.categoryId}`;
        }

        function onValueChanged($event: any) {
            context.emit('propertyChanged', { ...$event });
        }

        /** 属性面板值 */
        function renderPanelBody() {
            if (selectedTab.value) {
                return (
                    <div class="panel-body" ref={propertyPanel}>
                        <ul class={['property-grid']}>
                            {selectedTab.value?.categoryList?.map((category: ElementPropertyConfig) => {
                                return (!category.hide &&
                                    <li key={getCategoryKey(category)} data-category-id={category?.categoryId}>
                                        {!category.hideTitle && (
                                            <span class="group-label" onClick={() => changeStatus(category)}>
                                                <span
                                                    class={['f-icon  mr-2',
                                                        { 'f-legend-show': category.status === 'closed' },
                                                        { 'f-legend-collapse': category.status === 'open' || category.status === undefined }
                                                    ]}></span>
                                                {category.categoryName}
                                            </span>
                                        )}
                                        <div hidden={category.status === 'closed'}>
                                            <FlowPropertyPanelCategory
                                                key={`${category?.categoryId}-${categoryReload.value}`}
                                                category={category}
                                                propertyData={propertyData.value}
                                                onTriggerRefreshPanel={onRefreshPanel}
                                                onValueChanged={onValueChanged}
                                            ></FlowPropertyPanelCategory>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            }
        }

        function renderSidebar() {
            if (props.mode === 'sidebar') {
                return (
                    <div class="side-panel" onClick={onSwitcherClickEvent}>
                        <span>{defaultTabName.value}</span>
                    </div>
                );
            }
        }

        const propertyPanelStyle = computed<CSSProperties>(() => ({
            display: 'block',
            width: props.mode === 'panel' ? props.panelWidth : '42px',
        }));

        function switcherStyle(): CSSProperties {
            if (props.position === 'left') {
                return {
                    transform: props.mode === 'sidebar' ? 'rotate(180deg)' : 'none'
                };
            } else {
                return {
                    transform: props.mode === 'sidebar' ? 'none' : 'rotate(180deg)'
                };
            }
        }

        function renderSwitcher() {
            if (props.hideHeader) {
                return;
            }
            return (
                <div class="switcher">
                    <i
                        class="f-icon f-icon-exhale-discount"
                        style={switcherStyle()}
                        onClick={onSwitcherClickEvent}></i>
                </div>
            );
        }

        function onChangeSelectedTab(tab: any) {
            if (selectedTab.value && selectedTab.value['tabId'] === tab['tabId']) {
                return;
            }
            selectedTab.value = tab;
            selectedTabId.value = selectedTab.value.tabId;
        }

        function renderCategoryTabs() {
            if (props.hideHeader) {
                return;
            }
            const tabs = categoryTabs.map((tab: any) => {
                return (
                    <div
                        class={['title-label', { active: selectedTab.value && selectedTab.value.tabId === tab.tabId }, { 'd-none': tab.hide }]}
                        onClick={() => onChangeSelectedTab(tab)}>
                        <span>{tab.tabName}</span>
                    </div>
                );
            });
            return (
                <div class={['title d-flex', { only: isOnlyTab.value }]}>
                    {tabs}
                </div>
            );
        }

        onBeforeMount(() => {
            checkShowTabCategory();
        });

        function reloadPropertyPanel() {
            categoryReload.value++;
        }

        function refreshPanel() {
            onRefreshPanel();
        }

        context.expose({
            updatePropertyConfig,
            reloadPropertyPanel,
            refreshPanel,
        });

        return () => {
            return (
                <div ref={fPropertyPanel}
                    class={['property-panel', 'white-theme']}
                    style={propertyPanelStyle.value}>
                    <div class='propertyPanel panel flex-column' hidden={props.mode !== 'panel'}>
                        {renderCategoryTabs()}
                        {renderPanelBody()}
                    </div>
                    {renderSwitcher()}
                    {renderSidebar()}
                </div>
            );
        };
    }
});
