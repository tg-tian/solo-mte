// import { defineComponent, onMounted, ref, computed } from "vue";
// import { useFunctionInstance } from "../../../composition/use-function-instance";
// import { PagesTask } from "../type";
// import { usePage } from "../composition/use-page";

// export default defineComponent({
//     name: 'IdeResourceManager',
//     props: {},
//     emits: ['metadataClick', 'deleteMetadata', 'metadataitemsChange'],
//     setup(props, context) {
//         // 组件状态
//         const searchInputRef = ref<HTMLInputElement | null>(null);
//         const searchValue = ref('');
//         const flag = ref(true);
//         // 初始化功能菜单实例管理服务
//         const useFunctionInstanceComposition = useFunctionInstance(null as any);
//         // const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
//         const { activeInstanceId, functionInstances, close, open, openUrl, setResidentInstance } = useFunctionInstanceComposition;
//         setResidentInstance([            {
//             "functionId": "resourceManager",
//             "instanceId": "resourceManager",
//             "code": "resourceManager",
//             "name": "",
//             "url": "/platform/dev/main/web/webide/plugins/resource-manager/index.html",
//             "icon": "f-icon f-icon-index-face",
//             "fix": true
//         }]);
//         const designerMap = new Map<string, string>([
//             ['Form', '/platform/common/web/farris-designer/index.html'],
//             ['GSPBusinessEntity', '/platform/dev/main/web/webide/plugins-new/be-designer/index.html'],
//             ['GSPViewModel','/platform/dev/main/web/webide/plugins-new/vo-designer/index.html'],
//             ['ExternalApi','/platform/dev/main/web/webide/plugins/eapi-package/index.html'],
//             ['ResourceMetadata','/platform/dev/main/web/webide/plugins/resource-metadata-designer/index.html'],
//             ['StateMachine','/platform/dev/main/web/webide/plugins/state-machine-designer/index.html'],
//             ['PageFlowMetadata','/platform/dev/main/web/webide/plugins/page-flow-designer/index.html'],
//             ['DBO','/platform/dev/main/web/webide/plugins/dbo-manager/index.html']
//         ])

//         const title = '自助咖啡服务-应用页面列表';
//         const pagesListViewRef = ref();
//         const pagesTasks = ref<PagesTask[]>([]);
//         const currentView = ref('listView');

//         const { pages, getPages, createPage } = usePage();


//         const state = ref({
//             types: [] as any[],
//             items: [] as MetadataItem[],
//             metadataList: [] as any[]
//         });

//         const metadataItems = ref<any[]>([]);


//         onMounted(() => {
//             getPages().then((pages: Record<string, any>[]) => {
//                 metadataItems.value = pages;
//                 // pagesListViewRef.value.updateDataSource(pages);
//             });
//         });

//         function renderHeader() {
//             return (
//                 <div class="header d-flex flex-row">
//                     <div class="title ml-3">
//                     </div>
//                     <div class="search-input f-utils-fill">
//                         <div class="input-group d-flex">
//                             <div class="input-group-prepend">
//                                 <span class="input-group-text f-icon f-icon-search"></span>
//                             </div>
//                             <input
//                                 ref={searchInputRef}
//                                 type="text"
//                                 class="form-control"
//                                 value={searchValue.value}
//                             />
//                             {searchValue.value && (
//                                 <div
//                                     class="input-group-prepend d-flex align-center"
//                                     role="button"
//                                     style="cursor: pointer;border-radius: 20px;width: 20px;align-items: center;left: -5px;top: 1px;"
//                                 >
//                                     <span class="input-group-text f-icon f-icon-close" style="padding: 0;"></span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </div>
//             );
//         }

//         function renderNavSearch() {
//             return (
//                 <div class="nav-search mb-3">
//                     <div class="d-flex flex-row category mb-2">
//                         <div class="name"> </div>
//                         <ul class="nav">
//                             {/* {frameworkData.value.map(item => (
//                                 <li
//                                     key={item.code}
//                                     class={{ 'nav-item': true, active: item.active }}
//                                     onClick={(e: MouseEvent) => onFrameworkItemClick(e, item)}
//                                 >
//                                     {item.name}
//                                 </li>
//                             ))} */}
//                         </ul>
//                     </div>
//                     <div class="d-flex flex-row category">
//                         <div class="name">类型</div>
//                         <ul class="nav">
//                             {/* {metadataTypeData.value.map(item => (
//                                 <li
//                                     key={item.code}
//                                     class={{ 'nav-item': true, active: item.active }}
//                                     onClick={(e: MouseEvent) => onMetadataTypeClick(e, item)}
//                                 >
//                                     {item.name}
//                                 </li>
//                             ))} */}
//                         </ul>
//                     </div>
//                 </div>
//             );
//         }

//         function renderMetadataList() {
//             return (
//                 <div class={{ 'metadata-list': true, 'f-utils-fill': true, empty: !metadataItems.value.length }}>
//                     {metadataItems.value.map(metadata => (
//                         <div class="card" key={metadata.typeCode}>
//                             <div class="card-header">{metadata.typeName}</div>
//                             <div class="card-body pt-2 pb-1">
//                                 <div class="card-deck">
//                                     {metadata.items.map(item => (
//                                         <div
//                                             key={item.id}
//                                             class="card mb-3 metadata-item"
//                                             style="min-width: 18rem;min-height: 6rem;"
//                                             onClick={(e: MouseEvent) =>openPageDesign(item)}
//                                         >
//                                             <div class="card-body d-flex flex-column pb-1 pl-3 pr-3 pt-3">
//                                                 <div class="metadata-info d-flex flex-row">
//                                                     <div class={`ide-bo-icon d-flex mt-1 ide-metadata-${metadata.postfix.substring(1)}`}>
//                                                         <span style="font-size: 20px;"></span>
//                                                     </div>
//                                                     <div class="f-utils-fill title">
//                                                         <h5 class="mb-0" title={item.name}>{item.name}</h5>
//                                                         <p title={item.code}>{item.code}</p>
//                                                     </div>
//                                                 </div>
//                                                 <div class="metadata-info-extend mt-3">
//                                                     <img src="assets/img/metadata-user.svg" />
//                                                     <span class="metadata-info-extend-title">修改人</span>
//                                                     <span class="metadata-info-extend-value" title={item.lastChangedBy || ''}>
//                                                         {item.lastChangedBy || '无记录'}
//                                                     </span>
//                                                 </div>
//                                                 <div class="metadata-info-extend mt-2">
//                                                     <img src="assets/img/metadata-time.svg" />
//                                                     <span class="metadata-info-extend-title">修改时间</span>
//                                                     <span class="metadata-info-extend-value" title={item.lastChangedOn || ''}>
//                                                         {item.lastChangedOn || '无记录'}
//                                                     </span>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         </div>
//                     ))}
//                     {!metadataItems.value.length && (
//                         <div class="empty_content">
//                             <span>暂无数据</span>
//                         </div>
//                     )}
//                 </div>
//             );
//         }

//         return () => {
//             return (
//                 <div class="d-flex flex-column ide-resource">
//                     {renderHeader()}
//                     {renderNavSearch()}
//                     {renderMetadataList()}
//                 </div>
//             );
//         };
//     }
// });

