import { inject } from "vue";
import { ComponentType, FormSchemaEntity, UseFormSchema, UseFormStateMachine } from "../types";
import { cloneDeep } from "lodash-es";

export function useEventParameterData(
    useFormSchemaComposition: UseFormSchema,
    useFormStateMachineComposition: UseFormStateMachine) {
    /**
     * 获取重组的actions
     * @param actions
     * @returns
     */
    function getActionsChanged(actions: any) {
        const result: any = [];
        if (actions && Object.keys(actions).length > 0) {
            Object.keys(actions).forEach((actionName: string) => {
                const item = actions[actionName];
                result.push({ id: actionName, label: item.name });
            });
        }
        return result;
    }

    function getComponentRefNode(componentId: string) {
        const components = useFormSchemaComposition.getComponents();
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
    function getDataGridComponentName(component: any) {
        const treeGrid = useFormSchemaComposition.selectNode(component, (item: any) => item.type === 'tree-grid');
        if (treeGrid) {
            return '树表格组件';
        }

        const componentRefResult = getComponentRefNode(component.id);
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
    function getViewModelName(viewModelId: string, componentName: string) {
        const component = useFormSchemaComposition.getComponentByViewModelId(viewModelId);
        if (!component || component.fakeDel) {
            return;
        }
        switch (component.componentType) {
            case ComponentType.Frame: {
                return '根组件';
            }
            case ComponentType.dataGrid: {
                return getDataGridComponentName(component);
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
    // 构造actions data
    function buildActions() {
        const stateMachineMetadata = useFormStateMachineComposition.getStateMachineMetadata();
        if (!stateMachineMetadata) {
            return [];
        }
        const actions = stateMachineMetadata.action || {};
        return getActionsChanged(actions);
    }

    // 构造components  data
    function buildComponents() {
        const componentsWithName: Array<{ id: string, name: string }> = [];
        const components = useFormSchemaComposition.getComponents();
        components.filter(item => !item.fakeDel).forEach((component: any & { name: string }) => {
            const viewModelId = component.viewModel;
            let name: any = null;
            const viewModel = useFormSchemaComposition.getViewModelById(viewModelId);
            if (viewModel) {
                name = getViewModelName(viewModelId, viewModel.name);
            }
            componentsWithName.push({
                id: component.id,
                name: name || component.name
            });
        });
        const commonComponents = componentsWithName && componentsWithName.map((item: { id: string, name: string }) => {
            return { id: item.id, label: `${item.id} [${item.name}]` };
        }) || [];
        const relativeComponents = componentsWithName && componentsWithName.map((item: { id: string, name: string }) => {
            return { id: '#{' + item.id + '}', label: '#{' + `${item.id}` + `} [${item.name}]` };
        }) || [];
        const result: any = relativeComponents.concat(commonComponents);
        return result;
    }

    function buildCommands() {
        const viewModels = useFormSchemaComposition.getViewModels();
        const result: any = [];
        viewModels.forEach((viewModel: any) => {
            const { id = null, code = null, commands = [] } = viewModel;
            if (id && code && commands && commands.length > 0 && !viewModel.fakeDel) {
                const item = {
                    data: { id: code, label: code }, children: [] as any[], selectable: false, expanded: true
                };
                if (commands && commands.length > 0) {
                    commands.forEach((command: any) => {
                        const { id = null, code = null, name = null, isInvalid } = command || {};
                        if (id && !isInvalid) {
                            item.children.push({
                                data: { id: code, label: `${code} [${name}]` }
                            });
                        }
                    });
                }
                result.push(item);
            }
        });
        return result;
    }

    /**
     * 构造Lookup选择框选项
     */
    function buildLookups() {
        const externalComponents = useFormSchemaComposition.getExternalComponents();
        const result: any[] = [];
        externalComponents.forEach((externalComponent) => {
            if (externalComponent.type === 'lookup') {
                const lookupItem = { id: externalComponent.id, label: externalComponent.name };
                result.push(lookupItem);
            }
        });

        return result;
    }

    function resolveEntity(schemaEntity: FormSchemaEntity, parentLabelPath: string = ''): any {
        if (!schemaEntity) {
            return;
        }
        const clonedSchemaEntity: FormSchemaEntity = cloneDeep(schemaEntity);

        const viewModelBindTo = parentLabelPath ? `${parentLabelPath}/${clonedSchemaEntity.label}` : `/`;
        // entityBindToMap.set(clonedSchemaEntity.label, viewModelBindTo.replace('//', '/'));

        // const selectable = resolveEntitySelectable(clonedSchemaEntity);
        const result: any = {
            data: Object.assign({ bindTo: viewModelBindTo.replace('//', '/') }, clonedSchemaEntity),
            children: []
        };
        if (clonedSchemaEntity.type.entities && clonedSchemaEntity.type.entities.length) {
            const childTable = clonedSchemaEntity.type.entities.map(childEntity => resolveEntity(childEntity, viewModelBindTo));
            result.children = result.children.concat(childTable);
        }
        return result;
    }

    function resolveEntityDataSource() {
        const rootSchemaEntity = useFormSchemaComposition.getFormSchema().module.entity[0]?.entities[0];
        const rootSchemaTreeNode = resolveEntity(rootSchemaEntity);
        return [rootSchemaTreeNode];
    }

    function buildEntities(): any {
        return resolveEntityDataSource();
    }


    function getEventParameterData(dataValue: string) {
        let data: any = null;
        if (dataValue === ':Actions') {
            data = buildActions();
        } else if (dataValue === ':Components') {
            data = buildComponents();
        } else if (dataValue === ':CommandsTree') {
            data = buildCommands();
        } else if (dataValue === ':Lookups') {
            data = buildLookups();
        } else if (dataValue === ':Entity') {
            data = buildEntities();
        }
        return data;
    }

    return { buildActions, buildCommands, buildComponents, getEventParameterData };
}
