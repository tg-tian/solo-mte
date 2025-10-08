import FExternalComponentFormSelector from '../components/external-component-selector/external-component-selector.component';
import { ExternalComponentType, UseExternalComponent } from "./types";
import { UseFormSchema } from '../../../../../../components/types';
import { inject } from "vue";
import { F_MODAL_SERVICE_TOKEN, FModalService, DesignerHTMLElement, SchemaItem } from "@farris/ui-vue";

export function dragResolveService(externalComponentComposition: UseExternalComponent) {
    let modalEditor: any;
    const formSchemaUtils = inject('useFormSchema') as UseFormSchema;
    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);

    /**
     * 关闭模态框
     */
    function closeModal() {
        const closeFunction = modalEditor?.modalRef?.value.close;
        if (closeFunction) {
            closeFunction();
        }
    }

    /**
     * 确定选择外部组件
     * @param selectedComponent 
     * @param externalComponentType 
     * @returns 
     */
    function onSubmit(selectedComponent: SchemaItem, externalComponentType: ExternalComponentType) {
        externalComponentComposition.addComponent(selectedComponent, externalComponentType);
        closeModal();
    }

    /**
     * 渲染外部组件的选择器
     * @param externalComponentType 
     * @returns 
     */
    function renderComponentSelector(externalComponentType: ExternalComponentType) {
        return () => {
            return (
                <FExternalComponentFormSelector
                    formSchemaUtils={formSchemaUtils}
                    onSubmit={(selectedComponent: SchemaItem) => onSubmit(selectedComponent, externalComponentType)}
                    onClose={closeModal}
                    externalComponentType={externalComponentType}
                ></FExternalComponentFormSelector>
            );
        };
    }

    /**
     * 弹出外部组件的选择器
     * @param element 
     * @returns 
     */
    function showModel(element: DesignerHTMLElement) {
        const externalComponentType = element.getAttribute('data-code') as ExternalComponentType;
        if (!externalComponentType) {
            console.error('ExternalComponentType is null');
            return;
        }
        const title = externalComponentType === 'Lookup' ? '选择帮助' : '选择表单';
        modalEditor = modalService?.open({
            title: title,
            width: 950,
            height: 600,
            fitContent: false,
            showButtons: false,
            render: renderComponentSelector(externalComponentType),
            enableEsc: true,
            draggable: true
        });
    }

    /**
     * 拖拽落下事件
     * @param element 
     * @param target 
     * @param source 
     * @param sibling 
     * @returns 
     */
    function onDrop(element: DesignerHTMLElement, target: DesignerHTMLElement, source: DesignerHTMLElement, sibling: DesignerHTMLElement) {
        showModel(element);
    }

    return {
        onDrop
    };
}
