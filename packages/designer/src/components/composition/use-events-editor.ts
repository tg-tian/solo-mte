import { cloneDeep, omit } from "lodash-es";
import { ControllerListItem, EventsEditorActions, EventsEditorMapItem, UseEventsEditor } from "../types/events-editor";
import { inject } from "vue";
import { UseFormSchema } from "../types";
import { UseFormCommandService } from "../types/command";
import { useParameterEditorData } from "./use-parameter-editor-data";
import { useEventParameterData } from "./use-event-parameter-data";

export function useEventsEditor(commandService: UseFormCommandService, useFormSchema: UseFormSchema): UseEventsEditor {

    let savedViewModel = [] as any;

    /**
     * 去重
     * @param itemWithSameValue 
     * @param comparedPart 需要去重的是控制器还是命令
     * @returns 
     */
    function getUniqueContent(itemWithSameValue: any, comparedPart: string) {
        const value = cloneDeep(itemWithSameValue);
        for (let i = 0; i < value.length; i++) {
            for (let j = i + 1; j < value.length; j++) {
                if (comparedPart === 'controller') {
                    if (value[i]['controllerName']['id'] === value[j]['controllerName']['id']) {
                        value.splice(j, 1);
                        j--;
                    }
                }
                else if (comparedPart === 'command') {
                    if (value[i]['label'] === value[j]['label']) {
                        value.splice(j, 1);
                        j--;
                    }
                }
            }
        }
        itemWithSameValue = cloneDeep(value);
        return itemWithSameValue;
    }


    /**
     * 根据cmpId获取控制器名称
     * @param controller 
     * @returns 
     */
    function getControllerName(controller: any) {
        const savedViewModelItem = {
            controllerName: {
                label: '',
                name: '',
                id: '',
            },
            controllerList: []
        };
        savedViewModelItem.controllerName = cloneDeep(controller);
        savedViewModel.push(cloneDeep(savedViewModelItem));
        savedViewModel = getUniqueContent(savedViewModel, 'controller');
        return savedViewModel;
    }

    /**
     * 目标组件下所有可选的vm
     * @param  
     * @returns 
     */
    function getAllComponentList() {
        const components = useFormSchema.getComponents();
        const viewModels = useFormSchema.getViewModels();
        const componentListsItem = {
            componentId: '',
            viewModelId: ''
        };
        const allComponentList = [] as any;
        for (let i = 0; i < components.length; i++) {
            // 筛选出root-component及form类型的component
            componentListsItem.componentId = cloneDeep(components[i].id);
            componentListsItem.viewModelId = cloneDeep(viewModels[i].id);
            allComponentList.push(cloneDeep(componentListsItem));
        }
        return allComponentList;
    }

    /** 修正vmid为以-component为后缀的情况*/
    function verifyVmid(vmid, allComponentList) {
        let verifiedVmid = vmid;
        const splitString = vmid.split('-');
        if (splitString[splitString.length - 1] === 'component') {
            const verifiedVm = allComponentList.find(componentListsItem => componentListsItem.componentId === vmid);
            verifiedVmid = verifiedVm.viewModelId;
        }
        return verifiedVmid;
    }

    /**
     * 处理actions节点的目标组件值
     * @param boundEventItem 绑定事件
     * @param vmid viewModelId
     * @returns 
     */
    function formTargetComponent(boundEventItem: any, vmid: string) {
        const allComponentList = getAllComponentList();
        const targetComponent = {
            id: boundEventItem.command?.targetComponent,
            viewModelId: '',
        };
        if (allComponentList.length && boundEventItem.command && boundEventItem.command.targetComponent !== undefined) {
            let viewModelId;
            allComponentList.forEach(component => {
                viewModelId = component.componentId === targetComponent.id ? component.viewModelId : viewModelId;
            });
            targetComponent.viewModelId = viewModelId;
        }
        else if (allComponentList.length) {
            vmid = verifyVmid(vmid, allComponentList);
            // 若不存在目标组件，则自动存放至当前viewmodel
            const componentList = allComponentList.find(componentListsItem => componentListsItem.viewModelId === vmid);
            targetComponent.id = componentList === undefined ? undefined : componentList.componentId;
            targetComponent.viewModelId = vmid as any;
        }
        return targetComponent;
    }

    /**
     * 获取actions节点和viewmodel节点的控制器，以便按照控制器分类所有命令
     * @param domJson 
     * @returns 
     */
    function getController(domJson: any) {
        let savedViewModelFromActions = [];
        let savedViewModelFromVM;
        // 根据actions节点，获取控制器相关（savedViewModelFromActions）
        domJson.module.actions.forEach(actionItem => {
            actionItem.sourceComponent.map.forEach(mapItem => {
                savedViewModelFromActions = cloneDeep(getControllerName(mapItem.controller));
            });
        });
        // 根据viewModel节点，匹配cmpId获取控制器（savedViewModelFromVM）
        domJson.module.viewmodels.forEach(viewmodelItem => {
            viewmodelItem.commands.forEach(commandItem => {
                commandService.getCommands().forEach(webCmdItem => {
                    if (commandItem.cmpId === webCmdItem.Id) {
                        const controller = {
                            label: webCmdItem.Code,
                            name: webCmdItem.Name,
                            id: webCmdItem.Id,
                        };
                        savedViewModelFromVM = cloneDeep(getControllerName(controller));
                    }
                });
            });
        });

        // 合并savedViewModelFromActions及savedViewModelFromVM => savedViewModel
        const savedViewModel = savedViewModelFromActions ? getUniqueContent(savedViewModelFromActions.concat(savedViewModelFromVM), 'controller') : getUniqueContent(savedViewModelFromVM, 'controller');
        return savedViewModel;
    }

    /**
     * 1. 获取已绑定命令的参数值（来自actions节点）
     * 2. 获取暂未绑定的命令参数值（来自viewmodel节点）
     * @param savedViewModelItem 
     * @param controllerListItem 
     * @param domJson 
     */
    function getCommandParameter(savedViewModelItem: any, controllerListItem: ControllerListItem) {
        const { actions } = useFormSchema.getModule();
        actions.forEach(actionItem => {
            actionItem.sourceComponent.map.forEach(mapItem => {
                if (savedViewModelItem.controllerName.id === mapItem.controller.id) {
                    controllerListItem.label = mapItem.command.label;
                    controllerListItem.name = mapItem.command.name;
                    controllerListItem.id = mapItem.command.id;
                    controllerListItem.handlerName = mapItem.command.handlerName;
                    controllerListItem.property = cloneDeep(mapItem.command.params);
                    controllerListItem.cmpId = mapItem.controller.id;
                    controllerListItem.isNewGenerated = mapItem.controller.isNewGenerated || false;
                    controllerListItem.isInvalid = mapItem.command.isInvalid || false;
                    controllerListItem['isRtcCommand'] = mapItem.command['isRtcCommand'];
                    controllerListItem.targetComponent = mapItem.targetComponent['id'] ? mapItem.targetComponent['id'] : undefined;
                    savedViewModelItem.controllerList.push(cloneDeep(controllerListItem));
                }
            });
        });

        const viewmodels = useFormSchema.getViewModels();
        viewmodels.forEach(viewmodelItem => {
            viewmodelItem.commands.forEach(commandsItem => {
                if (savedViewModelItem.controllerName.id === commandsItem.cmpId) {
                    controllerListItem.label = commandsItem.code;
                    controllerListItem.name = commandsItem.name;
                    controllerListItem.id = commandsItem.id;
                    controllerListItem.handlerName = commandsItem.handlerName;
                    controllerListItem.property = cloneDeep(commandsItem.params);
                    controllerListItem.cmpId = commandsItem.id;
                    controllerListItem.isNewGenerated = commandsItem.isNewGenerated || false;
                    controllerListItem['isRtcCommand'] = commandsItem.command['isRtcCommand'];
                    controllerListItem.isInvalid = commandsItem.isInvalid || false;
                    controllerListItem.targetComponent = commandsItem['targetComponent'] ? commandsItem['targetComponent'] : undefined;
                    savedViewModelItem.controllerList.push(cloneDeep(controllerListItem));
                }
            });
        });
        return savedViewModelItem;
    }

    /**
     * 获取已绑定命令的路径，并tag该命令
     * @param actionData action节点的数据
     * @param savedViewModelCopy viewModel节点的数据
     */
    function getPathAndTagBoundCommand(actionData: any, savedViewModelCopy: any) {
        actionData.forEach(actionItem => {
            const { id } = actionItem.sourceComponent;
            // 获取已绑定命令的路径
            const path = useFormSchema.getControlBasicInfoMap().get(id) !== undefined ? useFormSchema.getControlBasicInfoMap().get(id)?.parentPathName : undefined;
            actionItem['path'] = useFormSchema.getControlBasicInfoMap().get(id) !== undefined ? `${path} > ` : '';
            actionItem.sourceComponent.map.forEach(mapItem => {
                savedViewModelCopy.forEach(savedViewModelItem => {
                    savedViewModelItem.controllerList.forEach(commandItem => {
                        // tag已绑定的命令
                        if (commandItem.label === mapItem.command.label) {
                            commandItem['tag'] = 'notInternal';
                        }
                    });
                });
            });
        });
        return actionData;
    }

    /**
     * 获取暂未绑定的命令
     * @param propertyDataId 
     * @param viewModelId 
     * @param savedViewModelCopy 
     * @returns 
     */
    function handlePathOfUnboundCommand(propertyDataId: string, viewModelId: string, savedViewModelCopy: any) {
        const viewModelData: EventsEditorActions = {
            sourceComponent: {
                id: propertyDataId,
                viewModelId: viewModelId,
                map: []
            },
            path: '暂未绑定 '
        };
        savedViewModelCopy.forEach(savedViewModelCopyItem => {
            const { controllerName } = savedViewModelCopyItem;
            savedViewModelCopyItem.controllerList.forEach(commandItem => {
                if (!commandItem['tag']) {
                    const mapItem: EventsEditorMapItem = {
                        event: {
                            label: undefined,
                            name: undefined,
                        },
                        targetComponent: cloneDeep(formTargetComponent(savedViewModelCopyItem, commandItem.targetComponent)),
                        command: {
                            id: commandItem.id,
                            label: commandItem.label,
                            name: commandItem.name,
                            handlerName: commandItem.handlerName,
                            params: cloneDeep(commandItem.property),
                            isNewGenerated: commandItem.isNewGenerated || false,
                            isRtcCommand: commandItem['isRtcCommand'],
                            isInvalid: commandItem.isInvalid || false,
                            cmpId: controllerName.id
                        },
                        controller: {
                            id: controllerName.id,
                            label: controllerName.label,
                            name: controllerName.name,
                        }
                    };
                    viewModelData.sourceComponent.map.push(cloneDeep(mapItem));
                }
            });
        });
        return viewModelData;
    }

    /**
     * 剔除非组件内的其他命令:root显示全部，其他子组件选自身的vm
     * 
     * @param viewModelId 
     * @param actionWithPath actions节点及对应的路径
     * @param action 
     * @returns 
     */
    function selectedCommandRules(viewModelId: string, actionWithPath: any, action: any) {
        if (viewModelId !== "root-viewmodel") {
            actionWithPath.forEach(actionWithPathItem => {
                const mapArray = [] as any;
                let mapExist = false;
                actionWithPathItem.sourceComponent.map.forEach(mapItem => {
                    if (mapItem.targetComponent.viewModelId === viewModelId) {
                        mapArray.push(cloneDeep(mapItem));
                        mapExist = true;
                    }
                });
                if (mapExist) {
                    const actionsItem = {
                        path: actionWithPathItem.path,
                        sourceComponent: {
                            id: actionWithPathItem.sourceComponent.id,
                            map: cloneDeep(mapArray),
                            viewModelId: actionWithPathItem.sourceComponent.viewModelId,
                        }
                    };
                    action.push(cloneDeep(actionsItem));
                }
            });
        }
        else {
            action = cloneDeep(actionWithPath);
        }
        return action;
    }
    /** 事件编辑器-已有方法-附加参数context  */
    function mergeCommandParamterData(action: any, commandList: any) {
        action.map((actionItem: any) => {
            if (actionItem.sourceComponent?.map?.length) {
                actionItem.sourceComponent.map.forEach(mapItem => {
                    if (mapItem?.command?.params?.length) {
                        let originalCommand;
                        commandList.find(originController => {
                            // 在完整的控制器数据中查找当前方法参数所需要的上下文信息
                            const mapControllerId = mapItem.command.cmpId || mapItem.controller.id;
                            if (originController.controllerName?.id === mapControllerId) {
                                const command = originController.controllerList.find(originCommand => originCommand.label === mapItem.command.handlerName);
                                if (command) {
                                    originalCommand = command;
                                    return true;
                                }
                            }
                        });
                        if (originalCommand) {
                            mapItem.command.params.forEach(param => {
                                const originalParam = originalCommand.property.find(property => property.name === param.name);
                                if (originalParam) {
                                    const paramInfo = omit(originalParam, 'value');
                                    Object.assign(param, paramInfo);
                                }
                            });
                        }
                    }
                });
            }
        });
    }

    /**
     * 事件编辑器-已有方法-命令路径处理 
     * @param propertyDataId 组件id
     * @param viewModelId 视图模型id
     * @returns 
     */
    function getEventPath(propertyDataId: string, viewModelId: string, commandList: any) {
        const domJson = useFormSchema.getFormSchema();
        const actionData = cloneDeep(domJson.module.actions);

        const controllerListItem: ControllerListItem = {
            label: '',
            name: '',
            id: '',
            handlerName: '',
            showTargetComponent: false,
            cmpId: '',
            componentLists: [],
            targetComponent: undefined,
            isNewGenerated: undefined,
            isRtcCommand: undefined,
            isInvalid: false,
            property: []
        };

        // 1. 获取已绑定命令的参数值（来自actions节点）
        // 2. 获取暂未绑定的命令参数值（来自viewmodel节点）
        const savedViewModel = getController(domJson);
        savedViewModel.forEach(savedViewModelItem => {
            const { actions } = domJson.module;
            actions.forEach(actionItem => {
                actionItem.sourceComponent.map.forEach(mapItem => {
                    if (savedViewModelItem.controllerName.id === mapItem.controller.id) {
                        controllerListItem.label = mapItem.command.label;
                        controllerListItem.name = mapItem.command.name;
                        controllerListItem.id = mapItem.command.id;
                        controllerListItem.handlerName = mapItem.command.handlerName;
                        controllerListItem.property = cloneDeep(mapItem.command.params);
                        controllerListItem.cmpId = mapItem.controller.id;
                        controllerListItem.isNewGenerated = mapItem.controller.isNewGenerated || false;
                        controllerListItem.isRtcCommand = mapItem.command['isRtcCommand'];
                        controllerListItem.isInvalid = mapItem.command.isInvalid || false;
                        controllerListItem.targetComponent = mapItem.targetComponent['id'] ? mapItem.targetComponent['id'] : undefined;
                        savedViewModelItem.controllerList.push(cloneDeep(controllerListItem));
                    }
                });
            });

            const { viewmodels } = domJson.module;
            viewmodels.forEach(viewmodelItem => {
                viewmodelItem.commands.forEach(commandsItem => {
                    const targetComponent = viewmodelItem.code;
                    if (savedViewModelItem.controllerName.id === commandsItem.cmpId) {
                        controllerListItem.label = commandsItem.code;
                        controllerListItem.name = commandsItem.name;
                        controllerListItem.id = commandsItem.id;
                        controllerListItem.handlerName = commandsItem.handlerName;
                        controllerListItem.property = cloneDeep(commandsItem.params);
                        controllerListItem.cmpId = commandsItem.id;
                        controllerListItem.isNewGenerated = commandsItem.isNewGenerated || false;
                        controllerListItem.isRtcCommand = commandsItem.isRtcCommand;
                        controllerListItem.isInvalid = commandsItem.isInvalid || false;
                        controllerListItem.targetComponent = commandsItem['targetComponent'] || targetComponent ? commandsItem['targetComponent'] || targetComponent : undefined;
                        savedViewModelItem.controllerList.push(cloneDeep(controllerListItem));
                    }
                });
            });
            savedViewModelItem.controllerList = cloneDeep(getUniqueContent(savedViewModelItem.controllerList, 'command'));
        });

        const savedViewModelCopy = cloneDeep(savedViewModel);
        const actionsData = cloneDeep(getPathAndTagBoundCommand(actionData, savedViewModelCopy));
        const viewModelsData = cloneDeep(handlePathOfUnboundCommand(propertyDataId, viewModelId, savedViewModelCopy));
        const actionWithPath = actionsData.concat(viewModelsData);

        let action = [];
        action = cloneDeep(selectedCommandRules(viewModelId, actionWithPath, action));

        mergeCommandParamterData(action, commandList);

        return {
            actionWithPath: action,
            viewModelDisplay: savedViewModel
        };
    }
    return { getCommandParameter, getEventPath, getAllComponentList, formTargetComponent };
}
