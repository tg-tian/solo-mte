import { computed, defineComponent, ref, PropType, onMounted, onBeforeMount } from 'vue';
import { FAccordion, FAccordionItem, FListView } from "@farris/ui-vue";
import axios from "axios";
import { MenuItem } from '../appview/app-view.props';
import { buildGspAppInvokeUrl } from '../../composition/gsp-app-url';

/** gspapp 接口返回（字段名以服务端为准，兼容 appInvoks / appInvokes） */
interface GspAppInvoke {
    id: string;
    name?: string;
    appEntrance?: string;
}

interface GspAppResponse {
    id?: string;
    name?: string;
    url?: string;
    nameLanguage?: Record<string, string | null>;
    appInvoks?: GspAppInvoke[];
    appInvokes?: GspAppInvoke[];
}

export interface AppViewNavigationProps {
    menuItems: MenuItem[];
    onOpenHome?: () => void;
    onOpenMenuItem?: (menuItem: MenuItem) => void;
}

export default defineComponent({
    name: 'AppViewNavigation',
    props: {
        menuItems: {
            type: Array as PropType<MenuItem[]>,
            default: () => []
        },
        onOpenHome: {
            type: Function as PropType<() => void>,
            default: undefined
        },
        onOpenMenuItem: {
            type: Function as PropType<(menuItem: MenuItem) => void>,
            default: undefined
        }
    },
    emits: [],
    setup(props: AppViewNavigationProps) {
        const title = ref('应用');
        const navigationPanelRef = ref();
        const navigationPanelContainerRef = ref();
        const offsetY = ref(0);
        const activeMenuItemId = ref<string | null>(null);
        const menuItems = ref<MenuItem[]>([]);
        const gspAppLoaded = ref(false);
        const requestedAppId = ref(false);

        function pickAppDisplayName(data: GspAppResponse): string {
            const lang = (typeof navigator !== 'undefined' && navigator.language) || 'zh-CHS';
            const fromLang = data.nameLanguage?.[lang] || data.nameLanguage?.['zh-CHS'];
            const raw = (fromLang || data.name || '').trim();
            return raw || '应用';
        }

        function mapInvokesToMenuItems(data: GspAppResponse): MenuItem[] {
            const invokes = data.appInvoks ?? data.appInvokes ?? [];
            const base = (data.url || '').trim();
            if (!base || invokes.length === 0) {
                return [];
            }
            return invokes.map((inv) => {
                const entrance = (inv.appEntrance || inv.code || '').trim();
                return {
                    id: inv.id,
                    name: (inv.name || entrance || inv.id).trim(),
                    url: buildGspAppInvokeUrl(base, entrance),
                };
            }).filter((m) => m.url);
        }

        const navigationMenuStyle = computed(() => {
            return {
                'z-index': '0',
                'transition': 'width.3s',
                'padding': 0,
                'box-shadow': 'none',
                'transform': `translateY(${offsetY.value}px)`
            };
        });

        function onClickHome() {
            activeMenuItemId.value = null;
            props.onOpenHome?.();
        }

        function onClickMenuItem(item: MenuItem) {
            activeMenuItemId.value = item.id;
            props.onOpenMenuItem?.(item);
        }

        function renderMenuItem({ item, index, selectedItem }) {
            const isActive = activeMenuItemId.value === item.id;
            return (
                <div
                    class={isActive ? 'f-admin-menu-item f-listview-active' : 'f-admin-menu-item'}
                    onClick={() => onClickMenuItem(item)}
                >
                    <span>{item.name}</span>
                </div>
            );
        }

        function renderMenuItems(menuItems: MenuItem[]) {
            return (
                <FListView
                    data={menuItems}
                    customClass="f-admin-menu"
                    itemClass="f-admin-menu-item"
                >
                    {{ content: renderMenuItem }}
                </FListView>
            );
        }

        function onWheel(payload: WheelEvent) {
            payload.preventDefault();
            payload.stopPropagation();

            const deltaY = ((payload as any).wheelDeltaY || payload.deltaY) / 10;
            let offsetYValue = offsetY.value + deltaY;
            const containerHeight = (navigationPanelContainerRef.value as HTMLElement)?.getBoundingClientRect().height || 0;
            const navigationPanelHeight = (navigationPanelRef.value as HTMLElement)?.getBoundingClientRect().height || 0;
            if (offsetYValue < containerHeight - navigationPanelHeight) {
                offsetYValue = containerHeight - navigationPanelHeight;
            }
            if (offsetYValue > 0) {
                offsetYValue = 0;
            }
            offsetY.value = offsetYValue;
        }

        function loadGspApp() {
            const queryParams = new URLSearchParams(window.location.search);
            const appId = (queryParams.get('appId') || '').trim();
            if (!appId) {
                requestedAppId.value = false;
                menuItems.value = [];
                gspAppLoaded.value = true;
                return;
            }
            requestedAppId.value = true;
            gspAppLoaded.value = false;
            const resourceUri = `/api/runtime/sys/v1.0/gspapp/${appId}`;
            axios
                .get<GspAppResponse>(resourceUri)
                .then((response) => {
                    const data = response.data;
                    title.value = pickAppDisplayName(data);
                    menuItems.value = mapInvokesToMenuItems(data);
                })
                .catch(() => {
                    title.value = '应用';
                    menuItems.value = [];
                })
                .finally(() => {
                    gspAppLoaded.value = true;
                });
        }

        onBeforeMount(() => {
            loadGspApp();
        });

        onMounted(() => {
            if (navigationPanelRef.value) {
                navigationPanelContainerRef.value = (navigationPanelRef.value as HTMLElement).closest('.f-admin-navigation');
            }
        });

        return () => {
            return (
                <div class="f-admin-navigation-content" style="display:flex;flex-direction:column;">
                    <div>
                        <div class="f-admin-navigation-logo">
                            <span>{title.value}</span>
                        </div>
                    </div>
                    <div style="flex:1;overflow:hidden;">
                        <div ref={navigationPanelRef} class="f-page-content-nav" style={navigationMenuStyle.value} onWheel={onWheel}>
                            <FAccordion customClass="f-admin-menu-groups">
                                {/* 首页菜单项 */}
                                <FAccordionItem customClass="f-admin-menu-group" enableFold={false} title="首页" onClickHeader={onClickHome} />
                                {/* 应用菜单项 */}
                                <FAccordionItem customClass="f-admin-menu-group" enableFold={true} title="应用" active={true}>
                                    {menuItems.value.length > 0
                                        ? renderMenuItems(menuItems.value)
                                        : gspAppLoaded.value &&
                                          requestedAppId.value && (
                                            <div class="f-admin-menu" style="padding:10px 14px;color:rgba(255,255,255,0.75);font-size:13px;">
                                                暂无应用入口
                                            </div>
                                        )}
                                </FAccordionItem>
                            </FAccordion>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
