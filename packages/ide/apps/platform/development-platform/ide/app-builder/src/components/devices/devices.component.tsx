import { computed, defineComponent, ref } from "vue";
import { FButton, FListView, FProgress, FSection, FPageHeader } from "@farris/ui-vue";
import { DevicesProps, devicesProps } from "./devices.props";
import { mockDevicesTasks } from './mock-data';
import { DevicesTask } from "./type";

export default defineComponent({
    name: 'FAppDevices',
    props: devicesProps,
    emits: [],
    setup(props: DevicesProps, context) {
        const title = '自助咖啡服务-菜单管理';
        const devicesListViewRef = ref();
        const devicesTasks = ref<DevicesTask[]>(mockDevicesTasks);
        const currentView = ref('listView');
        const shouldShowListView = computed(() => currentView.value === 'listView');
        const shouldShowCardView = computed(() => currentView.value === 'cardView');
        const items = [{ id: 'addDevices', text: '新增设备', class: 'btn-primary', onClick: () => void 0 }];
        function renderTitleArea() {
            return (
                <div class="f-title">
                    <div class="f-title-logo"></div>
                    <h4 class="f-title-text">{title}</h4>
                    <button class="add-btn">新增设备</button>
                </div>
            );
        }

        function onClickNewTask() {
            currentView.value = 'cardView';

        }

        function onClickdevicesCard(payload: string) {
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

                <div class="filter">
                    <div class="filter-item">
                        <label>设备名称</label>
                        <input type="text" placeholder="请输入" />
                    </div>
                    <div class="filter-item">
                        <label>设备状态</label>
                        <select>
                            <option>请选择</option>
                            <option>已启用</option>
                            <option>未启用</option>
                        </select>
                    </div>
                    <button class="filter-btn">筛选</button>
                </div>
            );
        }

        function renderdevicesTaskList() {
            return <FSection class="f-utils-fill-flex-column">
                <h2>设备列表</h2>
                <FListView ref={devicesListViewRef} data={devicesTasks.value}>
                    {{

                        content: ({ item, index, selectedItem }) => {
                            return (
                                <div class="device-list">

                                    <div>

                                        <div class="device-item">
                                            <div class="device-info">

                                                <div>
                                                    <h3>{item.name}</h3>
                                                    <p>设备类型: {item.type}</p>
                                                    <p>设备组: {item.group}</p>
                                                </div>
                                            </div>
                                            <div class="status">
                                                <FProgress percent={item.status}></FProgress>
                                            </div>
                                            <div class="actions">
                                                <button>编辑逻辑</button>
                                                <button>删除</button>
                                                <button class="detail-btn">详情</button>
                                            </div>
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
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-devices">
                    <FPageHeader title="自助咖啡服务-设备管理" buttons={items}></FPageHeader>
                    <div class="f-admin-main-content">
                        {searchToolbar()}
                        <div class="f-page-main">
                            {shouldShowListView.value && renderdevicesTaskList()}

                        </div>
                    </div>
                </div>
            );
        };
    }
});
