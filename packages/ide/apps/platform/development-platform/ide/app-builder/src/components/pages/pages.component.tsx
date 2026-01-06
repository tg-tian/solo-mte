import { computed, defineComponent, onMounted, ref, withModifiers, inject } from "vue";
import { FButton, FListView, FProgress, FSection, FPopover, FMessageBoxService, FNotifyService, F_NOTIFY_SERVICE_TOKEN } from "@farris/ui-vue";
import { useMetadata } from "@ubml/common";
import { PagesProps, pagesProps } from "./pages.props";
import { mockPagesTasks } from './mock-data';
import { PagesTask } from "./type";
import { usePage } from "./composition/use-page";
// import { useFunctionInstance } from "../../composition/use-function-instance";
import { UseConfig, FunctionInstance, UseFunctionInstance } from "../../composition/types";
import FCreateNewModel from "./components/create-new-model/create-new-model.component";

export default defineComponent({
    name: 'FAppPages',
    props: pagesProps,
    emits: [],
    setup(props: PagesProps, context) {
        // const useConfigInstance = inject('f-admin-config') as UseConfig;
        // 初始化功能菜单实例管理服务
        // const useFunctionInstanceComposition = useFunctionInstance(null as any);
        const FMessageBoxService = inject('FMessageBoxService') as typeof FMessageBoxService;
        const FNotifyService = inject(F_NOTIFY_SERVICE_TOKEN) as typeof FNotifyService;

        const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
        const { activeInstanceId, functionInstances, close, open, openUrl, setResidentInstance } = useFunctionInstanceComposition;
        setResidentInstance([{
            "functionId": "home",
            "instanceId": "home",
            "code": "home",
            "name": "",
            "url": "/platform/runtime/sys/web/home/index.html",
            "icon": "f-icon f-icon-index-face",
            "fix": true
        }]);
        const designerMap = new Map<string, string>([
            ['Form', '/platform/common/web/farris-designer/index.html'],
            ['GSPBusinessEntity', '/platform/dev/main/web/webide/plugins-new/be-designer/index.html'],
            ['GSPViewModel', '/platform/dev/main/web/webide/plugins-new/vo-designer/index.html'],
            ['ExternalApi', '/platform/dev/main/web/webide/plugins/eapi-package/index.html'],
            ['ResourceMetadata', '/platform/dev/main/web/webide/plugins/resource-metadata-designer/index.html'],
            ['StateMachine', '/platform/dev/main/web/webide/plugins/state-machine-designer/index.html'],
            ['PageFlowMetadata', '/platform/dev/main/web/webide/plugins/page-flow-designer/index.html'],
            ['DBO', '/platform/dev/main/web/webide/plugins/dbo-manager/index.html']
        ])

        const title = '自助咖啡服务-应用页面列表';
        const pagesListViewRef = ref();
        const popoverRef = ref<any>();
        const popoverHostRef = ref<any>();
        const popoverReferenceRef = ref<any>();
        const pagesTasks = ref<PagesTask[]>([]);
        const currentView = ref('listView');
        const shouldShowPopover = ref(false);
        // 组件状态
        const searchInputRef = ref<HTMLInputElement | null>(null);
        const searchValue = ref('');
        const { pages, getPages, createPage, getMetadataGroup, metadataGroup, frameworkData, metadataTypeData } = usePage();
        const { deleteMetadata, isMetadataRefed } = useMetadata();

        onMounted(() => {
            // getPages().then((pages: Record<string, any>[]) => {
            //     pagesListViewRef.value.updateDataSource(pages);
            // });

            getMetadataGroup().then((metadataGroup: Record<string, any>[]) => {
            });
        });


        function openPageDesign(page: Record<string, any>) {
            const { id, code, name } = page;
            const designerPath = designerMap.get(page.type);
            const designerUrl = `${designerPath}?id=/${page.relativePath}`;
            openUrl(id, code, name, designerUrl);
        }

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

        function onDeleteMetadata($event: MouseEvent, metadata: any) {
            $event.stopPropagation();
            const param = {
                nodeID: metadata.id,
                nodeName: metadata.fileName || metadata.name,
                nodePath: metadata.fullpath || metadata.fullPath || metadata.relativePath,
                nodeType: 'file'
            };

            // 直接调用删除方法
            doDeleteMetadata(param);
        }

        function doDeleteMetadata(nodeInfo: any) {
            if (nodeInfo.nodeType === 'file') {
                FMessageBoxService.question('确认是否删除?', '', async () => {
                    try {
                        // 获取完整路径，如果以 / 开头则去掉第一个字符
                        const fullPath = nodeInfo.nodePath.startsWith('/')
                            ? nodeInfo.nodePath.substring(1)
                            : nodeInfo.nodePath;

                        // 检查元数据是否被依赖
                        const refedResult = await isMetadataRefed(fullPath);

                        // 判断是否被依赖（根据 API 返回的数据结构判断）
                        const isRefed = refedResult?.body || refedResult?.data?.body || false;

                        if (!isRefed) {
                            // 如果没有被依赖，执行删除
                            await deleteMetadata(fullPath, 'file');

                            // 删除成功，刷新元数据列表
                            FNotifyService.success({ message: '删除成功' });
                            await getMetadataGroup();
                        } else {
                            // 如果被依赖，显示错误信息
                            FNotifyService.warning({
                                message: '删除失败：此元数据被其他元数据依赖，请清除依赖后重试。具体依赖情况见输出框。'
                            });
                        }
                    } catch (error: any) {
                        // 处理错误
                        const errorMessage = error?.error?.Message || error?.message || '删除失败';
                        FNotifyService.show({ type: 'error', message: `删除失败：${errorMessage}` });
                    }
                });
            } else {
                FNotifyService.show({ type: 'warning', message: '删除失败：此元数据被其他元数据依赖，请清除依赖后重试。具体依赖情况见输出框。' });
            }
        }

        function renderDefaultContent() {
            return <FSection class="f-utils-fill-flex-column">
                <FListView ref={pagesListViewRef} data={pages.value} view="CardView">
                    {{
                        content: ({ item, index, selectedItem }) => {
                            return (
                                <div class="f-page-card f-template-card-row">
                                    <div class="f-page-card-header listview-item-content">
                                        <div class="listview-item-icon f-page-icon">
                                        </div>
                                        <div class="listview-item-main">
                                            <h4 class="listview-item-title">{item.name}</h4>
                                            <h5 class="listview-item-subtitle">{item.code}</h5>
                                        </div>
                                    </div>
                                    <div class="f-page-card-content">
                                        <p>修改人：{item.lastChangedBy}</p>
                                        <p>修改时间：{item.lastChangedOn}</p>
                                    </div>
                                    <div class="f-page-card-footer f-btn-group">
                                        <div class="btn-group f-btn-group-links">
                                            <FButton icon="f-icon f-icon-edit-cardview" type="link" onClick={() => openPageDesign(item)}></FButton>
                                            <FButton icon="f-icon f-icon-yxs_copy" type="link"></FButton>
                                            <FButton icon="f-icon f-icon-yxs_delete" type="link"></FButton>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                    }}
                </FListView>
            </FSection>
        }

        function renderHeader() {
            return (
                <div class="header d-flex flex-row">
                    <div class="title ml-3">
                    </div>
                    <div class="search-input f-utils-fill">
                        <div class="input-group d-flex">
                            <div class="input-group-prepend">
                                <span class="input-group-text f-icon f-icon-search"></span>
                            </div>
                            <input id="search-input" title="搜索框" type="text" class="form-control" value={searchValue.value} />
                            {searchValue.value && (
                                <div
                                    class="input-group-prepend d-flex align-center"
                                    role="button"
                                    style="cursor: pointer;border-radius: 20px;width: 20px;align-items: center;left: -5px;top: 1px;"
                                >
                                    <span class="input-group-text f-icon f-icon-close" style="padding: 0;"></span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        function renderNavSearch() {
            return (
                <div class="nav-search mb-3">
                    <div class="d-flex flex-row category mb-2">
                        <div class="name"> </div>
                        <ul class="nav">
                            {frameworkData.map(item => (
                                <li
                                    key={item.code}
                                    class={{ 'nav-item': true, active: item.active }}
                                // onClick={(e: MouseEvent) => onFrameworkItemClick(e, item)}
                                >
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div class="d-flex flex-row category">
                        <div class="name">类型</div>
                        <ul class="nav">
                            {metadataTypeData.map(item => (
                                <li key={item.code} class={{ 'nav-item': true, active: item.active }}
                                // onClick={(e: MouseEvent) => onMetadataTypeClick(e, item)}
                                >
                                    {item.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }

        function renderMetadataList() {
            return (
                <div class={{ 'metadata-list': true, 'f-utils-fill': true, empty: !metadataGroup.value.length }}>
                    {metadataGroup.value.map(metadata => (
                        <div class="card" key={metadata.typeCode}>
                            <div class="card-header">{metadata.typeName}</div>
                            <div class="card-body pt-2 pb-1">
                                <div class="card-deck">
                                    {metadata.items.map(item => (
                                        <div key={item.id} class="card mb-3 metadata-item" style="min-width: 18rem;min-height: 6rem;" onClick={(e: MouseEvent) => openPageDesign(item)}>
                                            <div class="card-body d-flex flex-column pb-1 pl-3 pr-3 pt-3">
                                                <div class="metadata-info d-flex flex-row">
                                                    <div class={`ide-bo-icon d-flex mt-1 ide-metadata-${metadata.postfix.substring(1)}`}>
                                                        <span style="font-size: 20px;"></span>
                                                    </div>
                                                    <div class="f-utils-fill title">
                                                        <h5 class="mb-0" title={item.name}>{item.name}</h5>
                                                        <p title={item.code}>{item.code}</p>
                                                    </div>
                                                </div>
                                                <div class="metadata-info-extend mt-3">
                                                    <img title="修改人" src="/assets/img/metadata-user.svg" />
                                                    <span class="metadata-info-extend-title">修改人</span>
                                                    <span class="metadata-info-extend-value" title={item.lastChangedBy || ''}>
                                                        {item.lastChangedBy || '无记录'}
                                                    </span>
                                                </div>
                                                <div class="metadata-info-extend mt-2">
                                                    <img title="修改时间" src="/assets/img/metadata-time.svg" />
                                                    <span class="metadata-info-extend-title">修改时间</span>
                                                    <span class="metadata-info-extend-value" title={item.lastChangedOn || ''}>
                                                        {item.lastChangedOn || '无记录'}
                                                    </span>
                                                </div>
                                                <div class="footer-tools mt-2 mb-1" >
                                                    <div class="metadata-info-delete-out" onClick={(payload: MouseEvent) => onDeleteMetadata(payload, item)}>
                                                        <span class="f-icon icon fd-i-Family fd_pc-shanchu flex-fill" ></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!metadataGroup.value.length && (
                        <div class="empty_content">
                            <span>暂无数据</span>
                        </div>
                    )}
                </div>
            );
        }

        function renderResourceManagerContent() {
            return <div class="ide-main d-flex f-utils-fill flex-column" style="height: 100%;">
                <div class="f-utils-fill">
                    <div class="d-flex flex-column ide-resource">
                        {renderHeader()}
                        {renderNavSearch()}
                        {renderMetadataList()}
                    </div>
                </div>
            </div>;
        }

        function renderContents() {
            return functionInstances.value.map((functionInstance: FunctionInstance) => {
                return <div class={getFunctionContentClass(functionInstance)}>
                    {functionInstance.instanceId === 'home' ? renderResourceManagerContent() : <iframe title={functionInstance.instanceId} src={functionInstance.url}></iframe>}
                </div>;
            });
        }

        function showPopover() {
            popoverRef.value.show(popoverHostRef.value);
        }

        function onCreated(payload: any) {
            getMetadataGroup().then((metadataGroup: Record<string, any>[]) => {
                popoverRef.value.hide();
            });
        }

        function renderPages() {
            return (
                <div ref={popoverHostRef} class="f-pages-list f-page f-page-is-managelist">
                    <div class="f-app-builder-main-header">
                        <div class="f-app-builder-main-tabs">
                            <div class="f-app-builder-main-tabs-title">模型设计</div>
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
                            <div class="f-app-builder-main-tabs-toolbar">
                                <button ref={popoverReferenceRef} class="btn btn-md btn-primary" onClick={showPopover}>新建</button>
                            </div>
                            <div class="f-app-builder-main-tabs-background"></div>
                        </div>
                    </div>
                    <div class="f-app-builder-main-content">
                        {renderContents()}
                    </div>
                    <FPopover
                        ref={popoverRef}
                        class="ide-create-model-handler-popover"
                        host={popoverHostRef.value}
                        z-index={1050}
                        placement={'auto'}
                        reference={popoverReferenceRef.value}
                        onHidden={() => {
                        }}>
                        <FCreateNewModel onCreated={(payload: any) => onCreated(payload)}></FCreateNewModel>
                    </FPopover>
                </div>
            );
        }

        return () => {
            return renderPages();
        };

        // return () => {
        //     return (
        //         <div class="f-page f-page-card f-page-is-mainsubcard f-app-pages">
        //             <div class="f-admin-main-header"></div>
        //             <div class="f-admin-main-content">
        //                 <div class="f-page-header" >
        //                     <nav class="f-page-header-base">
        //                         {renderTitleArea()}
        //                     </nav>
        //                     <div class="f-page-header-background"></div>
        //                 </div>

        //                 {searchToolbar()}
        //                 <div class="f-page-main">
        //                     {shouldShowListView.value && renderpagesTaskList()}

        //                 </div>
        //             </div>
        //         </div>
        //     );
        // };
    }
});
