import { ref, provide, defineComponent } from 'vue';
import { useFormSchema } from './composition/use-form-schema';
import { FDesignerCanvas, FDynamicView } from '@farris/ui-vue';

import './preview.scss';

export default defineComponent({
    name: "FPreview",
    props: {},
    emits: [],
    setup() {
        const schema = ref<any>({});
        const componentJson = ref<any>({});
        const dragulaCompostion = ref();
        const showDynamicView = ref(true);
        const useFormSchemaComposition = useFormSchema();
        provide('useFormSchema', useFormSchemaComposition);

        function loadSchema() {
            const loadSchema = window.localStorage.getItem('localSchema');
            if (loadSchema) {
                const schemaObject = JSON.parse(loadSchema);
                schema.value = schemaObject;
                componentJson.value = schema.value.module ? schema.value.module.components[0] : schema.value;
                useFormSchemaComposition.setFormSchema(schemaObject);
            }
        }

        loadSchema();

        function onCanvasInitialized(dragula: any) {
            dragulaCompostion.value = dragula;
        }

        function onChangePreviewType() {
            showDynamicView.value = !showDynamicView.value;
        }

        return () => {
            return (
                <div style="display: flex; width: 100%">
                    <FDynamicView schema={componentJson.value} hidden={!showDynamicView.value}></FDynamicView>
                    <div class="f-designer-page" hidden={showDynamicView.value}>
                        <FDesignerCanvas v-model={componentJson.value}></FDesignerCanvas>
                    </div>
                    <div class="btn show-type-settings-button" onClick={onChangePreviewType} >
                        <i class="f-icon f-icon-home-setup"></i>
                    </div>
                </div>
            );
        };
    }
});
