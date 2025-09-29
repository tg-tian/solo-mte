import { computed, defineComponent, inject, onMounted, provide, ref, nextTick, onUnmounted } from "vue";
import { ComponentSchema, DesignerComponentInstance, FDesignerCanvas, FTabs, FTabPage, propertyConfigSchemaMapForDesigner, FSplitter, FSplitterPane, FDesignerToolbox, FPropertyPanel, FDesignerOutline } from "@farris/ui-vue";
import { FormDesignerProps, formDesignerProps } from "./form-designer.props";
import { useComponentSchemaService } from '../../composition/component-schema.service';
import MonacoEditor from '../monaco-editor/monaco-editor.component';
import FEntityTreeView from '../entity-tree-view/components/entity-tree-view.component';
import { afterPropeControlPropertyChangedService } from "../../composition/control-property-changed.service";
import { UseDesignViewModel, UseFormSchema, UseSchemaService } from "../../types";
import FCustomClassEditor from './components/custom-class-editor/custom-class-editor.component';
import { UseDesignerContext } from "../../types/designer-context";
import FExternalComponentPanel from "./components/external-component-panel/external-component-panel.component";
import { useExternalComponentProperty } from "./components/external-component-panel/composition/use-external-component-property";
import { ExternalComponentSchema } from "./components/external-component-panel/composition/types";
import { UseFormCommandService } from "../../../components/types/command";
import { useFormValidation } from "../../composition/use-form-validation";
import { DesignerMode } from "../../types/designer-context";
import { resolveFormModulePropertyConfig } from "../../../components/types/form-property-config";

export default defineComponent({
    name: 'FFormDesigner',
    props: formDesignerProps,
    emits: [],
    setup(props: FormDesignerProps, context) {
        const designerContext = inject('designerContext') as UseDesignerContext;
        const propertyPanelInstance = ref();
        const schema = ref<any>(props.schema);
        const componentSchema = schema.value.module ? ref(schema.value.module.components[0]) : ref(schema.value);
        const componentId = ref(componentSchema.value['id'] || 'root-component');
        const dragulaCompostion = ref();
        const fillTabs = ref(true);
        const controlTreeRef = ref();
        const entityTreeRef = ref();
        const monacoEditorRef = ref();
        const customClassEditorRef = ref();
        const { toolboxItems, componentsToRegister, designerMode } = designerContext;
        function onCanvasInitialized(dragula: any) {
            dragulaCompostion.value = dragula;
        }
        const canvasRef = ref();
        const externalComponentPanelRef = ref();
        const propertyConfig = ref();
        const propertyName = ref();
        const focusingSchema = ref();
        const schemaService = useComponentSchemaService(schema);
        const externalComponentPanelWidth = ref(900);
        const externalComponentPanelMaxHeight = ref(430);

        const externalComponentPanelResizeObserver = new ResizeObserver(() => {
            const { designerCanvasContainerElementRef } = canvasRef.value;
            const { width, height } = designerCanvasContainerElementRef.getBoundingClientRect();
            externalComponentPanelWidth.value = width;
            externalComponentPanelMaxHeight.value = height;
        });
        schemaService.load(componentSchema.value);
        provide('SchemaService', schemaService);
        const designViewModelUtils = inject('designViewModelUtils') as UseDesignViewModel;
        const schemaUtil = inject('schemaService') as UseSchemaService;
        const formCommandService = inject('useFormCommand') as UseFormCommandService;

        const useFormSchema: any = inject('useFormSchema') as UseFormSchema;

        function clearExternalComponentSelection(): void {
            externalComponentPanelRef.value?.clearSelection();
        }

        function onDesignItemClicked(schemaType?: string, schemaValue?: ComponentSchema, componentId?: string, componentInstance?: DesignerComponentInstance) {
            clearExternalComponentSelection();
            propertyName.value = schemaType;
            propertyPanelInstance?.value?.updateDesignerItem(componentInstance, componentId);
            focusingSchema.value = schemaValue;

            if (controlTreeRef.value && controlTreeRef.value.selectControlTreeNode) {
                controlTreeRef.value.selectControlTreeNode(schemaValue);
            }
        }

        function onCanvasChanged() {
            // 重组设计时viewmodel
            designViewModelUtils.assembleDesignViewModel();
            // 更新事件节点
            formCommandService.syncActions();

            if (entityTreeRef.value && entityTreeRef.value.refreshEntityTree) {
                entityTreeRef.value.refreshEntityTree();
            }
            if (controlTreeRef.value && controlTreeRef.value.refreshControlTree) {
                controlTreeRef.value.refreshControlTree();
            }
        }

        function onPropertyChanged(event: any) {
            const { changeObject, designerItem } = event;
            if (changeObject.needRefreshControlTree && controlTreeRef.value && controlTreeRef.value.refreshControlTree) {
                controlTreeRef.value.refreshControlTree();
            }
            if (changeObject.needRefreshEntityTree && entityTreeRef.value && entityTreeRef.value.refreshEntityTree) {
                entityTreeRef.value.refreshEntityTree();
            }
            if (changeObject.needChangeCanvas && canvasRef.value.changeCanvas) {
                canvasRef.value.changeCanvas();
            }
            const afterPropeControlPropertyChanged = afterPropeControlPropertyChangedService(useFormSchema, designViewModelUtils, schemaUtil);
            afterPropeControlPropertyChanged.afterPropertyChanged(event);

            if (designerItem?.onPropertyChanged) {
                designerItem?.onPropertyChanged(event);
            }

        }

        const activeDesignerView = ref('formDesigner');

        /** 代码编辑器的显示文本 */
        const formSchemaCodes = ref('');
        function onChangeDesignerView(viewName: string) {
            // 从自定义样式页面切换到其它页面时，保存自定义样式
            const needSaveCustomClass = activeDesignerView.value === 'customClassEditor';
            if (needSaveCustomClass) {
                customClassEditorRef.value?.saveCustomClass();
            }

            activeDesignerView.value = viewName;
            if (viewName === 'formDesignerCode') {
                formSchemaCodes.value = JSON.stringify(schema.value, null, 4);
            }
        }

        /** 清除画布中的已选样式 */
        function clearComponentSelectionStyles(): void {
            Array.from(document.getElementsByClassName('dgComponentSelected') as HTMLCollectionOf<HTMLElement>).forEach(
                (element: HTMLElement) => element.classList.remove('dgComponentSelected')
            );
            Array.from(document.getElementsByClassName('dgComponentFocused') as HTMLCollectionOf<HTMLElement>).forEach(
                (element: HTMLElement) => element.classList.remove('dgComponentFocused')
            );
        }

        function clearPropertyPanel(): void {
            propertyName.value = undefined;
            propertyPanelInstance?.value?.updateDesignerItem(undefined, undefined);
            focusingSchema.value = undefined;
            propertyPanelInstance.value.updatePropertyConfig({}, {}, true);
        }

        function unselectCanvasDesignItem(): void {
            clearPropertyPanel();
            controlTreeRef.value?.selectControlTreeNode(undefined);
            clearComponentSelectionStyles();
        }

        function onClickExternalComponent(propertyData: ExternalComponentSchema) {
            if (!propertyData) {
                clearPropertyPanel();
                return;
            }
            unselectCanvasDesignItem();
            // 点击外部组件后，更新属性面板
            nextTick(() => {
                const externalComponentProperty = useExternalComponentProperty(canvasRef.value.designerHostService, propertyData);
                const propertyConfig = externalComponentProperty.getPropConfig(componentId.value);
                const convertedPropertyData = externalComponentProperty.getConvertedPropertyData();
                propertyPanelInstance.value.updatePropertyConfig(propertyConfig, convertedPropertyData, true);
                propertyPanelInstance?.value?.updateDesignerItem(externalComponentProperty, componentId);
            });
        }

        const showDesignerView = computed(() => (itemType: string) => {
            return itemType !== activeDesignerView.value;
        });

        const formDesignerViewClass = computed(() => {
            return {
                'pl-2 pr-2 mr-2 d-flex': true,
                'f-designer-view-tabs-item': true,
                'active': activeDesignerView.value === 'formDesigner'
            };
        });

        const formDesignerCodeViewClass = computed(() => {
            return {
                'pl-2 pr-2 d-flex': true,
                'f-designer-view-tabs-item': true,
                'active': activeDesignerView.value === 'formDesignerCode'
            };
        });

        const customClassEditorClass = computed(() => {
            return {
                'pl-2 pr-2 d-flex ml-2': true,
                'f-designer-view-tabs-item': true,
                'active': activeDesignerView.value === 'customClassEditor'
            };
        });

        propertyConfigSchemaMapForDesigner['Module'] = resolveFormModulePropertyConfig(designerMode);;

        const shouldRenderExternalComponentPanel = designerMode !== DesignerMode.PC_RTC;

        function renderExternalComponentPanel() {
            return shouldRenderExternalComponentPanel && (
                <FExternalComponentPanel
                    ref={externalComponentPanelRef}
                    width={externalComponentPanelWidth.value}
                    maxHeight={externalComponentPanelMaxHeight.value}
                    onSelectionChange={onClickExternalComponent}>
                </FExternalComponentPanel>
            );
        }

        /**
         * 切换不同的页面
         * @param selectionNode 
         * @returns 
         */
        function changePageComponent(selectionNode: any) {
            const isPageChanged = selectionNode.componentId && componentId.value !== selectionNode.componentId;
            if (isPageChanged) {
                componentId.value = selectionNode.componentId;
                const selectPageComponent = useFormSchema.getComponentById(componentId.value);
                componentSchema.value = selectPageComponent;
            }
        }

        function onOutlineChanged(selectionNode: any) {
            const selectionSchema = selectionNode.rawSchema;

            if (selectionSchema?.type === 'Module') {
                propertyName.value = 'Module';
                propertyPanelInstance?.value?.updateDesignerItem(null, selectionSchema.id);
                focusingSchema.value = Object.assign({}, useFormSchema.getFormMetadataBasicInfo(), { type: 'Module' });

                clearComponentSelectionStyles();
            }

            if (activeDesignerView.value === 'formDesignerCode' && selectionSchema) {
                monacoEditorRef.value?.setPosition(selectionSchema.id);
            }

            // 切换了页面
            changePageComponent(selectionNode);
        }

        function reloadPropertyPanel() {
            propertyPanelInstance?.value.refreshPanel();
            propertyPanelInstance?.value.reloadPropertyPanel();
        }

        /**
         * 保存前准备
         */
        function prepareBeforeSaveForm() {
            // 在自定义样式页面保存表单时，需要同步保存自定义样式
            const needSaveCustomClass = activeDesignerView.value === 'customClassEditor';
            if (needSaveCustomClass) {
                customClassEditorRef.value?.saveCustomClass();
            }
            const validationUtil = useFormValidation(useFormSchema, formCommandService);
            return validationUtil.checkBeforeSaved();
        }

        context.expose({ reloadPropertyPanel, onChangeDesignerView, prepareBeforeSaveForm });

        function onEntityUpdated() {
            onCanvasChanged();
            canvasRef.value?.refreshCanvas();
            nextTick(() => {
                propertyPanelInstance?.value.updatePropertyConfig();
            });
        }
        /**
         * 拖拽结束后，可能涉及父容器的变更，所以要更新属性面板的配置
         */
        function onCanvasDragEnd() {
            nextTick(() => {
                propertyPanelInstance?.value.updatePropertyConfig();
            });
        }

        onMounted(() => {
            const { designerCanvasContainerElementRef } = canvasRef.value;
            designerCanvasContainerElementRef && externalComponentPanelResizeObserver.observe(designerCanvasContainerElementRef);
        });

        onUnmounted(() => {
            if (externalComponentPanelResizeObserver) {
                const { designerCanvasContainerElementRef } = canvasRef.value;
                designerCanvasContainerElementRef && externalComponentPanelResizeObserver.unobserve(designerCanvasContainerElementRef);
            }
        });

        return () => {
            return (
                <FSplitter class="f-designer-page-content f-designer-canvas">
                    <FSplitterPane class="f-designer-page-content-nav" width={300} position="left" resizable={true} minWidth={250}>
                        <div class="f-utils-fill-flex-column">
                            <FTabs tabType='pills' justify-content='center' fill={fillTabs.value} customClass="f-designer-left-area">
                                <FTabPage id="outline" title="大纲">
                                    <FDesignerOutline ref={controlTreeRef} data={props.schema} onSelectionChanged={onOutlineChanged}></FDesignerOutline>
                                </FTabPage>
                                <FTabPage id="tools" title="工具箱">
                                    <FDesignerToolbox dragula={dragulaCompostion.value} toolboxItems={toolboxItems}></FDesignerToolbox>
                                </FTabPage>
                                <FTabPage id="entity" title="实体">
                                    <FEntityTreeView ref={entityTreeRef} data={props.schema} dragula={dragulaCompostion.value} onEntityUpdated={onEntityUpdated}></FEntityTreeView>
                                </FTabPage>
                            </FTabs>
                        </div>
                    </FSplitterPane>
                    <FSplitterPane class="f-designer-page-content-main" position="center">
                        <div class="f-utils-fill-flex-column">
                            <div class="f-utils-fill">
                                <div class="h-100 form-designer-view" hidden={showDesignerView.value('formDesigner')}>
                                    <FDesignerCanvas ref={canvasRef}
                                        v-model={componentSchema.value}
                                        onInit={onCanvasInitialized}
                                        onSelectionChange={onDesignItemClicked}
                                        onCanvasChanged={onCanvasChanged}
                                        componentId={componentId.value}
                                        onDragEnd={onCanvasDragEnd}
                                        components={componentsToRegister}
                                        canvasMode={designerMode}
                                    ></FDesignerCanvas>
                                    {renderExternalComponentPanel()}
                                    <FPropertyPanel
                                        ref={propertyPanelInstance}
                                        propertyConfig={propertyConfig.value}
                                        propertyName={propertyName.value}
                                        schema={focusingSchema.value}
                                        onPropertyChanged={onPropertyChanged}
                                    ></FPropertyPanel>
                                </div>
                                <div hidden={showDesignerView.value('formDesignerCode')} class="h-100" style="padding-left: 10px;">
                                    <MonacoEditor ref={monacoEditorRef} v-model={formSchemaCodes.value} language={"json"} readOnly={true}></MonacoEditor>
                                </div>
                                <div hidden={showDesignerView.value('customClassEditor')} class="h-100">
                                    <FCustomClassEditor ref={customClassEditorRef}></FCustomClassEditor>
                                </div>

                            </div>
                            <div class="d-flex flex-row" style="height: 40px;padding: 0 10px;align-items: center;background: white;z-index:850;">
                                <div onClick={() => onChangeDesignerView('formDesigner')}
                                    class={formDesignerViewClass.value}>可视化设计器</div>
                                <div onClick={() => onChangeDesignerView('formDesignerCode')}
                                    class={formDesignerCodeViewClass.value}>设计时代码</div>
                                {/* <div onClick={() => onChangeDesignerView('customClassEditor')}
                                    class={customClassEditorClass.value}>自定义样式</div> */}
                            </div>
                        </div>
                    </FSplitterPane>
                </FSplitter>
            );
        };
    }
});
