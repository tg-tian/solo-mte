import { DataColumn, RowOptions, VisualData } from "@farris/ui-vue";
import { FEventParameter } from "@farris/ui-vue";
import { FTreeGrid } from "@farris/ui-vue";
import { FormViewModel } from "../../../../../types";
import { defineComponent, ref, computed, reactive, onMounted, inject } from "vue";
import { useViewModelMethod } from "./use-method";
import { Command } from "../../entity/command";
import { ParamConfig } from "../../entity/param";
import { MethodListProps, methodListProps } from "./method-list.props";
import { UseFormSchema } from "../../../../../types";
import { useEventParameterData } from "../../../../../composition/use-event-parameter-data";
import { useParameterEditorData } from "../../../../../composition/use-parameter-editor-data";
import { DesignerMode, UseDesignerContext } from "../../../../../types/designer-context";
import { CallbackFn, useComponentProvider } from "../../../../../composition/use-component-provider";
import { useEventMapping } from "../../../../../composition/schema-repository/controller/use-event-mapping";
import './method-list.scss';

export default defineComponent({
    name: 'FMethodList',
    props: methodListProps,
    emits: ['viewSource'],
    setup(props: MethodListProps, context) {
        const designerContext = inject('designerContext') as UseDesignerContext;
        const useFormSchemaComposition = inject<UseFormSchema>('useFormSchema')!;
        const useFormStateMachineComposition: any = inject('useFormStateMachine', null);
        const designViewModelUtils: any = inject('designViewModelUtils', null);
        const schemaService: any = inject('schemaService', null);
        const messageService: any = inject('FMessageBoxService', null);
        const { getFormFields, getHelpFields } = useEventMapping(designViewModelUtils, schemaService);
        /** 树表格实例 */
        const treeGridRef = ref();

        const columns: DataColumn[] = [
            { field: 'name', title: '方法名称', dataType: 'string' },
            { field: 'code', title: '方法编号', dataType: 'string' }
        ];

        const rowNumberOption = computed(() => { return { enable: false }; });
        // 外部组件注入器
        // todo: 使用componentMap注入
        const { externalComponentProps, externalComponents, externalParamterEditor } = useComponentProvider();

        const { commandsData, activeViewModel, selectedTreeNode, isCommandNodeSelected,
            paramsData, selectTreeNodeIndex, updateCommandParamFromWebCmd, onChangeSelectedCommand, updateViewModel,
            isValidCommandSelected
        } = useViewModelMethod(props);

        const targetComponentId = computed<string>(() => {
            const viewModelId = activeViewModel.value?.id;
            return useFormSchemaComposition.getComponentByViewModelId(viewModelId)?.id || '';
        });

        const { getEventParameterData } = useEventParameterData(useFormSchemaComposition, useFormStateMachineComposition);
        const {
            assembleOutline,
            assembleSchemaFieldsByComponent,
            assembleStateVariables,
            assembleSchemaFieldsUnderBoundEntity,
        } = useParameterEditorData(useFormSchemaComposition);

        // 初始化加载数据设置节点全部收起
        const rowOption: Partial<RowOptions> = {
            customRowStatus: (visualData: VisualData) => {
                if (visualData.collapse === undefined) {
                    // visualData.collapse = visualData.raw.collapse;
                }
                return visualData;
            },
            customRowStyle: (dataItem: any) => {
                return {
                    'invalid-row': dataItem?.data.isInValid
                };
            }
        };


        function cleanDataItem(dataItem: any) {
            if (!dataItem) {
                return;
            }
            Object.keys(dataItem).forEach((key: string) => {
                if (key.indexOf('__fv') > -1 && key !== '__fv_collapse__') {
                    delete dataItem[key];
                }
            });
        }

        /** 净化data,移除私有属性 */
        function cleanData(data: any[]) {
            data.forEach((dataItem: any) => {
                cleanDataItem(dataItem);
            });

        };

        function buildLookups() {
            const externalComponents = useFormSchemaComposition.getExternalComponents();
            const result: any[] = [];
            externalComponents.forEach((externalComponent) => {
                if (externalComponent.type === 'lookup') {
                    // const lookupItem = { id: externalComponent.id, label: externalComponent.name };
                    result.push(externalComponent);
                }
            });
            return result;
        }


        function getFieldMappingEditor(parameter: any, selectedData: any) {
            const ExternalEventParameterComponent = externalComponents['fieldMapping'];
            const onChangeValue = () => {
                commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
                updateViewModel(commandsData.value);
            };
            const beforeOpen = async ({ fromDataSource, toDataSource, gridColumns }) => {
                const lookupIdParam = selectedData.params.find((param: any) => {
                    return param.name === 'lookupId';
                });
                if (lookupIdParam && !lookupIdParam.value) {
                    messageService?.warning('请先选择数据源。');
                    return false;
                }
                const foundParam = selectedData.params.find((paramItem: any) => paramItem?.controlSource?.type === 'Select');
                const foundLookup = buildLookups().find((lookup: any) => lookup.id === foundParam.value);
                const { helpId } = foundLookup;
                const viewModelId = props.activeViewModel?.id;
                if (helpId && viewModelId) {
                    fromDataSource.value = await getHelpFields(helpId);
                    toDataSource.value = await getFormFields(viewModelId);
                    gridColumns[1].editor.data = toDataSource.value;
                    return true;
                }
                return false;
            };
            return {
                type: externalParamterEditor['fieldMapping'],
                customRender: ExternalEventParameterComponent ? () =>
                    <ExternalEventParameterComponent
                        {...externalComponentProps['fieldMapping'](
                            parameter.value,
                            parameter,
                            onChangeValue,
                            beforeOpen
                        )}
                    >
                    </ExternalEventParameterComponent> : null
            };
        }

        // 根据命令构造参数编辑器入参
        function getParameterEditorByCommand(parameter: ParamConfig) {
            const ExternalEventParameterComponent = externalComponents[parameter.name];
            const onChangeValue = () => {
                commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
                updateViewModel(commandsData.value);
            };
            return {
                type: externalParamterEditor[parameter.name] || parameter.controlSource?.type || 'Default',
                customRender: ExternalEventParameterComponent ? () =>
                    <ExternalEventParameterComponent
                        {...externalComponentProps[parameter.name](parameter,
                            onChangeValue
                        )}
                    >
                    </ExternalEventParameterComponent> : null
            };
        }

        /**
         * 由外部触发刷新方法
         */
        function refreshMethodList(newCommandsData: Array<Command>, newActiveViewModel: FormViewModel, specifiedCommandId?: string) {
            commandsData.value = newCommandsData || [];
            // cleanData(commandsData.value);
            activeViewModel.value = newActiveViewModel;
            treeGridRef.value.updateDataSource(commandsData.value);
            treeGridRef.value.clearSelection();

            if (commandsData.value.length) {
                const currentSelectedCommandId = selectedTreeNode.value && !selectedTreeNode.value.parent ? selectedTreeNode.value.id : '';
                treeGridRef.value.selectItemById(specifiedCommandId || currentSelectedCommandId || commandsData.value[0].id);
            } else {
                selectedTreeNode.value = null;
                paramsData.value = [];
            }
        }

        function reassignCommandData(commandData: Command) {
            treeGridRef.value.reassignRowData(selectedTreeNode.value.id, commandData);
        }

        const isCurrentFormController = (controllerLabel: string) => {
            if (!controllerLabel) {
                return false;
            }
            return controllerLabel.indexOf(useFormSchemaComposition.getModule().code) > -1
        };

        function onViewMethodSource($event) {
            if ($event.node && $event.node.hasChildren) {
                return;
            }

            const { controller, isInValid } = $event.node.data;
            if (isInValid || !controller || (controller && (controller.isCommon || !isCurrentFormController(controller.label)))) {
                return;
            }

            const { data } = $event.node;
            context.emit('viewSource', data);
        }

        const isCustomMethod = computed(() => {
            const controllerInfo = selectedTreeNode.value?.data.controller;
            return !controllerInfo?.isCommon && isCurrentFormController(controllerInfo?.label);
        });

        onMounted(() => {
        });

        context.expose({
            cleanData,
            cleanDataItem,
            reassignCommandData,
            refreshMethodList,
            selectedTreeNode,
            isCommandNodeSelected,
            isValidCommandSelected,
            updateViewModel
        });

        /**
         * 渲染方法的来源信息
         */
        function renderCommandSource() {
            const selectedData = selectedTreeNode.value?.data;
            if (isCommandNodeSelected.value && selectedData && selectedData.controllerName) {
                return <div class="f-struct-wrapper" style="user-select:text">
                    <div class="f-section-form f-section-in-main f-section pt-0">
                        <div class="f-section-header">
                            <div class="f-title">
                                <h4 class="f-title-text">方法来源</h4>
                            </div>
                        </div>
                        <div class="f-section-content pl-2">
                            <div class="col-12 mb-2 d-inline-block">
                                <div class="farris-group-wrap">
                                    <div class="form-group farris-form-group">
                                        <label class="col-form-label">
                                            <span class="farris-label-text">控制器：
                                                {selectedData.controllerName}（{selectedData.controllerCode}）
                                            </span>
                                        </label>
                                        {selectedData.handlerShowName ?
                                            <label class="col-form-label">
                                                <span class="farris-label-text">
                                                    引用方法：{selectedData.handlerShowName}（{selectedData.handlerName}）
                                                </span>
                                            </label> : ''}

                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>;
            }
        }
        /**
         * 渲染操作的来源信息
         */
        function renderHandlerSource() {
            const selectedData = selectedTreeNode.value?.data;
            if (!isCommandNodeSelected.value && selectedData && selectedData.componentName) {
                return <div class="f-struct-wrapper" style="user-select:text">
                    <div class="f-section-form f-section-in-main f-section pt-0">
                        <div class="f-section-header">
                            <div class="f-title">
                                <h4 class="f-title-text">构件</h4>
                                {isCustomMethod.value && <button class="btn btn-link f-icon f-icon-source-code" title="查看源码" onClick={() => onViewMethodSource({ node: selectedTreeNode.value })}></button>}
                            </div>
                        </div>
                        <div class="f-section-content pl-2">
                            <div class="col-12 mb-2 d-inline-block">
                                <div class="farris-group-wrap">
                                    <div class="form-group farris-form-group">
                                        <label class="col-form-label">
                                            <span class="farris-label-text">
                                                构件名称： {selectedData.componentName}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>;
            }
        }

        /**
         * 渲染方法参数面板
         */
        function renderParameterPanel() {
            const selectedData = selectedTreeNode.value?.data;

            if (isCommandNodeSelected.value && selectedData && paramsData.value?.length > 0) {

                return <div class="f-section-form f-section-in-main f-section pt-0">
                    <div class="f-section-header">
                        <div class="f-title">
                            <h4 class="f-title-text">方法参数</h4>
                            {selectedData.needRefreshParam ?
                                <span title="构件中方法的参数发生变更，请点击更新"
                                    class="update-param text-warning f-cursor-pointer" onClick={updateCommandParamFromWebCmd}>
                                    <i class="ml-2 f-icon f-icon-recurrence"></i> 更新
                                </span> : ''}

                        </div>
                    </div>
                    <div class="f-section-content pl-2">
                        {paramsData.value.map((paramData: ParamConfig, index: number) => {
                            const editor = paramData?.controlSource?.type === 'MappingFieldsEditor' ?
                                getFieldMappingEditor(paramData, selectedData) :
                                getParameterEditorByCommand(paramData);
                            const data = reactive(getEventParameterData(paramData.controlSource?.context?.data?.value) || []);
                            const customStatus = (visualData: VisualData) => {
                                if (paramData.controlSource?.context?.data?.value === ':Entity') {
                                    return visualData;
                                }
                                if (visualData.raw.children && visualData.raw.children.length) {
                                    visualData.disabled = true;
                                }
                                return visualData;
                            };
                            const paramDescriptionTooltip = reactive({ content: paramData.description, placement: 'top' });
                            return <div class="col-12 mb-2 d-inline-block">
                                <div class="farris-group-wrap">
                                    <div class="form-group farris-form-group">
                                        <label class="col-form-label">
                                            <span class="farris-label-text" title={paramData.name}>
                                                {paramData.shownName}
                                            </span>
                                            {paramData.description ?
                                                <span class="farris-label-tips ml-2" v-tooltip={paramDescriptionTooltip}>
                                                    <i class="f-icon f-icon-description-tips"></i>
                                                </span> : ''}
                                            {paramData.isDisused ?
                                                <span title="参数已在构件中被移除，请更新！">
                                                    <i class="ml-2 f-icon f-icon-message_warning text-warning text-tip"></i>
                                                </span> : ''}
                                        </label>

                                        <div class="farris-input-wrap f-cmp-inputgroup">
                                            <FEventParameter
                                                readonly={designerContext.designerMode === DesignerMode.PC_RTC && !selectedData.isRtcCommand}
                                                key={paramData.name + index}
                                                defaultValue={paramData.defaultValue}
                                                v-model={paramData.value}
                                                data={data}
                                                editor={editor}
                                                fieldData={assembleSchemaFieldsByComponent()}
                                                activeViewModelFieldData={assembleSchemaFieldsUnderBoundEntity(targetComponentId.value)}
                                                varData={assembleStateVariables()}
                                                formData={assembleOutline()}
                                                editorType={paramData?.controlSource?.type || 'Default'}
                                                editorControlSource={paramData?.controlSource}
                                                // idField={paramData?.controlSource?.context?.valueField?.value
                                                //     || paramData?.controlSource?.context?.idField?.value || 'id'}
                                                customStatus={customStatus}
                                                idField={
                                                    paramData.controlSource?.context?.data?.value === ':Entity' ? 'bindTo' :
                                                        (paramData?.controlSource?.context?.valueField?.value
                                                            || paramData?.controlSource?.context?.idField?.value || 'id')}
                                                textField={
                                                    paramData?.controlSource?.context?.textField?.value || 'label'
                                                }
                                                editable={
                                                    paramData?.controlSource?.context?.editable?.value
                                                }
                                                onConfirm={() => {
                                                    commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
                                                    updateViewModel(commandsData.value);
                                                }}
                                                onValueChange={() => {
                                                    // 隐藏帮助命令下，切换帮助后，字段映射值清空
                                                    if (paramData.name === 'lookupId') {
                                                        const fieldMappingParam = selectedTreeNode.value.data.params.find((param: any) => {
                                                            return param.name === 'mappingFields';
                                                        });
                                                        if (fieldMappingParam && fieldMappingParam.value) {
                                                            fieldMappingParam.value = '';
                                                        }
                                                    }
                                                    commandsData.value[selectTreeNodeIndex.value] = selectedTreeNode.value;
                                                    updateViewModel(commandsData.value);
                                                }}
                                            >
                                            </FEventParameter>
                                        </div>
                                    </div>
                                </div >
                            </div >;
                        })}
                    </div >
                </div>;
            }
        }
        return () => {
            return (
                <div class="f-utils-fill-flex-row main-panel">
                    <div class="command-panel border">
                        <FTreeGrid
                            ref={treeGridRef}
                            columns={columns}
                            data={commandsData.value}
                            fit={true}
                            hierarchy={{
                                collapseField: 'collapse'
                            }}
                            columnOption={{ fitColumns: true }}
                            row-number={rowNumberOption}
                            onDblclickNode={onViewMethodSource}
                            onSelectionChange={onChangeSelectedCommand} row-option={rowOption}>
                            {{
                                'cellTemplate': ({ cell, row }) => {
                                    const rowData = row.raw?.data;
                                    const methodNameTooltip = reactive({ content: rowData?.description, placement: 'top' });
                                    return cell.field === 'name' ?
                                        <>
                                            <span title={cell.data || ''}>{(cell.data || '')}</span>
                                            {rowData?.description ?
                                                <div class="farris-label-tips ml-2" v-tooltip={methodNameTooltip}>
                                                    <i class="f-icon f-icon-description-tips"></i>
                                                </div> : ''
                                            }
                                            {rowData?.isInValid ?
                                                <span title="方法已失效，请确认构件中是否包含此方法">
                                                    <i class="ml-2 f-icon f-icon-message_warning text-error text-tip"></i>
                                                </span> : ''
                                            }
                                            {rowData?.needRefreshParam ?
                                                <span title="构件中方法的参数发生变更，请更新右侧参数列表"  >
                                                    <i class="ml-2 f-icon f-icon-message_warning text-warning text-tip"></i>
                                                </span> : ''
                                            }
                                        </> : (cell.data || '');
                                }
                            }
                            }
                        </FTreeGrid >
                    </div >
                    <div class="param-panel f-utils-fill f-utils-overflow-auto">
                        {renderCommandSource()}
                        {renderHandlerSource()}
                        {renderParameterPanel()}
                    </div>
                </div >
            );
        };
    }
});
