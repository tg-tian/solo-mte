import FANavigation from '../navigation/navigation.component';
import FANavigationCompact from '../navigation/navigation-compact.component';
import FAContentArea from '../content-area/content-area.component';
import { ConfigOptions, FunctionInstance, UseConfig, UseFunctionInstance } from '../../composition/types';
import { useConfig } from '../../composition/use-config';
import { useFunctionInstance } from '../../composition/use-function-instance';
import { useMenuData } from '../../composition/use-menu-data';
import { useWorkAreaInstance } from '../../composition/use-work-area-instance';

import { WorkspaceProps, workspaceProps } from './workspace.props';
import innerComponentRegistry from '../component-registry';
import { computed, defineComponent, inject, onMounted, provide, ref } from 'vue';
import { FAccordion, FAccordionItem, FListView, FPopover, FSearchBox } from "@farris/ui-vue";
import { FunctionItem, MenuGroup, MenuGroupItem, UseMenuData ,WorkAreaInstance} from '../../composition/types';
import FFunctionNavigation from '../function-board/function-board.component';

export default defineComponent({
    name: 'FAppWorkspace',
    props: workspaceProps,
    emits: [],
    setup(props: WorkspaceProps, context) {
        const adminMainElementRef = ref();
        const sideBarCollapsed = ref(false);
        const title = ref();
        // 初始化Farris Admin全局配置对象
        const config = useConfig();
        // 初始化Farris Admin全局配置对象，并记录初始化异步对象，用于监听初始化完成事件
        const configInitialized = config.initialize();
        // 初始化功能菜单实例管理服务
        const useFunctionInstanceComposition = useFunctionInstance(config);

        const useWorkAreaInstanceComposition = useWorkAreaInstance();
        const { activeInstanceId, workAreaInstances, workAreaInstanceMap } = useWorkAreaInstanceComposition;

        // 初始化导航菜单数据
        const useMenuDataComposition = useMenuData();
        // 监听Farris Admin全局配置对象初始化完成事件
        configInitialized.then((result: ConfigOptions) => {
            title.value = result.title;
            useWorkAreaInstanceComposition.loadWorkAreaConfiguration(result.workAreaSourceUri);
            // useWorkAreaInstanceComposition.setResidentInstance(result.residentWorkAreas);
            // 根据配置选项设置初始状态下打开的预制菜单，默认状态下为用户工作中心首页
            // useFunctionInstanceComposition.setResidentInstance(result.residentFunctions);
            // 根据配置选项提供的功能菜单数据源Url地址生成功能菜单数据源
            useMenuDataComposition.generateFunctionMenu(result.functionSourceUri);
        });

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
            const classObject = {
                'f-admin-navigation': true,
                'f-page-content-side': true,
                'f-side-bar-collapsed': sideBarCollapsed.value,
                'f-side-bar-expanded': !sideBarCollapsed.value
            };
            return classObject;
        });

        function getWorkAreaClass(workAreaInstance: WorkAreaInstance) {
            const classObject = {
                'active': workAreaInstance.id === activeInstanceId.value,
            } as Record<string, true>;
            return classObject;
        }

        function onClickSidebarHandle() {
            sideBarCollapsed.value = !sideBarCollapsed.value;
        }

        function onActiveWorkArea(workAreaId: string) {
            if (workAreaInstanceMap.has(workAreaId)) {
                activeInstanceId.value = workAreaId;
            }
        }

        function renderSidebarHandle() {
            return <div class="f-admin-navigation-footer">
                <span class="f-admin-navigation-footer-handle" onClick={onClickSidebarHandle}>
                    <i class="f-icon f-icon-exhale-discount"></i>
                </span>
            </div>;
        }

        function renderWorkAreas() {
            return workAreaInstances.value.map((workAreaInstance: WorkAreaInstance) => {
                const workAreaInstanceRef = workAreaInstanceMap.get(workAreaInstance.id);
                if (innerComponentRegistry.has(workAreaInstance.id)) {
                    const InnerComponent = innerComponentRegistry.get(workAreaInstance.id);
                    return <InnerComponent class={getWorkAreaClass(workAreaInstance)} ref={workAreaInstanceRef}></InnerComponent>;
                }
                return <FAContentArea class={getWorkAreaClass(workAreaInstance)} ref={workAreaInstanceRef} residentFunctions={workAreaInstance.functions} showHeader={workAreaInstance.showHeader}></FAContentArea>;
            });
        }

        // 在依赖注入服务中注册功能菜单实例管理服务
        provide('f-admin-function-instance', useFunctionInstanceComposition);
        // 在依赖注入服务中注册功能菜单数据服务
        provide('f-admin-menu-data', useMenuDataComposition);

        onMounted(() => {
            // 在依赖注入服务中注册Farris Admin主框架Html元素
            provide('f-admin-main-element', adminMainElementRef.value);
        });

        return () => {
            return (
                <div class="naviagation-page">
                    <div class="f-admin f-page f-page-navigate f-page-is-listnav">
                        <div ref={adminMainElementRef} class="f-admin-main f-page-main">
                            <div class="f-page-content">

                                <div class={sideContentClass.value} style={sideContentStyle.value}>
                                    {!sideBarCollapsed.value && <FANavigation title={title.value} onActiveWorkArea={onActiveWorkArea}></FANavigation>}
                                    {sideBarCollapsed.value && <FANavigationCompact></FANavigationCompact>}

                                    {renderSidebarHandle()}
                                </div>
                                <div class="f-admin-content f-page-content-main">
                                    {renderWorkAreas()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
