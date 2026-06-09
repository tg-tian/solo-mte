import { defineComponent, inject, onMounted, provide, ref, watch } from "vue";
import { FAccordion, FAccordionItem, FButton, FLayout, FLayoutPane, FListView, F_MODAL_SERVICE_TOKEN, FPopover, FSearchBox, F_NOTIFY_SERVICE_TOKEN, FNotifyService } from "@farris/ui-vue";
import { AppDomain, AppModule, AppObject, UseAppDomain, UseWorkspace } from "../../composition/type";
import AppWizardComponent from '../wizard/app-wizard/app-wizard.component';
import CreateAppDomainComponent from './create-app-entity/create-app-domain.component';
import CreateModuleComponent from './create-app-entity/create-module.component';
import { GitService } from '../../services/git.service';

import './apps.css';

export default defineComponent({
    name: 'FAApps',
    props: {},
    emits: [],
    setup() {
        const modalService = inject(F_MODAL_SERVICE_TOKEN, null);
        const notifyService = inject(F_NOTIFY_SERVICE_TOKEN) as typeof FNotifyService;
        const gitService = new GitService(modalService, notifyService);
        provide('f-app-center-git-service', gitService);
        const useAppDomainComposition = inject('f-app-center-app-domain') as UseAppDomain;
        const useWorkspaceComposition = inject('f-app-center-workspace') as UseWorkspace;
        const { options } = useWorkspaceComposition;
        const { appDomains, appDomainMap, currentAppDomain, currentAppModule, currentAppObjects, updateAppDomain } = useAppDomainComposition;
        const appListViewRef = ref();
        const defaultAppDomainIconUrl = '';
        const appWizardComponentRef = ref();
        const createEntityPopoverRef = ref();
        const createEntityAnchorRef = ref<HTMLElement | null>(null);
        const createAppDomainComponentRef = ref();
        const createModuleComponentRef = ref();
        const modalInstanceRef = ref<any>();
        const gitPopoverRef = ref<any>();
        const gitOperations = ref<Array<{ icon: string; name: string; id: string }>>([]);
        const currentGitBoPath = ref('');

        function getActiveAppDomain() {
            return currentAppDomain.value || (appDomains.value.length ? appDomains.value[0] : null);
        }

        function ensureCurrentAppDomain() {
            const domain = getActiveAppDomain();
            if (domain && !currentAppDomain.value) {
                currentAppDomain.value = domain;
            }
        }

        function resetMenuItemSelectionStatus() {
            Array.from(appDomainMap.entries()).forEach(([appDomainId, appDomainInstanceRef]) => {
                appDomainInstanceRef.value?.clearSelection();
            });
        }

        function onClickMenuGroupHeader(appDomain: AppDomain) {
            currentAppDomain.value = appDomain;
            currentAppModule.value = appDomain.modules.length > 0 ? appDomain.modules[0] : undefined;
            currentAppObjects.value = appDomain.modules.length > 0 ? appDomain.modules[0].apps : [];
            resetMenuItemSelectionStatus();
        }

        function updateAppObjects(appDomain: AppDomain, item: AppModule) {
            currentAppDomain.value = appDomain;
            currentAppModule.value = item;
            currentAppObjects.value = item.apps;
        }

        watch(() => currentAppObjects.value, () => {
            appListViewRef.value.updateDataSource(currentAppObjects.value);
        });

        watch(() => appDomains.value, () => {
            ensureCurrentAppDomain();
        }, { immediate: true });

        function onClickMenuItem(payload: MouseEvent, appDomain: AppDomain, appModule: AppModule) {
            resetMenuItemSelectionStatus();
            updateAppObjects(appDomain, appModule);
        }

        function acceptToCreateNewApp() {
            if (appWizardComponentRef.value) {
                appWizardComponentRef.value.acceptToCreateNewApp().then(() => {
                    updateAppDomain();
                });
            }
        }

        function onClickNewApp() {
            if (!modalService) return;
            const options = {
                title: '创建应用',
                width: 540,
                buttons: [
                    { text: '取消', class: 'btn btn-secondary', handle: () => modalInstanceRef.value?.close() },
                    { text: '确定', class: 'btn btn-primary', handle: () => { acceptToCreateNewApp(); modalInstanceRef.value?.close(); } }
                ],
                render: () => <AppWizardComponent ref={appWizardComponentRef} appModule={currentAppModule.value}></AppWizardComponent>
            } as any;
            const modalRef = modalService.open(options);
            modalInstanceRef.value = modalRef?.modalRef?.value;
        }

        function onClickCreateEntityButton() {
            const anchor = createEntityAnchorRef.value;
            if (createEntityPopoverRef.value && anchor) {
                createEntityPopoverRef.value.show(anchor);
            }
        }

        function acceptToCreateAppDomain() {
            if (createAppDomainComponentRef.value) {
                createAppDomainComponentRef.value.acceptToCreate().then((success: boolean) => {
                    if (success) {
                        setTimeout(() => {
                            updateAppDomain();
                            ensureCurrentAppDomain();
                        }, 100);
                    }
                });
            }
        }

        function onClickCreateAppDomain() {
            if (!modalService) return;
            if (createEntityPopoverRef.value) {
                createEntityPopoverRef.value.hide();
            }
            const options = {
                title: '创建应用域',
                width: 540,
                buttons: [
                    { text: '取消', class: 'btn btn-secondary', handle: () => modalInstanceRef.value?.close() },
                    { text: '确定', class: 'btn btn-primary', handle: () => { acceptToCreateAppDomain(); modalInstanceRef.value?.close(); } }
                ],
                render: () => <CreateAppDomainComponent ref={createAppDomainComponentRef}></CreateAppDomainComponent>
            } as any;
            const modalRef = modalService.open(options);
            modalInstanceRef.value = modalRef?.modalRef?.value;
        }

        function acceptToCreateModule() {
            if (createModuleComponentRef.value) {
                createModuleComponentRef.value.acceptToCreate().then((result: { success: boolean; code: string; name: string }) => {
                    if (result.success) {
                        setTimeout(() => {
                            updateAppDomain();
                            // 等待数据更新后更新模块列表并选中新建的模块
                            setTimeout(() => {
                                const appDomain = getActiveAppDomain();
                                if (appDomain) {
                                    // 更新模块列表的数据源
                                    const appDomainInstanceRef = appDomainMap.get(appDomain.id);
                                    if (appDomainInstanceRef?.value) {
                                        appDomainInstanceRef.value.updateDataSource(appDomain.modules);
                                    }

                                    if (appDomain.modules.length > 0) {
                                        const newModule = appDomain.modules.find(m => m.code === result.code && m.name === result.name);
                                        if (newModule) {
                                            updateAppObjects(appDomain, newModule);
                                        } else if (appDomain.modules.length > 0) {
                                            // 如果找不到新模块，选中最后一个（新建的）
                                            const lastModule = appDomain.modules[appDomain.modules.length - 1];
                                            updateAppObjects(appDomain, lastModule);
                                        }
                                    }
                                }
                            }, 300);
                        }, 100);
                    }
                });
            }
        }

        function onClickCreateModule() {
            if (!modalService) return;
            if (createEntityPopoverRef.value) {
                createEntityPopoverRef.value.hide();
            }
            ensureCurrentAppDomain();
            const activeDomain = getActiveAppDomain();
            const options = {
                title: '创建模块',
                width: 540,
                buttons: [
                    { text: '取消', class: 'btn btn-secondary', handle: () => modalInstanceRef.value?.close() },
                    { text: '确定', class: 'btn btn-primary', handle: () => { acceptToCreateModule(); modalInstanceRef.value?.close(); } }
                ],
                render: () => <CreateModuleComponent ref={createModuleComponentRef} appDomainId={activeDomain?.id} appDomainName={activeDomain?.name}></CreateModuleComponent>
            } as any;
            const modalRef = modalService.open(options);
            modalInstanceRef.value = modalRef?.modalRef?.value;
        }

        function buildBoPath(appObject: AppObject): string {
            const domainCode = currentAppDomain.value?.code || '';
            const moduleCode = currentAppModule.value?.code || '';
            return `/${domainCode}/${moduleCode}/${appObject.code}`;
        }

        async function handleGitClick(event: MouseEvent, appObject: AppObject) {
            event.stopPropagation();
            const target = event.currentTarget as HTMLElement;
            const boPath = buildBoPath(appObject);
            currentGitBoPath.value = boPath;
            try {
                const res: any = await gitService.checkIsGitProject(boPath);
                if (res && !res.gitConfig) {
                    gitOperations.value = [];
                    if (gitPopoverRef.value) {
                        gitPopoverRef.value.hide();
                    }
                    const modalRef: any = modalService?.open({
                        title: '提示',
                        width: 420,
                        fitContent: true,
                        showHeader: false,
                        showButtons: true,
                        buttons: [
                            { text: '取消', class: 'btn btn-secondary', handle: () => modalRef?.close() },
                            { text: '确定', class: 'btn btn-primary', handle: () => { modalRef?.close(); gitService.handleRepo(); } }
                        ],
                        render: () => (
                            <div style="display: flex; align-items: center; padding: 20px;">
                                <span class="f-icon f-icon-warning" style="font-size: 26px; margin-right: 12px; color: #f0ad4e;"></span>
                                <span>系统尚未配置认证信息，请先点击【确定】按钮配置认证信息</span>
                            </div>
                        )
                    });
                } else if (res && res.exit && res.addr && res.addr === boPath) {
                    if (!res.gitUrl) {
                        gitOperations.value = gitService.getGitOperations(2);
                    } else {
                        gitOperations.value = gitService.getGitOperations(3);
                    }
                    gitPopoverRef.value?.show(target);
                } else {
                    gitOperations.value = gitService.getGitOperations(1);
                    gitPopoverRef.value?.show(target);
                }
            } catch (e: any) {
                if (gitPopoverRef.value) {
                    gitPopoverRef.value.hide();
                }
                if (e?.response?.data?.Message) {
                    notifyService.error({ message: e.response.data.Message });
                }
            }
        }

        async function handlePublishClick(event: MouseEvent, appObject: AppObject) {
            event.stopPropagation();
            const boPath = buildBoPath(appObject);
            await gitService.handlePublish(boPath);
        }

        function onGitMenuClick(gitOperation: { icon: string; name: string; id: string }) {
            if (gitPopoverRef.value) {
                gitPopoverRef.value.hide();
            }
            gitService.handleGitOperation(gitOperation, currentGitBoPath.value);
        }

        function renderCreateEntityPopover() {
            return (
                <FPopover
                    ref={createEntityPopoverRef}
                    placement="right"
                    showArrow={false}
                    visible={false}>
                    <div class="f-create-entity-menu">
                        <div class="f-create-entity-menu-item" onClick={onClickCreateAppDomain}>创建应用域</div>
                        <div class="f-create-entity-menu-item" onClick={onClickCreateModule}>创建模块</div>
                    </div>
                </FPopover>
            );
        }

        function renderGitPopover() {
            return (
                <FPopover
                    ref={gitPopoverRef}
                    placement="auto"
                    showArrow={false}
                    visible={false}>
                    <div class="f-git-menu">
                        {gitOperations.value.map(op => (
                            <div class="f-git-menu-item" onClick={() => onGitMenuClick(op)}>
                                <span class="f-git-menu-item-icon">{op.icon}</span>
                                <span>{op.name}</span>
                            </div>
                        ))}
                    </div>
                </FPopover>
            );
        }

        function renderAppModule(appDomain: AppDomain, { item, index, selectedItem }) {
            return <div onClick={(payload: MouseEvent) => onClickMenuItem(payload, appDomain, item)}>
                <span>{item.name}</span>
            </div>;
        }

        function renderAppModules(appDomain: AppDomain, appModules: AppModule[]) {
            const appDomainInstanceRef = appDomainMap.get(appDomain.id);
            return <FListView key={`modules-${appDomain.id}`} ref={appDomainInstanceRef} data={appModules} customClass="f-admin-app-module-list" itemClass="f-admin-app-module-list-item">
                {{
                    content: ({ item, index, selectedItem }) => renderAppModule(appDomain, { item, index, selectedItem }),
                    empty: () => <div class="f-admin-app-module-list-empty">暂无模块</div>
                }}
            </FListView>;
        }

        function renderAppDomainNavigation() {
            return <FAccordion customClass="f-admin-app-domain-groups">
                {appDomains.value.map((appDomain: AppDomain) => {
                    const isSelected = currentAppDomain.value?.id === appDomain.id;
                    const customClass = `f-admin-app-domain${isSelected ? ' f-admin-app-domain-selected' : ''}`;
                    return <FAccordionItem key={appDomain.id} customClass={customClass} iconUri={defaultAppDomainIconUrl} title={appDomain.name} onClickHeader={() => onClickMenuGroupHeader(appDomain)}>
                        {renderAppModules(appDomain, appDomain.modules)}
                    </FAccordionItem>;
                })}
            </FAccordion>;
        }

        function renderLeftPanel() {
            return (
                <div class="f-admin-app-center-left-panel">
                    {renderAppDomainNavigation()}
                    <div class="f-admin-create-entity-bar" ref={createEntityAnchorRef}>
                        <FButton onClick={onClickCreateEntityButton}>新建</FButton>
                    </div>
                    {renderCreateEntityPopover()}
                </div>
            );
        }

        function renderAppsListHeader() {
            return (
                <div class="f-admin-apps-list-header">
                    <span class="f-admin-apps-bread-crumbs">
                        <span class="f-admin-app-domain-title">{currentAppDomain.value?.name}</span>
                        <span class="f-admin-app-title-splitter">/</span>
                        <span class="f-admin-app-module-title">{currentAppModule.value?.name}</span>
                    </span>
                    <div class="f-admin-apps-search-bar">
                        <FSearchBox></FSearchBox>
                    </div>
                    <div class="f-admin-apps-tool-bar">
                        <FButton style="float:right" onClick={onClickNewApp}>新建应用</FButton>
                    </div>
                </div>
            );
        }

        function getIconColor(item: Record<string, any>, index: number) {
            const colorMap = new Map<number, string>([[0, '#4D98FF'], [1, '#FF7B51'], [2, '#B59EFF'], [3, '#30c87b']]);
            const colorIndex = index % 4;
            return { '--bg': colorMap.get(colorIndex) };
        }

        function onClickAppCard(appObject: AppObject) {
            const appPath = `/${currentAppDomain.value.code}/${currentAppModule.value.code}/${appObject.code}`;
            const appUri = `/apps/platform/development-platform/ide/app-builder/index.html?path=${appPath}&boId=${appObject.id}&ws=${options.id}&version=2.0#/home`;
            // todo: 参考上面的appUri格式，给下面的appUri传递path,boId,ws等参数，并且在app-builder中实现接收以上参数的逻辑，然后将接收到的参数传递给usePages。
            // const appUri = '/apps/platform/development-platform/ide/app-builder/index.html';
            window.open(appUri);
        }

        function renderAppCard({ item, index, selectedItem }) {
            return (
                <div class="f-app-card f-template-card-row" onClick={() => onClickAppCard(item)}>
                    <div class="f-app-card-header listview-item-content">
                        <div class="listview-item-icon" style={getIconColor(item, index)}>
                            <i class="f-icon f-icon-engineering"></i>
                        </div>
                        <div class="listview-item-main">
                            <h4 class="listview-item-title">{item.name}</h4>
                            <h5 class="listview-item-subtitle">{item.code}</h5>
                        </div>
                        <span class="bage f-app-favor"><i class="f-icon f-icon-star"></i></span>
                    </div>
                    <div class="f-app-card-footer f-btn-group" onClick={(e: MouseEvent) => e.stopPropagation()}>
                        <div class="f-app-card-git-btn" onClick={(e: MouseEvent) => handleGitClick(e, item)}>
                            <i class="f-icon f-icon-home-operation"></i>
                        </div>
                        <div class="f-app-card-publish-btn" onClick={(e: MouseEvent) => handlePublishClick(e, item)}>发布</div>
                    </div>
                </div>
            );
        }

        onMounted(() => {
            // if (appDomains.value.length && appDomains.value[0].modules.length) {
            //     updateAppObjects(appDomains.value[0], appDomains.value[0].modules[0]);
            // }
        });

        return () => {
            return (
                <FLayout>
                    <FLayoutPane position="left" minWidth={300}>
                        {renderLeftPanel()}
                    </FLayoutPane>
                    <FLayoutPane customClass="f-admin-app-center-content" position="center">
                        <FListView ref={appListViewRef} customClass="f-admin-apps-list f-utils-fill-flex-column" data={currentAppObjects.value} header="ContentHeader" view="CardView">
                            {{
                                header: renderAppsListHeader,
                                content: renderAppCard,
                                empty: () => <div class="f-admin-apps-list-empty">暂无应用，请点击「新建应用」创建</div>
                            }}
                        </FListView>
                        {renderGitPopover()}
                    </FLayoutPane>
                </FLayout>
            );
        };
    }
});
