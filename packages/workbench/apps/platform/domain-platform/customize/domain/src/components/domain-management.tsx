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
        const statusMap = new Map<string, string>([['0', '测试中'], ['1', '已发布'], ['2', '定制中']]);
        const editorOptions = {
            type: 'combo-list',
            idField: 'value',
            data: [
                { name: '定制中', value: '2' },
                { name: '测试中', value: '0' },
                { name: '已发布', value: '1' }
            ],
            textField: 'name',
            valueField: 'value',
        };

        function getBageClass(item: Record<string, any>) {
            const classObject = {
                'bage': true,
                'bage-testing': item.status === '0',
                'bage-published': item.status === '1',
                'bage-editing': item.status === '2'
            };
            return classObject;
        }

        function getIconColor(item: Record<string, any>) {
            // 默认颜色
            return { '--bg': '#4D98FF' };
        }

        onMounted(() => {
            getDomains().then((domains: Record<string, any>[]) => {
                domianListViewRef.value.updateDataSource(domains);
            });
        });

        function openDomainPlatform(domain: Record<string, any>) {
            const id = domain.domainId;
            const code = domain.domainCode;
            const name = domain.domainName;
            domain.url = "http://139.196.147.52:2400/#/meta/domain/setting?mode=edit&domainId=" + id;
            // 使用domain中的url字段，如果为空则使用默认路径
            let deployPath = domain.url && domain.url.trim() ? domain.url.trim() : '/apps/platform/development-platform/ide/app-center/index.html';
            // 移除可能存在的引号
            deployPath = deployPath.replace(/[`'"]/g, '');
            
            window.top?.postMessage({
                eventType: 'invoke',
                method: 'openUrl',
                params: [id, code, name, deployPath]
            });
        }

        function openDomainScen(domain: Record<string, any>) {
            const id = domain.domainId;
            const code = domain.domainCode;
            const name = domain.domainName;
            domain.url = "http://139.196.147.52:2400/#/domain/scene/list?domainId=" + id;
            // 使用domain中的url字段，如果为空则使用默认路径
            let deployPath = domain.url && domain.url.trim() ? domain.url.trim() : '/apps/platform/development-platform/ide/app-center/index.html';
            // 移除可能存在的引号
            deployPath = deployPath.replace(/[`'"]/g, '');
            
            window.top?.postMessage({
                eventType: 'invoke',
                method: 'openUrl',
                params: [id, code, name, deployPath]
            });
        }

        return () => {
            return (
                <div class="f-page f-page-is-managelist">
                    <FPageHeader title="领域列表" buttons={items}></FPageHeader>
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
                                                        <i class="f-icon f-icon-engineering"></i>
                                                    </div>
                                                    <div class="listview-item-main">
                                                        <h4 class="listview-item-title">{item.domainName}</h4>
                                                        <h5 class="listview-item-subtitle">{item.domainCode}</h5>
                                                        <span class={getBageClass(item)}>{statusMap.get(item.status)}</span>
                                                    </div>
                                                </div>
                                                <div class="f-domain-card-content">
                                                    <p>{item.domainDescription}</p>
                                                </div>
                                                <div class="f-domain-card-footer f-btn-group">
                                                    <div class="btn-group f-btn-group-links">
                                                        <FButton icon="f-icon f-icon-edit-cardview" type="link" onClick={() => openDomainPlatform(item)}></FButton>
                                                        <FButton icon="f-icon f-icon-share" type="link" onClick={() => openDomainScen(item)}></FButton>
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
