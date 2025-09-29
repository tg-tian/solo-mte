/**
 * Copyright (c) 2020 - present, Inspur Genersoft Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { computed, defineComponent, inject, provide, ref, SetupContext, onMounted } from 'vue';
import { CodeTabsProps, codeTabsProps } from '../props/code-tabs.props';
import "./code-tabs.scss";
import { CodeTab } from '../composition/type/tab';

export default defineComponent({
    name: 'FDesignCodeTabs',
    props: codeTabsProps,
    emits: ['selected', 'unselected', 'beforeClose', 'selecting'] as (string[] & ThisType<void>) | undefined,
    setup(props: CodeTabsProps, context: SetupContext) {
        let currentTab;
        const tabs = ref(props.tabs || []);
        const mouseInCloseIcon = ref(false);
        onMounted(() => {
        });
        /** 将标签滚动到可视区域内 */
        function intoView(tab: CodeTab) {
            const elId = tab.id + '-link';
            const tabHeaderEl = document.getElementById(elId);
            if (tabHeaderEl) {
                tabHeaderEl.scrollIntoView();
            }
        }
        /** 通过标签实例选中标签 */
        function selectTab(tab: CodeTab) {
            if (!tab || currentTab === tab) {
                return;
            }
            // 取消之前被选中的标签
            if (currentTab) {
                currentTab.active = false;
                context.emit('unselected', currentTab);
            }
            currentTab = tab;
            // 选中新的标签
            tab.active = true;
            intoView(tab);
            context.emit('selected', tab);
        }
        /** 处理标签点击事件 */
        function onTabClick(tab: CodeTab) {
            context.emit("selecting", tab);
            selectTab(tab);
        }
        function clearTabId(id: string) {
            if (id) {
                const lastIdx = id.lastIndexOf('-link');
                if (lastIdx > -1) {
                    return id.substring(0, lastIdx);
                }
                return id;
            }
            return id;
        }

        function getTab(id: string): CodeTab {
            id = clearTabId(id);
            return tabs.value.find(n => n.id === id);
        }
        /** 通过id选中标签 */
        function selectById(tabId: string) {
            const tab = getTab(tabId);
            selectTab(tab);
        }
        function getTabIndex(id: string) {
            id = clearTabId(id);
            return tabs.value.findIndex(n => n.id === id);
        }
        /**
         * 添加一个新的标签
         * @param tab 标签实例
         * @param active 是否设置为被选中状态
         */
        function addTab(tab: CodeTab, active: boolean = true) {
            if (!tabs.value || !tabs.value.length || tabs.value.length === 1) {
                tabs.value.push(tab);
            } else {
                // 在当前被选中标签之后添加新的标签
                const activeIndex = getTabIndex(currentTab.id);
                tabs.value.splice(activeIndex + 1, 0, tab);
            }
            if (active) {
                selectTab(tab);
            }
            intoView(tab);
        }

        function removeTab(tabId: string) {
            const index = getTabIndex(tabId);
            tabs.value = tabs.value.filter(n => n.id !== tabId);
            // 如果右侧存在标签页则优先打开右侧的，否则选中左侧的
            if (tabs.value.length > index) {
                selectTab(tabs.value[index]);
            } else if (index - 1 > -1) {
                selectTab(tabs.value[index - 1]);
            }
        }
        function onCloseMouseMove(state) {
            mouseInCloseIcon.value = state;
        }

        /** 关闭全部标签 */
        function closeAll() {
            tabs.value = [];
        }

        /** 触发标签关闭事件 */
        function onCloseTab(tab: CodeTab, event: Event) {
            event.stopPropagation();
            context.emit("beforeClose", tab);
        }

        /**
         * 关闭其它所有标签
         * @param ignoreTab 标签实例
         */
        function closeOtherTabs(ignoreTab: CodeTab) {
            tabs.value = tabs.value.filter(n => n.id === ignoreTab.id);
            selectTab(ignoreTab);
        }
        context.expose({ addTab, closeOtherTabs, removeTab, closeAll, selectById, getTab });

        return () => {
            return (
                <div class="ide-tabs custom-tab-scrollbar--wrapper from-ide-code-view">
                    <div class="tab-list-wrapper">
                        <ul class="tab-list">
                            {tabs.value.map((tab) => {
                                return <li class={{ "tab-item": true, "from-ide-code-view": true, "active": tab.active }}
                                    id={tab.id ? tab.id + '-link' : ''}
                                    onClick={() => onTabClick(tab)}>
                                    <div class="tab-item-content">
                                        <span class={[tab.icon || '', 'tab-item-icon']}></span>
                                        <span class="tab-item-text" title={tab.title}>
                                            {tab.title}
                                        </span>
                                        <span class={{ "f-icon": true, "tab-item-close": true, "f-icon-close": !tab.isDirty || mouseInCloseIcon.value, "f-icon-circle": tab.isDirty && !mouseInCloseIcon.value }}
                                            onClick={(event) => onCloseTab(tab, event)}
                                            onMouseenter={() => onCloseMouseMove(true)}
                                            onMouseleave={() => onCloseMouseMove(false)}>
                                        </span>
                                    </div>
                                </li>;
                            })}
                        </ul>
                    </div>
                </div>

            );
        };
    }
});
