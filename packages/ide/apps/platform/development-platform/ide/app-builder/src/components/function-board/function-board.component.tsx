import { computed, defineComponent, inject, ref, watch } from 'vue';
import { FListView, FNav } from '@farris/ui-vue';
import { FunctionBoardProps, functionBoardProps } from './function-board.props';
import { FunctionItem, MenuGroupItem, UseFunctionInstance } from '../../composition/types';

import './function-board.css';

export default defineComponent({
    name: 'FAFunctionBoard',
    props: functionBoardProps,
    emits: ['FunctionOpened', 'OpenFunction'],
    setup(props: FunctionBoardProps, context) {
        // 记录功能列表元素
        const functionListViewRef = ref();
        // 记录功能列表包装元素，
        const functionListViewWrapperRef = ref();
        // 记录功能列表上层容器元素，与上面的功能列表包装元素配合，使用二者的高度差实现translate滚动条
        const functionListViewContainerRef = ref();
        // 功能菜单数据
        const functionItems = ref<FunctionItem[]>(props.functionItems || []);
        // 功能菜单中记录菜单分组的字段
        const group = { enable: true, groupFields: ['category'] };
        // 功能面板上，用于导航功能菜单的分组。当使用收起导航面板的精简模式时，会使用此导航数据
        const menutItems = ref<MenuGroupItem[]>(props.menuItems || []);
        // 通过依赖注入获取在框架主页面创建功能菜单实例管理服务
        const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
        // 提前打开菜单方法
        const { open } = useFunctionInstanceComposition;

        const shouldShowMenuItems = computed(() => props.menuItems && props.menuItems.length > 0);
        const topOfPostion = 0;
        // 记录菜单列的滚动偏移量，用于实现下方的滚动效果
        const offsetY = ref(0);

        const functionGroupsStyle = computed(() => {
            return {
                'display': 'flex',
                'transform': `translateY(${offsetY.value}px)`
            };
        });

        watch(() => props.functionItems, (latestFunctionItems: FunctionItem[]) => {
            functionItems.value = latestFunctionItems;
            functionListViewRef.value?.updateDataSource(functionItems.value);
        });

        function onClickMenuItemNavigation(menuItem: MenuGroupItem) {
            functionItems.value = menuItem.functions;
            functionListViewRef.value.updateDataSource(functionItems.value);
        }

        function onClickFunctionItem(functionItem: FunctionItem) {
            // open(functionItem);
            context.emit('OpenFunction', functionItem);
            context.emit('FunctionOpened');
        }

        function renderMenuItemsNavigation() {
            return <div class="f-admin-function-board-menu-items">
                <FNav activeNavId="all" navData={menutItems.value} displayField="name" onNav={onClickMenuItemNavigation}></FNav>
            </div>;
        }

        function renderFunctionGroupHeader({ item, index, selectedItem }) {
            return <div class="f-admin-function-group">
                <div class="f-admin-function-group-icon"><i class="f-icon f-icon-paste-plain-text"></i></div>
                <span>{item.value}</span>
            </div>;
        }

        function renderFunctionItem({ item, index, selectedItem }) {
            return <div class="f-admin-function-item" onClick={() => onClickFunctionItem(item)}>
                <span>{item.name}</span>
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

        function renderFunctionItems() {
            return <div ref={functionListViewWrapperRef} style={functionGroupsStyle.value} onWheel={onWheel}>
                <FListView ref={functionListViewRef} data={functionItems.value} group={group} view="CardView" customClass="f-admin-function-groups">
                    {{
                        content: renderFunctionItem,
                        group: renderFunctionGroupHeader
                    }}
                </FListView>
            </div>;
        }

        return () => {
            return (
                <div class="f-admin-function-board">
                    {shouldShowMenuItems.value && renderMenuItemsNavigation()}
                    <div class="f-admin-function-board-content" ref={functionListViewContainerRef}>
                        {renderFunctionItems()}
                    </div>
                </div>
            );
        };
    }
});
