import { FormPropertyChangeObject, SchemaDOMMapping } from "@farris/ui-vue";
import { get, set } from "lodash-es";
import { FormBindingType, FormVariableCategory, UseDesignViewModel, UseFormSchema, UseSchemaService } from "../types";
import { DesignViewModelField } from "../types/design-viewmodel";

export function afterPropeControlPropertyChangedService(useFormSchema: UseFormSchema, designViewModelUtils: UseDesignViewModel, schemaService: UseSchemaService) {

    /**
     * 新版属性编辑器，在编辑过程中可能会新增变量，此处需要将新增的变量追加到ViewModel中
     */
    function addNewVariableToViewModel(changeObject: FormPropertyChangeObject, viewModelId: string) {
        const newPropertyValue = changeObject.propertyValue;
        if (newPropertyValue && newPropertyValue.isNewVariable && typeof newPropertyValue === 'object' &&
            newPropertyValue.type === 'Variable') {
            // 如果有则加入新变量
            delete newPropertyValue.isNewVariable;
            const newVar = {
                id: newPropertyValue.field,
                category: FormVariableCategory.locale,
                code: newPropertyValue.path,
                name: newPropertyValue.path,
                type: newPropertyValue.newVariableType || 'String'
            };
            delete newPropertyValue.newVariableType;
            const viewModel = useFormSchema.getViewModelById(viewModelId);
            if (viewModel && !viewModel.states.find(s => s.id === newVar.id)) {
                viewModel.states.push(newVar);
            }
        }
    }

    /**
     * 收集关联属性的变更(用于dgViewModel的变更)
     * @param changeObject 变更集
     */
    function relateChangeObjects(changeObject: FormPropertyChangeObject) {
        const changes: any[] = [changeObject];
        if (changeObject.relateChangeProps && changeObject.relateChangeProps.length) {
            changes.push(...changeObject.relateChangeProps);
        }

        if (changeObject.categoryId && changeObject.categoryId.includes('gridFieldEditor')) {
            changes.forEach(change => {
                Object.assign(change, {
                    categoryId: changeObject.categoryId,
                    propertyPath: changeObject.propertyPath
                });
            });
        }

        return changes;
    }

    /**
     * 更新DOM的修改至Schema实体
     * @param propertyData 属性值
     * @param changeObject 变更集
     */
    function getSchemaChangeByDomChange(propertyData, changeObject: FormPropertyChangeObject, dgVMField: DesignViewModelField) {
        const schemaChange: any = {};

        let mappingArray: any[] = [];
        const changePath = changeObject.categoryId === 'editor' ? 'editor.' + changeObject.propertyID : changeObject.propertyID;
        mappingArray = SchemaDOMMapping.mappingDomPropAndSchemaProp(propertyData,changeObject);
        // if (changeObject.categoryId === 'editor') {  // 编辑器属性
        // } else if (!changeObject.propertyPath) {
        //     mappingArray = SchemaDOMMapping.mappingDomPropAndSchemaProp(propertyData);
        // }
        const mappingEntity = mappingArray.find(f => f.domField === changePath);
        if (!mappingEntity) {
            return {};
        }
        // 只读、必填属性：只有在设置为布尔值时才更新到schema，设置为状态机、变量、表达式时不更新
        if (changeObject.propertyID === 'readonly' || changeObject.propertyID === 'required') {
            if (typeof (changeObject.propertyValue) !== 'boolean') {
                return schemaChange;
            }
        }

        const shemaFieldPath = mappingEntity.schemaField;

        // 若前后变更的数据是一样的，则不再记录变更
        const oldPropInVm = get(dgVMField, shemaFieldPath);
        if (oldPropInVm && typeof (oldPropInVm) === 'object' && changeObject.propertyValue && JSON.stringify(oldPropInVm) === JSON.stringify(changeObject.propertyValue)) {
            return schemaChange;
        }
        if (oldPropInVm && changeObject.propertyValue && oldPropInVm === changeObject.propertyValue) {
            return schemaChange;
        }

        set(schemaChange, shemaFieldPath, changeObject.propertyValue);
        return schemaChange;
    }

    /**
     *  收集Schema字段的变更
     * @param propertyData 属性值
     * @param changeObjects 变更集
     * @param viewModelId  VMID
     */
    function changeDgViewModel(propertyData: any, changeObjects: FormPropertyChangeObject[], viewModelId: string) {

        const dgVM = designViewModelUtils.getDgViewModel(viewModelId); // 当前VM
        if (!dgVM) {
            return;
        }
        changeObjects.map(changeObject => {
            let dgVMField;
            if (propertyData.binding && propertyData.binding.type === FormBindingType.Form && propertyData.binding.field) {
                dgVMField = dgVM.fields.find(f => f.id === propertyData.binding.field);
            }
            if (dgVMField) {
                const dgVMChange = getSchemaChangeByDomChange(propertyData, changeObject, dgVMField);
                dgVM.changeField(dgVMField.id, dgVMChange);
            }
        });
    }

    function afterPropertyChanged(event: any) {
        const { changeObject, designerItem } = event;
        if (!designerItem) {
            return;
        }
        const componentId = designerItem.belongedComponentId;
        const viewModelId = useFormSchema.getViewModelIdByComponentId(componentId);

        // 保存新增的变量
        addNewVariableToViewModel(changeObject, viewModelId);

        // 表达式相关属性：需要单独更新DOM结构
        // updateExpressionAfterPropChange(propertyData, changeObject, parameters);

        // 收集关联属性(用于dgViewModel的变更)
        const changes = relateChangeObjects(changeObject);

        // 更新dgViewModel
        changeDgViewModel(designerItem.schema, changes, viewModelId);

    }

    return { afterPropertyChanged };
}
