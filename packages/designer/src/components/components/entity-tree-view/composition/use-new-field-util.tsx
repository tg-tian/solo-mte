import { FormSchemaEntityField, FormSchemaEntityField$Type, FormSchemaEntityFieldEditor, FormSchemaEntityFieldType$Type, UseFormSchema } from "../../../types";
import { Ref, ref } from 'vue';
import { CreateNewEntityProps, CreateNewFieldProps } from '../components/entity-tree-view.props';
import { FItemCollectionEditor } from '@farris/ui-vue';
import { ElementDataType, ElementObjectType, ExtendFieldEntity, FieldObjectTypeEnums } from './extend-field';
import { cloneDeep } from 'lodash-es';
import { MetadataService } from "../../../../components/composition/metadata.service";
import axios from "axios";
import { IdService } from "../../view-model-designer/method-manager/service/id.service";

export function useNewFieldUtil(props: CreateNewFieldProps, extendField: Ref<ExtendFieldEntity>) {

    // 长度字段是否只读
    const isLengthReadonly = ref(false);
    const maxLength = ref(2000);

    // 精度字段是否只读
    const isPrecisionReadonly = ref(true);
    const maxPrecision = ref(8);

    /** 字段对象类型枚举 */
    const fieldObjectTypes = ref(cloneDeep(FieldObjectTypeEnums));
    /** 帮助元数据 */
    const helpMetadata = ref();
    const helpMetadataName = ref();
    /** 选中的关联字段id集合 */
    const relatedHelpFieldIds = ref();
    /** 选中的关联字段集合 */
    const relatedHelpFields = ref();
    /** 帮助元数据主表字段的树结构集合，用于选择帮助关联字段 */
    const helpSchemaTreeData = ref();
    /** 帮助元数据主表实体节点 */
    const helpSchemaEntity = ref();
    /** 帮助关联字段的树结构集合，用于选择帮助绑定字段 */
    const relatedFieldsTreeData = ref([]);
    /** 帮助绑定字段 */
    const helpField = ref();
    /** 帮助绑定字段id */
    const helpFieldId = ref();
    /** 帮助元数据中schema主对象（新），重新调用接口获取的。因为帮助元数据的schema字段缺失editor、type等属性，所以重新调用接口生成一遍schema */
    const newHelpSchemaEntityFields: Ref<FormSchemaEntityField[] | undefined> = ref();
    /** 转为表单字段后的帮助控件绑定字段 */
    const helpSchemaField = ref();
    /** 帮助映射 */
    const helpMapFields: any = {};

    /**
     * 切换字段类型后，联动变更字段相关属性
     */
    function onChangeFieldType() {
        switch (extendField.value.type) {
            case ElementDataType.String: {
                isLengthReadonly.value = false;
                isPrecisionReadonly.value = true;
                extendField.value.length = 36;
                maxLength.value = 2000;
                extendField.value.precision = 0;
                fieldObjectTypes.value = FieldObjectTypeEnums;

                break;
            }
            case ElementDataType.Decimal: {
                isLengthReadonly.value = false;
                isPrecisionReadonly.value = false;
                extendField.value.length = 18;
                maxLength.value = 30;

                extendField.value.precision = 2;
                extendField.value.multiLanguage = false;
                break;
            }
            case ElementDataType.Text: {
                isLengthReadonly.value = true;
                isPrecisionReadonly.value = true;
                extendField.value.length = 0;
                extendField.value.precision = 0;
                break;
            }
            case ElementDataType.Integer: {
                isLengthReadonly.value = true;
                isPrecisionReadonly.value = true;
                extendField.value.length = 0;
                extendField.value.precision = 0;
                extendField.value.multiLanguage = false;

                // fieldObjectTypes.value = FieldObjectTypeEnums.filter(type => [ElementObjectType.None, ElementObjectType.Enum].includes(type.value));
                break;
            }
            default: {
                isLengthReadonly.value = true;
                isPrecisionReadonly.value = true;
                extendField.value.length = 0;
                extendField.value.precision = 0;
                extendField.value.multiLanguage = false;
            }
        }
        extendField.value.objectType = ElementObjectType.None;
    }
    /**
     * 修改枚举数据
     */
    function onChangeEnumValues(newValue: any) {
        extendField.value.enumValues = newValue || [];
    }
    /**
     * 枚举编辑器
     */
    function renderEnumValuesEditor() {
        const requiredFields = ['value', 'name'];
        const columns = [
            { field: 'value', title: '值', dataType: 'string' },
            { field: 'name', title: '名称', dataType: 'string' }
        ];
        return <FItemCollectionEditor
            valueField='value'
            nameField='name'
            columns={columns}
            requiredFields={requiredFields}
            uniqueFields={requiredFields}
            title='枚举编辑器'
            modelValue={extendField.value.enumValues}
            onChange={onChangeEnumValues}
        >
        </FItemCollectionEditor>;
    }
    /**
     * 获取默认的字段编辑器
     * @param fieldType 字段类型,
     * @param multiLanguage 是否多语
     */
    function getDefaultEditorByType(fieldType: FormSchemaEntityFieldType$Type, multiLanguage = false): FormSchemaEntityFieldEditor {
        // if (multiLanguage) {
        //     return {
        //         $type: DgControl.LanguageTextBox.type
        //     };
        // }

        switch (fieldType) {
            case FormSchemaEntityFieldType$Type.TextType: {
                return {
                    $type: 'MultiTextBox'
                };
            }
            case FormSchemaEntityFieldType$Type.NumericType: {
                return {
                    $type: 'NumericBox'
                };
            }
            case FormSchemaEntityFieldType$Type.DateType: case FormSchemaEntityFieldType$Type.DateTimeType: {
                return {
                    $type: 'DateBox',
                    format: "'yyyy-MM-dd'"
                };
            }
            case FormSchemaEntityFieldType$Type.BooleanType: {
                return {
                    $type: 'CheckBox'
                };
            }
            case FormSchemaEntityFieldType$Type.EnumType: {
                return {
                    $type: 'EnumField'
                };
            }
            default: {
                return {
                    $type: 'TextBox'
                };
            }
        }
    }

    /**
     * 扩展字段类型对象映射到shema类型对象
     * @param field 扩展字段
     */
    function mapExtendFieldType2SchemaType(field: ExtendFieldEntity) {
        const fieldType = field.type;
        switch (field.type) {
            case ElementDataType.String: {
                if (field.objectType === ElementObjectType.Enum) {
                    return {
                        $type: FormSchemaEntityFieldType$Type.EnumType,
                        name: field.objectType,
                        displayName: '枚举',
                        valueType: {
                            $type: FormSchemaEntityFieldType$Type.StringType,
                            name: fieldType,
                            length: field.length || 36,
                            displayName: '字符串'
                        },
                        enumValues: field.enumValues
                    };
                } else {
                    return {
                        $type: FormSchemaEntityFieldType$Type.StringType,
                        name: fieldType,
                        displayName: '字符串',
                        length: field.length || 36
                    };
                }

            }
            case ElementDataType.Text: {
                return {
                    $type: FormSchemaEntityFieldType$Type.TextType,
                    name: fieldType,
                    displayName: '文本',
                    length: 0
                };
            }
            case ElementDataType.Integer: case ElementDataType.Decimal: {
                if (field.objectType === ElementObjectType.Enum) {
                    return {
                        $type: FormSchemaEntityFieldType$Type.EnumType,
                        name: field.objectType,
                        displayName: '枚举',
                        valueType: {
                            $type: FormSchemaEntityFieldType$Type.NumericType,
                            name: 'Number',
                            displayName: '数字',
                            length: field.length || 0,
                            precision: field.precision || 0,
                            elementType: field.type      // 区分整数和浮点数
                        },
                        enumValues: field.enumValues
                    };
                } else {
                    return {
                        $type: FormSchemaEntityFieldType$Type.NumericType,
                        name: 'Number',
                        displayName: '数字',
                        length: field.length || 0,
                        precision: field.precision || 0,
                        elementType: field.type      // 区分整数和浮点数
                    };
                }

            }
            case ElementDataType.Boolean: {
                return {
                    $type: FormSchemaEntityFieldType$Type.BooleanType,
                    name: fieldType,
                    displayName: '布尔'
                };
            }
            case ElementDataType.Date: {
                return {
                    $type: FormSchemaEntityFieldType$Type.DateType,
                    name: 'Date',
                    displayName: '日期',
                    elementType: field.type   // 区分日期和日期时间类型
                };
            }
            case ElementDataType.DateTime: {

                return {
                    $type: FormSchemaEntityFieldType$Type.DateTimeType,
                    name: 'DateTime',
                    displayName: '日期时间',
                    elementType: field.type   // 区分日期和日期时间类型
                };
            }
        }
    }

    /**
     * 组装简单字段的schema字段结构
     */
    function mapExtendFieldToSchemaField(objectType?: string) {
        objectType = objectType || extendField.value.objectType;
        const schemaField: any = {};

        Object.assign(schemaField, {
            id: extendField.value.id,
            originalId: extendField.value.id,
            code: extendField.value.code,
            name: extendField.value.name,
            label: extendField.value.label,
            bindingField: extendField.value.label,
            bindingPath: extendField.value.label,
            path: extendField.value.label
        });

        // 简单字段的类型、编辑器、必填、只读、多语属性
        if (objectType === ElementObjectType.None || objectType === ElementObjectType.Enum) {
            schemaField.type = mapExtendFieldType2SchemaType(extendField.value);
            schemaField.editor = getDefaultEditorByType(schemaField.type.$type, extendField.value.multiLanguage);

            Object.assign(schemaField, {
                $type: FormSchemaEntityField$Type.SimpleField,
                readonly: extendField.value.readonly,
                require: extendField.value.require,
                multiLanguage: extendField.value.multiLanguage || false,
                defaultValue: extendField.value.defaultValue
            });
        } else {
            schemaField.$type = FormSchemaEntityField$Type.ComplexField;
        }

        return schemaField;
    }

    /**
     * 补充帮助元数据schema字段缺失的属性
     * @param selectedField 
     */
    function getMergeNewSchemaField(selectedField: FormSchemaEntityField, targetFields?: FormSchemaEntityField[]) {
        if (!targetFields) {
            targetFields = newHelpSchemaEntityFields.value || [];
        }
        const targetField = targetFields.find(field => field.originalId === selectedField.originalId);
        if (targetField) {
            selectedField.require = targetField.require;
            selectedField.editor = targetField.editor;
            selectedField.multiLanguage = targetField.multiLanguage;
            selectedField.bindingPath = targetField.bindingPath;
            selectedField.readonly = targetField.readonly;

            // 若包含udt带出字段，则补充udt字段信息
            if (targetField.type?.fields?.length && selectedField.type?.fields?.length) {
                const { fields, ...basicTypeInfo } = targetField.type;
                Object.assign(selectedField.type, basicTypeInfo);

                selectedField.type.fields.map(selectedChildField => {
                    selectedChildField = getMergeNewSchemaField(selectedChildField, targetField.type.fields || []);
                });

            } else {
                selectedField.type = targetField.type;
            }

        }

        return selectedField;
    }
    /**
     * 获取UDT明细字段所属的根字段节点
     */
    function getUDTParentField() {
        const relatedRootFields = [] as FormSchemaEntityField[];
        const helpSchemaEntityFields = helpSchemaEntity.value.type.fields;

        // 根据帮助schema字段中是否有editor属性来判断是否需要合并新的帮助schema字段
        const needMergeNewSchemaField = helpSchemaEntityFields[0].editor ? false : true;

        relatedHelpFields.value.forEach(selectedField => {
            // 能从第一层的字段列表中找到，则认为是简单字段。否则是关联带出或者udt字段
            let rootField = helpSchemaEntityFields.find(field => field.bindingField === selectedField.bindingField);
            if (rootField) {
                const schemaField = needMergeNewSchemaField ? getMergeNewSchemaField(selectedField) : selectedField;
                relatedRootFields.push(schemaField);
                return;
            }

            // 因为选择关联字段的下拉帮助中做了限制：只支持一层嵌套，所以此处只需要在帮助实体的第一层字段中查询根节点
            rootField = helpSchemaEntityFields.find(helpSchemaField => {
                if (helpSchemaField.type && helpSchemaField.type.fields) {
                    const leafField = helpSchemaField.type.fields.find(field => field.id === selectedField.id);
                    if (leafField) {
                        return true;
                    }
                }
                return false;
            });
            if (rootField && !relatedRootFields.map(field => field.id).includes(rootField.id)) {
                const schemaField = needMergeNewSchemaField ? getMergeNewSchemaField(rootField) : rootField;
                relatedRootFields.push(schemaField);
            }

        });

        // 排除未选择的UDT明细字段--因为接口返回的帮助schema里明细节点的id可能会跟帮助元数据里明细节点的id匹配不上，所以这里用originalId
        const relatedFieldOriginalIds = relatedHelpFields.value.map(f => f.originalId);
        const relatedFieldIds = relatedHelpFields.value.map(f => f.id);
        relatedRootFields.forEach(rootField => {
            if (rootField.$type === 'SimpleField') {
                return;
            }
            if (rootField.type.fields) {
                rootField.type.fields = rootField.type.fields.filter(field => relatedFieldIds.includes(field.id) || relatedFieldOriginalIds.includes(field.originalId));
            }
        });
        return relatedRootFields;
    }
    /**
     * 获取关联字段自身字段
     */
    function getAssociationSelfField() {
        const id = new IdService().generate();
        const assoSelfField = mapExtendFieldToSchemaField(ElementObjectType.None);
        Object.assign(assoSelfField, {
            id,
            originalId: id,
            path: assoSelfField.path + '.' + assoSelfField.label,
            bindingPath: assoSelfField.bindingPath + '.' + assoSelfField.label,
            require: false,
            readonly: false,
            defaultValue: undefined
        });
        return assoSelfField;

    }
    /**
     * 映射简单字段schema
     * @param field 帮助schema field
     * @param parentLabel 字段所属父级label，即当前新增的字段
     */
    function setAssociationSimpleFieldToSchemaField(field: FormSchemaEntityField, parentLabel: string) {
        // 记录帮助绑定字段
        if (field.id === helpFieldId.value) {
            helpSchemaField.value = field;
        }

        // 记录帮助上字段的label，用于映射字段
        const originHelpFieldLabel = field.label;

        const newLabel = parentLabel + '_' + field.code;
        Object.assign(field, {
            id: new IdService().generate(),
            label: newLabel,
            path: parentLabel + '.' + newLabel,
            bindingPath: parentLabel + '.' + newLabel,
            bindingField: parentLabel + '_' + newLabel,
            require: false
        });

        delete field['parentPath'];

        // 映射
        helpMapFields[originHelpFieldLabel] = field.bindingPath;

    }

    /**
     * 映射UDT字段
     * @param field 帮助UDT schema字段
     * @param parentLabel 字段所属父级label，即当前新增的字段
     */
    function setAssociationUdtFieldToSchemaField(field: FormSchemaEntityField, parentLabel: string) {
        const newLabel = parentLabel + '_' + field.code;
        const newId = new IdService().generate();
        Object.assign(field, {
            id: newId,
            originalId: newId,
            label: newLabel,
            path: parentLabel + '.' + newLabel,
            bindingPath: parentLabel + '.' + newLabel,
            bindingField: parentLabel + '_' + newLabel
        });


        // 实体名称： 编号+ 自身字段的ID前四位（首字符大写）
        field.type.name = field.type.name + field.id.charAt(0).toUpperCase() + field.id.substr(1, 3);

        // 映射UDT明细字段
        field.type?.fields?.forEach(leafField => {
            if (leafField.id === helpFieldId.value) {
                helpSchemaField.value = leafField;
            }

            // 记录帮助上字段的label，用于映射字段
            const originHelpLeafFieldBindingPath = leafField.bindingPath;

            const newLeafId = new IdService().generate();

            Object.assign(leafField, {
                id: newLeafId,
                // originalId: newLeafId,
                // label: newLabel,
                path: field.path + '.' + leafField.code,
                bindingPath: field.bindingPath + '.' + leafField.label,
                bindingField: field.bindingField + '_' + leafField.code,
                require: false
            });

            // 映射
            if (originHelpLeafFieldBindingPath) {
                helpMapFields[originHelpLeafFieldBindingPath] = leafField.bindingPath;
            }
        });

    }
    /**
     * 组装关联字段的schema结构
     */
    function mapAssociationFieldToSchemaField() {
        const relatedRootFields = getUDTParentField();

        const newField = mapExtendFieldToSchemaField();
        if (!helpSchemaEntity.value) {
            return;
        }
        newField.type = {
            $type: FormSchemaEntityFieldType$Type.EntityType,
            name: helpSchemaEntity.value.code,
            primary: extendField.value.label,
            fields: [],
            entities: [],
            displayName: helpSchemaEntity.value.name,
            extendProperty: {
                beId: helpMetadata.value.dataSource.sourceId,
                voId: helpMetadata.value.dataSource.voSourceId
            }
        };

        // 关联字段自身
        const assoSelfField = getAssociationSelfField();
        newField.type.fields.push(assoSelfField);

        // 实体名称： 编号+ 自身字段的ID前四位（首字符大写）
        newField.type.name = helpSchemaEntity.value.code + assoSelfField.id.charAt(0).toUpperCase() + assoSelfField.id.substr(1, 3);

        // 修改关联字段属性
        const parentLabel = extendField.value.label;
        relatedRootFields.forEach(field => {
            if (field.$type === 'SimpleField') {
                setAssociationSimpleFieldToSchemaField(field, parentLabel);
            } else {
                setAssociationUdtFieldToSchemaField(field, parentLabel);
            }
            newField.type.fields.push(field);


        });

        // ID映射
        if (helpMapFields.id) {
            helpMapFields.id = helpMapFields.id + ',' + newField.label + '.' + newField.label;
        } else {
            helpMapFields.id = newField.label + '.' + newField.label;
        }

        // this.schemaService.localizeSchemaFields([newField]);
        return newField;
    }
    /**
     * 组装帮助编辑信息
     */
    function assembleSchemaHelpEditor() {
        return {
            editor: {
                $type: 'lookup',
                dataSource: {
                    uri: `lookup.${props.entityCode}_${helpSchemaField.value.bindingField}`,
                    displayName: helpMetadata.value.name,
                    idField: helpMetadata.value.idField,
                    type: 'ViewObject'
                },
                textField: helpMetadata.value.textField,
                displayType: helpMetadata.value.displayType,
                helpId: helpMetadata.value.id,
                mappingFields: JSON.stringify(helpMapFields)
            }
        };
    }
    function resolveFieldInfo() {
        // 新字段的schema节点
        let newSchemaField;

        if (extendField.value.objectType === ElementObjectType.Association) {
            // 复杂类型：关联字段
            newSchemaField = mapAssociationFieldToSchemaField();

            // 关联帮助的schema增量记录到schema里
            const schemaIncrement = assembleSchemaHelpEditor();
            Object.assign(helpSchemaField.value, schemaIncrement);

        } else {
            // 简单类型、枚举类型的字段
            newSchemaField = mapExtendFieldToSchemaField();

        }

        return newSchemaField;
    }
    /**
     * 选择帮助元数据后事件
     */
    function onSubmitHelpMetadata(dataSourceSchema: any) {
        if (dataSourceSchema) {
            const formBasicInfo = props.useFormSchema.getFormMetadataBasicInfo();
            // 获取数据源详细配置信息
            return new MetadataService().getPickMetadata(formBasicInfo.relativePath, dataSourceSchema[0].data)
                .then((res: any) => {
                    const metadata = JSON.parse(res?.metadata.content);
                    return metadata;
                });
        }
    }


    /**
     * 判断字段是否可以勾选
     * @param layer 字段在schema中的层级
     * @param field schema field
     * @param children 子级
     */
    function checkHelpFieldSelectable(layer: number, field: FormSchemaEntityField, children: any[]) {
        if (layer > 1) {
            return false;
        }
        // 简单字段
        if (field.$type === 'SimpleField') {
            return true;
        }

        // 非简单字段 目前只支持单值UDT和多值UDT（只有一层嵌套），不支持关联和关联UDT
        if (field.$type === 'ComplexField' && (field.type.$type !== 'ObjectType' || (field.type?.fields && field.type.fields.length > 1))) {
            children.forEach(c => c.selectable = false);
        }
        return false;
    }
    function assembleHelpFieldsToTreeData(fields: FormSchemaEntityField[], layer = 0) {
        const treeData: any = [];
        fields.forEach(element => {

            let children = [];
            if (element.type && element.type.fields && element.type.fields.length > 0) {
                children = assembleHelpFieldsToTreeData(element.type.fields, layer + 1);

            }
            treeData.push({
                data: element,
                children,
                expanded: true,
                selectable: checkHelpFieldSelectable(layer, element, children)
            });
        });
        return treeData;
    }
    /**
     * 获取帮助元数据的schema结构
     * 背景：在帮助设计器中点击保存按钮时，后端会对元数据内容进行精简：①删除字段的editor属性，②删除字段type属性下的长度、精度、类型等属性。
     * 在运行时定制设计器中扩展关联字段时，若选择了这种精简过的帮助，便会无法获取字段的类型、编辑器等等信息，所以扩展字段时需要重新调用一个接口，返回完整的帮助元数据。
     */
    function getRealHelpMetadataSchema() {
        const url = '/api/runtime/bcc/v1.0/template/gethelpschema';
        const body = {
            voId: helpMetadata.value.dataSource.voSourceId,
            scene: '',
            isRuntime: true
        };
        axios.post(url, body, {
            headers: {
                "content-type": "application/json"
            }
        }).then((result: any) => {
            if (result?.data?.entities) {
                newHelpSchemaEntityFields.value = result.data.entities[0].type.fields;
            }
        });
    }
    /**
     * 获取帮助元数据后事件
     */
    function onHelpMetadataSelected(helpMetadataData: any) {
        if (helpMetadataData?.length) {
            helpMetadata.value = helpMetadataData[0].metadataContent;

            helpSchemaEntity.value = helpMetadata.value.schema.main.entities[0];
            const mainFields = helpSchemaEntity.value.type.fields;
            helpSchemaTreeData.value = assembleHelpFieldsToTreeData(mainFields);
            helpMetadataName.value = helpMetadata.value.name;

            relatedHelpFields.value = [];
            relatedHelpFieldIds.value = '';
            helpFieldId.value = '';
            helpField.value = null;
            relatedFieldsTreeData.value = [];

            // 调用接口获取帮助中最新的schema数据
            getRealHelpMetadataSchema();
        }
    }

    /**
     * 选关联字段
     */
    function onHelpRelatedFieldsChanged(selections: any[]) {
        const rawSelections = selections?.map(selection => selection.data);
        if (rawSelections && rawSelections.length > 0) {
            relatedFieldsTreeData.value = assembleHelpFieldsToTreeData(rawSelections);
        } else {
            relatedFieldsTreeData.value = [];
        }
        relatedHelpFields.value = rawSelections;
        if (!rawSelections.find(selection => selection.id === helpFieldId.value)) {
            helpFieldId.value = '';
            helpField.value = null;
        }
    }

    /**
     * 选帮助绑定字段
     */
    function onHelpBindingFieldsChanged(selections: any[]) {
        if (selections && selections.length > 0) {
            helpField.value = selections[0];
            helpFieldId.value = helpField.value.id;
        } else {
            helpField.value = null;
            helpFieldId.value = '';
        }
    }
    return {
        renderEnumValuesEditor,
        isLengthReadonly,
        isPrecisionReadonly,
        maxLength,
        maxPrecision,
        resolveFieldInfo,
        fieldObjectTypes,
        onChangeFieldType,
        helpMetadata,
        onHelpMetadataSelected,
        onSubmitHelpMetadata,
        relatedHelpFieldIds,
        helpSchemaTreeData,
        helpMetadataName,
        onHelpRelatedFieldsChanged,
        relatedFieldsTreeData,
        helpFieldId,
        onHelpBindingFieldsChanged
    };
}
