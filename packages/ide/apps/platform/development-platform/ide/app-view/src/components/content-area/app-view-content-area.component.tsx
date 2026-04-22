import { defineComponent, PropType, withModifiers } from 'vue';
import { TabInstance } from '../appview/app-view.component';

export interface AppViewContentAreaProps {
    tabs: TabInstance[];
    activeTabId: string | null;
    onActiveTab?: (tabId: string) => void;
    onCloseTab?: (tabId: string) => void;
}

export default defineComponent({
    name: 'AppViewContentArea',
    props: {
        tabs: {
            type: Array as PropType<TabInstance[]>,
            default: () => [
            ]
        },
        activeTabId: {
            type: String as PropType<string | null>,
            default: null
        },
        onActiveTab: {
            type: Function as PropType<(tabId: string) => void>,
            default: undefined
        },
        onCloseTab: {
            type: Function as PropType<(tabId: string) => void>,
            default: undefined
        }
    },
    emits: [],
    setup(props: AppViewContentAreaProps) {
        function onClickTabItem(tab: TabInstance) {
            props.onActiveTab?.(tab.instanceId);
        }

        function getTabClass(tab: TabInstance) {
            return {
                'active': tab.instanceId === props.activeTabId,
                'fix': tab.fix,
                'f-admin-main-tab-item': true
            };
        }

        function getContentClass(tab: TabInstance) {
            return {
                'active': tab.instanceId === props.activeTabId,
                'f-admin-main-tab-content': true
            };
        }

        function renderTabs() {
            if (props.tabs.length === 0) {
                return null;
            }
            return (
                <div class="f-admin-main-tabs">
                    <div class="f-admin-main-tabs-content">
                        {props.tabs.map((tab: TabInstance) => {
                            return (
                                <div
                                    class={getTabClass(tab)}
                                    onClick={() => onClickTabItem(tab)}
                                >
                                    {tab.icon && <span><i class={tab.icon}></i></span>}
                                    {tab.name && <span>{tab.name}</span>}
                                    {tab.instanceId !== 'home' && (
                                        <div
                                            class="f-admin-main-tab-item-close"
                                            onClick={withModifiers(() => props.onCloseTab?.(tab.instanceId), ['stop'])}
                                        >
                                            <i class="f-icon f-icon-close"></i>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div class="f-admin-main-tabs-background"></div>
                </div>
            );
        }

        function renderContents() {
            if (props.tabs.length === 0) {
                return (
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                        <div>请从左侧导航选择页面</div>
                    </div>
                );
            }
            return props.tabs.map((tab: TabInstance) => {
                return (
                    <div class={getContentClass(tab)}>
                            <iframe title={tab.instanceId} src={tab.url}></iframe>
                    </div>
                );
            });
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard active" style="display: flex;">
                    <div class="f-admin-main-header"></div>
                    {renderTabs()}
                    <div class="f-admin-main-content">
                        {renderContents()}
                    </div>
                </div>
            );
        };
    }
});
