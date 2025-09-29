import { mergeWith } from "lodash-es";
import { FormSchemaEntityField } from "./entity-schema";
import { UseFormSchema } from "./metadata";
import { FormBindingType } from "./enums";

export interface DesignViewModelField extends FormSchemaEntityField {
    valueChanging: string;
    valueChanged: string;
    groupId: string;
    groupName: string;
    /** 标识字段在schema中是否已移除 */
    isSchemaRemoved?: boolean;
    /** 字段更新时机 */
    updateOn?: string;
    /** 字段的类型名称（国际化） */
    displayTypeNamei18n?: string;
}

// 设计器内部使用
// 在DesignViewModel中存储一份完整的字段信息。而DOM.viewModel只存储增量的部分（即viewmodel.fieldSchema）
// DesignViewModel中不会存储所有的schema字段，只存储已绑定控件的字段（字段与DOM.viewModel一一对应）
export class DesignViewModel {
    public id: string;
    public fields: DesignViewModelField[];

    constructor(viewModelId: string, elements: DesignViewModelField[], private domService: UseFormSchema) {
        this.id = viewModelId;
        this.fields = elements;
    }


    public addField(element: DesignViewModelField) {
        this.fields.push(element);

        // 指定updateOn属性，下拉列表和checkbox是change，其他blur
        let updateOn = 'blur';
        const type = element.type.name;
        if (type === 'Enum' || type === 'Boolean') {
            updateOn = 'change';
        }

        // 为了添加字段之后立马能显示更新时机
        element.updateOn = updateOn;

        // 更改DOM ViewModel节点
        const vm = {
            type: FormBindingType.Form,
            id: element.id,
            fieldName: element.bindingField,
            groupId: element.groupId || '',
            groupName: element.groupName || '',
            valueChanging: element.valueChanging || '',
            valueChanged: element.valueChanged || '',
            updateOn,
            fieldSchema: {}
        };

        this.domService.addViewModelField(this.id, vm);
    }
    public removeField(fieldIdList: string[]) {
        if (!fieldIdList || fieldIdList.length === 0) {
            return;
        }
        this.fields = this.fields.filter(f => !fieldIdList.includes(f.id));

        // 更改DOM ViewModel节点
        fieldIdList.forEach(fieldId => {
            this.domService.deleteViewModelFieldById(this.id, fieldId);
        });
    }

    /**
     * 更改字段属性
     * @param fieldId 字段ID
     * @param changeObject 变更集
     * @param isMerge 是否将变更集合并到字段上，若配置为false，则直接替换对象对象
     */
    public changeField(fieldId: string, changeObject, isMerge = true) {
        const field = this.fields.find(f => f.id === fieldId);
        if (!field || !changeObject) {
            return;
        }
        // 数组类型不再合并，全量替换：用户枚举数据的更改
        function customizer(objValue, srcValue) {
            if (!isMerge) {
                return srcValue;
            } else if (Array.isArray(objValue)) {
                return srcValue;
            }
        }
        mergeWith(field, changeObject, customizer);

        // 更改DOM ViewModel节点
        const { valueChanging, valueChanged, groupId, groupName, updateOn, isSchemaRemoved, ...fieldChange } = changeObject;
        const vmChangeSet = {};
        if (fieldChange && Object.keys(fieldChange).length > 0) {
            vmChangeSet['fieldSchema'] = fieldChange;
        }
        if (Object.keys(changeObject).includes('valueChanging')) {
            vmChangeSet['valueChanging'] = valueChanging;
        }
        if (Object.keys(changeObject).includes('valueChanged')) {
            vmChangeSet['valueChanged'] = valueChanged;
        }
        if (Object.keys(changeObject).includes('groupId')) {
            vmChangeSet['groupId'] = groupId;
        }
        if (Object.keys(changeObject).includes('groupName')) {
            vmChangeSet['groupName'] = groupName;
        }
        if (Object.keys(changeObject).includes('updateOn')) {
            vmChangeSet['updateOn'] = updateOn;
        }

        this.domService.modifyViewModelFieldById(this.id, fieldId, vmChangeSet, isMerge);
    }

    /**
     * 修改分组
     * @param groupId
     * @param groupName
     */
    public changeGroupName(groupId: string, groupName: string) {
        const fields = this.fields.filter(f => f.groupId === groupId);
        fields.map(field => {
            this.changeField(field.id, { groupName });
        });

    }

    /**
     * 由schema字段替换dgViewModel中的字段信息，并清空VM中的字段增量
     * （目前用于schema更新时字段类型发生变更的场景）
     * @param schemaField
     * @param dgField
     */
    public clearFieldChange(schemaField: FormSchemaEntityField, dgField: DesignViewModelField) {
        Object.assign(dgField, schemaField);

        this.domService.clearViewModelFieldSchema(this.id, dgField.id);
    }
}
export interface DesignViewModelField extends FormSchemaEntityField {
    valueChanging?: string;
    valueChanged?: string;

    groupId?: string;
    groupName?: string;

    /** 标识字段在schema中是否已移除 */
    isSchemaRemoved?: boolean;

    /** 字段更新时机 */
    updateOn?: string;

    /** 字段的类型名称（国际化） */
    displayTypeNamei18n?: string;
}
