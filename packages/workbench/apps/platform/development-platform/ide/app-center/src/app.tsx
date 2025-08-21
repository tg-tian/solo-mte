import { computed, defineComponent, provide, ref } from "vue";
import FApps from './components/apps/apps.component';
import FWelcome from './components/welcome/welcome.component';
import { FNav } from '@farris/ui-vue/components';
import { useAppDomain } from "./composition/use-app-domain";
import { useAppConfig } from "./composition/use-app-config";
import { AppConfigOptions } from "./composition/type";

import './style.css';

export default defineComponent({
    name: 'FAAppCenter',
    setup() {
        const title = "inBuilder Community";
        const workspace = ref('ws-Sagi-01');
        const currentUserName = ref('Sagi');
        const currentView = ref('start');
        const navData = [
            { id: 'start', text: '开始' },
            { id: 'my-apps', text: '我的应用' }
        ];

        // 初始化Farris Admin全局配置对象
        const config = useAppConfig();
        // 初始化Farris Admin全局配置对象，并记录初始化异步对象，用于监听初始化完成事件
        const configInitialized = config.initialize();
        // 初始化导航菜单数据
        const useAppDomainComposition = useAppDomain();
        // 监听Farris Admin全局配置对象初始化完成事件
        configInitialized.then((result: AppConfigOptions) => {
            useAppDomainComposition.setAppDomainSourceUri(result.appDataSourceUri);
            // 根据配置选项提供的功能菜单数据源Url地址生成功能菜单数据源
            useAppDomainComposition.generateAppDomain(result.appDataSourceUri);
        });

        const shouldShowWelcome = computed(() => currentView.value === 'start');
        const shouldShowAppsView = computed(() => currentView.value === 'my-apps');

        function renderTitleArea() {
            return <div class="f-title">
                <div class="f-title-logo"></div>
                <h4 class="f-title-text">{title}</h4>
            </div>;
        }

        function onClickNavigationItem(navItem: Record<string, any>) {
            currentView.value = navItem.id;
        }

        function renderHeaderTabs() {
            return <div class="f-content">
                <FNav activeNavId={currentView.value} navData={navData} displayField="text" onNav={onClickNavigationItem}></FNav>
            </div>;
        }

        // 在依赖注入服务中应用程序域服务
        provide('f-app-center-app-domain', useAppDomainComposition);

        function renderToolbar() {
            return <div class="f-header-toolbar">
                <ul class="nav d-flex items-center">
                    <li class="f-app-center-workspace">{workspace.value}<span class="f-icon f-icon-arrow-s"></span></li>
                    <li class="f-app-center-toolbar-split" style="height: 20px;border-right: 1px solid #ccc;"></li>
                    <li class="f-app-center-user">
                        <div class="f-app-center-user-icon">
                            <i class="f-icon f-icon-top_my"></i>
                        </div>
                        <span class="f-app-center-user-name">{currentUserName.value}</span>
                    </li>
                </ul>
            </div>;
        }

        return () => {
            return (
                <div class="f-page f-page-navigate f-admin-app-center">
                    <div class="f-page-header" >
                        <nav class="f-page-header-base">
                            {renderTitleArea()}
                            {renderHeaderTabs()}
                            {renderToolbar()}
                        </nav>
                    </div>
                    <div class="f-page-main">
                        {shouldShowWelcome.value && <FWelcome></FWelcome>}
                        {shouldShowAppsView.value && <FApps></FApps>}
                    </div>
                </div>
            );
        };
    }
});
