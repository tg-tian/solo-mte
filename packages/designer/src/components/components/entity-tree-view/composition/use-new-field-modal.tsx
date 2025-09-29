import { FModalService, F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';
import { FormSchemaEntity, FormSchemaEntityField, UseFormSchema } from "../../../types";
import { inject, Ref, ref } from 'vue';
import CreateNewFieldComponent from '../components/create-new-field.component';

export function useOpenNewField(
    useFormSchema: UseFormSchema,
    newEntityCodeList: Ref<string[]>,
    refreshEntityTree: any,
    treeViewData: Ref<any>) {

    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);
    const modalInstance = ref();

    const currentTreeNode = ref();
    /**
     * 关闭窗口
     */
    function onCancel() {
        if (modalInstance.value.close) {
            modalInstance.value.close();
        }
    }
    /**
     * 确定新增子表
     */
    function onSubmit(newSchemaField: FormSchemaEntityField) {
        // 修改schema
        if (currentTreeNode.value?.data?.type?.fields) {
            currentTreeNode.value.data.type.fields.push(newSchemaField);
        }

        // 刷新实体树
        if (refreshEntityTree) {
            refreshEntityTree();
        }

        if (modalInstance.value.close) {
            modalInstance.value.close();
        }
    }
    function renderNewFieldComponent(treeNode: any) {
        const entityCode = treeNode?.data?.code;
        const isNewEntity = newEntityCodeList.value.includes(entityCode);
        const existedAllFields = treeViewData.value.filter(node => node.entityId === treeNode?.data?.id && node.data).map(node => node.data);
        return () => (<><CreateNewFieldComponent
            useFormSchema={useFormSchema}
            entityCode={entityCode}
            isNewEntity={isNewEntity}
            existedAllFields={existedAllFields}
            onSubmit={onSubmit}
            onCancel={onCancel} >
        </CreateNewFieldComponent> </>);
    }


    function openNewFieldModal(event: MouseEvent, treeNode: any) {
        event.stopPropagation();
        event.preventDefault();
        if (!modalService) {
            return;
        }
        currentTreeNode.value = treeNode;
        const modalEditorRef = modalService.open({
            title: '新增字段',
            width: 800,
            height: 480,
            fitContent: false,
            showButtons: false,
            render: renderNewFieldComponent(treeNode),
            enableEsc: false,
            draggable: true
        });

        modalInstance.value = modalEditorRef?.modalRef?.value;
    }


    return { openNewFieldModal };
}
