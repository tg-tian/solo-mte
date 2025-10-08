import { DataColumn, FLoadingService, FNotifyService, FTreeGrid, FSchemaSelector,ControllerSchemaRepositorySymbol,FModal } from "@farris/ui-vue";
import { SetupContext, defineComponent, ref, inject, onMounted } from "vue";
import { methodSelectorProps, MethodSelectorProps } from "./method-selector.props";
import { useWebCommandSelector } from "./use-web-command-selector";
import { WebCommand, WebCommandMetadata } from "../../entity/web-command";

import './method-selector.scss';
import { UseFormSchema } from "../../../../../types";

export default defineComponent({
    name: 'FMethodSelector',
    props: methodSelectorProps,
    emits: ['submit', 'cancel'],
    setup(props: MethodSelectorProps, context) {
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };

        const methodSelectorGridRef = ref();
        const columns: DataColumn[] = [
            { field: 'name', title: '方法名称', dataType: 'string' },
            { field: 'code', title: '方法编号', dataType: 'string' }
        ];
        const rowNumberOption = { enable: false };
        const selectionOption = { enableSelectRow: true, multiSelect: true, showCheckbox: true, multiSelectMode: 'OnCheckAndClick' };
        const hierarchy = { cascadeOption: { autoCheckChildren: true, autoCheckParent: true } };

        const useFormSchema = inject('useFormSchema') as UseFormSchema;
        const { webCommandsTreeData, loadWebCommands, addControllerMetadata } = useWebCommandSelector();
        const showControllerSelectorModal = ref(false);
        const controllerSelectorRef = ref();
        const controllerSelectorParams = ref();
        const newWebControllers: any = ref([]);
        onMounted(() => {
            const LoadingService: any = inject<FLoadingService>('FLoadingService');
            const instance = LoadingService?.show();
            loadWebCommands().then(() => {
                methodSelectorGridRef.value.updateDataSource(webCommandsTreeData.value);
                instance.value.close();
            }, (error: any) => {
                instance.value.close();
            });

            controllerSelectorParams.value = {
                formBasicInfo: useFormSchema?.getFormMetadataBasicInfo()
            };
        });

        function onSubmitClicked() {
            const selectedItems = methodSelectorGridRef.value.getSelectedItems();
            if (!selectedItems.length) {
                notifyService.warning({ message: '请先选择方法' });
                return;
            }

            const selectedCommands: Array<{ command: WebCommand; controller: WebCommandMetadata }> = [];
            const newControllers: any[] = [];
            selectedItems.forEach((selection: any) => {
                const selectionData = selection.data;
                // 去除控制器节点
                if (selectionData.data.isController) {
                    return;
                }
                const controllerNode: any = webCommandsTreeData.value.find((treeItem: any) => treeItem.id === selection.parent);
                const newContoller = newWebControllers.value.find(controller => controller.id === controllerNode?.data.data.originalData.Id);
                if (newContoller) {
                    newControllers.push(newContoller);
                }
                selectedCommands.push({
                    command: selectionData.data.originalData,
                    controller: controllerNode?.data.data.originalData
                });

            });
            if (!selectedCommands.length) {
                notifyService.warning('请先选择方法');
                return;
            }
            context.emit('submit', {
                selectedCommands,
                newWebControllers: newControllers
            });

        }
        function onCancelClicked() {
            context.emit('cancel');
        }

        function onClickAddController() {
            showControllerSelectorModal.value = true;
        }
        async function onSubmitController(selectedController: any) {

            await addControllerMetadata(selectedController, newWebControllers.value);

            methodSelectorGridRef.value.updateDataSource(webCommandsTreeData.value);

            showControllerSelectorModal.value = false;
        }
        function onCancelController(e) {
            showControllerSelectorModal.value = false;
        }
        return () => {
            return (
                <div class="f-method-selector f-utils-fill-flex-column" id="f-method-selector">
                    <div class="method-toolbar">
                        <div class="toolbar-item" onClick={onClickAddController} >
                            <div class="toolbar-item-icon toolbar-item-icon-add"></div>
                            <span class="toolbar-item-text"> 添加控制器 </span>
                        </div>
                    </div>
                    <div class="f-utils-fill border">
                        <FTreeGrid
                            ref={methodSelectorGridRef}
                            columns={columns}
                            data={webCommandsTreeData.value}
                            hierarchy={hierarchy}
                            selection={selectionOption}
                            fit={true}
                            columnOption={{fitColumns:true}}
                            row-number={rowNumberOption}
                        ></FTreeGrid>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onClick={onCancelClicked}>取消</button>
                        <button type="button" class="btn btn-primary" onClick={onSubmitClicked}>确定</button>
                    </div>
                    {
                        showControllerSelectorModal.value ?
                            <FModal v-model={showControllerSelectorModal.value} show-buttons={false} title="选择控制器" width={950} height={560} fit-content={false} draggable={true}>
                                <FSchemaSelector
                                    ref={controllerSelectorRef}
                                    injectSymbolToken={ControllerSchemaRepositorySymbol}
                                    view-type="NavList"
                                    editorParams={controllerSelectorParams.value}
                                    showFooter={true}
                                    onCancel={onCancelController}
                                    onSubmit={onSubmitController}></FSchemaSelector>
                            </FModal > : ''
                    }
                </div>
            );
        };
    }
});
