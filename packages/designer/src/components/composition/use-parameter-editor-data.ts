import { ComponentSchema } from "@farris/ui-vue";
import { ComponentType, FormComponent, FormSchemaEntity, FormSchemaEntityField, UseFormSchema } from "../types";

export interface ComponentTreeNode {
    data: Partial<ComponentSchema>,
    id: string;
    code: string;
    name: string;
    layer: number;
    parent: any;
    parentId?: string | null;
    hasChildren: boolean;
}

export interface ViewModelTreeNode {
    children: ViewModelTreeNode[];
    data: { id: string, code: string, name: string, statePath: string };
    id?: string;
    code?: string;
    selectable?: boolean;
    expanded?: boolean;
}


export function useParameterEditorData(useFormSchemaComposition: UseFormSchema) {

    function getComponentRefNode(formSchema: any, componentId: string) {
        const { components } = formSchema.module;
        const rootCmp = components.find(component => component.componentType === 'frame');
        let componentRefResult = useFormSchemaComposition.selectNodeAndParentNode(rootCmp, (item) => item.component === componentId, rootCmp);

        if (componentRefResult) {
            return componentRefResult;
        }

        const modalFrames = components.filter(c => c.componentType === ComponentType.modalFrame);
        modalFrames && modalFrames.length && modalFrames.forEach((modalFrame: any) => {
            componentRefResult = useFormSchemaComposition.selectNodeAndParentNode(modalFrame, (item) => item.component === componentId, modalFrame);
            if (componentRefResult) {
                return componentRefResult;
            }
        });
    }

    function getDataGridComponentName(formSchema: any, component: any) {
        const treeGrid = useFormSchemaComposition.selectNode(component, (item: any) => item.type === 'tree-grid');
        if (treeGrid) {
            return '树表格组件';
        }

        const componentRefResult = getComponentRefNode(formSchema, component.id);
        if (!componentRefResult || !componentRefResult.parentNode) {
            return;
        }
        const componentRefParentContainer = componentRefResult.parentNode;

        // 列表组件取父层容器的标题:容器可能为标签页或者section
        if (componentRefParentContainer.type === 'tab-page') {
            return componentRefParentContainer.title + '组件';
        }
        if (componentRefParentContainer.type === 'section' && componentRefParentContainer.mainTitle) {
            return componentRefParentContainer.mainTitle + '组件';
        }

        return '表格组件';
    }
    function getViewModelName(component: any, componentName: string, formSchema?: any) {
        if (!formSchema) {
            formSchema = useFormSchemaComposition.getFormSchema();
        }
        switch (component?.componentType) {
            case ComponentType.Frame: {
                return '根组件';
            }
            case ComponentType.dataGrid: {
                return getDataGridComponentName(formSchema, component);
            }
            case ComponentType.uploader: {
                return '附件组件';
            }
            case ComponentType.listView: {
                return '列表视图组件';
            }
            case ComponentType.appointmentCalendar: {
                return '预约日历组件';
            }
            case ComponentType.modalFrame: {
                return '弹窗页面组件';
            }
            default: {
                // 卡片组件取内部section的标题
                if (component.componentType.startsWith('form')) {
                    const section = component.contents.find(content => content.type === 'section');
                    if (section && section.mainTitle) {
                        return section.mainTitle + '组件';
                    }

                }
            }
        }

        return componentName + '组件';
    }
    // 参数编辑器左侧组件配置
    /**
     * 将实体内的字段组装为树结构
     */
    function resolveFieldNodesInEntity(fields: FormSchemaEntityField[], layer: number, parentNode: any, treeViewData: any[] = []) {
        fields.forEach(field => {
            const fieldTreeData = {
                data: field,
                id: field.id,
                name: field.name,
                expanded: true,
                nodeType: 'field',
                layer,
                parent: parentNode && parentNode.id,
                parentNode,
                hasChildren: false,
                path: field.path,
                $type: field.$type,
            };
            treeViewData.push(fieldTreeData);
            // 关联表字段 / UDT字段
            if (field.type && field.type.fields && field.type.fields.length > 0) {
                fieldTreeData.hasChildren = true;
                resolveFieldNodesInEntity(field.type.fields, layer + 1, fieldTreeData, treeViewData);
            }
        });
    }

    /**
     * 组装实体树绑定数据
     */
    function resolveEntityTreeData(entity: FormSchemaEntity, layer: number, parentNode: any, treeViewData: any[] = []) {
        const entityTreeData = {
            data: entity,
            id: entity.id,
            name: entity.name,
            expanded: true,
            nodeType: 'entity',
            layer,
            parent: parentNode && parentNode.id,
            parentNode,
            hasChildren: true
        };
        treeViewData.push(entityTreeData);

        if (entity.type && entity.type.fields && entity.type.fields.length > 0) {
            resolveFieldNodesInEntity(entity.type.fields, layer + 1, entityTreeData, treeViewData);
        }

        if (entity.type.entities && entity.type.entities.length > 0) {
            const childentityTreeData = {
                id: `childEntity_${entity.id}`,
                name: '子表',
                layer: layer + 1,
                parent: entity.id,
                hasChildren: true,
                parentNode: entityTreeData
            };
            treeViewData.push(childentityTreeData);

            entity.type.entities.forEach((childEntity: any) => {
                resolveEntityTreeData(childEntity, layer + 2, childentityTreeData, treeViewData);

            });
        }
    }
    // const useFormSchemaComposition: any = inject('useFormSchema');
    function schemaFieldsToTree(treeData: any[], schemaFields: any[],
        path: string, layer: number, parent: string | null, bindTo: string) {
        if (!schemaFields || !schemaFields.length) {
            return treeData; // 传入的参数为空或长度为0，直接返回空数组
        }
        schemaFields.forEach(field => {
            const isComplexField = field.$type === 'ComplexField' && field.type && field.type.fields && field.type.fields.length;
            const treeItem = {
                data: { ...field, path, bindTo }, id: field.id, code: field.code,
                name: field.name, layer: layer + 1, parent, hasChildren: false
            };
            // 列卡表单等场景中字段会在不同的组件中重复展示，id会重复，故将树节点id重置。
            treeItem.data.id = treeItem.data.id + '_' + path;
            treeItem.id = treeItem.id + '_' + path;
            if (isComplexField) {
                treeItem.hasChildren = true;
                schemaFieldsToTree(treeData, field.type.fields,
                    `${path}/${field.bindingPath}`, treeItem.layer, treeItem.id, bindTo);
            }
            treeData.push(treeItem);
        });
        return treeData;
    }
    // 表单组件组装数据
    function assembleOutline(formSchema?: any) {
        if (!formSchema) {
            formSchema = useFormSchemaComposition.getFormSchema();
        }
        const allComponents = formSchema.module.components;
        //  表单组件
        const rootComponentId = 'root-component';
        let rootComponent = allComponents.find(item => item.id === rootComponentId);
        if (!rootComponent) {
            rootComponent = allComponents[0];
        }
        const data: ComponentTreeNode[] = [];
        allComponents.forEach((cmp: FormComponent) => {
            const viewModelId = cmp.viewModel;
            let name: any = null;
            const viewModel = formSchema.module.viewmodels.find(item => item.id === viewModelId);
            const component = formSchema.module.components.find(item => item.viewModel === viewModelId);
            if (viewModel && component) {
                name = getViewModelName(component, viewModel.name, formSchema);
            }
            const cmpTreeData: ComponentTreeNode = {
                data: cmp,
                id: cmp?.id,
                code: cmp?.code || cmp?.id,
                name: name || cmp?.id,
                layer: 0,
                parent: null,
                hasChildren: true
            };
            data.push(cmpTreeData);
        });
        return data;
    }

    function assembleSchemaFieldsByComponent(formSchema?: any) {
        if (!formSchema) {
            formSchema = useFormSchemaComposition.getFormSchema();
        }
        const entity = formSchema.module.entity[0];
        const data: Omit<ComponentTreeNode, 'children'>[] = [];
        entity.entities.forEach(entity => {
            resolveEntityTreeData(entity, 1, null, data);
        });
        data.forEach((dataItem: any) => {
            if (!dataItem.parent || !dataItem.parentId) {
                dataItem.collapse = false;
            }
            if (dataItem.$type === 'ComplexField') {
                dataItem.collapse = true;
            }
        });
        return data;
    }

    function assembleStateVariables(formSchema?: any) {
        if (!formSchema) {
            formSchema = useFormSchemaComposition.getFormSchema();
        }
        const { viewmodels } = formSchema.module;
        if (!viewmodels || !viewmodels.length) {
            return;
        }
        const data: ViewModelTreeNode[] = [];
        viewmodels.forEach(viewModel => {
            if (!viewModel || !viewModel.states || !viewModel.states.length) {
                return;
            }
            const component = formSchema.module.components.find(item => item.viewModel === viewModel.id);
            const viewModelName = getViewModelName(component, viewModel.name);
            const vmNode: ViewModelTreeNode = {
                data: { id: viewModel.id, code: viewModel.code, name: viewModelName || viewModel.name, statePath: viewModel.id },
                id: viewModel.id,
                code: viewModel.code || viewModel.id,
                children: [] as ViewModelTreeNode[],
                selectable: false,
                expanded: true
            };
            data.push(vmNode);
            const componentId = formSchema.module.components.find(item => item.viewModel === viewModel.id)?.id;
            viewModel.states.forEach(state => {
                vmNode.children.push({
                    data: { ...state, statePath: `/${componentId}/${state.code}` },
                    selectable: true
                } as any);
            });
        });
        return data;
    }

    /**
     * 以树节点形式返回当前视图模型所绑定的实体字段
     */
    function assembleSchemaFieldsUnderBoundEntity(targetComponentId: string) {
        const viewModelId = targetComponentId && useFormSchemaComposition.getViewModelIdByComponentId(targetComponentId);
        if (!viewModelId) {
            return [];
        }
        const fields = useFormSchemaComposition.getFieldsByViewModelId(viewModelId);
        if (!fields || !fields.length) {
            return [];
        }
        const treeViewData: any[] = [];
        resolveFieldNodesInEntity(fields, 0, null, treeViewData);
        return treeViewData;
    }

    return {
        assembleOutline,
        assembleSchemaFieldsByComponent,
        assembleStateVariables,
        assembleSchemaFieldsUnderBoundEntity,
        getViewModelName
    };
}
