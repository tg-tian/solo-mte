import { cloneDeep, mergeWith } from "lodash-es";
import { FormBindingType, FormComponent, FormMetaDataModule, FormMetadaDataDom, FormSchema, FormSchemaEntity, FormSchemaEntityField, FormVariable, FormVariableCategory, FormVariableTypes, FormViewModel, FormViewModelField, FormWebCmd, MetadataDto, UseFormSchema, FormExpression, ExternalFormMetadata } from "../types";
import { NodeType, Node } from "../types/events-editor";
import { inject } from "vue";
import { LookupSchemaRepositoryToken, schemaMap } from "@farris/ui-vue";
import { LookupSchemaService } from "./schema-repository/lookup/lookup-schema.service";
import { DesignerMode } from "../types/designer-context";

export function useFormSchema(): UseFormSchema {
    const designerMode = DesignerMode.PC;

    const ROOT_VIEW_MODEL_ID = 'root-viewmodel';
    /** 表单元数据外层信息 */
    let formMetaBasicInfo: MetadataDto;
    /** 打开表单设计器时的DOM元数据结构，与be数据保持一致 */
    let previousFormSchema: FormMetadaDataDom;
    /** 表单元数据 */
    let formSchema: FormMetadaDataDom;
    /** 映射JSON结构映射：<控件id, 控件JSON> */
    const componentDomMap = new Map<string, any>();
    const nodeTypeCollect: Map<string, Node[]> = new Map<string, Node[]>();
    /** 控件id与控件展示名称、控件路径的映射 <控件id, {showName:控件展示名称,parentPathName:控件路径} */
    const controlBasicInfoMap = new Map<string, { showName: string, parentPathName: string }>();
    /** 当前表单模板的拖拽控制规则 */
    let formTemplateRules: any;

    /** 外部容器引入的表单元数据 */
    const externalFormSchema = new Map<string, ExternalFormMetadata>();

    function getControlBasicInfoMap(): Map<string, { showName: string, parentPathName: string }> {
        return controlBasicInfoMap;
    }

    /** 获取表单元数据外层信息 */
    function getFormMetadataBasicInfo(): MetadataDto {
        return formMetaBasicInfo;
    }
    function setFormMetadataBasicInfo(metadata: MetadataDto) {
        formMetaBasicInfo = metadata;
    }

    /** 获取表单元数据 */
    function getFormSchema(): FormMetadaDataDom {
        return formSchema;
    }

    function getExternalComponents(): any[] {
        return formSchema?.module?.externalComponents || [];
    }

    
    /**
     * 设置DOM JSON 数据
     * @param newFormSchema DOM JSON结构
     * @param schemaChangedCallback DOM结构变化后的回调事件
     */
    function setFormSchema(newFormSchema: FormMetadaDataDom, schemaChangedCallback?: (path: string, newValue: any, previousValue: any) => void) {
        if (!newFormSchema || !newFormSchema.module) {
            return;
        }
        // 涉及 @farris/on-change的引入 ------------------ToDo后期调整
        // if (schemaChangedCallback) {
        //     // 设置代理，监听属性变化 
        //     formSchema = onChange(newFormSchema, (path, value, previousValue, applyData) => {
        //         // JSON变更后的回调
        //         schemaChangedCallback(path, value, previousValue);
        //     });
        // } else {
        //     formSchema = newFormSchema;
        // }
        formSchema = newFormSchema;
    }
    /**
     * 深层查找控件
     */
    function getComponetsByPredicate(predicate: (component) => boolean) {
        const targetComponets = [] as any;
        const predicateFun = predicate;
        const findTarget = (contentComponents) => {
            contentComponents.forEach(function (component) {
                if (predicateFun(component)) {
                    targetComponets.push(component);
                }
                if (component.contents && component.contents.length) {
                    findTarget(component.contents);
                }
            });
        };

        findTarget(formSchema.module.components);
        return targetComponets;
    }

    /**
    * 根据组件ID获取components下相应的组件节点
    * @param targetComponentId 组件标识
    */
    function getComponentById(targetComponentId: string, deep: boolean = false): FormComponent | undefined {
        if (!formSchema.module || !formSchema.module.components || formSchema.module.components.length === 0) {
            return;
        }
        if (deep) {
            const targetComponet = getComponetsByPredicate((item) => item.id === targetComponentId);
            return targetComponet ? targetComponet[0] : undefined;
        } else {
            return formSchema.module.components.find(component => component.id === targetComponentId);
        }
    }
    /**
     *  根据VM ID获取相应组件
     * @param viewModelId VMID
     */
    function getComponentByViewModelId(targetViewModelId: string): FormComponent | undefined {
        if (!formSchema.module || !formSchema.module.components || formSchema.module.components.length === 0) {
            return;
        }

        return formSchema.module.components.find(component => component.viewModel === targetViewModelId);
    }
    /**
     * 根据ComponentId查找对应得ViewModel的Id，用来处理组件属性时
     * @param targetComponentId 
     * @returns 
     */
    function getViewModelIdByComponentId(targetComponentId: string): string {
        if (!formSchema.module || !formSchema.module.components || formSchema.module.components.length === 0) {
            return '';
        }

        const targetComponent = formSchema.module.components.find(component => component.id === targetComponentId);
        return targetComponent?.viewModel || '';
    }
    /**
   * 根据viewModelId获取模型节点
   * @param viewModelId 视图模型标识
   */
    function getViewModelById(targetViewModelId: string): FormViewModel | undefined {
        if (!formSchema.module || !formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }

        return formSchema.module.viewmodels.find(viewModel => viewModel.id === targetViewModelId);
    }

    /**
     * 根据指定的条件遍历查找节点
     * @param rootNode 容器节点
     * @param predict 条件
     */
    function selectNode(rootNode: any, predict: (item: any) => boolean): any {
        if (!rootNode) {
            return null;
        }
        if (predict(rootNode)) {
            return rootNode;
        }
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                const found = selectNode(item, predict);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    /**
     * 根据指定的条件遍历查找节点，返回节点及其父节点
     * @param rootNode 容器节点
     * @param predict 预设的判断逻辑
     * @param parentNode 父节点
     */
    function selectNodeAndParentNode(
        rootNode: any,
        predict: (item: any) => boolean, parentNode: any
    ): { node: any; parentNode: any } | undefined {
        if (!rootNode) {
            return;
        }
        if (predict(rootNode)) {
            return {
                node: rootNode,
                parentNode
            };
        }
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                const found = selectNodeAndParentNode(item, predict, rootNode);
                if (found) {
                    return found;
                }
            }
        }
    }
    function getViewModels() {
        return formSchema?.module?.viewmodels || [];
    }
    function setViewmodels(value) {
        formSchema.module.viewmodels = value;
    }
    function getComponents(): FormComponent[] {
        return formSchema?.module?.components || [];
    }

    function getModule(): FormMetaDataModule {
        return formSchema.module;
    }

    /*
     * 获取表单引用的命令构件信息
     */
    function getCommands(): FormWebCmd[] {
        return formSchema?.module?.webcmds || [];
    }
    function setCommands(value: Array<FormWebCmd>) {
        formSchema.module.webcmds = value || [];
    }

    function getExpressions(): FormExpression[] {
        return formSchema?.module.expressions || [];
    }

    function setExpressions(value) {
        formSchema.module.expressions = value;
    }

    function getTemplateId() {
        return formSchema.module.templateId || '';
    }

    /**
     * 设置打开表单设计器时的DOM元数据结构，与be数据保持一致
     */
    function setPreviousFormSchema(formSchema) {
        if (!formSchema || !formSchema.module) {
            return;
        }
        previousFormSchema = formSchema;
    }
    /**
     * 获取表单设计器时的DOM元数据结构，与be数据保持一致
     */
    function getpreviousFormSchema() {
        return previousFormSchema;
    }

    /**
     * 更新控件JSON结构映射 updateDomDgMap
     * @param componentInstanceList 控件实例列表
     */
    function updateComponentDomMap(componentInstanceList: any[]) {
        componentDomMap.clear();
        for (const cmp of componentInstanceList) {
            componentDomMap.set(cmp.id, cmp.component);

            // 记录组件内部的部分JSON结构
            if (cmp.updateDomDgMap) {
                cmp.updateDomDgMap();
            }
        }
    }
    /**
     * 获取schemas节点下的uri (目前仅支持单一数据源)
     */
    function getSchemas(): FormSchema | undefined {
        const { entity } = formSchema.module;
        if (!entity || entity.length === 0) {
            return;
        }
        return entity[0];

    }

    function setSchemas(schemaObject) {
        if (!schemaObject) {
            return;
        }
        formSchema.module.entity = [schemaObject];
    }

    function setSchemaEntity(schemEntities: FormSchemaEntity[]) {
        const schema = getSchemas();
        if (schema) {
            schema.entities = schemEntities;
        }

    }

    function getQDPInfo() {
        const { qdpInfo } = formSchema.module;
        if (qdpInfo && qdpInfo.qoMetadata && qdpInfo.qoMetadata.length) {
            return qdpInfo;
        } else {
            return null;
        }
    }

    function getUpdateVersion() {
        return formSchema.module.updateVersion;
    }

    function getExtraImports(): Array<{ name: string, path: string }> | null {
        return formSchema ? formSchema.module.extraImports : null;
    }

    function setExtraImports(value: Array<{ name: string, path: string }>) {
        formSchema.module.extraImports = value;
    }

    function getViewModelByFieldId(fieldId: string): FormViewModel {
        let viewModel;
        for (const vm of formSchema.module.viewmodels) {
            const field = vm.fields.find(f => f.id === fieldId);
            if (field) {
                viewModel = vm;
                break;
            }
        }
        return viewModel;
    }
    /**
     * 校验指定VM下是否重复绑定字段或变量
     * @param viewModelId 视图模型标识
     * @param newFieldId 字段标识
     */
    function checkViewModelDulplicated(viewModelId, newFieldId) {
        if (!viewModelId || !newFieldId) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);

        // 判断重复绑定
        const exsitVM = viewModel?.fields.find(fieldItem => fieldItem.id === newFieldId);
        if (exsitVM) {
            return true;
        }
        return false;
    }

    /**
     * 控件新增绑定添加ViewModel Field
     */
    function addViewModelField(viewModelId, filedObject: FormViewModelField) {
        if (!viewModelId || !filedObject) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);

        if (!viewModel?.fields.find(fieldItem => fieldItem.id === filedObject.id)) {
            viewModel?.fields.push(filedObject);
        }

    }

    /**
     * 修改ViewModel Field
     * @param viewModelId VM ID
     * @param fieldId 修改前binding.field取值
     * @param changeObject 变更集
     */
    function modifyViewModelFieldById(viewModelId, fieldId, changeObject, isMerge = true) {
        if (!viewModelId || !changeObject) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);
        let field;
        if (fieldId) {
            field = viewModel?.fields.find(fieldItem => fieldItem.id === fieldId);
        }
        function customizer(objValue, srcValue) {
            if (!isMerge) {
                return srcValue;
            } else if (Array.isArray(objValue)) {
                return srcValue;
            }
        }
        if (field) {
            // 数组类型不再合并，全量替换：用户枚举数据的更改
            mergeWith(field, changeObject, customizer);
        } else {
            changeObject.groupId = null;
            changeObject.groupName = null;
            addViewModelField(viewModelId, changeObject);
        }
    }

    /**
     * 根据VMID修改ViewModel节点
     * @param vmId  视图模型标识
     * @param vmFields 字段集合
     */
    function setViewModelFieldsById(viewModelId, viewModelFields) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0 || !viewModelId) {
            return;
        }
        const oldVM = formSchema.module.viewmodels.find(viewModelItem => viewModelItem.id === viewModelId);
        if (oldVM) {
            oldVM.fields = viewModelFields;
        }
    }

    /**
     * 修改VM字段的分组名称
     * @param viewModelId 视图模型标识
     * @param groupId 分组标识
     * @param groupName 分组名称
     */
    function modifyGroupNameById(viewModelId, groupId, groupName) {
        const vm = getViewModelById(viewModelId);
        vm?.fields.forEach(field => {
            if (field.groupId !== groupId) { return; }
            field.groupName = groupName;
        });
    }

    /**
     * 根据ID删除ViewModel中的field节点
     * @param viewModelId 视图模型标识
     * @param fieldId 字段标识
     */
    function deleteViewModelFieldById(viewModelId: string, fieldId: string) {
        if (!viewModelId || !fieldId) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);
        if (!viewModel) {
            return;
        }
        viewModel.fields = viewModel.fields.filter(fieldItem => fieldItem.id !== fieldId);
    }

    /**
     * 清除视图模型中针对字段的修改
     * @param viewModelId 视图模型标识
     * @param fieldId 字段标识
     */
    function clearViewModelFieldSchema(viewModelId, fieldId) {
        if (!viewModelId) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);
        let field;
        if (fieldId) {
            field = viewModel?.fields.find(fieldItem => fieldItem.id === fieldId);
        }
        if (field) {
            field.fieldSchema = {};
        }
    }
    /**
     * 根据ID删除整个ViewModel
     * @param viewModelId 视图模型标识
     */
    function deleteViewModelById(viewModelId) {
        const index = formSchema.module.viewmodels.findIndex(viewModelItem => viewModelItem.id === viewModelId);
        if (index < 0) {
            return;
        }

        // 删除webcmds中命令的引用信息
        const viewModel = formSchema.module.viewmodels[index];
        if (viewModel.commands && viewModel.commands.length && getCommands() && getCommands().length) {
            viewModel.commands.forEach(command => {
                const webComand = getCommands().find(commandItem => commandItem.id === command.cmpId);
                if (webComand && webComand.refedHandlers && webComand.refedHandlers.length) {
                    webComand.refedHandlers = webComand.refedHandlers.filter(handler => handler.host !== command.id);
                }
            });
        }

        formSchema.module.viewmodels.splice(index, 1);
    }

    /**
     * 删除dom中components下的组件节点
     * @param componentId 组件ID
     */
    function deleteComponent(componentId: string) {
        if (!formSchema || !formSchema.module || !componentId || !formSchema.module.components) {
            return [];
        }
        formSchema.module.components = formSchema.module.components.filter(componentItem => componentItem.id !== componentId);
    }

    /**
     * 获取表单ViewModel中的命令，构建treetable数据，用于事件的选择窗口
     * 树表中额外增加commandPath属性(命令所在viewModelId.commandCode)，用于窗口展开时数据行的回显。
     */
    function getCommandsTreeTable(viewModelId: string, showEmptyViewModelNode = false) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }
        const commandTree = [] as any;
        const viewModeli18n = '视图模型';
        // 获取根ViewModel和其他所有ViewModel的命令
        if (!viewModelId || viewModelId === ROOT_VIEW_MODEL_ID) {

            for (let index = 0; index < formSchema.module.viewmodels.length; index++) {
                const viewModel = formSchema.module.viewmodels[index];
                if (viewModel.fakeDel) {
                    continue;
                }
                const children = [] as any;
                viewModel.commands.forEach(command => {
                    children.push({ data: { ...command, commandPath: viewModel.id + '.' + command.code }, children: [], selectable: true });
                });

                if (showEmptyViewModelNode || children.length) {
                    commandTree.push({
                        data: { id: viewModel.id, code: viewModel.code, name: viewModel.name + viewModeli18n, commandPath: viewModel.id },
                        children,
                        selectable: false, expanded: true
                    });
                }

            }
            let rootViewModel;
            if (commandTree.length > 1) {
                // 根节点
                rootViewModel = commandTree[0];
                const childVmList = commandTree.slice(1, commandTree.length);
                rootViewModel.children.push(...childVmList);
                return [rootViewModel];
            }
            return commandTree;
        }

        // 获取指定viewModel的命令
        const selectedViewModel = formSchema.module.viewmodels.find(vm => vm.id === viewModelId);
        selectedViewModel?.commands.forEach(command => {
            commandTree.push({
                data: { ...command, commandPath: selectedViewModel.id + '.' + command.code },
                children: [], selectable: true
            });
        });
        if (commandTree.length) {
            return [{
                data: {
                    id: selectedViewModel?.id, code: selectedViewModel?.code, name: selectedViewModel?.code + viewModeli18n,
                    commandPath: selectedViewModel?.id
                },
                children: commandTree,
                selectable: false,
                expanded: true
            }];
        }
        return [];


    }

    /**
     * 获取所有的命令，平铺成数组
     */
    function getAllPlainCommands(): any[] {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return [];
        }
        const commands = [] as any;
        // 获取根ViewModel和其他所有ViewModel的命令
        formSchema.module.viewmodels.forEach(viewModel => {
            viewModel.commands.forEach(command => {
                commands.push({ ...command, commandPath: viewModel.id + '.' + command.code });
            });
        });
        return commands;
    }

    /**
     * 获取ViewModel中组件上下文变量，构建treetable数据，用于变量绑定的选择窗口
     */
    function getLocaleVariablesByViewModelId(viewModelId: string) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return [];
        }
        const viewModel = getViewModelById(viewModelId);
        if (!viewModel || !viewModel.states || viewModel.states.length === 0) {
            return [];
        }

        const children = [] as any;
        viewModel.states.forEach(variable => {
            if (!variable.category || variable.category === FormVariableCategory.locale) {
                // 增加类型名称，用于界面展示
                let displayTypeName = variable.type;
                const vt = FormVariableTypes.find(v => v.value === variable.type);
                if (vt) {
                    displayTypeName = vt.text;
                }

                children.push({ data: { ...variable, displayTypeName, viewModelId }, children: [] });
            }
        });

        if (!children.length) {
            return [];
        }
        const rootVm = {
            data: {
                id: viewModel.id,
                name: viewModel.name + '组件'
            },
            children,
            selectable: false,
            expanded: true,
            nodeType: 'vmNode'
        };

        return [rootVm];
    }

    function getRootViewModelId(): string {
        if (formSchema.module.viewmodels == null || formSchema.module.viewmodels.length === 0) {
            return ROOT_VIEW_MODEL_ID;
        }

        if (formSchema.module.viewmodels.find(viewmodel => viewmodel.id === ROOT_VIEW_MODEL_ID)) {
            return ROOT_VIEW_MODEL_ID;

        }

        return formSchema.module.viewmodels[0].id;
    }
    /**
     * 获取ViewModel中远程（VO）上下文变量，构建treetable数据，用于变量绑定的选择窗口
     */
    function getRemoteVariables() {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return [];
        }
        const viewModel = getViewModelById(getRootViewModelId());
        if (!viewModel || !viewModel.states || viewModel.states.length === 0) {
            return [];
        }

        const children = [] as any;
        viewModel.states.forEach(variable => {
            if (variable.category === FormVariableCategory.remote) {
                // 增加中文类型名称，用于界面展示
                let displayTypeName = variable.type;
                const vt = FormVariableTypes.find(v => v.value === variable.type);
                if (vt) {
                    displayTypeName = vt.text;
                }

                children.push({ data: { ...variable, displayTypeName }, children: [], selectable: true });
            }
        });
        return children;
    }
    /**
     * ----------------内部方法--------------------------
     * schema中的变量转换为VM上的变量
     * @param schemaVarList 变量列表
     */
    function changeSchemaVariable2VMVariable(schemaVarList: FormSchemaEntityField[]) {
        if (!schemaVarList || schemaVarList.length === 0) {
            return [];
        }
        const viewModelVarList: FormVariable[] = [];
        schemaVarList.forEach(schemaVarItem => {
            const formVariable: FormVariable = {
                id: schemaVarItem.id,
                code: schemaVarItem.label,
                name: schemaVarItem.name,
                type: schemaVarItem.type.name,
                category: FormVariableCategory.remote
            };
            if (schemaVarItem.$type !== 'SimpleField' && schemaVarItem.type.fields) {
                formVariable.type = 'Object';
                formVariable.fields = changeSchemaVariable2VMVariable(schemaVarItem.type.fields);
            }

            viewModelVarList.push(formVariable);
        });
        return viewModelVarList;
    }
    /**
     * 更新远程变量
     * @param varList 变量列表
     */
    function updateRemoteVariables(varList: FormSchemaEntityField[]) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }
        const viewModel = getViewModelById(getRootViewModelId());
        const currentStates = viewModel?.states.filter(s => s.category === 'remote');
        const vmVarList = changeSchemaVariable2VMVariable(varList);

        const clonedCurrentState = cloneDeep(currentStates);
        clonedCurrentState?.forEach(s => delete s.value);

        // 为了不引起DOM JSON的变更，增加判断
        if (currentStates && vmVarList && JSON.stringify(clonedCurrentState) !== JSON.stringify(vmVarList)) {
            if (viewModel) {
                viewModel.states = viewModel?.states.filter(s => !s.category || s.category === 'locale');
            }
            vmVarList.forEach(newVar => {
                const oldState = currentStates.find(s => s.id === newVar.id);
                if (oldState && oldState.value !== undefined && oldState.type === newVar.type) {
                    newVar.value = oldState.value;
                }

                viewModel?.states.push(newVar);
            });
        }
    }


    /**
     * 保存变量(全量)
     * @param states 变量列表
     * @param viewModelId 变量所属viewModel ID
     */
    function saveVariables(states: FormVariable[], viewModelId: string) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);
        if (viewModel) {
            viewModel.states.length = 0;
            viewModel.states.push(...states);
        }
    }

    /**
     * 获取指定变量
     */
    function getVariableByIdAndVMID(varId: string, viewModelId: string) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }
        const viewModel = getViewModelById(viewModelId);
        const variable = viewModel?.states.find(stateItem => stateItem.id === varId);
        return variable;
    }

    /**
     * 获取指定变量
     */
    function getVariableById(varId: string) {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return;
        }
        for (const viewModel of formSchema.module.viewmodels) {
            const variable = viewModel.states.find(stateItem => stateItem.id === varId);
            if (variable) {
                return variable;
            }
        }
    }

    /**
     * 根据编号获取变量
     */
    function getVariableByCode(variableCode: string): FormVariable | undefined {
        const viewModels = formSchema.module.viewmodels;
        if (!viewModels || viewModels.length === 0) {
            return;
        }
        for (const viewModel of viewModels) {
            const variable = viewModel.states.find(stateItem => stateItem.code === variableCode);
            if (variable) {
                return variable;
            }
        }
    }

    /**
     * 获取所有VM下的变量，组装成树结构
     * 树表中额外增加statePath属性(命令所在viewModelId.variableCode)，用于窗口展开时数据行的回显。
     */
    function getAllVariables() {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return [];
        }
        const vmTree = [] as any;
        const viewModeli18n = '视图模型';
        formSchema.module.viewmodels.forEach(viewModel => {
            if (!viewModel || !viewModel.states || viewModel.states.length === 0) {
                return [];
            }

            const children = [] as any;
            viewModel.states.forEach(variable => {
                children.push({ data: { ...variable, statePath: viewModel.id + '.' + variable.code }, children: [], selectable: true });
            });

            const rootVm = {
                data: { id: viewModel.id, code: viewModel.code, name: viewModel.name + viewModeli18n, statePath: viewModel.id },
                children,
                selectable: false, expanded: true
            };
            vmTree.push(rootVm);

        });
        return vmTree;
    }

    /**
     * 获取所有VM下的变量并平铺成数组
     * 额外增加statePath属性(命令所在viewModelId.variableCode)，用于唯一标识
     */
    function getAllPlainVariables(): any[] {
        if (!formSchema.module.viewmodels || formSchema.module.viewmodels.length === 0) {
            return [];
        }
        const varArray = [] as any;
        formSchema.module.viewmodels.forEach(viewModel => {
            if (!viewModel || !viewModel.states || viewModel.states.length === 0) {
                return [];
            }
            viewModel.states.forEach(variable => {
                varArray.push({ ...variable, statePath: viewModel.id + '.' + variable.code });
            });
        });
        return varArray;
    }
    function getControlEditorsInTable(tableRows: any[], fieldId: string, devMode: string) {
        let controls = [] as any;
        if (tableRows && tableRows.length) {
            tableRows.forEach(row => {
                row.columns.forEach(column => {
                    if (column.tdType === 'editor' && column.editor && column.editor.binding) {
                        if (column.editor.binding.type && column.editor.binding.type === FormBindingType.Form && column.editor.binding.field === fieldId) {
                            controls.push(column.editor);
                            // 查找与当前单元格同组的文本类单元格TableTd，这种单元格不包含编辑器，但是需要与编辑器同步展示标题，所以放在关联控件里面。
                            if (devMode === 'simple' && column.groupId) {
                                const sameGroupStaticColumns = row.columns.filter(col => col.groupId === column.groupId && col.id !== column.id && !col.invisible && col.tdType === 'staticText');
                                if (sameGroupStaticColumns.length) {
                                    controls = controls.concat(sameGroupStaticColumns);
                                }
                            }
                        }

                    }


                });
            });
        }

        return controls;
    }

    /**
     * 获取指定VM关联的组件中绑定指定字段的控件
     * @param contents DOM节点
     * @param fieldId 字段标识
     */
    function getControlsByBinding(contents: any[], fieldId: string) {
        let controls = [] as any;
        for (const element of contents) {
            if ((element.type === 'data-grid') || (element.type === 'tree-grid')) { // 列表
                const childControls = getControlsByBinding(element.columns, fieldId);
                controls = controls.concat(childControls);
            } else if (element.type === 'table') { // Table
                const tdControls = getControlEditorsInTable(element.rows, fieldId, element.devMode);
                controls = controls.concat(tdControls);
            } else if (element.contents) { // 容器组件
                const childControls = getControlsByBinding(element.contents, fieldId);
                controls = controls.concat(childControls);
            } else if (element.binding && element.binding.type === FormBindingType.Form && element.binding.field === fieldId) {
                controls.push(element);
            }
        }

        return controls;
    }
    /**
     * 获取指定VM关联的组件中绑定指定字段的控件（目前只有一个控件）
     * @param viewModelId VM标识
     * @param fieldId   字段标识
     */
    function getControlsInCmpWidthBinding(viewModelId: string, fieldId: string) {
        const foundComponent = formSchema.module.components.find(componentItem => componentItem.viewModel === viewModelId);

        return foundComponent ? getControlsByBinding(foundComponent.contents, fieldId) : [];
    }


    /**
     *  获取节点下所有 components ID 列表
     * @param eleContents []
     * @returns string[]
     */
    function getALLComponentsIDList(eleContents: { type: string, component: any, contents: [] }[]): string[] {
        let deIDList = [] as any;
        eleContents.forEach(element => {
            if (element.type === 'ComponentRef') {
                const targetComponents = formSchema.module.components.find((item) => {
                    return item.id === element.component;
                });
                deIDList.push(targetComponents?.id || '');
                // 这段没有必要，因为没有嵌套的component
                if (targetComponents && targetComponents.contents) {
                    if (targetComponents.contents && targetComponents.contents.length) {
                        deIDList = deIDList.concat(getALLComponentsIDList(targetComponents.contents));
                    }
                }
            }
            if (element.contents && element.contents.length) {
                deIDList = deIDList.concat(getALLComponentsIDList(element.contents));
            }
        });
        return deIDList;
    }

    /**
     * ------------------------------内部方法-------------------
     * 根据id遍历查找节点(id支持带有*号的通配符)
     * @param rootNode 容器节点
     * @param predict 条件
     */
    function selectNodeByWildcardID(rootNode: any, id: string) {
        if (!rootNode || !id) {
            return null;
        }
        let flag = false;
        if (id.includes('*')) {
            const newId = id.replace('*', '');
            if (rootNode.id.includes(newId)) {
                flag = true;
            }
        } else if (rootNode.id === id) {
            flag = true;
        }

        if (flag) {
            return rootNode;
        }
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                const found = selectNodeByWildcardID(item, id);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }
    /**
     * 根据id路径定位节点
     * @param rootNode 根节点
     * @param idPath id路径
     */
    function getNodeByIdPath(rootNode: any, idPath: string) {
        if (!rootNode || !idPath) {
            return null;
        }
        const idPathArray = idPath.split('.');
        if (idPathArray.length === 0) {
            return;
        }
        const currentId = idPathArray.shift();
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                if (currentId === '*') {
                    // 任意路径
                    const nextItem = selectNodeByWildcardID(item, idPathArray[0]);
                    if (nextItem) {
                        idPathArray.shift();
                        if (idPathArray.length === 0) {
                            return nextItem;
                        }
                        const found = getNodeByIdPath(nextItem, idPathArray.join('.'));
                        if (found) {
                            return found;
                        }
                    }

                } else if ((currentId?.includes('*') && item.id.startsWith(currentId.slice(0, currentId.length - 1)))
                    || item.id === currentId) {

                    if (idPathArray.length === 0) {
                        return item;
                    } else {
                        const found = getNodeByIdPath(item, idPathArray.join('.'));
                        if (found) {
                            return found;
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * 根据ID路径查找所有节点，找到所有符合idPath的最后一位的节点
     * @param rootNode 容器节点
     * @param idPath id路径
     */
    function getNodesByIdPath(rootNode: any, idPath: string) {
        if (!rootNode || !idPath) {
            return null;
        }
        const idPathArray = idPath.split('.');
        if (idPathArray.length === 0) {
            return;
        }
        const currentId = idPathArray.shift();
        if (rootNode.contents) {
            for (const item of rootNode.contents) {
                if (currentId === '*') {

                    if (idPathArray.length === 1 && item.contents && item.contents.length) {
                        return item.contents.filter(c => c.id.includes(idPathArray[0].replace('*', '')));
                    }


                    // 任意路径
                    const nextItem = selectNodeByWildcardID(item, idPathArray[0]);
                    if (nextItem) {
                        idPathArray.shift();
                        if (idPathArray.length === 0) {
                            return [nextItem];
                        }
                        const found = getNodeByIdPath(nextItem, idPathArray.join('.'));
                        if (found) {
                            return [found];
                        }
                    }

                } else if ((currentId?.includes('*') && item.id.startsWith(currentId.slice(0, currentId.length - 1)))
                    || item.id === currentId) {

                    if (idPathArray.length === 0) {
                        return [item];
                    } else {
                        const found = getNodesByIdPath(item, idPathArray.join('.'));
                        if (found) {
                            return found;
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * 根据控件所在组件的统一布局配置获取控件样式
     * @param componentId 组件Id
     */
    function getControlClassByFormUnifiedLayout(controlClass: string, componentId: string, formNode: any): string {
        if (!formNode || formNode.type !== 'response-form') {
            const componentNode = getComponentById(componentId);
            if (!componentNode || !componentNode.componentType.startsWith('form')) {
                return controlClass;
            }
            formNode = selectNode(componentNode, item => item.type === 'response-form');
        }
        if (!formNode || !formNode.unifiedLayout) {
            return controlClass;
        }

        const controlClassArray = controlClass.split(' ');

        let colClass = controlClassArray.find(item => /^col-([1-9]|10|11|12)$/.test(item));
        let colMDClass = controlClassArray.find(item => /^col-md-([1-9]|10|11|12)$/.test(item));
        let colXLClass = controlClassArray.find(item => /^col-xl-([1-9]|10|11|12)$/.test(item));
        let colELClass = controlClassArray.find(item => /^col-el-([1-9]|10|11|12)$/.test(item));


        colClass = formNode.unifiedLayout.uniqueColClassInSM ? 'col-' + formNode.unifiedLayout.uniqueColClassInSM : colClass;
        colMDClass = formNode.unifiedLayout.uniqueColClassInMD ? 'col-md-' + formNode.unifiedLayout.uniqueColClassInMD : colMDClass;
        colXLClass = formNode.unifiedLayout.uniqueColClassInLG ? 'col-xl-' + formNode.unifiedLayout.uniqueColClassInLG : colXLClass;
        colELClass = formNode.unifiedLayout.uniqueColClassInEL ? 'col-el-' + formNode.unifiedLayout.uniqueColClassInEL : colELClass;

        return colClass + ' ' + colMDClass + ' ' + colXLClass + ' ' + colELClass;

    }
    /**
     * ----------------内部方法--------------------------
   * 遍历节点下所有节点
   * @param root 根节点或contents
   * @param parentId 父节点id
   * @returns 
   */
    function collectMetadata(root: Node | Node[], parentId?: string | undefined) {
        if (Array.isArray(root)) {
            root.forEach((node: Node) => {
                collectMetadata(node, parentId);
            });
        } else {
            const { id = null, type = null, contents = null } = root;
            if (!id || !type) {
                return;
            }
            root.__parentId__ = parentId;
            const typeValue = nodeTypeCollect.get(type) || [];
            typeValue.push(root);
            nodeTypeCollect.set(type, typeValue);
            // const idValue = nodeIdCollect.get(id) || [];
            // idValue.push(root);
            // nodeIdCollect.set(id, idValue);
            if (contents && contents.length > 0) {
                collectMetadata(root.contents as Node[], id);
            }
        }
    }

    /**
     * 获取所有隐藏帮助
     */
    function getHidenLookups() {
        const result = [] as any;
        nodeTypeCollect.clear();
        const nodes = cloneDeep(formSchema.module.components);
        collectMetadata(nodes);
        if (nodeTypeCollect && nodeTypeCollect.size > 0) {
            // 找到所有的隐藏区域
            const hiddenContainers = nodeTypeCollect.get(NodeType.HiddenContainer);
            if (hiddenContainers && hiddenContainers.length > 0) {
                const containerIds = hiddenContainers.map(item => item['id']);
                const lookupEdits = nodeTypeCollect.get(NodeType.LookupEdit);
                if (lookupEdits && lookupEdits.length > 0) {
                    const hiddenHelps = lookupEdits.filter(node => containerIds.includes(node['__parentId__'] || ''));
                    result.push(...hiddenHelps);
                }
            }
        }
        return result;
    }
    /**
     * 获取所有子表弹出编辑组件
     * @returns 
     */
    function getPageModalComponents() {
        const result = [] as any;
        nodeTypeCollect.clear();
        const nodes = cloneDeep(formSchema.module.components);
        collectMetadata(nodes);
        if (nodeTypeCollect && nodeTypeCollect.size > 0) {
            // 找到所有的隐藏区域
            const components = nodeTypeCollect.get(NodeType.Component);
            if (components && components.length > 0) {
                const modals = components.filter(item => item.componentType === 'modalFrame');
                if (modals && modals.length > 0) {
                    result.push(...modals);
                }
            }
        }
        return result;
    }

    /**
     * 根据指定的类型数组获取组件
     * @param types 
     * @param deep 
     * @returns 
     */
    function getComponentsByType(types: any, deep = false) {
        if (!formSchema.module.components || formSchema.module.components.length === 0) {
            return;
        }
        if (deep) {
            const targetComponet = [] as any;
            const FindComponent = (components: any[]) => {
                components.forEach((componentItem) => {
                    if (componentItem) {
                        if (types.includes(componentItem.type)) {
                            targetComponet.push(componentItem);
                        } else if (componentItem.contents && componentItem.contents.length) {
                            FindComponent(componentItem.contents);
                        }
                    }
                });
            };
            FindComponent(formSchema.module.components);
            return targetComponet;
        } else {
            return formSchema.module.components.filter(cmp => types.includes(cmp.type));
        }
    }

    function getSchemaEntities(): FormSchemaEntity[] {
        const schema = getSchemas();
        return schema?.entities || [];
    }

    /**
     * 获取表字段列表
     * @param entities 实体对象集合
     * @param bindTo 实体绑定路径
     */
    function getTableFieldsByBindTo(entities: FormSchemaEntity[], bindTo: string): FormSchemaEntityField[] | undefined {
        if (!entities || entities.length === 0) {
            return [];
        }
        const splitIndex = bindTo.indexOf('/');
        if (splitIndex > -1) {
            bindTo = bindTo.slice(splitIndex + 1, bindTo.length);
        }

        for (const entity of entities) {
            const entityType = entity.type;
            if (!entityType) {
                return [];
            }
            if (bindTo === '' || bindTo === entity.code || bindTo === entity.label) {
                return entityType.fields;
            }
            if (entityType.entities && entityType.entities.length > 0) {
                const fields = getTableFieldsByBindTo(entityType.entities, bindTo);
                if (fields) {
                    return fields;
                }
            }
        }
    }

    /**
 * 获取指定VM下的所有字段
 * @param viewModelId 视图模型标识
 */
    function getFieldsByViewModelId(viewModelId: string): FormSchemaEntityField[] | undefined {
        const vm = getViewModelById(viewModelId);
        if (!vm) {
            return [];
        }
        const entities = getSchemaEntities();
        if (!entities || entities.length === 0) {
            return [];
        }
        return getTableFieldsByBindTo(entities, vm.bindTo);
    }

    function setFormTemplateRule(rules: any) {
        formTemplateRules = rules;
    }
    function getFormTemplateRule(): any {
        return formTemplateRules;
    }

    /** 
     * 删除表达式后还原组件的默认值
     */
    function getDefaultValueByFiledAndType(propertyType: string, schema: FormSchemaEntityField) {
        if (propertyType === 'visible') {
            return true;
        }
        if (propertyType === 'required') {
            return schema.require === undefined ? false : schema.require;
        }
        if (propertyType === 'readonly') {

            if (formSchema.module.stateMachines?.length) {
                return schema.readonly ? true : '!viewModel.stateMachine[\'editable\']';
            }
            return schema.readonly ? true : false;
        }

    }
    /**
     * 删除控件相关的组件通讯
     */
    function removeCommunicationInComponent(componentSchema: any) {
        if (!componentSchema || !formSchema.module.communications?.length) {
            return;
        }

        const controlEventPropertyIDList = schemaMap[componentSchema.type]?.events;
        if (controlEventPropertyIDList) {
            Object.keys(controlEventPropertyIDList).forEach(propertyId => {
                const propertyValue = componentSchema[propertyId];
                if (propertyValue && propertyValue.includes('communication:')) {
                    const communicationIds = propertyValue.replace(/communication:/g, '').split(';');
                    formSchema.module.communications = formSchema.module.communications?.filter(communication => !communicationIds.includes(communication.id));
                }
            });
        }
    }

    /**
     * 获取外部组件集合
     */
    function getExternalComponents(): any[] {
        return formSchema?.module?.externalComponents || [];
    }

    return {
        getModule,
        setViewmodels,
        setCommands,
        getCommands,
        getComponents,
        getViewModels,
        getFormSchema,
        setFormSchema,
        getComponentById,
        getUpdateVersion,
        getViewModelIdByComponentId,
        getComponentByViewModelId,
        getViewModelById,
        selectNode,
        selectNodeAndParentNode,
        getFormMetadataBasicInfo,
        setFormMetadataBasicInfo,
        getControlBasicInfoMap,
        deleteViewModelById,
        deleteViewModelFieldById,
        addViewModelField,
        getSchemas,
        clearViewModelFieldSchema,
        modifyViewModelFieldById,
        getControlClassByFormUnifiedLayout,
        setFormTemplateRule,
        getFormTemplateRule,
        getRemoteVariables,
        getLocaleVariablesByViewModelId,
        getFieldsByViewModelId,
        getExpressions,
        setExpressions,
        deleteComponent,
        getControlsInCmpWidthBinding,
        getVariableById,
        getVariableByCode,
        updateRemoteVariables,
        getRootViewModelId,
        getSchemaEntities,
        externalFormSchema,
        getComponetsByPredicate,
        getDefaultValueByFiledAndType,
        designerMode,
        removeCommunicationInComponent,
        getExternalComponents
    };
}
