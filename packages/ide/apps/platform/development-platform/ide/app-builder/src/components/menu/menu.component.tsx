import { computed, defineComponent, inject, onMounted, ref } from 'vue';
import { FPageHeader } from '@farris/ui-vue';
import { menuProps, MenuProps } from './menu.props';
import { usePublish, PageFlowPage } from '../function-board/use-publish.composition';
import { MenuSummaryItem, useMenuSummary } from './use-menu-summary.composition';
import { UseWorkspace } from '../../composition/types';

export default defineComponent({
    name: 'FAppMenu',
    props: menuProps,
    emits: [],
    setup(props: MenuProps) {
        const notifyService = inject('FNotifyService') as any;
        const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
        const { options } = useWorkspaceComposition;
        const publishComposition = usePublish();
        const menuSummaryComposition = useMenuSummary() as any;
        const {
            currentPage,
            publishState,
            publishForm,
            selectPage,
            initNewPublish,
            publishMenu,
            unpublishMenu
        } = publishComposition;
        const {
            menuSummaryItems,
            loadingSummary,
            ancestorSummary,
            loadMenuSummaryItems,
            loadAncestorSummary,
            fetchMenuDetailFromApi,
            fetchParentGroupByParentId,
            refreshPublishedStateOnly
        } = menuSummaryComposition;

        const initialized = ref(false);
        const activeSummaryId = ref('');

        function getDefaultGroupFromCurrentBo(): { groupId: string; groupName: string } {
            const groupId = String(options.boId || '').trim();
            const groupName = String(options.appName || '').trim() || groupId;
            return { groupId, groupName };
        }

        function applyDefaultGroupToForm(force = false): void {
            const defaults = getDefaultGroupFromCurrentBo();
            if (!defaults.groupId) {
                return;
            }
            if (force || !String(publishForm.value.groupId || '').trim()) {
                publishForm.value.groupId = defaults.groupId;
            }
            if (force || !String(publishForm.value.groupName || '').trim()) {
                publishForm.value.groupName = defaults.groupName;
            }
            publishForm.value.groupIsNew = false;
        }

        const headerButtons = computed(() => {
            return []
            // return [{
            //     id: 'addMenus',
            //     text: '新增菜单',
            //     class: 'btn-primary',
            //     onClick: onClickNewPublish
            // }];
        });

        onMounted(async () => {
            try {
                await loadMenuSummaryItems();
                const firstSummary = menuSummaryItems.value[0];
                if (firstSummary) {
                    await onClickSummaryItem(firstSummary);
                }
            } catch {
                notifyService?.show?.({ type: 'error', message: '加载菜单项失败' });
            } finally {
                initialized.value = true;
            }
        });

        function buildPageFromSummary(summaryItem: MenuSummaryItem): PageFlowPage {
            return {
                id: summaryItem.metadataId,
                code: summaryItem.code,
                name: summaryItem.name,
                fileName: summaryItem.metadata.fileName || '',
                relativePath: summaryItem.metadata.relativePath || '',
                formUri: summaryItem.metadataId,
                routeUri: summaryItem.code,
                routeParams: null
            };
        }

        function resetFormBySummary(summaryItem: MenuSummaryItem) {
            publishForm.value.menuCode = summaryItem.code;
            publishForm.value.menuName = summaryItem.name;
            applyDefaultGroupToForm(true);
            publishForm.value.menuType = 'SysMenu';
            publishForm.value.staticParams = [];
            publishForm.value.bizOpId = 'BOManager';
            publishForm.value.bizOpCode = 'BOManager';
        }

        function applyAncestorToForm() {
            publishForm.value.productId = ancestorSummary.value.productId;
            publishForm.value.productName = ancestorSummary.value.productName;
            publishForm.value.moduleId = ancestorSummary.value.moduleId;
            publishForm.value.moduleName = ancestorSummary.value.moduleName;
        }

        function parseStaticParams(rawStaticParams: unknown): { name: string; value: string }[] {
            if (Array.isArray(rawStaticParams)) {
                return rawStaticParams.map((item: any) => ({
                    name: item?.name || '',
                    value: item?.value || ''
                }));
            }
            if (typeof rawStaticParams !== 'string' || !rawStaticParams) {
                return [];
            }
            try {
                const parsed = JSON.parse(rawStaticParams);
                return Array.isArray(parsed)
                    ? parsed.map((item: any) => ({ name: item?.name || '', value: item?.value || '' }))
                    : [];
            } catch {
                return [];
            }
        }

        function applyMenuDetailToForm(menuDetail: Record<string, any>, summaryItem: MenuSummaryItem) {
            publishForm.value.menuCode = menuDetail.code || summaryItem.code;
            publishForm.value.menuName = menuDetail.name || summaryItem.name;
            publishForm.value.menuType = (menuDetail.menuType as 'SysMenu' | 'QueryMenu') || 'SysMenu';
            publishForm.value.bizOpId = menuDetail.bizOpId || 'BOManager';
            publishForm.value.bizOpCode = menuDetail.bizOpCode || publishForm.value.bizOpId || 'BOManager';
            /** 菜单分组由 GET 上级（parentId）结果单独合并，不在此用 parentId 占位 */
            publishForm.value.staticParams = parseStaticParams(menuDetail.staticParams);
        }

        function applyParentGroupFields(parentIdRaw: string, parentGroup: { groupId: string; groupName: string } | null) {
            if (parentGroup?.groupId) {
                publishForm.value.groupId = parentGroup.groupId;
                publishForm.value.groupName = parentGroup.groupName;
                publishForm.value.groupIsNew = false;
                return;
            }
            const fallback = (parentIdRaw || '').trim();
            if (fallback) {
                publishForm.value.groupId = fallback;
                publishForm.value.groupName = '';
                publishForm.value.groupIsNew = false;
            } else {
                publishForm.value.groupId = '';
                publishForm.value.groupName = '';
                publishForm.value.groupIsNew = false;
            }
        }

        async function onClickSummaryItem(summaryItem: MenuSummaryItem) {
            activeSummaryId.value = summaryItem.id;
            await loadAncestorSummary();
            applyAncestorToForm();

            /** 与左侧列表同源：不依赖页面流 pages（未加载页面流时为空），始终用 Form 摘要构造当前页并走 selectPage（拉 gspapp / AppInvoke） */
            const pageFromSummary = buildPageFromSummary(summaryItem);
            await selectPage(pageFromSummary);
            const mid = summaryItem.metadataId;
            currentPage.value = {
                ...currentPage.value!,
                id: mid,
                formUri: mid
            };

            const menuDetail = await fetchMenuDetailFromApi(summaryItem.metadataId);
            if (menuDetail) {
                applyMenuDetailToForm(menuDetail, summaryItem);
                const parentIdRaw =
                    menuDetail.parentId ??
                    (menuDetail as Record<string, any>).ParentId ??
                    (menuDetail as Record<string, any>).parentID ??
                    (menuDetail as Record<string, any>).ParentID ??
                    '';
                const parentIdStr = parentIdRaw === undefined || parentIdRaw === null ? '' : String(parentIdRaw);
                const parentGroup = parentIdStr ? await fetchParentGroupByParentId(parentIdStr) : null;
                applyParentGroupFields(parentIdStr, parentGroup);
                publishState.value.published = true;
                publishState.value.showForm = true;
                publishState.value.loading = false;
            } else {
                resetFormBySummary(summaryItem);
                publishState.value.published = false;
                publishState.value.showForm = true;
                publishState.value.loading = false;
            }
            applyAncestorToForm();
        }

        async function onClickNewPublish() {
            if (!currentPage.value) {
                const fallbackSummary = menuSummaryItems.value[0];
                if (fallbackSummary) {
                    await onClickSummaryItem(fallbackSummary);
                } else {
                    publishState.value.published = false;
                    publishState.value.showForm = true;
                    publishForm.value.menuCode = '';
                    publishForm.value.menuName = '';
                    applyDefaultGroupToForm(true);
                    publishForm.value.menuType = 'SysMenu';
                    publishForm.value.staticParams = [];
                    return;
                }
            }
            initNewPublish();
        }

        async function onClickConfirmPublish() {
            const form = publishForm.value;
            if (!form.menuCode || !form.menuName) {
                notifyService?.warning?.({ message: '请填写菜单编号和菜单名称' });
                return;
            }
            const result = await publishMenu();
            if (result) {
                notifyService?.success?.({ message: '发布菜单成功' });
                await refreshPublishedStateOnly();
                const currentSummary = menuSummaryItems.value.find(item => item.id === activeSummaryId.value);
                if (currentSummary) {
                    await onClickSummaryItem(currentSummary);
                }
            } else {
                notifyService?.show?.({ type: 'error', message: '发布菜单失败' });
            }
        }

        function onClickCancelDraft() {
            publishState.value.showForm = false;
        }

        async function onClickUnpublish() {
            const result = await unpublishMenu();
            if (result) {
                notifyService?.success?.({ message: '取消发布成功' });
                await refreshPublishedStateOnly();
                const currentSummary = menuSummaryItems.value.find(item => item.id === activeSummaryId.value);
                if (currentSummary) {
                    await onClickSummaryItem(currentSummary);
                }
            } else {
                notifyService?.show?.({ type: 'error', message: '取消发布失败' });
            }
        }

        function onAddParam() {
            publishForm.value.staticParams.push({ name: '', value: '' });
        }

        function onRemoveParam(index: number) {
            publishForm.value.staticParams.splice(index, 1);
        }

        function renderLeftNavigation() {
            if (!initialized.value || loadingSummary.value) {
                return <div class="menu-left-loading">加载中...</div>;
            }

            if (menuSummaryItems.value.length === 0) {
                return <div class="menu-left-empty">暂无可展示菜单项</div>;
            }

            return <div class="menu-left-nav">
                <div class="menu-summary-table-header">
                    <span>名称</span>
                    <span>编号</span>
                    <span>发布状态</span>
                </div>
                <div class="menu-summary-table-body">
                    {menuSummaryItems.value.map(summaryItem => (
                        <div
                            key={summaryItem.id}
                            class={{ 'menu-summary-row': true, 'active': activeSummaryId.value === summaryItem.id }}
                            onClick={() => onClickSummaryItem(summaryItem)}
                        >
                            <span class="menu-summary-name" title={summaryItem.name}>{summaryItem.name}</span>
                            <span class="menu-summary-code" title={summaryItem.code}>{summaryItem.code}</span>
                            <span class={{ 'menu-summary-status': true, 'published': summaryItem.published }}>
                                {summaryItem.statusText}
                            </span>
                        </div>
                    ))}
                </div>
            </div>;
        }

        function renderFormField(label: string, required: boolean, content: () => any) {
            return <div class="menu-form-field">
                <label class={{ 'menu-form-label': true, 'required': required }}>{label}</label>
                <div class="menu-form-control">{content()}</div>
            </div>;
        }

        function renderParamsTable(readonly: boolean) {
            const params = publishForm.value.staticParams;
            return <div class="menu-params-section">
                <div class="menu-params-title">参数设置</div>
                <table class="menu-params-table">
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
                                        class="menu-input"
                                        title="参数名称"
                                        value={param.name}
                                        readonly={readonly}
                                        onInput={(event: Event) => { param.name = (event.target as HTMLInputElement).value; }}
                                    />
                                </td>
                                <td>
                                    <input
                                        class="menu-input"
                                        title="参数值"
                                        value={param.value}
                                        readonly={readonly}
                                        onInput={(event: Event) => { param.value = (event.target as HTMLInputElement).value; }}
                                    />
                                </td>
                                <td>
                                    {!readonly && <button class="menu-btn-link menu-btn-danger" onClick={() => onRemoveParam(index)}>删除</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!readonly && <button class="menu-btn-add-param" onClick={onAddParam}>+ 新增参数</button>}
            </div>;
        }

        function renderMenuForm() {
            const state = publishState.value;
            const form = publishForm.value;
            const readonly = state.published;

            return <div class="menu-form">
                {renderFormField('关键应用', true, () => <input class="menu-input" title="关键应用" value={form.productName} readonly />)}
                {renderFormField('模块', true, () => <input class="menu-input" title="模块" value={form.moduleName} readonly />)}
                {renderFormField('菜单分组', true, () =>
                    <input
                        class="menu-input"
                        title="菜单分组"
                        value={form.groupName}
                        readonly
                    />
                )}
                {renderFormField('功能操作', true, () =>
                    <input
                        class="menu-input"
                        title="功能操作"
                        value={form.bizOpId}
                        readonly={readonly}
                        onInput={(event: Event) => {
                            form.bizOpId = (event.target as HTMLInputElement).value;
                            form.bizOpCode = form.bizOpId;
                        }}
                    />
                )}
                {renderFormField('菜单编号', true, () =>
                    <input
                        class="menu-input"
                        title="菜单编号"
                        value={form.menuCode}
                        readonly={readonly}
                        onInput={(event: Event) => { form.menuCode = (event.target as HTMLInputElement).value; }}
                    />
                )}
                {renderFormField('菜单名称', true, () =>
                    <input
                        class="menu-input"
                        title="菜单名称"
                        value={form.menuName}
                        readonly={readonly}
                        onInput={(event: Event) => { form.menuName = (event.target as HTMLInputElement).value; }}
                    />
                )}
                {renderFormField('菜单类型', true, () =>
                    <div class="menu-radio-group">
                        <label class={{ 'menu-radio': true, 'checked': form.menuType === 'SysMenu' }}>
                            <input
                                type="radio"
                                name="menuType"
                                value="SysMenu"
                                checked={form.menuType === 'SysMenu'}
                                disabled={readonly}
                                onChange={() => { form.menuType = 'SysMenu'; }}
                            />
                            <span class="menu-radio-dot" />
                            <span>菜单</span>
                        </label>
                        <label class={{ 'menu-radio': true, 'checked': form.menuType === 'QueryMenu' }}>
                            <input
                                type="radio"
                                name="menuType"
                                value="QueryMenu"
                                checked={form.menuType === 'QueryMenu'}
                                disabled={readonly}
                                onChange={() => { form.menuType = 'QueryMenu'; }}
                            />
                            <span class="menu-radio-dot" />
                            <span>联查</span>
                        </label>
                    </div>
                )}
                {renderParamsTable(readonly)}
                <div class="menu-form-footer">
                    {!state.published && (
                        <button class="menu-btn menu-btn-default" type="button" onClick={onClickCancelDraft}>
                            取消
                        </button>
                    )}
                    {!state.published && (
                        <button
                            class="menu-btn menu-btn-primary"
                            type="button"
                            disabled={publishState.value.loading}
                            onClick={onClickConfirmPublish}
                        >
                            {publishState.value.loading ? '发布中...' : '发布'}
                        </button>
                    )}
                    {state.published && (
                        <button
                            class="menu-btn menu-btn-default"
                            type="button"
                            disabled={publishState.value.loading}
                            onClick={onClickUnpublish}
                        >
                            {publishState.value.loading ? '处理中...' : '取消发布'}
                        </button>
                    )}
                </div>
            </div>;
        }

        function renderRightCard() {
            if (publishState.value.loading) {
                return <div class="menu-card-empty">加载中...</div>;
            }

            if (publishState.value.showForm) {
                return renderMenuForm();
            }

            if (!currentPage.value) {
                return <div class="menu-card-empty">请选择左侧菜单项，或点击右上角“新增菜单”</div>;
            }

            if (!publishState.value.showForm && !publishState.value.published) {
                return <div class="menu-card-empty">
                    <p>该页面暂未发布菜单，请点击右上角“新增菜单”。</p>
                </div>;
            }

            return renderMenuForm();
        }

        return () => {
            return (
                <div class="f-page f-page-card f-page-is-mainsubcard f-app-menu">
                    <FPageHeader title="菜单管理" buttons={headerButtons.value}></FPageHeader>
                    <div class="menu-main-content">
                        <div class="menu-left-panel">
                            <div class="menu-left-header">菜单项摘要列表</div>
                            {renderLeftNavigation()}
                        </div>
                        <div class="menu-right-panel">
                            <div class="menu-right-header">菜单信息卡片</div>
                            {renderRightCard()}
                        </div>
                    </div>
                </div>
            );
        };
    }
});
