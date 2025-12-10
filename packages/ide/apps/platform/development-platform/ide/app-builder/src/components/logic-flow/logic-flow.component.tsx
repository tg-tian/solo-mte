import { computed, defineComponent, onMounted, ref, withModifiers } from "vue";
import { FButton, FListView, FProgress, FSection, FPageHeader, FDynamicForm, FDynamicFormGroup } from "@farris/ui-vue";
import { LogicFlowProps, logicFlowProps } from "./logic-flow.props";
import { useLogicFlow } from "./composition/use-logic-flow";
import { useFunctionInstance } from "../../composition/use-function-instance";
import { UseConfig, FunctionInstance } from "../../composition/types";

export default defineComponent({
    name: 'FAppLogicFlows',
    props: logicFlowProps,
    emits: [],
    setup(props: LogicFlowProps, context) {
        // const useConfigInstance = inject('f-admin-config') as UseConfig;
        // 初始化功能菜单实例管理服务
        const useFunctionInstanceComposition = useFunctionInstance(null as any);
        // const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
        const { activeInstanceId, functionInstances, close, open, openUrl, setResidentInstance } = useFunctionInstanceComposition;
        setResidentInstance([            {
            "functionId": "home",
            "instanceId": "home",
            "code": "home",
            "name": "",
            "url": "/platform/runtime/bcc/web/ai-flow/farris-flow-management/index.html?flowDesignerMenuID=18325584-1798-9982-ca06-447e1e54c502&funcId=8eabc611-ba6f-aeac-4cf0-4d6c49692f94",
            "icon": "f-icon f-icon-index-face",
            "fix": true
        }]);

        const title = '业务逻辑';
        const pagesListViewRef = ref();

        // const { pages, getPages, createPage } = usePage();

        onMounted(() => {
            window['gspframeworkService'] = {
                'rtf':{
                    'func':{
                        'openMenu':(options:Record<string, any>) => {
                            const { funcId:id,tabId:code,tabName:name } = options;
                            const metadataId = options.queryStringParams.get('metadataId');
                            const targetUrl = `/platform/runtime/bcc/web/ai-flow/farris-flow-designer/index.html?metadataId=${metadataId}`;
                            openUrl(id, code, name, targetUrl);
                        }
                    }
                }
            }
            // getPages().then((pages: Record<string, any>[]) => {
            //     pagesListViewRef.value.updateDataSource(pages);
            // });
        });


        // function openPageDesign(page: Record<string, any>) {
        //     const { id,code,name } = page;
        //     const designerPath = designerMap.get(page.type);
        //     const designerUrl = `${designerPath}?id=${page.relativePath}`;
        //     openUrl(id, code, name, designerUrl);
        // }

        function renderTitleArea() {
            return (
                <div class="f-title">
                    <div class="f-title-logo"></div>
                    <h4 class="f-title-text">{title}</h4>
                    <button class="new-page-btn">新建页面</button>
                </div>
            );
        }

        function getFunctionTabClass(functionInstance: FunctionInstance) {
            const classObject = {
                'active': functionInstance.instanceId === activeInstanceId.value,
                'fix': functionInstance.fix,
                'f-app-builder-main-tab-item': true
            } as Record<string, true>;
            return classObject;
        }

        function onClickFunctionTabItem(functionInstance: FunctionInstance) {
            activeInstanceId.value = functionInstance.instanceId;
        }

        function getFunctionContentClass(functionInstance: FunctionInstance) {
            const classObject = {
                'active': functionInstance.instanceId === activeInstanceId.value,
                'f-app-builder-main-tab-content': true
            } as Record<string, true>;
            return classObject;
        }

        // function renderDefaultContent() {
        //     return <FSection class="f-utils-fill-flex-column">
        //             <FListView ref={pagesListViewRef} data={pages.value} view="CardView">
        //                 {{
        //                     content: ({ item, index, selectedItem }) => {
        //                         return (
        //                             <div class="f-page-card f-template-card-row">
        //                                 <div class="f-page-card-header listview-item-content">
        //                                     <div class="listview-item-icon f-page-icon">
        //                                     </div>
        //                                     <div class="listview-item-main">
        //                                         <h4 class="listview-item-title">{item.name}</h4>
        //                                         <h5 class="listview-item-subtitle">{item.code}</h5>
        //                                     </div>
        //                                 </div>
        //                                 <div class="f-page-card-content">
        //                                     <p>修改人：{item.lastChangedBy}</p>
        //                                     <p>修改时间：{item.lastChangedOn}</p>
        //                                 </div>
        //                                 <div class="f-page-card-footer f-btn-group">
        //                                     <div class="btn-group f-btn-group-links">
        //                                         <FButton icon="f-icon f-icon-edit-cardview" type="link" onClick={() => openPageDesign(item)}></FButton>
        //                                         <FButton icon="f-icon f-icon-yxs_copy" type="link"></FButton>
        //                                         <FButton icon="f-icon f-icon-yxs_delete" type="link"></FButton>
        //                                     </div>
        //                                 </div>
        //                             </div>
        //                         );
        //                     }
        //                 }}
        //             </FListView>
        //         </FSection>
        // }

        function renderContents() {
            return functionInstances.value.map((functionInstance: FunctionInstance) => {
                return <div class={getFunctionContentClass(functionInstance)}>
                    {<iframe title={functionInstance.instanceId} src={functionInstance.url}></iframe>}
                </div>;
            });
        }

        function renderPages(){
            return (
                <div class="f-pages-list f-page f-page-is-managelist">
                    <div class="f-app-builder-main-header">
                        <div class="f-app-builder-main-tabs">
                            <div class="f-app-builder-main-tabs-title">应用页面列表</div>
                            <div class="f-app-builder-main-tabs-content">
                                {functionInstances.value.map((tabItem: FunctionInstance) => {
                                    return <div class={getFunctionTabClass(tabItem)} onClick={(payload: MouseEvent) => onClickFunctionTabItem(tabItem)}>
                                        {tabItem.icon && <span><i class={tabItem.icon}></i></span>}
                                        {tabItem.name && <span>{tabItem.name}</span>}
                                        {!tabItem.fix && <div class="f-admin-main-tab-item-close" onClick={withModifiers(() => close(tabItem.instanceId), ['stop'])}>
                                            <i class="f-icon f-icon-close"></i>
                                        </div>}
                                    </div>;
                                })}
                            </div>
                            {/* <div class="f-app-builder-main-tabs-toolbar">
                                <button class="btn btn-md btn-primary">新建</button>
                            </div> */}
                            <div class="f-app-builder-main-tabs-background"></div>
                        </div>
                     </div>
                     
                     <div class="f-app-builder-main-content">
                        {renderContents()}
                     </div>
                </div>
            );
        }

        return ()=>{
            return renderPages();
        };
    }
});
