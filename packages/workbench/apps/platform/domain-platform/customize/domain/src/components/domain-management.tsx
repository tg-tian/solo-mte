import { defineComponent, onMounted, ref } from "vue";
import { FButton, FDynamicForm, FDynamicFormGroup, FListView, FPageHeader, FSection } from "@farris/ui-vue";

import './domain-management.css';
import { useDomain } from "../composition/use-domain";

export default defineComponent({
    name: "FADomainManagement",
    setup() {
        const domianListViewRef = ref();
        const { domains, getDomains, createDomain } = useDomain();
        const items = [{ id: 'createDomain', text: '创建领域', class: 'btn-primary', onClick: () => createDomain() }];
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
            getDomains().then((domains: Record<string, any>[]) => {
                domianListViewRef.value.updateDataSource(domains);
            });
        });

        function openDomainPlatform(domain: Record<string, any>) {
            const { id } = domain;
            const code = domain.id;
            const name = domain.title;
            // const deployPath = '/platform/dev/main/web/webide-apps/index.html#/home';
            const deployPath = name === '智慧楼宇' ? '/platform/dev/main/web/webide-apps/index.html#/home' : '/apps/platform/development-platform/ide/app-center/index.html';
            window.top?.postMessage({
                eventType: 'invoke',
                method: 'openUrl',
                params: [id, code, name, deployPath]
            });
        }

        return () => {
            return (
                <div class="f-page f-page-is-managelist">
                    <FPageHeader title="领域平台列表" buttons={items}></FPageHeader>
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
                            <FListView ref={domianListViewRef} data={domains.value} view="CardView">
                                {{
                                    content: ({ item, index, selectedItem }) => {
                                        return (
                                            <div class="f-domain-card f-template-card-row">
                                                <div class="f-domain-card-header listview-item-content">
                                                    <div class="listview-item-icon" style={getIconColor(item)}>
                                                        <i class={item.icon}></i>
                                                    </div>
                                                    <div class="listview-item-main">
                                                        <h4 class="listview-item-title">{item.title}</h4>
                                                        <h5 class="listview-item-subtitle">{item.creater}</h5>
                                                        <span class={getBageClass(item)}>{statusMap.get(item.status)}</span>
                                                    </div>
                                                </div>
                                                <div class="f-domain-card-content">
                                                    <p>{item.path}</p>
                                                    <p>{item.description}</p>
                                                </div>
                                                <div class="f-domain-card-footer f-btn-group">
                                                    <div class="btn-group f-btn-group-links">
                                                        <FButton icon="f-icon f-icon-edit-cardview" type="link" onClick={() => openDomainPlatform(item)}></FButton>
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
