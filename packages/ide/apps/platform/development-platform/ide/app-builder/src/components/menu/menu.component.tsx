import { computed, defineComponent, ref } from "vue";
import { FButton, FListView, FProgress, FSection,FPageHeader } from "@farris/ui-vue";
import { menuProps, MenuProps } from "./menu.props";
import { mockMenuTask } from './mock-data';
import { MenuTask } from "./type";

export default defineComponent({
    name: 'FAppMenu',
    props: menuProps,
    emits: [],
    setup(props: MenuProps, context) {
        const title = '菜单管理';
        const menuListViewRef = ref();
        const menuTasks = ref<MenuTask[]>(mockMenuTask);
        const currentView = ref('listView');
        const shouldShowListView = computed(() => currentView.value === 'listView');
        const shouldShowCardView = computed(() => currentView.value === 'cardView');
        const items = [{ id: 'addMenus', text: '新增菜单', class: 'btn-primary', onClick: () => void 0 }];     
       
        function searchToolbar() {
            return (

                <div class="left-menu">
                    <h3>菜单列表</h3>
                    {/* <div class="menu-item" >
                        <span>咖啡服务</span>
                        <i class="icon"></i>
                    </div >
                    <div >
                        <div class="sub-menu-item" >
                            <i class="icon"></i>咖啡点单
                        </div>
                        <div class="sub-menu-item"  >
                            <i class="icon"></i>送餐服务
                        </div >
                    </div >
                    <div class="menu-item">
                        <span>会议服务</span>
                        <i class="icon" ></i>
                    </div > */}
                </div >

            );
        }

        function rendermenuTaskList() {
            return <FSection class="f-utils-fill-flex-column">
                <FListView ref={menuListViewRef}>
                    {{

                        // content: ({ item, index, selectedItem }) => {
                        //     return (

                        //         <div class="right-info">
                        //             <h3>菜单信息</h3>
                        //             <div class="form-item">
                        //                 <label>名称</label>
                        //                 {item.name}
                        //             </div>
                        //             <div class="form-item">
                        //                 <label>菜单代码</label>
                        //                 {item.menuCode}
                        //             </div>
                        //             <div class="form-item">
                        //                 <label>绑定页面流</label>
                        //                 <select >{item.pageFlow}
                        //                     <option value="coffeeOrderPageFlow">咖啡点单页面流</option>

                        //                 </select>
                        //             </div>
                        //             <div class="form-item">
                        //                 <label>自定义JS</label>
                        //                 <textarea >{item.customJS}</textarea>
                        //                 <button >打开编辑器</button>
                        //             </div>
                        //             <div class="action-bar">
                        //                 <button >保存</button>
                        //                 <button >关闭</button>
                        //             </div>
                        //         </div>

                        //     );
                        // }
                    }}
                </FListView >
            </FSection >;
        }
        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-menu">
                     <FPageHeader title="菜单管理" buttons={items}></FPageHeader>
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
