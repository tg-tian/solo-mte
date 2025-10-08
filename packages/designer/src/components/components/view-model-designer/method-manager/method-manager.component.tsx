import { SetupContext, defineComponent, ref, computed, inject } from "vue";
import { FNotifyService, FModal, FSplitter, FSplitterPane } from "@farris/ui-vue";
import { FormViewModel, FormWebCmd, UseFormSchema } from "../../../types";
import { MethodBuilder } from "./composition/build-method";
import { useViewModelNavigation } from "./composition/use-view-model-list";
import { methodManagerProps, MethodManagerProps } from "./method-manager.props";
import { WebCommand, WebCommandMetadata } from "./entity/web-command";
import FMethodEditor from '../../../components/view-model-designer/method-manager/components/method-editor/method-editor.component';
import FMethodList from '../../../components/view-model-designer/method-manager/components/method-list/method-list.component';
import FMethodSelector from '../../../components/view-model-designer/method-manager/components/method-selector/method-selector.component';
import { DesignerMode } from "../../../types/designer-context";

import './method-manager.scss';

export default defineComponent({
    name: 'FMethodManager',
    props: methodManagerProps,
    emits: [] as (string[] & ThisType<void>) | undefined,
    setup(props: MethodManagerProps, context: SetupContext) {
        const LoadingService: any = inject('FLoadingService');
        const messageBoxService: any = inject('FMessageBoxService');
        const useFormSchema = inject('useFormSchema') as UseFormSchema;
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };

        const viewModelNavigationComposition = useViewModelNavigation();
        const methodBuilderComposition = new MethodBuilder(useFormSchema);

        const activeViewModel = ref();
        const viewModelNavgationData = ref();
        const commandsTreeData = ref();
        const methodListRef = ref();

        /** 是否显示选择方法的弹窗 */
        const methodSelectorVisible = ref(false);

        /** 是否显示重命名方法的弹窗 */
        const methodEditorVisible = ref(false);

        const viewModelTabClass = computed(() => (viewModelTabId: string) => {
            return { 'f-listview-active': activeViewModel.value && activeViewModel.value.id === viewModelTabId };
        });

        /**
         * 刷新方法列表
         */
        function refreshMethod() {
            const loadingInstance = LoadingService?.show();
            methodBuilderComposition.build(activeViewModel.value?.commands || []).then(commands => {
                commandsTreeData.value = commands || [];
                methodListRef.value.refreshMethodList(commandsTreeData.value, activeViewModel.value);
                // 更新ViewModel中命令
                methodListRef.value.updateViewModel(commandsTreeData.value);
                loadingInstance.value.close();
            });
        }

        /**
         * 切换组件模型
         */
        function onChangeViewModelTab(viewModel: FormViewModel) {
            activeViewModel.value = useFormSchema.getViewModelById(viewModel.id);
            methodListRef.value.selectedTreeNode = null;
            refreshMethod();
        }
        /**
         * 渲染组件模型导航
         */
        function renderViewModelNavgation() {
            const viewModelTabs = viewModelNavgationData.value || [];
            return <ul class="f-list-view-group">
                {
                    viewModelTabs.map((viewModel: any) => {
                        return <div class={viewModelTabClass.value(viewModel.id)} onClick={() => onChangeViewModelTab(viewModel)}>
                            <div class="f-list-content">
                                <div class="f-template-listnav-row">
                                    <div class="list-nav-link" >
                                        <div class="treetable-lines treetable-lines-leaf">
                                            <div class="normal treetable-lines-border-color"></div>
                                        </div>
                                        <span class="nav-item-name" title={viewModel.componentId}>  {viewModel.name} </span>
                                    </div>
                                </div>
                            </div>
                        </div>;
                    })
                }
            </ul >;
        }

        /**
         * 刷新组件列表和方法列表
         */
        function refreshMethodManager() {
            const activeViewModelId = activeViewModel.value?.id;
            const viewModelInformation = viewModelNavigationComposition.resolveViewModelList(activeViewModelId);
            if (activeViewModelId !== viewModelInformation?.activeViewModel?.id) {
                methodListRef.value.selectedTreeNode = null;
            }
            activeViewModel.value = viewModelInformation?.activeViewModel;
            viewModelNavgationData.value = viewModelInformation?.viewModelTabs;

            refreshMethod();
        }

        context.expose({ refreshMethodManager });

        /**
         * 新增方法后事件
         * @param newCommandInfo 新方法、新控制器的信息
         */
        function onMethodAdded(newCommandInfo: { selectedCommands: Array<{ command: WebCommand; controller: WebCommandMetadata; }>; newWebControllers: FormWebCmd[]; }) {
            commandsTreeData.value = methodBuilderComposition.addCommand(newCommandInfo, activeViewModel.value);
            methodListRef.value.refreshMethodList(commandsTreeData.value, activeViewModel.value);
            methodSelectorVisible.value = false;
        }
        /**
         * 删除方法
         */
        function onDeleteMethod() {
            if (!methodListRef.value.selectedTreeNode || !methodListRef.value.isCommandNodeSelected) {
                notifyService.warning({ message: '请先选择方法' });
                return;
            }
            if (useFormSchema.designerMode === DesignerMode.PC_RTC && !methodListRef.value.selectedTreeNode.data?.isRtcCommand) {
                notifyService.warning({ message: '不允许移除基础表单的方法' });
                return;
            }
            messageBoxService.question('确定移除方法？', '', () => {
                const { nextCommandId, commandsTreeData: newCommandsTreeData } = methodBuilderComposition.removeCommand(methodListRef.value.selectedTreeNode, activeViewModel.value);
                commandsTreeData.value = newCommandsTreeData;
                methodListRef.value.selectedTreeNode = null;
                methodListRef.value.refreshMethodList(commandsTreeData.value, activeViewModel.value, nextCommandId);

                notifyService.success({ message: '方法已移除，请重新绑定控件交互事件！' });
            }, () => { });
        }

        /**
         * 弹出编辑方法的窗口
         */
        function onClickEditMethod() {
            if (!methodListRef.value.selectedTreeNode || !methodListRef.value.isCommandNodeSelected) {
                notifyService.warning({ message: '请先选择方法' });
                return;
            }
            if (!methodListRef.value?.isValidCommandSelected) {
                notifyService.warning({ message: '方法已失效，不支持重命名' });
                return;
            }
            if (useFormSchema.designerMode === DesignerMode.PC_RTC && !methodListRef.value.selectedTreeNode.data?.isRtcCommand) {
                notifyService.warning({ message: '不允许重命名基础表单的方法' });
                return;
            }
            methodEditorVisible.value = true;
        }
        /**
         * 方法编号、名称修改后事件
         */
        function onMethodEdited(newCommandData: any) {
            const { id, code: previousCommandCode } = methodListRef.value.selectedTreeNode;
            const newCommandsTreeData = methodBuilderComposition.editCommand(methodListRef.value.selectedTreeNode, activeViewModel.value, newCommandData);
            commandsTreeData.value = newCommandsTreeData;
            const foundCommandData = commandsTreeData.value.find((commandData: any) => commandData.id === id);
            if (foundCommandData) {
                // methodListRef.value.cleanDataItem(foundCommandData);
                // 重新赋值行数据
                methodListRef.value.reassignCommandData(foundCommandData);
            }
            // methodListRef.value.refreshMethodList(commandsTreeData.value, activeViewModel.value);
            if (previousCommandCode !== newCommandData.code) {
                notifyService.success({ message: '修改方法编号后请重新绑定控件交互事件！' });
            }

            methodEditorVisible.value = false;
        }

        const toolbarItemClass = computed(() => {
            return {
                'toolbar-item': true,
                'disable': methodListRef.value?.isValidCommandSelected ? false : true
            };
        });
        const toolbarItemCanRemoveClass = computed(() => {
            return {
                'toolbar-item': true,
                'disable': methodListRef.value?.selectedTreeNode && methodListRef.value?.isCommandNodeSelected ? false : true
            };
        });

        function onViewSource($event: any) {
            context.emit('viewSource', $event);
        }

        return () => {
            return (
                <div class="f-method-designer">
                    <FSplitter class="f-designer-page-content">
                        <FSplitterPane class="f-designer-page-content-nav" width={300} position="left" resizable={true} minWidth={200}>
                            <div class="view-model-list">
                                {renderViewModelNavgation()}
                            </div>
                        </FSplitterPane>
                        <FSplitterPane class="f-designer-page-content-main" position="center">
                            <div class="f-utils-fill-flex-column view-model-method-list" >
                                <div class="view-model-toolbar">
                                    <div class="toolbar-item" onClick={() => { methodSelectorVisible.value = true; }}>
                                        <div class="toolbar-item-icon toolbar-item-icon-add"></div>
                                        <span class="toolbar-item-text"> 添加方法 </span>
                                    </div>
                                    <div class="toolbar-item-spilter"></div>
                                    <div class={toolbarItemCanRemoveClass.value} onClick={onDeleteMethod}>
                                        <div class="toolbar-item-icon toolbar-item-icon-delete"></div>
                                        <span class="toolbar-item-text"> 移除方法 </span>
                                    </div>
                                    <div class="toolbar-item-spilter"></div>

                                    <div class={toolbarItemClass.value} onClick={onClickEditMethod}>
                                        <div class="toolbar-item-icon toolbar-item-icon-edit"></div>
                                        <span class="toolbar-item-text"> 重命名方法 </span>
                                    </div>
                                </div>
                                <FMethodList
                                    ref={methodListRef}
                                    onViewSource={($event) => onViewSource($event)}
                                    commandsData={commandsTreeData.value}
                                    activeViewModel={activeViewModel.value}></FMethodList>
                            </div>
                        </FSplitterPane>
                    </FSplitter>
                    {
                        methodSelectorVisible.value ?
                            <FModal v-model={methodSelectorVisible.value} title="添加方法" width={700} height={650} show-buttons={false} fit-content={false} draggable={true}>
                                <FMethodSelector
                                    onSubmit={onMethodAdded}
                                    onCancel={() => { methodSelectorVisible.value = false; }}></FMethodSelector>
                            </FModal > : ''
                    }
                    {
                        methodEditorVisible.value ?
                            <FModal v-model={methodEditorVisible.value} title="重命名方法" width={450} height={220} show-buttons={false} fit-content={false} draggable={true}>
                                <FMethodEditor
                                    command={methodListRef.value.selectedTreeNode?.data}
                                    activeViewModel={activeViewModel.value}
                                    onSubmit={onMethodEdited}
                                    onCancel={() => { methodEditorVisible.value = false; }}></FMethodEditor>
                            </FModal > : ''
                    }
                </div >
            );
        };
    }
});
