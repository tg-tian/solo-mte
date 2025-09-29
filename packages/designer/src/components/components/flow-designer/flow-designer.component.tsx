import { defineComponent, provide, ref } from "vue";
import { ComponentSchema, FFlowCanvas, FDesignerOutline, FDesignerToolbox, FPropertyPanel, FSplitter, FSplitterPane, FTabs, FTabPage } from "@farris/ui-vue";
import { FlowDesignerProps, flowDesignerProps } from "./flow-designer.props";
import { useComponentSchemaService } from '../../composition/component-schema.service';

export default defineComponent({
    name: 'FFlowDesigner',
    props: flowDesignerProps,
    emits: [],
    setup(props: FlowDesignerProps, context) {
        const schema = ref<any>(props.schema);
        const componentSchema = schema.value.module ? ref(schema.value.module.components[0]) : ref(schema.value);

        const dragulaCompostion = ref();
        const fillTabs = ref(true);
        const controlTreeRef = ref();
        const entityTreeRef = ref();

        function onCanvasInitialized(dragula: any) {
            dragulaCompostion.value = dragula;
        }

        const propertyConfig = ref();
        const propertyName = ref();
        const focusingSchema = ref();

        const schemaService = useComponentSchemaService();
        schemaService.load(componentSchema.value);
        provide('SchemaService', schemaService);

        function onDesignItemClicked(schemaType: string, schemaValue: ComponentSchema) {
            propertyName.value = schemaType;
            focusingSchema.value = schemaValue;

            if (controlTreeRef.value && controlTreeRef.value.selectControlTreeNode) {
                controlTreeRef.value.selectControlTreeNode(schemaValue);
            }
        }

        function onCanvasChanged() {
            if (entityTreeRef.value && entityTreeRef.value.refreshEntityTree) {
                entityTreeRef.value.refreshEntityTree();
            }
            if (controlTreeRef.value && controlTreeRef.value.refreshControlTree) {
                controlTreeRef.value.refreshControlTree();
            }
        }

        return () => {
            return (
                <FSplitter class="f-designer-page-content">
                    <FSplitterPane class="f-designer-page-content-nav" width={300} position="left">
                        <div class="f-utils-fill-flex-column">
                            <FTabs tabType='pills' justify-content='center' fill={fillTabs.value} customClass="f-designer-left-area">
                                <FTabPage id="outline" title="大纲">
                                    <FDesignerOutline ref={controlTreeRef} data={props.schema} ></FDesignerOutline>
                                </FTabPage>
                                <FTabPage id="tools" title="工具箱">
                                    <FDesignerToolbox dragula={dragulaCompostion.value}></FDesignerToolbox>
                                </FTabPage>
                                <FTabPage id="entity" title="实体">
                                    {/* <FEntityTreeView ref={entityTreeRef} data={props.schema}></FEntityTreeView> */}
                                </FTabPage>
                            </FTabs>
                        </div>
                    </FSplitterPane>
                    <FSplitterPane class="f-designer-page-content-main" position="center">
                        <FFlowCanvas
                            v-model={componentSchema.value}
                            onInit={onCanvasInitialized}
                            onSelectionChange={onDesignItemClicked}
                            onCanvasChanged={onCanvasChanged}
                        ></FFlowCanvas>
                        <FPropertyPanel
                            propertyConfig={propertyConfig.value}
                            propertyName={propertyName.value}
                            schema={focusingSchema.value}
                        ></FPropertyPanel>
                    </FSplitterPane>
                </FSplitter>
            );
        };
    }
});
