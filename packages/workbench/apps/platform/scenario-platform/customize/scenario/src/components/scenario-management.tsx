import { defineComponent, onMounted, ref } from "vue";
import { FButton, FDynamicForm, FDynamicFormGroup, FListView, FPageHeader, FSection } from "@farris/ui-vue";

import './scenario-management.css';
import { useScenario } from "../composition/use-scenario";

export default defineComponent({
    name: "FAScenarioManagement",
    setup() {
        const scenarioListViewRef = ref();
        const { scenarios, getScenarios, createScenario } = useScenario();
        const items = [{ id: 'createScenario', text: '创建场景', class: 'btn-primary', onClick: () => createScenario() }];
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
            getScenarios().then((scenarios: Record<string, any>[]) => {
                scenarioListViewRef.value.updateDataSource(scenarios);
            });
        });

        function editScenarioPlatform(scenario: Record<string, any>) {
            const id = scenario.sceneId;
            const code = scenario.sceneCode;
            const name = scenario.sceneName;
            //scenario.url = "http://139.196.147.52:2400/#/meta/scenario/setting?mode=edit&scenarioId=" + id;
            // 使用scenario中的url字段，如果为空则使用默认路径
            let deployPath = scenario.url && scenario.url.trim() ? scenario.url.trim() : '/apps/platform/development-platform/ide/app-center/index.html';
            // 移除可能存在的引号
            deployPath = deployPath.replace(/[`'"]/g, '');

            window.top?.postMessage({
                eventType: 'invoke',
                method: 'openUrl',
                params: [id, code, name, deployPath]
            });
        }

        function openScenarioPlatform(scenario: Record<string, any>) {
            const id = scenario.sceneId;
            const code = scenario.sceneCode;
            const name = scenario.sceneName;
            //TODO: 临时解决方案，后续需要从scenario中获取url
            scenario.url = "http://localhost:5174/apps/platform/development-platform/ide/app-center/index.html";
            // 使用scenario中的url字段，如果为空则使用默认路径
            let deployPath = scenario.url && scenario.url.trim() ? scenario.url.trim() : '/apps/platform/development-platform/ide/app-center/index.html';
            // 移除可能存在的引号
            deployPath = deployPath.replace(/[`'"]/g, '');

            // 构建完整的URL，包含必要的参数
            const url = new URL(deployPath, window.location.origin);
            url.searchParams.append('scenarioId', id);

            // 在新浏览器窗口中打开URL
            window.open(url.toString(), '_blank', 'noopener,noreferrer');
        }

        return () => {
            return (
                <div class="f-page f-page-is-managelist">
                    <FPageHeader title="场景列表" buttons={items}></FPageHeader>
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
                            <FListView ref={scenarioListViewRef} data={scenarios.value} view="CardView">
                                {{
                                    content: ({ item, index, selectedItem }) => {
                                        return (
                                            <div class="f-scenario-card f-template-card-row">
                                                <div class="f-scenario-card-header listview-item-content">
                                                    <div class="listview-item-icon" style={getIconColor(item)}>
                                                        <i class="f-icon f-icon-engineering"></i>
                                                    </div>
                                                    <div class="listview-item-main">
                                                        <h4 class="listview-item-title">{item.sceneName}</h4>
                                                        <h5 class="listview-item-subtitle">{item.sceneCode}</h5>
                                                        <span class={getBageClass(item)}>{statusMap.get(item.status)}</span>
                                                    </div>
                                                </div>
                                                <div class="f-scenario-card-content">
                                                    <p>{item.sceneDescription}</p>
                                                </div>
                                                <div class="f-scenario-card-footer f-btn-group">
                                                    <div class="btn-group f-btn-group-links">
                                                        <FButton icon="f-icon f-icon-edit-cardview" type="link" onClick={() => editScenarioPlatform(item)}></FButton>
                                                        <FButton icon="f-icon f-icon-share" type="link" onClick={() => openScenarioPlatform(item)}></FButton>
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
