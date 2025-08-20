import { computed, defineComponent, inject, nextTick, onMounted, ref } from 'vue';
import { FListView, FPopover } from '@farris/ui-vue/components';
import { NavigationProps, navigationProps } from './navigation.props';
import FFunctionNavigation from '../function-board/function-board.component';
import { FunctionItem, MenuGroup, MenuGroupItem, UseMenuData } from '../../composition/types';

import './navigation.css';

export default defineComponent({
    name: 'Vertical Navigation Compact',
    props: navigationProps,
    emits: ['OpenFunction'],
    setup(props: NavigationProps, context) {
        const useMenuDataComposition = inject('f-admin-menu-data') as UseMenuData;
        const { menuData, menuMap } = useMenuDataComposition;
        const navigationPanelRef = ref();
        const navigationPanelContainerRef = ref();
        const popoverRef = ref();
        const popoverBoundrayRef = ref();
        const showPopover = ref(false);
        const currentMenuItem = ref<any>({});
        const currentMenuGroupItems = ref<MenuGroupItem[]>([]);
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
                showPopover.value = false;
            }
        }

        function onClickMenuGroup(payload: MouseEvent, item: MenuGroup) {
            resetMenuItemSelectionStatus();
            currentMenuItem.value = item;
            const popoverReference = (payload.target as HTMLElement)?.closest('.f-admin-menu-item');
            currentFunctionBoardReference.value = popoverReference;
            const functionItems = [];
            item.items.reduce((functions: FunctionItem[], menuItem: MenuGroupItem) => {
                menuItem.functions.forEach((functionItem: FunctionItem) => functions.push(functionItem));
                return functions;
            }, functionItems);
            currentFunctionItems.value = functionItems;
            const defaultMenuItem = {
                id: 'all',
                code: 'all',
                name: '全部',
                menuPath: '',
                functions: functionItems,
                functionGroups: []
            };
            currentMenuGroupItems.value = [defaultMenuItem, ...item.items];
            if (item.items.length) {
                nextTick(() => {
                    if (popoverRef.value) {
                        popoverRef.value.show(popoverReference);
                    }
                    showPopover.value = true;
                });
            }
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
                    <FFunctionNavigation
                        functionItems={currentFunctionItems.value}
                        menuItems={currentMenuGroupItems.value}
                        onFunctionOpened={resetMenuItemSelectionStatus}
                        onOpenFunction={onOpenFunction}
                    ></FFunctionNavigation>
                </FPopover>
            );
        }

        const navigationMenuStyle = computed(() => {
            return {
                'z-index': '0',
                'transition': 'width.3s',
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

        function renderMenuGroup({ item, index, selectedItem }) {
            return <div onClick={(payload: MouseEvent) => onClickMenuGroup(payload, item)}>
                <svg class="top-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,10 A 10,10 0 0 0 10,0 L 10,10 L 0,10 Z" fill="white" />
                </svg>
                <span class="f-admin-menu-group-icon" title={item.name}>
                    <img title={item.name} src={item.icon}></img>
                </span>
                <svg class="bottom-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,0 A 10,10 0 0 1 10,10 L 10,0 L 0,0 Z" fill="white" />
                </svg>
            </div>;
        }

        return () => {
            return (
                <div class="f-admin-navigation-content">
                    <div class="f-admin-navigation-logo" style="display:flex">
                        <span style="margin: 0 auto">FA</span>
                    </div>
                    <div class="f-admin-navigation-search-bar">
                        <span class="search-handle">
                            <i class="f-icon f-icon-search"></i>
                        </span>
                    </div>
                    <div ref={navigationPanelRef} class="f-page-content-nav f-admin-menu-groups" style={navigationMenuStyle.value} onWheel={onWheel}>
                        <FListView data={menuData.value} customClass="f-admin-menu" itemClass="f-admin-menu-item">
                            {{ content: renderMenuGroup }}
                        </FListView>
                        {showPopover.value && renderPopoverPanel()}
                    </div>
                </div>
            );
        };
    }
});
