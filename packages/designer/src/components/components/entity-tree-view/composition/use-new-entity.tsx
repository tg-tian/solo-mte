import { FModalService, F_MODAL_SERVICE_TOKEN } from '@farris/ui-vue';
import { UseFormSchema } from "../../../types";
import { inject, Ref, ref } from 'vue';
import CreateNewEntityComponent from '../components/create-new-entity.component';

export function useOpenNewEntity(
    useFormSchema: UseFormSchema,
    existedEntityCodes: Ref<string[]>,
    refreshEntityTree: any,
    newEntityCodeList: Ref<string[]>) {

    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);
    const modalInstance = ref();

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
    function onSubmit(newEntityInfo: any) {
        existedEntityCodes.value.push(newEntityInfo.code);
        // 修改schema
        const mainEntity = useFormSchema.getSchemaEntities()[0];
        if (mainEntity?.type?.entities) {
            mainEntity.type.entities.push(newEntityInfo);
        }
        // 刷新实体树
        if (refreshEntityTree) {
            refreshEntityTree();
        }
        // 记录新增表的编号，以便于后续新增字段时做校验
        newEntityCodeList.value.push(newEntityInfo.code);

        // 关闭窗口
        if (modalInstance.value.close) {
            modalInstance.value.close();
        }
    }
    function renderNewEntityComponent() {

        return () => (<><CreateNewEntityComponent
            useFormSchema={useFormSchema}
            existedEntityCodes={existedEntityCodes?.value}
            onSubmit={onSubmit}
            onCancel={onCancel} >
        </CreateNewEntityComponent> </ >);
    }


    function openNewEntityModal(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        if (!modalService) {
            return;
        }
        const modalEditorRef = modalService.open({
            title: '新增子实体',
            width: 500,
            height: 200,
            fitContent: false,
            showButtons: false,
            render: renderNewEntityComponent(),
            enableEsc: false,
            draggable: true
        });

        modalInstance.value = modalEditorRef?.modalRef?.value;
    }


    return { openNewEntityModal };
}
