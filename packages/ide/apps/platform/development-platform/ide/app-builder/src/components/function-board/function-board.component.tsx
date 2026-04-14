import { computed, defineComponent, inject, onMounted, ref, watch } from 'vue';
import { FListView, FNav, FButton } from '@farris/ui-vue';
import { FunctionBoardProps, functionBoardProps } from './function-board.props';
import { FunctionItem, MenuGroupItem, UseFunctionInstance } from '../../composition/types';
import { usePublish, PageFlowPage } from './use-publish.composition';

export default defineComponent({
    name: 'FAFunctionBoard',
    props: functionBoardProps,
    emits: ['FunctionOpened', 'OpenFunction'],
    setup(props: FunctionBoardProps, context) {
        const functionListViewRef = ref();
        const functionListViewWrapperRef = ref();
        const functionListViewContainerRef = ref();
        const functionItems = ref<FunctionItem[]>(props.functionItems || []);
        const group = { enable: true, groupFields: ['category'] };
        const menutItems = ref<MenuGroupItem[]>(props.menuItems || []);
        const useFunctionInstanceComposition = inject('f-admin-function-instance') as UseFunctionInstance;
        const { open } = useFunctionInstanceComposition;
        const notifyService: any = null;

        const shouldShowMenuItems = computed(() => props.menuItems && props.menuItems.length > 0);
        const topOfPostion = 0;
        const offsetY = ref(0);

        const functionGroupsStyle = computed(() => {
            return {
                'display': 'flex',
                'transform': `translateY(${offsetY.value}px)`
            };
        });

        // ============ 发布菜单相关 ============
        const publishComposition = usePublish();
        const {
            pages,
            currentPage,
            publishState,
            publishForm,
            ancestorInfo,
            pageFlowConfig,
            loadPageFlowConfig,
            loadPageFlowContent,
            selectPage,
            initNewPublish,
            publishMenu
        } = publishComposition;

        const publishInitialized = ref(false);
        const activePageId = ref('');

        onMounted(async () => {
            try {
                await loadPageFlowConfig();
                if (pageFlowConfig.value) {
                    await loadPageFlowContent(pageFlowConfig.value.pageFlowMetadataID);
                    publishInitialized.value = true;
                    if (pages.value.length > 0) {
                        activePageId.value = pages.value[0].id;
                        await selectPage(pages.value[0]);
                    }
                }
            } catch {
                publishInitialized.value = true;
            }
        });

        async function onClickPageNavItem(page: PageFlowPage) {
            activePageId.value = page.id;
            await selectPage(page);
        }

        function onClickNewPublish() {
            initNewPublish();
        }

        async function onClickConfirmPublish() {
            const form = publishForm.value;
            if (!form.menuCode || !form.menuName) {
                notifyService?.warning({ message: '请填写菜单编号和菜单名称' });
                return;
            }
            if (!form.groupId && !form.groupName) {
                notifyService?.warning({ message: '请选择或新建菜单分组' });
                return;
            }
            const result = await publishMenu();
            if (result) {
                notifyService?.success({ message: '发布菜单成功' });
            } else {
                notifyService?.show({ type: 'error', message: '发布菜单失败' });
            }
        }

        function onClickCancelPublish() {
            publishState.value.showForm = false;
        }

        function onAddParam() {
            publishForm.value.staticParams.push({ name: '', value: '' });
        }

        function onRemoveParam(index: number) {
            publishForm.value.staticParams.splice(index, 1);
        }

        // ============ 原有功能菜单逻辑 ============

        watch(() => props.functionItems, (latestFunctionItems: FunctionItem[]) => {
            functionItems.value = latestFunctionItems;
            functionListViewRef.value?.updateDataSource(functionItems.value);
        });

        function onClickMenuItemNavigation(menuItem: MenuGroupItem) {
            functionItems.value = menuItem.functions;
            functionListViewRef.value.updateDataSource(functionItems.value);
        }

        function onClickFunctionItem(functionItem: FunctionItem) {
            context.emit('OpenFunction', functionItem);
            context.emit('FunctionOpened');
        }

        function renderMenuItemsNavigation() {
            if (!publishInitialized.value || pages.value.length === 0) {
                return <div class="f-admin-function-board-menu-items">
                    <span class="f-publish-empty-hint">暂无可发布的页面</span>
                </div>;
            }

            const navData = pages.value.map((page: PageFlowPage) => ({
                id: page.id,
                text: page.name,
                code: page.code
            }));

            return <div class="f-admin-function-board-menu-items">
                <FNav
                    activeNavId={activePageId.value}
                    navData={navData}
                    displayField="text"
                    onNav={(item: any) => {
                        const page = pages.value.find(p => p.id === item.id);
                        if (page) onClickPageNavItem(page);
                    }}
                />
            </div>;
        }

        function renderFormField(label: string, required: boolean, content: () => any) {
            return <div class="f-publish-form-field">
                <label class={{ 'f-publish-form-label': true, 'required': required }}>{label}</label>
                <div class="f-publish-form-control">{content()}</div>
            </div>;
        }

        function renderParamsTable() {
            const params = publishForm.value.staticParams;
            return <div class="f-publish-params-section">
                <div class="f-publish-params-title">参数设置</div>
                <table class="f-publish-params-table">
                    <thead>
                        <tr>
                            <th>参数名称</th>
                            <th>参数值</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {params.map((param, index) => (
                            <tr key={index}>
                                <td>
                                    <input
                                        class="f-publish-input"
                                        title="参数名称"
                                        value={param.name}
                                        onInput={(e: Event) => { param.name = (e.target as HTMLInputElement).value; }}
                                    />
                                </td>
                                <td>
                                    <input
                                        class="f-publish-input"
                                        title="参数值"
                                        value={param.value}
                                        onInput={(e: Event) => { param.value = (e.target as HTMLInputElement).value; }}
                                    />
                                </td>
                                <td>
                                    <button class="f-publish-btn-link f-publish-btn-danger" onClick={() => onRemoveParam(index)}>删除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <button class="f-publish-btn-add-param" onClick={onAddParam}>
                    <i class="f-icon f-icon-add"></i> 新增参数
                </button>
            </div>;
        }

        function renderPublishForm() {
            const form = publishForm.value;
            const state = publishState.value;
            const isReadonly = state.published;

            return <div class="f-publish-form">
                {renderFormField('关键应用', true, () =>
                    <input class="f-publish-input" title="关键应用" value={form.productName} readonly />
                )}
                {renderFormField('模块', true, () =>
                    <input class="f-publish-input" title="模块" value={form.moduleName} readonly />
                )}
                {renderFormField('菜单分组', true, () =>
                    <div class="f-publish-group-field">
                        <div class="f-publish-group-toggle">
                            <button
                                class={{ 'f-publish-toggle-btn': true, 'active': !form.groupIsNew }}
                                onClick={() => { form.groupIsNew = false; }}
                                disabled={isReadonly}
                            >已有分组</button>
                            <button
                                class={{ 'f-publish-toggle-btn': true, 'active': form.groupIsNew }}
                                onClick={() => { form.groupIsNew = true; }}
                                disabled={isReadonly}
                            >新建分组</button>
                        </div>
                        <input
                            class="f-publish-input"
                            title="菜单分组"
                            placeholder={form.groupIsNew ? '请输入新分组名称' : '请输入已有分组名称'}
                            value={form.groupName}
                            readonly={isReadonly}
                            onInput={(e: Event) => { form.groupName = (e.target as HTMLInputElement).value; }}
                        />
                    </div>
                )}
                {renderFormField('功能操作', true, () =>
                    <input
                        class="f-publish-input"
                        title="功能操作"
                        value={form.bizOpId}
                        readonly={isReadonly}
                        onInput={(e: Event) => {
                            form.bizOpId = (e.target as HTMLInputElement).value;
                            form.bizOpCode = form.bizOpId;
                        }}
                    />
                )}
                {renderFormField('菜单编号', true, () =>
                    <input
                        class="f-publish-input"
                        title="菜单编号"
                        value={form.menuCode}
                        readonly={isReadonly}
                        onInput={(e: Event) => { form.menuCode = (e.target as HTMLInputElement).value; }}
                    />
                )}
                {renderFormField('菜单名称', true, () =>
                    <input
                        class="f-publish-input"
                        title="菜单名称"
                        value={form.menuName}
                        readonly={isReadonly}
                        onInput={(e: Event) => { form.menuName = (e.target as HTMLInputElement).value; }}
                    />
                )}
                {renderFormField('菜单类型', true, () =>
                    <div class="f-publish-radio-group">
                        <label class={{ 'f-publish-radio': true, 'checked': form.menuType === 'SysMenu' }}>
                            <input
                                type="radio"
                                name="menuType"
                                value="SysMenu"
                                checked={form.menuType === 'SysMenu'}
                                disabled={isReadonly}
                                onChange={() => { form.menuType = 'SysMenu'; }}
                            />
                            <span class="f-publish-radio-dot" />
                            <span>菜单</span>
                        </label>
                        <label class={{ 'f-publish-radio': true, 'checked': form.menuType === 'QueryMenu' }}>
                            <input
                                type="radio"
                                name="menuType"
                                value="QueryMenu"
                                checked={form.menuType === 'QueryMenu'}
                                disabled={isReadonly}
                                onChange={() => { form.menuType = 'QueryMenu'; }}
                            />
                            <span class="f-publish-radio-dot" />
                            <span>联查</span>
                        </label>
                    </div>
                )}
                {renderParamsTable()}
                {!isReadonly && <div class="f-publish-form-footer">
                    <button class="f-publish-btn f-publish-btn-default" onClick={onClickCancelPublish}>取消</button>
                    <button class="f-publish-btn f-publish-btn-primary" onClick={onClickConfirmPublish}>
                        {publishState.value.loading ? '发布中...' : '确定'}
                    </button>
                </div>}
            </div>;
        }

        function renderFunctionGroupHeader({ item, index, selectedItem }) {
            return <div class="f-admin-function-group">
                <div class="f-admin-function-group-icon"><i class="f-icon f-icon-paste-plain-text"></i></div>
                <span>{item.value}</span>
            </div>;
        }

        function renderFunctionItem({ item, index, selectedItem }) {
            return <div class="f-admin-function-item" onClick={() => onClickFunctionItem(item)}>
                <span>{item.name}</span>
            </div>;
        }

        function onWheel(payload: WheelEvent) {
            payload.preventDefault();
            payload.stopPropagation();

            const deltaY = ((payload as any).wheelDeltaY || payload.deltaY) / 10;
            let offsetYValue = offsetY.value + deltaY;
            const containerHeight = (functionListViewContainerRef.value as HTMLElement).getBoundingClientRect().height;
            const navigationPanelHeight = (functionListViewWrapperRef.value as HTMLElement).getBoundingClientRect().height;
            if (offsetYValue < containerHeight - navigationPanelHeight) {
                offsetYValue = containerHeight - navigationPanelHeight;
            }
            if (offsetYValue > topOfPostion) {
                offsetYValue = topOfPostion;
            }
            offsetY.value = offsetYValue;
        }

        function renderFunctionBoard() {
            const state = publishState.value;

            if (state.loading) {
                return <div class="f-publish-loading">
                    <span>加载中...</span>
                </div>;
            }

            if (!currentPage.value) {
                return <div class="f-publish-empty">
                    <span>请在左侧选择一个页面</span>
                </div>;
            }

            if (!state.showForm && !state.published) {
                return <div class="f-publish-empty">
                    <div class="f-publish-empty-content">
                        <p class="f-publish-empty-text">尚未发布，点击新增菜单按钮发布</p>
                        <button class="f-publish-btn f-publish-btn-primary" onClick={onClickNewPublish}>
                            <i class="f-icon f-icon-add"></i> 新增菜单
                        </button>
                    </div>
                </div>;
            }

            return <div class="f-publish-board">
                <div class="f-publish-board-header">
                    <span class="f-publish-board-title">发布菜单</span>
                </div>
                {renderPublishForm()}
            </div>;
        }

        return () => {
            return (
                <div class="f-admin-function-board f-publish-container">
                    {renderMenuItemsNavigation()}
                    <div class="f-admin-function-board-content" ref={functionListViewContainerRef}>
                        {renderFunctionBoard()}
                    </div>
                </div>
            );
        };
    }
});
