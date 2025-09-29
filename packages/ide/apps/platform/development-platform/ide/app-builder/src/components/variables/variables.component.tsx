import { computed, defineComponent, ref } from "vue";
import { FButton, FListView, FProgress, FSection, FPageHeader } from "@farris/ui-vue";
import { VariablesProps, variablesProps } from "./variables.props";
import { mockVariablesTask } from './mock-data';
import './variables.scss';
import { VariablesTask } from "./type";

export default defineComponent({
    name: 'FAppVaribles',
    props: variablesProps,
    emits: [],
    setup(props: VariablesProps, context) {

        const title = '场景应用低代码平台开发（复旦大学物理楼）';
        const menuListViewRef = ref();
        const currentView = ref('listView');
        const variablesTask = ref<VariablesTask[]>(mockVariablesTask);
        const shouldShowListView = computed(() => currentView.value === 'listView');
        const shouldShowCardView = computed(() => currentView.value === 'cardView');
        const items = [{ id: 'addMenu', text: '新增菜单', class: 'btn-primary', onClick: () => void 0 }];
        const variable = ref({
            name: '机器人水平距离',
            id: 'Robot_horizontal_distance',
            type: 'String',
            description: '送餐机器人和咖啡机的水平距离，用于控制机器人在不同距离下的协调操作。',
            initialValue: ''
        });

        function searchToolbar() {
            return (

                <div class="nav-menu">
                    <h3>菜单列表</h3>

                    <FListView ref={menuListViewRef} data={variablesTask.value}>
                        {{
                            content: ({ item, index, selectedItem }) => {
                                return (

                                    <div class="right-info">
                                        <div>
                                            <div class="form-item">
                                                <p>{item.title}</p>
                                            </div>
                                        </div>
                                    </div>

                                );
                            }
                        }}
                    </FListView>
                </div >

            );
        }


        function rendermenuTaskList() {
            return <FSection class="f-utils-fill-flex-column">
                <FListView ref={menuListViewRef}  data={variable.value}>
                    {{

                        content: ({ item, index, selectedItem }) => {
                            return (

                                <div class="variable-form">

                                    <div class="form-item">
                                        <label>名称</label>
                                        {item.name}
                                    </div>
                                    <div class="form-item">
                                        <label>变量ID</label>
                                       {item.id}
                                    </div>
                                    <div class="form-item">
                                        <label>变量类型</label>
                                        {item.type}
                                    </div>
                                    <div class="form-item">
                                        <label>变量描述</label>
                                        {item.description}
                                    </div>
                                    <div class="form-item">
                                        <label>关联设备</label>
                                        <div>
                                            <input placeholder="搜索设备" />

                                        </div>

                                        <div class="form-item">
                                            <label>初始化</label>
                                           
                                        </div>
                                        <div class="action-bar">
                                            <button >保存</button>
                                            <button >关闭</button>
                                        </div>
                                    </div >
                                </div >

                            );
                        }
                    }}
                </FListView >
            </FSection >;
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-menu">
                    <FPageHeader title="景应用低代码平台开发（复旦大学物理楼）" buttons={items}></FPageHeader>
                    <div class="f-admin-main-content">
                        {searchToolbar()}
                        <div class="f-page-main">
                            {shouldShowListView.value && rendermenuTaskList()}
                        </div>
                    </div>
                </div>
            );
        };
    }
});