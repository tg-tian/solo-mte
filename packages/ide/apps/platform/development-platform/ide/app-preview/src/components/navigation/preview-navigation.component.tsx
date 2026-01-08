import { computed, defineComponent, ref, PropType, onMounted, onBeforeMount } from 'vue';
import { FAccordion, FAccordionItem, FListView } from "@farris/ui-vue";
import axios from "axios";
import { MenuItem } from '../preview/preview.props';
import { usePage } from '../../composition/use-page';

export interface PreviewNavigationProps {
    menuItems: MenuItem[];
    onOpenHome?: () => void;
    onOpenMenuItem?: (menuItem: MenuItem) => void;
}

export default defineComponent({
    name: 'PreviewNavigation',
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
    setup(props: PreviewNavigationProps) {
        const title = ref('预览应用');
        const navigationPanelRef = ref();
        const navigationPanelContainerRef = ref();
        const offsetY = ref(0);
        const activeMenuItemId = ref<string | null>(null);
        const usePageComposition = usePage();
        const { getPages } = usePageComposition;
        const queryParams = new URLSearchParams(window.location.search);
        const path = queryParams.get('path') || '';
        const menuItems = ref<MenuItem[]>([]);
        getPages(path).then((pages) => {
            menuItems.value = pages.map((page) => {
                // {id: '1', name: '联系人', url: '/platform/common/web/renderer/index.html#/preview?metadataPath=Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components/Contacts.frm&projectPath=Cases/ApplicationTemplates/Contacts/bo-contacts-front/metadata/components&baseMetadataId=580a302f-513a-452b-a9dc-9816ffd02c09'},
                const projectPath = page.relativePath.split('/').slice(0, -1).join('/');
                const url = `/platform/common/web/renderer/index.html#/preview?metadataPath=${page.relativePath}&projectPath=${projectPath}&baseMetadataId=${page.id}`;
                return {
                    id: page.id,
                    name: page.name,
                    url: url,
                    icon: page.icon,
                };
            })
        });

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

        function getAppInfo() {
            const queryParams = new URLSearchParams(window.location.search);
            const appId = queryParams.get('appId') || '';
            const resourceUri = `/api/runtime/sys/v1.0/business-objects/${appId}`;
            axios.get(resourceUri).then((response) => {
                const resourceData = response.data as Record<string, any>;
                const { code, name } = resourceData;
                title.value = name;
            });
        }

        onBeforeMount(() => {
            getAppInfo();
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
                                    {menuItems.value.length > 0 && renderMenuItems(menuItems.value)}
                                </FAccordionItem>
                            </FAccordion>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
