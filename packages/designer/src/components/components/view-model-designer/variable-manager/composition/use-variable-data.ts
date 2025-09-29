import { inject, Ref, ref } from "vue";
import { FormBindingType, FormSchema, FormVariable, FormVariableCategory, FormViewModel, UseFormSchema, UseSchemaService } from "../../../../types";
import { useVariableDefaultValue } from "./use-variable-default-value";
import { FNotifyService } from "@farris/ui-vue";
import { IdService } from "../../method-manager/service/id.service";
import { useViewModelName } from '../../method-manager/composition/use-view-model-name';
import { cloneDeep } from "lodash-es";
import { FMessageBoxService } from "@farris/ui-vue";

export function useVariableData(gridComponentInstance: Ref<any>, loadingService: any) {

    const useFormSchema = inject('useFormSchema') as UseFormSchema;
    const schemaService = inject('schemaService') as UseSchemaService;
    const formSchema = useFormSchema.getFormSchema();
    const notifyService: FNotifyService = new FNotifyService();
    notifyService.globalConfig = { position: 'top-center' };
    const ROOT_VIEW_MODEL_ID = 'root-viewmodel';

    const { getViewModelName } = useViewModelName();
    const { resolveDefaultValueInEditor, resolveDefaultValueInViewModel } = useVariableDefaultValue();
    const { convertViewObjectToEntitySchema } = schemaService;

    const variableList = ref<FormVariable[]>([]);

    /**
     * 获取变量来源名称
     * @param viewModel 
     * @param variable 
     * @returns 
     */
    function getVariableSourceName(variable: FormVariable, viewModel: FormViewModel) {
        if (variable.category === FormVariableCategory.remote) {
            return '视图对象';
        }
        return getViewModelName(viewModel.id, viewModel.name);
    }

    /**
     * 给变量添加信息（变量来源、变量所在视图模型信息）
     * @param variable 
     * @param viewModel 
     * @returns 
     */
    function appendInfoToVariable(variable: FormVariable, viewModel: FormViewModel) {
        const sourceName = getVariableSourceName(variable, viewModel);
        const viewModelId = viewModel.id;
        const newVariable = Object.assign({ sourceName, viewModelId }, variable);
        return newVariable;
    }

    /**
     * 获取表单变量
     */
    function getRemoteVariables(): FormVariable[] {
        const result: FormVariable[] = [];
        // 1、获取根视图模型，表单变量在根视图模型中
        const rootViewModel = formSchema.module.viewmodels[0];
        if (!rootViewModel || !rootViewModel.states) {
            return result;
        }

        // 2、从根视图模型中找出所有的表单变量
        const allRemoteVariables = rootViewModel.states.filter(state => state.category === FormVariableCategory.remote);

        // 3、对变量进行加工
        allRemoteVariables.forEach(variable => {
            const newVariable = appendInfoToVariable(variable, rootViewModel);
            newVariable.value = resolveDefaultValueInEditor(newVariable);
            result.push(newVariable);
        });

        return result;
    }

    /**
     * 从视图模型中获取组件变量
     * @param viewModel 
     * @param result 
     * @returns 
     */
    function getLocalVariable(viewModel: FormViewModel): FormVariable[] {
        const result: FormVariable[] = [];
        if (!viewModel.states || !viewModel.states.length) {
            return result;
        }
        // 1、找出视图模型上的组件变量
        const localVariables = viewModel.states.filter(state => state.category === FormVariableCategory.locale);

        // 2、对变量进行加工
        localVariables.forEach(variable => {
            const newVariable = appendInfoToVariable(variable, viewModel);
            newVariable.value = resolveDefaultValueInEditor(newVariable);
            result.push(newVariable);
        });

        return result;
    }

    /**
     * 获取组件变量
     */
    function getLocalVariables(): FormVariable[] {
        const result: FormVariable[] = [];
        const viewModelList = formSchema.module.viewmodels;

        viewModelList.forEach(viewModel => {
            const localVariables = getLocalVariable(viewModel);
            result.push(...localVariables);
        });

        return result;
    }

    /**
     * 加载变量
     */
    function loadVariables() {
        const remoteVariableList = getRemoteVariables();
        const localVariableList = getLocalVariables();
        variableList.value = [...remoteVariableList, ...localVariableList];
    }

    /**
     * 检查变量编号是否唯一
     * @param variable 
     * @returns 
     */
    function checkUniqueCode(variable: FormVariable): boolean {
        if (!variable.code) {
            return true;
        }
        // 同一模型下，两个变量编号相同、内码不同，则认为变量编号重复
        const existSameCodeVariable = variableList.value.findIndex(currentVariable => currentVariable.code === variable.code
            && currentVariable.id !== variable.id && currentVariable.viewModelId === variable.viewModelId) > -1;

        if (existSameCodeVariable) {
            notifyService.warning('变量编号已存在，请修改。');
            return false;
        }
        return true;
    }

    function checkBeforeEndEditCell(data: any): boolean {
        const currentEditingCell = data && data.cell;
        if (!currentEditingCell) {
            return true;
        }

        const { field, editingData } = currentEditingCell;

        // 1、编辑编号和名称列时，需要校验是否为空
        if (field === 'code' || field === 'name') {
            const newValue = editingData.trim();
            if (!newValue) {
                return false;
            }
        }

        // 2、编辑编号列时，需要校验编号是否重复
        if (field === 'code') {
            const newValue = editingData.trim();
            const newVariable = cloneDeep(data.row.raw);
            newVariable.code = newValue;
            return checkUniqueCode(newVariable);
        }

        // 3、编辑默认值列时，打开数组和对象编辑器时，不允许结束编辑
        if (field === 'value') {
            const canNotEndEdit = document.getElementById('variable-array-and-object-editor');
            return !canNotEndEdit;
        }

        return true;
    }

    /**
     * 从视图模型中删除变量
     * @param variable 
     */
    function deleteVariableFromViewModel(variable: FormVariable) {
        const viewModelId = variable.viewModelId || ROOT_VIEW_MODEL_ID;
        const viewModel = useFormSchema.getViewModelById(viewModelId);
        if (viewModel) {
            viewModel.states = viewModel.states.filter(state => state.id !== variable.id);
        }
    }

    /**
     * 删除变量
     * @returns 
     */
    function deleteVariables() {
        let variablesToBeDeleted = gridComponentInstance.value.getSelectedItems();
        // 1、要删除的变量不能为空
        if (!variablesToBeDeleted || !variablesToBeDeleted.length) {
            notifyService.info('请勾选要删除的行');
            return;
        }
        // 2、删除表单变量时进行提示
        const existRemoteVariable = variablesToBeDeleted.findIndex(variableToBeDeleted => variableToBeDeleted.category === FormVariableCategory.remote) > -1;
        if (existRemoteVariable) {
            notifyService.info('不可删除表单变量');
        }

        // 3、从视图模型中删除变量
        variablesToBeDeleted = variablesToBeDeleted.filter(variableToBeDeleted => variableToBeDeleted.category === FormVariableCategory.locale);
        variablesToBeDeleted.forEach(variableToBeDeleted => {
            variableList.value = variableList.value.filter(variable => variable.id !== variableToBeDeleted.id);
            deleteVariableFromViewModel(variableToBeDeleted);
        });

        // 4、更新表格的数据，并取消选中
        gridComponentInstance.value.updateDataSource(variableList.value);
        gridComponentInstance.value.clearSelection();

    }

    /**
     * 添加一个新变量到表格
     */
    function addVariableToDataGrid() {
        const rootViewModel = formSchema.module.viewmodels[0];

        const newVariable = {
            id: new IdService().generate(),
            type: 'String',
            code: "",
            name: "",
            category: FormVariableCategory.locale,
            sourceName: '根组件',
            viewModelId: rootViewModel.id
        };
        variableList.value.push(newVariable);
        gridComponentInstance.value.updateDataSource(variableList.value);
    }

    /**
     * 变量更新前检查
     * @param variable 
     * @returns 
     */
    function checkVariableBeforeUpdate(variable: FormVariable): boolean {
        // 1、修改变量编号时，检查变量编号是否重复
        const checkPassed = checkUniqueCode(variable);
        if (!checkPassed) {
            return false;
        }
        const variableCode = variable.code && variable.code.trim();
        const variableName = variable.name && variable.name.trim();

        // 2、变量编号、名称、类型不能为空
        if (!variableCode || !variableName || !variable.type) {
            return false;
        }
        return true;
    }

    /**
     * 添加变量到视图模型
     * @param variable 
     * @param viewModel 
     */
    function addVariable(variable: FormVariable, viewModel: FormViewModel) {
        // 1、处理变量默认值，用于DOM存储
        const resolvedDefaultValue = resolveDefaultValueInViewModel(variable);

        // 2、添加变量到视图模型
        const newVariable = {
            id: variable.id,
            code: variable.code,
            name: variable.name,
            type: variable.type,
            category: variable.category,
            value: resolvedDefaultValue
        };
        viewModel.states.push(newVariable);
    }

    /**
     * 更新视图模型中的变量信息
     * @param variable 
     * @param viewModel 
     */
    function updateVariable(variableInViewModel: FormVariable, newVariable: FormVariable) {
        // 1、处理变量默认值，用于DOM存储
        const resolvedDefaultValue = resolveDefaultValueInViewModel(newVariable);

        // 2、更新视图模型中的变量
        Object.assign(variableInViewModel, {
            code: newVariable.code,
            name: newVariable.name,
            type: newVariable.type,
            value: resolvedDefaultValue
        });
    }

    /**
     * 根据指定的条件遍历查找节点
     */
    function searchInAllControls(rootNode: any, targetVariable: any) {
        if (!rootNode || !targetVariable) {
            return;
        }

        Object.keys(rootNode).forEach(propertyID => {
            const propertyValue = rootNode[propertyID];
            if (propertyValue && typeof (propertyValue) === 'object' && propertyValue.type === FormBindingType.Variable && propertyValue.field === targetVariable.id) {
                if (propertyValue.path) {
                    propertyValue.path = propertyValue.path.replace(propertyValue.fullPath, targetVariable.code);
                }
                if (propertyValue.fullPath) {
                    propertyValue.fullPath = targetVariable.code;
                }
            }
        });

        if (rootNode.editor) {
            searchInAllControls(rootNode.editor, targetVariable);
        }
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                searchInAllControls(item, targetVariable);
            }
        }

    }
    /**
     * 修改变量编号后，同步控件的绑定
     */
    function syncFormControlsBindingVariable(rowData: any, changeObject) {
        if (changeObject.field !== 'code') {
            return;
        }
        const viewModelId = rowData.viewModelId || ROOT_VIEW_MODEL_ID;

        if (viewModelId === ROOT_VIEW_MODEL_ID) {
            useFormSchema.getViewModels().forEach(viewModel => {
                if (viewModel.fields && viewModel.fields.length) {
                    viewModel.fields.forEach(field => {
                        if (field.id === rowData.id) {
                            field.fieldName = rowData.code;
                        }
                    });
                }
            });
            useFormSchema.getComponents().forEach(component => {
                searchInAllControls(component, rowData);
            });

        } else {
            const targetViewModel = useFormSchema.getViewModelById(viewModelId);
            if (targetViewModel?.fields?.length) {
                targetViewModel.fields.forEach(field => {
                    if (field.id === rowData.id) {
                        field.fieldName = rowData.code;
                    }
                });
            }
            if (targetViewModel) {
                const component = useFormSchema.getComponentByViewModelId(targetViewModel.id);
                searchInAllControls(component, rowData);
            }

        }
    }

    /**
     * 更新变量到视图模型
     * @param variable 
     * @param changeObject 
     * @returns 
     */
    function updateVariableToViewModel(newVariable: FormVariable, changeObject: { field: string, value: any }) {
        // 1、检查变量是否符合要求
        const checkPassed = checkVariableBeforeUpdate(newVariable);
        if (!checkPassed) {
            return;
        }

        // 2、查找变量对应的视图模型
        const viewModelId = newVariable.viewModelId || ROOT_VIEW_MODEL_ID;
        const viewModel = useFormSchema.getViewModelById(viewModelId);
        if (!viewModel) {
            return;
        }

        // 3、变量是否在视图模型中，如果存在则更新，如果不存在则添加
        const variableInViewModel = viewModel.states.find(state => state.id === newVariable.id);
        if (variableInViewModel) {
            updateVariable(variableInViewModel, newVariable);
        } else {
            addVariable(newVariable, viewModel);
        }

        // 同步控件
        syncFormControlsBindingVariable(newVariable, changeObject);
    }

    /**
     * 更新表单变量
     * @param oldSchema 
     * @param newSchema 
     */
    function updateRemoteVariables(currentSchema: FormSchema, newSchema: FormSchema) {
        // 1、更新表单Schema中的变量
        const newVariables = newSchema.variables || [];
        currentSchema.variables = newVariables;

        // 2、更新视图模型中的变量
        useFormSchema.updateRemoteVariables(newVariables);

        // 3、更新表格数据，并取消选中
        loadVariables();
        gridComponentInstance.value.updateDataSource(variableList.value);
        gridComponentInstance.value.clearSelection();
        notifyService.success('更新成功！');
    }

    /**
     * 刷新表单变量
     */
    function refreshRemoteVariables() {
        // 1、判断表单Schema是否存在
        const currentSchema = useFormSchema.getSchemas();
        if (!currentSchema) {
            FMessageBoxService.error('表单Schema不存在', '');
            return;
        }

        // 2、获取视图对象内码
        const viewObjectId = currentSchema.id;

        // 3、获取新的表单Schema
        const loadingInstance = loadingService.show();
        convertViewObjectToEntitySchema(viewObjectId, '').then((newSchema: FormSchema | undefined) => {
            if (!newSchema) {
                FMessageBoxService.error('未获取到表单Schema', '');
                loadingInstance.value?.close();
                return;
            }
            updateRemoteVariables(currentSchema, newSchema);
            loadingInstance.value?.close();
        }, (error) => {
            FMessageBoxService.error(error?.response?.data?.Message || '更新失败', '');
            loadingInstance.value?.close();
        });

    }

    return {
        variableList,
        loadVariables,
        deleteVariables,
        addVariableToDataGrid,
        updateVariableToViewModel,
        refreshRemoteVariables,
        checkBeforeEndEditCell
    };
}
