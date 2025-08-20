import { defineComponent, inject, onMounted, Ref, ref, watch } from "vue";
import { FAccordion, FAccordionItem, FButton, FLayout, FLayoutPane, FListView, FModalService, FSearchBox } from "@farris/ui-vue/components";
import { AppDomain, AppModule, AppObject, UseAppDomain } from "../../composition/type";
import AppWizardComponent from '../wizard/app-wizard/app-wizard.component';

import './apps.css';

export default defineComponent({
    name: 'FAApps',
    props: {},
    emits: [],
    setup() {
        const useAppDomainComposition = inject('f-app-center-app-domain') as UseAppDomain;
        const { appDomains, appDomainMap, currentAppDomain, currentAppModule, currentAppObjects, updateAppDomain } = useAppDomainComposition;
        const appListViewRef = ref();
        // const currentAppDomain = ref();
        // const currentAppModule = ref();
        // const currentAppObjects: Ref<AppObject[]> = ref([]);
        const defaultAppDomainIconUrl = '';
        const appWizardComponentRef = ref();

        function resetMenuItemSelectionStatus() {
            Array.from(appDomainMap.entries()).forEach(([appDomainId, appDomainInstanceRef]) => {
                appDomainInstanceRef.value?.clearSelection();
            });
        }

        function onClickMenuGroupHeader() {
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
            const options = {
                title: '创建应用',
                width: 540,
                render: () => <AppWizardComponent ref={appWizardComponentRef} appModule={currentAppModule.value}></AppWizardComponent>,
                acceptCallback: acceptToCreateNewApp
            } as any;
            FModalService.show(options);
        }

        function renderAppModule(appDomain: AppDomain, { item, index, selectedItem }) {
            return <div onClick={(payload: MouseEvent) => onClickMenuItem(payload, appDomain, item)}>
                <svg class="top-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,10 A 10,10 0 0 0 10,0 L 10,10 L 0,10 Z" fill="white" />
                </svg>
                <span>{item.name}</span>
                <svg class="bottom-right-corner" width="10" height="10" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 0,0 A 10,10 0 0 1 10,10 L 10,0 L 0,0 Z" fill="white" />
                </svg>
            </div>;
        }

        function renderAppModules(appDomain: AppDomain, appModules: AppModule[]) {
            const appDomainInstanceRef = appDomainMap.get(appDomain.id);
            return <FListView ref={appDomainInstanceRef} data={appModules} customClass="f-admin-app-module-list" itemClass="f-admin-app-module-list-item">
                {{ content: ({ item, index, selectedItem }) => renderAppModule(appDomain, { item, index, selectedItem }) }}
            </FListView>;
        }

        function renderAppDomainNavigation(appDomains: any[]) {
            return <FAccordion customClass="f-admin-app-domain-groups">
                {appDomains.map((appDomain: AppDomain) => {
                    return <FAccordionItem customClass="f-admin-app-domain" iconUri={defaultAppDomainIconUrl} title={appDomain.name} onClickHeader={onClickMenuGroupHeader}>
                        {renderAppModules(appDomain, appDomain.modules)}
                    </FAccordionItem>;
                })}
            </FAccordion>;
        }

        function renderAppsListHeader() {
            return (
                <div class="f-admin-apps-list-header">
                    <span class="f-admin-apps-bread-crumbs">
                        <span class="f-admin-app-domain-title">{currentAppModule.value?.name}</span>
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
            // const appUri = `/platform/dev/main/web/webide/newide/index.html?path=${appPath}&boId=${appObject.id}&ws=625s7acd&version=2.0#/home`;
            const appUri = '/apps/platform/development-platform/ide/app-builder/index.html';

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
                    <div class="f-app-card-footer f-btn-group">
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
                        {renderAppDomainNavigation(appDomains.value)}
                    </FLayoutPane>
                    <FLayoutPane customClass="f-admin-app-center-content" position="center">
                        <FListView ref={appListViewRef} customClass="f-admin-apps-list f-utils-fill-flex-column" data={currentAppObjects.value} header="ContentHeader" view="CardView">
                            {{
                                header: renderAppsListHeader,
                                content: renderAppCard
                            }}
                        </FListView>
                    </FLayoutPane>
                </FLayout>
            );
        };
    }
});
