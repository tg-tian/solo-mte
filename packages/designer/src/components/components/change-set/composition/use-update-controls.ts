import { get, mergeWith, set } from "lodash-es";
import { DesignViewModel } from "../../../../components/types/design-viewmodel";
import { FormSchemaEntity } from "../../../../components/types";
import { ChangeSetProps } from "../change-set.props";
import { SchemaDOMMapping } from "@farris/ui-vue";
import { useSolutionValidation } from "@farris/ui-vue";
import { DesignViewModelField } from "@farris/ui-vue";

/**
 * 变更实体
 */
class SchemaChangeEntity {
    [fieldId: string]: [{
        propPath: string;
        newValue: any;
        oldValue?: any;
    }]
}

export function useUpdateControls(
    props: ChangeSetProps,
    useSchemaChangesetComposition: any
) {
    const changeSelected = useSchemaChangesetComposition.changeSelected.value;
    const changeList = useSchemaChangesetComposition.changeList.value;

    const { formSchemaUtils: useFormSchema, designViewModelUtils: dgVMService, schemaService, controlCreatorUtils } = props.designerService;

    /**
     * 根据bindTo获取对应表信息
     * @param entities 实体
     * @param bindTo VM绑定
     */
    function getTableBasicInfoByCode(entities: FormSchemaEntity[], entityCode: string, isMainEntity = true, parentLabel = ''): any {
        if (!entities || entities.length === 0) {
            return;
        }

        for (const entity of entities) {
            if (entityCode === entity.code) {
                return {
                    id: entity.id,
                    code: entity.code,
                    name: entity.name,
                    label: entity.label,
                    isMainEntity,
                    parentLabel
                };
            }
            const entityType = entity.type;

            if (entityType && entityType.entities && entityType.entities.length > 0) {
                const basicInfo = getTableBasicInfoByCode(entityType.entities, entityCode, false, entity.label);
                if (basicInfo) {
                    return basicInfo;
                }
            }
        }

    }
    /**
     * 修改表编号后，同步修改VM中的bindTo属性、命令参数中的表编号
     */
    function syncViewModelAfterEntityCodeChange(newLabel: string, oldLabel: string) {
        useFormSchema.getViewModels().forEach(viewModel => {
            if (viewModel.bindTo === '/') {
                return;
            }
            // 1、修改vm中bindTo属性
            const bindToList = viewModel.bindTo.split('/');
            bindToList.forEach((bindToLabel, index) => {
                if (bindToLabel === oldLabel) {
                    bindToList[index] = newLabel;
                }
            });
            viewModel.bindTo = bindToList.join('/');

            // 2、修改vm命令的参数中用到的表编号
            if (viewModel.commands && viewModel.commands.length) {
                viewModel.commands.forEach(command => {
                    if (command.params && command.params.length) {
                        command.params.forEach(param => {
                            if (param.value && param.value.includes(`/${oldLabel}/`)) {
                                param.value = param.value.replace(`/${oldLabel}/`, `/${newLabel}/`);
                            }
                        });
                    }
                });
            }

        });
    }
    /**
     * 修改表编号后，若表单中有对应的DataGrid或TreeGrid控件，需要将控件的dataSource属性替换为新表label
     */
    function syncDataGridAfterEntityCodeChange(newLabel: string, oldLabel: string) {
        useFormSchema.getComponents().forEach(component => {
            if (component.componentType === 'data-grid') {
                // 定位到表格控件
                const dataGridNode = useFormSchema.selectNode(component,
                    (item) => ['data-grid', 'tree-grid'].includes(item.type));

                // 替换dataSource属性
                if (dataGridNode && dataGridNode.dataSource && dataGridNode.dataSource === oldLabel) {
                    dataGridNode.dataSource = newLabel;
                }
            }
        });


    }
    /**
     * 表单schema中实体信息（编号）更新后，同步vm、控件的逻辑
     * @param entityChangeSet 实体变更集
     */
    function refreshAfterEntityCodeChange(entityChangeSet: SchemaChangeEntity) {
        Object.keys(entityChangeSet).forEach(entityId => {
            const changeSet = entityChangeSet[entityId];
            // 编号变更
            const codeChange = changeSet.find(change => change.propPath === 'code');
            const labelChange = changeSet.find(change => change.propPath === 'label');
            if (!codeChange || !labelChange) {
                return;
            }
            const { schemaService } = props.designerService;
            const newEntityInfo = getTableBasicInfoByCode(schemaService.getSchemaEntities(), codeChange.newValue);
            if (!newEntityInfo) {
                return;
            }
            const newLabel = newEntityInfo.label;
            const oldLabel = labelChange.oldValue;

            syncViewModelAfterEntityCodeChange(newLabel, oldLabel);

            syncDataGridAfterEntityCodeChange(newLabel, oldLabel);
        });
    }
    function assignControlDom(oldControlDom, metadata) {
        for (const key of Object.keys(oldControlDom)) {
            delete oldControlDom[key];
        }
        Object.assign(oldControlDom, metadata);
    }

    /**
     * 若字段配置了表达式，需要删除表达式
     */
    function clearExpressionByFieldId(fieldIdList: string[]) {
        let expressions = useFormSchema.getExpressions();
        if (expressions && expressions.length && fieldIdList.length) {
            expressions = expressions.filter(e => !fieldIdList.includes(e.target));
            useFormSchema.setExpressions(expressions);
        }
    }

    /**
     * 根据VMID和字段ID删除字段
     * @param viewModelId VMID
     * @param fieldIdList 字段ID列表
     */
    function deleteFieldById(viewModelId: string, fieldIdList: string[]) {
        const dgViewModel = dgVMService.getDgViewModel(viewModelId);
        if (!dgViewModel) { return; }

        dgViewModel.removeField(fieldIdList);

        clearExpressionByFieldId(fieldIdList);
        /* 若绑定字段配置了界面规则，需删除界面规则中有关的字段记录 */
        // fieldIdList.forEach(fieldId => {
        //    useFormSchema.deleteFormRule(fieldId);
        // })
    }
    /**
     * 对于table中的输入控件，若绑定字段被移除，需要自动清除单元格的绑定。
     * @param controls 
     * @param viewModelId 
     */
    function updateTableEditorAfterSchemaFieldRemoved(controls: any[], viewModelId: string) {
        if (controls && controls.length) {
            const fieldIds: string[] = [];
            controls.forEach(control => {
                if (control.showInTable && control.binding && control.binding.field) {
                    fieldIds.push(control.binding.field);
                    assignControlDom(control, { type: null, binding: null });
                }

                if (control.tdType === 'staticText' && control.staticText) {
                    control.staticText.text = '';
                    control.staticText.require = false;
                }
            });

            deleteFieldById(viewModelId, fieldIds);
        }
    }

    /**
     * 清除控件上记录的表达式和界面规则
     */
    function clearExpressionAndRuleInControl(dgField: DesignViewModelField, controls: any[]) {

        if (dgField && controls && controls.length) {
            controls.map(control => {
                Object.keys(control).map(propertyID => {
                    if (control[propertyID] && (control[propertyID].type === 'Expression' || control[propertyID].type === 'FormRule')) {
                        control[propertyID] = useFormSchema.getDefaultValueByFiledAndType(propertyID, dgField);
                    }
                    if (propertyID === 'editor' && control.editor) {
                        clearExpressionAndRuleInControl(dgField, [control.editor]);
                    }
                });
            });
        }
    }
    /**
     * schema变更字段类型后替换DOM控件
     * @param controls
     * @param dgField
     */
    function changeControlType(controls, dgField, dgViewModel: DesignViewModel) {
        // 删除VM上针对原字段的修改
        const schema = schemaService.getFieldByIDAndVMID(dgField.id, dgViewModel.id);
        dgViewModel.clearFieldChange(schema.schemaField, dgField);

        clearExpressionByFieldId([dgField.id]);
        // clearFormruleByFieldId([dgField.id]);
        clearExpressionAndRuleInControl(dgField, controls);

        controls.forEach(control => {
            const isTableStaticTd = control.type === 'TableTd' && control.tdType === 'staticText';
            if (dgField.$type === 'ComplexField') {
                // table内的输入控件自动移除单元格的绑定数据
                if (control.showInTable) {
                    assignControlDom(control, { type: null, binding: null });
                    deleteFieldById(dgViewModel.id, [dgField.id]);
                }
                if (isTableStaticTd) {
                    control.staticText.text = '';
                    control.staticText.require = false;
                }
                return;
            }
            if (isTableStaticTd) {
                return;
            }

            if (control.type === 'data-grid-column' || control.type === 'tree-grid-column') {
                const editable = control.editor ? true : false;
                const metadata = controlCreatorUtils.setGridFieldProperty(control.type, dgField, null, editable);
                // 保留原id、field
                metadata.id = control.id;
                metadata.field = control.field;
                assignControlDom(control, metadata);
            } else {
                // if (control.showInTable) {
                //     metadata = this.controlCreatorService.createTableTdControlBySchemaFeild(dgField, '');
                // } else {
                const metadata = controlCreatorUtils.setFormFieldProperty(dgField, '');
                // }
                // 保留原id、name、样式
                metadata.id = control.id;
                metadata.label = control.label;
                metadata.appearance = control.appearance;

                // 只读属性：除非配置为表达式，否则都沿用旧控件的只读值
                // if (!(control.readonly && control.readonly.type === 'Expression')) {
                //     metadata['readonly'] = control.readonly;
                // }
                assignControlDom(control, metadata);


            }
        });


    }
    /**
     * 根据schema的变更获取DOM对应的变更
     * @param controlDom 控件DOM
     * @param changeObjects schema变更集合
     */
    function getDomChangeBySchemaChange(controlDom, changeObjects) {
        const schemaChangePaths = changeObjects.map(c => c.propPath);
        const mappingArray = SchemaDOMMapping.mappingDomPropAndSchemaProp(controlDom);
        const domChangeset = {};
        mappingArray.map(m => {
            if (schemaChangePaths.includes(m.schemaField)) {
                const changeObject = changeObjects.find(c => c.propPath === m.schemaField);

                // 只读、必填属性单独处理： 需要同步的场景有：1、控件设置为boolean时（状态机、表达式等不更新）2、vo上属性由false改成true
                if (m.schemaField === 'readonly') {
                    if (typeof (controlDom.editor?.readonly) === 'boolean' || changeObject.newValue === true) {
                        set(domChangeset, m.domField, changeObject.newValue);
                    }
                } else if (m.schemaField === 'require') {
                    if (typeof (controlDom.editor?.required) === 'boolean' || changeObject.newValue === true) {
                        set(domChangeset, m.domField, changeObject.newValue);
                    }
                }
                else {
                    set(domChangeset, m.domField, changeObject.newValue);
                }
            }
        });

        return domChangeset;
    }

    /**
     * 根据控件变更集更新控件。
     * @param fieldChanges 字段变更集
     * @param controls 控件列表
     * @param dgField 字段
     * @param viewModelId 模型ID
     */
    function updateControlsBySchemaChange(fieldChanges, controls, dgField, viewModelId) {
        let updateChanges: any[] = [];
        const viewModel = useFormSchema.getViewModelById(viewModelId);
        const viewModelField = viewModel.fields.find(field => field.id === dgField.id);
        const { fieldSchema } = viewModelField;

        // ① 收集需要在控件上变更的属性：VM上没有变更记录 或者 变更的属性不在VM的变更记录中
        if (!fieldSchema) { // 字段没有变更记录
            updateChanges = updateChanges.concat(fieldChanges);
        } else {
            // 判断变更是否在fieldSchema中，若在不更control，若不在，更control(因为表单对控件的变更优先于VO的变更)。枚举数据除外
            fieldChanges.forEach(change => {
                const propInVm = get(fieldSchema, change.propPath, 'notFound');
                if (propInVm === 'notFound' || change.propPath === 'type.enumValues') {
                    updateChanges.push(change);
                }
                if (change.propPath === 'type.precision' && change.newValue < propInVm) {
                    updateChanges.push(change);
                }
                if (change.propPath === 'type.length' && change.newValue < propInVm) {
                    updateChanges.push(change);
                }
            });
        }
        if (updateChanges.length === 0) {
            return;
        }

        // ③ 更新control属性
        controls.forEach(control => {
            if (control.type === 'TableTd' && control.tdType === 'staticText') {
                return;
            }

            const domChangeset = getDomChangeBySchemaChange(control, updateChanges);

            // 数组类型不再合并，全量替换：用户枚举数据的更改
            function customizer(objValue, srcValue) {
                if (Array.isArray(objValue)) {
                    return srcValue;
                }
            }
            mergeWith(control, domChangeset, customizer);

            // 若schema bindingField 变更，需要同步viewmodel field中的fieldName值
            const bindingFieldProp = updateChanges.find(c => c.propPath === 'bindingField');
            if (bindingFieldProp) {
                viewModelField.fieldName = bindingFieldProp.newValue;
            }

            // 数字类型从普通浮点数转为大数字：不更换控件，但要修改控件bigNumber属性
            // if (control.editor?.type === 'number-spinner') {
            //     const bigNumber = updateChanges.find(c => c.propPath === 'type.$type' && c.newValue.includes('NumericType'));
            //     if (bigNumber) {
            //         control.editor.bigNumber = bigNumber.newValue === FormSchemaEntityFieldType$Type.BigNumericType;
            //     }
            // }

            // 日期控件，需要同步修改显示时间以及时间格式属性
            if (control.editor?.type === 'date-picker') {
                const fieldTypeName = updateChanges.find(c => c.propPath === 'type.name');
                if (fieldTypeName) {
                    control.editor.showTime = fieldTypeName.newValue === 'DateTime';
                    const formatValue = control.editor.showTime ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd';

                    control.editor.displayFormat = formatValue;
                    if (control.formatter?.dateFormat) {
                        control.formatter.dateFormat = formatValue;
                    }
                    if (control.editor.showTime) {
                        control.editor.valueFormat = formatValue;
                    } else {
                        delete control.editor.valueFormat;
                    }
                }
            }

        });

    }
    /**
     * 同步卡片、列表等直接绑定字段的控件
     */
    function refreshBindingControls(changes: SchemaChangeEntity) {
        const dgViewModels = dgVMService.getDgViewModels();
        dgViewModels.forEach(dgViewModel => {
            if (!dgViewModel.fields || dgViewModel.fields.length === 0) {
                return;
            }
            dgViewModel.fields.forEach(field => {
                // 1、 获取当前VM对应的组件中绑定该字段的所有控件
                const controls = useFormSchema.getControlsInCmpWidthBinding(dgViewModel.id, field.id);
                // 字段不存在：若是table类型，则需要自动移除编辑器
                if (field.isSchemaRemoved) {
                    updateTableEditorAfterSchemaFieldRemoved(controls, dgViewModel.id);
                }
                const fieldChanges = changes[field.id];


                if (!fieldChanges) {
                    return;
                }

                if (!controls && controls.length === 0) {
                    return;
                }

                // 2、判断是否需要替换控件：字段类型更改并且后替换控件
                // udt和关联字段，不要同步，需要手动删除。
                const typeChange = fieldChanges.find(c => c.propPath === 'type.$type');
                const editorChange = fieldChanges.find(c => c.propPath === 'editor' || c.propPath === 'editor.$type');
                const multiLanguageChange = fieldChanges.find(c => c.propPath === 'multiLanguage');

                // ① 替换控件
                if (typeChange && editorChange) {
                    changeControlType(controls, field, dgViewModel);
                    return;
                }

                // 若多语属性由false-->true，需要替换控件
                if (multiLanguageChange && editorChange) {
                    changeControlType(controls, field, dgViewModel);
                    return;
                }

                // ② 不需要替换控件
                updateControlsBySchemaChange(fieldChanges, controls, field, dgViewModel.id);
            });
        });
    }

    /**
    * 判断表单中是否有筛选方案并更新
    */
    function updateQuerySolutionSchema() {
        const rootNode = useFormSchema.getComponents()[0];
        const solutionSchema = useFormSchema.selectNode(rootNode, (schema) => schema.type === 'query-solution');
        const { checkAndUpdateSolutionConfig } = useSolutionValidation(schemaService);
        if (solutionSchema) {
            const { fields, presetFields } = checkAndUpdateSolutionConfig(solutionSchema.fields, solutionSchema.presetFields);
            solutionSchema.fields = fields;
            solutionSchema.presetFields = presetFields;
        }

    }

    /**
     * 更新Dg ViewModel 和 DOM结构
     */
    function updateFormControls() {

        // 1、收集实体、字段变更集
        const fieldChangeSet = {}; // fieldId: { propPath, newValue}, 平铺type和editor的改动
        const entityChangeSet = {}; // entityId:{ propPath, newValue}
        Object.keys(changeSelected).forEach(fieldId => {
            const selectedChange = changeSelected[fieldId];
            const fieldChanges: any[] = [];
            const entityChanges: any[] = [];
            Object.keys(selectedChange).forEach(propPath => {
                if (selectedChange[propPath]) {
                    const changeInfo = changeList.find(change => change.fieldId === fieldId && change.propPath === propPath);
                    if (changeInfo.isEntity) {

                        entityChanges.push({
                            propPath,
                            newValue: changeInfo.newValue,
                            oldValue: changeInfo.oldValue
                        });
                        return;
                    }
                    if ((propPath === 'editor' || propPath === 'type') && changeInfo.newValue) {
                        Object.keys(changeInfo.newValue).forEach(key => {
                            fieldChanges.push({ propPath: propPath + '.' + key, newValue: changeInfo.newValue[key] });
                        });
                    } else {
                        fieldChanges.push({
                            propPath,
                            newValue: changeInfo.newValue
                        });
                    }
                }
            });
            if (fieldChanges.length > 0) {
                fieldChangeSet[fieldId] = fieldChanges;
            }
            if (entityChanges.length) {
                entityChangeSet[fieldId] = entityChanges;
            }
        });

        // 2、 调用实体编号更新后的同步服务
        refreshAfterEntityCodeChange(entityChangeSet);


        // 3、重新组装 DgVM
        dgVMService.assembleDesignViewModel();

        // 4、 调用设计器定义的同步控件服务
        refreshBindingControls(fieldChangeSet);

        // 5、将变更记录到service里，方便各控件更新自身DOM中存储的字段信息，例如枚举项、精度等。常用于筛选方案、筛选条、附件等内部绑定字段的控件。
        schemaService.entityChangeset = fieldChangeSet;

        updateQuerySolutionSchema();

    }


    return { updateFormControls };
}
