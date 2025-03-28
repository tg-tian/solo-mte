import { computed, defineComponent, onMounted, provide, ref } from 'vue';
import FANavigation from '../navigation/navigation.component';
import FANavigationCompact from '../navigation/navigation-compact.component';
import FAContentArea from '../content-area/content-area.component';
import { ConfigOptions } from '../../composition/types';
import { useConfig } from '../../composition/use-config';
import { useFunctionInstance } from '../../composition/use-function-instance';
import { useMenuData } from '../../composition/use-menu-data';

import './frame.css';

export default defineComponent({
    name: 'FAFrame',
    emits: [],
    setup() {
        const adminMainElementRef = ref();
        const sideBarCollapsed = ref(false);
        // 初始化Farris Admin全局配置对象
        const config = useConfig();
        // 初始化Farris Admin全局配置对象，并记录初始化异步对象，用于监听初始化完成事件
        const configInitialized = config.initialize();
        // 初始化功能菜单实例管理服务
        const useFunctionInstanceComposition = useFunctionInstance(config);
        // 初始化导航菜单数据
        const useMenuDataComposition = useMenuData();
        // 监听Farris Admin全局配置对象初始化完成事件
        configInitialized.then((result: ConfigOptions) => {
            // 根据配置选项设置初始状态下打开的预制菜单，默认状态下为用户工作中心首页
            useFunctionInstanceComposition.setResidentInstance(result.residentFunctions);
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

        function onClickSidebarHandle() {
            sideBarCollapsed.value = !sideBarCollapsed.value;
        }

        function renderSidebarHandle() {
            return <div class="f-admin-navigation-footer">
                <span class="f-admin-navigation-footer-handle" onClick={onClickSidebarHandle}>
                    <i class="f-icon f-icon-exhale-discount"></i>
                </span>
            </div>;
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
                                    {!sideBarCollapsed.value && <FANavigation></FANavigation>}
                                    {sideBarCollapsed.value && <FANavigationCompact></FANavigationCompact>}
                                    {renderSidebarHandle()}
                                </div>
                                <div class="f-admin-content f-page-content-main">
                                    <FAContentArea></FAContentArea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };
    }
});
