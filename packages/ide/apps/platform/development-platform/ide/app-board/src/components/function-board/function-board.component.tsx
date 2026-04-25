import { defineComponent, inject, ref, computed, nextTick, watch } from "vue";
import { functionBoardProps } from "./function-board.props";
import { FunctionGroup, MenuGroup, MenuGroupItem, UseMenuData } from "../../composition/types";
import { FListView } from "@farris/ui-vue";

export default defineComponent({
    name: "FunctionBoard",
    props: functionBoardProps,
    emits: ["update:modelValue", "OpenFunction", "FunctionOpened", "ActiveWorkArea"],
    setup(props, context) {
        const useMenuDataComposition = inject('f-admin-menu-data') as UseMenuData;
        const { menuData } = useMenuDataComposition;

        type FlattenFunctionGroup = FunctionGroup & {
            menuGroupItemName: string;
            menuGroupItemId: string;
        };
        type FunctionBoardNavItem = {
            id: string;
            text: string;
            name?: string;
        };

        // 记录功能列表元素
        const functionListViewRef = ref();
        // 记录功能列表包装元素，
        const functionListViewWrapperRef = ref();
        // 记录功能列表上层容器元素，与上面的功能列表包装元素配合，使用二者的高度差实现translate滚动条
        const functionListViewContainerRef = ref();
        // 功能菜单数据
        const currentFunctionItems = ref<FlattenFunctionGroup[]>([]);
        // 功能菜单中记录菜单分组的字段
        const group = { enable: true, groupFields: ['menuGroupItemName'] };
        // 功能面板上，用于导航功能菜单的分组。当使用收起导航面板的精简模式时，会使用此导航数据

        const activeFunctionNavId = ref("");

        const functionBoardNavData = computed((): FunctionBoardNavItem[] => {
            return (menuData.value || []).map((menuGroup) => {
                return {
                    id: menuGroup.id,
                    text: menuGroup.name,
                    name: menuGroup.name,
                };
            });
        });

        const topOfPostion = 0;
        // 记录菜单列的滚动偏移量，用于实现下方的滚动效果
        const offsetY = ref(0);

        const functionGroupsStyle = computed(() => {
            return {
                'display': 'flex',
                'transform': `translateY(${offsetY.value}px)`
            };
        });

        function syncFunctionListDataSource() {
            nextTick(() => {
                functionListViewRef.value?.updateDataSource(currentFunctionItems.value);
            });
        }

        function flattenFunctionGroups(menuItems: MenuGroupItem[]): FlattenFunctionGroup[] {
            return menuItems.reduce((results: FlattenFunctionGroup[], menuGroupItem: MenuGroupItem) => {
                const groups = menuGroupItem.functionGroups || [];
                const mappedGroups = groups.map((functionGroup) => {
                    return {
                        ...functionGroup,
                        menuGroupItemName: menuGroupItem.name,
                        menuGroupItemId: menuGroupItem.id,
                    } as FlattenFunctionGroup;
                });
                results.push(...mappedGroups);
                return results;
            }, []);
        }

        function loadFunctionGroupsByMenuGroup(menuGroup: MenuGroup) {
            activeFunctionNavId.value = menuGroup.id;
            currentFunctionItems.value = flattenFunctionGroups(menuGroup.items || []);
            syncFunctionListDataSource();
        }

        function onClickFunctionGroupNavigation(navItem: FunctionBoardNavItem | string) {
            const navId = typeof navItem === 'string' ? navItem : navItem?.id;
            const focusedMenuGroup = menuData.value.find((menuGroup) => menuGroup.id === navId);
            if (!focusedMenuGroup) {
                return;
            }
            loadFunctionGroupsByMenuGroup(focusedMenuGroup);
        }

        function onClickFunctionItem(functionGroup: FunctionGroup) {
            const previewPageUrl = new URL("/apps/platform/development-platform/ide/app-view/index.html", window.location.origin);
            previewPageUrl.searchParams.set("appId", functionGroup.id);
            window.open(previewPageUrl.toString(), "_blank", "noopener,noreferrer");
        }

        function onClickFunctionGroupItem(functionGroup: FlattenFunctionGroup) {
            onClickFunctionItem(functionGroup as unknown as FunctionGroup);
        }

        function renderMenuItemsNavigation() {
            return <div class="f-admin-function-board-menu-items">
                <div class="f-admin-function-board-tabs" role="tablist" aria-label="功能分组页签">
                    {functionBoardNavData.value.map((navItem) => {
                        const isActive = navItem.id === activeFunctionNavId.value;
                        return <button
                            key={navItem.id}
                            type="button"
                            role="tab"
                            class={["f-admin-function-board-tab", { "is-active": isActive }]}
                            onClick={() => onClickFunctionGroupNavigation(navItem)}
                        >
                            <span class="f-admin-function-board-tab-text">{navItem.text}</span>
                        </button>;
                    })}
                </div>
            </div>;
        }

        function renderFunctionGroupHeader({ item, index, selectedItem }) {
            return <div class="f-admin-function-group">
                <div class="f-admin-function-group-icon"><i class="f-icon f-icon-paste-plain-text"></i></div>
                <div class="f-admin-function-group-text">
                    <span class="f-admin-function-group-title">{item.value}</span>
                </div>
            </div>;
        }

        function renderFunctionItem({ item, index, selectedItem }) {
            return <div class="f-admin-function-item" onClick={() => onClickFunctionGroupItem(item)}>
                <span class="f-admin-function-item-title">{item.name}</span>
            </div>;
        }

        function onWheel(payload: WheelEvent) {
            payload.preventDefault();
            payload.stopPropagation();

            const deltaY = ((payload as any).wheelDeltaY || payload.deltaY) / 10;
            let offsetYValue = offsetY.value + deltaY;
            // 提取功能列表容器高度
            const containerHeight = (functionListViewContainerRef.value as HTMLElement).getBoundingClientRect().height;
            // 提取功能列表包装容器高度
            const navigationPanelHeight = (functionListViewWrapperRef.value as HTMLElement).getBoundingClientRect().height;
            // 计算二者的差值，获得滚动条偏移量
            if (offsetYValue < containerHeight - navigationPanelHeight) {
                offsetYValue = containerHeight - navigationPanelHeight;
            }
            // 修正偏移量，向下滚动列表时，只可以滚动只列表顶部边界
            if (offsetYValue > topOfPostion) {
                offsetYValue = topOfPostion;
            }
            offsetY.value = offsetYValue;
        }
        watch(menuData, (latestMenuGroups: MenuGroup[]) => {
            if (!latestMenuGroups?.length) {
                currentFunctionItems.value = [];
                activeFunctionNavId.value = "";
                syncFunctionListDataSource();
                return;
            }
            const focusedMenuGroup = latestMenuGroups.find((menuGroup) => menuGroup.id === activeFunctionNavId.value) || latestMenuGroups[0];
            loadFunctionGroupsByMenuGroup(focusedMenuGroup);
        }, { immediate: true });
        function renderFunctionItems() {
            return <div ref={functionListViewWrapperRef} style={functionGroupsStyle.value} onWheel={onWheel}>
                <FListView ref={functionListViewRef} data={currentFunctionItems.value} group={group} view="CardView" customClass="f-admin-function-groups">
                    {{
                        content: renderFunctionItem,
                        group: renderFunctionGroupHeader
                    }}
                </FListView>
            </div>;
        }

        return () => {
            return (
                <div class={["f-chat-function-board", { hidden: !props.modelValue }]}>
                    <div class="f-admin-function-board">
                        {renderMenuItemsNavigation()}
                        <div class="f-admin-function-board-content" ref={functionListViewContainerRef}>
                            {renderFunctionItems()}
                        </div>
                    </div>
                </div>

            );
        };
    },
});
