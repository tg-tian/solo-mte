import { computed, defineComponent, inject, onMounted, ref } from 'vue';
import { FAccordion, FAccordionItem, FListView, FPopover, FSearchBox } from '@farris/ui-vue/components';
import { NavigationProps, navigationProps } from './navigation.props';
import { FunctionItem, MenuGroup, MenuGroupItem, UseMenuData } from '../../composition/types';
import FFunctionNavigation from '../function-board/function-board.component';

import './navigation.css';

export default defineComponent({
    name: 'Vertical Navigation',
    props: navigationProps,
    emits: ['OpenFunction', 'ActiveWorkArea'],
    setup(props: NavigationProps, context) {
        const useMenuDataComposition = inject('f-admin-menu-data') as UseMenuData;
        const { menuData, menuMap } = useMenuDataComposition;
        const navigationPanelRef = ref();
        const navigationPanelContainerRef = ref();
        const popoverRef = ref();
        const popoverBoundrayRef = ref();
        const showPopover = ref(false);
        const currentMenuItem = ref<any>({});
        const currentFunctionItems = ref<FunctionItem[]>([]);
        const currentFunctionBoardReference = ref();
        const topOfPostion = 0;
        const offsetY = ref(0);

        function resetMenuItemSelectionStatus() {
            Array.from(menuMap.entries()).forEach(([menuGroupId, menuGroupInstanceRef]) => {
                menuGroupInstanceRef.value?.clearSelection();
            });
            if (popoverRef.value) {
                popoverRef.value.hide();
            }
        }

        function onClickMenuGroupHeader(menuGroupId: string) {
            resetMenuItemSelectionStatus();
            context.emit('ActiveWorkArea', menuGroupId);
        }

        function onClickMenuItem(payload: MouseEvent, item: MenuGroupItem) {
            resetMenuItemSelectionStatus();
            currentMenuItem.value = item;
            currentFunctionItems.value = item.functions;
            const popoverReference = (payload.target as HTMLElement)?.closest('.f-admin-menu-item');
            currentFunctionBoardReference.value = popoverReference;
            if (popoverRef.value) {
                popoverRef.value.show(popoverReference);
            }
            showPopover.value = true;
        }

        function onOpenFunction(functionItem: FunctionItem) {
            context.emit('OpenFunction', functionItem);
        }

        function renderPopoverPanel() {
            return (
                <FPopover
                    ref={popoverRef}
                    class="f-admin-function-group-popover"
                    host={popoverBoundrayRef.value}
                    placement="right-top"
                    reference={currentFunctionBoardReference.value}
                    showArrow={false}
                    visible={true}
                    onHidden={() => {
                        showPopover.value = false;
                    }}>
                    <FFunctionNavigation functionItems={currentFunctionItems.value}
                        onFunctionOpened={resetMenuItemSelectionStatus}
                        onOpenFunction={onOpenFunction}
                    ></FFunctionNavigation>
                </FPopover>
            );
        }

        function renderMenuItem({ item, index, selectedItem }) {
            return <div onClick={(payload: MouseEvent) => onClickMenuItem(payload, item)}>
                <svg class="top-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,10 A 10,10 0 0 0 10,0 L 10,10 L 0,10 Z" fill="white" />
                </svg>
                <span>{item.name}</span>
                <svg class="bottom-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,0 A 10,10 0 0 1 10,10 L 10,0 L 0,0 Z" fill="white" />
                </svg>
            </div>;
        }

        function renderMenuItems(menuGroup: MenuGroup, menuItems: any[]) {
            const menuGroupInstanceRef = menuMap.get(menuGroup.id);
            return <FListView ref={menuGroupInstanceRef} data={menuItems} customClass="f-admin-menu" itemClass="f-admin-menu-item">
                {{ content: renderMenuItem }}
            </FListView>;
        }

        function renderNavigationMenu(menuGroups: any[]) {
            return <FAccordion customClass="f-admin-menu-groups">
                {menuGroups.map((menuGroup: MenuGroup) => {
                    return <FAccordionItem customClass="f-admin-menu-group" enableFold={menuGroup.items.length > 0} iconUri={menuGroup.icon} title={menuGroup.name} onClickHeader={() => onClickMenuGroupHeader(menuGroup.id)}>
                        {menuGroup.items.length > 0 && renderMenuItems(menuGroup, menuGroup.items)}
                    </FAccordionItem>;
                })}
            </FAccordion>;
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

        function onWheel(payload: WheelEvent) {
            payload.preventDefault();
            payload.stopPropagation();

            if (showPopover.value) {
                resetMenuItemSelectionStatus();
            }

            const deltaY = ((payload as any).wheelDeltaY || payload.deltaY) / 10;
            let offsetYValue = offsetY.value + deltaY;
            const containerHeight = (navigationPanelContainerRef.value as HTMLElement).getBoundingClientRect().height;
            const navigationPanelHeight = (navigationPanelRef.value as HTMLElement).getBoundingClientRect().height;
            if (offsetYValue < containerHeight - navigationPanelHeight) {
                offsetYValue = containerHeight - navigationPanelHeight;
            }
            if (offsetYValue > topOfPostion) {
                offsetYValue = topOfPostion;
            }
            offsetY.value = offsetYValue;
        }

        onMounted(() => {
            if (navigationPanelRef.value) {
                popoverBoundrayRef.value = (navigationPanelRef.value as HTMLElement).closest('.f-admin-main');
                navigationPanelContainerRef.value = (navigationPanelRef.value as HTMLElement).closest('.f-admin-navigation');
            }
            document.body.addEventListener('click', (payload: MouseEvent) => {
                const clickingTarget = (payload.target as HTMLElement)?.closest('.f-admin-menu-item');
                if (clickingTarget && clickingTarget === currentFunctionBoardReference.value) {
                    return;
                }
                resetMenuItemSelectionStatus();
            });
        });

        return () => {
            return (
                <div class="f-admin-navigation-content" style="display:flex;flex-direction:column;">
                    <div>
                        <div class="f-admin-navigation-logo">
                            <span>{props.title}</span>
                        </div>
                        <div class="f-admin-navigation-search-bar">
                            <FSearchBox></FSearchBox>
                        </div>
                    </div>
                    <div style="flex:1;overflow:hidden;">
                        <div ref={navigationPanelRef} class="f-page-content-nav" style={navigationMenuStyle.value} onWheel={onWheel}>
                            {renderNavigationMenu(menuData.value)}
                            {showPopover.value && renderPopoverPanel()}
                        </div>
                    </div>
                </div>

            );
        };
    }
});
