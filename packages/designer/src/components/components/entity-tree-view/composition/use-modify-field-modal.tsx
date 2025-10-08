import { FModalService, F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';
import { UseDesignViewModel, UseFormSchema } from "../../../types";
import { inject, Ref, ref, SetupContext } from 'vue';
import ModifyFieldComponent from '../components/modify-field.component';

export function useOpenModifyField(
    useFormSchema: UseFormSchema,
    designViewModelUtils: UseDesignViewModel,
    refreshEntityTree: any,
    treeViewData: Ref<any>,
    context: SetupContext) {

    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);
    const modalInstance = ref();

    const currentTreeNode = ref();
    /**
     * 关闭窗口
     */
    function onCloseModal() {
        if (modalInstance.value.close) {
            modalInstance.value.close();
        }
    }

    /**
     * 变更名称后同步ViewModel和控件
     */
    function syncViewModelAndControlAfterNameChanged() {
        const { id: currentFieldId, name: currentFieldName } = currentTreeNode.value.data;
        let hasBindingControl = false;
        useFormSchema.getViewModels().forEach(viewModel => {
            if (viewModel.fields && viewModel.fields.length) {
                const dgViewModel = designViewModelUtils.getDgViewModel(viewModel.id);
                const dgViewModelField = dgViewModel?.fields?.find(
                    (field) => field.id === currentFieldId
                );
                if (dgViewModel && dgViewModelField) {
                    hasBindingControl = true;
                    let viewModelFieldSchema: any;
                    if (Object.prototype.hasOwnProperty.call(dgViewModelField, 'fieldSchema')) {
                        viewModelFieldSchema = dgViewModelField['fieldSchema'];
                    }
                    if (viewModelFieldSchema) {
                        viewModelFieldSchema.name = currentFieldName;
                    } else {
                        viewModelFieldSchema = {
                            name: currentFieldName,
                        };
                    }
                    dgViewModel.changeField(currentFieldId, viewModelFieldSchema);

                    const changeFieldNameControls = useFormSchema.getControlsInCmpWidthBinding(dgViewModel.id, currentFieldId);
                    if (changeFieldNameControls?.length) {
                        changeFieldNameControls.forEach(element => {
                            if (element.type === 'data-grid-column' || element.type === 'tree-grid-column"') {
                                element.title = currentFieldName;
                            } else {
                                element.label = currentFieldName;
                            }

                        });
                    }
                }
            }
        });
        return hasBindingControl;
    }
    /**
     * 确定修改字段
     */
    function onSubmit(fieldInfo: { name: string, defaultValue: any }) {
        const originalFieldName = currentTreeNode.value?.data?.name;
        //  修改字段schema
        if (currentTreeNode.value?.data) {
            if (fieldInfo?.name) {
                currentTreeNode.value.data.name = fieldInfo.name;
            }
            if (fieldInfo?.name) {
                currentTreeNode.value.data.defaultValue = fieldInfo.defaultValue;
            }
        }
        // 同步控件
        if (originalFieldName !== fieldInfo.name) {
            const hasBindingControl = syncViewModelAndControlAfterNameChanged();
            // 刷新实体树以及画布
            if (hasBindingControl) {
                context.emit('entityUpdated');
                onCloseModal();
                return;
            }

        }
        // 刷新实体树
        if (refreshEntityTree) {
            refreshEntityTree();
        }
        onCloseModal();
    }
    function renderModifyFieldComponent(treeNode: any) {
        const { entityId } = treeNode;
        const existedAllFields = treeViewData.value.filter(node => node.entityId === entityId);

        return () => (<><ModifyFieldComponent
            useFormSchema={useFormSchema}
            fieldNode={treeNode.data}
            existedAllFields={existedAllFields}
            onSubmit={onSubmit}
            onCancel={onCloseModal} >
        </ModifyFieldComponent> </>);
    }


    function openModifyFieldModal(event: MouseEvent, treeNode: any) {
        event.stopPropagation();
        event.preventDefault();
        if (!modalService) {
            return;
        }
        currentTreeNode.value = treeNode;
        const modalEditorRef = modalService.open({
            title: '字段信息',
            width: 500,
            height: useFormSchema.designerMode === 'PC_RTC' ? 250 : 160,
            fitContent: false,
            showButtons: false,
            render: renderModifyFieldComponent(treeNode),
            enableEsc: false,
            draggable: true
        });

        modalInstance.value = modalEditorRef?.modalRef?.value;
    }


    return { openModifyFieldModal };
}
