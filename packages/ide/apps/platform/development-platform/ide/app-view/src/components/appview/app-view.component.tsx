import { computed, defineComponent, ref } from 'vue';
import { AppViewProps, appViewProps, MenuItem } from './app-view.props';
import AppViewNavigation from '../navigation/app-view-navigation.component';
import AppViewContentArea from '../content-area/app-view-content-area.component';
import './app-view.scss';

export interface TabInstance {
    functionId: string;
    instanceId: string;
    code: string;
    name: string;
    url: string;
    icon?: string;
    fix: boolean;
}

export default defineComponent({
    name: 'FAAppView',
    props: appViewProps,
    emits: [],
    setup(props: AppViewProps) {
        const adminMainElementRef = ref();
        const sideBarCollapsed = ref(false);
        const activeTabId = ref<string | null>('home');
        const tabs = ref<TabInstance[]>([
            {
                "functionId": "home",
                "instanceId": "home",
                "code": "home",
                "name": "",
                "url": "/platform/runtime/sys/web/home/index.html",
                "icon": "f-icon f-icon-index-face",
                "fix": true
            }
        ]);

        const sideContentStyle = computed(() => {
            const sideBarWidth = sideBarCollapsed.value ? 64 : 230;
            return {
                'width': `${sideBarWidth}px`,
                'overflow': 'visible',
                'transition': 'width 0.3s ease 0s',
                'border-top': 'none'
            };
        });

        const sideContentClass = computed(() => {
            return {
                'f-admin-navigation': true,
                'f-page-content-side': true,
                'f-side-bar-collapsed': sideBarCollapsed.value,
                'f-side-bar-expanded': !sideBarCollapsed.value
            };
        });

        function onClickSidebarHandle() {
            sideBarCollapsed.value = !sideBarCollapsed.value;
        }

        function onOpenHome() {
            // 打开首页
            const homeTab: TabInstance =                 {
                "functionId": "home",
                "instanceId": "home",
                "code": "home",
                "name": "",
                "url": "/platform/runtime/sys/web/home/index.html",
                "icon": "f-icon f-icon-index-face",
                "fix": true
            };
            openTab(homeTab);
        }

        function onOpenMenuItem(menuItem: MenuItem) {
            // 打开菜单项对应的页面
            const tab: TabInstance = {
                functionId: menuItem.id,
                instanceId: menuItem.id,
                code: menuItem.id,
                name: menuItem.name,
                url: menuItem.url,
                icon: menuItem.icon,
                fix: false
            };
            openTab(tab);
        }

        function openTab(tab: TabInstance) {
            // 检查是否已存在该页签
            const existingTab = tabs.value.find(t => t.instanceId === tab.instanceId);
            if (existingTab) {
                activeTabId.value = tab.instanceId;
            } else {
                tabs.value.push(tab);
                activeTabId.value = tab.instanceId;
            }
        }

        function closeTab(tabId: string) {
            const index = tabs.value.findIndex(t => t.instanceId === tabId);
            if (index !== -1) {
                tabs.value.splice(index, 1);
                // 如果关闭的是当前激活的页签，切换到其他页签
                if (activeTabId.value === tabId) {
                    if (tabs.value.length > 0) {
                        activeTabId.value = tabs.value[tabs.value.length - 1].instanceId;
                    } else {
                        activeTabId.value = null;
                    }
                }
            }
        }

        function onActiveTab(tabId: string) {
            activeTabId.value = tabId;
        }

        function renderSidebarHandle() {
            return <div class="f-admin-navigation-footer">
                <span class="f-admin-navigation-footer-handle" onClick={onClickSidebarHandle}>
                    <i class="f-icon f-icon-exhale-discount"></i>
                </span>
            </div>;
        }

        return () => {
            return (
                <div class="app-view-page">
                    <div class="f-admin f-page f-page-navigate f-page-is-listnav">
                        <div ref={adminMainElementRef} class="f-admin-main f-page-main">
                            <div class="f-page-content">
                                <div class={sideContentClass.value} style={sideContentStyle.value}>
                                    {!sideBarCollapsed.value && (
                                        <AppViewNavigation
                                            menuItems={props.menuItems || []}
                                            onOpenHome={onOpenHome}
                                            onOpenMenuItem={onOpenMenuItem}
                                        />
                                    )}
                                    {renderSidebarHandle()}
                                </div>
                                <div class="f-admin-content f-page-content-main">
                                    <AppViewContentArea
                                        tabs={tabs.value}
                                        activeTabId={activeTabId.value}
                                        onActiveTab={onActiveTab}
                                        onCloseTab={closeTab}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
