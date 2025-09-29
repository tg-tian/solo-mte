import { FLoadingService, FNotifyService } from '@farris/ui-vue';
import { defineComponent, inject, ref, SetupContext, computed, onMounted } from 'vue';
import { ExtendFieldEntity, FieldTypeEnums } from '../composition/extend-field';
import { CreateNewFieldProps, createNewFieldProps } from './entity-tree-view.props';
import { FComboList, FNumberSpinner, FSwitch, FSchemaSelectorEditor, LookupSchemaRepositoryToken, FComboTree, VisualData, FPropertyEditor } from '@farris/ui-vue';
import { useNewFieldVerification } from '../composition/use-new-field-verification';
import { useNewFieldUtil } from '../composition/use-new-field-util';

/**
 * 新建字段
 */
export default defineComponent({
    name: 'FCreateNewEntityField',
    props: createNewFieldProps,
    emits: ['cancel', 'submit'] as (any[] & ThisType<void>) | undefined,
    setup(props: CreateNewFieldProps, context: SetupContext) {
        const notifyService: any = new FNotifyService();
        notifyService.globalConfig = { position: 'top-center' };
        const loadingService: any = inject<FLoadingService>('FLoadingService');

        /** 新增字段实体 */
        const extendField = ref(new ExtendFieldEntity());
        const { isFieldNameExisted, checkFieldNameExisted, checkFieldCodeRegValid,
            checkFieldCodeValid, fieldLabelMessage, isFieldLabelValid, checkFieldValidation } = useNewFieldVerification(props, extendField, notifyService);
        const { onChangeFieldType, fieldObjectTypes, renderEnumValuesEditor, isLengthReadonly, isPrecisionReadonly, maxLength, maxPrecision,
            resolveFieldInfo, helpMetadataName, onSubmitHelpMetadata, onHelpMetadataSelected, helpSchemaTreeData, relatedHelpFieldIds,
            onHelpRelatedFieldsChanged, relatedFieldsTreeData, helpFieldId, onHelpBindingFieldsChanged } = useNewFieldUtil(props, extendField);

        /** 默认值组件实例 */
        const defaultValueRef = ref();

        /** 字段标签行样式 */
        const fieldLabelSpanClass = computed(() => {
            return {
                'farris-feedback': true,
                'f-state-valid': isFieldLabelValid.value,
                'f-state-invalid': !isFieldLabelValid.value,
                'position-relative': true,
            };
        });


        function onCancel() {
            context.emit('cancel');
        }

        function onSubmit() {
            const loadingInstance = loadingService.show();
            if (!checkFieldValidation(helpMetadataName, relatedHelpFieldIds, helpFieldId, defaultValueRef)) {
                loadingInstance.value.close();
                return;
            }

            checkFieldCodeValid().then(result => {
                if (result) {
                    const newFieldInfo = resolveFieldInfo();
                    context.emit('submit', newFieldInfo);
                }
                loadingInstance.value.close();

            }, () => {
                loadingInstance.value.close();
            });

        }

        function renderEditor(title: string, editor: any, hideLabel = false) {
            return <div class="farris-group-wrap">
                <div class="form-group farris-form-group">
                    <label class="col-form-label">
                        {hideLabel ?
                            <span class="farris-label-text" style="visibility: hidden;">{title}</span> :
                            <span class="farris-label-text">{title}</span>}
                    </label>
                    <div class="farris-input-wrap">
                        {editor}
                    </div>
                </div>
            </div>;
        }

        /** 渲染帮助元数据的选择器 */
        function renderHelpMetadataSelector() {
            const viewOptions = [{ id: 'total', title: '全部', type: 'List', dataSource: 'Total' }];
            const repositoryToken = LookupSchemaRepositoryToken;
            const editorParams = { formBasicInfo: props.useFormSchema.getFormMetadataBasicInfo() };
            return <FSchemaSelectorEditor
                title="选择帮助元数据"
                viewOptions={viewOptions}
                editorParams={editorParams}
                v-model={helpMetadataName.value}
                repositoryToken={repositoryToken}
                onSubmitModal={onSubmitHelpMetadata}
                onSchemaSelected={onHelpMetadataSelected}>
            </FSchemaSelectorEditor>;
        }

        /** 设置帮助关联字段下拉树表格的行禁用 */
        const helpRelateTreeCustomRowStatus = (visualData: VisualData) => {
            if (!visualData.raw.selectable) {
                visualData.disabled = true;
            }
            return visualData;
        };

        /** 渲染帮助关联字段的选择器 */
        function renderHelpRelateSelector() {
            return <FComboTree multiSelect={true} textField="name" valueField="id" data={helpSchemaTreeData.value} v-model={relatedHelpFieldIds.value}
                customRowStatus={helpRelateTreeCustomRowStatus} onChange={onHelpRelatedFieldsChanged} ></FComboTree>;
        }

        /** 渲染帮助绑定字段的选择器 */
        function renderHelpFieldSelector() {
            return <FComboTree textField="name" valueField="id" data={relatedFieldsTreeData.value} v-model={helpFieldId.value}
                onChange={onHelpBindingFieldsChanged} ></FComboTree>;
        }

        /** 渲染默认值编辑器 */
        function renderDefaultValueEditor() {
            const valueTypes = ['Custom', 'Expression'];
            const expressionConfig = {
                dialogTitle: '默认值编辑器',
                showMessage: false,
                showDataPanel: false,
                expressionInfo: {
                    expressionType: 'defaultValue',
                    targetId: extendField.value.id
                }
            };
            function onDefaultValueChanged(newValue: any) {
                if (newValue?.type === 'Expression') {
                    extendField.value.defaultValue = {
                        type: 'expression',
                        value: newValue.expressionInfo?.value
                    };
                } else {
                    extendField.value.defaultValue = newValue;

                }
            }

            return <FPropertyEditor ref={defaultValueRef} v-model={extendField.value.defaultValue} propertyTypes={valueTypes}
                expressionConfig={expressionConfig} onValueChange={onDefaultValueChanged}>
            </FPropertyEditor>;
        }
        return () => {
            return <div class="h-100 d-flex flex-column flex-fill justify-content-between">
                <div class="farris-form-controls-inline p-3" >
                    {renderEditor('字段类型',
                        <FComboList style="flex: 1 1 0" data={FieldTypeEnums} v-model={extendField.value.type}
                            idField="value" textField="text" valueField="value"
                            onChange={onChangeFieldType} class="f-border-editor-input"></FComboList>
                    )}
                    {renderEditor('字段名称',
                        <>
                            <input class="form-control" type="text" v-model={extendField.value.name} onKeyup={checkFieldNameExisted} />
                            {extendField.value.name && isFieldNameExisted.value &&
                                <div class="farris-feedback f-state-invalid" style=" position: relative; top: 0;">
                                    <span class="f-feedback-message">名称已存在，请重新输入</span>
                                </div>}</>
                    )}
                    {renderEditor('字段编号',
                        <input class="form-control" type="text" v-model={extendField.value.code} onKeyup={checkFieldCodeRegValid} onBlur={checkFieldCodeValid} />
                    )}
                    {renderEditor('字段标签',
                        <div class={fieldLabelSpanClass.value} style="top: 0;">
                            <span class="f-feedback-message">{fieldLabelMessage.value}</span>
                        </div>,
                        true
                    )}

                    {extendField.value.type === 'String' &&
                        renderEditor('对象类型',
                            <FComboList data={fieldObjectTypes} v-model={extendField.value.objectType}
                                idField="value" textField="text" valueField="value">
                            </FComboList>
                        )
                    }
                    {extendField.value.objectType === 'Enum' && renderEditor('枚举数据', renderEnumValuesEditor())}

                    {extendField.value.objectType !== 'Association' ? <>
                        {renderEditor('字段长度',
                            <FNumberSpinner v-model={extendField.value.length} readonly={isLengthReadonly.value} min="0"
                                precision="0" max={maxLength.value}>
                            </FNumberSpinner>
                        )}
                        {extendField.value.type === 'Decimal' && renderEditor('字段精度',
                            <FNumberSpinner v-model={extendField.value.precision} readonly={isPrecisionReadonly.value} min="0"
                                precision="0" max={maxPrecision.value}>
                            </FNumberSpinner>
                        )}
                        {renderEditor('字段默认值', renderDefaultValueEditor())}
                        {renderEditor('是否必填',
                            <FSwitch v-model={extendField.value.require}></FSwitch>
                        )}
                        {renderEditor('是否只读',
                            <FSwitch v-model={extendField.value.readonly}></FSwitch>
                        )}
                    </> : <>
                        {renderEditor('选择帮助', renderHelpMetadataSelector())}
                        {renderEditor('关联字段', renderHelpRelateSelector())}
                        {renderEditor('帮助绑定字段', renderHelpFieldSelector())}
                    </>
                    }

                </div >
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onClick={onCancel}>取消</button>
                    <button type="button" class="btn btn-primary" onClick={onSubmit}>确定</button>
                </div>
            </div >;
        };
    }
});
