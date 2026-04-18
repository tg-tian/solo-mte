import { watch } from 'vue';
import { nextTick } from 'vue';
import FANavigation from '../navigation/navigation.component';
import FANavigationCompact from '../navigation/navigation-compact.component';
import FAContentArea from '../content-area/content-area.component';
import { ConfigOptions, FunctionInstance, UseConfig, UseFunctionInstance, WorkspaceOptions } from '../../composition/types';
import { useConfig } from '../../composition/use-config';
import { useFunctionInstance } from '../../composition/use-function-instance';
import { useMenuData } from '../../composition/use-menu-data';
import { useWorkAreaInstance } from '../../composition/use-work-area-instance';

import { WorkspaceProps, workspaceProps } from './workspace.props';
import innerComponentRegistry from '../component-registry';
import { computed, defineAsyncComponent, defineComponent, inject, onMounted, provide, ref } from 'vue';
import { FAccordion, FAccordionItem, FListView, FPopover, FSearchBox, FNav } from "@farris/ui-vue";
import { FunctionItem, MenuGroup, MenuGroupItem, UseMenuData, WorkAreaInstance, UserInfo } from '../../composition/types';
import FFunctionNavigation from '../function-board/function-board.component';
import { useWorkspace } from '../../composition/use-workspace';
import { useIde } from '../../composition/use-ide';
import { useIntelligentAssistant } from '../assistant/use-intelligent-assistant';
import { useAssistantIcon } from '../assistant/use-assistant-icon';
import { useUserInfo } from '../../composition/use-user-info';
const loadCodeEditorComponent = () => import('../code-editor/code-editor.component');
const FAppCodeEditor = defineAsyncComponent(loadCodeEditorComponent);
let codeEditorPreloadPromise: Promise<void> | null = null;

export default defineComponent({
    name: 'FAppWorkspace',
    props: workspaceProps,
    emits: [],
    setup(props: WorkspaceProps, context) {
        const adminMainElementRef = ref();
        const sideBarCollapsed = ref(false);
        const currentUserName = ref('');
        const currentUserAvatar = ref('');
        const currentView = ref('Designer');
        const hasCodeEditorMounted = ref(false);
        const codeEditorInitPending = ref(false);
        const currentAppLocation = ref('');
        const navData = [
            { id: 'Designer', text: '设计', icon: 'f-icon f-icon-perspective_view' },
            { id: 'CodeEditor', text: '代码', icon: 'f-icon f-icon-code' },
        ];
        const codeEditorRef = ref<{ initializeVSCode?: (rootDir: string) => void | Promise<void> }>();

        function preloadCodeEditorResources() {
            if (!codeEditorPreloadPromise) {
                codeEditorPreloadPromise = loadCodeEditorComponent()
                    .then((module) => module.preloadVSCodeResources?.())
                    .catch((error) => {
                        console.warn('代码编辑器预加载失败:', error);
                    });
            }
            return codeEditorPreloadPromise;
        }

        function scheduleCodeEditorPreload() {
            const runner = () => {
                preloadCodeEditorResources();
            };
            if ('requestIdleCallback' in window) {
                (window as Window & {
                    requestIdleCallback: (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
                }).requestIdleCallback(() => runner(), { timeout: 2000 });
                return;
            }
            window.setTimeout(runner, 1200);
        }

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
            // title.value = result.title;
            useWorkAreaInstanceComposition.loadWorkAreaConfiguration(result.workAreaSourceUri);
            // useWorkAreaInstanceComposition.setResidentInstance(result.residentWorkAreas);
            // 根据配置选项设置初始状态下打开的预制菜单，默认状态下为用户工作中心首页
            // useFunctionInstanceComposition.setResidentInstance(result.residentFunctions);
            // 根据配置选项提供的功能菜单数据源Url地址生成功能菜单数据源
            useMenuDataComposition.generateFunctionMenu(result.functionSourceUri);
        });

        const useWorkspaceComposition = useWorkspace(useFunctionInstanceComposition);
        const useIdeComposition = useIde(useWorkspaceComposition);
        const useAssistantIconComposition = useAssistantIcon();
        const useIntelligentAssistantComposition = useIntelligentAssistant();
        provide('f-admin-ide', useIdeComposition);
        const { options } = useWorkspaceComposition;
        const workspaceInitialized = useWorkspaceComposition.initialize();
        workspaceInitialized.then((result: WorkspaceOptions) => {
            title.value = result.appName;
            currentAppLocation.value = `${result.location}${result.path}`;
        });
        const useUserInfoComposition = useUserInfo();
        const userInfoInitialized = useUserInfoComposition.initialize();
        userInfoInitialized.then((result: UserInfo) => {
            currentUserName.value = result.name;
            currentUserAvatar.value = result.userSetting.imgblob;
        });

        const shouldShowDesigner = computed(() => {
            return currentView.value === 'Designer';
        });

        const shouldShowCodeEditor = computed(() => {
            return currentView.value === 'CodeEditor';
        });
        const codeEditorStyle = computed(() => {
            return {
                display: shouldShowDesigner.value ? 'none' : 'flex'
            };
        });
        const designerStyle = computed(() => {
            return {
                display: shouldShowCodeEditor.value ? 'none' : 'flex'
            };
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

        provide('f-admin-workspace', useWorkspaceComposition);

        onMounted(() => {
            useAssistantIconComposition.init();
            useIntelligentAssistantComposition.init();
            // 在依赖注入服务中注册Farris Admin主框架Html元素
            provide('f-admin-main-element', adminMainElementRef.value);
            provide('f-admin-config', config);
            scheduleCodeEditorPreload();
        });

        function scheduleCodeEditorInit() {
            codeEditorInitPending.value = true;
            nextTick(() => {
                requestAnimationFrame(() => {
                    const initializeVSCode = codeEditorRef.value?.initializeVSCode;
                    if (!initializeVSCode || !shouldShowCodeEditor.value) {
                        return;
                    }
                    const rootDir = currentAppLocation.value || useWorkspaceComposition.options.path;
                    initializeVSCode(rootDir);
                    codeEditorInitPending.value = false;
                });
            });
        }

        // 默认已是 CodeEditor 时，watch 不会因「从未变为 true」而触发，必须在挂载后主动初始化一次
        onMounted(() => {
            if (shouldShowCodeEditor.value) {
                hasCodeEditorMounted.value = true;
                scheduleCodeEditorInit();
            }
        });

        watch(shouldShowCodeEditor, (show) => {
            if (show) {
                preloadCodeEditorResources();
                hasCodeEditorMounted.value = true;
                scheduleCodeEditorInit();
            }
        });

        // 异步组件首次挂载后再补一次初始化，避免首轮调度时 ref 尚未就绪
        watch(codeEditorRef, (editorRef) => {
            if (editorRef && codeEditorInitPending.value && shouldShowCodeEditor.value) {
                scheduleCodeEditorInit();
            }
        });

        function onClickNavigationItem(navItem: Record<string, any>) {
            currentView.value = navItem.id;
        }

        function renderCodeEditor() {
            if (!hasCodeEditorMounted.value) {
                return null;
            }
            return <FAppCodeEditor ref={codeEditorRef} rootDir={useWorkspaceComposition.options.path} style={codeEditorStyle.value}></FAppCodeEditor>;
        }

        function renderDesigner() {
            return <div ref={adminMainElementRef} class="f-admin-main f-page-main" style={designerStyle.value}>
                <div class="f-page-content">
                    <div class={sideContentClass.value} style={sideContentStyle.value}>
                        {!sideBarCollapsed.value && <FANavigation title="" onActiveWorkArea={onActiveWorkArea}></FANavigation>}
                        {sideBarCollapsed.value && <FANavigationCompact></FANavigationCompact>}
                        {renderSidebarHandle()}
                    </div>
                    <div class="f-admin-content f-page-content-main">
                        {renderWorkAreas()}
                    </div>
                </div>
            </div>
        }

        function renderTitleArea() {
            return <div class="f-title">
                <div class="f-title-logo"></div>
                <h4 class="f-title-text">{title.value}</h4>
            </div>;
        }

        function renderHeaderTabs() {
            return <div class="f-content">
                <FNav activeNavId={currentView.value} navData={navData} displayField="text" onNav={onClickNavigationItem}></FNav>
            </div>;
        }

        function renderToolbar() {
            return <div class="f-header-toolbar">
                <ul class="nav d-flex items-center">
                    <li class="f-app-builder-toolbar-split"></li>
                    <li class="f-app-builder-user">
                        <div class="f-app-builder-user-icon">
                            <img alt="user avatar" id="frame_user_smallpic" src={currentUserAvatar.value}></img>
                        </div>
                        <span class="f-app-builder-user-name">{currentUserName.value}</span>
                    </li>
                </ul>
            </div>;
        }

        return () => {
            return (
                <div class="naviagation-page">
                    <div class="f-admin f-page f-page-navigate f-page-is-listnav">
                        <div class="f-page-header" >
                            <nav class="f-page-header-base">
                                {renderTitleArea()}
                                {renderHeaderTabs()}
                                {renderToolbar()}
                            </nav>
                        </div>
                        {renderDesigner()}
                        {renderCodeEditor()}
                    </div>
                </div>
            );
        };
    }
});
