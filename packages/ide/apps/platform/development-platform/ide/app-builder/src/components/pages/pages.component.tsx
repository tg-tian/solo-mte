import { computed, defineComponent, onMounted, ref } from "vue";
import { FButton, FListView, FProgress, FSection, FPageHeader, FDynamicForm, FDynamicFormGroup } from "@farris/ui-vue";
import { PagesProps, pagesProps } from "./pages.props";
import { mockPagesTasks } from './mock-data';
import { PagesTask } from "./type";
import { usePage } from "./composition/use-page";

export default defineComponent({
    name: 'FAppPages',
    props: pagesProps,
    emits: [],
    setup(props: PagesProps, context) {
        const title = '自助咖啡服务-应用页面列表';
        const pagesListViewRef = ref();
        const pagesTasks = ref<PagesTask[]>(mockPagesTasks);
        const currentView = ref('listView');
        const shouldShowListView = computed(() => currentView.value === 'listView');
        const shouldShowCardView = computed(() => currentView.value === 'cardView');

        const items = [{ id: 'createPage', text: '创建页面', class: 'btn-primary', onClick: () => void 0 }];
        const statusMap = new Map<string, string>([['testing', '测试中'], ['published', '已发布'], ['editing', '定制中']]);
        const editorOptions = {
            type: 'combo-list',
            idField: 'value',
            data: [
                { name: '定制中', value: 'editing' },
                { name: '测试中', value: 'testing' },
                { name: '已发布', value: 'published' }
            ],
            textField: 'name',
            valueField: 'value',
        };
        const { pages, getPages, createPage } = usePage();

        function getBageClass(item: Record<string, any>) {
            const classObject = {
                'bage': true,
                'bage-testing': item.status === 'testing',
                'bage-published': item.status === 'published',
                'bage-editing': item.status === 'editing'
            };
            return classObject;
        }

        function getIconColor(item: Record<string, any>) {
            return { '--bg': item.color };
        }

        onMounted(() => {
            getPages().then((pages: Record<string, any>[]) => {
                pagesListViewRef.value.updateDataSource(pages);
            });
        });


        function openPageDesign(page: Record<string, any>) {
            const { id } = page;
            const code = page.id;
            const name = page.title;
            // const deployPath = '/platform/dev/main/web/webide-apps/index.html#/home';
            const deployPath = name === '智慧楼宇' ? '/platform/dev/main/web/webide-apps/index.html#/home' : '/apps/platform/development-platform/ide/app-center/index.html';
            window.top?.postMessage({
                eventType: 'invoke',
                method: 'openUrl',
                params: [id, code, name, deployPath]
            });
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

        function onClickNewTask() {
            currentView.value = 'cardView';

        }

        function onClickpagesCard(payload: string) {
            if (payload === 'cancel' || payload === 'confirm') {
                currentView.value = 'listView';
            }
        }

        function renderToolbar() {
            return (
                <div class="f-toolbar">
                    <FButton onClick={onClickNewTask}>新建任务</FButton>
                </div>
            );
        }

        function searchToolbar() {
            return (

                <div class="search-bar">
                    <div class="search-item">
                        <label>应用名称</label>
                        <input type="text" placeholder="请输入" />
                    </div>
                    <div class="search-item">
                        <label>所属页面流</label>
                        <select>
                            <option value="">请选择</option>
                        </select>
                    </div>
                    <button class="filter-btn">筛选</button>
                </div>


            );
        }

        function renderpagesTaskList() {
            return <FSection class="f-utils-fill-flex-column">

                <FListView ref={pagesListViewRef} data={pagesTasks.value}>
                    {{

                        content: ({ item, index, selectedItem }) => {
                            return (
                                <div class="page-list">
                                    {item.icon}
                                    {item.key}
                                    {item.title}
                                    {item.code}
                                    {item.flow}

                                </div >
                            );
                        }
                    }}
                </FListView >
            </FSection >;
        }

        function renderPages(){
            return (
                <div class="f-pages-list f-page f-page-is-managelist">
                    <FPageHeader title="应用页面列表" buttons={items}></FPageHeader>
                    <div class="f-page-main">
                        <FSection>
                            <FDynamicForm class="f-form-layout farris-form farris-form-controls-inline">
                                <FDynamicFormGroup id="input-group" class="col-12 col-md-4 col-xl-4 col-el-4" label="平台名称">
                                </FDynamicFormGroup>
                                <FDynamicFormGroup id="combo-list" class="col-12 col-md-4 col-xl-4 col-el-4" label="状态"
                                    editor={editorOptions}>
                                </FDynamicFormGroup>
                                <div class="col-12 col-md-4 col-xl-4 col-el-4">
                                    <FButton style="float:right">筛选</FButton>
                                </div>
                            </FDynamicForm>
                        </FSection>
                        <FSection class="f-utils-fill-flex-column">
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
                    </div>
                </div>
            );
        }

        return ()=>{
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
