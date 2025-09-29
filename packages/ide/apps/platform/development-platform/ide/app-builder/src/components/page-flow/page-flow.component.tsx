import { defineComponent, onMounted, ref } from "vue";
import { FButton, FListView, FSection, FPageHeader, FDynamicForm, FDynamicFormGroup } from "@farris/ui-vue";
import { PageFlowProps, pageFlowProps } from "./page-flow.props";
import './page-flow.scss';
import { usePageFlow } from "./composition/use-page-flow";

export default defineComponent({
    name: 'FAppPageFlows',
    props: pageFlowProps,
    emits: [],
    setup(props: PageFlowProps, context) {
        const title = '自助咖啡服务-应用页面列表';
        const pageFlowsListViewRef = ref();

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
        const { pageFlows, getPageFlows, createPageFlow } = usePageFlow();

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
            getPageFlows().then((pages: Record<string, any>[]) => {
                pageFlowsListViewRef.value.updateDataSource(pages);
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

        return ()=>{
            return (
                <div class="f-page-flow-list f-page f-page-is-managelist">
                    <FPageHeader title="页面流列表" buttons={items}></FPageHeader>
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
                            <FListView ref={pageFlowsListViewRef} data={pageFlows.value} view="CardView">
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
        };
    }
});
