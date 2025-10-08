import { getSchemaByType } from "@farris/mobile-ui-vue";
import { FormBindingType, FormSchemaEntityField, FormSchemaEntityFieldTypeName, UseControlCreator } from "../../types";
import { FormMetadataConverter } from "../form-metadata-converter";

export function useMobileControlCreator(): UseControlCreator {    
    /**
     * 配置输入控件属性
     * @param field schema字段
     * @param editorType 编辑器类型
     * @param controlClass 输入控件样式
     * @returns 
     */
    function setFormFieldProperty(field: FormSchemaEntityField, editorType?: string, controlClass = ''): any {
        const formGroupMetadata = getSchemaByType('form-group') || {};
        formGroupMetadata.id = field.id.length > 8 ? field.id.slice(0, 8) : field.id;
        formGroupMetadata.id = field.bindingField + '_' + formGroupMetadata.id.replace(/-/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
        formGroupMetadata.label = field.name;
        formGroupMetadata.appearance = { class: controlClass || '' };
        formGroupMetadata.binding = {
            type: FormBindingType.Form,
            path: field.bindingField,
            field: field.id,
            fullPath: field.path
        };
        formGroupMetadata.path = field.bindingPath;
        const metadataConverter = new FormMetadataConverter();
        const resolvedEditorType = editorType || metadataConverter.getRealEditorType(field?.editor?.$type || '');
        const formEditor = getSchemaByType(resolvedEditorType) || {};

        formGroupMetadata.editor = formEditor;
        if (field.require) {
            formEditor.required = field.require;
        }

        // 只读属性：若字段本身为只读，则取字段属性；若非只读，则设置为状态机
        formEditor.readonly = field.readonly ? true : false;
        const fieldTypeInSchema = field.type && field.type.$type;
        if (!fieldTypeInSchema) {
            return;
        }
        // 枚举类型 或者是字符串但是指定了编辑器是枚举类的
        if (fieldTypeInSchema === 'EnumType' || fieldTypeInSchema === 'StringType' && ['radio-group', 'check-group', 'combo-list'].find(type => type === formEditor.type)) {
            formEditor.data = field.type.enumValues || [];
            formEditor.idField = 'value';
            formEditor.valueField = 'value';
            formEditor.textField = 'name';
        }
        // 数字类型
        if (fieldTypeInSchema === 'NumericType') {
            formEditor.precision = field.type.precision;
            formEditor.nullable = true;
        }
        // 数字、字符串、备注 ：设置最大长度
        if (['NumericType', 'StringType', 'TextType'].includes(fieldTypeInSchema)) {
            formEditor.maxLength = field.type.length;
        }
        // 日期类型
        if (formEditor.type === 'date-picker') {
            formEditor.fieldType = field.type.name;

            // 日期时间类型字段：启用时间选择属性
            if (fieldTypeInSchema === 'DateTimeType') {
                formEditor.showTime = true;
                formEditor.displayFormat = 'yyyy-MM-dd HH:mm:ss';
                formEditor.valueFormat = 'yyyy-MM-dd HH:mm:ss';

            }
        }

        return formGroupMetadata;
    }

    /**
     * 字段类型是文本，切换成其他控件类型
     * @param editorType 
     * @returns 
     */
    function getRealGridTypeByEditorType(editorType) {
        switch (editorType) {
            case 'combo-list':
            case 'radio-group':
            case 'check-group':
                return 'enum';
            case 'date-picker':
                return 'date';
            default:
                return 'string';
        }
    }
    /**
     * 将控件类型映射为表单表格列上的类型
     * param field
     */
    function mapControlType2GridFieldType(field: FormSchemaEntityField): string {
        if (!field.editor) {
            return '';
        }
        switch (field.type.name) {
            case FormSchemaEntityFieldTypeName.Enum: return 'enum';
            case FormSchemaEntityFieldTypeName.String:
                return getRealGridTypeByEditorType(field.editor.$type);
            case FormSchemaEntityFieldTypeName.Text: return 'string';
            case FormSchemaEntityFieldTypeName.Number: return 'number';
            case FormSchemaEntityFieldTypeName.Date: return 'date';
            case FormSchemaEntityFieldTypeName.DateTime: return 'datetime';
            case FormSchemaEntityFieldTypeName.Boolean: return 'boolean';
        }

        return '';
    }
    /**
      * 设置列格式
      * @param gridFieldType 列类型
      * @param metadata 元数据
      * @param schemaField schemaField
      */
    function setGridFieldFormatter(gridFieldType: string, metadata: any, schemaField: any) {
        switch (gridFieldType) {
            case 'number': {
                metadata.formatter = {
                    type: 'number',
                    precision: schemaField.type.precision,
                    thousand: ',',
                    decimal: '.'
                };
                break;
            }
            case 'date': {
                metadata.formatter = {
                    type: 'date',
                    dateFormat: 'yyyy-MM-dd'
                };
                break;
            }
            case 'datetime': {
                metadata.formatter = {
                    type: 'date',
                    dateFormat: 'yyyy-MM-dd HH:mm:ss'
                };
                break;
            }
            case 'boolean': {
                metadata.formatter = {
                    type: 'boolean',
                    trueText: '是',
                    falseText: '否'
                };
                break;
            }
            case 'enum': {
                metadata.formatter = {
                    type: 'enum',
                    data: schemaField.type.enumValues || []
                };
                break;
            }
        }
    }
    /**
     * 配置列属性
     * @param field schema字段
     * @param metadata 列元数据
     * @param neddInlineEditor 是否需要列编辑器
     */
    function setGridFieldProperty(gridType: string, field: FormSchemaEntityField, metadata: any, needInlineEditor = false): any {
        const metadataConverter = new FormMetadataConverter();
        if (!metadata) {
            metadata = getSchemaByType(gridType, {});
        }
        if (!metadata || !field) {
            return;
        }

        metadata.id = field.id.length > 8 ? field.id.slice(0, 8) : field.id;
        metadata.id = field.bindingField + '_' + metadata.id.replace(/-/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
        metadata.title = field.name;

        // 关联字段dataField绑定主表字段的label + '.' + 关联字段的label
        metadata.field = field.bindingPath;

        metadata.binding = {
            type: FormBindingType.Form,
            path: field.bindingField,
            field: field.id,
            fullPath: field.path
        };

        // 设置列类型. 若是枚举类型再设置enumData;若是日期类型，设置默认格式;数字类型设置格式、精度
        metadata.dataType = mapControlType2GridFieldType(field);

        // 枚举类型 设置enumData
        // if (metadata.dataType === 'enum' && field.type) {
        //     metadata.enumData = field.type.enumValues;
        //     metadata.idField = 'value';
        //     metadata.valueField = 'value';
        //     metadata.textField = 'name';
        // }
        metadata.multiLanguage = field.multiLanguage;

        // 日期类型字段：增加数据国际化配置
        if (field.type.name === FormSchemaEntityFieldTypeName.Date ||
            field.type.name === FormSchemaEntityFieldTypeName.DateTime) {
            metadata.localization = false;
            metadata.localizationType = field.type.name;
        }

        // 列格式
        setGridFieldFormatter(metadata.dataType, metadata, field);

        // 列编辑器
        if (needInlineEditor) {
            const realEditor = metadataConverter.getRealEditorType(field?.editor?.$type || '');
            const fieldEditor = setFormFieldProperty(field, realEditor, '');
            metadata.editor = fieldEditor.editor;
        }

        return metadata;
    }

    /**
     * 配置输入控件属性（控件无绑定信息）
     * @param editorType 编辑器类型
     * @param controlClass 输入控件样式
     */
    function createFormGroupWithoutField(editorType = 'input-group', controlClass = '') {
        const formGroupMetadata = getSchemaByType('form-group') || {};
        formGroupMetadata.id = `${editorType}_${Math.random().toString(36).substr(2, 4)}`;
        formGroupMetadata.appearance = { class: controlClass || '' };
        formGroupMetadata.binding = null;

        const formEditor = getSchemaByType(editorType) || {};

        formGroupMetadata.editor = formEditor;
        return formGroupMetadata;
    }
    return {
        setFormFieldProperty,
        setGridFieldProperty,
        createFormGroupWithoutField
    };
}
