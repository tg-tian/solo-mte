import { inject, ref } from 'vue';
import { F_MODAL_SERVICE_TOKEN, FModalService } from "@farris/ui-vue";
import { JSX } from 'vue/jsx-runtime';
import ArrayAndObjectCode from '../component/array-and-object-code.component';

/**
 * 数组和对象编辑器
 */
export function useArrayAndObjectEditor() {

    const monacoEditorRef = ref();
    const modalService: FModalService | null = inject(F_MODAL_SERVICE_TOKEN, null);

    function renderEditor(value: any): () => JSX.Element {
        return () => {
            return <ArrayAndObjectCode ref={monacoEditorRef} v-model={value} />;
        };
    }

    /**
     * 弹出数组和对象编辑器
     * @param value 
     * @param confirmHandler 
     */
    function showArrayAndObjectEditor(value: any, confirmHandler: (newValue: any) => boolean) {
        const monacoEditorModal = modalService?.open({
            fitContent: false,
            enableEsc: true,
            draggable: true,
            width: 840,
            height: 445,
            minWidth: 300,
            minHeight: 200,
            title: '默认值编辑器',
            showMaxButton: true,
            resizeable: true,
            render: renderEditor(value),
            buttons: [
                {
                    class: 'btn btn-secondary',
                    text: '取消',
                    handle: () => {
                        monacoEditorModal?.destroy();
                    }
                },
                {
                    class: 'btn btn-primary',
                    text: '确定',
                    handle: () => {
                        const newValue = monacoEditorRef.value.getContent();
                        const checkPassed = confirmHandler(newValue);
                        if (checkPassed) {
                            monacoEditorModal?.destroy();
                        }
                    }
                }
            ]
        });
    }

    return { showArrayAndObjectEditor };

}
