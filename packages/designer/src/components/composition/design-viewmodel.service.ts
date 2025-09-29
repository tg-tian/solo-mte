/* eslint-disable no-use-before-define */
import { merge } from "lodash-es";
import { EntityFieldTypeDisplayNamei18n, FormBindingType, FormSchemaEntityField, UseDesignViewModel, UseFormSchema, UseSchemaService } from "../types";
import { DesignViewModel, DesignViewModelField } from "../types/design-viewmodel";
import { cloneDeep } from 'lodash-es';

/**
 * 操作表单设计时ViewModel的工具类
 */
export function useDesignViewModel(useFormSchema: UseFormSchema, schemaService: UseSchemaService): UseDesignViewModel {
    let dgViewModels = [] as any;
    const ROOT_VIEW_MODEL_ID = 'root-viewmodel';


    /**
     * 根据viewModelId获取视图模型
     * @param viewModelId 视图模型标识
     */
    function getDgViewModel(viewModelId: string): DesignViewModel | null {
        return dgViewModels.find(dgVM => dgVM.id === viewModelId) || null;
    }
    /**
     * 获取所有的视图模型
     */
    function getDgViewModels(): DesignViewModel[] {
        return dgViewModels;
    }
    /**
     * 根据ID删除整个ViewModel：用于组件的删除
     * @param viewModelId  viewModelId
     */
    function deleteViewModelById(viewModelId: string) {
        const index = dgViewModels.findIndex(vm => vm.id === viewModelId);
        if (index > -1) {
            dgViewModels.splice(index, 1);
            useFormSchema.deleteViewModelById(viewModelId);

        }
    }
    /**
     * 组装各VM下的字段完整信息：schema字段 + 视图模型记录的变更 + 视图模型的值变化等属性 => 树表数据
     */
    function assembleDesignViewModel() {
        // 组装过程中可能有设计器补充的属性，用户并不感知这种变更，所以不需要通知IDE框架
        window['suspendChangesOnForm'] = true;

        const tempDesignViewModels = [] as any;
        const viewModels = useFormSchema.getViewModels();
        viewModels.forEach(viewModel => {
            const fields = [] as any;
            if (viewModel.fields) {
                viewModel.fields.forEach(field => {
                    if (field.type !== FormBindingType.Form) {
                        return;
                    }
                    const dgVMField = {};
                    const schema = schemaService.getFieldByIDAndVMID(field.id, viewModel.id);
                    if (!schema || !schema.schemaField) {
                        // 字段已移除
                        merge(dgVMField, field, field.fieldSchema || {},
                            {
                                groupId: field.groupId, groupName: field.groupName,
                                valueChanging: field.valueChanging, valueChanged: field.valueChanged,
                                isSchemaRemoved: true
                            });

                    } else {
                        const { schemaField } = schema;
                        adaptOldViewModelField(field, schemaField);

                        // 组装数据
                        const displayTypeNamei18n = schemaField.type.displayName;
                        merge(dgVMField, schemaField, field.fieldSchema || {},
                            {
                                groupId: field.groupId,
                                groupName: field.groupName,
                                valueChanging: field.valueChanging,
                                valueChanged: field.valueChanged,
                                updateOn: field.updateOn,
                                displayTypeNamei18n
                            });
                    }

                    fields.push(dgVMField);
                });
            }

            adaptOldViewModel(viewModel);

            const dgViewModel = new DesignViewModel(viewModel.id, fields, useFormSchema);

            tempDesignViewModels.push(dgViewModel);
        });
        dgViewModels = tempDesignViewModels;
        window['suspendChangesOnForm'] = false;
    }
    /**
     * 获取指定VM下所有的字段，并组装成树结构
     * @param viewModelId 视图模型标识
     */
    function getAllFields2TreeByVMId(viewModelId: string): any[] {
        const schemaFields: FormSchemaEntityField[] = schemaService.getFieldsByViewModelId(viewModelId);
        if (!schemaFields) {
            return [];
        }
        const dgVM = dgViewModels.find(d => d.id === viewModelId);

        if (dgVM) {
            return mergeFields2Tree(schemaFields, dgVM.fields);
        } else {
            return [];
        }
    }
    /**
     * 私有
     * @param schemaFields 
     * @param dgVMFields 
     * @param bindingPath 
     * @returns 
     */
    function mergeFields2Tree(schemaFields: FormSchemaEntityField[], dgVMFields: DesignViewModelField[], bindingPath = '') {
        const treeData = [] as any;
        schemaFields.forEach(element => {
            // 补充bindingPath属性
            if (!element.bindingPath) {
                element.bindingPath = (bindingPath ? bindingPath + '.' : '') + element.label;
            }
            // 关联表字段 / UDT字段
            let children = [] as any;
            if (element.type && element.type.fields && element.type.fields.length > 0) {
                children = mergeFields2Tree(element.type.fields, dgVMFields, element.bindingPath);

            }

            const dgField = dgVMFields.find(d => d.id === element.id);
            const clonedField = dgField ? cloneDeep(dgField) : cloneDeep(element);
            const displayTypeNamei18n = (element.multiLanguage ? EntityFieldTypeDisplayNamei18n.MultiLanguage : EntityFieldTypeDisplayNamei18n[element.type.name]) || element.type.displayName;

            treeData.push({
                data: Object.assign({ rawData: clonedField, fieldType: displayTypeNamei18n }, clonedField),
                children
            });
        });
        return treeData;
    }

    /**
     * 适配旧表单VM属性
     * @param viewModel VM
     */
    function adaptOldViewModel(viewModel: any) {
        // 补充是否开启校验属性
        if (!Object.keys(viewModel).includes('enableValidation')) {
            viewModel.enableValidation = false;
        }

        // 补充复用会话属性
        if (viewModel.id === ROOT_VIEW_MODEL_ID && !Object.keys(viewModel).includes('enableUnifiedSession')) {
            viewModel.enableUnifiedSession = false;
        }

        // 旧表单ViewModel的名称为id值，改成对应表的表名
        if (viewModel.id === viewModel.name) {
            const tableInfo = schemaService.getTableInfoByViewModelId(viewModel.id);
            if (tableInfo) {
                viewModel.name = tableInfo.name;
            }
        }

        // 补充列表分页条数
        if (viewModel.pagination && !viewModel.pagination.pageList && viewModel.pagination.pageSize) {
            viewModel.pagination.pageList = '10,20,30,50,100';
            if (viewModel.pagination.pageSize && !viewModel.pagination.pageList.includes(viewModel.pagination.pageSize)) {
                let pageList = [10, 20, 30, 50, 100, viewModel.pagination.pageSize];
                pageList = pageList.sort((A, B) => A - B);
                viewModel.pagination.pageList = pageList.toString();
            }

        }
    }


    /**
     * 适配旧表单VM字段属性
     * @param viewModel VM
     */
    function adaptOldViewModelField(vmField: any, schemaField: any) {

        // 升级旧表单，补充更新时机属性。
        if (!vmField.updateOn) {
            let updateOn = 'blur';
            const editorType = schemaField.editor && schemaField.editor.$type;
            if (editorType === 'EnumField' || editorType === 'CheckBox') {
                updateOn = 'change';
            }
            vmField.updateOn = updateOn;
        }

        if (vmField.fieldSchema) {
            // ComboList 强制替换为EnumField
            if (vmField.fieldSchema.editor && vmField.fieldSchema.editor.$type === 'ComboList') {
                vmField.fieldSchema.editor.$type = 'EnumField';
            }

            // DatePicker 强制替换为DateBox
            if (vmField.fieldSchema.editor && vmField.fieldSchema.editor.$type === 'DatePicker') {
                vmField.fieldSchema.editor.$type = 'DateBox';
            }
        }
    }
    return { assembleDesignViewModel, getAllFields2TreeByVMId, getDgViewModel, deleteViewModelById, getDgViewModels };
}
